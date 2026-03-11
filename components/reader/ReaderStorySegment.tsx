import type { StoryReaderSegment } from "@/lib/story/types";
import styles from "./ReaderPage.module.css";

type ReaderStorySegmentProps = {
  segment: StoryReaderSegment;
};

export function ReaderStorySegment({ segment }: ReaderStorySegmentProps) {
  if (segment.kind === "image") {
    return (
      <figure className={styles.figure}>
        {/* Reader assets can come from arbitrary upload URLs, so keep direct rendering here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={segment.imageAlt} className={styles.image} src={segment.imageUrl} />
      </figure>
    );
  }

  return (
    <div className={styles.textBlock}>
      {segment.text.split("\n\n").map((paragraph, index) => (
        <p className={styles.paragraph} key={`${segment.nodeId}-${index}`}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}
