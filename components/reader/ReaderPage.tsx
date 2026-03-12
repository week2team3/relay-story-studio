import type { StoryReaderBranch } from "@/lib/story/types";
import { ReaderHeader } from "./ReaderHeader";
import { ReaderStorySegment } from "./ReaderStorySegment";
import styles from "./ReaderPage.module.css";

type ReaderPageProps = {
  branch: StoryReaderBranch;
};

export function ReaderPage({ branch }: ReaderPageProps) {
  return (
    <main className={styles.page}>
      <section className={styles.storyShell}>
        <ReaderHeader
          canvasPath={`/canvas/${branch.canvas.shareKey}`}
          endingType={branch.endingType}
          sharePath={branch.sharePath}
          title={branch.canvas.title}
        />
        <article className={styles.storyBody}>
          {branch.segments.map((segment, index) => (
            <ReaderStorySegment key={`${segment.nodeId}-${segment.kind}-${index}`} segment={segment} />
          ))}
        </article>
        {branch.participantNicknames.length > 0 ? (
          <footer className={styles.storyFooter}>
            <p className={styles.footerLabel}>Participants</p>
            <p className={styles.footerNames}>{branch.participantNicknames.join(", ")}</p>
          </footer>
        ) : null}
      </section>
    </main>
  );
}
