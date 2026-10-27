import { ReactNode } from "react";
import { MapPinned } from "lucide-react";
import styles from "./AppShell.module.css";

/** 共用外框：標題列與內容區。 */
export default function AppShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.shell} ${className ?? ""}`}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <MapPinned className={styles.brandIcon} aria-hidden="true" />
            <span className={styles.brandName}>人員行蹤告知表</span>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
