import type {
  ActivityAction,
  ActivityEntityType,
  AssetKind,
  BookingStatus,
  BudgetCategory,
  BudgetStatus,
  ChatRoomType,
  CheckinStatus,
  DepartmentScope,
  EmploymentType,
  EquipmentCategory,
  EquipmentCondition,
  FanpageSyncSource,
  LeaveStatus,
  LeaveType,
  ResourceCategory,
  ResourceScope,
  TaskPriority,
  TaskStatus,
  TaskType,
  TimelineStatus,
  UserRole,
} from "@/generated/prisma/client";

export interface SimpleUser {
  id: string;
  name: string;
  email?: string;
  role?: UserRole;
  departmentScope: DepartmentScope;
  employmentType?: EmploymentType;
  title: string;
  avatarColor: string;
  pirateCharacter?: string | null;
  preferredTone?: string;
  preferredIcon?: string | null;
  personalMotto?: string | null;
  birthDate?: string | null;
  weeklyImageLimit?: number | null;
  dailyVideoLimit?: number | null;
  dailyKpiJson?: unknown;
  isActive?: boolean;
}

export interface SimpleProject {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  channelSummary?: string | null;
  weeklySocialTarget?: number;
  weeklyAdsTarget?: number;
  weeklyVideoTarget?: number;
  weeklyImageTarget?: number;
  kpiNote?: string | null;
  color: string;
  campaignStartAt?: string | Date | null;
  campaignEndAt?: string | Date | null;
  campaignWeeks?: number;
  contentPillarsJson?: unknown;
  overviewJson?: unknown;
  contentMatrixJson?: unknown;
}

export interface AssetLinkItem {
  id: string;
  kind: AssetKind;
  label: string;
  url: string;
  version: number;
  createdAt: string | Date;
  createdBy?: { id: string; name: string };
}

export interface TaskCommentItem {
  id: string;
  content: string;
  qcFlagsJson?: unknown;
  createdAt: string | Date;
  author: {
    id: string;
    name: string;
    role: UserRole;
    avatarColor: string;
    pirateCharacter?: string | null;
  };
}

export interface TaskItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  caption: string | null;
  platform: string;
  publishChannel?: string | null;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  isMediaOrder: boolean;
  quantity: number;
  isRushOrder: boolean;
  isOutsideDepartment: boolean;
  revisionCount: number;
  maxRevisions: number;
  scheduledPublishAt: string | Date | null;
  dueAt: string | Date | null;
  submittedAt: string | Date | null;
  approvedAt: string | Date | null;
  completedAt: string | Date | null;
  wasLate: boolean;
  qcChecklistJson?: unknown;
  subtasksJson?: unknown;
  mediaBriefItemsJson?: unknown;
  contentPillar?: string | null;
  campaignWeek?: number | null;
  contentAngle?: string | null;
  postFormat?: string | null;
  mediaDueAt?: string | Date | null;
  productLink?: string | null;
  isAired?: boolean;
  matrixIdeaId?: string | null;
  fbPostLayout?: string;
  proposedBriefDueAt?: string | Date | null;
  proposedPublishAt?: string | Date | null;
  timelineNote?: string | null;
  timelineStatus?: TimelineStatus;
  timelineSubmittedAt?: string | Date | null;
  externalSenderName?: string | null;
  externalDepartment?: string | null;
  externalContact?: string | null;
  dailyKpiKey?: string | null;
  lastAiQcJson?: unknown;
  lastAiQcAt?: string | Date | null;
  deletedAt?: string | Date | null;
  createdAt: string | Date;
  project: {
    id: string;
    slug: string;
    name: string;
    color: string;
  };
  assignee: {
    id: string;
    name: string;
    title: string;
    avatarColor: string;
    pirateCharacter?: string | null;
    departmentScope: DepartmentScope;
  } | null;
  requester: {
    id: string;
    name: string;
    title: string;
    avatarColor: string;
    pirateCharacter?: string | null;
  };
  reviewer?: { id: string; name: string } | null;
  assets: AssetLinkItem[];
  comments?: TaskCommentItem[];
  activityLogs?: ActivityLogItem[];
  _count?: { comments: number; activityLogs?: number };
}

export interface ActivityLogItem {
  id: string;
  entityType: ActivityEntityType;
  entityId: string;
  taskId?: string | null;
  action: ActivityAction;
  summary: string;
  changesJson?: Array<{
    field: string;
    label: string;
    before: string;
    after: string;
  }> | null;
  createdAt: string | Date;
  actor?: {
    id: string;
    name: string;
    avatarColor: string;
    pirateCharacter?: string | null;
  } | null;
}

export interface MotivationalQuoteItem {
  id: string;
  content: string;
  authorLabel: string;
  tone: string;
  isPinned: boolean;
  likes: number;
  createdAt: string | Date;
  createdBy?: { id: string; name: string } | null;
}

export interface LeaveRequestItem {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  createdAt: string | Date;
  user: {
    id: string;
    name: string;
    title: string;
    avatarColor: string;
    pirateCharacter?: string | null;
    departmentScope: DepartmentScope;
  };
  reviewedBy?: { id: string; name: string } | null;
}

export interface TeamMeetingParticipantItem {
  id: string;
  userId: string;
  rsvp: string;
  user: {
    id: string;
    name: string;
    title: string;
    avatarColor: string;
    pirateCharacter?: string | null;
    departmentScope: DepartmentScope;
  };
}

export interface TeamMeetingItem {
  id: string;
  title: string;
  agenda: string | null;
  location: string | null;
  meetingType: string;
  startAt: string | Date;
  endAt: string | Date;
  projectId: string | null;
  organizerId: string;
  status: string;
  createdAt: string | Date;
  organizer: {
    id: string;
    name: string;
    avatarColor: string;
    pirateCharacter?: string | null;
  };
  project?: {
    id: string;
    slug: string;
    name: string;
    color: string;
  } | null;
  participants: TeamMeetingParticipantItem[];
}

export interface BirthdayMemberInfo {
  id: string;
  name: string;
  title: string;
  avatarColor: string;
  pirateCharacter?: string | null;
  departmentScope: DepartmentScope;
  birthDate: string;
  displayDayMonth: string;
  daysUntil: number;
  turningAge: number | null;
}

export interface EquipmentItemType {
  id: string;
  name: string;
  category: EquipmentCategory;
  code: string;
  description: string | null;
  status: EquipmentCondition;
}

export interface EquipmentBookingItem {
  id: string;
  equipmentId: string;
  userId: string;
  projectId: string | null;
  purpose: string;
  startAt: string | Date;
  endAt: string | Date;
  status: BookingStatus;
  createdAt: string | Date;
  equipment: EquipmentItemType;
  user: {
    id: string;
    name: string;
    avatarColor: string;
    pirateCharacter?: string | null;
  };
  project?: {
    id: string;
    slug: string;
    name: string;
    color: string;
  } | null;
}

export interface WorkspaceResourceItem {
  id: string;
  scope: ResourceScope;
  projectId: string | null;
  category: ResourceCategory;
  title: string;
  url: string;
  description: string | null;
  tags: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  project?: {
    id: string;
    slug: string;
    name: string;
    color: string;
  } | null;
  updatedBy?: { id: string; name: string } | null;
}

export interface FanpageSnapshotItem {
  id: string;
  channelId: string;
  capturedAt: string | Date;
  weekStart: string;
  monthKey: string;
  followers: number;
  followersDelta: number;
  newFollowers?: number;
  unfollows?: number;
  reach: number;
  impressions: number;
  pageViews?: number;
  videoViews?: number;
  linkClicks?: number;
  inboxMessages?: number;
  engagement: number;
  engagementRate?: number;
  reactions: number;
  comments: number;
  shares: number;
  postsCount: number;
  topPostTitle: string | null;
  topPostUrl: string | null;
  topPostReach: number;
  topPostEngagement: number;
  topPostsJson?: unknown;
  source: FanpageSyncSource;
  sentToLeaderAt: string | Date | null;
  notes: string | null;
  syncedBy?: { id: string; name: string } | null;
}

export interface FanpageChannelItem {
  id: string;
  name: string;
  pageId: string | null;
  pageUrl: string;
  hasAccessToken?: boolean;
  projectId: string | null;
  managedById: string | null;
  followers: number;
  likesCount: number;
  lastSyncedAt: string | Date | null;
  lastSyncStatus: string | null;
  lastSyncNote: string | null;
  isActive: boolean;
  project?: {
    id: string;
    slug: string;
    name: string;
    color: string;
  } | null;
  managedBy?: {
    id: string;
    name: string;
    avatarColor: string;
    pirateCharacter?: string | null;
  } | null;
  snapshots?: FanpageSnapshotItem[];
}

export interface CapacityItem {
  userId: string;
  name: string;
  title: string;
  departmentScope: string;
  employmentType: string;
  avatarColor: string;
  pirateCharacter?: string | null;
  periodLabel: string;
  used: number;
  limit: number | null;
  unit: string;
  utilizationPercent: number;
  status: "AVAILABLE" | "NEAR_LIMIT" | "FULL";
  activeTasksCount: number;
}

export interface CheckinItem {
  id: string;
  checkinDate: string;
  status: CheckinStatus;
  note: string | null;
  createdAt: string | Date;
  user: {
    id: string;
    name: string;
    title: string;
    avatarColor: string;
    pirateCharacter?: string | null;
    departmentScope: DepartmentScope;
  };
  task?: { id: string; code: string; title: string } | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  emailSent: boolean;
  createdAt: string | Date;
}

export interface BudgetItem {
  id: string;
  code: string;
  title: string;
  category: BudgetCategory;
  amount: number;
  neededBy: string | Date | null;
  note: string | null;
  status: BudgetStatus;
  reviewNote: string | null;
  createdAt: string | Date;
  project: { id: string; name: string; slug: string; color: string };
  requester: {
    id: string;
    name: string;
    avatarColor: string;
    pirateCharacter?: string | null;
  };
  reviewer: { id: string; name: string } | null;
}

export interface ChatParticipantUser {
  id: string;
  name: string;
  title: string;
  avatarColor: string;
  pirateCharacter?: string | null;
  departmentScope: DepartmentScope;
}

export interface ChatMessageItem {
  id: string;
  roomId: string;
  content: string;
  isAnonymous: boolean;
  anonymousAlias: string | null;
  attachmentUrl: string | null;
  isDeleted: boolean;
  isMine: boolean;
  createdAt: string;
  sender: ChatParticipantUser | null;
}

export interface ChatRoomSummary {
  id: string;
  type: ChatRoomType;
  name: string | null;
  description: string | null;
  allowAnonymous: boolean;
  isPinned: boolean;
  createdById: string;
  lastMessageAt: string;
  unreadCount: number;
  participants: {
    userId: string;
    isAdmin: boolean;
    user: ChatParticipantUser;
  }[];
  lastMessage: ChatMessageItem | null;
}

export interface ProjectChannelSuggestions {
  fanpages: string[];
  tiktoks: string[];
  websites: string[];
  others: string[];
}
