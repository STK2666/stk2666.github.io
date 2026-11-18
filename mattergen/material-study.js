"use strict";
(() => {
  const el = (id) => document.getElementById(id);
  const all = (selector) => Array.from(document.querySelectorAll(selector));
  const data = window.BASE_CRYSTALS;
  const repr = data["48"].final;
  const symbols =
    "X H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm".split(
      " ",
    );
  const colors = {
    29: "#bc6b3c",
    46: "#327d85",
    9: "#5d9a78",
    49: "#3f748a",
    69: "#ca9055",
    8: "#c26457",
    101: "#adb4b1",
  };
  const symbol = (z) => (z === 101 ? "MASK" : symbols[z]);
  const atomColor = (z) =>
    colors[z] || ["#8c81a1", "#4f849f", "#8a7352", "#a1687c", "#64886b"][z % 5];
  const sub = (a, b) => a.map((x, i) => x - b[i]);
  const add = (a, b) => a.map((x, i) => x + b[i]);
  const dot = (a, b) => a.reduce((v, x, i) => v + x * b[i], 0);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const sumBasis = (frac, l) =>
    l[0].map((_, d) => frac.reduce((s, x, i) => s + x * l[i][d], 0));
  const det = (l) => dot(l[0], cross(l[1], l[2]));
  const frac = (p, l) =>
    l.map((_, i) => dot(p, cross(l[(i + 1) % 3], l[(i + 2) % 3])) / det(l));
  const formula = (s) => s.replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[+d]);
  const fmt = (arr) =>
    arr
      .map((r) => "[" + r.map((x) => x.toFixed(3).padStart(6)).join("  ") + "]")
      .join("\n");
  function choose(attr, key, update) {
    const buttons = all("[" + attr + "]");
    const select = (value) => {
      buttons.forEach((b) =>
        b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value)),
      );
      update(value);
    };
    buttons.forEach((b) =>
      b.addEventListener("click", () => select(b.getAttribute(attr))),
    );
    select(key);
  }
  function legend(node, numbers) {
    node.replaceChildren();
    const counts = new Map();
    for (const z of numbers) counts.set(z, (counts.get(z) || 0) + 1);
    for (const [z, n] of counts) {
      const span = document.createElement("span"),
        mark = document.createElement("i");
      mark.className = "dot";
      mark.style.background = atomColor(z);
      span.append(mark, document.createTextNode(symbol(z) + " × " + n));
      node.append(span);
    }
  }
  function context(canvas) {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.round(box.width * dpr),
      height = Math.round(box.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    return { ctx, w: box.width, h: box.height };
  }
  function viewer(canvas, getFrame, options) {
    let yaw = -0.49,
      pitch = -0.3,
      zoom = 1,
      start;
    const render = () => {
      const box = context(canvas);
      if (!box) return;
      const { ctx, w, h } = box,
        frame = getFrame(),
        opts = options();
      const a = Math.cos(yaw),
        b = Math.sin(yaw),
        c = Math.cos(pitch),
        d = Math.sin(pitch);
      const rotate = ([x, y, z]) => [
        a * x + b * z,
        c * y - d * (-b * x + a * z),
        d * y + c * (-b * x + a * z),
      ];
      const lines = [],
        marks = [];
      const cell = frame.l,
        extent = opts.repeat ? 1 : 0;
      const cellPoint = (ijk) => sumBasis(ijk, cell);
      const line = (p, q, style = {}) =>
        lines.push({ p: rotate(p), q: rotate(q), ...style });
      const atom = (p, z, ghost = false, caption = "") =>
        marks.push({ p: rotate(p), z, ghost, caption });
      const centralEdges = [];
      for (let x = -extent; x <= extent; x++)
        for (let y = -extent; y <= extent; y++)
          for (let z = -extent; z <= extent; z++) {
            const offset = [x, y, z],
              origin = cellPoint(offset),
              ghost = x !== 0 || y !== 0 || z !== 0;
            for (let v = 0; v < 8; v++) {
              const bits = [(v >> 2) & 1, (v >> 1) & 1, v & 1],
                corner = cellPoint(add(bits, offset));
              for (let j = 0; j < 3; j++)
                if (bits[j] === 0) {
                  const next = add(corner, cell[j]);
                  if (!ghost) centralEdges.push([corner, next]);
                  else
                    line(corner, next, {
                      color: "rgba(78,104,92,.14)",
                      weight: 0.64,
                    });
                }
            }
            frame.p.forEach((p, i) =>
              atom(
                add(p, origin),
                frame.z[i],
                ghost,
                opts.labels && !ghost ? symbol(frame.z[i]) : "",
              ),
            );
          }
      centralEdges.forEach(([p, q]) =>
        line(p, q, {
          color: opts.field === "L" ? "#00695d" : "#526e63",
          weight: opts.field === "L" ? 2.5 : 1.55,
        }),
      );
      if (opts.graph) {
        const shift = opts.graph === "periodic" ? [-1, 0, -1] : [0, 0, 0];
        const image = add(frame.p[2], cellPoint(shift));
        line(frame.p[0], image, {
          color: "#974d28",
          weight: 3.3,
          dash: [5, 3],
        });
        if (opts.graph === "periodic") atom(image, frame.z[2], false, "Pd′");
      }
      if (opts.field === "F") {
        const f = frac(frame.p[0], cell);
        let p = [0, 0, 0];
        for (let j = 0; j < 3; j++) {
          const q = add(
            p,
            cell[j].map((x) => x * f[j]),
          );
          line(p, q, { color: "#a25130", weight: 2, dash: [3, 3] });
          p = q;
        }
      }
      const pts = lines
        .flatMap((s) => [s.p, s.q])
        .concat(marks.map((s) => s.p));
      const bounds = [0, 1].map((i) => [
        Math.min(...pts.map((p) => p[i])),
        Math.max(...pts.map((p) => p[i])),
      ]);
      const scale =
        Math.min(
          (w * 0.82) / (bounds[0][1] - bounds[0][0] || 1),
          (h * 0.84) / (bounds[1][1] - bounds[1][0] || 1),
        ) * zoom;
      const project = (p) => [
        w / 2 + (p[0] - (bounds[0][1] + bounds[0][0]) / 2) * scale,
        h / 2 - (p[1] - (bounds[1][1] + bounds[1][0]) / 2) * scale,
      ];
      for (const item of lines) {
        const p = project(item.p),
          q = project(item.q);
        ctx.beginPath();
        ctx.moveTo(...p);
        ctx.lineTo(...q);
        ctx.setLineDash(item.dash || []);
        ctx.lineWidth = item.weight;
        ctx.strokeStyle = item.color;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      marks.sort((u, v) => u.p[2] - v.p[2]);
      for (const m of marks) {
        const [x, y] = project(m.p),
          r =
            Math.min(13, Math.max(5.0, scale * (opts.repeat ? 0.34 : 0.21))) *
            (m.ghost ? 0.77 : 1);
        ctx.globalAlpha = m.ghost ? 0.67 : 1;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          x - r * 0.27,
          y - r * 0.38,
          0,
          x,
          y,
          r,
        );
        gradient.addColorStop(0, m.ghost ? "#f4f6f4" : "#f3f2dd");
        gradient.addColorStop(0.5, atomColor(m.z));
        gradient.addColorStop(1, m.ghost ? "#899a90" : "#344945");
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = m.ghost ? "#ffffff" : "#334b41";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        if (m.caption) {
          ctx.font = "bold 11px Arial";
          ctx.fillStyle = "#243b34";
          ctx.fillText(m.caption, x + r + 4, y - 2);
        }
      }
      ctx.globalAlpha = 1;
      // A length scale in real-space projection, fixed at one angstrom.
      if (scale > 6 && scale < 150) {
        ctx.strokeStyle = "#576b60";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(15, h - 14);
        ctx.lineTo(15 + scale, h - 14);
        ctx.stroke();
        ctx.fillStyle = "#41574a";
        ctx.font = "10px monospace";
        ctx.fillText("1 Å", 15, h - 19);
      }
    };
    canvas.addEventListener("pointerdown", (e) => {
      start = [e.clientX, e.clientY];
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (start) {
        yaw += (e.clientX - start[0]) * 0.008;
        pitch -= (e.clientY - start[1]) * 0.008;
        start = [e.clientX, e.clientY];
        render();
      }
    });
    canvas.addEventListener("lostpointercapture", () => {
      start = null;
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        zoom = Math.min(
          2.5,
          Math.max(0.65, zoom * Math.exp(-e.deltaY * 0.001)),
        );
        render();
      },
      { passive: false },
    );
    canvas.addEventListener("keydown", (e) => {
      const change = {
        ArrowLeft: [-0.1, 0],
        ArrowRight: [0.1, 0],
        ArrowUp: [0, -0.1],
        ArrowDown: [0, 0.1],
      }[e.key];
      if (change) {
        e.preventDefault();
        e.stopPropagation();
        yaw += change[0];
        pitch += change[1];
        render();
      }
    });
    new ResizeObserver(render).observe(canvas);
    return render;
  }
  let field = "A",
    repeat = true,
    near = "periodic";
  const drawRepr = viewer(
    el("structure-view"),
    () => repr,
    () => ({ repeat, field }),
  );
  const drawNear = viewer(
    el("neighbor-view"),
    () => repr,
    () => ({ graph: near, labels: true }),
  );
  legend(el("repr-legend"), repr.z);
  choose("data-view", "array", (v) => {
    repeat = v === "array";
    drawRepr();
  });
  choose("data-image", "periodic", (v) => {
    near = v;
    const p =
      v === "central"
        ? repr.p[2]
        : add(repr.p[2], sumBasis([-1, 0, -1], repr.l));
    el("neighbor-length").textContent =
      "Cu — " +
      (v === "central" ? "Pd" : "Pd′") +
      "  " +
      Math.hypot(...sub(p, repr.p[0])).toFixed(4) +
      " Å";
    drawNear();
  });
  choose("data-field", "A", (v) => {
    field = v;
    const text = {
      A: [
        "每个站点放什么元素？",
        "整数原子序数标记站点身份。这里一个晶胞含两个 Cu 和一个 Pd。",
        "[29, 29, 46]",
        "A ∈ ℕⁿ",
      ],
      F: [
        "每个站点在晶胞哪里？",
        "每一行给出相对三个晶格向量的坐标。跨过一个周期回到等价位置。",
        fmt(repr.p.map((p) => frac(p, repr.l))),
        "F ∈ [0,1)ⁿˣ³ · R = F L",
      ],
      L: [
        "晶体怎样向外重复？",
        "三行分别给出三个晶格向量。它们的长度、夹角共同定义晶胞。",
        fmt(repr.l),
        "L ∈ ℝ³ˣ³ · 单位 Å",
      ],
    }[v];
    ["field-title", "field-caption", "field-values", "field-equation"].forEach(
      (s, i) => (el(s).textContent = text[i]),
    );
    drawRepr();
  });
  const conditionChoices = {
    base: [
      "∅",
      "不给定性质目标",
      "mattergen_base；从内置分布抽取站点数。",
      "元素、坐标、晶格。",
      "读出晶体组成和几何，将候选交给下游检验。",
    ],
    chem: [
      "Mg–O",
      "请求一个元素集合",
      "chemical_system；元素集合经 multi-hot 与线性层编码。",
      "各元素数量、坐标、晶格。官方条件分支同时限制可选元素。",
      "读取最终组成，检查两种元素是否都出现、有无额外元素。",
    ],
    sg: [
      "#225",
      "请求一种空间对称性",
      "space_group；国际空间群编号减一后查询学习到的嵌入。",
      "元素、坐标、晶格。各站点由模型逐步生成。",
      "用 spglib 从最终 CIF 重新识别空间群，并注明容差。",
    ],
  };
  choose("data-cond", "base", (v) =>
    [
      "cond-symbol",
      "cond-title",
      "cond-code",
      "cond-free",
      "cond-test",
    ].forEach((k, i) => (el(k).textContent = conditionChoices[v][i])),
  );
  const axes = {
    state: {
      head: ["状态空间", "生成目标与典型条件"],
      rows: [
        ["潜空间图像扩散", "连续图像潜变量", "生成符合文字描述的图像"],
        [
          "掩码扩散语言模型",
          "序列中的离散词元",
          "根据提示和可见上下文补全序列",
        ],
        [
          "MatterGen",
          "离散元素 + 周期位置 + 晶格",
          "生成无机晶体，可指定化学体系或空间群",
        ],
      ],
    },
    noise: {
      head: ["前向扰动", "要恢复的量"],
      rows: [
        [
          "连续扩散",
          "向连续变量添加有日程的噪声",
          "例如用网络估计 score 或噪声",
        ],
        [
          "离散扩散 / MDM",
          "按类别转移矩阵扰动；MDM 使用吸收态 MASK",
          "预测干净类别或反向转移",
        ],
        [
          "MatterGen",
          "元素遮盖、位置周期加噪、晶格向尺寸先验漂移",
          "元素 logits 与两组连续几何去噪信息",
        ],
      ],
    },
    factor: {
      head: ["外层生成单位", "内层条件更新"],
      rows: [
        [
          "AR-FM / AR-DM",
          "按 token 或块分解联合分布",
          "给定已经生成的部分，在当前块内做 flow 或 diffusion 采样",
        ],
        [
          "联合去噪",
          "整个带噪对象共同演化",
          "每一步读入上下文，更新仍待恢复的变量",
        ],
        [
          "MatterGen",
          "固定站点数，联合细化整个晶胞",
          "共享几何图网络，类别和几何按不同更新规则推进",
        ],
      ],
    },
  };
  choose("data-axis", "state", (key) => {
    const axis = axes[key];
    el("design-col1").textContent = axis.head[0];
    el("design-col2").textContent = axis.head[1];
    el("design-rows").replaceChildren(
      ...axis.rows.map((row) => {
        const tr = document.createElement("tr");
        for (const s of row) {
          const td = document.createElement("td");
          td.textContent = s;
          tr.append(td);
        }
        return tr;
      }),
    );
  });
  const noise = [
    { name: "P(MASK)", max: 1, fn: (t) => (Math.floor(999 * t) + 1) / 1000, color: "#a45930" },
    {
      name: "σ position",
      max: 3.5,
      fn: (t) => 0.01 * Math.pow(500, t) / Math.cbrt(3),
      color: "#297b70",
    },
    {
      name: "α lattice",
      max: 1,
      fn: (t) => Math.exp(-0.25 * 19.9 * t * t - 0.05 * t),
      color: "#516d91",
    },
  ];
  function drawNoise() {
    const t = Number(el("noise-time").value) / 100,
      vals = noise.map((s) => s.fn(t));
    el("noise-label").textContent = "t = " + t.toFixed(2);
    el("noise-A").textContent = Math.round(100 * vals[0]) + "%";
    el("noise-F").textContent = vals[1].toFixed(3);
    el("noise-L").textContent = vals[2].toFixed(3);
    const box = context(el("prior-chart"));
    if (!box) return;
    const { ctx, w, h } = box;
    noise.forEach((s, i) => {
      const left = (i * w) / 3 + 14,
        right = ((i + 1) * w) / 3 - 15,
        top = 37,
        bottom = h - 25;
      const x = (v) => left + (right - left) * v,
        y = (v) => bottom - ((bottom - top) * v) / s.max;
      ctx.font = (w > 520 ? "13" : "10") + "px monospace";
      ctx.fillStyle = "#36443e";
      ctx.fillText(s.name, left, 19);
      ctx.strokeStyle = "#c9d1cd";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(left, top);
      ctx.lineTo(left, bottom);
      ctx.lineTo(right, bottom);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      for (let k = 0; k <= 100; k++) {
        const v = k / 100;
        k ? ctx.lineTo(x(v), y(s.fn(v))) : ctx.moveTo(x(v), y(s.fn(v)));
      }
      ctx.stroke();
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x(t), y(s.fn(t)), 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#516359";
      ctx.font = "10px monospace";
      ctx.fillText("0", left, bottom + 14);
      ctx.textAlign = "right";
      ctx.fillText("1", right, bottom + 14);
      ctx.textAlign = "left";
      ctx.fillText(String(s.max), left + 2, top - 3);
    });
  }
  el("noise-time").addEventListener("input", drawNoise);
  new ResizeObserver(drawNoise).observe(el("prior-chart"));
  drawNoise();

  let seed = "42",
    index = 0,
    isFinal = false,
    timer = null;
  const sample = () => data[seed],
    active = () => (isFinal ? sample().final : sample().frames[index]);
  const drawTraj = viewer(el("trajectory-view"), active, () => ({}));
  function stopPlay() {
    clearInterval(timer);
    timer = null;
    el("traj-play").textContent = "播放";
    el("traj-play").setAttribute("aria-pressed", "false");
  }
  function drawTrace(canvas, values, color, fmtTick) {
    const box = context(canvas);
    if (!box) return;
    const { ctx, w, h } = box;
    const min = Math.min(...values),
      max = Math.max(...values),
      span = max - min || 1;
    const left = 33,
      right = w - 11,
      top = 8,
      bottom = h - 18;
    const x = (i) => left + (i / (values.length - 1)) * (right - left),
      y = (v) => bottom - ((v - min) / span) * (bottom - top);
    ctx.font = "10px monospace";
    ctx.fillStyle = "#586960";
    for (const v of [min, max]) {
      ctx.strokeStyle = "#dde3df";
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(left, y(v));
      ctx.lineTo(right, y(v));
      ctx.stroke();
      ctx.fillText(fmtTick(v), 0, y(v) + 3);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    values.forEach((v, i) =>
      i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)),
    );
    ctx.stroke();
    if (!isFinal) {
      const k = active().i;
      ctx.strokeStyle = "#425750";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x(k), top);
      ctx.lineTo(x(k), bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x(k), y(values[k]), 3.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#586960";
    ctx.fillText("0", left, h - 2);
    ctx.textAlign = "right";
    ctx.fillText(String(values.length - 1), right, h - 2);
    ctx.textAlign = "left";
  }
  function drawTraces() {
    drawTrace(el("traj-mask-chart"), sample().mask, "#a25130", String);
    drawTrace(el("traj-volume-chart"), sample().volume, "#28796e", (v) =>
      v.toFixed(1),
    );
  }
  function milestone(kind) {
    const {frames} = sample();
    if (kind === "first") return frames.findIndex(f => f.z.some(z => z !== 101));
    if (kind === "all") return frames.findIndex(f => f.z.every(z => z !== 101));
    return 0;
  }
  function updateTrajectory() {
    const d = sample(),
      f = active();
    el("traj-id").textContent = d.id;
    el("traj-phase").textContent = isFinal ? "独立最终结构" : "原始记录 " + f.i;
    el("traj-frame").value = index;
    el("traj-final").setAttribute("aria-pressed", String(isFinal));
    el("traj-frame-label").textContent = isFinal
      ? "终态"
      : index + 1 + " / " + d.frames.length;
    el("traj-mask").textContent =
      f.z.filter((z) => z === 101).length + " / " + f.z.length;
    el("traj-vol").textContent =
      (Math.abs(det(f.l)) / f.z.length).toFixed(2) + " Å³";
    el("traj-cif").href = "deliverables/" + d.id + "/final.cif";
    all("[data-milestone]").forEach(button => {
      const k = milestone(button.dataset.milestone);
      button.disabled = k < 0;
      button.setAttribute("aria-pressed", String(!isFinal && k === index));
    });
    legend(el("traj-legend"), f.z);
    drawTraj();
    drawTraces();
  }
  Object.entries(data).forEach(([key, d]) =>
    el("traj-seed").add(new Option(formula(d.formula) + " · seed " + key, key)),
  );
  el("traj-seed").value = seed;
  el("traj-seed").addEventListener("change", (e) => {
    stopPlay();
    seed = e.target.value;
    index = 0;
    isFinal = false;
    updateTrajectory();
  });
  el("traj-frame").addEventListener("input", (e) => {
    stopPlay();
    index = Number(e.target.value);
    isFinal = false;
    updateTrajectory();
  });
  all("[data-milestone]").forEach(button => button.addEventListener("click", () => {
    stopPlay();
    index = milestone(button.dataset.milestone);
    isFinal = false;
    updateTrajectory();
  }));
  el("traj-final").addEventListener("click", () => {
    stopPlay();
    isFinal = true;
    updateTrajectory();
  });
  el("traj-play").addEventListener("click", () => {
    if (timer) {
      stopPlay();
      return;
    }
    if (index >= sample().frames.length - 1 || isFinal) index = 0;
    isFinal = false;
    updateTrajectory();
    el("traj-play").textContent = "暂停";
    el("traj-play").setAttribute("aria-pressed", "true");
    timer = setInterval(() => {
      if (index === sample().frames.length - 1) {
        stopPlay();
        return;
      }
      index++;
      updateTrajectory();
    }, 130);
  });
  new ResizeObserver(drawTraces).observe(el("traj-volume-chart"));
  updateTrajectory();

  const sections = all("main > section.scene"),
    links = all(".act a");
  const labels = links.map((a) => a.textContent.trim().replace(/^\d+\s*/, ""));
  const ids = sections.map((s) => s.id);
  let current = 0;
  const legacy = [
    "representation",
    "representation",
    "conditions",
    "diffusion",
    "diffusion",
    "representation",
    "design-space",
    "backbone",
    "backbone",
    "trajectory",
    "trajectory",
    "symmetry",
    "design-space",
    "backbone",
    "representation",
    "backbone",
    "sampler",
    "guidance",
    "symmetry",
    "design-space",
  ];
  function requested() {
    const hash = location.hash.slice(1);
    const id = /^\d+$/.test(hash) ? legacy[Number(hash) - 1] : hash;
    const idx = ids.indexOf(id);
    return idx < 0 ? 0 : idx;
  }
  function navigate(n) {
    if (n >= 0 && n < sections.length && ids[n] !== location.hash.slice(1))
      location.hash = ids[n];
  }
  function show() {
    const n = requested();
    if (n !== current) stopPlay();
    current = n;
    sections.forEach((s, i) => {
      s.hidden = i !== n;
    });
    links.forEach((a, i) =>
      i === n
        ? a.setAttribute("aria-current", "page")
        : a.removeAttribute("aria-current"),
    );
    el("scene-select").value = ids[n];
    el("prev-scene").hidden = n === 0;
    el("next-scene").hidden = n === sections.length - 1;
    el("next-scene").textContent =
      n === sections.length - 1 ? "" : "下一节 · " + labels[n + 1] + " →";
    el("scene-counter").textContent =
      String(n + 1).padStart(2, "0") +
      " / " +
      String(sections.length).padStart(2, "0");
    document.title = labels[n] + " · MatterGen 材料生成研究";
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      drawRepr();
      drawNear();
      drawNoise();
      drawTraj();
      drawTraces();
    });
  }
  ids.forEach((id, i) =>
    el("scene-select").add(
      new Option(String(i + 1).padStart(2, "0") + " · " + labels[i], id),
    ),
  );
  el("scene-select").addEventListener("change", (e) =>
    navigate(ids.indexOf(e.target.value)),
  );
  el("prev-scene").addEventListener("click", () => navigate(current - 1));
  el("next-scene").addEventListener("click", () => navigate(current + 1));
  window.addEventListener("hashchange", show);
  document.addEventListener("keydown", (e) => {
    if (
      e.altKey ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.target.closest(
        "input, select, textarea, button, canvas, a, [contenteditable]",
      )
    )
      return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      navigate(current + (e.key === "ArrowLeft" ? -1 : 1));
    }
  });
  document.querySelector(".skip").addEventListener("click", (e) => {
    e.preventDefault();
    el("main").focus();
  });
  show();
})();
