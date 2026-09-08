/**
 * AKfycbzuAmPG8RTHi1mrnc94hqUvEjqodKwmbCgroUOP_Ps
 * https://script.google.com/macros/s/AKfycbzuAmPG8RTHi1mrnc94hqUvEjqodKwmbCgroUOP_Ps/dev 
 */
const SHEET_NAME = 'PhotoList';                     // 本命のシート名
const HEADER_ROW = [
  '#',                // [0] No.
  'File Path',        // [1] パス
  'File Name',        // [2] ファイル名
  '.ext',             // [3] 拡張子
  'DateTimeOriginal', // [4] (EXIF) 撮影日時
  'Model',            // [5] (EXIF) 撮影機種
  'Image Width',      // [6] (EXIF) 写真幅
  'Image Height',     // [7] (EXIF) 写真高
  'DateTime (alt)',   // [8] 代替日時 ファイル名などから類推
  'DateTime (fixed)', // [9] 解決日時 解決済み
];
const MAX_ROLLING_COUNT = 9;                        // 本命バックアップ保持上限数 (1)〜(9)
const MAX_TEMP_COUNT = 5;                           // 保持する一時シートの最大数 (6件目以降は削除)
const DATE_FORMAT = 'yyyy/MM/dd(aaa) hh:mm:ss';

/**
 * スプレッドシートオープン時にカスタムメニューを作成
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📜Apps Script')
    .addItem('ZIPから一括登録 (サイドバー)', 'showSidebarRegister')
    .addItem('ZIPから一括登録 (popup)', 'popupRegisterRelease')
    .addSeparator() // 区切り線
    .addItem('ZIPから一括登録 (popup + debug)', 'popupRegisterDebug')
    .addSeparator() // 区切り線
    .addItem('MD5ハッシュ文字列の生成', 'showMd5HashDialog')
    .addToUi();
}


/**
 * メニューからサイドバーを起動
 */
function showSidebarRegister() {
  const template = HtmlService.createTemplateFromFile('index');
  template.spreadsheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();

  const htmlOutput = template.evaluate()
    .setTitle('👺天狗記録+GAS+HTML');

  // サイドバーとして表示
  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}

/**
 * メニューからサイドバーを起動
 */
function popupRegisterRelease() {
  const targetUrl = 'https://script.google.com/macros/s/AKfycbxEBHIBN16OfUeWyOJ8MWzxf0mTU0Dtq_rxg1ERUiVgnhJHFGelL0_QyEkCO-rTM7T7/exec';

  // ブラウザ側で window.open を実行させる短いHTML
  const htmlContent = `
    <script>
      // 新しいタブで指定URLを開く
      window.open('${targetUrl}', undefined, 'menubar=no, toolbar=no');
      // 親ダイアログを自動で閉じる
      google.script.host.close();
    </script>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(250)
    .setHeight(80);

  // 一瞬だけポップアップを出してリダイレクトさせる
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'ページを開いています...');
}

/**
 * メニューからサイドバーを起動
 */
function popupRegisterDebug() {
  const targetUrl = 'https://script.google.com/macros/s/AKfycbzuAmPG8RTHi1mrnc94hqUvEjqodKwmbCgroUOP_Ps/dev';

  // ブラウザ側で window.open を実行させる短いHTML
  const htmlContent = `
    <script>
      // 新しいタブで指定URLを開く
      window.open('${targetUrl}', undefined, 'menubar=no, toolbar=no');
      // 親ダイアログを自動で閉じる
      google.script.host.close();
    </script>
  `;

  const htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(250)
    .setHeight(80);

  // 一瞬だけポップアップを出してリダイレクトさせる
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'ページを開いています...');
}

/**
 * ウェブアプリURLにアクセスした際、画面（index.html）を返す
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  template.spreadsheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  return template.evaluate()
    .setTitle('👺天狗記録+GAS+HTML')
    .setWidth(900)
    .setHeight(800)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 全シートを以下の優先順位で一括並び替えする内部関数
 * 1. その他既存シート (元の順序を維持)
 * 2. 本命およびバックアップシート (PhotoList, PhotoList (1), PhotoList (2)...)
 * 3. 一時シート群 (#YYYYMMDDHHmmss.fff) (新 ➔ 旧)
 */
function sortAllSheets(spreadSheet) {
  const allSheets = spreadSheet.getSheets();

  const otherSheets = [];
  const mainSheets = [];
  const tempSheets = [];

  for (const sheet of allSheets) {
    const name = sheet.getName();
    if (name.startsWith('#')) {
      tempSheets.push(sheet);
    } else {
      if (name === SHEET_NAME || name.startsWith(`${SHEET_NAME} (`)) {
        mainSheets.push(sheet);
      } else {
        otherSheets.push(sheet);
      }
    }
  }

  // 本命シート群を PhotoList, PhotoList (1), PhotoList (2)... の順にソート
  mainSheets.sort(function (a, b) {
    const aName = a.getName();
    const bName = b.getName();
    if (aName === SHEET_NAME) {
      return -1;
    } else if (bName === SHEET_NAME) {
      return 1;
    } else {
      const aNum = parseInt(aName.match(/\((\d+)\)/)?.[1] || '0', 10);
      const bNum = parseInt(bName.match(/\((\d+)\)/)?.[1] || '0', 10);
      return aNum - bNum;
    }
  });

  // 一時シート群を タイムスタンプ降順（新 ➔ 旧）にソート
  tempSheets.sort(function (a, b) {
    return b.getName().localeCompare(a.getName());
  });

  // 結合: その他既存シート ➔ 本命 ➔ 一時シート群 (新 ➔ 旧)
  const orderedSheets = [...otherSheets, ...mainSheets, ...tempSheets];

  // スプレッドシート上の順番を適用
  for (let i = 0; i < orderedSheets.length; i++) {
    spreadSheet.setActiveSheet(orderedSheets[i]);
    spreadSheet.moveActiveSheet(i + 1);
  }
}

/**
 * ① 一時シートの作成・ヘッダー行構築・古い一時シートの削除・全シート並び替え
 * @param param {Object} { metaData: { startTime, endTime, tempSheetName } }
 */
function createTempSheet(param) {
  Logger.log('[createTempSheet] start.');
  Logger.log(param);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = `0${now.getMonth() + 1}`.slice(-2);
    const DD = `0${now.getDate()}`.slice(-2);
    const hh = `0${now.getHours()}`.slice(-2);
    const mm = `0${now.getMinutes()}`.slice(-2);
    const ss = `0${now.getSeconds()}`.slice(-2);
    const fff = `00${now.getMilliseconds()}`.slice(-3);

    // サーバー側のタイムスタンプで生成 (#YYYYMMDDHHmmss.fff)
    const newTempSheetName = `#${YYYY}${MM}${DD}${hh}${mm}${ss}.${fff}`;

    // 1. 既存の一時シート(#で始まるシート)を収集してクリーンアップ
    const allSheets = spreadSheet.getSheets();
    const existingTempSheets = [];

    for (const sheet of allSheets) {
      if (sheet.getName().startsWith('#')) {
        existingTempSheets.push(sheet);
      }
    }

    existingTempSheets.sort(function (a, b) {
      return b.getName().localeCompare(a.getName());
    });

    // 6件目以降の古い一時シートを削除
    if (existingTempSheets.length >= MAX_TEMP_COUNT) {
      for (let i = MAX_TEMP_COUNT - 1; i < existingTempSheets.length; i++) {
        spreadSheet.deleteSheet(existingTempSheets[i]);
      }
    }

    // 2. 新しい一時シートを挿入
    const newSheet = spreadSheet.insertSheet(newTempSheetName, spreadSheet.getSheets().length);

    // サーバー作成時の現在日時を 処理開始日時 として記録
    const serverStartTimeStr = `${YYYY}/${MM}/${DD} ${hh}:${mm}:${ss}`;

    // --- セル配置 & スタイリング設定 ---
    const primaryBlue = '#0b5394'; // 青背景色
    const whiteText = '#ffffff';   // 白文字色

    // 1行目: 処理開始日時
    const b1Cell = newSheet.getRange(1, 2);
    b1Cell.setValue('処理開始日時')
      .setFontWeight('bold')
      .setBackground(primaryBlue)
      .setFontColor(whiteText);
    newSheet.getRange(1, 3).setValue(serverStartTimeStr).setNumberFormat(DATE_FORMAT);

    // 2行目: 処理終了日時 (初期化時は空欄)
    const b2Cell = newSheet.getRange(2, 2);
    b2Cell.setValue('処理終了日時')
      .setFontWeight('bold')
      .setBackground(primaryBlue)
      .setFontColor(whiteText);
    newSheet.getRange(2, 3).setValue('').setNumberFormat(DATE_FORMAT);

    // 3行目: 空白行

    // 4行目: データ ヘッダー (A4:F4)
    const headerRange = newSheet.getRange(4, 1, 1, HEADER_ROW.length);
    headerRange.setValues([HEADER_ROW])
      .setFontWeight('bold')
      .setBackground(primaryBlue)
      .setFontColor(whiteText);

    // ④ オートフィルター (A4:F4)
    headerRange.createFilter();

    // ⑤ 行固定 (4行目まで固定)
    newSheet.setFrozenRows(4);

    // ⑥ G列(7列目)以降を削除して軽量化
    const maxColumn = HEADER_ROW.length;
    const colmnCount = newSheet.getMaxColumns();
    if (colmnCount > maxColumn) {
      newSheet.deleteColumns(maxColumn + 1, colmnCount - maxColumn);
    }

    // 3. 指定の並び順に全体を整列
    sortAllSheets(spreadSheet);

    return { status: 'success', tempSheetName: newTempSheetName };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ② 一時シートへのデータ書き込み (5行目以降への追記)
 * @param param {Object} { metaData: { startTime, endTime, tempSheetName }, rows: [...] }
 */
function writeToTempSheet(param) {
  Logger.log('[writeToTempSheet] start.');
  Logger.log('[writeToTempSheet] param.');
  Logger.log(param);
  try {
    const spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    const metaData = param.metaData || {};
    const tempSheetName = metaData.tempSheetName;
    const rows = (function () {
      if (param.rows) {
        let ret = [];
        param.rows.forEach(function (row, index) {
          // ファイル名
          const fileName = row.filePath?.match(/([^\\/]*)$/)[0];
          // 拡張子
          const ext = fileName?.match(/\.(\S*)$/)[0].toLowerCase();
          const fileType = fileName?.match(/\.(\S*)$/)[1].toUpperCase();
          const exifDateOriginal = row.exifDateOriginal;
          // 代替日時 ファイル名などから類推
          const dateTimeAlt = (function () {
            const g = fileName?.match(/([0-9]{4})[\s-_]*([0-9]{2})[\s-_]*([0-9]{2})[\s-_]*([0-9]{2})[\s-_]*([0-9]{2})[\s-_]*([0-9]{2})(Z?)/i)?.slice(1);
            if (g) {
              const d = new Date(`${g[0]}-${g[1]}-${g[2]} ${g[3]}:${g[4]}:${g[5]} ${g[6]}`);
              // const YYYY = d.getFullYear();
              // const MM = `0${d.getMonth() + 1}`.slice(-2);
              // const DD = `0${d.getDate()}`.slice(-2);
              // const hh = `0${d.getHours()}`.slice(-2);
              // const mm = `0${d.getMinutes()}`.slice(-2);
              // const ss = `0${d.getSeconds()}`.slice(-2);
              // return `${YYYY}/${MM}/${DD} ${hh}:${mm}:${ss}`;
              return d
            } else {
              return null;
            }
          })();
          // 解決日時 解決済み
          const dateTimeFixed = exifDateOriginal || dateTimeAlt || '';

          const r = [
            row.rowNo,            // [0] No.
            row.filePath,         // [1] パス
            fileName,             // [2] ファイル名
            ext,                  // [3] 拡張子
            exifDateOriginal,     // [4] (EXIF) 撮影日時
            row.exifModel,        // [5] (EXIF) 撮影機種
            row.exifImageWidth,   // [6] (EXIF) 写真幅
            row.exifImageHeight,  // [7] (EXIF) 写真高
            dateTimeAlt,          // [8] 代替日時 ファイル名などから類推
            dateTimeFixed,        // [9] 解決日時 解決済み
          ];
          ret.push(r);
        });
        return ret;
      } else {
        return [];
      }
    })();

    Logger.log('[writeToTempSheet] rows.');
    Logger.log(rows);

    const sheet = spreadSheet.getSheetByName(tempSheetName);

    if (!sheet) {
      return { status: 'error', message: `一時シート [${tempSheetName}] が存在しません。` };
    } else {
      if (!rows || rows.length === 0) {
        return { status: 'success', message: 'No data to write' };
      } else {
        const lastRow = sheet.getLastRow();
        // 5行目より前（ヘッダー部分）なら5行目から書き込みを開始、それ以降は末尾に追記
        const startRow = (function () {
          if (lastRow < 4) {
            return 5;
          } else {
            return lastRow + 1;
          }
        })();

        const maxRow = sheet.getMaxRows();
        const requiredRows = (startRow + rows.length - 1) - maxRow;

        if (requiredRows > 0) {
          sheet.insertRowsAfter(maxRow, requiredRows);
        }

        sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
        sheet.getRange(startRow, 5, rows.length, 1).setNumberFormat(DATE_FORMAT);
        sheet.getRange(startRow, 9, rows.length, 1).setNumberFormat(DATE_FORMAT);
        sheet.getRange(startRow, 10, rows.length, 1).setNumberFormat(DATE_FORMAT);

        return { status: 'success', count: rows.length };
      }
    }
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * ③ ファイナライズ（処理終了日時記録、列幅調整、ローリング、リネーム、シート順序の一括再整列）
 * @param param {Object} { metaData: { startTime, endTime, tempSheetName } }
 */
function finalizeSheet(param) {
  Logger.log('[finalizeSheet] start.');
  Logger.log(param);

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(1000 * 30);

    const spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    const metaData = param.metaData || {};
    const tempSheetName = metaData.tempSheetName;
    const endTimeStr = metaData.endTime || '';

    const tempSheet = spreadSheet.getSheetByName(tempSheetName);

    if (!tempSheet) {
      return { status: 'error', message: `一時シート [${tempSheetName}] が存在しません。` };
    } else {
      // 処理終了日時を2行目C列に記録
      tempSheet.getRange(2, 3).setValue(endTimeStr);

      // --- 幅調整の適用 ---
      for (let i = 0; i < HEADER_ROW.length; i++) {
        const j = i + 1;
        if (i == 1) {
          // [1] B列: 全角10文字程度の幅 (約200ピクセル)
          tempSheet.setColumnWidth(j, 200);
        } else {
          tempSheet.autoResizeColumn(j);
        }
      }


      const baseSheet = spreadSheet.getSheetByName(SHEET_NAME);

      // 1. 本命シートが存在する場合のローリング処理
      if (baseSheet) {
        // (9)超えを削除
        for (let i = MAX_ROLLING_COUNT + 1; i <= (MAX_ROLLING_COUNT + 5); i++) {
          const oldSheet = spreadSheet.getSheetByName(`${SHEET_NAME} (${i})`);
          if (oldSheet) {
            spreadSheet.deleteSheet(oldSheet);
          }
        }

        // (8)->(9), (7)->(8)...(1)->(2) シフト
        for (let i = (MAX_ROLLING_COUNT - 1); i >= 1; i--) {
          const currentSheet = spreadSheet.getSheetByName(`${SHEET_NAME} (${i})`);
          if (currentSheet) {
            if (i === (MAX_ROLLING_COUNT - 1)) {
              const targetOverflow = spreadSheet.getSheetByName(`${SHEET_NAME} (${MAX_ROLLING_COUNT})`);
              if (targetOverflow) {
                spreadSheet.deleteSheet(targetOverflow);
              }
            }
            currentSheet.setName(`${SHEET_NAME} (${i + 1})`);
          }
        }

        const targetOne = spreadSheet.getSheetByName(`${SHEET_NAME} (1)`);
        if (targetOne) {
          spreadSheet.deleteSheet(targetOne);
        }
        baseSheet.setName(`${SHEET_NAME} (1)`);
      }

      // 2. 一時シートを本命シート名にリネーム
      tempSheet.setName(SHEET_NAME);

      // 3. 全シートを指定順序（その他 ➔ 本命 ➔ 一時シート群(新➔旧)）に再ソート
      sortAllSheets(spreadSheet);

      return { status: 'success' };
    }
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * ④ 全件一括登録処理 (一時シート作成 -> データ一括書き込み -> ファイナライズ)
 * コンソールアプリ等からの全件一括POST登録向け
 * @param param {Object} { password: string, metaData: { startTime, endTime }, rows: [...] }
 * @return {Object} { status: 'success' | 'error', message?: string, count?: number }
 */
function registerAll(param) {
  Logger.log('[registerAll] start.');
  Logger.log(param);

  const inputParam = param || {};
  const password = inputParam.password || '';
  const metaData = inputParam.metaData || {};
  const rows = inputParam.rows || [];

  // 1. 一時シートの作成
  const createResult = createTempSheet({ metaData: metaData });

  if (createResult.status === 'success') {
    const tempSheetName = createResult.tempSheetName;

    // 2. データが有る場合は一括書き込み
    const writeResult = (function () {
      if (rows.length > 0) {
        return writeToTempSheet({
          metaData: { tempSheetName: tempSheetName },
          rows: rows
        });
      } else {
        return { status: 'success', count: 0 };
      }
    })();

    if (writeResult.status === 'success') {
      // 処理終了日時の作成 (未指定時のフォールバック)
      const endTimeStr = metaData.endTime || (function () {
        const now = new Date();
        const YYYY = now.getFullYear();
        const MM = `0${now.getMonth() + 1}`.slice(-2);
        const DD = `0${now.getDate()}`.slice(-2);
        const hh = `0${now.getHours()}`.slice(-2);
        const mm = `0${now.getMinutes()}`.slice(-2);
        const ss = `0${now.getSeconds()}`.slice(-2);
        return `${YYYY}/${MM}/${DD} ${hh}:${mm}:${ss}`;
      })();

      // 3. ファイナライズ処理
      const finalizeResult = finalizeSheet({
        metaData: {
          tempSheetName: tempSheetName,
          endTime: endTimeStr
        }
      });

      if (finalizeResult.status === 'success') {
        return {
          status: 'success',
          count: rows.length,
          tempSheetName: tempSheetName
        };
      } else {
        return finalizeResult;
      }
    } else {
      return writeResult;
    }
  } else {
    return createResult;
  }
}

/**
 * ⑤ ウェブアプリURLへのPOSTアクセス時、全件一括登録を実行
 * @param e {Object} リクエストオブジェクト
 * @return {GoogleAppsScript.Content.TextOutput} JSONレスポンス
 */
function doPost(e) {
  Logger.log('[doPost] start.');

  const result = (function () {
    try {
      const param = (function () {
        if (e) {
          if (e.postData) {
            if (e.postData.contents) {
              return JSON.parse(e.postData.contents);
            }
          }
          if (e.parameter) {
            return e.parameter;
          }
        }
        return {};
      })();

      return registerAll(param);
    } catch (err) {
      Logger.log('[doPost] error: ' + err.toString());
      return { status: 'error', message: 'POSTリクエストの処理に失敗しました: ' + err.toString() };
    }
  })();

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 指定された文字列からMD5ハッシュ値 (16進数小文字) を計算して取得
 * @param text {string} ハッシュ化対象の文字列
 * @return {string} MD5ハッシュ文字列
 */
function getMd5Hash(text) {
  const inputStr = text || '';
  const result = (function () {
    if (inputStr === '') {
      return '';
    } else {
      const rawDigest = Utilities.computeDigest(
        Utilities.DigestAlgorithm.MD5,
        inputStr,
        Utilities.Charset.UTF_8
      );
      return rawDigest.map(function (byteVal) {
        const positiveVal = (byteVal < 0) ? (byteVal + 256) : byteVal;
        const hexStr = positiveVal.toString(16);
        return (hexStr.length === 1) ? `0${hexStr}` : hexStr;
      }).join('');
    }
  })();
  return result;
}

/**
 * MD5ハッシュ文字列の生成ダイアログを表示
 */
function showMd5HashDialog() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '🔑 MD5ハッシュ生成',
    'MD5ハッシュ化したい文字列を入力してください:',
    ui.ButtonSet.OK_CANCEL
  );

  const selectedButton = response.getSelectedButton();
  const inputText = response.getResponseText() || '';

  if (selectedButton === ui.Button.OK) {
    if (inputText !== '') {
      const hashValue = getMd5Hash(inputText);
      ui.alert(
        'MD5ハッシュ計算結果',
        `【入力文字列】\n${inputText}\n\n【MD5ハッシュ値】\n${hashValue}`,
        ui.ButtonSet.OK
      );
    } else {
      ui.alert('入力エラー', '文字列が入力されていません。', ui.ButtonSet.OK);
    }
  }
}



