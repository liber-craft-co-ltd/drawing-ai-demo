# 図面解析AI デモサイト

ソクラグ MFG 展示デモのフロント。完全静的・オフライン動作（当日ネット不要・GPU不要）。
**全体の設計・アルゴリズム・再構築手順は `../DESIGN.md` を参照。**

## 起動
```bash
cd services/solution/drawing-analysis-ai/demo/site
python3 -m http.server 8731
# ブラウザで http://localhost:8731/ を開く（更新後は Cmd+Shift+R でハードリロード）
```
Chrome / Edge があれば動作（WebGL2のみ）。

## 操作（3機能は独立・各トグル）
- **① 図面を解析**：3D化対象（等角図）をシアン枠で検出（再押下で解除）
- **② 3Dモデルを生成**：事前生成GLBを `<model-viewer>` で回転表示（右パネル「3Dモデル」タブ）
- **📐 寸法を抽出**：図面に注釈ハイライト＋右パネル「抽出結果」タブに分類リスト（再押下で解除）
  - 形状寸法・公差・GD&T＝個別枠／表題欄・一般公差表＝まとめ枠／注記＝パネルのみ
- **⬇ OBJをダウンロード**：事前変換した .obj を保存

## 構成
```
site/
├── index.html
├── styles.css                 スタイル（ネイビー #1E2761）
├── app.js                     操作ロジック（タブ切替・トグル・ハイライト・まとめ枠 drawRegion）
├── annotations.js             サンプル定義＋抽出結果（../scripts/gen_annotations.py が生成）
├── vendor/model-viewer.min.js v3.5.0（ローカル同梱）
└── assets/  drawing_0X.png / model_0X.glb / model_0X.obj
```

## メモ
- 抽出は **Gemini 2.5 Pro の1パス**（`../scripts/extract_gemini.py`）。OCRは使っていない。
- `annotations.js`/`app.js` を更新したら `index.html` の `?v=` を上げる（キャッシュ対策）。
- サンプルは 01 取付ブラケット / 02 ベアリングハウジング / 04 フランジシャフトの3点。
