"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { createCanvasNode, persistNodePosition } from "./canvasApi";
import styles from "./CanvasWorkspace.module.css";
import { CanvasWorkspaceData, CanvasWorkspaceNode } from "./types";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 128;
const MINIMAP_WIDTH = 188;
const MINIMAP_HEIGHT = 88;

type CanvasWorkspaceProps = {
  detail: CanvasWorkspaceData;
};

type DragState = {
  nodeId: string;
  offsetX: number;
  offsetY: number;
} | null;

export function CanvasWorkspace({ detail }: CanvasWorkspaceProps) {
  const [nodes, setNodes] = useState(detail.nodes);
  const [selectedNodeId, setSelectedNodeId] = useState(detail.nodes[0]?.id ?? "");
  const [writeOpen, setWriteOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [endingChecked, setEndingChecked] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const nodesRef = useRef(nodes);
  const canvasInnerRef = useRef<HTMLDivElement | null>(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0];
  const viewerMode = detail.viewer ? "authenticated" : "anonymous";
  const shareHref = `/canvas/${detail.canvas.shareKey}`;
  const readHref =
    selectedNode && selectedNode.isEnding ? `/read/${detail.canvas.shareKey}/${selectedNode.id}` : null;
  const canvasWidth = Math.max(1520, ...nodes.map((node) => node.position.x + NODE_WIDTH + 220));
  const canvasHeight = Math.max(920, ...nodes.map((node) => node.position.y + NODE_HEIGHT + 240));

  if (!selectedNode) {
    return (
      <main className={styles.page}>
        <section className={styles.workspace}>
          <div className={styles.topBar}>
            <div className={styles.titleBlock}>
              <span className={styles.eyebrow}>Role 2 canvas workspace</span>
              <h1 className={styles.title}>{detail.canvas.title}</h1>
              <p className={styles.subtitle}>No nodes were returned for this canvas yet.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const pointer = getCanvasPointerPosition(event, canvasInnerRef.current);

      if (!pointer) {
        return;
      }

      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === dragState.nodeId
            ? {
                ...node,
                position: {
                  x: Math.max(60, pointer.x - dragState.offsetX),
                  y: Math.max(80, pointer.y - dragState.offsetY),
                },
              }
            : node,
        ),
      );
    }

    async function handlePointerUp() {
      const movedNode = nodesRef.current.find((node) => node.id === dragState.nodeId);

      if (movedNode && viewerMode === "authenticated") {
        try {
          const result = await persistNodePosition(movedNode.id, movedNode.position);

          setNodes((currentNodes) =>
            currentNodes.map((node) => (node.id === result.node.id ? result.node : node)),
          );
        } catch (error) {
          setSubmitMessage(error instanceof Error ? error.message : "Could not save node position.");
        }
      }

      setDragState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, viewerMode]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function handleSelect(node: CanvasWorkspaceNode) {
    setSelectedNodeId(node.id);
    setWriteOpen(false);
    setSubmitMessage(null);
  }

  function handlePointerDown(node: CanvasWorkspaceNode, event: ReactPointerEvent<HTMLButtonElement>) {
    if (viewerMode !== "authenticated") {
      return;
    }

    const pointer = getCanvasPointerPosition(event.nativeEvent, canvasInnerRef.current);

    if (!pointer) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedNodeId(node.id);
    setWriteOpen(false);
    setDragState({
      nodeId: node.id,
      offsetX: pointer.x - node.position.x,
      offsetY: pointer.y - node.position.y,
    });
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function handlePublish() {
    if (!selectedNode) {
      return;
    }

    if (!draftText.trim()) {
      setSubmitMessage("Write the next node content before publishing.");
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const siblingCount = nodes.filter((node) => node.parentNodeId === selectedNode.id).length;
      const nextPosition = {
        x: selectedNode.position.x + 320,
        y: selectedNode.position.y + siblingCount * 180 - (siblingCount > 0 ? 90 : 0),
      };

      const result = await createCanvasNode({
        canvasId: detail.canvas.id,
        parentNodeId: selectedNode.id,
        content: draftText.trim(),
        position: nextPosition,
        isEnding: endingChecked,
      });

      setNodes((currentNodes) => {
        const nextNodes = [...currentNodes, result.node];

        if (result.autoEndingNode) {
          nextNodes.push(result.autoEndingNode);
        }

        return nextNodes;
      });

      setSelectedNodeId(result.autoEndingNode?.id ?? result.node.id);
      setWriteOpen(false);
      setDraftText("");
      setEndingChecked(false);
      setSummaryOpen(false);
      setSubmitMessage(
        result.autoEndingNode
          ? "Node published and the branch auto-completed at max depth."
          : "Node published.",
      );
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "Could not publish the next node.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.workspace}>
        <header className={styles.topBar}>
          <div className={styles.titleBlock}>
            <span className={styles.eyebrow}>Role 2 canvas workspace</span>
            <h1 className={styles.title}>{detail.canvas.title}</h1>
            <p className={styles.subtitle}>
              Share key: {detail.canvas.shareKey} · Max branch depth: {detail.canvas.maxUserNodesPerBranch}
            </p>
          </div>
          <div className={styles.actions}>
            <button className={styles.pill} onClick={handleCopyLink} type="button">
              {copied ? "Link copied" : "Copy link"}
            </button>
            {readHref ? (
              <a className={styles.primaryPill} href={readHref}>
                Read branch
              </a>
            ) : (
              <span className={styles.statusPill}>Select an ending node to read</span>
            )}
            <span className={styles.statusPill}>
              {viewerMode === "authenticated"
                ? `Logged in as ${detail.viewer?.nickname ?? "writer"}`
                : "Guest mode: read only, login to write"}
            </span>
          </div>
        </header>

        <div className={styles.canvasSurface}>
          <div
            className={styles.canvasInner}
            ref={canvasInnerRef}
            style={{ width: canvasWidth, height: canvasHeight }}
          >
            <svg className={styles.edgeLayer}>
              {nodes
                .filter((node) => node.parentNodeId)
                .map((node) => {
                  const source = nodes.find((candidate) => candidate.id === node.parentNodeId);

                  if (!source) {
                    return null;
                  }

                  const sourceX = source.position.x + NODE_WIDTH;
                  const sourceY = source.position.y + NODE_HEIGHT / 2;
                  const targetX = node.position.x;
                  const targetY = node.position.y + NODE_HEIGHT / 2;
                  const deltaX = (targetX - sourceX) / 2;
                  const path = `M ${sourceX} ${sourceY} C ${sourceX + deltaX} ${sourceY}, ${targetX - deltaX} ${targetY}, ${targetX} ${targetY}`;

                  return <path key={`${source.id}-${node.id}`} className={styles.edgePath} d={path} />;
                })}
            </svg>

            {nodes.map((node) => {
              const typeLabel = getNodeTypeLabel(node);

              return (
                <button
                  key={node.id}
                  className={[
                    styles.nodeCard,
                    selectedNodeId === node.id ? styles.nodeSelected : "",
                    node.isEnding ? styles.nodeEnding : "",
                    node.endingType === "auto-max-depth" ? styles.nodeAutoEnding : "",
                  ].join(" ")}
                  onClick={() => handleSelect(node)}
                  onPointerDown={(event) => handlePointerDown(node, event)}
                  style={{
                    left: node.position.x,
                    top: node.position.y,
                  }}
                  type="button"
                >
                  <span className={styles.nodeType}>{typeLabel}</span>
                  <h2 className={styles.nodeTitle}>{getNodeHeading(node)}</h2>
                  <p className={styles.nodeExcerpt}>{getExcerpt(node.content)}</p>
                </button>
              );
            })}
          </div>
        </div>

        <aside className={styles.drawer}>
          <div className={styles.drawerContent}>
            <span className={styles.sectionLabel}>Selected node</span>
            <h2 className={styles.drawerTitle}>{getNodeHeading(selectedNode)}</h2>
            <div className={styles.metaRow}>
              {getNodeTypeLabel(selectedNode)} · {selectedNode.createdAt}
            </div>
            <p className={styles.bodyCopy}>{selectedNode.content}</p>
            <div className={styles.buttonRow}>
              {selectedNode.isEnding ? (
                <a className={styles.tertiaryButton} href={readHref ?? shareHref}>
                  Open reader
                </a>
              ) : viewerMode === "authenticated" ? (
                <button
                  className={styles.primaryButton}
                  onClick={() => setWriteOpen((current) => !current)}
                  type="button"
                >
                  {writeOpen ? "Close write panel" : "Write next node"}
                </button>
              ) : (
                <a className={styles.primaryButton} href={`/login?next=${encodeURIComponent(shareHref)}`}>
                  Login to write
                </a>
              )}
              <button className={styles.secondaryButton} onClick={handleCopyLink} type="button">
                Copy canvas link
              </button>
            </div>

            {writeOpen ? (
              <section className={styles.writePanel}>
                <span className={styles.sectionLabel}>Write next node</span>
                <label className={styles.fieldLabel}>Parent context</label>
                <div className={styles.contextBox}>{selectedNode.content}</div>

                <button
                  className={styles.summaryToggle}
                  onClick={() => setSummaryOpen((current) => !current)}
                  type="button"
                >
                  {summaryOpen ? "Hide previous summary" : "Show previous summary"}
                </button>

                {summaryOpen ? (
                  <div className={styles.summaryBox}>
                    Role 4 summary slot. This stays collapsed by default and expands only when the
                    writer asks for it.
                  </div>
                ) : null}

                <label className={styles.fieldLabel} htmlFor="story-draft">
                  Story content
                </label>
                <textarea
                  className={styles.textArea}
                  id="story-draft"
                  onChange={(event) => setDraftText(event.target.value)}
                  placeholder="Continue the story from the selected node..."
                  value={draftText}
                />

                <div className={styles.inlineTools}>
                  <button className={styles.secondaryButton} disabled type="button">
                    Upload image
                  </button>
                  <button className={styles.secondaryButton} disabled type="button">
                    AI image
                  </button>
                  <label className={styles.checkboxRow}>
                    <input
                      checked={endingChecked}
                      onChange={(event) => setEndingChecked(event.target.checked)}
                      type="checkbox"
                    />
                    Mark this node as ending
                  </label>
                </div>

                <p className={styles.helperText}>
                  Role 4 media hooks are still pending. Publish already hits the real Role 1 node API.
                </p>

                <div className={styles.buttonRow}>
                  <button
                    className={styles.primaryButton}
                    disabled={isSubmitting}
                    onClick={handlePublish}
                    type="button"
                  >
                    {isSubmitting ? "Publishing..." : "Confirm and publish"}
                  </button>
                </div>
              </section>
            ) : null}

            {submitMessage ? <p className={styles.helperText}>{submitMessage}</p> : null}
          </div>
        </aside>

        <section className={styles.miniMap}>
          <h2 className={styles.miniMapTitle}>Mini map</h2>
          <div className={styles.miniMapFrame}>
            {nodes.map((node) => (
              <div
                key={`mini-${node.id}`}
                className={styles.miniNode}
                style={{
                  left: 10 + (node.position.x / canvasWidth) * MINIMAP_WIDTH,
                  top: 8 + (node.position.y / canvasHeight) * MINIMAP_HEIGHT,
                }}
              />
            ))}
            <div className={styles.miniViewport} style={{ left: 18, top: 16, width: 82, height: 48 }} />
          </div>
          <p className={styles.miniCaption}>
            Bottom-left translucent overlay, kept inside the canvas instead of taking a permanent
            sidebar.
          </p>
        </section>
      </section>
    </main>
  );
}

function getCanvasPointerPosition(
  event: PointerEvent,
  canvasInner: HTMLDivElement | null,
) {
  if (!canvasInner) {
    return null;
  }

  const rect = canvasInner.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function getNodeHeading(node: CanvasWorkspaceNode) {
  if (node.parentNodeId === null) {
    return "Root node";
  }

  if (node.isEnding && node.endingType === "auto-max-depth") {
    return "Auto ending";
  }

  if (node.isEnding) {
    return "Ending node";
  }

  return "Story node";
}

function getNodeTypeLabel(node: CanvasWorkspaceNode) {
  if (node.parentNodeId === null) {
    return "Root";
  }

  if (node.isEnding && node.endingType === "auto-max-depth") {
    return "Auto ending";
  }

  if (node.isEnding) {
    return "Ending";
  }

  return "Branch";
}

function getExcerpt(content: string) {
  return content.length > 96 ? `${content.slice(0, 96)}...` : content;
}
