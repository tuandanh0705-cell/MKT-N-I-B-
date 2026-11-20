import { prisma } from "@/lib/prisma";
import { buildProjectVisibilityWhere } from "@/lib/permissions";
import type { AuthUser } from "@/lib/auth";
import type {
  KnowledgeCourseItem,
  KnowledgeProgressItem,
  KnowledgeTeamMember,
} from "@/lib/knowledge";

export const KNOWLEDGE_COURSE_INCLUDE = {
  project: {
    select: { id: true, slug: true, name: true, color: true },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      role: true,
      avatarColor: true,
      pirateCharacter: true,
      departmentScope: true,
    },
  },
  lessons: {
    orderBy: [{ orderIndex: "asc" as const }, { createdAt: "asc" as const }],
  },
};

/** Tạo 3 khóa học nền tảng mẫu khi DB chưa có dữ liệu kiến thức nào. */
async function ensureStarterKnowledgeCourses(fallbackAuthorId: string) {
  const existingCount = await prisma.knowledgeCourse.count();
  if (existingCount > 0) return;

  const leader = await prisma.user.findFirst({
    where: { role: "LEADER", isActive: true },
    select: { id: true },
  });
  const authorId = leader?.id ?? fallbackAuthorId;

  await prisma.$transaction([
    prisma.knowledgeCourse.create({
      data: {
        title: "Quy chuẩn viết Content Social & Hook 3 giây Meta Ecom",
        description:
          "Lộ trình chuẩn cho đội Content: cấu trúc Hook - Body - CTA, cách viết giữ chân người đọc và tối ưu tỷ lệ click/inbox.",
        courseUrl: "https://docs.google.com",
        trackType: "OFFICIAL",
        category: "CONTENT",
        targetDepartment: "CONTENT",
        isMandatory: true,
        isPinned: true,
        estimatedMinutes: 60,
        createdById: authorId,
        lessons: {
          create: [
            {
              orderIndex: 0,
              title: "Bài 1: 7 công thức viết Hook đánh trúng Insight khách hàng",
              lessonUrl: "https://docs.google.com",
              summary:
                "Cách rút ngắn 2 dòng mở đầu để kích thích bấm Xem thêm trên mobile.",
              durationMinutes: 20,
            },
            {
              orderIndex: 1,
              title: "Bài 2: Cấu trúc thân bài giải thích lợi ích & xử lý từ chối",
              lessonUrl: "https://docs.google.com",
              summary:
                "Phân biệt viết kể chuyện (Storytelling) vs bán hàng trực diện (Sales).",
              durationMinutes: 20,
            },
            {
              orderIndex: 2,
              title: "Bài 3: Checklist rà soát chính tả & chính sách từ cấm FB Ads",
              lessonUrl: "https://docs.google.com",
              summary:
                "Danh sách từ khóa cần tránh trước khi gửi bài lên Leader duyệt.",
              durationMinutes: 20,
            },
          ],
        },
      },
    }),
    prisma.knowledgeCourse.create({
      data: {
        title: "Thiết kế Ấn phẩm Ảnh & Safe Zone cho Facebook / TikTok",
        description:
          "Tài liệu thực chiến cho Design & Content Design về bố cục chữ, tỷ lệ ảnh 1:1 / 4:5 và vùng an toàn khi chạy Ads.",
        courseUrl: "https://www.canva.com",
        trackType: "OFFICIAL",
        category: "MEDIA_DESIGN",
        targetDepartment: "MEDIA_DESIGN",
        isMandatory: true,
        isPinned: false,
        estimatedMinutes: 45,
        createdById: authorId,
        lessons: {
          create: [
            {
              orderIndex: 0,
              title: "Bài 1: Tỷ lệ vàng phân cấp Typography trên ảnh Social",
              lessonUrl: "https://www.canva.com",
              summary:
                "Headline dễ đọc trong 1 giây, contrast giữa chữ và nền ảnh.",
              durationMinutes: 25,
            },
            {
              orderIndex: 1,
              title: "Bài 2: Safe Zone gắn Logo & tuân thủ quy tắc 20% text",
              lessonUrl: "https://www.canva.com",
              summary:
                "Tránh bị che chữ ở góc dưới hoặc cắt khung khi Facebook hiển thị feed.",
              durationMinutes: 20,
            },
          ],
        },
      },
    }),
    prisma.knowledgeCourse.create({
      data: {
        title: "Ứng dụng AI vào nghiên cứu đối thủ & nhân bản ý tưởng Content",
        description:
          "Tổng hợp prompt mẫu & workflow dùng AI tăng tốc nghiên cứu góc tiếp cận bài viết và kịch bản video ngắn.",
        courseUrl: "https://www.youtube.com",
        trackType: "OFFICIAL",
        category: "AI_AUTOMATION",
        targetDepartment: null,
        isMandatory: false,
        isPinned: false,
        estimatedMinutes: 40,
        createdById: authorId,
        lessons: {
          create: [
            {
              orderIndex: 0,
              title: "Bài 1: Phân tích tệp bình luận để tìm Pain Point thật",
              lessonUrl: "https://www.youtube.com",
              summary:
                "Biến feedback thực tế thành ma trận 3 tuyến Educate / Pain-Solution / Offer.",
              durationMinutes: 20,
            },
            {
              orderIndex: 1,
              title: "Bài 2: Kiểm tra lỗi logic & giọng văn bằng AI Check QC",
              lessonUrl: "https://www.youtube.com",
              summary:
                "Tự soi lại caption và ảnh demo trước khi nộp trên CRM.",
              durationMinutes: 20,
            },
          ],
        },
      },
    }),
  ]);
}

export async function getKnowledgeWorkspaceData(user: AuthUser) {
  await ensureStarterKnowledgeCourses(user.id);
  const isLeader = user.role === "LEADER";

  const [courses, myProgresses, projects, teamMembers, teamProgresses] =
    await Promise.all([
      prisma.knowledgeCourse.findMany({
        orderBy: [
          { isPinned: "desc" },
          { isMandatory: "desc" },
          { createdAt: "desc" },
        ],
        include: KNOWLEDGE_COURSE_INCLUDE,
      }),
      prisma.knowledgeLessonProgress.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.project.findMany({
        where: buildProjectVisibilityWhere(user),
        orderBy: { createdAt: "asc" },
        select: { id: true, slug: true, name: true, color: true },
      }),
      isLeader
        ? prisma.user.findMany({
            where: { isActive: true },
            orderBy: [{ role: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              role: true,
              departmentScope: true,
              avatarColor: true,
              pirateCharacter: true,
            },
          })
        : Promise.resolve([]),
      isLeader
        ? prisma.knowledgeLessonProgress.findMany({
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

  return {
    courses: courses as unknown as KnowledgeCourseItem[],
    myProgresses: myProgresses as unknown as KnowledgeProgressItem[],
    projects,
    teamMembers: teamMembers as KnowledgeTeamMember[],
    teamProgresses: teamProgresses as unknown as KnowledgeProgressItem[],
  };
}

export interface PendingMandatoryCourseSummary {
  id: string;
  title: string;
  completedLessons: number;
  totalLessons: number;
  percent: number;
}

/** Lấy danh sách khóa bắt buộc chưa học xong của 1 thành viên để nhắc trên /my-work. */
export async function getUserPendingMandatoryCourses(
  user: Pick<AuthUser, "id" | "departmentScope">
): Promise<PendingMandatoryCourseSummary[]> {
  await ensureStarterKnowledgeCourses(user.id);

  const [mandatoryCourses, userProgresses] = await Promise.all([
    prisma.knowledgeCourse.findMany({
      where: {
        isMandatory: true,
        OR: [
          { targetDepartment: null },
          { targetDepartment: user.departmentScope },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        lessons: { select: { id: true } },
      },
    }),
    prisma.knowledgeLessonProgress.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      select: { lessonId: true },
    }),
  ]);

  const completedIds = new Set(userProgresses.map((p) => p.lessonId));
  const pending: PendingMandatoryCourseSummary[] = [];

  for (const c of mandatoryCourses) {
    const totalLessons = c.lessons.length;
    if (totalLessons === 0) continue;
    const completedLessons = c.lessons.filter((l) =>
      completedIds.has(l.id)
    ).length;
    if (completedLessons < totalLessons) {
      pending.push({
        id: c.id,
        title: c.title,
        completedLessons,
        totalLessons,
        percent: Math.round((completedLessons / totalLessons) * 100),
      });
    }
  }

  return pending;
}

export interface LeaderLearningOverview {
  mandatoryCoursesCount: number;
  membersCount: number;
  membersCompletedAllCount: number;
  overallMandatoryPercent: number;
}

/** Tổng hợp nhanh tiến độ khóa bắt buộc của team để hiển thị trên Boong Thuyền Trưởng (/leader). */
export async function getLeaderLearningOverview(
  actorId: string
): Promise<LeaderLearningOverview> {
  await ensureStarterKnowledgeCourses(actorId);

  const [mandatoryCourses, activeMembers, completedProgresses] =
    await Promise.all([
      prisma.knowledgeCourse.findMany({
        where: { isMandatory: true },
        select: {
          id: true,
          targetDepartment: true,
          lessons: { select: { id: true } },
        },
      }),
      prisma.user.findMany({
        where: { isActive: true, role: "MEMBER" },
        select: { id: true, departmentScope: true },
      }),
      prisma.knowledgeLessonProgress.findMany({
        where: { status: "COMPLETED" },
        select: { userId: true, lessonId: true },
      }),
    ]);

  if (mandatoryCourses.length === 0 || activeMembers.length === 0) {
    return {
      mandatoryCoursesCount: mandatoryCourses.length,
      membersCount: activeMembers.length,
      membersCompletedAllCount: activeMembers.length,
      overallMandatoryPercent: 100,
    };
  }

  const doneByUser = new Map<string, Set<string>>();
  for (const p of completedProgresses) {
    let set = doneByUser.get(p.userId);
    if (!set) {
      set = new Set<string>();
      doneByUser.set(p.userId, set);
    }
    set.add(p.lessonId);
  }

  let membersCompletedAllCount = 0;
  let totalExpectedLessons = 0;
  let totalCompletedLessons = 0;

  for (const m of activeMembers) {
    const userDone = doneByUser.get(m.id) ?? new Set<string>();
    const applicable = mandatoryCourses.filter(
      (c) => !c.targetDepartment || c.targetDepartment === m.departmentScope
    );
    let memberDoneAll = true;
    for (const c of applicable) {
      totalExpectedLessons += c.lessons.length;
      const doneInCourse = c.lessons.filter((l) => userDone.has(l.id)).length;
      totalCompletedLessons += doneInCourse;
      if (doneInCourse < c.lessons.length) memberDoneAll = false;
    }
    if (memberDoneAll) membersCompletedAllCount += 1;
  }

  return {
    mandatoryCoursesCount: mandatoryCourses.length,
    membersCount: activeMembers.length,
    membersCompletedAllCount,
    overallMandatoryPercent:
      totalExpectedLessons > 0
        ? Math.round((totalCompletedLessons / totalExpectedLessons) * 100)
        : 100,
  };
}
