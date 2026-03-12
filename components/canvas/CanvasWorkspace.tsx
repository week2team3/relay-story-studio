"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { MediaPicker } from "@/components/media/MediaPicker";
import type { MediaAsset } from "@/lib/media/types";
import {
  createCanvasNode,
  fetchCanvasWorkspace,
  heartbeatCanvasPresence,
  persistNodePosition
} from "./canvasApi";
import styles from "./CanvasWorkspace.module.css";
import { CanvasWorkspaceData, CanvasWorkspaceNode } from "./types";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 128;
const MINIMAP_WIDTH = 252;
const MINIMAP_HEIGHT = 152;
const MINIMAP_PADDING_X = 14;
const MINIMAP_PADDING_Y = 14;
const MIN_CHILD_X_GAP = 36;
const VERTICAL_DRAG_FACTOR = 0.58;
const MIN_ZOOM = 0.65;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.1;
const WORLD_PADDING_LEFT = 960;
const WORLD_PADDING_RIGHT = 1560;
const WORLD_PADDING_TOP = 620;
const WORLD_PADDING_BOTTOM = 960;
const WORLD_MIN_WIDTH = 5200;
const WORLD_MIN_HEIGHT = 3200;
const LIVE_SYNC_INTERVAL_MS = 1200;
const PRESENCE_SYNC_INTERVAL_MS = 5000;

type CanvasWorkspaceProps = {
  detail: CanvasWorkspaceData;
};

type DragState = {
  nodeId: string;
  offsetX: number;
  offsetY: number;
} | null;

type PanState = {
  startClientX: number;
  startClientY: number;
  startScrollLeft: number;
  startScrollTop: number;
} | null;

type ViewportState = {
  scrollLeft: number;
  scrollTop: number;
  width: number;
  height: number;
};

export function CanvasWorkspace({ detail }: CanvasWorkspaceProps) {
  const [nodes, setNodes] = useState(detail.nodes);
  const [assets, setAssets] = useState(detail.assets);
  const [selectedNodeId, setSelectedNodeId] = useState(detail.nodes[0]?.id ?? "");
  const [writeOpen, setWriteOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const [endingChecked, setEndingChecked] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<MediaAsset[]>([]);
  const [dragState, setDragState] = useState<DragState>(null);
  const [panState, setPanState] = useState<PanState>(null);
  const [miniMapDragging, setMiniMapDragging] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(true);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({
    scrollLeft: 0,
    scrollTop: 0,
    width: 0,
    height: 0,
  });
  const nodesRef = useRef(nodes);
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null);
  const canvasInnerRef = useRef<HTMLDivElement | null>(null);
  const miniMapFrameRef = useRef<HTMLDivElement | null>(null);
  const initializedViewportRef = useRef(false);
  const syncSignatureRef = useRef(buildCanvasSyncSignature(detail));

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? nodes[0];
  const selectedNodeAssets = selectedNode
    ? selectedNode.imageAssetIds.flatMap((assetId) => {
        const asset = assets.find((candidate) => candidate.id === assetId);
        return asset ? [asset] : [];
      })
    : [];
  const previousNodes = selectedNode
    ? selectedNode.ancestorIds.flatMap((ancestorId) => {
        const node = nodes.find((candidate) => candidate.id === ancestorId);
        return node ? [node] : [];
      })
    : [];
  const rootNode = nodes.find((node) => node.parentNodeId === null) ?? nodes[0];
  const viewerMode = detail.viewer ? "authenticated" : "anonymous";
  const shareHref = `/canvas/${detail.canvas.shareKey}`;
  const readHref =
    selectedNode && selectedNode.isEnding ? `/read/${detail.canvas.shareKey}/${selectedNode.id}` : null;

  const bounds = getContentBounds(nodes);
  const worldOffsetX = WORLD_PADDING_LEFT - bounds.minX;
  const worldOffsetY = WORLD_PADDING_TOP - bounds.minY;
  const worldMinWidth = Math.max(WORLD_MIN_WIDTH, Math.ceil(viewport.width * 3.4));
  const worldMinHeight = Math.max(WORLD_MIN_HEIGHT, Math.ceil(viewport.height * 3.1));
  const canvasWidth = Math.max(
    worldMinWidth,
    bounds.maxX - bounds.minX + WORLD_PADDING_LEFT + WORLD_PADDING_RIGHT,
  );
  const canvasHeight = Math.max(
    worldMinHeight,
    bounds.maxY - bounds.minY + WORLD_PADDING_TOP + WORLD_PADDING_BOTTOM,
  );
  const activeDragNode = dragState ? nodes.find((node) => node.id === dragState.nodeId) ?? null : null;
  const activeParentNode =
    activeDragNode?.parentNodeId
      ? nodes.find((node) => node.id === activeDragNode.parentNodeId) ?? null
      : null;
  const forbiddenBoundaryX = activeParentNode
    ? activeParentNode.position.x + worldOffsetX + NODE_WIDTH + MIN_CHILD_X_GAP
    : null;
  const viewportWorldWidth = viewport.width / zoom;
  const viewportWorldHeight = viewport.height / zoom;
  const viewportWorldLeft = viewport.scrollLeft / zoom;
  const viewportWorldTop = viewport.scrollTop / zoom;

  const miniViewportWidth = clamp(
    (viewportWorldWidth / canvasWidth) * MINIMAP_WIDTH,
    34,
    MINIMAP_WIDTH,
  );
  const miniViewportHeight = clamp(
    (viewportWorldHeight / canvasHeight) * MINIMAP_HEIGHT,
    28,
    MINIMAP_HEIGHT,
  );
  const miniViewportLeft = clamp(
    (viewportWorldLeft / canvasWidth) * MINIMAP_WIDTH,
    0,
    MINIMAP_WIDTH - miniViewportWidth,
  );
  const miniViewportTop = clamp(
    (viewportWorldTop / canvasHeight) * MINIMAP_HEIGHT,
    0,
    MINIMAP_HEIGHT - miniViewportHeight,
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    syncSignatureRef.current = buildCanvasSyncSignature({
      ...detail,
      nodes,
      assets,
    });
  }, [assets, detail, nodes]);

  useEffect(() => {
    let cancelled = false;

    async function syncWorkspace() {
      if (cancelled) {
        return;
      }

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      if (dragState || panState || miniMapDragging || isSubmitting) {
        return;
      }

      try {
        const latestDetail = await fetchCanvasWorkspace(detail.canvas.shareKey);

        if (cancelled) {
          return;
        }

        const nextSignature = buildCanvasSyncSignature(latestDetail);

        if (nextSignature === syncSignatureRef.current) {
          setIsLiveSyncing(true);
          return;
        }

        setNodes(latestDetail.nodes);
        setAssets(latestDetail.assets);
        setSelectedNodeId((currentSelectedNodeId) =>
          latestDetail.nodes.some((node) => node.id === currentSelectedNodeId)
            ? currentSelectedNodeId
            : latestDetail.nodes[0]?.id ?? "",
        );
        syncSignatureRef.current = nextSignature;
        setIsLiveSyncing(true);
      } catch {
        if (!cancelled) {
          setIsLiveSyncing(false);
        }
      }
    }

    void syncWorkspace();
    const interval = window.setInterval(() => {
      void syncWorkspace();
    }, LIVE_SYNC_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [detail, dragState, isSubmitting, miniMapDragging, panState]);

  useEffect(() => {
    async function keepPresenceAlive() {
      try {
        if (viewerMode === "authenticated") {
          await heartbeatCanvasPresence(detail.canvas.shareKey);
        }
      } catch {
        return;
      }
    }

    if (viewerMode !== "authenticated") {
      return;
    }

    void keepPresenceAlive();
    const interval = window.setInterval(() => {
      void keepPresenceAlive();
    }, PRESENCE_SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [detail.canvas.shareKey, viewerMode]);

  useEffect(() => {
    const surface = canvasSurfaceRef.current;

    if (!surface) {
      return;
    }

    const activeSurface = surface;

    function updateViewport() {
      setViewport({
        scrollLeft: activeSurface.scrollLeft,
        scrollTop: activeSurface.scrollTop,
        width: activeSurface.clientWidth,
        height: activeSurface.clientHeight,
      });
    }

    updateViewport();
    activeSurface.addEventListener("scroll", updateViewport, { passive: true });
    window.addEventListener("resize", updateViewport);

    return () => {
      activeSurface.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    const surface = canvasSurfaceRef.current;

    if (!surface || !rootNode || initializedViewportRef.current) {
      return;
    }

    const rootRenderX = rootNode.position.x + worldOffsetX;
    const rootRenderY = rootNode.position.y + worldOffsetY;

    surface.scrollTo({
      left: Math.max(0, rootRenderX * zoom - surface.clientWidth * 0.34),
      top: Math.max(0, rootRenderY * zoom - surface.clientHeight * 0.22),
    });
    initializedViewportRef.current = true;
  }, [rootNode, worldOffsetX, worldOffsetY, zoom]);

  useEffect(() => {
    if (!dragState) {
      return;
    }

    const activeDragState = dragState;
    const dragStartNode = nodesRef.current.find((node) => node.id === activeDragState.nodeId) ?? null;
    const dragParentNode = dragStartNode?.parentNodeId
      ? nodesRef.current.find((node) => node.id === dragStartNode.parentNodeId) ?? null
      : null;
    const minAllowedX = dragParentNode
      ? dragParentNode.position.x + NODE_WIDTH + MIN_CHILD_X_GAP
      : 60;
    const minAllowedY = 80 - worldOffsetY;

    function handlePointerMove(event: PointerEvent) {
      const pointer = getCanvasPointerPosition(event, canvasInnerRef.current, zoom);

      if (!pointer) {
        return;
      }

      event.preventDefault();
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === activeDragState.nodeId && dragStartNode
            ? (() => {
                const desiredX = pointer.x - worldOffsetX - activeDragState.offsetX;
                const desiredY = pointer.y - worldOffsetY - activeDragState.offsetY;
                const easedY =
                  dragStartNode.position.y +
                  (desiredY - dragStartNode.position.y) * VERTICAL_DRAG_FACTOR;

                return {
                  ...node,
                  position: {
                    x: Math.max(minAllowedX, desiredX),
                    y: Math.max(minAllowedY, easedY),
                  },
                };
              })()
            : node,
        ),
      );
    }

    async function handlePointerUp() {
      const movedNode = nodesRef.current.find((node) => node.id === activeDragState.nodeId);

      if (movedNode && viewerMode === "authenticated") {
        try {
          const result = await persistNodePosition(movedNode.id, movedNode.position);

          setNodes((currentNodes) =>
            currentNodes.map((node) => (node.id === result.node.id ? result.node : node)),
          );
        } catch (error) {
          setSubmitMessage(error instanceof Error ? error.message : "노드 위치를 저장하지 못했습니다.");
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
  }, [dragState, viewerMode, worldOffsetX, worldOffsetY, zoom]);

  useEffect(() => {
    if (!panState) {
      return;
    }

    const activePanState = panState;

    function handlePointerMove(event: PointerEvent) {
      const surface = canvasSurfaceRef.current;

      if (!surface) {
        return;
      }

      event.preventDefault();
      surface.scrollLeft =
        activePanState.startScrollLeft - (event.clientX - activePanState.startClientX);
      surface.scrollTop =
        activePanState.startScrollTop - (event.clientY - activePanState.startClientY);
    }

    function handlePointerUp() {
      setPanState(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [panState]);

  useEffect(() => {
    if (!miniMapDragging) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault();
      scrollViewportFromMinimap(
        event.clientX,
        event.clientY,
        canvasSurfaceRef.current,
        miniMapFrameRef.current,
        canvasWidth,
        canvasHeight,
        zoom,
      );
    }

    function handlePointerUp() {
      setMiniMapDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [miniMapDragging, canvasWidth, canvasHeight, zoom]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setControlsOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!selectedNode) {
    return (
      <main className={styles.page}>
        <section className={styles.workspace}>
          <div className={styles.emptyState}>
            <span className={styles.eyebrow}>Canvas workspace</span>
            <h1 className={styles.title}>{detail.canvas.title}</h1>
            <p className={styles.subtitle}>아직 이 캔버스에 노드가 없습니다.</p>
          </div>
        </section>
      </main>
    );
  }

  function clearDraftState() {
    setDraftTitle("");
    setDraftText("");
    setEndingChecked(false);
    setSelectedAssets([]);
  }

  function resetWritePanelState() {
    setWriteOpen(false);
    clearDraftState();
  }

  function handleSelect(node: CanvasWorkspaceNode) {
    if (node.id !== selectedNodeId) {
      clearDraftState();
    }

    setSelectedNodeId(node.id);
    setWriteOpen(false);
    setSubmitMessage(null);
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("[data-no-pan='true']")) {
      return;
    }

    const surface = canvasSurfaceRef.current;

    if (!surface) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanState({
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: surface.scrollLeft,
      startScrollTop: surface.scrollTop,
    });
  }

  function handleMiniMapPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    scrollViewportFromMinimap(
      event.clientX,
      event.clientY,
      canvasSurfaceRef.current,
      miniMapFrameRef.current,
      canvasWidth,
      canvasHeight,
      zoom,
    );
    setMiniMapDragging(true);
  }

  function handlePointerDown(node: CanvasWorkspaceNode, event: ReactPointerEvent<HTMLButtonElement>) {
    if (viewerMode !== "authenticated" || node.parentNodeId === null) {
      return;
    }

    const pointer = getCanvasPointerPosition(event.nativeEvent, canvasInnerRef.current, zoom);

    if (!pointer) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    if (node.id !== selectedNodeId) {
      clearDraftState();
    }

    setSelectedNodeId(node.id);
    setWriteOpen(false);
    setDragState({
      nodeId: node.id,
      offsetX: pointer.x - worldOffsetX - node.position.x,
      offsetY: pointer.y - worldOffsetY - node.position.y,
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

    if (!draftTitle.trim()) {
      setSubmitMessage("노드 제목을 입력해 주세요.");
      return;
    }

    if (!draftText.trim()) {
      setSubmitMessage("본문을 입력해 주세요.");
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
        title: draftTitle.trim(),
        content: draftText.trim(),
        position: nextPosition,
        imageAssetIds: selectedAssets.map((asset) => asset.id),
        isEnding: endingChecked,
      });
      const publishedNodeId = result.node.id;

      setNodes((currentNodes) => {
        const nextNodes = [...currentNodes, result.node];

        if (result.autoEndingNode) {
          nextNodes.push(result.autoEndingNode);
        }

        return nextNodes;
      });
      setAssets((currentAssets) => {
        const assetIds = new Set(selectedAssets.map((asset) => asset.id));

        return [
          ...currentAssets.filter((asset) => !assetIds.has(asset.id)),
          ...selectedAssets.map((asset) => ({
            ...asset,
            nodeId: publishedNodeId
          }))
        ];
      });

      setSelectedNodeId(result.autoEndingNode?.id ?? result.node.id);
      resetWritePanelState();
      setSubmitMessage(
        result.autoEndingNode
          ? "노드를 등록했고 분기가 최대 길이에 도달해 자동 엔딩이 추가되었습니다."
          : "노드를 등록했습니다.",
      );
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : "다음 노드를 등록하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleZoom(nextZoom: number) {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const surface = canvasSurfaceRef.current;

    if (!surface || clampedZoom === zoom) {
      setZoom(clampedZoom);
      return;
    }

    const centerWorldX = (surface.scrollLeft + surface.clientWidth / 2) / zoom;
    const centerWorldY = (surface.scrollTop + surface.clientHeight / 2) / zoom;

    setZoom(clampedZoom);

    window.requestAnimationFrame(() => {
      const nextLeft = centerWorldX * clampedZoom - surface.clientWidth / 2;
      const nextTop = centerWorldY * clampedZoom - surface.clientHeight / 2;

      surface.scrollTo({
        left: clamp(nextLeft, 0, Math.max(0, canvasWidth * clampedZoom - surface.clientWidth)),
        top: clamp(nextTop, 0, Math.max(0, canvasHeight * clampedZoom - surface.clientHeight)),
      });
    });
  }

  return (
    <main className={styles.page}>
      <section className={styles.workspace}>
        <div
          className={`${styles.canvasSurface} ${panState ? styles.canvasSurfacePanning : ""}`}
          ref={canvasSurfaceRef}
          onPointerDown={handleCanvasPointerDown}
        >
          <div
            className={styles.canvasScaler}
            style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}
          >
            <div
              className={styles.canvasInner}
              ref={canvasInnerRef}
              style={{
                width: canvasWidth,
                height: canvasHeight,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
            {forbiddenBoundaryX ? (
              <div className={styles.constraintZone} style={{ width: forbiddenBoundaryX }}>
                <div className={styles.constraintLabel}>
                  자식 노드는 부모보다 왼쪽으로 이동할 수 없습니다.
                </div>
              </div>
            ) : null}

            <svg className={styles.edgeLayer}>
              {nodes
                .filter((node) => node.parentNodeId)
                .map((node) => {
                  const source = nodes.find((candidate) => candidate.id === node.parentNodeId);

                  if (!source) {
                    return null;
                  }

                  const sourceX = source.position.x + worldOffsetX + NODE_WIDTH;
                  const sourceY = source.position.y + worldOffsetY + NODE_HEIGHT / 2;
                  const targetX = node.position.x + worldOffsetX;
                  const targetY = node.position.y + worldOffsetY + NODE_HEIGHT / 2;
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
                  data-no-pan="true"
                  onClick={() => handleSelect(node)}
                  onPointerDown={(event) => handlePointerDown(node, event)}
                  style={{
                    left: node.position.x + worldOffsetX,
                    top: node.position.y + worldOffsetY,
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
        </div>

        <aside className={styles.drawer}>
          <div className={styles.drawerContent} data-no-pan="true">
            <span className={styles.sectionLabel}>선택한 노드</span>
            <h2 className={styles.drawerTitle}>{getNodeHeading(selectedNode)}</h2>
            <div className={styles.drawerMetaStack}>
              <div className={styles.metaRow}>
                {getNodeTypeLabel(selectedNode)} · {formatNodeTimestamp(selectedNode.createdAt)}
              </div>
              <div className={styles.authorRow}>
                작성자 · {selectedNode.authorNickname?.trim() || "알 수 없음"}
              </div>
            </div>
            <div className={styles.metaRow}>
              {isLiveSyncing ? "실시간 동기화 중" : "실시간 동기화 재시도 중"}
            </div>
            {selectedNodeAssets.length > 0 ? (
              <div className={styles.drawerAssetGrid}>
                {selectedNodeAssets.map((asset, index) => (
                  <figure className={styles.drawerAssetCard} key={asset.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={asset.prompt?.trim() || `노드 이미지 ${index + 1}`}
                      className={styles.drawerAssetImage}
                      src={asset.url}
                    />
                  </figure>
                ))}
              </div>
            ) : null}
            <p className={styles.bodyCopy}>{selectedNode.content}</p>
            <div className={styles.drawerActions}>
              <div className={styles.buttonRow}>
                {selectedNode.isEnding ? (
                  <a className={styles.tertiaryButton} href={readHref ?? shareHref}>
                    리더로 보기
                  </a>
                ) : viewerMode === "authenticated" ? (
                  <button
                    className={styles.primaryButton}
                    onClick={() => setWriteOpen(true)}
                    type="button"
                  >
                    다음 노드 작성
                  </button>
                ) : (
                  <a className={styles.primaryButton} href={`/login?next=${encodeURIComponent(shareHref)}`}>
                    로그인하고 작성하기
                  </a>
                )}
              </div>
            </div>

            {submitMessage && !writeOpen ? <p className={styles.helperText}>{submitMessage}</p> : null}
          </div>
        </aside>

        <section className={styles.miniMap} data-no-pan="true">
          <div className={styles.miniMapChrome}>
            <div>
              <h2 className={styles.miniMapTitle}>미니맵</h2>
              <p className={styles.miniCaption}>클릭하거나 드래그해서 화면을 이동하세요.</p>
            </div>
            <div className={styles.miniMapZoom}>
              <button
                className={styles.zoomButton}
                disabled={zoom <= MIN_ZOOM}
                onClick={() => handleZoom(zoom - ZOOM_STEP)}
                type="button"
              >
                -
              </button>
              <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
              <button
                className={styles.zoomButton}
                disabled={zoom >= MAX_ZOOM}
                onClick={() => handleZoom(zoom + ZOOM_STEP)}
                type="button"
              >
                +
              </button>
            </div>
          </div>
          <div
            className={styles.miniMapFrame}
            onPointerDown={handleMiniMapPointerDown}
            ref={miniMapFrameRef}
          >
            {nodes.map((node) => (
              <div
                key={`mini-${node.id}`}
                className={styles.miniNode}
                style={{
                  left:
                    MINIMAP_PADDING_X +
                    ((node.position.x + worldOffsetX) / canvasWidth) * MINIMAP_WIDTH,
                  top:
                    MINIMAP_PADDING_Y +
                    ((node.position.y + worldOffsetY) / canvasHeight) * MINIMAP_HEIGHT,
                }}
              />
            ))}
            <div
              className={styles.miniViewport}
              style={{
                left: MINIMAP_PADDING_X + miniViewportLeft,
                top: MINIMAP_PADDING_Y + miniViewportTop,
                width: miniViewportWidth,
                height: miniViewportHeight,
              }}
            />
          </div>
        </section>

        <div className={styles.controlDock} data-no-pan="true">
          {controlsOpen ? (
            <div className={styles.controlPanel}>
              <div className={styles.controlHeader}>
                <div>
                  <span className={styles.sectionLabel}>캔버스 메뉴</span>
                  <h2 className={styles.controlTitle}>{detail.canvas.title}</h2>
                </div>
                <button
                  className={styles.controlToggle}
                  onClick={() => setControlsOpen(false)}
                  type="button"
                >
                  닫기
                </button>
              </div>

              <div className={styles.controlActions}>
                <button className={styles.pill} onClick={handleCopyLink} type="button">
                  {copied ? "링크 복사됨" : "공유 링크 복사"}
                </button>
                {readHref ? (
                  <a className={styles.primaryPill} href={readHref}>
                    분기 읽기
                  </a>
                ) : (
                  <span className={styles.statusPill}>엔딩 노드를 선택하면 리더를 열 수 있습니다.</span>
                )}
                <a className={`${styles.tertiaryButton} ${styles.controlHomeLink}`} href="/home">
                  홈으로
                </a>
              </div>
            </div>
          ) : null}

          <button
            className={styles.controlDockButton}
            onClick={() => setControlsOpen((current) => !current)}
            type="button"
          >
            {controlsOpen ? "메뉴 숨기기" : "메뉴 열기"}
          </button>
        </div>

        {writeOpen && viewerMode === "authenticated" ? (
          <div className={styles.composerOverlay} data-no-pan="true">
            <section className={styles.composerPanel}>
              <div className={styles.composerHeader}>
                <div>
                  <span className={styles.sectionLabel}>다음 노드 작성</span>
                  <h2 className={styles.composerTitle}>{getNodeHeading(selectedNode)}에서 이어쓰기</h2>
                </div>
              </div>

              <div className={styles.composerGrid}>
                <aside className={styles.composerSidebar}>
                  <label className={styles.fieldLabel}>부모 본문</label>
                  <div className={styles.contextBox}>{selectedNode.content}</div>
                  <label className={styles.fieldLabel}>이전 본문</label>
                  <div className={styles.contextBox}>
                    {previousNodes.length === 0 ? (
                      "이전 본문이 없습니다."
                    ) : (
                      previousNodes
                        .map((node, index) => `${index + 1}. ${node.content}`)
                        .join("\n\n")
                    )}
                  </div>
                </aside>

                <div className={styles.composerMain}>
                  <label className={styles.fieldLabel} htmlFor="story-title">
                    노드 제목
                  </label>
                  <input
                    className={styles.composerTitleInput}
                    id="story-title"
                    maxLength={60}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder="이 분기의 제목을 입력하세요"
                    value={draftTitle}
                  />

                  <label className={styles.fieldLabel} htmlFor="story-draft">
                    본문
                  </label>
                  <textarea
                    className={styles.composerTextarea}
                    id="story-draft"
                    onChange={(event) => setDraftText(event.target.value)}
                    placeholder="선택한 노드에서 이야기를 이어 써 주세요"
                    value={draftText}
                  />

                  <MediaPicker
                    baseNodeId={selectedNode.id}
                    canvasId={detail.canvas.id}
                    disabled={isSubmitting}
                    maxAssets={1}
                    onChange={setSelectedAssets}
                    selectedAssets={selectedAssets}
                  />

                  <div className={styles.inlineTools}>
                    <label className={styles.checkboxRow}>
                      <input
                        checked={endingChecked}
                        onChange={(event) => setEndingChecked(event.target.checked)}
                        type="checkbox"
                      />
                      이 노드를 엔딩으로 표시
                    </label>
                  </div>

                  <p className={styles.helperText}>
                    이미지는 발행 전까지 현재 작성 중인 초안에만 연결됩니다.
                  </p>
                </div>
              </div>

              <div className={styles.composerFooter}>
                <span className={styles.helperText}>
                  {submitMessage ?? "내용을 확인한 뒤 등록하세요."}
                </span>
                <div className={styles.buttonRow}>
                  <button className={styles.secondaryButton} onClick={resetWritePanelState} type="button">
                    취소
                  </button>
                  <button
                    className={styles.primaryButton}
                    disabled={isSubmitting}
                    onClick={handlePublish}
                    type="button"
                  >
                    {isSubmitting ? "등록 중..." : "등록하기"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function getCanvasPointerPosition(
  event: PointerEvent,
  canvasInner: HTMLDivElement | null,
  zoom: number,
) {
  if (!canvasInner) {
    return null;
  }

  const rect = canvasInner.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) / zoom,
    y: (event.clientY - rect.top) / zoom,
  };
}

function getNodeHeading(node: CanvasWorkspaceNode) {
  if (node.parentNodeId === null) {
    return "루트 노드";
  }

  if (node.title?.trim()) {
    return node.title.trim();
  }

  if (node.isEnding && node.endingType === "auto-max-depth") {
    return "자동 엔딩";
  }

  if (node.isEnding) {
    return "엔딩 노드";
  }

  return "스토리 노드";
}

function getNodeTypeLabel(node: CanvasWorkspaceNode) {
  if (node.parentNodeId === null) {
    return "루트";
  }

  if (node.isEnding && node.endingType === "auto-max-depth") {
    return "자동 엔딩";
  }

  if (node.isEnding) {
    return "엔딩";
  }

  return "분기";
}

function getExcerpt(content: string) {
  return content.length > 96 ? `${content.slice(0, 96)}...` : content;
}

function formatNodeTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getContentBounds(nodes: CanvasWorkspaceNode[]) {
  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: NODE_WIDTH,
      maxY: NODE_HEIGHT,
    };
  }

  return nodes.reduce(
    (bounds, node) => ({
      minX: Math.min(bounds.minX, node.position.x),
      minY: Math.min(bounds.minY, node.position.y),
      maxX: Math.max(bounds.maxX, node.position.x + NODE_WIDTH),
      maxY: Math.max(bounds.maxY, node.position.y + NODE_HEIGHT),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function scrollViewportFromMinimap(
  clientX: number,
  clientY: number,
  surface: HTMLDivElement | null,
  frame: HTMLDivElement | null,
  canvasWidth: number,
  canvasHeight: number,
  zoom: number,
) {
  if (!surface || !frame) {
    return;
  }

  const rect = frame.getBoundingClientRect();
  const localX = clamp(clientX - rect.left - MINIMAP_PADDING_X, 0, MINIMAP_WIDTH);
  const localY = clamp(clientY - rect.top - MINIMAP_PADDING_Y, 0, MINIMAP_HEIGHT);
  const targetLeft = (localX / MINIMAP_WIDTH) * canvasWidth * zoom - surface.clientWidth / 2;
  const targetTop = (localY / MINIMAP_HEIGHT) * canvasHeight * zoom - surface.clientHeight / 2;

  surface.scrollTo({
    left: clamp(targetLeft, 0, Math.max(0, canvasWidth * zoom - surface.clientWidth)),
    top: clamp(targetTop, 0, Math.max(0, canvasHeight * zoom - surface.clientHeight)),
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildCanvasSyncSignature(detail: CanvasWorkspaceData) {
  const nodeSignature = detail.nodes
    .map((node) => `${node.id}:${node.updatedAt}:${node.position.x}:${node.position.y}`)
    .join("|");
  const assetSignature = detail.assets
    .map((asset) => `${asset.id}:${asset.updatedAt}:${asset.nodeId ?? ""}`)
    .join("|");

  return `${detail.canvas.updatedAt}::${nodeSignature}::${assetSignature}`;
}
