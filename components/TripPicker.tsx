import { useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { toast } from "../helpers/toast";
import { useChangeTrips } from "../helpers/useChangeTrips";
import { workHours } from "../helpers/workHours";
import type { OutputType as Settings } from "../endpoints/settings_GET.schema";
import type { TripRow } from "../endpoints/trips_GET.schema";
import styles from "./TripPicker.module.css";

const OTHER = "__other";

/** 用按鈕選事由與地點，按一下就外出（新增）或儲存修改。 */
export function TripPicker({
  staffId,
  trip,
  settings,
  onDone,
}: {
  staffId: number;
  /** 有帶入就是修改這筆 */
  trip?: TripRow;
  settings: Settings;
  onDone: () => void;
}) {
  const change = useChangeTrips();

  const [init] = useState(() => {
    if (!trip) {
      return { purpose: "", purposeOther: "", place: "", placeOther: "" };
    }
    const purposeKnown = settings.purposes.some((o) => o.label === trip.purpose);
    const placeKnown = settings.places.some((o) => o.label === trip.place);
    return {
      purpose: purposeKnown ? trip.purpose : OTHER,
      purposeOther: purposeKnown ? "" : trip.purpose,
      place: placeKnown ? trip.place : OTHER,
      placeOther: placeKnown ? "" : trip.place,
    };
  });

  const [purpose, setPurpose] = useState(init.purpose);
  const [purposeOther, setPurposeOther] = useState(init.purposeOther);
  const [place, setPlace] = useState(init.place);
  const [placeOther, setPlaceOther] = useState(init.placeOther);
  const [error, setError] = useState("");

  const submit = () => {
    const purposeText = purpose === OTHER ? purposeOther.trim() : purpose;
    const placeText = place === OTHER ? placeOther.trim() : place;
    if (!purposeText) return setError("請選擇要處理什麼公務");
    if (!placeText) return setError("請選擇要去什麼地方");
    setError("");

    const handlers = {
      onSuccess: () => {
        toast.success(trip ? "已更新" : "已外出，同事們都看得到了");
        onDone();
      },
      onError: (e: Error) => setError(e.message),
    };

    if (trip) {
      change.mutate(
        {
          action: "update",
          id: trip.id,
          purpose: purposeText,
          place: placeText,
          startAt: trip.startAt,
          endAt: trip.endAt,
        },
        handlers,
      );
    } else {
      // 現在出發；沒按「我已回來」的話，到下班時間（16:30）自動結束
      const startAt = new Date();
      const endAt = workHours.endOfWorkday(startAt);
      change.mutate(
        {
          action: "create",
          staffId,
          purpose: purposeText,
          place: placeText,
          startAt,
          endAt,
        },
        handlers,
      );
    }
  };

  const chip = (selected: boolean) => (selected ? "primary" : "outline");

  return (
    <div className={styles.picker}>
      <section className={styles.group}>
        <h3 className={styles.label}>處理什麼公務？</h3>
        <div className={styles.chips}>
          {settings.purposes.map((o) => (
            <Button
              key={o.id}
              shape="pill"
              variant={chip(purpose === o.label)}
              onClick={() => setPurpose(o.label)}
            >
              {o.label}
            </Button>
          ))}
          <Button
            shape="pill"
            variant={chip(purpose === OTHER)}
            onClick={() => setPurpose(OTHER)}
          >
            其他
          </Button>
        </div>
        {purpose === OTHER ? (
          <Input
            autoFocus
            value={purposeOther}
            maxLength={30}
            placeholder="輸入公務事由"
            onChange={(e) => setPurposeOther(e.target.value)}
          />
        ) : null}
      </section>

      <section className={styles.group}>
        <h3 className={styles.label}>去什麼地方？</h3>
        <div className={styles.chips}>
          {settings.places.map((o) => (
            <Button
              key={o.id}
              shape="pill"
              variant={chip(place === o.label)}
              onClick={() => setPlace(o.label)}
            >
              {o.label}
            </Button>
          ))}
          <Button
            shape="pill"
            variant={chip(place === OTHER)}
            onClick={() => setPlace(OTHER)}
          >
            其他
          </Button>
        </div>
        {place === OTHER ? (
          <Input
            autoFocus
            value={placeOther}
            maxLength={30}
            placeholder="輸入前往地點"
            onChange={(e) => setPlaceOther(e.target.value)}
          />
        ) : null}
      </section>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <Button
        size="lg"
        className={styles.submit}
        disabled={change.isPending}
        onClick={submit}
      >
        {change.isPending ? "送出中…" : trip ? "儲存修改" : "確定外出"}
      </Button>
    </div>
  );
}
