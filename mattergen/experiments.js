/* Offline experiments. The original, unrounded outputs live in analysis/. */
(() => {
  "use strict";
  const data = window.mattergenExperimentData;
  const methods = [
    { key: "pc", title: "预测–校正", color: "#00675f" },
    { key: "ancestral", title: "仅祖先预测", color: "#a04e29" },
    { key: "hybrid_pf", title: "混合概率流", color: "#435682" },
  ];
  const palette = {
    1: "#e9e5de",
    3: "#a48fc0",
    5: "#bf9779",
    6: "#536065",
    8: "#bc5548",
    9: "#79a890",
    11: "#af8cca",
    12: "#6d9a86",
    13: "#a2a8ae",
    14: "#7799bd",
    15: "#cd8a55",
    16: "#d4b64f",
    17: "#8dae61",
    19: "#a487ba",
    23: "#7189a6",
    27: "#738db7",
    28: "#b88648",
    29: "#b97554",
    33: "#a44f8c",
    34: "#bf7955",
    35: "#a26c49",
    37: "#896db1",
    39: "#5a9299",
    42: "#87969b",
    46: "#a7a9bc",
    47: "#94a0a1",
    48: "#a4a7a5",
    49: "#7e98b8",
    53: "#866b9f",
    55: "#a58b59",
    57: "#746b9c",
    60: "#9392b1",
    66: "#9988a9",
    67: "#aa8c91",
    71: "#9b9377",
    73: "#6687a5",
    74: "#6e7e91",
    80: "#af9693",
    81: "#9aa8a2",
    82: "#727e9e",
    101: "#c2c9c5",
  };
  const color = (z) => palette[z] || "hsl(" + ((z * 113) % 360) + " 25% 54%)";
  const sym = (z) => (z === 101 ? "MASK" : data.symbols[z]);
  const pretty = (f) =>
    f
      .trim()
      .replace(/\s+/g, "")
      .replace(/\d+/g, (n) =>
        n === "1" ? "" : [...n].map((d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]).join(""),
      );
  const fmt = (v, digits = 2) =>
    Number(v).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  function counts(numbers) {
    const map = new Map();
    numbers.forEach((z) => map.set(z, (map.get(z) || 0) + 1));
    return [...map.entries()].sort(([a], [b]) => a - b);
  }
  function swatches(frame) {
    return counts(frame.atomic_numbers)
      .map(
        ([z, n]) =>
          '<span><i style="background:' +
          color(z) +
          '"></i>' +
          sym(z) +
          " × " +
          n +
          "</span>",
      )
      .join("");
  }
  function labelSelect(text, cls, options) {
    return (
      '<label class="xp-select">' +
      text +
      '<select class="' +
      cls +
      '">' +
      options
        .map(([v, l]) => '<option value="' + v + '">' + l + "</option>")
        .join("") +
      "</select></label>"
    );
  }
  const seedSelect = (seeds) =>
    labelSelect(
      "种子",
      "xp-seed",
      seeds.map((s) => [s, s]),
    );
  const fileLink = (url, label) =>
    '<a href="' + url + '" download>' + label + "</a>";
  const reportLink = (path, label) =>
    '<a href="' + path + '">' + label + "</a>";

  // Orthographic projection of the supplied cell basis. A per-panel Å bar
  // reports the zoom applied to each cell, including the highly skewed cells.
  const vertices = Array.from({ length: 8 }, (_, i) => [
    i >> 2,
    (i >> 1) & 1,
    i & 1,
  ]);
  function crystal(canvas, frame, yaw, pitch) {
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (!frame || !w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [a, b, d] = frame.cell;
    const cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      cp = Math.cos(pitch),
      sp = Math.sin(pitch);
    function rotate([f, g, k]) {
      const q = a.map((v, j) => f * v + g * b[j] + k * d[j]);
      const x = cy * q[0] + sy * q[2],
        z = -sy * q[0] + cy * q[2];
      return [x, cp * q[1] - sp * z, sp * q[1] + cp * z];
    }
    const corners = vertices.map(rotate);
    const atoms = frame.frac_coords.map((p) =>
      rotate(p.map((x) => x - Math.floor(x))),
    );
    const points = [...corners, ...atoms];
    const bounds = [0, 1].map((k) => [
      Math.min(...points.map((p) => p[k])),
      Math.max(...points.map((p) => p[k])),
    ]);
    const zoom = Math.min(
      (w - 26) / Math.max(0.001, bounds[0][1] - bounds[0][0]),
      (h - 35) / Math.max(0.001, bounds[1][1] - bounds[1][0]),
    );
    const project = (p) => [
      w / 2 + (p[0] - (bounds[0][1] + bounds[0][0]) / 2) * zoom,
      (h - 9) / 2 - (p[1] - (bounds[1][1] + bounds[1][0]) / 2) * zoom,
      p[2],
    ];
    const box = corners.map(project),
      marks = atoms.map(project);
    let objects = [];
    box.forEach((p, i) =>
      [1, 2, 4].forEach((bit) => {
        const j = i ^ bit;
        if (j > i)
          objects.push({ line: true, p, q: box[j], z: (p[2] + box[j][2]) / 2 });
      }),
    );
    marks.forEach((p, i) =>
      objects.push({ p, z: p[2], element: frame.atomic_numbers[i] }),
    );
    objects.sort((u, v) => u.z - v.z);
    for (const ob of objects) {
      if (ob.line) {
        c.strokeStyle = "#a8b6b1";
        c.lineWidth = 1.08;
        c.beginPath();
        c.moveTo(ob.p[0], ob.p[1]);
        c.lineTo(ob.q[0], ob.q[1]);
        c.stroke();
      } else {
        const [x, y] = ob.p,
          r = Math.max(3, Math.min(7, w / 41));
        c.beginPath();
        c.arc(x, y, r, 0, 2 * Math.PI);
        const pigment = c.createRadialGradient(
          x - r * 0.38,
          y - r * 0.42,
          r * 0.04,
          x,
          y,
          r,
        );
        pigment.addColorStop(0, "#f6f7f5");
        pigment.addColorStop(0.35, color(ob.element));
        pigment.addColorStop(1, color(ob.element));
        c.fillStyle = pigment;
        c.fill();
        c.strokeStyle = ob.element === 101 ? "#77847d" : "#46534d";
        c.lineWidth = 0.8;
        c.stroke();
        if (ob.element === 101) {
          c.beginPath();
          c.moveTo(x - r * 0.42, y);
          c.lineTo(x + r * 0.42, y);
          c.stroke();
        }
      }
    }
    const target = Math.min(44, w * 0.23) / zoom;
    const unit = Math.pow(10, Math.floor(Math.log10(target)));
    const length = (target / unit >= 5 ? 5 : target / unit >= 2 ? 2 : 1) * unit;
    const y = h - 8,
      x = 8;
    c.strokeStyle = "#56665d";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y - 3);
    c.lineTo(x, y);
    c.lineTo(x + length * zoom, y);
    c.lineTo(x + length * zoom, y - 3);
    c.stroke();
    c.font = "10px system-ui";
    c.fillStyle = "#38453e";
    c.fillText(Number(length.toPrecision(2)) + " Å", x, y - 5);
  }
  function makePanels(container, titles) {
    container.innerHTML = titles
      .map(
        ({ title, color: c }) =>
          '<div class="xp-case"><header>' +
          (c
            ? '<span class="xp-chip" style="--xp-method:' + c + '"></span>'
            : "") +
          '<strong class="xp-title">' +
          title +
          '</strong></header><canvas class="xp-crystal" aria-label="' +
          title +
          '晶体投影，可拖动同步旋转"></canvas>' +
          '<div class="xp-meta"></div></div>',
      )
      .join("");
    const cards = [...container.children];
    let frames = [],
      yaw = 0.62,
      pitch = 0.38;
    const render = () =>
      cards.forEach((card, i) =>
        crystal(card.querySelector("canvas"), frames[i], yaw, pitch),
      );
    for (const canvas of container.querySelectorAll("canvas")) {
      let drag = null;
      canvas.addEventListener("pointerdown", (e) => {
        drag = [e.clientX, e.clientY];
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!drag) return;
        yaw += (e.clientX - drag[0]) * 0.012;
        pitch += (e.clientY - drag[1]) * 0.012;
        drag = [e.clientX, e.clientY];
        render();
      });
      canvas.addEventListener("lostpointercapture", () => {
        drag = null;
      });
    }
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return (views) => {
      frames = views.map((x) => x.frame);
      cards.forEach((card, i) => {
        const v = views[i];
        if (v.title) card.querySelector(".xp-title").textContent = v.title;
        card.querySelector(".xp-meta").innerHTML =
          '<strong class="xp-formula">' +
          v.heading +
          "</strong>" +
          '<span class="xp-values">' +
          v.details +
          '</span><div class="xp-links"><div class="xp-swatch-list">' +
          swatches(v.frame) +
          "</div>" +
          v.link +
          "</div>";
        card
          .querySelector("canvas")
          .setAttribute(
            "aria-label",
            (v.title || titles[i].title) + "，" + v.heading + "，" + v.details,
          );
      });
      render();
    };
  }

  function sampler(root) {
    root.innerHTML =
      '<div class="xp-comparison-switch" role="group" aria-label="选择采样比较方式"><button type="button" data-compare="seeds" aria-pressed="true">固定采样器 · 比较起点</button><button type="button" data-compare="methods" aria-pressed="false">固定起点 · 比较采样器</button></div>' +
      '<div class="xp-toolbar">' +
      labelSelect(
        "采样器",
        "xp-method",
        methods.map((m) => [m.key, m.title]),
      ) +
      seedSelect([48, 42, 43, 142, 143, 148]) +
      '<span class="xp-selection xp-pair-info"></span></div>' +
      '<div class="xp-views"></div><div class="xp-playback"><button class="xp-play" type="button">播放轨迹</button>' +
      '<input class="xp-range" type="range" min="0" max="51" step="1" value="0" aria-label="三条采样轨迹的同步进度"><output></output>' +
      '<button class="xp-end" type="button">最终结构</button></div>' +
      '<p class="xp-insight"></p><div class="xp-section-top"><strong class="xp-chart-title"></strong>' +
      labelSelect("观察量", "xp-metric", [
        ["volume", "每原子体积"],
        ["mask", "未定元素数"],
      ]) +
      "</div>" +
      '<svg class="xp-chart" role="img"></svg>' +
      '<p class="xp-note">曲线含全部 1,000 个噪声级，晶胞显示其中 51 帧及独立终态。各视图按晶胞缩放，左下标尺为实际长度；拖动任一晶胞可同步旋转。</p>' +
      '<p class="xp-foot">' +
      '<a class="xp-metrics-link">逐样本指标 CSV</a> · <a class="xp-levels-link">逐级记录 CSV</a></p>';
    const select = root.querySelector(".xp-seed"),
      method = root.querySelector(".xp-method"),
      toggles = [...root.querySelectorAll("[data-compare]")],
      range = root.querySelector(".xp-range"),
      play = root.querySelector(".xp-play"),
      metric = root.querySelector(".xp-metric"),
      svg = root.querySelector(".xp-chart");
    const panels = makePanels(root.querySelector(".xp-views"), methods);
    const fixedSeeds = Object.keys(data.fixedSampler).sort(
      (a, b) => Number(a) - Number(b),
    );
    let compare = "seeds";
    function series() {
      if (compare === "seeds") {
        return fixedSeeds.map((seed, i) => ({
          title: "起点 " + seed,
          color: methods[i].color,
          seed,
          mode: method.value,
          run: data.fixedSampler[seed][method.value],
        }));
      }
      const seed = select.value;
      const all = data.fixedSampler[seed] || data.sampler[seed];
      return methods.map((m) => ({ ...m, seed, mode: m.key, run: all[m.key] }));
    }
    let frame = 0,
      timer = null,
      lastGeometry = "",
      chartBounds = null;
    function chart() {
      const width = svg.clientWidth,
        height = svg.clientHeight;
      if (!width || !height) return;
      const cacheKey = [
        width,
        height,
        compare,
        method.value,
        select.value,
        metric.value,
      ].join("-");
      const compared = series(),
        name = metric.value,
        isVolume = name === "volume";
      if (cacheKey !== lastGeometry) {
        lastGeometry = cacheKey;
        const left = 42,
          right = width - 22,
          top = 10,
          bottom = height - 35;
        const values = compared.map(({ run }) => [
          ...run[name],
          isVolume ? run.final.volume_per_atom : run.final.mask_count,
        ]);
        const low = isVolume
          ? Math.floor(Math.log10(Math.min(...values.flat())))
          : 0;
        const high = isVolume
          ? Math.ceil(Math.log10(Math.max(...values.flat())))
          : Math.max(...compared.map((v) => Number(v.run.metrics.num_atoms)));
        const x = (i) => left + (right - left) * (i / 1000);
        const y = (v) =>
          bottom -
          ((bottom - top) * ((isVolume ? Math.log10(v) : v) - low)) /
            (high - low);
        const ticks = isVolume
          ? Array.from({ length: high - low + 1 }, (_, k) => 10 ** (k + low))
          : [...new Set([0, Math.floor(high / 2), high])];
        let output = ticks
          .map(
            (v) =>
              '<line class="xp-grid" x1="' +
              left +
              '" x2="' +
              right +
              '" y1="' +
              y(v) +
              '" y2="' +
              y(v) +
              '"/>' +
              '<text x="' +
              (left - 6) +
              '" y="' +
              (y(v) + 3) +
              '" text-anchor="end">' +
              v +
              "</text>",
          )
          .join("");
        compared.forEach((m, j) => {
          const coords = values[j]
            .slice(0, -1)
            .map((v, i) => x(i).toFixed(2) + "," + y(v).toFixed(2))
            .join(" ");
          output +=
            '<polyline stroke="' +
            m.color +
            '" stroke-width="1.3" opacity=".88" points="' +
            coords +
            '"/>' +
            '<circle cx="' +
            x(1000) +
            '" cy="' +
            y(values[j][1000]) +
            '" r="2.5" fill="' +
            m.color +
            '"/>';
        });
        [0, 250, 500, 750, 1000].forEach((v) => {
          output +=
            '<text x="' +
            x(v) +
            '" y="' +
            (bottom + 15) +
            '" text-anchor="middle">' +
            (v === 1000 ? "终态" : v) +
            "</text>";
        });
        output +=
          '<text x="' +
          (left + right) / 2 +
          '" y="' +
          (height - 3) +
          '" text-anchor="middle">生成进度 / 已完成的噪声级数</text>';
        output +=
          '<line class="xp-cursor" y1="' +
          top +
          '" y2="' +
          bottom +
          '" stroke="#252d29" stroke-width="1" stroke-dasharray="3 3"/>';
        svg.innerHTML = output;
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);
        svg.setAttribute(
          "aria-label",
          "随噪声层级推进的三条" +
            (isVolume
              ? "每原子晶胞体积曲线，对数纵轴，Å³ 每位点"
              : "未定元素数量曲线"),
        );
        root.querySelector(".xp-chart-title").textContent = isVolume
          ? "每原子体积 / Å³（对数轴）"
          : "未定元素数 / 位点";
        chartBounds = { left, right, x };
      }
      const level = frame === 51 ? 1000 : compared[0].run.frames[frame].level;
      const line = svg.querySelector(".xp-cursor"),
        pos = chartBounds.x(level);
      line.setAttribute("x1", pos);
      line.setAttribute("x2", pos);
    }
    function update() {
      const compared = series(),
        final = frame === 51;
      const differentPriors = compare === "seeds";
      const fixedN = differentPriors || !!data.fixedSampler[select.value];
      const directory = fixedN
        ? "training_free_sampler_fixed_n"
        : "training_free_sampler";
      select.closest("label").hidden = differentPriors;
      method.closest("label").hidden = !differentPriors;
      root.querySelector(".xp-pair-info").textContent = differentPriors
        ? "8 个位点 · 同一权重与后续随机种子 · 仅重抽初始坐标和晶格"
        : "共用完整初态与元素随机流 · " +
          compared[0].run.metrics.num_atoms +
          " 个位点";
      root.querySelector(".xp-metrics-link").href =
        "analysis/" + directory + "/metrics.csv";
      root.querySelector(".xp-levels-link").href =
        "analysis/" + directory + "/levels.csv";
      const currentFrames = compared.map(({ run }) =>
        final ? run.final : run.frames[frame],
      );
      const formulas = new Set(
        compared.map(({ run }) => pretty(run.metrics.formula)),
      );
      let insight;
      if (final) {
        insight =
          "三个终态得到 " +
          formulas.size +
          " 种晶胞组成，每位点体积依次为 " +
          currentFrames.map((f) => fmt(f.volume_per_atom)).join("、") +
          " Å³。";
      } else if (frame === 0) {
        insight = differentPriors
          ? "三列都从 8 个 MASK 开始。观察晶胞轮廓和站点分布，三个起点的几何已经不同。"
          : "三列第一帧逐张量相同。拖动时间轴，可以看到三种更新规则从哪一段开始分开。";
      } else {
        const masks = currentFrames.map((s) => s.mask_count);
        insight =
          "在当前噪声级，三列尚待确定元素的位点数依次为 " +
          masks.join("、") +
          "。";
      }
      root.querySelector(".xp-insight").textContent = insight;
      range.value = frame;
      root.querySelector("output").textContent = final
        ? "独立终态"
        : "层级 " + compared[0].run.frames[frame].level;
      root.querySelector(".xp-end").setAttribute("aria-pressed", String(final));
      panels(
        compared.map((m) => {
          const r = m.run,
            s = final ? r.final : r.frames[frame],
            z = r.metrics;
          return {
            title: m.title,
            frame: s,
            heading: final
              ? pretty(z.formula)
              : fmt(s.volume_per_atom) + " Å³/位点",
            details: final
              ? fmt(s.volume_per_atom) +
                " Å³/位点 · " +
                z.denoiser_calls +
                " 次调用 · " +
                fmt(z.runtime_seconds, 1) +
                " s"
              : "元素待定 " + s.mask_count + " / " + z.num_atoms,
            link: final
              ? fileLink(
                  "analysis/" +
                    directory +
                    "/seed" +
                    m.seed +
                    "_" +
                    m.mode +
                    "/final.cif",
                  "CIF ↓",
                )
              : "",
          };
        }),
      );
      chart();
    }
    function stop() {
      clearInterval(timer);
      timer = null;
      play.textContent = "播放轨迹";
    }
    play.addEventListener("click", () => {
      if (timer) {
        stop();
        return;
      }
      if (frame >= 51) frame = 0;
      update();
      play.textContent = "暂停";
      timer = setInterval(() => {
        frame++;
        update();
        if (frame === 51) stop();
      }, 190);
    });
    range.addEventListener("input", () => {
      stop();
      frame = Number(range.value);
      update();
    });
    root.querySelector(".xp-end").addEventListener("click", () => {
      stop();
      frame = 51;
      update();
    });
    for (const input of [select, method])
      input.addEventListener("change", () => {
        stop();
        update();
      });
    for (const button of toggles)
      button.addEventListener("click", () => {
        stop();
        compare = button.dataset.compare;
        toggles.forEach((b) =>
          b.setAttribute("aria-pressed", String(b === button)),
        );
        update();
      });
    metric.addEventListener("change", chart);
    svg.addEventListener("click", (e) => {
      if (!chartBounds) return;
      const x = e.clientX - svg.getBoundingClientRect().left;
      const level =
        (1000 * (x - chartBounds.left)) /
        (chartBounds.right - chartBounds.left);
      const frames = series()[0].run.frames;
      frame =
        level >= 999.5
          ? 51
          : frames.reduce(
              (best, f, i) =>
                Math.abs(f.level - level) < Math.abs(frames[best].level - level)
                  ? i
                  : best,
              0,
            );
      stop();
      update();
    });
    new ResizeObserver(chart).observe(svg);
    new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) stop();
    }).observe(root);
    update();
  }

  function guidance(root) {
    root.innerHTML =
      '<div class="xp-toolbar">' +
      labelSelect("目标体系", "xp-target", [
        ["Mg-O", "Mg–O"],
        ["Al-O", "Al–O"],
      ]) +
      labelSelect("输出筛选", "xp-mask", [
        ["official", "官方配置"],
        ["ablation", "移除目标白名单"],
      ]) +
      '<span class="xp-scope xp-selection"></span></div>' +
      '<div class="xp-section-top"><strong>随 γ 变化，生成配比怎样改变？</strong></div>' +
      '<div class="xp-gamma-grid" role="group" aria-label="点选引导强度查看两份实测晶胞"></div>' +
      '<p class="xp-gamma-caption">每档上、下两行依次是种子 42 和 43。短条表示氧占全部位点的比例。选一档查看两个独立终态。</p>' +
      '<div class="xp-section-top"><strong class="xp-gamma-title"></strong><span class="xp-gamma-meaning xp-selection"></span></div>' +
      '<div class="xp-views xp-gamma-pair"></div><p class="xp-insight" aria-live="polite"></p>' +
      '<p class="xp-note"></p><p class="xp-foot"></p>';
    const target = root.querySelector(".xp-target"),
      mask = root.querySelector(".xp-mask");
    const grid = root.querySelector(".xp-gamma-grid");
    const seeds = [42, 43],
      urls = new Map();
    let selected = 0.25;
    const panels = makePanels(
      root.querySelector(".xp-views"),
      seeds.map((seed) => ({ title: "种子 " + seed })),
    );
    function download(row, ablation) {
      const key = (ablation ? "embedding-only-" : "official-") + row.id;
      if (!urls.has(key))
        urls.set(
          key,
          URL.createObjectURL(new Blob([row.cif], { type: "chemical/x-cif" })),
        );
      return (
        '<a download="' + key + '.cif" href="' + urls.get(key) + '">CIF ↓</a>'
      );
    }
    function update() {
      mask.options[1].disabled = target.value !== "Mg-O";
      if (mask.options[1].disabled) mask.value = "official";
      const ablation = mask.value === "ablation";
      const base = data.chemical.filter((row) => row.target === target.value);
      const rows = ablation
        ? [
            ...base.filter((row) => Number(row.guidance_scale) === 0),
            ...data.ablation.filter((row) => row.target === target.value),
          ]
        : base;
      const scales = [
        ...new Set(rows.map((row) => Number(row.guidance_scale))),
      ].sort((a, b) => a - b);
      if (!scales.includes(selected)) selected = 1;
      const byScale = (g) =>
        seeds.map((seed) =>
          rows.find(
            (row) =>
              Number(row.seed) === seed && Number(row.guidance_scale) === g,
          ),
        );
      grid.replaceChildren(
        ...scales.map((g) => {
          const pair = byScale(g);
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.gamma = g;
          button.setAttribute("aria-pressed", String(selected === g));
          button.setAttribute(
            "aria-label",
            "γ = " +
              g +
              "，种子 42 与 43 的产物 " +
              pair.map((r) => pretty(r.cell_formula)).join("，"),
          );
          button.innerHTML =
            "<strong>γ = " +
            g +
            "</strong>" +
            pair
              .map(
                (r) =>
                  '<span class="xp-gamma-result">' +
                  pretty(r.cell_formula) +
                  '<i class="xp-composition"><b style="width:' +
                  Number(r.oxygen_site_fraction) * 100 +
                  '%"></b></i></span>',
              )
              .join("");
          button.addEventListener("click", () => {
            selected = g;
            update();
            grid
              .querySelector('[data-gamma="' + g + '"]')
              .focus({ preventScroll: true });
          });
          return button;
        }),
      );
      root.querySelector(".xp-scope").textContent =
        scales.length + " 档实测强度 · 每档两个配对种子";
      root.querySelector(".xp-gamma-title").textContent =
        "γ = " + selected + " 的最终晶胞";
      root.querySelector(".xp-gamma-meaning").textContent =
        selected === 0
          ? "仅调用无条件分支"
          : selected === 1
            ? "仅调用条件分支"
            : selected < 1
              ? "两种预测之间插值"
              : "沿条件差值方向外推";
      const pair = byScale(selected);
      panels(
        pair.map((row) => ({
          frame: row.frame,
          heading: pretty(row.cell_formula),
          details:
            (row.exact_element_set_hit === "True"
              ? "元素集合命中"
              : "元素集合未命中") +
            " · O 占 " +
            Math.round(
              Number(row.oxygen_site_fraction) * Number(row.site_count),
            ) +
            "/" +
            row.site_count +
            " · " +
            fmt(row.volume_per_atom_A3) +
            " Å³/位点",
          link: download(row, ablation && selected > 0),
        })),
      );
      const hits = pair.filter(
        (r) => r.exact_element_set_hit === "True",
      ).length;
      root.querySelector(".xp-insight").textContent =
        "两份终态有 " +
        hits +
        "/2 恰好包含 " +
        target.value.replace("-", " 和 ") +
        " 两种元素。目标指定元素集合，晶胞内各元素的数目由采样决定。";
      if (!ablation) {
        const allTargets = data.chemical.filter(
          (r) => Number(r.guidance_scale) === selected,
        );
        const n = allTargets.filter(
          (r) => r.exact_element_set_hit === "True",
        ).length;
        root.querySelector(".xp-insight").textContent +=
          " 合计两个目标 " +
          n +
          "/" +
          allTargets.length +
          " 命中（两个独立种子）。";
        if (selected === 0.25 && target.value === "Mg-O") {
          root.querySelector(".xp-insight").textContent +=
            " 种子 42 生成 Mg₈，八个位点都选了允许的 Mg，仍然缺少 O。";
        }
      }
      root.querySelector(".xp-note").textContent = ablation
        ? "这组消融只做了 Mg–O 的 γ = 1、2。γ = 0 复用同一目标的无条件参考；保留学习到的条件嵌入与全局元素筛选。"
        : "每个种子跨档位共享初始晶体。官方条件分支还屏蔽目标外元素，因此集合命中同时受白名单和模型预测影响。";
      root.querySelector(".xp-foot").innerHTML =
        reportLink("analysis/training_free_control/results.csv", "原三档 CSV") +
        " · " +
        reportLink(
          "analysis/training_free_control_extended/results.csv",
          "完整七档 CSV",
        ) +
        " · " +
        reportLink(
          "analysis/training_free_control_embedding_only/results.csv",
          "白名单消融 CSV",
        );
    }
    [target, mask].forEach((input) => input.addEventListener("change", update));
    update();
  }

  function symmetry(root) {
    root.innerHTML =
      '<div class="xp-toolbar">' +
      labelSelect("配对初态", "xp-sample", [
        ["0", "A · 8 位点"],
        ["1", "B · 4 位点"],
        ["2", "C · 10 位点"],
        ["3", "D · 20 位点"],
      ]) +
      labelSelect("距离容差", "xp-tol", [
        ["0.05", "0.05 Å"],
        ["0.01", "0.01 Å"],
        ["0.10", "0.10 Å"],
      ]) +
      '<span class="xp-selection">角度容差 5° · 未弛豫 CIF</span></div>' +
      '<div class="xp-views"></div>' +
      '<div class="xp-section-top"><strong>由 spglib 识别的空间群编号</strong><span class="xp-selection">4 组配对初态</span></div>' +
      '<table class="xp-table"><thead><tr><th>配对初态</th><th>γ = 0 参考</th><th>请求 #1</th><th>请求 #225</th></tr></thead><tbody></tbody></table>' +
      '<p class="xp-note"></p><p class="xp-foot">' +
      reportLink(
        "analysis/training_free_spacegroup/symmetry.csv",
        "全部容差 CSV",
      ) +
      "</p>";
    const panels = makePanels(root.querySelector(".xp-views"), [
      { title: "无引导 · γ = 0" },
      { title: "请求 #1 · γ = 2" },
      { title: "请求 #225 · γ = 2" },
    ]);
    const select = root.querySelector(".xp-sample"),
      tol = root.querySelector(".xp-tol");
    const arms = ["reference", "target_1", "target_225"];
    const lookup = (id, arm) =>
      data.symmetry.find((r) => r.arm === arm && r.sample === String(id));
    const group = (row) => Number(row["sg_" + tol.value + "A"]);
    function update() {
      const selected = Number(select.value);
      panels(
        arms.map((arm) => {
          const r = lookup(selected, arm);
          return {
            frame: r.frame,
            heading: pretty(r.formula),
            details:
              "测得 #" +
              group(r) +
              " · " +
              fmt(r.volume_per_atom_A3) +
              " Å³/位点",
            link: fileLink(
              "analysis/training_free_spacegroup/" +
                arm +
                "_" +
                selected +
                ".cif",
              "CIF ↓",
            ),
          };
        }),
      );
      root.querySelector("tbody").innerHTML = [0, 1, 2, 3]
        .map(
          (id) =>
            '<tr data-current="' +
            (id === selected) +
            '"><th scope="row">' +
            "ABCD"[id] +
            " · " +
            lookup(id, "reference").n_atoms +
            " 位点</th>" +
            arms
              .map((arm, j) => {
                const n = group(lookup(id, arm)),
                  hit = j > 0 && n === (j === 1 ? 1 : 225);
                return (
                  '<td><span class="' +
                  (hit ? "xp-hit" : "") +
                  '">#' +
                  n +
                  (hit ? " ✓" : "") +
                  "</span></td>"
                );
              })
              .join("") +
            "</tr>",
        )
        .join("");
      const hit = arms
        .slice(1)
        .map(
          (arm, i) =>
            [0, 1, 2, 3].filter(
              (id) => group(lookup(id, arm)) === (i === 0 ? 1 : 225),
            ).length,
        );
      root.querySelector(".xp-note").textContent =
        "在 " +
        tol.value +
        " Å 下，请求 #1 命中 " +
        hit[0] +
        "/4，请求 #225 命中 " +
        hit[1] +
        "/4。投影采用输出晶胞基矢，编号由读回 CIF 后的几何对称性确定。";
    }
    select.addEventListener("change", update);
    tol.addEventListener("change", update);
    update();
  }

  function conditionPair(root) {
    const { indices, paths } = window.conditionPaths;
    root.innerHTML = '<div class="xp-toolbar">' + labelSelect('固定目标元素', 'xp-target', [['Mg-O','Mg–O'], ['Al-O','Al–O']]) +
      labelSelect('固定引导强度', 'xp-scale', [['1','γ = 1'], ['2','γ = 2']]) + '<span>chemical_system · PC · 1,000 个噪声级</span></div>' +
      '<div class="xp-views xp-gamma-pair"></div><label class="xp-playback">同步查看轨迹 <input type="range" min="0" max="' + indices.length + '" value="' + indices.length + '"><output></output></label>' +
      '<p class="xp-insight"></p><p class="xp-note">目标指定允许的元素，配比由模型生成。两个种子同时影响初态、位点数和反向采样随机数。上方的 8 位点实验可单独观察初态变化。</p>' +
      reportLink('analysis/training_free_control/results.csv', '查看逐样本记录');
    const target = root.querySelector('.xp-target'), scale = root.querySelector('.xp-scale'), progress = root.querySelector('input');
    const panels = makePanels(root.querySelector('.xp-views'), [42, 43].map(seed => ({title: '种子 ' + seed})));
    function update() {
      const step = Number(progress.value), final = step === indices.length;
      const pair = [42, 43].map(seed => data.chemical.find(row => row.id === `seed${seed}-${target.value}-g${scale.value}`));
      root.querySelector('output').textContent = final ? '最终晶胞' : `轨迹记录 ${indices[step] + 1} / 2,000`;
      panels(pair.map(row => {
        const frame = final ? row.frame : paths[row.id][step];
        return {frame, heading: final ? pretty(row.cell_formula) : `未定元素 ${frame.atomic_numbers.filter(z => z === 101).length} / ${row.site_count}`,
          details: `${row.site_count} 个位点 · ${fmt(frame.volume_per_atom)} Å³/位点`, link: ''};
      }));
      root.querySelector('.xp-insight').textContent = scale.value === '2'
        ? (target.value === 'Mg-O' ? '两个终态均命中 Mg–O，Mg:O 分别为 3:5 和 1:1。' : '两个终态均命中 Al–O，Al:O 分别为 3:5 和 1:1。')
        : target.value === 'Mg-O'
        ? '终态 Mg₄O₄ 和 Mg₂O₂ 的晶胞大小不同，Mg:O 都是 1:1。'
        : '终态 Al₂O₆ 和 AlO₃ 均只含 Al、O，Al:O 都是 1:3。';
    }
    target.onchange = scale.onchange = progress.oninput = update;
    update();
  }

  function mount() {
    if (!data) return;
    [
      ["sampler-experiment", sampler],
      ["condition-pair", conditionPair],
      ["guidance-experiment", guidance],
      ["symmetry-experiment", symmetry],
    ].forEach(([id, render]) => {
      const root = document.getElementById(id);
      if (root) {
        root.classList.add("experiment-view");
        render(root);
      }
    });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();
