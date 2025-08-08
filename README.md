# TeleScribe Assist (テレ・スクライブ・アシスト)

[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Online-brightgreen)](https://check5004.github.io/tele-scribe-assist2/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-blue)](https://tailwindcss.com/)

**電話応対報告文作成補助サイト** - 電話応対の内容を効率的に文書化するためのWebアプリケーション

## 🌟 アプリケーション URL

**[https://check5004.github.io/tele-scribe-assist2/](https://check5004.github.io/tele-scribe-assist2/)**

## 📋 概要

TeleScribe Assistは、ビジネスコミュニケーションにおける電話応対の内容を担当者へチャットやメールで報告する際の、報告文作成を効率化・省力化するためのシングルページWebアプリケーションです。

### 🎯 主な特徴

- **変数システム** - テキスト・時刻変数による動的な文書生成
- **セグメント管理** - ドラッグ＆ドロップ可能な文節コンポーネント
- **リアルタイムプレビュー** - 編集内容の即座反映
- **双方向データバインディング** - プレビューと編集エリアの完全同期
- **テンプレート機能** - 繰り返し使用される文言の効率的管理
- **履歴管理** - セッション履歴、入力履歴、Undo/Redo機能
- **多形式エクスポート** - プレーンテキスト、Markdown、HTML形式でのコピー

## 🚀 使用方法

### 基本操作フロー

1. **変数設定**
   - 左パネル上部の「基本情報（変数）」セクションで変数を定義
   - デフォルトで「着信時刻」変数が設定済み（HH:mm形式、5分単位切り捨て）

2. **報告文作成**
   - 右パネルの「文節セクション」で報告文を組み立て
   - 文節はドラッグ&ドロップで順序変更可能
   - `{{変数名}}`記法で変数を挿入

3. **プレビュー確認**
   - 左パネル上部でリアルタイムプレビューを確認
   - プレビューエリアでの直接編集も可能

4. **出力・保存**
   - 「コピー」ボタンで各種形式でクリップボードにコピー
   - 「全体コピー」でセッション履歴に保存

### 🔧 詳細機能

#### 変数システム

**テキスト変数**
- シンプルなテキスト入力フィールド
- 会社名、連絡者名、案件名などの管理に最適

**時刻変数**
- 複数の入力フィールドに分割（YYYY/MM/DD HH:mm形式）
- カスタムフォーマット設定（YYYY、MM、DD、HH、mm、ssの組み合わせ）
- 丸め処理機能：
  - 単位：1分、5分、10分、15分、30分
  - 方式：切り捨て、四捨五入、切り上げ
- 現在時刻の自動入力（丸め処理適用）

#### セグメント管理

- **ドラッグ&ドロップ**：文節の順序変更
- **自動補完**：
  - 空フィールドフォーカス時：テンプレート・入力履歴一覧
  - 入力中：前方一致候補表示
  - `{{`入力時：変数一覧表示
- **空行挿入**：空の文節コンポーネントで段落区切り

#### プレビュー機能

- **変数展開**：`{{変数名}}`を実際の値に置換
- **未入力変数の視覚化**：薄い背景色と破線枠でハイライト
- **双方向編集**：プレビューエリアでの直接編集が文節に反映

#### テンプレート機能

- **文節テンプレート**：単一文節の定型文
- **ブロックテンプレート**：複数文節のまとまり
- **変数付きテンプレート**：`{{変数名}}`を含むテンプレート

#### 履歴管理

1. **セッション履歴**：「全体コピー」時に完成した報告文を保存
2. **入力履歴**：各フィールドの入力内容を記録
3. **操作履歴**：Undo/Redo機能（最新50件）

#### データ管理

- **自動保存**：すべての変更をLocalStorageに即座保存
- **インポート/エクスポート**：JSON形式でのデータバックアップ・復元
- **データリセット**：全データの初期化

## 💻 技術仕様

### アーキテクチャ

- **フレームワーク**：React 18（CDN版）
- **スタイリング**：Tailwind CSS
- **ドラッグ&ドロップ**：SortableJS
- **データ永続化**：LocalStorage
- **ビルドシステム**：不使用（直接ブラウザ実行）

### ファイル構成

```
tele-scribe-assist2/
├── index.html                    # アプリケーションエントリーポイント
├── src/
│   ├── components/              # Reactコンポーネント
│   │   ├── App.jsx             # メインアプリケーションコンテナ
│   │   ├── VariableInput.jsx   # 変数入力コンポーネント
│   │   ├── SegmentItem.jsx     # 文節アイテムコンポーネント
│   │   ├── PreviewPane.jsx     # プレビューペインコンポーネント
│   │   └── ...
│   ├── hooks/                  # カスタムReactフック
│   │   ├── useLocalStorage.js  # LocalStorage管理
│   │   ├── useUndoRedo.js      # Undo/Redo機能
│   │   ├── useDragDrop.js      # ドラッグ&ドロップ
│   │   └── usePreviewSync.js   # プレビュー同期
│   ├── utils/                  # ユーティリティ関数
│   │   ├── dateUtils.js        # 日時処理
│   │   ├── templateUtils.js    # テンプレート処理
│   │   └── helpers.js          # 汎用ヘルパー
│   ├── services/
│   │   └── dataService.js      # データ管理サービス
│   ├── data/
│   │   └── constants.js        # 定数・サンプルデータ
│   └── styles/
│       └── index.css           # カスタムCSS
├── scripts/
│   ├── start-server.bat       # 開発サーバー起動（Windows）
│   └── stop-server.bat        # 開発サーバー停止（Windows）
└── docs/
    └── 仕様書.md              # 詳細仕様書（日本語）
```

### 主要コンポーネント

- **App.jsx**：メインアプリケーション、状態管理
- **VariablesPanel.jsx**：変数管理パネル
- **SegmentsPane.jsx**：文節編集パネル
- **PreviewPane.jsx**：リアルタイムプレビュー
- **SessionSidebar.jsx**：セッション履歴サイドバー
- **TemplateManagerModal.jsx**：テンプレート管理モーダル
- **DataManagementModal.jsx**：データ管理モーダル

### パフォーマンス最適化

- **React.memo**：SegmentItemコンポーネントのメモ化
- **useCallback**：イベントハンドラーのメモ化
- **デバウンス処理**：テキスト入力の300ms遅延更新
- **履歴制限**：Undo/Redoスタック50件上限

## 🛠️ 開発環境

### 必要要件

- モダンブラウザ（Chrome、Firefox、Safari、Edge最新版）
- Python 3.x（開発サーバー用）または任意のHTTPサーバー
- インターネット接続（CDN依存関係の初回読み込み時）

### ローカル開発

**方法1: 提供スクリプト使用（Windows）**
```bash
scripts\start-server.bat
```

**方法2: Python HTTPサーバー**
```bash
python -m http.server 8000
# http://localhost:8000/index.html でアクセス
```

**方法3: npxのhttpサーバー**
```bash
npx http-server -p 8000 --cors
```

**開発サーバー停止**
```bash
scripts\stop-server.bat
# または Ctrl+C
```

### デバッグ情報

- **LocalStorageキー**：`telescribeAssistData`
- **グローバルオブジェクト**：
  - `Components.*`：Reactコンポーネント
  - `Hooks.*`：カスタムフック
  - `Utils.*`：ユーティリティ関数
  - `Services.*`：サービスクラス

## 🌐 ブラウザサポート

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

*ES6+とReact 18をサポートするモダンブラウザが必要です。*

## 📱 レスポンシブ対応

- **デスクトップ**：左右パネルレイアウト
- **タブレット/スマートフォン**：シングルカラムレイアウト
- **ダークモード**：デフォルトでダークテーマ採用

## ⚠️ 重要な注意事項

1. **データ保存**：すべてのデータはブラウザのLocalStorageに保存されます。ブラウザデータを削除すると情報が失われるため、定期的なエクスポートを推奨します。

2. **オフライン動作**：初回読み込み後はオフラインでも動作しますが、CDNから読み込まれる依存関係は初回のインターネット接続が必要です。

3. **セキュリティ**：機密情報の取り扱いにご注意ください。LocalStorageのデータは平文で保存されます。

## 🤝 コントリビューション

プロジェクトは日本語ドキュメントとコメントを使用しています：

- すべてのコードコメントは日本語で記述
- JSDocスタイルの詳細な関数ドキュメント
- 仕様書(`docs/仕様書.md`)に詳細な機能要件を記載

## 📄 ライセンス

このプロジェクトは[MIT License](LICENSE)の下で公開されています。

---

**🔗 アプリケーションを試す**: [https://check5004.github.io/tele-scribe-assist2/](https://check5004.github.io/tele-scribe-assist2/)