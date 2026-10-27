/**
 * 辦公室人員行蹤告知表 - 資料後端（Google Apps Script）
 * 使用方式請見 docs/設定步驟.md
 * 資料存在這份 Google 試算表的三個工作表：人員、選項、行蹤
 */

var SHEET_STAFF = '人員';
var SHEET_OPTIONS = '選項';
var SHEET_TRIPS = '行蹤';
var SHEET_LEAVES = '請假';

var DEFAULT_PURPOSES = ['開會', '洽公', '廠商拜訪', '送件', '教育訓練', '現場巡視'];
var DEFAULT_PLACES = ['廠區現場', '總公司', '市區', '其他單位'];
var DEFAULT_STAFF = ['王小明', '李小華', '陳大文', '林小美'];

/** 第一次使用：在編輯器選 setup 後按「執行」，會自動建立三個工作表與預設選項。 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var staff = ensureSheet_(ss, SHEET_STAFF, ['id', 'name']);
  var options = ensureSheet_(ss, SHEET_OPTIONS, ['id', 'kind', 'label']);
  ensureSheet_(ss, SHEET_TRIPS, ['id', 'staffId', 'purpose', 'place', 'startAt', 'endAt']);
  ensureSheet_(ss, SHEET_LEAVES, ['id', 'staffId', 'startDate', 'endDate']);

  if (staff.getLastRow() < 2) {
    DEFAULT_STAFF.forEach(function (n) { staff.appendRow([id_(), n]); });
  }
  if (options.getLastRow() < 2) {
    DEFAULT_PURPOSES.forEach(function (l) { options.appendRow([id_(), 'purpose', l]); });
    DEFAULT_PLACES.forEach(function (l) { options.appendRow([id_(), 'place', l]); });
  }
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  // 全部當純文字存，避免時間被試算表自動轉換格式
  sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  return sh;
}

/** 新增一列，並先把該列設為純文字，避免日期被自動轉換。 */
function appendText_(sh, row) {
  var r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row]);
}

function id_() { return Utilities.getUuid(); }

function readRows_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('找不到工作表「' + name + '」，請先執行 setup');
  var values = sh.getDataRange().getValues();
  var head = values.shift();
  return values
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) {
      var o = {};
      head.forEach(function (k, i) {
        var v = r[i];
        if (v instanceof Date) {
          // 試算表偶爾會把日期文字自動轉成日期：純日期欄位依試算表時區還原成 yyyy-MM-dd
          o[k] = /Date$/.test(k)
            ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
            : v.toISOString();
        } else {
          o[k] = String(v);
        }
      });
      return o;
    });
}

/** 請假工作表若還沒建立（舊版升級）就自動建立。 */
function readLeaves_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_LEAVES)) {
    ensureSheet_(ss, SHEET_LEAVES, ['id', 'staffId', 'startDate', 'endDate']);
  }
  return readRows_(SHEET_LEAVES);
}

function snapshot_() {
  var options = readRows_(SHEET_OPTIONS);
  return {
    staff: readRows_(SHEET_STAFF).map(function (r) { return { id: r.id, name: r.name }; }),
    purposes: options.filter(function (o) { return o.kind === 'purpose'; })
      .map(function (o) { return { id: o.id, label: o.label }; }),
    places: options.filter(function (o) { return o.kind === 'place'; })
      .map(function (o) { return { id: o.id, label: o.label }; }),
    trips: readRows_(SHEET_TRIPS),
    leaves: readLeaves_()
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  try {
    return json_({ ok: true, data: snapshot_() });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var req = JSON.parse(e.postData.contents);
    handle_(req);
    return json_({ ok: true, data: snapshot_() });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function sheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/** 刪除某工作表中符合條件的列（由下往上刪）。 */
function deleteWhere_(name, test) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  for (var i = values.length - 1; i >= 1; i--) {
    if (test(values[i])) sh.deleteRow(i + 1);
  }
}

function text_(v, label, max) {
  var s = String(v == null ? '' : v).trim();
  if (!s) throw new Error('請填寫' + label);
  if (s.length > max) throw new Error(label + '最多 ' + max + ' 個字');
  return s;
}

function handle_(req) {
  var now = new Date();
  switch (req.action) {
    case 'create': {
      var staffId = String(req.staffId);
      var purpose = text_(req.purpose, '公務事由', 30);
      var place = text_(req.place, '前往地點', 30);
      var startAt = new Date(req.startAt);
      var endAt = new Date(req.endAt);
      if (isNaN(startAt) || isNaN(endAt)) throw new Error('時間格式不正確');
      // 同一個人同時只留一筆進行中的外出，新的取代舊的
      deleteWhere_(SHEET_TRIPS, function (r) {
        return String(r[1]) === staffId && new Date(r[5]) > now;
      });
      appendText_(sheet_(SHEET_TRIPS), [
        id_(), staffId, purpose, place, startAt.toISOString(), endAt.toISOString()
      ]);
      // 不留歷史：清掉結束超過一天的紀錄
      var cutoff = new Date(now.getTime() - 24 * 3600 * 1000);
      deleteWhere_(SHEET_TRIPS, function (r) { return new Date(r[5]) < cutoff; });
      break;
    }
    case 'end': {
      var sh = sheet_(SHEET_TRIPS);
      var values = sh.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]) === String(req.id)) {
          sh.getRange(i + 1, 6).setValue(now.toISOString());
        }
      }
      break;
    }
    case 'cancel':
      deleteWhere_(SHEET_TRIPS, function (r) { return String(r[0]) === String(req.id); });
      break;
    case 'addStaff': {
      var name = text_(req.name, '姓名', 20);
      var dup = readRows_(SHEET_STAFF).some(function (s) { return s.name === name; });
      if (dup) throw new Error('名單裡已經有這個姓名');
      appendText_(sheet_(SHEET_STAFF), [id_(), name]);
      break;
    }
    case 'removeStaff':
      deleteWhere_(SHEET_STAFF, function (r) { return String(r[0]) === String(req.id); });
      deleteWhere_(SHEET_TRIPS, function (r) { return String(r[1]) === String(req.id); });
      readLeaves_();
      deleteWhere_(SHEET_LEAVES, function (r) { return String(r[1]) === String(req.id); });
      break;
    case 'addLeave': {
      var re = /^\d{4}-\d{2}-\d{2}$/;
      var sd = String(req.startDate), ed = String(req.endDate);
      if (!re.test(sd) || !re.test(ed)) throw new Error('日期格式不正確');
      if (ed < sd) throw new Error('結束日期不能早於開始日期');
      readLeaves_();
      appendText_(sheet_(SHEET_LEAVES), [id_(), String(req.staffId), sd, ed]);
      // 不留歷史：清掉結束超過兩天的請假
      var old = Utilities.formatDate(new Date(now.getTime() - 2 * 24 * 3600 * 1000), 'Asia/Taipei', 'yyyy-MM-dd');
      deleteWhere_(SHEET_LEAVES, function (r) { return String(r[3]) < old; });
      break;
    }
    case 'removeLeave':
      readLeaves_();
      deleteWhere_(SHEET_LEAVES, function (r) { return String(r[0]) === String(req.id); });
      break;
    case 'addOption': {
      var kind = req.kind === 'place' ? 'place' : 'purpose';
      var label = text_(req.label, '名稱', 30);
      var dupOpt = readRows_(SHEET_OPTIONS).some(function (o) {
        return o.kind === kind && o.label === label;
      });
      if (dupOpt) throw new Error('已經有相同的選項');
      appendText_(sheet_(SHEET_OPTIONS), [id_(), kind, label]);
      break;
    }
    case 'removeOption':
      deleteWhere_(SHEET_OPTIONS, function (r) { return String(r[0]) === String(req.id); });
      break;
    default:
      throw new Error('不支援的操作');
  }
}
