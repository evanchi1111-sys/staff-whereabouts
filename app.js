(function () {
  "use strict";

  var URL_ = (window.APPS_SCRIPT_URL || "").trim();
  var WORK_START = 7 * 60 + 30; // 07:30
  var WORK_END = 16 * 60 + 30; // 16:30
  var OTHER = "__other__";

  var state = { data: null, busy: false };
  var $grid = document.getElementById("grid");
  var $hint = document.getElementById("hint");
  var $date = document.getElementById("date");
  var $time = document.getElementById("time");
  var $sIn = document.getElementById("sIn");
  var $sOut = document.getElementById("sOut");
  var $sLeave = document.getElementById("sLeave");
  var $dlg = document.getElementById("dlg");
  var $toast = document.getElementById("toast");

  // ---------- 小工具 ----------
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    [].concat(children || []).forEach(function (c) {
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hhmm(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  var WEEK = ["日", "一", "二", "三", "四", "五", "六"];

  function isWorkTime(now) {
    var d = now.getDay();
    if (d < 1 || d > 5) return false;
    var m = now.getHours() * 60 + now.getMinutes();
    return m >= WORK_START && m < WORK_END;
  }
  function endOfWorkday(now) {
    var e = new Date(now);
    e.setHours(16, 30, 0, 0);
    return e;
  }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function mmdd(str) { return str.slice(5).replace("-", "/"); }
  // 預設請假起始日：上班時間內或今天還沒上班 → 今天；否則下一個上班日
  function defaultLeaveStart(now) {
    var d = new Date(now);
    var m = d.getHours() * 60 + d.getMinutes();
    var wd = d.getDay();
    if (wd >= 1 && wd <= 5 && m < WORK_END) return ymd(d);
    do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
    return ymd(d);
  }
  function leavesOf(staffId) {
    return ((state.data && state.data.leaves) || []).filter(function (l) { return l.staffId === staffId; });
  }
  function activeLeave(staffId, now) {
    var today = ymd(now);
    var list = leavesOf(staffId).filter(function (l) { return l.startDate <= today && today <= l.endDate; });
    return list.length ? list[list.length - 1] : null;
  }
  function toast(msg, isErr) {
    $toast.textContent = msg;
    $toast.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { $toast.className = "toast"; }, 2800);
  }

  // ---------- 與 Google 試算表溝通 ----------
  function parse(res) {
    return res.json().then(function (j) {
      if (!j.ok) throw new Error(j.error || "操作失敗");
      return j.data;
    });
  }
  function load() {
    return fetch(URL_).then(parse).then(function (d) { state.data = d; render(); });
  }
  function send(payload) {
    state.busy = true;
    // 不加 Content-Type，瀏覽器會用純文字送出，Apps Script 才不會被擋
    return fetch(URL_, { method: "POST", body: JSON.stringify(payload) })
      .then(parse)
      .then(function (d) { state.data = d; render(); return true; })
      .catch(function (e) { toast(e.message || "操作失敗，請稍後再試", true); return false; })
      .then(function (ok) { state.busy = false; return ok; });
  }

  // ---------- 狀態判斷 ----------
  function activeTrip(staffId, now) {
    if (!state.data) return null;
    var list = state.data.trips.filter(function (t) {
      return t.staffId === staffId &&
        new Date(t.startAt) <= now && now < new Date(t.endAt);
    });
    return list.length ? list[list.length - 1] : null;
  }

  // ---------- 畫面 ----------
  function render() {
    var now = new Date();
    $date.textContent = pad(now.getMonth() + 1) + "/" + pad(now.getDate()) + " 週" + WEEK[now.getDay()];
    $time.textContent = hhmm(now);
    var working = isWorkTime(now);
    $hint.textContent = working
      ? "點自己的名牌登記外出或請假；回來後再點一次，按「我已回來」。"
      : "現在是下班時間。平日 07:30–16:30 會顯示上班與外出；要預先請假，點自己的名牌。";

    if (!state.data) return;
    var counts = { in: 0, out: 0, leave: 0 };
    $grid.textContent = "";
    state.data.staff.forEach(function (s) {
      var leave = working ? activeLeave(s.id, now) : null;
      var trip = working && !leave ? activeTrip(s.id, now) : null;
      var cls = !working ? "off" : leave ? "leave" : trip ? "out" : "in";
      var status = !working ? "下班" : leave ? "請假中" : trip ? "外出中" : "上班中";
      if (working) counts[cls]++;
      var kids = [
        el("span", { class: "lamp", "aria-hidden": "true" }),
        el("div", { class: "name" }, s.name),
        el("div", { class: "status" }, status)
      ];
      if (leave) {
        kids.push(el("div", { class: "detail" },
          leave.startDate === leave.endDate ? "今天請假" : "請假至 " + mmdd(leave.endDate)));
      } else if (trip) {
        kids.push(el("div", { class: "detail" }, [
          el("span", { class: "purpose" }, trip.purpose),
          el("span", {}, "往 " + trip.place),
          el("span", { class: "since" }, hhmm(new Date(trip.startAt)) + " 出發")
        ]));
      }
      $grid.appendChild(el("button", {
        class: "tile " + cls,
        type: "button",
        onclick: function () { onTile(s, trip, working, leave); }
      }, kids));
    });
    if (!state.data.staff.length) {
      $grid.appendChild(el("p", { class: "empty" }, "名單是空的。請到下方「名單設定」新增同事。"));
    }
    $sIn.textContent = working ? counts.in : "–";
    $sOut.textContent = working ? counts.out : "–";
    $sLeave.textContent = working ? counts.leave : "–";
  }

  function onTile(staff, trip, working, leave) {
    if (!working || leave) { openLeave(staff); return; }
    if (trip) openBack(staff, trip); else openOut(staff);
  }

  function openDialog(children) {
    $dlg.textContent = "";
    $dlg.appendChild(el("div", { class: "dlg" }, children));
    if (!$dlg.open) $dlg.showModal();
  }
  function closeDialog() { if ($dlg.open) $dlg.close(); }

  // 外出登記
  function openOut(staff) {
    var pick = { purpose: "", place: "" };
    var other = { purpose: "", place: "" };
    var go = el("button", { class: "btn go", type: "button", disabled: "" }, "出發");

    function value(kind) { return pick[kind] === OTHER ? other[kind].trim() : pick[kind]; }
    function refresh() {
      if (value("purpose") && value("place")) go.removeAttribute("disabled");
      else go.setAttribute("disabled", "");
    }
    function group(kind, title, items) {
      var chips = el("div", { class: "chips" });
      var input = el("input", {
        type: "text", maxlength: "30", placeholder: "請輸入" + title,
        style: "display:none",
        oninput: function (e) { other[kind] = e.target.value; refresh(); }
      });
      function mk(label, val) {
        var c = el("button", { class: "chip", type: "button" }, label);
        c.addEventListener("click", function () {
          pick[kind] = val;
          [].forEach.call(chips.children, function (x) { x.classList.remove("sel"); });
          c.classList.add("sel");
          input.style.display = val === OTHER ? "" : "none";
          if (val === OTHER) input.focus();
          refresh();
        });
        return c;
      }
      items.forEach(function (i) { chips.appendChild(mk(i.label, i.label)); });
      chips.appendChild(mk("其他", OTHER));
      return el("div", {}, [el("h3", {}, title), chips, input]);
    }

    go.addEventListener("click", function () {
      var now = new Date();
      go.setAttribute("disabled", "");
      send({
        action: "create", staffId: staff.id,
        purpose: value("purpose"), place: value("place"),
        startAt: now.toISOString(), endAt: endOfWorkday(now).toISOString()
      }).then(function (ok) {
        if (ok) { closeDialog(); toast(staff.name + " 已登記外出"); } else refresh();
      });
    });

    openDialog([
      el("h2", {}, staff.name + "，要外出嗎？"),
      group("purpose", "公務事由", state.data.purposes),
      group("place", "前往地點", state.data.places),
      el("div", { class: "actions" }, [
        el("button", { class: "btn", type: "button", onclick: function () { openLeave(staff); } }, "我要請假"),
        el("button", { class: "btn", type: "button", onclick: closeDialog }, "取消"),
        go
      ])
    ]);
  }

  // 請假登記
  function openLeave(staff) {
    var now = new Date();
    var today = ymd(now);
    var start = defaultLeaveStart(now);
    var startIn = el("input", { type: "date", value: start, min: today });
    var endIn = el("input", { type: "date", value: start, min: today });
    startIn.addEventListener("change", function () {
      endIn.min = startIn.value || today;
      if (endIn.value < startIn.value) endIn.value = startIn.value;
    });
    var mine = leavesOf(staff.id)
      .filter(function (l) { return l.endDate >= today; })
      .sort(function (a, b) { return a.startDate < b.startDate ? -1 : 1; });

    var children = [el("h2", {}, staff.name + "：請假")];
    if (mine.length) {
      var list = el("ul", { class: "list" });
      mine.forEach(function (l) {
        var label = l.startDate === l.endDate ? mmdd(l.startDate) : mmdd(l.startDate) + " – " + mmdd(l.endDate);
        list.appendChild(el("li", {}, [
          label,
          el("button", {
            type: "button", "aria-label": "取消 " + label + " 的請假",
            onclick: function () {
              send({ action: "removeLeave", id: l.id }).then(function (ok) {
                if (ok) { toast("已取消請假"); openLeave(staff); }
              });
            }
          }, "✕")
        ]));
      });
      children.push(el("div", {}, [el("h3", {}, "已登記的請假（按 ✕ 可取消）"), list]));
    }
    children.push(el("div", {}, [
      el("h3", {}, "新增請假"),
      el("div", { class: "daterow" }, [
        el("label", {}, ["從", startIn]),
        el("label", {}, ["到", endIn])
      ]),
      el("p", { class: "hint" }, "只請一天，兩個日期選同一天即可。請假期間的平日會顯示「請假中」。")
    ]));
    children.push(el("div", { class: "actions" }, [
      el("button", { class: "btn", type: "button", onclick: closeDialog }, "關閉"),
      el("button", {
        class: "btn primary", type: "button",
        onclick: function () {
          if (!startIn.value || !endIn.value) { toast("請選擇日期", true); return; }
          if (endIn.value < startIn.value) { toast("結束日期不能早於開始日期", true); return; }
          send({ action: "addLeave", staffId: staff.id, startDate: startIn.value, endDate: endIn.value })
            .then(function (ok) { if (ok) { closeDialog(); toast("已登記請假"); } });
        }
      }, "登記請假")
    ]));
    openDialog(children);
  }

  // 回來 / 取消
  function openBack(staff, trip) {
    openDialog([
      el("h2", {}, staff.name + " 外出中"),
      el("div", { class: "big" }, [
        "事由：" + trip.purpose, el("br"),
        "地點：" + trip.place, el("br"),
        "出發：" + hhmm(new Date(trip.startAt))
      ]),
      el("div", { class: "actions" }, [
        el("button", {
          class: "btn danger", type: "button",
          onclick: function () {
            send({ action: "cancel", id: trip.id }).then(function (ok) {
              if (ok) { closeDialog(); toast("已取消登記"); }
            });
          }
        }, "登記錯了，取消"),
        el("button", { class: "btn", type: "button", onclick: closeDialog }, "關閉"),
        el("button", {
          class: "btn back", type: "button",
          onclick: function () {
            send({ action: "end", id: trip.id }).then(function (ok) {
              if (ok) { closeDialog(); toast("歡迎回來，" + staff.name); }
            });
          }
        }, "我已回來")
      ])
    ]);
  }

  // 名單設定
  function openSettings() {
    if (!state.data) return;
    function section(title, desc, items, labelOf, placeholder, addPayload, removePayload) {
      var list = el("ul", { class: "list" });
      items.forEach(function (it) {
        list.appendChild(el("li", {}, [
          labelOf(it),
          el("button", {
            type: "button", "aria-label": "刪除 " + labelOf(it),
            onclick: function () {
              if (!confirm("確定刪除「" + labelOf(it) + "」嗎？")) return;
              send(removePayload(it)).then(function (ok) { if (ok) openSettings(); });
            }
          }, "✕")
        ]));
      });
      var input = el("input", { type: "text", maxlength: "30", placeholder: placeholder });
      var add = el("button", {
        class: "btn primary", type: "button",
        onclick: function () {
          var v = input.value.trim();
          if (!v) return;
          send(addPayload(v)).then(function (ok) { if (ok) openSettings(); });
        }
      }, "新增");
      return el("div", {}, [
        el("h3", {}, title),
        el("p", { class: "hint" }, desc),
        list,
        el("div", { class: "addrow" }, [input, add])
      ]);
    }
    openDialog([
      el("h2", {}, "名單設定"),
      section("同事名單", "刪除同事時，他的外出登記也會一併刪除。",
        state.data.staff, function (s) { return s.name; }, "輸入姓名",
        function (v) { return { action: "addStaff", name: v }; },
        function (s) { return { action: "removeStaff", id: s.id }; }),
      section("公務事由選項", "登記時可直接點選，也可選「其他」自行輸入。",
        state.data.purposes, function (o) { return o.label; }, "輸入事由，例如：會勘",
        function (v) { return { action: "addOption", kind: "purpose", label: v }; },
        function (o) { return { action: "removeOption", id: o.id }; }),
      section("常用地點選項", "登記時可直接點選，也可選「其他」自行輸入。",
        state.data.places, function (o) { return o.label; }, "輸入地點，例如：台中港",
        function (v) { return { action: "addOption", kind: "place", label: v }; },
        function (o) { return { action: "removeOption", id: o.id }; }),
      el("div", { class: "actions" }, [
        el("button", { class: "btn", type: "button", onclick: closeDialog }, "關閉")
      ])
    ]);
  }

  // ---------- 啟動 ----------
  document.getElementById("openSettings").addEventListener("click", openSettings);

  if (!URL_) {
    $hint.textContent = "";
    $grid.appendChild(el("div", { class: "setup" }, [
      "尚未設定資料來源。請依照 docs/設定步驟.md 建立 Google 試算表後端，",
      "再把網址貼進 config.js。"
    ]));
    return;
  }

  load().catch(function (e) {
    $hint.textContent = "讀取失敗：" + (e.message || e) + "（請檢查 config.js 的網址）";
  });
  // 每 15 秒自動更新，讓大家看到別人最新的狀態
  setInterval(function () {
    if (!state.busy && !$dlg.open) load().catch(function () {});
  }, 15000);
  // 每 30 秒重畫（時間到了自動切換上班／下班）
  setInterval(render, 30000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && !state.busy) load().catch(function () {});
  });
})();
