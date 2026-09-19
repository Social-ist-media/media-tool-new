export const PLATFORM_IDS = [
  "twitter",
  "threads",
  "bluesky",
  "mastodon",
  "instagram",
  "linkedin",
  "facebook",
  "youtube",
  "tiktok",
  "reddit",
  "pinterest",
  "telegram",
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export type ConnectionStatus = "active" | "expired" | "error";
export type PublishStatus = "pending" | "success" | "failed" | "cancelled";
export type InboxKind = "mention" | "reply" | "dm" | "like";
export type ThemeMode = "dark" | "light";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type TeamRole = "admin" | "member" | "analyst";

export interface Profile {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  theme: ThemeMode;
  timezone: string;
}

export interface Connection {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  instance: string;
  status: ConnectionStatus;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  platform: PlatformId;
  authorHandle: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  mediaUrls: string[];
  likeCount: number;
  repostCount: number;
  replyCount: number;
  liked: boolean;
  bookmarked: boolean;
  isOwn: boolean;
  postedAt: string;
}

export interface PublishTargetResult {
  platform: PlatformId;
  status: PublishStatus;
  externalId: string;
  error: string;
  latencyMs: number;
}

export interface PublishHistoryItem {
  id: string;
  content: string;
  mediaUrls: string[];
  scheduledAt: string | null;
  createdAt: string;
  firstComment: string;
  utm: string;
  targets: PublishTargetResult[];
}

export interface InboxItem {
  id: string;
  platform: PlatformId;
  kind: InboxKind;
  fromHandle: string;
  fromName: string;
  fromAvatar: string;
  content: string;
  read: boolean;
  createdAt: string;
  replies: InboxReply[];
}

export interface InboxReply {
  id: string;
  content: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AnalyticsRow {
  platform: PlatformId;
  name: string;
  attempts: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgLatencyMs: number;
}

export interface Draft {
  id: string;
  content: string;
  mediaUrls: string[];
  platforms: PlatformId[];
  firstComment: string;
  utm: string;
  scheduledAt: string | null;
  updatedAt: string;
}

export interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface CannedReply {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  mime: string;
  dataUrl: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  lastStatus: number;
  createdAt: string;
}

export interface ApprovalItem {
  id: string;
  content: string;
  platforms: PlatformId[];
  mediaUrls: string[];
  scheduledAt: string | null;
  status: ApprovalStatus;
  reviewerNote: string;
  createdAt: string;
}

export interface BestTimeCell {
  weekday: number;
  hour: number;
  score: number;
}

export interface DashboardData {
  connections: Connection[];
  stats: {
    connectionsCount: number;
    totalFeedPosts: number;
    ownPosts: number;
    publishJobs: number;
    crossPosts: number;
    crossPostSuccessRate: number;
    crossPostFailed: number;
    totalLikes: number;
    totalReposts: number;
    totalReplies: number;
    unreadInbox: number;
    pendingApprovals: number;
    unreadNotifications: number;
    draftCount: number;
  };
  platforms: Array<{
    platform: PlatformId;
    name: string;
    charLimit: number;
    connected: boolean;
  }>;
}
