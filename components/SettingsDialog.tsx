import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import { OptionListEditor } from "./OptionListEditor";
import { Skeleton } from "./Skeleton";
import { toast } from "../helpers/toast";
import { useChangeSettings } from "../helpers/useChangeSettings";
import { useSettingsQuery } from "../helpers/useSettingsQuery";
import type { InputType } from "../endpoints/settings/change_POST.schema";
import styles from "./SettingsDialog.module.css";

/** 維護同事名單、事由、地點選項的視窗。 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const settingsQuery = useSettingsQuery();
  const change = useChangeSettings();
  const data = settingsQuery.data;

  // 回傳 true 代表成功（清空輸入框／關閉確認視窗）
  const run = async (input: InputType, successMessage: string) => {
    try {
      await change.mutateAsync(input);
      toast.success(successMessage);
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失敗，請稍後再試");
      return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader>
          <DialogTitle>名單設定</DialogTitle>
          <DialogDescription>
            維護登記時下拉選單裡的同事、事由與地點。
          </DialogDescription>
        </DialogHeader>
        {settingsQuery.isError ? (
          <p className={styles.error} role="alert">
            讀取設定失敗：{settingsQuery.error.message}
          </p>
        ) : !data ? (
          <Skeleton className={styles.skeleton} />
        ) : (
          <div className={styles.stack}>
            <OptionListEditor
              title="同事名單"
              description="登記外出時，只能從這份名單選擇姓名。"
              items={data.staff.map((s) => ({ id: s.id, label: s.name }))}
              placeholder="輸入姓名"
              maxLength={20}
              busy={change.isPending}
              removeWarning="這位同事目前的外出登記也會一併刪除。"
              onAdd={(name) =>
                run({ action: "addStaff", name }, `已新增 ${name}`)
              }
              onRemove={(id) =>
                run({ action: "removeStaff", id }, "已從名單刪除")
              }
            />
            <OptionListEditor
              title="公務事由選項"
              description="登記時可直接選；也可選「其他」自行輸入。"
              items={data.purposes}
              placeholder="輸入事由，例如：會勘"
              maxLength={30}
              busy={change.isPending}
              onAdd={(label) =>
                run(
                  { action: "addOption", kind: "purpose", label },
                  "已新增事由",
                )
              }
              onRemove={(id) =>
                run({ action: "removeOption", id }, "已刪除事由")
              }
            />
            <OptionListEditor
              title="常用地點選項"
              description="登記時可直接選；也可選「其他」自行輸入。"
              items={data.places}
              placeholder="輸入地點，例如：台中港"
              maxLength={30}
              busy={change.isPending}
              onAdd={(label) =>
                run({ action: "addOption", kind: "place", label }, "已新增地點")
              }
              onRemove={(id) =>
                run({ action: "removeOption", id }, "已刪除地點")
              }
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
