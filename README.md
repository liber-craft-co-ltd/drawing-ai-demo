# 製造業向けAIソリューション デモ（図面・CAD解析 × 3D生成）

完全静的サイト（当日ネット不要・GPU不要）。入力の種類で2系統に分かれる。
**設計・アルゴリズム・再構築手順は `../DESIGN.md` を参照。**

- **A. 2D図面解析**（`index.html`）：紙・PDFの2D図面をAIが読み取り、寸法・公差を抽出して3D化
- **B. CAD解析**（`cad.html`）：CADファイル(STEP)を読み込み、寸法・形状を直接抽出して製造可否・概算見積をAI判定

上部ナビで2系統を切替。

## 起動
```bash
cd services/solution/drawing-analysis-ai/demo/site
python3 -m http.server 8731   # → http://localhost:8731/（更新後は Cmd+Shift+R）
```

## メモ
- 2D図面解析の抽出は **Gemini 2.5 Pro 1パス**（OCR不使用）。
- CAD解析は **OpenCASCADE（CADエンジン）＋CadQuery（Python操作）** で抽出、**Gemini** で製造性・見積を判定。すべてOSS・商用利用可。
- CADサンプルは自社生成2点＋**NIST公開モデル3点**（パブリックドメイン）。
- `*.js`/`*.json` 更新時は `index.html`/`cad.html` の `?v=` を上げる。
