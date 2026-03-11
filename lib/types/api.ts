import type { AuthSession, AuthUser } from "@/lib/types/auth";
import type {
  Canvas,
  CanvasDetail,
  Node,
  NodePosition,
  ParticipatedCanvas,
  ReaderBranchContent
} from "@/lib/types/domain";

export type SignupRequest = {
  email: string;
  password: string;
  nickname?: string;
  name?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: AuthUser;
  session: AuthSession;
};

export type CreateCanvasRequest = {
  title: string;
  rootContent: string;
  maxUserNodesPerBranch?: number;
  rootPosition?: NodePosition;
};

export type CreateCanvasResponse = {
  canvas: Canvas;
  rootNode: Node;
  autoEndingNode: Node | null;
};

export type CanvasesMeResponse = {
  viewer: AuthSession;
  canvases: ParticipatedCanvas[];
};

export type CanvasDetailResponse = CanvasDetail;

export type CreateNodeRequest = {
  canvasId: string;
  parentNodeId: string;
  title: string;
  content: string;
  position: NodePosition;
  imageAssetIds?: string[];
  isEnding?: boolean;
};

export type CreateNodeResponse = {
  node: Node;
  autoEndingNode: Node | null;
};

export type UpdateNodePositionRequest = {
  position: NodePosition;
};

export type UpdateNodePositionResponse = {
  node: Node;
};

export type ReaderBranchResponse = {
  branch: ReaderBranchContent;
};

export type CollaboratorPresence = {
  userId: string;
  nickname: string;
  lastSeenAt: string;
  isCurrentUser: boolean;
};

export type CanvasPresenceResponse = {
  collaborators: CollaboratorPresence[];
};
