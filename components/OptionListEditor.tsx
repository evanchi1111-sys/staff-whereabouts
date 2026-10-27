import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog";
import { Input } from "./Input";
import styles from "./OptionListEditor.module.css";

type Item = { id: number; label: string };

/** 一組可以新增、刪除的選項清單（同事名單、事由、地點共用）。 */
export function OptionListEditor({
  title,
  description,
  items,
  placeholder,
  maxLength,
  busy,
  removeWarning,
  onAdd,
  onRemove,
  className,
}: {
  title: string;
  description: string;
  items: Item[];
  placeholder: string;
  maxLength: number;
  busy: boolean;
  /** 刪除前確認視窗裡多出的提醒 */
  removeWarning?: string;
  onAdd: (label: string) => Promise<boolean>;
  onRemove: (id: number) => Promise<boolean>;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [removing, setRemoving] = useState<Item | null>(null);

  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>

      {items.length === 0 ? (
        <p className={styles.empty}>目前沒有項目</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <span className={styles.itemLabel}>{item.label}</span>
              <button
                type="button"
                className={styles.remove}
                aria-label={`刪除 ${item.label}`}
                onClick={() => setRemoving(item)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className={styles.addRow}
        onSubmit={async (e) => {
          e.preventDefault();
          const label = text.trim();
          if (!label) return;
          if (await onAdd(label)) setText("");
        }}
      >
        <Input
          value={text}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={`新增${title}`}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" disabled={busy || text.trim() === ""}>
          <Plus size={16} aria-hidden="true" />
          新增
        </Button>
      </form>

      <Dialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確定要刪除「{removing?.label}」嗎？</DialogTitle>
            <DialogDescription>
              {removeWarning ?? "刪除後，登記時就不會再出現這個選項。"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              先不要
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!removing) return;
                if (await onRemove(removing.id)) setRemoving(null);
              }}
            >
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
