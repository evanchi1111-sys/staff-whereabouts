import { useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Settings } from "lucide-react";
import { Button } from "../components/Button";
import { SettingsDialog } from "../components/SettingsDialog";
import { Skeleton } from "../components/Skeleton";
import { StaffTile } from "../components/StaffTile";
import { StaffTripDialog } from "../components/StaffTripDialog";
import { tripStatus } from "../helpers/tripStatus";
import { useNow } from "../helpers/useNow";
import { workHours } from "../helpers/workHours";
import { useSettingsQuery } from "../helpers/useSettingsQuery";
import { useTripsQuery } from "../helpers/useTripsQuery";
import type { TripRow } from "../endpoints/trips_GET.schema";
import styles from "./_index.module.css";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function BoardPage() {
  const now = useNow();
  const tripsQuery = useTripsQuery();
  const settingsQuery = useSettingsQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // 每位同事今天最近的一筆行程（外出中優先，其次是最早的預定）
  const working = workHours.isWorkTime(now);

  const tripByStaff = useMemo(() => {
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    const map = new Map<number, TripRow>();
    for (const t of tripsQuery.data ?? []) {
      if (tripStatus(t, now) === "ended") continue;
      if (t.startAt.getTime() >= end.getTime()) continue;
      if (!map.has(t.staffId)) map.set(t.staffId, t); // 已依外出時間排序
    }
    return map;
  }, [tripsQuery.data, now]);

  const staff = settingsQuery.data?.staff ?? [];
  const outCount = staff.filter(
    (s) => {
      const t = tripByStaff.get(s.id);
      return t ? tripStatus(t, now) === "out" : false;
    },
  ).length;

  const selected = staff.find((s) => s.id === selectedId) ?? null;
  const dateText = `${now.getMonth() + 1} 月 ${now.getDate()} 日（週${WEEKDAYS[now.getDay()]}）`;
  const loading = settingsQuery.isPending || tripsQuery.isPending;
  const error = settingsQuery.error ?? tripsQuery.error;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>人員行蹤告知表</title>
      </Helmet>

      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>今日行蹤</h1>
          <p className={styles.date}>{dateText}</p>
        </div>
        {!loading && !error && working ? (
          <p className={styles.summary}>
            外出中 <strong>{outCount}</strong> 人
          </p>
        ) : !loading && !error ? (
          <p className={styles.summary}>已下班</p>
        ) : null}
      </div>
      <p className={styles.hint}>點自己的名牌，選好事由和地點就外出；回來時再點一下按「我已回來」。</p>

      {error ? (
        <div className={styles.errorBox} role="alert">
          讀取失敗：{error.message}
        </div>
      ) : loading ? (
        <div className={styles.grid}>
          <Skeleton className={styles.skeleton} />
          <Skeleton className={styles.skeleton} />
          <Skeleton className={styles.skeleton} />
        </div>
      ) : staff.length === 0 ? (
        <div className={styles.empty}>
          名單還是空的，請先到下方「名單設定」新增同事。
        </div>
      ) : (
        <div className={styles.grid}>
          {staff.map((s) => (
            <StaffTile
              key={s.id}
              name={s.name}
              trip={tripByStaff.get(s.id)}
              now={now}
              working={working}
              onClick={() => setSelectedId(s.id)}
            />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
          <Settings size={14} aria-hidden="true" />
          名單設定
        </Button>
      </div>

      {selected && settingsQuery.data ? (
        <StaffTripDialog
          key={selected.id}
          staff={selected}
          trip={tripByStaff.get(selected.id)}
          settings={settingsQuery.data}
          onClose={() => setSelectedId(null)}
        />
      ) : null}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
