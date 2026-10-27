import { tripStatus } from "../helpers/tripStatus";
import type { TripRow } from "../endpoints/trips_GET.schema";
import styles from "./StaffTile.module.css";

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** 一位同事的名牌：上班中、外出中或下班，點一下就能操作。 */
export function StaffTile({
  name,
  trip,
  now,
  working,
  onClick,
}: {
  name: string;
  trip?: TripRow;
  now: Date;
  /** 是否在上班時間內；下班後一律顯示「下班」 */
  working: boolean;
  onClick: () => void;
}) {
  const isOut = working && trip ? tripStatus(trip, now) !== "ended" : false;
  const kind = !working ? styles.off : isOut ? styles.out : styles.in;

  return (
    <button
      type="button"
      className={`${styles.tile} ${kind}`}
      disabled={!working}
      onClick={onClick}
    >
      <span className={styles.name}>{name}</span>
      {!working ? (
        <>
          <span className={styles.status}>下班</span>
          <span className={styles.hint}>上班日 07:30 恢復上班中</span>
        </>
      ) : trip && isOut ? (
        <>
          <span className={styles.status}>外出中</span>
          <span className={styles.detail}>
            {trip.place}・{trip.purpose}
          </span>
          <span className={styles.time}>{clock(trip.startAt)} 外出</span>
        </>
      ) : (
        <>
          <span className={styles.status}>上班中</span>
          <span className={styles.hint}>要外出請點這裡</span>
        </>
      )}
    </button>
  );
}
