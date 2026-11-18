/* Interactive field, geometry and condition illustrations for the first three chapters. */
"use strict";
(() => {
  const element = (tag, cls, content) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = content;
    return node;
  };
  const svg = (tag, attrs, content) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attrs))
      node.setAttribute(name, value);
    if (content !== undefined) node.textContent = content;
    return node;
  };
  const teal = "#00685d",
    copper = "#9b4e28",
    grey = "#a9b8b2",
    ink = "#21342e";
  function diagram(label, width = 360, height = 144) {
    return svg("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": label,
      class: "focus-graphic",
    });
  }
  function line(s, p, q, color = grey, weight = 1.4, dotted = false) {
    const l = svg("line", {
      x1: p[0],
      y1: p[1],
      x2: q[0],
      y2: q[1],
      stroke: color,
      "stroke-width": weight,
      "stroke-linecap": "round",
    });
    if (dotted) l.setAttribute("stroke-dasharray", "4 4");
    s.append(l);
  }
  function label(s, p, value, size = 12, color = ink, align = "start") {
    s.append(
      svg(
        "text",
        {
          x: p[0],
          y: p[1],
          fill: color,
          "font-size": size,
          "font-weight": 600,
          "text-anchor": align,
        },
        value,
      ),
    );
  }
  function dot(s, p, radius, color, ring = false) {
    if (ring)
      s.append(
        svg("circle", {
          cx: p[0],
          cy: p[1],
          r: radius + 4,
          fill: "none",
          stroke: color,
          "stroke-width": 1.1,
        }),
      );
    s.append(
      svg("circle", {
        cx: p[0],
        cy: p[1],
        r: radius,
        fill: color,
        stroke: "white",
        "stroke-width": 1,
      }),
    );
  }
  function arrow(s, p, q, color) {
    line(s, p, q, color, 2.8);
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    for (const delta of [-0.5, 0.5])
      line(
        s,
        q,
        [q[0] - 8 * Math.cos(a + delta), q[1] - 8 * Math.sin(a + delta)],
        color,
        2.3,
      );
  }
  const add = (p, q) => p.map((x, i) => x + q[i]);
  const sub = (p, q) => p.map((x, i) => x - q[i]);
  const scale = (p, k) => p.map((x) => x * k);
  const dp = (p, q) => p.reduce((s, x, i) => s + x * q[i], 0);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const basis = (f, L) =>
    L.reduce((r, v, i) => add(r, scale(v, f[i])), [0, 0, 0]);
  const frac = (p, L) =>
    L.map(
      (_, i) =>
        dp(p, cross(L[(i + 1) % 3], L[(i + 2) % 3])) /
        dp(L[0], cross(L[1], L[2])),
    );
  function controls(names, action, groupLabel) {
    const bar = element("div", "focus-switch");
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", groupLabel);
    names.forEach(([key, name]) => {
      const b = element("button", "", name);
      b.type = "button";
      b.dataset.focusKey = key;
      b.addEventListener("click", () => {
        setPressed(bar, b);
        action(key);
      });
      bar.append(b);
    });
    return bar;
  }
  function setPressed(bar, target) {
    for (const b of bar.querySelectorAll("button"))
      b.setAttribute("aria-pressed", String(b === target));
  }
  function box(title) {
    const fig = element("figure", "focus-figure");
    fig.append(element("figcaption", "focus-caption", title));
    return fig;
  }
  function fieldDiagram(kind, crystal) {
    const L = crystal.l;
    const origin = [70, 105];
    const project = ([x, y, z]) => [
      origin[0] + x * 24 + y * 10,
      origin[1] + x * 4 - y * 18 - z * 12,
    ];
    const s = diagram(
      {
        A: "三行元素编码对应三个晶体站点",
        F: "第一行分数坐标沿三条晶格向量定位 Cu",
        L: "原胞的三条晶格基矢及实测长度",
      }[kind],
    );
    for (let k = 0; k < 8; k++) {
      const bits = [(k >> 2) & 1, (k >> 1) & 1, k & 1],
        p = basis(bits, L);
      for (let i = 0; i < 3; i++)
        if (!bits[i])
          line(s, project(p), project(add(p, L[i])), "#c7d4cd", 1.3);
    }
    if (kind === "F") {
      const f = frac(crystal.p[0], L);
      let p = [0, 0, 0];
      for (let j = 0; j < 3; j++) {
        const q = add(p, scale(L[j], f[j]));
        arrow(s, project(p), project(q), [teal, "#74618d", copper][j]);
        p = q;
      }
      for (let j = 0; j < 3; j++)
        label(
          s,
          [226, 43 + j * 24],
          `${"abc"[j]}  ×  ${f[j].toFixed(3)}`,
          14,
          [teal, "#74618d", copper][j],
        );
      label(s, [226, 120], "第一行 · Cu", 11);
      dot(s, project(crystal.p[0]), 5, copper, true);
    } else if (kind === "L") {
      for (let j = 0; j < 3; j++) {
        const color = [teal, "#74618d", copper][j];
        arrow(s, origin, project(L[j]), color);
        label(s, add(project(L[j]), [5, -4]), "abc"[j], 13, color);
        label(
          s,
          [226, 45 + j * 25],
          `${"abc"[j]}   ${Math.hypot(...L[j]).toFixed(2)} Å`,
          14,
          color,
        );
      }
    } else {
      crystal.p.forEach((p, i) => {
        const q = project(p),
          r = [226, 40 + i * 28],
          color = crystal.z[i] === 29 ? copper : teal;
        line(s, q, [r[0] - 8, r[1] - 4], "#b9c7bf", 1, true);
        dot(s, q, 6, color, true);
        label(
          s,
          r,
          `${i + 1}    ${crystal.z[i]}    ${crystal.z[i] === 29 ? "Cu" : "Pd"}`,
          14,
          color,
        );
      });
    }
    return s;
  }
  function setupRepresentation(crystal) {
    const section = document.querySelector("#representation"),
      bar = section.querySelector(".field-picker"),
      grid = section.querySelector(".representation-grid");
    const names = {
      A: "辨认三个站点",
      F: "定位第一个 Cu",
      L: "展开三条晶格轴",
    };
    const instrument = box(""),
      read = section.querySelector(".readout");
    const caption = instrument.firstChild;
    read.prepend(instrument);
    bar.classList.add("focus-switch");
    bar.setAttribute("aria-label", "选择晶体讲解重点");
    for (const b of bar.querySelectorAll("button")) {
      const k = b.dataset.field;
      b.textContent = names[k];
      b.setAttribute("aria-controls", "field-focus");
      b.addEventListener("click", () => update(k));
    }
    instrument.id = "field-focus";
    grid.before(bar);
    const update = (k) => {
      caption.textContent = {
        A: "站点 → 原子序数",
        F: "分数坐标 → 晶胞中的位置",
        L: "三个基矢 → 一个晶胞",
      }[k];
      instrument.querySelector("svg")?.remove();
      instrument.append(fieldDiagram(k, crystal));
    };
    update("A");
  }
  function setupBackbone(crystal) {
    const section = document.querySelector("#backbone"),
      grid = section.querySelector(".representation-grid"),
      read = section.querySelector(".readout");
    const instrument = box(""),
      steps = [...read.querySelectorAll(".steps li")];
    const caption = instrument.firstChild,
      explanation = element("p", "focus-copy");
    instrument.append(explanation);
    read.prepend(instrument);
    const titles = [
      "跨过晶胞，仍是同一种 Pd",
      "两条邻边给出方向关系",
      "共享邻域信息，读出三种量",
    ];
    const desc = [
      "同一个 Pd 可以选取不同的周期像。点击左图的「胞内 / 跨边界」，观察同一对站点的位移与距离。",
      "以 Cu 为中心，把近邻方向两两配对。图中角度由终态坐标计算，三元组让网络能区分边长相似、排列不同的环境。",
      "在 t = 0.4 的真实前向中，三个站点各保留 512 维特征。位置与晶格读出还使用边的方向和几何信息。",
    ];
    const nearImage = add(crystal.p[2], basis([-1, 0, -1], crystal.l));
    const p = crystal.p[0],
      u = sub(nearImage, p),
      v = sub(crystal.p[1], p);
    const angle = Math.acos(
      Math.max(
        -1,
        Math.min(1, dp(u, v) / (Math.hypot(...u) * Math.hypot(...v))),
      ),
    );
    let active = "edge";
    function update(key) {
      active = key;
      const idx = ["edge", "triplet", "heads"].indexOf(key);
      steps.forEach((node, i) => (node.hidden = i !== idx));
      caption.textContent = titles[idx];
      explanation.textContent = desc[idx];
      instrument.querySelector("svg")?.remove();
      const s = diagram(titles[idx]);
      if (key === "edge") {
        const inCell =
          section
            .querySelector("[data-image=central]")
            .getAttribute("aria-pressed") === "true";
        const values = [
          ["胞内 Pd", Math.hypot(...sub(crystal.p[2], p))],
          ["周期像 Pd′", Math.hypot(...u)],
        ];
        values.forEach(([name, d], i) => {
          const y = 49 + i * 51,
            color = i === Number(!inCell) ? teal : "#a7b2ac";
          label(s, [5, y + 4], name, 13, color);
          line(s, [95, y], [95 + d * 39, y], color, 3);
          dot(s, [95, y], 5, color);
          dot(s, [95 + d * 39, y], 5, color);
          label(s, [104 + d * 39, y + 4], `${d.toFixed(2)} Å`, 13, color);
        });
      } else if (key === "triplet") {
        const c = [135, 100],
          a = [230, 100],
          b = [c[0] + 83 * Math.cos(angle), c[1] - 83 * Math.sin(angle)];
        line(s, c, a, teal, 3);
        line(s, c, b, copper, 3);
        dot(s, c, 8, copper, true);
        dot(s, a, 6, teal);
        dot(s, b, 6, copper);
        label(s, add(c, [-18, 24]), "Cu");
        label(s, add(a, [8, 5]), "Pd′");
        label(s, add(b, [-12, -10]), "Cu");
        const arcend = [
          c[0] + 25 * Math.cos(angle),
          c[1] - 25 * Math.sin(angle),
        ];
        s.append(
          svg("path", {
            d: `M ${c[0] + 25} ${c[1]} A 25 25 0 0 0 ${arcend.join(" ")}`,
            fill: "none",
            stroke: teal,
            "stroke-width": 2,
          }),
        );
        label(
          s,
          [196, 68],
          `${((angle * 180) / Math.PI).toFixed(1)}°`,
          17,
          teal,
        );
      } else {
        label(s, [12, 63], "GemNet-T", 16, teal);
        label(s, [12, 84], "共享骨干", 12);
        for (const [i, str] of [
          "元素 logits  [3, 101]",
          "位置向量  [3, 3]",
          "晶格张量  [1, 3, 3]",
        ].entries()) {
          const y = 32 + i * 40;
          line(s, [110, 69], [168, y], grey, 1.8);
          dot(s, [168, y], 4, teal);
          label(s, [179, y + 4], str, 13);
        }
      }
      instrument.insertBefore(s, explanation);
    }
    const bar = controls(
      [
        ["edge", "寻找周期邻居"],
        ["triplet", "测量三元组夹角"],
        ["heads", "跟踪网络读出"],
      ],
      update,
      "选择周期图网络重点",
    );
    grid.before(bar);
    for (const b of section.querySelectorAll("[data-image]"))
      b.addEventListener("click", () => {
        if (active === "edge") update("edge");
      });
    bar.querySelector("button").click();
  }
  function elementTiles(s, elems) {
    elems.forEach(([name, n], i) => {
      const x = 55 + i * 95;
      s.append(
        svg("rect", {
          x,
          y: 22,
          width: 74,
          height: 76,
          rx: 4,
          fill: "#eef5f1",
          stroke: teal,
          "stroke-width": 1.5,
        }),
      );
      label(s, [x + 8, 39], String(n), 10, teal);
      label(s, [x + 37, 76], name, 27, ink, "middle");
    });
  }
  function centering(s, centered) {
    const motif = [[0, 0]],
      half = [
        [0.5, 0],
        [0, 0.5],
      ];
    [0, 1].forEach((layer) => {
      const x = 54 + layer * 125,
        y = 27,
        size = 66;
      s.append(
        svg("rect", {
          x,
          y,
          width: size,
          height: size,
          fill: "#f1f5f2",
          stroke: grey,
        }),
      );
      const pts =
        layer === 0
          ? centered
            ? [...motif, [0.5, 0.5]]
            : motif
          : centered
            ? half
            : [];
      for (const [a, b] of pts)
        dot(s, [x + 14 + a * size, y + 13 + b * size], 5, teal, true);
      label(
        s,
        [x + size / 2, 117],
        layer === 0 ? "z = 0" : "z = ½",
        12,
        ink,
        "middle",
      );
    });
  }
  function setupConditions() {
    const section = document.querySelector("#conditions"),
      data = window.mattergenExperimentData;
    const panel = element("div", "focus-condition-panel"),
      choices = section.querySelector(".chooser"),
      body = section.querySelector(".condition-body");
    body.before(panel);
    let kind = "base",
      target = "Mg-O",
      group = "225";
    function render() {
      panel.replaceChildren();
      const request = box(""),
        observed = box(""),
        left = request.firstChild,
        right = observed.firstChild;
      if (kind === "base") {
        left.textContent = "生成要求 · 自由生成";
        right.textContent = "生成结果 · 两个实际种子";
        const s = diagram("相同基础权重从不同随机起点得到不同候选");
        label(s, [28, 74], "∅", 34, teal);
        line(s, [66, 67], [136, 67], grey, 2);
        for (let i = 0; i < 2; i++) {
          const y = 45 + i * 46;
          line(s, [136, 67], [178, y], teal, 2);
          dot(s, [178, y], 4, teal);
          label(s, [190, y + 4], `seed ${42 + i}`, 15);
        }
        request.append(
          s,
          element(
            "p",
            "focus-copy",
            "模型从训练时学到的分布抽取站点数，元素种类和排布由采样决定。",
          ),
        );
        for (const seed of [42, 43]) {
          const entry = window.BASE_CRYSTALS[seed];
          observed.append(
            resultRow(
              `seed ${seed} · ${entry.final.z.length} 个站点`,
              pretty(entry.formula),
            ),
          );
        }
      } else if (kind === "chem") {
        left.textContent = "生成要求 · 允许哪些元素";
        right.textContent = "固定 seed 42、8 个站点 · 实测组成";
        const bar = controls(
          [
            ["Mg-O", "Mg + O"],
            ["Al-O", "Al + O"],
          ],
          (v) => {
            target = v;
            render();
            restoreFocus(panel, v);
          },
          "选择化学体系",
        );
        setPressed(
          bar,
          [...bar.children].find((b) => b.dataset.focusKey === target),
        );
        request.append(bar);
        const s = diagram(
          "元素周期表卡片，活跃元素的原子序数对应 multi-hot 向量中的位置",
        );
        elementTiles(s, [
          [target === "Mg-O" ? "Mg" : "Al", target === "Mg-O" ? 12 : 13],
          ["O", 8],
        ]);
        request.append(
          s,
          element(
            "p",
            "focus-copy",
            `在 101 位元素向量中，第 8、${target === "Mg-O" ? 12 : 13} 位（按原子序数索引）为 1。元素数量和占比留给生成过程。`,
          ),
        );
        const rows = data.chemical
          .filter(
            (r) =>
              r.target === target &&
              Number(r.seed) === 42 &&
              [1, 2].includes(Number(r.guidance_scale)),
          )
          .sort((a, b) => Number(a.guidance_scale) - Number(b.guidance_scale));
        for (const r of rows) {
          const row = resultRow(
              `γ = ${r.guidance_scale}`,
              pretty(r.cell_formula),
            ),
            tokens = element("div", "focus-sites");
          tokens.setAttribute("aria-label", "色点仅表示站点数量");
          const oxy = Math.round(
            Number(r.oxygen_site_fraction) * Number(r.site_count),
          );
          for (let i = 0; i < Number(r.site_count); i++) {
            const symbol = i < r.site_count - oxy ? target.split("-")[0] : "O";
            const d = element("span", "", symbol);
            d.classList.toggle("oxygen", symbol === "O");
            tokens.append(d);
          }
          row.append(tokens);
          observed.append(row);
        }
        observed.append(
          element("p", "focus-note", "每个色点代表一个站点；按元素归类显示。"),
        );
        section.querySelector("#cond-symbol").textContent = target.replace(
          "-",
          "–",
        );
      } else {
        left.textContent = "生成要求 · 一组空间对称操作";
        right.textContent = "同一起点 · 批内样本 0 · γ = 2";
        const bar = controls(
          [
            ["225", "#225 · Fm3̅m"],
            ["1", "#1 · P1"],
          ],
          (v) => {
            group = v;
            render();
            restoreFocus(panel, v);
          },
          "选择目标空间群",
        );
        setPressed(
          bar,
          [...bar.children].find((b) => b.dataset.focusKey === group),
        );
        request.append(bar);
        const s = diagram("分数坐标切片，原始点与面心平移产生的三个等价点");
        centering(s, group === "225");
        request.append(
          s,
          element(
            "p",
            "focus-copy",
            group === "225"
              ? "常规立方胞的两个切片中，一个代表点经面心平移得到四个同类点。图中示意这组平移，#225 还包含旋转、反演等操作。"
              : "原胞内一般位置经恒等操作保留一个点。P1 的空间群操作由晶格平移与恒等操作构成。",
          ),
        );
        const r = data.symmetry.find(
          (r) => r.arm === `target_${group}` && Number(r.sample) === 0,
        );
        observed.append(
          resultRow("生成组成", pretty(r.formula)),
          resultRow("spglib 重新识别 · 0.05 Å", `#${r["sg_0.05A"]}`),
          element(
            "p",
            "focus-note",
            `整数 ${group} 减一后查 512 维嵌入。采样完成后，用生成的几何和元素检查对称性。`,
          ),
        );
        section.querySelector("#cond-symbol").textContent = `#${group}`;
      }
      panel.append(request, observed);
    }
    for (const b of choices.querySelectorAll("button"))
      b.addEventListener("click", () => {
        kind = b.dataset.cond;
        render();
      });
    choices.querySelector('[data-cond="chem"]').click();
  }
  function restoreFocus(panel, key) {
    panel
      .querySelector(`[data-focus-key="${key}"]`)
      ?.focus({ preventScroll: true });
  }
  const pretty = (str) => str.replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]);
  function resultRow(labelText, value) {
    const node = element("div", "focus-result");
    node.append(element("small", "", labelText), element("strong", "", value));
    return node;
  }
  function init() {
    const crystal = window.BASE_CRYSTALS["48"].final;
    setupRepresentation(crystal);
    setupBackbone(crystal);
    setupConditions();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else if (window.mattergenExperimentData) init();
  else window.addEventListener("DOMContentLoaded", init, { once: true });
})();
