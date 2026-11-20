import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getVnDateString, getVnWeekBounds } from "../src/lib/dates";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Đang khởi tạo dữ liệu mẫu Meta Ecom Team MKT...");

  const defaultPasswordHash = await bcrypt.hash("123456", 10);

  // 1. Tạo tài khoản Leader & 8 Nhân sự theo đúng tab "Sơ đồ + Scope nhân sự"
  const usersData = [
    {
      email: "huong.leader@metaecom.vn",
      name: "Hương",
      role: "LEADER" as const,
      departmentScope: "LEADER" as const,
      employmentType: "FULL_TIME" as const,
      title: "Marketing Leader",
      avatarColor: "#0f172a",
      weeklyImageLimit: null,
      dailyVideoLimit: null,
    },
    {
      email: "lam@metaecom.vn",
      name: "Lâm",
      role: "MEMBER" as const,
      departmentScope: "CONTENT_DESIGN" as const,
      employmentType: "FULL_TIME" as const,
      title: "Content Marketing + Design",
      avatarColor: "#2563eb",
      weeklyImageLimit: null,
      dailyVideoLimit: null,
    },
    {
      email: "thao@metaecom.vn",
      name: "Thảo",
      role: "MEMBER" as const,
      departmentScope: "CONTENT" as const,
      employmentType: "PART_TIME" as const,
      title: "Content (Olympic AI)",
      avatarColor: "#7c3aed",
      weeklyImageLimit: null,
      dailyVideoLimit: null,
    },
    {
      email: "vy@metaecom.vn",
      name: "Vy",
      role: "MEMBER" as const,
      departmentScope: "CONTENT_EDIT" as const,
      employmentType: "PART_TIME" as const,
      title: "Content + Edit (Livestream)",
      avatarColor: "#db2777",
      weeklyImageLimit: null,
      dailyVideoLimit: null,
    },
    {
      email: "canh@metaecom.vn",
      name: "Cảnh",
      role: "MEMBER" as const,
      departmentScope: "CONTENT_EDIT" as const,
      employmentType: "PART_TIME" as const,
      title: "Content + Edit (Livestream)",
      avatarColor: "#0891b2",
      weeklyImageLimit: null,
      dailyVideoLimit: null,
    },
    {
      email: "tuan.web@metaecom.vn",
      name: "Tuns",
      role: "MEMBER" as const,
      departmentScope: "WEB_ADS" as const,
      employmentType: "FULL_TIME" as const,
      title: "WEB + AI + ADS",
      avatarColor: "#059669",
      weeklyImageLimit: null,
      dailyVideoLimit: null,
    },
    {
      email: "tuan.support@metaecom.vn",
      name: "Tuấn 2k8",
      role: "MEMBER" as const,
      departmentScope: "SUPPORT" as const,
      employmentType: "PART_TIME" as const,
      title: "Support / Seeding",
      avatarColor: "#65a30d",
      weeklyImageLimit: null,
      dailyVideoLimit: null,
    },
    {
      email: "hoang@metaecom.vn",
      name: "Hoàng",
      role: "MEMBER" as const,
      departmentScope: "MEDIA_VIDEO" as const,
      employmentType: "FULL_TIME" as const,
      title: "Edit / Quay dựng (Max 2 video/ngày)",
      avatarColor: "#ea580c",
      weeklyImageLimit: null,
      dailyVideoLimit: 2,
    },
    {
      email: "mai@metaecom.vn",
      name: "Mai",
      role: "MEMBER" as const,
      departmentScope: "MEDIA_DESIGN" as const,
      employmentType: "FULL_TIME" as const,
      title: "Design (Max 16 ảnh/tuần)",
      avatarColor: "#e11d48",
      weeklyImageLimit: 16,
      dailyVideoLimit: null,
    },
  ];

  const usersByEmail: Record<string, { id: string; name: string }> = {};
  for (const u of usersData) {
    const saved = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        departmentScope: u.departmentScope,
        employmentType: u.employmentType,
        title: u.title,
        avatarColor: u.avatarColor,
        weeklyImageLimit: u.weeklyImageLimit,
        dailyVideoLimit: u.dailyVideoLimit,
        isActive: true,
      },
      create: {
        ...u,
        passwordHash: defaultPasswordHash,
      },
      select: { id: true, name: true, email: true },
    });
    usersByEmail[saved.email] = saved;
  }

  const leader = usersByEmail["huong.leader@metaecom.vn"];
  const lam = usersByEmail["lam@metaecom.vn"];
  const thao = usersByEmail["thao@metaecom.vn"];
  const vy = usersByEmail["vy@metaecom.vn"];
  const canh = usersByEmail["canh@metaecom.vn"];
  const tuanWeb = usersByEmail["tuan.web@metaecom.vn"];
  const tuan2k8 = usersByEmail["tuan.support@metaecom.vn"];
  const hoang = usersByEmail["hoang@metaecom.vn"];
  const mai = usersByEmail["mai@metaecom.vn"];

  // 2. Tạo 5 Dự án theo tab "Tổng quan" & "Weekly Marketing Operations"
  const projectsData = [
    {
      slug: "livestream",
      name: "Livestream (Meta Ecom Group)",
      description:
        "Traffic + Chuyển đổi B2B Local Brand miền Bắc thuê dịch vụ livestream trọn gói (từ 105K/giờ), phối hợp Econn & Agency.",
      channelSummary: "Fanpage, TikTok, Group",
      weeklySocialTarget: 12,
      weeklyAdsTarget: 5,
      weeklyVideoTarget: 7,
      weeklyImageTarget: 10,
      kpiNote: "12 bài social + 5 bài ads/tuần • Mục tiêu chuyển đổi: 15 leads",
      color: "#ec4899",
    },
    {
      slug: "inpro",
      name: "Inpro (Phần mềm AI)",
      description:
        "Phần mềm AI quản trị doanh nghiệp tập trung (NoneLab). Content định vị Founder Story, Pain Point, Case Study & Sale Kit.",
      channelSummary: "Fanpage, Website",
      weeklySocialTarget: 12,
      weeklyAdsTarget: 0,
      weeklyVideoTarget: 6,
      weeklyImageTarget: 6,
      kpiNote: "12 bài social/tuần + Sale Kit + Sản xuất Media (VJ: Anh Quân)",
      color: "#2563eb",
    },
    {
      slug: "olympic-ai",
      name: "Olympic AI + VOAI (Meta Ecom Uni)",
      description:
        "Hỗ trợ MKT Team Uni tiếp cận học sinh, sinh viên, phụ huynh. Đảm bảo Social MEU + Content phát sinh VOAI.",
      channelSummary: "Fanpage, TikTok, Web Uni",
      weeklySocialTarget: 7,
      weeklyAdsTarget: 2,
      weeklyVideoTarget: 4,
      weeklyImageTarget: 6,
      kpiNote: "7 bài social MEU/tuần + Content phát sinh VOAI + Sản xuất Media",
      color: "#7c3aed",
    },
    {
      slug: "tich-xanh",
      name: "Tích xanh",
      description: "Dự án Traffic thương hiệu Tích xanh (Hương + Vân).",
      channelSummary: "Fanpage",
      weeklySocialTarget: 5,
      weeklyAdsTarget: 0,
      weeklyVideoTarget: 2,
      weeklyImageTarget: 3,
      kpiNote: "Đảm bảo tuyến bài Traffic & ấn phẩm hỗ trợ",
      color: "#0ea5e9",
    },
    {
      slug: "livestream-ai",
      name: "Livestream AI (Meta Ecom Group)",
      description: "Dự án Traffic Livestream AI (Hương + Phương Anh).",
      channelSummary: "Fanpage, Group",
      weeklySocialTarget: 5,
      weeklyAdsTarget: 0,
      weeklyVideoTarget: 2,
      weeklyImageTarget: 3,
      kpiNote: "Truyền thông giải pháp Livestream AI",
      color: "#10b981",
    },
  ];

  const projectsBySlug: Record<string, { id: string; name: string }> = {};
  for (const p of projectsData) {
    const saved = await prisma.project.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
      select: { id: true, name: true, slug: true },
    });
    projectsBySlug[saved.slug] = saved;
  }

  // 3. Phân quyền thành viên dự án (Cô lập dự án chặt chẽ)
  const memberships = [
    // Livestream: Vy + Cảnh xem được toàn bộ đầu việc dự án Livestream
    { projectId: projectsBySlug["livestream"].id, userId: vy.id, scope: "PROJECT_WIDE" as const, roleLabel: "Content + Edit" },
    { projectId: projectsBySlug["livestream"].id, userId: canh.id, scope: "PROJECT_WIDE" as const, roleLabel: "Content + Edit" },
    // Inpro: Lâm xem được toàn bộ đầu việc dự án Inpro
    { projectId: projectsBySlug["inpro"].id, userId: lam.id, scope: "PROJECT_WIDE" as const, roleLabel: "Content + Design" },
    // Olympic AI: Thảo xem được toàn bộ đầu việc dự án Olympic AI (gồm cả order Mai & Hoàng trong Olympic AI)
    { projectId: projectsBySlug["olympic-ai"].id, userId: thao.id, scope: "PROJECT_WIDE" as const, roleLabel: "Content Lead" },
    // Leader tham gia tổng
    { projectId: projectsBySlug["tich-xanh"].id, userId: leader.id, scope: "PROJECT_WIDE" as const, roleLabel: "Phụ trách" },
    { projectId: projectsBySlug["livestream-ai"].id, userId: leader.id, scope: "PROJECT_WIDE" as const, roleLabel: "Phụ trách" },
  ];

  for (const m of memberships) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: m.projectId, userId: m.userId } },
      update: { scope: m.scope, roleLabel: m.roleLabel },
      create: m,
    });
  }

  // 4. Tạo các Task & Order Media mẫu sát thực tế quy trình (nếu chưa có)
  const existingTaskCount = await prisma.task.count();
  if (existingTaskCount === 0) {
    const now = new Date();
    const todayDateStr = getVnDateString(now);
    const todayAt = (hour: number, min = 0) =>
      new Date(`${todayDateStr}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00+07:00`);
    const offsetDayAt = (days: number, hour: number) => {
      const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const s = getVnDateString(d);
      return new Date(`${s}T${String(hour).padStart(2, "0")}:00:00+07:00`);
    };

    const seedTasks = [
      // === OLYMPIC AI (Thảo Content + Mai Design + Hoàng Video) ===
      {
        code: "OAI-01",
        title: "Bộ 4 ảnh Infographic giới thiệu thể lệ Olympic AI 2026",
        description:
          "Tuyến bài truyền thông cho phụ huynh & học sinh. Nhấn mạnh cơ hội trải nghiệm thực tế và giải thưởng.",
        caption:
          "🚀 Olympic AI 2026 chính thức khởi động! Cơ hội để học sinh làm chủ tư duy AI từ sớm cùng giảng viên thực chiến...",
        platform: "Fanpage",
        taskType: "MEDIA_IMAGE" as const,
        status: "WAITING_APPROVAL" as const,
        priority: "HIGH" as const,
        isMediaOrder: true,
        quantity: 4,
        revisionCount: 1,
        projectId: projectsBySlug["olympic-ai"].id,
        requesterId: thao.id,
        assigneeId: mai.id,
        reviewerId: leader.id,
        dueAt: todayAt(17, 30),
        scheduledPublishAt: offsetDayAt(1, 10),
        submittedAt: todayAt(14, 45),
        assets: [
          {
            kind: "BRIEF_REF" as const,
            label: "Brief + Text ảnh (Google Doc)",
            url: "https://docs.google.com/document/d/example-brief-oai-01",
            version: 1,
            createdById: thao.id,
          },
          {
            kind: "DEMO" as const,
            label: "Link Canva Demo v2 (đã chỉnh font)",
            url: "https://www.canva.com/design/example-oai-01-v2",
            version: 2,
            createdById: mai.id,
          },
        ],
      },
      {
        code: "OAI-02",
        title: "Video Highlight học viên thực hành AI tại trường",
        description:
          "Hook 3 giây đầu mạnh vào thành tích học sinh, dùng footage quay hôm thứ 4. Tỷ lệ 9:16 chuẩn safe zone TikTok/Reels.",
        caption: "Xem học sinh cấp 3 tự tay build trợ lý AI trong 45 phút 👇 #OlympicAI #MetaEcomUni",
        platform: "TikTok",
        taskType: "MEDIA_VIDEO" as const,
        status: "IN_PROGRESS" as const,
        priority: "HIGH" as const,
        isMediaOrder: true,
        quantity: 1,
        revisionCount: 0,
        projectId: projectsBySlug["olympic-ai"].id,
        requesterId: thao.id,
        assigneeId: hoang.id,
        reviewerId: leader.id,
        dueAt: todayAt(17, 30),
        scheduledPublishAt: offsetDayAt(1, 19),
        assets: [
          {
            kind: "BRIEF_REF" as const,
            label: "Kịch bản + Footage Drive",
            url: "https://drive.google.com/drive/folders/example-footage-oai-02",
            version: 1,
            createdById: thao.id,
          },
        ],
      },
      {
        code: "OAI-03",
        title: "Chuỗi 3 bài Social MEU & Content phát sinh VOAI tuần này",
        description: "Viết caption chuẩn định vị giáo dục, kiểm tra kỹ thông tin ngày hiệu lực và CTA đăng ký.",
        caption: "Làm sao để con không bị tụt hậu trong kỷ nguyên AI?",
        platform: "Fanpage",
        taskType: "CONTENT_SOCIAL" as const,
        status: "REVISION_NEEDED" as const,
        priority: "NORMAL" as const,
        isMediaOrder: false,
        quantity: 3,
        revisionCount: 1,
        qcChecklistJson: ["IMG-13", "IMG-16"],
        projectId: projectsBySlug["olympic-ai"].id,
        requesterId: leader.id,
        assigneeId: thao.id,
        reviewerId: leader.id,
        dueAt: offsetDayAt(1, 15),
        scheduledPublishAt: offsetDayAt(2, 9),
        assets: [],
      },

      // === LIVESTREAM (Vy + Cảnh + Mai + Hoàng + Tuấn Tuns) ===
      {
        code: "LIV-01",
        title: "Bộ 6 ảnh Carousel: So sánh chi phí thuê Live trọn gói 105K/h vs tự xây team",
        description: "Đánh thẳng pain point Local Brand: tuyển host khó, chi phí vận hành cao. Nhấn mạnh 100+ Brand đã triển khai.",
        caption:
          "Xây team livestream in-house tốn 40-60tr/tháng nhưng vẫn bấp bênh? Giải pháp trọn gói chỉ từ 105K/giờ từ Meta Ecom Group!",
        platform: "Fanpage",
        taskType: "MEDIA_IMAGE" as const,
        status: "IN_PROGRESS" as const,
        priority: "HIGH" as const,
        isMediaOrder: true,
        quantity: 6,
        revisionCount: 0,
        projectId: projectsBySlug["livestream"].id,
        requesterId: vy.id,
        assigneeId: mai.id,
        reviewerId: leader.id,
        dueAt: offsetDayAt(1, 17),
        scheduledPublishAt: offsetDayAt(2, 11),
        assets: [
          {
            kind: "BRIEF_REF" as const,
            label: "Brief Carousel + Bảng số liệu đối chiếu",
            url: "https://docs.google.com/spreadsheets/d/example-liv-01",
            version: 1,
            createdById: vy.id,
          },
        ],
      },
      {
        code: "LIV-02",
        title: "Video Ads chuyển đổi: Case Study Brand Mẹ & Bé tăng GMV sau 14 ngày",
        description: "Thời lượng 45s, có B-roll phiên live thực tế, CTA rõ ràng nhận tư vấn 1-1.",
        caption: "Từ 0 đơn đều đặn lên mốc GMV ổn định nhờ quy trình vận hành phiên live bài bản.",
        platform: "TikTok",
        taskType: "MEDIA_VIDEO" as const,
        status: "WAITING_APPROVAL" as const,
        priority: "URGENT" as const,
        isMediaOrder: true,
        quantity: 1,
        isRushOrder: true,
        revisionCount: 2,
        projectId: projectsBySlug["livestream"].id,
        requesterId: canh.id,
        assigneeId: hoang.id,
        reviewerId: leader.id,
        dueAt: todayAt(17, 0),
        scheduledPublishAt: offsetDayAt(1, 14),
        submittedAt: todayAt(15, 5),
        assets: [
          {
            kind: "BRIEF_REF" as const,
            label: "Kịch bản Ads + Source Econn",
            url: "https://drive.google.com/drive/folders/example-liv-02-src",
            version: 1,
            createdById: canh.id,
          },
          {
            kind: "DEMO" as const,
            label: "Video Export v3 (đã sửa Safe Zone + Voice)",
            url: "https://drive.google.com/file/d/example-liv-02-v3/view",
            version: 3,
            createdById: hoang.id,
          },
        ],
      },
      {
        code: "LIV-03",
        title: "Thiết lập chiến dịch Ads Lead chuyển đổi tuần 3",
        description: "Mục tiêu tối thiểu 15 leads tuần cho tệp Local Brand miền Bắc (doanh thu 300tr - 5 tỷ).",
        platform: "Ads Manager",
        taskType: "ADS_CAMPAIGN" as const,
        status: "IN_PROGRESS" as const,
        priority: "HIGH" as const,
        isMediaOrder: false,
        quantity: 1,
        projectId: projectsBySlug["livestream"].id,
        requesterId: leader.id,
        assigneeId: tuanWeb.id,
        reviewerId: leader.id,
        dueAt: offsetDayAt(2, 17),
        scheduledPublishAt: offsetDayAt(2, 18),
        assets: [],
      },

      // === INPRO (Lâm + Hoàng + Tuấn Tuns) ===
      {
        code: "INP-01",
        title: "Series 3 ảnh Founder Story: Vì sao SME mất tri thức khi nhân sự chủ chốt nghỉ?",
        description: "Lâm tự viết content và thiết kế theo Brand Guideline Inpro.",
        caption:
          "Dữ liệu nằm rải rác trên Zalo, Excel và đầu nhân viên — khi người giỏi nghỉ, doanh nghiệp làm lại từ đầu?",
        platform: "Fanpage",
        taskType: "CONTENT_SOCIAL" as const,
        status: "WAITING_APPROVAL" as const,
        priority: "NORMAL" as const,
        isMediaOrder: false,
        quantity: 3,
        projectId: projectsBySlug["inpro"].id,
        requesterId: lam.id,
        assigneeId: lam.id,
        reviewerId: leader.id,
        dueAt: todayAt(15, 0),
        scheduledPublishAt: offsetDayAt(1, 9),
        submittedAt: todayAt(14, 50),
        assets: [
          {
            kind: "FINAL" as const,
            label: "Canva Bộ 3 ảnh Founder Story",
            url: "https://www.canva.com/design/example-inp-01",
            version: 1,
            createdById: lam.id,
          },
        ],
      },
      {
        code: "INP-02",
        title: "Video Demo tính năng Quản trị tập trung phần mềm Inpro (VJ Anh Quân)",
        description: "Đảm bảo hiển thị đúng phiên bản giao diện sản phẩm mới nhất từ NoneLab.",
        platform: "Fanpage",
        taskType: "MEDIA_VIDEO" as const,
        status: "APPROVED_FINAL" as const,
        priority: "HIGH" as const,
        isMediaOrder: true,
        quantity: 1,
        projectId: projectsBySlug["inpro"].id,
        requesterId: lam.id,
        assigneeId: hoang.id,
        reviewerId: leader.id,
        dueAt: offsetDayAt(-1, 17),
        scheduledPublishAt: todayAt(20, 0),
        approvedAt: todayAt(10, 0),
        assets: [
          {
            kind: "FINAL" as const,
            label: "Video Final 1080p (Drive)",
            url: "https://drive.google.com/file/d/example-inp-02-final/view",
            version: 2,
            createdById: hoang.id,
          },
        ],
      },
      {
        code: "INP-03",
        title: "Seeding 10 group chủ doanh nghiệp SME & tối ưu bài chuẩn SEO Web Inpro",
        description: "Phối hợp seeding link Landing Page gắn UTM chuẩn.",
        platform: "Group",
        taskType: "SEEDING_SUPPORT" as const,
        status: "DONE" as const,
        priority: "NORMAL" as const,
        isMediaOrder: false,
        quantity: 1,
        projectId: projectsBySlug["inpro"].id,
        requesterId: lam.id,
        assigneeId: tuan2k8.id,
        reviewerId: leader.id,
        dueAt: offsetDayAt(-1, 17),
        completedAt: offsetDayAt(-1, 16),
        assets: [
          {
            kind: "PUBLISHED_LINK" as const,
            label: "Sheet tổng hợp link seeding",
            url: "https://docs.google.com/spreadsheets/d/example-seeding-log",
            version: 1,
            createdById: tuan2k8.id,
          },
        ],
      },

      // === TÍCH XANH & LIVESTREAM AI ===
      {
        code: "TX-01",
        title: "Thiết kế 2 banner thông tin dịch vụ Tích xanh",
        description: "Đúng Brand Identity, không sử dụng claim vi phạm chính sách nền tảng.",
        platform: "Fanpage",
        taskType: "MEDIA_IMAGE" as const,
        status: "DONE" as const,
        priority: "NORMAL" as const,
        isMediaOrder: true,
        quantity: 2,
        projectId: projectsBySlug["tich-xanh"].id,
        requesterId: leader.id,
        assigneeId: mai.id,
        reviewerId: leader.id,
        dueAt: offsetDayAt(-2, 17),
        completedAt: offsetDayAt(-2, 16),
        assets: [
          {
            kind: "FINAL" as const,
            label: "Final Banner Tích Xanh",
            url: "https://www.canva.com/design/example-tx-01",
            version: 1,
            createdById: mai.id,
          },
        ],
      },
    ];

    for (const t of seedTasks) {
      const { assets, qcChecklistJson, ...taskFields } = t;
      const created = await prisma.task.create({
        data: {
          ...taskFields,
          qcChecklistJson: qcChecklistJson ?? undefined,
          assets: {
            create: assets,
          },
        },
      });

      if (created.code === "OAI-03") {
        await prisma.taskComment.create({
          data: {
            taskId: created.id,
            authorId: leader.id,
            content:
              "Chỉnh lại hook mở đầu ngắn gọn hơn cho phụ huynh đọc trên mobile và bổ sung CTA rõ ràng về form đăng ký.",
            qcFlagsJson: ["IMG-13", "IMG-16"],
          },
        });
      }
    }

    // 5. Tạo Check-in đầu ngày mẫu (hôm nay)
    await prisma.dailyCheckin.createMany({
      data: [
        {
          userId: mai.id,
          checkinDate: todayDateStr,
          status: "ON_TRACK",
          note: "Đang hoàn thiện bộ 6 ảnh Carousel Livestream, bộ Olympic AI đã gửi Demo v2 chờ duyệt.",
        },
        {
          userId: hoang.id,
          checkinDate: todayDateStr,
          status: "AT_RISK",
          note: "Video Highlight Olympic AI thiếu 1 đoạn footage lớp học, đang xin thêm source để kịp 17h30.",
        },
        {
          userId: lam.id,
          checkinDate: todayDateStr,
          status: "ON_TRACK",
          note: "Đã nộp bộ 3 ảnh Inpro lên hàng đợi duyệt 15h.",
        },
      ],
    });

    // 6. Weekly Report Note mẫu cho tuần hiện tại
    const { weekStartStr } = getVnWeekBounds(now);
    await prisma.weeklyReportNote.createMany({
      data: [
        {
          projectId: projectsBySlug["livestream"].id,
          authorId: vy.id,
          weekStart: weekStartStr,
          highlights: "Hoàn thành kịch bản Case Study Mẹ & Bé và đẩy mạnh tuyến bài 105K/h.",
          blockers: "Đang chờ bổ sung thêm video hậu trường phiên live mới từ Econn.",
          proposals: "Chốt lịch bàn giao footage cố định vào sáng thứ 3 hàng tuần.",
        },
        {
          projectId: projectsBySlug["olympic-ai"].id,
          authorId: thao.id,
          weekStart: weekStartStr,
          highlights: "Hoàn thiện bộ infographic thể lệ 2026 và tối ưu caption chuyển đổi.",
          blockers: "Cần duyệt sớm lịch quay tại trường để không bị trùng ngày nghỉ của Media.",
          proposals: "Gửi Brief quay trước ít nhất 4 ngày theo đúng quy trình.",
        },
      ],
    });

    // 7. Thông báo mẫu
    await prisma.notification.createMany({
      data: [
        {
          userId: leader.id,
          type: "AT_RISK_ALERT",
          title: "Hoàng báo nguy cơ trễ tiến độ",
          message: "Video Highlight Olympic AI đang thiếu footage lớp học, cần hỗ trợ source.",
          linkUrl: "/leader",
        },
        {
          userId: leader.id,
          type: "REVIEW_REQUESTED",
          title: "Có 3 ấn phẩm đang chờ Leader duyệt",
          message: "OAI-01 (Mai), LIV-02 (Hoàng), INP-01 (Lâm) đang nằm trong hàng đợi duyệt.",
          linkUrl: "/reviews",
        },
        {
          userId: thao.id,
          type: "REVISION_REQUESTED",
          title: "Leader yêu cầu sửa bài OAI-03",
          message: "Chỉnh hook mở đầu ngắn hơn cho mobile và làm rõ CTA đăng ký.",
          linkUrl: "/projects/olympic-ai",
        },
      ],
    });
  }

  // 8. Dự trù chi phí mẫu (nếu chưa có)
  const existingBudgetCount = await prisma.budgetRequest.count();
  if (existingBudgetCount === 0) {
    const now = new Date();
    const inTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const inFourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    await prisma.budgetRequest.createMany({
      data: [
        {
          code: "CHI-01",
          title: "Thuê micro cài áo + đèn hỗ trợ buổi quay tại trường Olympic AI",
          category: "SHOOT_PRODUCTION",
          amount: 1200000,
          neededBy: inTwoDays,
          note: "Đã khảo sát địa điểm thiếu sáng góc hành lang lớp học, cần xin cấp ngân sách trước quay 2 ngày.",
          status: "PENDING",
          projectId: projectsBySlug["olympic-ai"].id,
          requesterId: thao.id,
        },
        {
          code: "CHI-02",
          title: "Ngân sách test Ads chuyển đổi Livestream tuần 3 (15 leads)",
          category: "ADS_BUDGET",
          amount: 5000000,
          neededBy: inFourDays,
          note: "Chạy A/B testing 2 video Case Study Mẹ & Bé + 105K/h.",
          status: "APPROVED",
          reviewNote: "Đã duyệt mức test tuần 3, theo dõi CPL hàng ngày.",
          projectId: projectsBySlug["livestream"].id,
          requesterId: tuanWeb.id,
          reviewerId: leader.id,
        },
      ],
    });
  }

  console.log("Khởi tạo dữ liệu Meta Ecom MKT Hub hoàn tất!");

  // 9. Phòng Chat mặc định (Boong chung + Hòm thư góp ý ẩn danh)
  const existingChatCount = await prisma.chatRoom.count();
  if (existingChatCount === 0) {
    const allMemberIds = Object.values(usersByEmail).map((u) => u.id);
    await prisma.chatRoom.create({
      data: {
        type: "GROUP",
        name: "⛵ Boong Tàu Sunny (Cả Băng)",
        description:
          "Kênh trao đổi chung toàn Team Marketing • Có thể nhắn công khai hoặc bật Ẩn danh.",
        allowAnonymous: true,
        isPinned: true,
        createdById: leader.id,
        participants: {
          create: allMemberIds.map((uid) => ({
            userId: uid,
            isAdmin: uid === leader.id,
          })),
        },
        messages: {
          create: {
            senderId: leader.id,
            content:
              "Chào cả băng lên tàu Sunny! Mọi người có thể trao đổi chung ở đây, tạo nhóm riêng hoặc bật 🕵️ Ẩn danh để gửi góp ý thoải mái nhé!",
            isAnonymous: false,
          },
        },
      },
    });

    await prisma.chatRoom.create({
      data: {
        type: "GROUP",
        name: "🕵️ Hòm Thư Góp Ý Ẩn Danh",
        description:
          "Chia sẻ thẳng thắn ý tưởng, áp lực công việc hoặc góp ý quy trình — 100% ẩn danh.",
        allowAnonymous: true,
        isPinned: true,
        createdById: leader.id,
        participants: {
          create: allMemberIds.map((uid) => ({
            userId: uid,
            isAdmin: uid === leader.id,
          })),
        },
        messages: {
          create: {
            senderId: leader.id,
            content:
              "Bất kỳ tin nhắn bật chế độ Ẩn danh nào tại đây sẽ ẩn hoàn toàn tên thật và avatar của người gửi. Cứ mạnh dạn đóng góp cho team nhé!",
            isAnonymous: true,
            anonymousAlias: "👒 Bóng Ma Tàu Sunny",
          },
        },
      },
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
