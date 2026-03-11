import styles from "./ReaderPage.module.css";

type ReaderHeaderProps = {
  title: string;
  sharePath: string;
  endingType: "manual" | "auto-max-depth";
};

export function ReaderHeader({ title, sharePath, endingType }: ReaderHeaderProps) {
  return (
    <header className={styles.header}>
      <p className={styles.kicker}>Branch reader</p>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.metaRow}>
        <span className={styles.metaPill}>{endingType === "manual" ? "User ending" : "Auto ending"}</span>
        <a className={styles.metaLink} href={sharePath}>
          Reader share link
        </a>
      </div>
    </header>
  );
}

