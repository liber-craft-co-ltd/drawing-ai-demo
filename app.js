// ソクラグ MFG 図面解析AIデモ — フロント制御
// 3つの機能は独立：①図面を解析（3D化対象ハイライト・トグル）/ ②3Dモデル生成 / 📐寸法を抽出（トグル）
// 右パネルは「3Dモデル」「抽出結果」のタブで切替。
const el = (id) => document.getElementById(id);
const drawingImg = el("drawingImg");
const drawingWrap= el("drawingWrap");
const annoLayer  = el("annoLayer");
const viewer     = el("viewer");
const placeholder= el("modelPlaceholder");
const phText     = el("phText");
const loading    = el("loading");
const loadingText= el("loadingText");
const resultList = el("resultList");
const tabModel   = el("tabModel");
const tabResult  = el("tabResult");
const btnAnalyze = el("btnAnalyze");
const btnGen3d   = el("btnGen3d");
const btnDims    = el("btnDims");
const btnDownload= el("btnDownload");
const hint       = el("hint");

let current = SAMPLES[0];
let segOn = false;       // ① 3D化対象セグメント表示中
let dimsOn = false;      // 📐 寸法抽出表示中
let generated = false;   // ② 3D生成済み
let activeTab = "model"; // 右パネルのタブ

// 注釈レイヤーを実際に描画されている画像の矩形に一致させる（object-fit:contain対策）
function fitAnnoLayer() {
  if (!drawingImg.naturalWidth) return;
  const wrap = drawingWrap.getBoundingClientRect();
  const img = drawingImg.getBoundingClientRect();
  annoLayer.style.left   = (img.left - wrap.left) + "px";
  annoLayer.style.top    = (img.top  - wrap.top)  + "px";
  annoLayer.style.width  = img.width  + "px";
  annoLayer.style.height = img.height + "px";
}
drawingImg.addEventListener("load", fitAnnoLayer);
window.addEventListener("resize", fitAnnoLayer);

// ---- サンプル選択 UI ----
const nav = el("sampleNav");
SAMPLES.forEach((s, i) => {
  const chip = document.createElement("div");
  chip.className = "sample-chip" + (i === 0 ? " active" : "");
  chip.dataset.id = s.id;
  chip.innerHTML =
    `<img src="${s.drawing}" alt=""><div><div class="nm">${s.name}</div>` +
    `<div class="cls">${s.cls}${s.noModel ? "・3D未生成" : ""}</div></div>`;
  chip.addEventListener("click", () => selectSample(s.id));
  nav.appendChild(chip);
});

function selectSample(id) {
  current = SAMPLES.find((s) => s.id === id);
  document.querySelectorAll(".sample-chip").forEach((c) =>
    c.classList.toggle("active", c.dataset.id === id));
  drawingImg.src = current.drawing;
  resetState();
}

function resetState() {
  clearOverlay();
  segOn = false; dimsOn = false; generated = false;
  loading.hidden = true;
  viewer.removeAttribute("src");
  btnAnalyze.classList.remove("active"); btnAnalyze.textContent = "① 図面を解析";
  btnDims.classList.remove("active"); btnDims.textContent = "📐 寸法を抽出";
  btnGen3d.disabled = !!current.noModel;
  btnGen3d.textContent = "② 3Dモデルを生成";
  btnDownload.disabled = true;
  resultList.innerHTML = "";
  setTab("model");
  hint.textContent = current.noModel
    ? "この図面はデモ用に3D未生成です（解析・寸法抽出は試せます）"
    : "「②3Dモデルを生成」または「📐寸法を抽出」を試せます";
}

// ---- 右パネルのタブ切替 ----
function setTab(name) {
  activeTab = name;
  tabModel.classList.toggle("active", name === "model");
  tabResult.classList.toggle("active", name === "result");
  if (name === "model") {
    resultList.hidden = true;
    if (!loading.hidden) { /* 生成中はそのまま */ }
    else { viewer.hidden = !generated; placeholder.hidden = generated; }
  } else {
    placeholder.hidden = true; viewer.hidden = true; loading.hidden = true;
    resultList.hidden = false;
    if (!dimsOn) {
      resultList.innerHTML =
        `<p class="rl-head">「📐 寸法を抽出」を押すと<br>読み取った値がここに一覧表示されます</p>`;
    }
  }
}
tabModel.addEventListener("click", () => setTab("model"));
tabResult.addEventListener("click", () => setTab("result"));

// ---- ① 図面を解析：3D化対象（等角図）ハイライト（トグル）----
btnAnalyze.addEventListener("click", () => {
  if (segOn) { clearSegment(); segOn = false;
    btnAnalyze.classList.remove("active"); btnAnalyze.textContent = "① 図面を解析";
    hint.textContent = "3D化対象の検出を解除しました"; return; }
  clearSegment();
  hint.textContent = "図面内の等角図（立体図）を検出しています…";
  setTimeout(() => {
    fitAnnoLayer();
    const s = current.segment;
    const box = document.createElement("div");
    box.className = "segment"; box.id = "segBox";
    box.style.left = s.x*100+"%"; box.style.top = s.y*100+"%";
    box.style.width = s.w*100+"%"; box.style.height = s.h*100+"%";
    box.innerHTML = `<span class="tag">3D化対象（等角図）を検出</span><div class="scan"></div>`;
    annoLayer.appendChild(box);
    requestAnimationFrame(() => box.classList.add("show"));
    segOn = true;
    btnAnalyze.classList.add("active"); btnAnalyze.textContent = "① 検出を解除";
    hint.textContent = "等角図を検出しました（もう一度押すと解除）";
  }, 600);
});

// ---- ② 3Dモデルを生成（①とは独立。いつでも実行可）----
btnGen3d.addEventListener("click", () => {
  if (current.noModel || generated) return;
  setTab("model");
  placeholder.hidden = true; viewer.hidden = true;
  loading.hidden = false;
  btnGen3d.disabled = true;
  const steps = ["検出した等角図を解析しています…", "立体形状を推定しています…", "3D メッシュを生成しています…"];
  let i = 0; loadingText.textContent = steps[0];
  const tick = setInterval(() => { i++; if (i < steps.length) loadingText.textContent = steps[i]; }, 800);
  setTimeout(() => {
    clearInterval(tick);
    loading.hidden = true;
    viewer.src = current.glb; viewer.hidden = false;
    generated = true;
    btnGen3d.textContent = "② 生成済み";
    btnDownload.disabled = false;
    hint.textContent = "3Dモデルを生成しました。タブで「抽出結果」と切替できます";
  }, 2600);
});

// ---- 📐 寸法を抽出（トグル）----
btnDims.addEventListener("click", () => {
  if (dimsOn) { clearDimensions(); dimsOn = false;
    btnDims.classList.remove("active"); btnDims.textContent = "📐 寸法を抽出";
    if (activeTab === "result") setTab("result");
    hint.textContent = "寸法の抽出表示を解除しました"; return; }
  clearDimensions();
  fitAnnoLayer();
  const items = current.dimensions || [];
  // 図面上にハイライトするのは「部品形状から読んだ寸法・公差・GD&T」だけ。
  // 表題欄・一般公差表・注記は右パネルの一覧にのみ載せる（図面の混雑を避ける）。
  const onDrawing = items.filter((a) => boxOnDrawing(a));
  onDrawing.forEach((a, idx) => {
    const box = document.createElement("div");
    box.className = "anno dim";
    box.style.left = a.x*100+"%"; box.style.top = a.y*100+"%";
    box.style.width = a.w*100+"%"; box.style.height = a.h*100+"%";
    box.innerHTML = `<span class="tag${a.below ? " below" : ""}">${a.tag}</span>`;
    annoLayer.appendChild(box);
    setTimeout(() => box.classList.add("show"), 35*idx + 60);
  });
  // 表題欄・一般公差表は密集するので「まとめて1枠」で図面に可視化（中身はパネル）
  const titleItems = items.filter((a) => a.cat === "表題欄" || /^(部品名|材質|図番|尺度|日付|用紙|枚数|単位|質量|作成日)/.test(a.tag));
  const tolItems   = items.filter((a) => /^一般公差/.test(a.tag));
  let rd = 0;
  rd += drawRegion(titleItems, "表題欄", onDrawing.length * 35 + 120);
  rd += drawRegion(tolItems,   "一般公差表", onDrawing.length * 35 + 260);
  dimsOn = true;
  btnDims.classList.add("active"); btnDims.textContent = "📐 抽出を解除";
  hint.textContent = `寸法・注記を ${items.length} 項目読み取りました（図面には主要 ${onDrawing.length} 箇所をハイライト）`;
  buildResultList(items);
  setTab("result");
});

// 図面上にハイライト枠を出す対象か（表題欄・注記・一般公差表はパネルのみ＝図面の混雑を避ける）
function boxOnDrawing(a) {
  const cat = a.cat || "";
  const tag = a.tag || "";
  if (cat === "表題欄" || cat === "注記") return false;
  if (/^(部品名|材質|図番|図面番号|尺度|日付|用紙|枚数|単位|質量|作成日|シート|サイズ|表面粗さ|熱処理|設計|検図|承認)/.test(tag)) return false;
  if (/^注記/.test(tag)) return false;
  if (/^一般公差/.test(tag)) return false;   // 一般公差表は表題欄付近に密集するため図面には出さない
  return true;                                // 寸法・GD&T・形状公差は図面にハイライト
}

// 抽出結果をカテゴリ分けして右パネルに表示（Geminiの category を優先、無ければ語で判定）
function buildResultList(items) {
  const groups = { "寸法・形状": [], "公差・GD&T": [], "表題欄・属性": [], "注記": [] };
  const guess = (t) =>
    /^(部品名|材質|図番|尺度|質量|日付|用紙|枚数|単位|作成日)/.test(t) ? "表題欄・属性" :
    /^注記/.test(t) ? "注記" :
    /(公差|同軸度|振れ|平行度|真円度|直角度|位置度|データム|表面粗さ|Ra|ISO 2768|JIS B|±|⊥|⌀|Ⓜ)/.test(t) ? "公差・GD&T" :
    "寸法・形状";
  const catMap = { "寸法":"寸法・形状", "公差":"公差・GD&T", "GD&T":"公差・GD&T", "表題欄":"表題欄・属性", "注記":"注記" };
  items.forEach((a) => {
    const g = catMap[a.cat] || guess(a.tag);
    groups[g].push(a.tag);
  });
  let html = `<p class="rl-head"><b>${items.length}</b> 項目を読み取りました</p>`;
  for (const [name, arr] of Object.entries(groups)) {
    if (!arr.length) continue;
    const kv = name === "表題欄・属性" ? " kv" : "";
    html += `<div class="rl-group"><h4>${name}（${arr.length}）</h4><div class="rl-items">` +
      arr.map((t) => `<span class="rl-chip${kv}">${t}</span>`).join("") + `</div></div>`;
  }
  resultList.innerHTML = html;
  resultList.querySelectorAll(".rl-chip").forEach((c, i) =>
    setTimeout(() => c.classList.add("show"), 22 * i + 50));
}

// ---- OBJ ダウンロード ----
btnDownload.addEventListener("click", () => {
  if (!current.obj) return;
  const a = document.createElement("a");
  a.href = current.obj; a.download = `${current.name}.obj`;
  document.body.appendChild(a); a.click(); a.remove();
});

// 複数項目を囲む「まとめ枠」を1つ描く（表題欄・一般公差表など密集領域用）
function drawRegion(items, label, delay) {
  if (!items.length) return 0;
  const x0 = Math.min(...items.map((a)=>a.x));
  const y0 = Math.min(...items.map((a)=>a.y));
  const x1 = Math.max(...items.map((a)=>a.x + a.w));
  const y1 = Math.max(...items.map((a)=>a.y + a.h));
  const pad = 0.004;
  const box = document.createElement("div");
  box.className = "anno region";
  box.style.left = Math.max(0,(x0-pad))*100 + "%";
  box.style.top  = Math.max(0,(y0-pad))*100 + "%";
  box.style.width  = (x1-x0+pad*2)*100 + "%";
  box.style.height = (y1-y0+pad*2)*100 + "%";
  box.innerHTML = `<span class="tag">${label}（${items.length}項目を抽出）</span>`;
  annoLayer.appendChild(box);
  setTimeout(() => box.classList.add("show"), delay);
  return 1;
}

function clearSegment(){ const s = el("segBox"); if (s) s.remove(); }
function clearDimensions(){ annoLayer.querySelectorAll(".anno.dim, .anno.region").forEach((e)=>e.remove()); }
function clearOverlay(){ annoLayer.innerHTML = ""; }

// 初期化
selectSample("01");
