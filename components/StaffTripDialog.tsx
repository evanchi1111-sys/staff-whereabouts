import { useState } from "react";
import { Briefcase, CheckCircle2, Clock, MapPin, Pencil } from "lucide-react";
import { Button } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import { TripPicker } from "./TripPicker";
import { toast } from "../helpers/toast";
import { useChangeTrips } from "../helpers/useChangeTrips";
import type { OutputType as Settings } from "../endpoints/settings_GET.schema";
import type { TripRow } from "../endpoints/trips_GET.schema";
import styles from "./StaffTripDialog.module.css";

const pad = (n: number) => String(n).padStart(2, "0");

/** 點名牌後的視窗：還在辦公室就選事由、地點外出；已外出就按「我已回來」。 */
export function StaffTripDialog({
  staff,
  trip,
  settings,
  onClose,
}: {
  staff: { id: number; name: string };
  trip?: TripRow;
  settings: Settings;
  onClose: () => void;
}) {
  const change = useChangeTrips();
  const [editing, setEditing] = useState(false);

  const comeBack = (t: TripRow) =>
    change.mutate(
      { action: "end", id: t.id },
      {
        onSuccess: () => {
          toast.success("歡迎回來！已記錄你回來了");
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle>
            {!trip
              ? `${staff.name} 要外出？`
              : editing
                ? `修改 ${staff.name} 的外出資料`
                : `${staff.name}・外出中`}
          </DialogTitle>
          <DialogDescription>
            {!trip
              ? "按一按選好，辦公室的同事馬上看得到。"
              : editing
                ? "改好後按「儲存修改」。"
                : "回到辦公室後，記得按「我已回來」。"}
          </DialogDescription>
        </DialogHeader>

        {!trip ? (
          <TripPicker staffId={staff.id} settings={settings} onDone={onClose} />
        ) : editing ? (
          <TripPicker
            staffId={staff.id}
            trip={trip}
            settings={settings}
            onDone={onClose}
          />
        ) : (
          <div className={styles.view}>
            <ul className={styles.facts}>
              <li className={styles.fact}>
                <Briefcase size={18} aria-hidden="true" />
                {trip.purpose}
              </li>
              <li className={styles.fact}>
                <MapPin size={18} aria-hidden="true" />
                {trip.place}
              </li>
              <li className={styles.fact}>
                <Clock size={18} aria-hidden="true" />
                {pad(trip.startAt.getHours())}:{pad(trip.startAt.getMinutes())} 外出
              </li>
            </ul>
            <div className={styles.actions}>
              <Button
                size="lg"
                className={styles.primaryAction}
                disabled={change.isPending}
                onClick={() => comeBack(trip)}
              >
                <CheckCircle2 size={20} aria-hidden="true" />
                我已回來
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil size={16} aria-hidden="true" />
                修改事由或地點
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
