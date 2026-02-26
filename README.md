# Swagger Preview for Notion

Notion のコードブロックに記述された OpenAPI/Swagger スペック (YAML/JSON) をクリックひとつで Swagger UI 風にプレビューできる Chrome/Edge 拡張機能です。

## Features

- Notion ページ上のコードブロックを自動検出
- OpenAPI 3.x / Swagger 2.0 のスペック (YAML/JSON) を認識
- コードブロックにホバーすると「Swagger Preview」ボタンが表示
- クリックで右側にスライドインパネルが開き、Swagger UI でレンダリング
- パネルのリサイズ、全画面表示に対応
- Google Chrome / Microsoft Edge 両対応 (Manifest V3)

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Build

```bash
npm install
npm run build
```

### Install to Browser

1. `chrome://extensions/` (Chrome) または `edge://extensions/` (Edge) を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このプロジェクトの `dist/` フォルダを選択

### Usage

1. Notion でページを開く (https://www.notion.so/...)
2. OpenAPI/Swagger スペックが書かれたコードブロックにカーソルをホバー
3. 緑色の「Swagger Preview」ボタンが表示される
4. ボタンをクリックすると、右側にプレビューパネルが開く

## Project Structure

```
├── package.json              # Dependencies & scripts
├── scripts/
│   └── build.js              # Build script (copies files to dist/)
├── src/
│   ├── manifest.json         # Chrome Extension Manifest V3
│   ├── background.js         # Service worker
│   ├── content/
│   │   ├── content.js        # Content script (Notion code block detection)
│   │   └── content.css       # Styles for preview button & panel
│   ├── panel/
│   │   ├── panel.html        # Swagger UI preview panel
│   │   ├── panel.js          # Panel logic (parsing & rendering)
│   │   └── panel.css         # Panel styles
│   ├── popup/
│   │   ├── popup.html        # Extension popup
│   │   ├── popup.js          # Popup logic
│   │   └── popup.css         # Popup styles
│   └── icons/
│       └── icon.svg          # Source icon
└── dist/                     # Built extension (load this in browser)
```

## Supported Specs

- OpenAPI 3.0.x / 3.1.x (YAML or JSON)
- Swagger 2.0 (YAML or JSON)

## Example

Notion のコードブロックに以下のような OpenAPI スペックを貼り付けてください:

```yaml
openapi: "3.0.0"
info:
  title: Sample API
  version: "1.0.0"
paths:
  /users:
    get:
      summary: Get all users
      responses:
        "200":
          description: A list of users
```

## License

MIT
