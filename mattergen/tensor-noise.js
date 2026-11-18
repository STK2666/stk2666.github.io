/* Offline teaching views. The forward marginals come from the pinned MatterGen implementation. */
(() => {
  const experiment = window.TEACHING_NOISE;
  const section = document.getElementById("design-space");
  const diffusion = document.getElementById("diffusion");
  const clean = experiment.clean;
  const noisy = experiment.frames[40];
  const output = experiment.outputAt40;
  const fixed = (n) => n.toFixed(2);
  const element = (z) => ({ 29: "Cu", 46: "Pd", 101: "MASK" })[z] || String(z);
  function matrix(rows, formatter = fixed) {
    return `<div class="tn-mat" style="grid-template-columns:repeat(${rows[0].length},minmax(0,1fr))">${rows
      .flat()
      .map((v) => `<span>${formatter(v)}</span>`)
      .join("")}</div>`;
  }
  const channels = {
    A: {
      label: "A · 元素",
      field: "atomic_numbers",
      input: "[N] → [3]",
      kind: "吸收态 D3PM",
      rule: "每个位点保留原元素或转入 MASK。",
      inText:
        "三个编号依次对应 Cu、Cu、Pd。此噪声样本的三个位点恰好都保留了标签。",
      head: "元素分类头",
      shape: "[N, 101] → [3, 101]",
      operation:
        "节点特征经线性映射，每个位点输出 101 个 logits：前 100 列按原子序数排列，最后一列对应 MASK。",
      outText:
        "表中只截取 H、He、Li 三列。官方采样还会屏蔽不支持的元素。离散后验利用全部类别分数与当前类别计算上一步的分布。",
      getIn: () =>
        matrix(
          noisy.atomic_numbers.map((z) => [z]),
          String,
        ),
      getOut: () => matrix(output.atomic_numbers.map((row) => row.slice(0, 3))),
    },
    F: {
      label: "F · 分数坐标",
      field: "pos",
      input: "[N, 3] → [3, 3]",
      kind: "Wrapped VE",
      rule: "高斯位移叠加到三个分数坐标，再按单胞周期取模。",
      inText: "一行一个站点，三列给出沿晶格 a、b、c 的相对位置，范围 [0, 1)。",
      head: "位置向量头",
      shape: "[N, 3] → [3, 3]",
      operation: "对有向边的单位向量加权，按位点聚合，再映射到分数坐标系。",
      outText: "一行一个三维去噪信号。输出为边际标准差乘以 score；可正可负。",
      getIn: () => matrix(noisy.pos),
      getOut: () => matrix(output.pos),
    },
    L: {
      label: "L · 晶格",
      field: "cell",
      input: "[B, 3, 3] → [1, 3, 3]",
      kind: "有尺寸先验的 VP",
      rule: "原晶格向与站点数相关的立方中心收缩，同时混入对称高斯扰动。",
      inText: "批里只有一个晶胞。三行是晶格向量（Å）；预处理选择对称表示。",
      head: "晶格张量头",
      shape: "[B, 3, 3] → [1, 3, 3]",
      operation: "按边方向的外积汇集几何信号，在每个晶胞内读出对称矩阵。",
      outText: "每个晶胞共享一个去噪矩阵，对称位置的分量相同。",
      getIn: () => matrix(noisy.cell[0]),
      getOut: () => matrix(output.cell[0]),
    },
  };
  const tensor = document.createElement("article");
  tensor.className = "tn-card";
  tensor.innerHTML = `<h2>三个字段怎样通过同一个网络？</h2><p class="tn-text">Cu₂Pd 的一次真实前向 · B = 1 个晶胞，N = 3 个站点，t = 0.40。</p><div class="tn-choice" role="group" aria-label="追踪一个张量">${Object.entries(
    channels,
  )
    .map(
      ([key, c]) =>
        `<button type="button" data-tn-field="${key}">${c.label}</button>`,
    )
    .join(
      "",
    )}</div><div class="tn-flow" aria-live="polite"></div><p class="tn-link"><a href="analysis/architecture_probe.json">完整输入与全部输出 ↗</a></p>`;
  section.querySelector(".design").before(tensor);
  section.querySelector(".channel-row").hidden = true;
  section.querySelector(".channel-row").style.display = "none";
  function chooseField(key) {
    const c = channels[key];
    tensor
      .querySelectorAll("[data-tn-field]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.tnField === key),
      );
    tensor.querySelector(".tn-flow").innerHTML =
      `<div class="tn-panel"><span class="tn-kicker">带噪输入 · ${c.field}</span><h3>${c.input}</h3>${c.getIn()}<p class="tn-text">${c.inText}</p><p class="tn-note"><strong>${c.kind}</strong> · ${c.rule}</p></div><div class="tn-panel tn-net"><span class="tn-kicker">共同经过</span><h3>GemNet-T</h3><p class="tn-text">A 提供节点类别，F 和 L 决定周期邻居、边长与夹角。四个交互块让所有字段共享局部环境与时刻 t。</p><p class="tn-note">${c.operation}</p></div><div class="tn-panel"><span class="tn-kicker">${c.head} · 输出</span><h3>${c.shape}</h3>${c.getOut()}<p class="tn-text">${c.outText}</p></div>`;
  }
  tensor
    .querySelectorAll("[data-tn-field]")
    .forEach((b) =>
      b.addEventListener("click", () => chooseField(b.dataset.tnField)),
    );
  chooseField("A");

  const lab = document.createElement("article");
  lab.className = "tn-card";
  lab.innerHTML = `<h2>一个晶胞被加噪时，究竟改变了什么？</h2><p class="tn-text">左边固定 Cu₂Pd 的干净结构；右边读取官方加噪器在同一时刻对三个字段的采样。</p><div class="tn-choice" role="group" aria-label="选择要关注的变化"><button type="button" data-tn-mode="all">整个晶胞</button><button type="button" data-tn-mode="A">只看元素遮蔽</button><button type="button" data-tn-mode="F">只看周期位移</button><button type="button" data-tn-mode="L">只看晶胞变形</button></div><div class="tn-comparison"><figure><figcaption>干净输入 X₀</figcaption><div data-tn-clean></div></figure><figure><figcaption data-tn-label></figcaption><div data-tn-noisy></div></figure></div><div data-tn-range></div><div class="tn-eq" data-tn-eq></div><p class="tn-text tn-readout" data-tn-value aria-live="polite"></p><p class="tn-note">每个 t 用同一随机种子 17 独立调用边际加噪。拖动比较不同噪声强度，跨图相同编号对应同一站点。</p><p class="tn-link"><a href="https://github.com/STK2666/infh5000-trust-ai-materials/blob/69ae704b25769d64dff58480053e45585f69a254/members/tk/scripts/build_teaching_noise.py" title="课程仓库，需成员权限">复现这 101 个噪声时刻 ↗</a></p>`;
  const oldDemo = diffusion.querySelector(".diffusion-demo");
  oldDemo.before(lab);
  lab
    .querySelector("[data-tn-range]")
    .append(oldDemo.querySelector(".range-row"));
  const slider = document.getElementById("noise-time");
  slider.value = 40;
  const technical = document.createElement("details");
  technical.className = "tn-technical";
  technical.innerHTML = "<summary>查看三条理论噪声日程</summary>";
  oldDemo.before(technical);
  technical.append(oldDemo);
  const corners = Array.from({ length: 8 }, (_, i) => [
    i & 1,
    (i >> 1) & 1,
    (i >> 2) & 1,
  ]);
  const edges = corners.flatMap((_, i) =>
    [1, 2, 4].filter((bit) => !(i & bit)).map((bit) => [i, i + bit]),
  );
  function project(frac, cell) {
    const r = [0, 1, 2].map((a) =>
      frac.reduce((sum, f, b) => sum + (f - 0.5) * cell[b][a], 0),
    );
    return [
      r[0] * 0.88 - r[1] * 0.475,
      -r[2] * 0.86 + r[1] * 0.44 + r[0] * 0.24,
      r[0] * 0.4 + r[1] * 0.75 + r[2] * 0.51,
    ];
  }
  const tone = { 29: "#ae572e", 46: "#467590", 101: "#66716c" };
  function svg(graph, scale, basePos, baseCell) {
    const cell = graph.cell[0];
    function xy(f, l = cell) {
      const [x, y, z] = project(f, l);
      return [128 + scale * x, 99 + scale * y, z];
    }
    function line(a, b, style) {
      return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${style}/>`;
    }
    const wire = (l, style) =>
      edges
        .map(([i, j]) => line(xy(corners[i], l), xy(corners[j], l), style))
        .join("");
    let parts = baseCell
      ? wire(
          baseCell,
          'stroke="#8caaa0" stroke-dasharray="4 3" stroke-width="1.2"',
        )
      : "";
    parts += wire(cell, 'stroke="#405951" stroke-width="1.6"');
    if (basePos) {
      parts += basePos
        .map((f) => {
          const [x, y] = xy(f);
          return `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#80978d" stroke-dasharray="2.5 2"/>`;
        })
        .join("");
    }
    const atoms = graph.pos
      .map((f, i) => ({ p: xy(f), z: graph.atomic_numbers[i], i }))
      .sort((a, b) => a.p[2] - b.p[2]);
    for (const {
      p: [x, y],
      z,
      i,
    } of atoms) {
      parts += `<circle cx="${x}" cy="${y}" r="9" fill="${tone[z]}" stroke="white" stroke-width="1.5"/><text x="${x}" y="${y + 3.6}" fill="white" text-anchor="middle" font-size="10.5">${i + 1}</text>`;
    }
    return `<svg role="img" aria-label="按相同投影和比例绘制晶胞；位点标签 ${graph.atomic_numbers.map(element).join("、")}" viewBox="0 0 256 198" xmlns="http://www.w3.org/2000/svg">${parts}</svg>`;
  }
  const scale =
    78 /
    Math.max(
      ...[clean, ...experiment.frames].flatMap((g) =>
        corners.map((f) => {
          const [x, y] = project(f, g.cell[0]);
          return Math.max(Math.abs(y), Math.abs(x) * 0.8);
        }),
      ),
    );
  const caption = diffusion.querySelector("[data-tn-label]");
  const eq = {
    all: "Xₜ = (Aⱼ, Fₜ, Lₜ)　·　j = ⌊999t⌋ + 1",
    A: "P(Aⱼ = MASK ∣ A₀) = j / 1000",
    F: "Fₜ = (F₀ + σₙ(t) ε) mod 1　·　σₙ(t) = 0.01 × 500ᵗ / ∛n",
    L: "Lₜ = μₙ + αₜ (L₀ − μₙ) + √[vₙ (1 − αₜ²)] Eₛᵧₘ",
  };
  let mode = "all";
  function update() {
    const i = Number(slider.value),
      t = i / 100,
      frame = experiment.frames[i];
    const display = {
      atomic_numbers:
        mode === "all" || mode === "A"
          ? frame.atomic_numbers
          : clean.atomic_numbers,
      pos: mode === "all" || mode === "F" ? frame.pos : clean.pos,
      cell: mode === "all" || mode === "L" ? frame.cell : clean.cell,
    };
    lab.querySelector("[data-tn-noisy]").innerHTML = svg(
      display,
      scale,
      mode === "F" ? clean.pos : null,
      mode === "L" ? clean.cell[0] : null,
    );
    caption.textContent =
      mode === "all"
        ? `联合采样 Xₜ · t = ${t.toFixed(2)}`
        : `${channels[mode].label} · 其余字段固定 · t = ${t.toFixed(2)}`;
    const j = Math.floor(999 * t) + 1,
      mask = frame.atomic_numbers.filter((z) => z === 101).length;
    const alpha = Math.exp(-0.05 * t - 4.975 * t * t);
    const readouts = {
      all: `位点 1–3 的标签依次是 ${frame.atomic_numbers.map(element).join("、")}。棕色为 Cu，蓝色为 Pd，灰色为 MASK；相同编号标识同一站点。`,
      A: `此刻每个位点被遮住的概率为 ${((100 * j) / 1000).toFixed(1)}%，本次实际遮住 ${mask}/3 个。已知位置和晶胞固定，灰色表示位点仍在、元素待定。`,
      F: `虚线圆是原位点。站点 1 的分数坐标从 (${clean.pos[0].map(fixed).join(", ")}) 变为 (${frame.pos[0].map(fixed).join(", ")})。跨越单胞边界后从对应的另一侧出现。ε 为标准高斯噪声。`,
      L: `虚线是原晶胞。原晶格系数 αₜ = ${alpha.toFixed(3)}；μₙ 是按站点数设定的立方中心，vₙ 为先验分量方差，Eₛᵧₘ 为对称高斯噪声。分数坐标固定时，站点随晶胞共同变形。`,
    };
    lab.querySelector("[data-tn-eq]").textContent = eq[mode];
    lab.querySelector("[data-tn-value]").textContent = readouts[mode];
    lab
      .querySelectorAll("[data-tn-mode]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.tnMode === mode),
      );
  }
  lab.querySelector("[data-tn-clean]").innerHTML = svg(
    clean,
    scale,
    null,
    null,
  );
  lab.querySelectorAll("[data-tn-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.tnMode;
      update();
    }),
  );
  slider.addEventListener("input", update);
  slider.dispatchEvent(new Event("input"));
  const lesson = document.createElement("article");
  lesson.className = "tn-card";
  lesson.innerHTML = `<h2>同一次网络调用，训练与生成怎样使用？</h2><div class="tn-choice" role="group" aria-label="选择训练或生成"><button type="button" data-tn-phase="train">训练 · 核对已知答案</button><button type="button" data-tn-phase="sample">生成 · 走一个反向步</button></div><div data-tn-lesson aria-live="polite"></div>`;
  technical.after(lesson);
  const phases = {
    train: `<div class="tn-eq">ℒ = ℒ<sub>A</sub> + 0.1 ℒ<sub>F</sub> + ℒ<sub>L</sub></div><p class="tn-text">抽一块已知晶体和一个时刻 t，将加噪后的三个字段同时送入网络。元素头学习恢复原标签的分布；位置与晶格头预测 σ × score，并分别与周期高斯、对称晶格的训练目标比较。三个损失一起更新同一骨干。</p>`,
    sample: `<div class="tn-eq">s<sub>θ</sub> = 网络的连续输出 / σₜ<br>Aⱼ₋₁ ∼ p<sub>θ</sub>(Aⱼ₋₁ ∣ Aⱼ, Fₜ, Lₜ, t, c)</div><p class="tn-text">先采样元素全 MASK、周期分数坐标和先验晶格。冻结的网络给出类别 logits 与两项连续 score；离散后验决定哪些标签显露，连续求解器推进位置和晶格。新状态重建邻居图，进入下一步。<a href="#trajectory">看实际生成轨迹 →</a></p>`,
  };
  function phase(key) {
    lesson.querySelector("[data-tn-lesson]").innerHTML = phases[key];
    lesson
      .querySelectorAll("[data-tn-phase]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.tnPhase === key),
      );
  }
  lesson
    .querySelectorAll("[data-tn-phase]")
    .forEach((b) =>
      b.addEventListener("click", () => phase(b.dataset.tnPhase)),
    );
  phase("train");
})();
