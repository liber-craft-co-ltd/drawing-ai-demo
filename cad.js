// CAD解析ページ — 解析前は「入力CADファイル（プレビュー＋情報）」、解析後に「3Dビュー＋抽出データ＋AI判定」
const el = (id) => document.getElementById(id);
const viewer = el("viewer"), cadInput = el("cadInput"), cadThumb = el("cadThumb"), cadFileCard = el("cadFileCard"),
      loading = el("loading"), loadingText = el("loadingText"), dataEmpty = el("dataEmpty"), dataBody = el("dataBody"),
      tabInput = el("tabInput"), tabView = el("tabView"),
      btnAnalyze = el("btnAnalyze"), btnDownload = el("btnDownload"), hint = el("hint");

let DATA = [], current = null, analyzed = false;

// 左パネルのタブ切替（入力ファイル ↔ 3Dビュー）。3Dビューは解析後のみ。
function setLeftTab(name) {
  if (name === "view" && !analyzed) return;
  tabInput.classList.toggle("active", name === "input");
  tabView.classList.toggle("active", name === "view");
  loading.hidden = true;
  cadInput.hidden = name !== "input";
  viewer.hidden = name !== "view";
}
tabInput.addEventListener("click", () => setLeftTab("input"));
tabView.addEventListener("click", () => setLeftTab("view"));

fetch("cad_data.json?v=25").then(r => r.json()).then(d => { DATA = d; buildNav(); selectPart(d[0].id); });

function buildNav() {
  const nav = el("sampleNav");
  DATA.forEach((p, i) => {
    const chip = document.createElement("div");
    chip.className = "sample-chip" + (i === 0 ? " active" : "");
    chip.dataset.id = p.id;
    chip.innerHTML = `<div class="cad-ic">⬢</div><div><div class="nm">${p.name}</div><div class="cls">${p.material}${p.material_assumed ? "（仮定）" : ""}</div></div>`;
    chip.addEventListener("click", () => selectPart(p.id));
    nav.appendChild(chip);
  });
}

function fileName(p) { return p.step.split("/").pop(); }
function kb(n) { return n ? Math.round(n / 1024).toLocaleString() + " KB" : "—"; }

function selectPart(id) {
  current = DATA.find(p => p.id === id);
  document.querySelectorAll(".sample-chip").forEach(c => c.classList.toggle("active", c.dataset.id === id));
  analyzed = false;
  // 解析前：入力CADプレビュー＋ファイル情報（3Dビュータブは解析後に有効化）
  cadThumb.src = `assets/cad/thumb_${current.id}.png`;
  setLeftTab("input");
  cadFileCard.innerHTML = `
    <div class="fc-row"><span class="fc-ic">📄</span><span class="fc-name">${fileName(current)}</span></div>
    <div class="fc-meta">
      <span>形式：<b>${current.step_format}</b></span>
      <span>サイズ：<b>${kb(current.step_bytes)}</b></span>
      <span>材質：<b>${current.material}${current.material_assumed ? "（仮定）" : ""}</b></span>
    </div>
    <div class="fc-note">${current.note || ""}</div>`;
  dataBody.hidden = true; dataEmpty.hidden = false;
  btnDownload.disabled = true;
  hint.textContent = `「CADを解析」を押すと ${current.name} を読み込み・解析します`;
}

btnAnalyze.addEventListener("click", () => {
  if (!current || analyzed) return;
  cadInput.hidden = true; viewer.hidden = true; dataEmpty.hidden = true; dataBody.hidden = true;
  tabView.classList.add("active"); tabInput.classList.remove("active");
  loading.hidden = false;
  const steps = ["CADファイル（STEP）を読み込んでいます…", "寸法・形状の特徴を抽出しています…", "製造可否・概算見積をAIが判定しています…"];
  let i = 0; loadingText.textContent = steps[0];
  const tick = setInterval(() => { i++; if (i < steps.length) loadingText.textContent = steps[i]; }, 800);
  setTimeout(() => {
    clearInterval(tick);
    loading.hidden = true;
    viewer.src = current.glb;
    analyzed = true;
    setLeftTab("view");                 // 解析後は3Dビューを表示（入力ファイルタブで元に戻せる）
    renderData(current);
    dataBody.hidden = false;
    btnDownload.disabled = false;
    hint.textContent = `解析完了：上のタブで「入力ファイル」と「3Dビュー」を切替できます`;
  }, 2600);
});

btnDownload.addEventListener("click", () => {
  if (!current) return;
  const a = document.createElement("a"); a.href = current.step; a.download = fileName(current);
  document.body.appendChild(a); a.click(); a.remove();
});

function renderData(p) {
  const m = p.metrics, j = p.judgment;
  const dia = (m.hole_or_cyl_diameters_mm || []).map(d => `φ${d}`).join(" / ") || "—";
  const kinds = Object.entries(m.face_kinds || {}).map(([k, v]) => `${k}${v}`).join(" / ");
  const rows = [
    ["外形寸法 (W×D×H)", `${m.bbox_mm[0]} × ${m.bbox_mm[1]} × ${m.bbox_mm[2]} mm`],
    ["体積", `${m.volume_cm3} cm³`],
    ["質量（概算）", `${m.mass_g.toLocaleString()} g（${p.material}${p.material_assumed ? "・仮定" : ""}・比重${m.density_g_cm3}）`],
    ["表面積", `${m.surface_area_cm2} cm²`],
    ["穴・円筒の径", dia],
    ["最小径", m.min_diameter_mm ? `φ${m.min_diameter_mm}` : "—"],
    ["面の数 / 稜線", `${m.faces} 面 / ${m.edges} 稜線`],
    ["面の内訳", kinds],
  ];
  const flags = (j.risk_flags || []).map(f => `<span class="flag">${f}</span>`).join("");
  dataBody.innerHTML = `
    <div class="d-sec">
      <h4>① CADから抽出した実測データ <span class="src">（ファイルから直接取得＝誤読なし）</span></h4>
      <table class="mtable">${rows.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join("")}</table>
    </div>
    <div class="d-sec">
      <h4>② AIによる製造性・見積の判定</h4>
      <div class="jgrid">
        <div class="jcard"><div class="jk">推奨工法</div><div class="jv">${j.process || "—"}</div></div>
        <div class="jcard"><div class="jk">概算見積（単品試作）</div><div class="jv big">¥${(j.estimate_yen||0).toLocaleString()}</div></div>
        <div class="jcard"><div class="jk">リードタイム</div><div class="jv">${j.lead_time_days||"—"} 日</div></div>
        <div class="jcard wide"><div class="jk">製造可否</div><div class="jv">${j.manufacturability || "—"}</div></div>
        <div class="jcard wide"><div class="jk">リスク・注意点</div><div class="jv flags">${flags || "—"}</div></div>
        <div class="jcard wide"><div class="jk">見積内訳の考え方</div><div class="jv sm">${j.estimate_breakdown || "—"}</div></div>
        <div class="jcard wide"><div class="jk">所感</div><div class="jv sm">${j.comment || "—"}</div></div>
      </div>
      <p class="disc">※ 見積・リードタイムはデモ用のAI概算です。実見積とは異なります。</p>
    </div>`;
  dataBody.querySelectorAll(".d-sec, .jcard").forEach((e, i) => { e.style.opacity = 0; setTimeout(() => { e.style.transition = ".25s"; e.style.opacity = 1; }, 80 * i + 60); });
}
