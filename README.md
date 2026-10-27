# 辦公室人員行蹤告知表

同事離開辦公大樓處理公務時，自己點名牌選「事由」與「地點」就外出，回來按「我已回來」，辦公室其他同事開網頁就能看到誰在外面。

- 單一頁面、按鈕式操作，不需登入或密碼，約 10 人使用
- 週一至週五 07:30–16:30 顯示上班中／外出中；其餘時間與週末自動顯示「下班」
- 沒按「我已回來」的外出紀錄，到 16:30 自動結束
- 同事名單、事由、地點選項可在頁面最下方「名單設定」維護

## 這個倉庫放什麼

這是在 **Floot**（floot.com）上建立的網站，這裡只放「這個專案自己寫的程式」，作為備份與版本紀錄：

- `pages/`、`components/`：畫面（名牌、外出視窗、名單設定）
- `endpoints/`：後端（行蹤與設定的讀寫）
- `helpers/`：共用程式（上下班判斷、資料庫連線等）
- `base.css`：配色與字體

Floot 內建的通用元件（Button、Dialog、Select、Toaster 等）、`FlootRealtimeProvider`、`RealtimeClient`、`toast`、`themeMode` 等，是每個 Floot 專案都有的預設套件，**不包含在這個倉庫**，新專案建立時會自動附上。

## 資料庫（PostgreSQL）

資料不在這個倉庫內。重建時請先建立下列資料表：

```sql
CREATE TYPE option_kind AS ENUM ('purpose', 'place');

CREATE TABLE staff (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE options (
  id serial PRIMARY KEY,
  kind option_kind NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, label)
);

CREATE TABLE trips (
  id serial PRIMARY KEY,
  staff_id integer NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  place text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trips_end_at_idx ON trips (end_at);
CREATE INDEX trips_staff_id_idx ON trips (staff_id);
```

預設的事由選項：開會、洽公、廠商拜訪、送件、教育訓練、現場巡視；
預設的地點選項：廠區現場、總公司、市區、其他單位。

## 注意

- 網站沒有登入：知道網址的人都能操作，也能修改名單設定。
- 國定假日不會自動判斷，那幾天仍顯示「上班中」。
- 上下班判斷依照使用者瀏覽器的本機時間（台灣）。
