# 👺天狗記録+GAS+HTML

## 概要
某焼肉屋の推し活をしており、訪店のたびに写真を撮影している。
そして、それらの写真を集計して「月に何回訪店できているか」を管理・分析していた。

集計作業では、Google Photoのアルバムで写真を整理した後に ZIP ファイルでダウンロードし、写真の Exif 情報などを手動で Google Spreadsheetに転記していた。

本リポジトリは、その **ZIPファイルからSpreadsheetへの転記作業を自動化するために Google Apps Script (GAS) と HTML で構築した Web アプリケーション**。

### Spreadsheetのサイドバーで実行したイメージ

<img alt="image" src="https://github.com/user-attachments/assets/0641c802-ddfb-4b3f-8a0f-c069cc946ff8" />

### WEBアプリで実行したイメージ

<img alt="image" src="https://github.com/user-attachments/assets/9ed5e9ed-efc1-471b-b5b3-831077f29022" />

## 開発環境
- Google Spreadsheet https://docs.google.com/spreadsheets/
- Google Apps Script https://script.google.com/
- volta https://volta.sh/
  - node.jsのバージョン管理のため
- node.js v22.x https://nodejs.org/
  - Google clasp実行基盤
- Google clasp v2.x https://github.com/google/CLASP
  - GASのプロジェクト管理 (今後)

## 特徴
- Spreadsheetに紐づくApps Scriptを仕様。
  - いわゆる埋め込みマクロ状態で一体の管理。
- FileAPIを用いてブラウザー上で解析処理。
  - ZIPファイルの全解凍なし。
  - 1ファイルずつ解析を行う。
  - Exifなどを収集。
  - 500ファイルごとにGASに連携し、Spreadsheetに書き出し。
- 排他処理。
  - 処理開始時一時シートを作成して分離。
  - 完了時にメインシートを履歴化 (+ローリング) を行い、入れ替わる。
    - 集計側のシートでは ``INDIRECT`` などを利用することで、シートのリネームの影響を受けず、最新情報で集計可能。

## コード生成AI
- **Gemini (WEB Chat)**

## 使用ライブラリ・オープンソースソフトウェア (謝辞)
本アプリケーションでは、以下のオープンソースライブラリを使用しています。
素晴らしいライブラリを提供・公開されている作者および開発者の皆様に深く感謝いたします。

- **zip.js**
  - 著作権表示: Copyright (c) Gildas Lormeau
  - ライセンス: BSD-3-Clause License / MIT License
  - URL: https://gildas-lormeau.github.io/zip.js/

- **ExifReader**
  - 著作権表示: Copyright (c) Mattias Buelens
  - ライセンス: MIT License
  - URL: https://github.com/mattiasbuelens/exifreader
  
