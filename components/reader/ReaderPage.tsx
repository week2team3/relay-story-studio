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
          endingType={branch.endingType}
          sharePath={branch.sharePath}
          title={branch.canvas.title}
        />
        <article className={styles.storyBody}>
          {branch.segments.map((segment, index) => (
            <ReaderStorySegment key={`${segment.nodeId}-${segment.kind}-${index}`} segment={segment} />
          ))}
        </article>
      </section>
    </main>
  );
}

