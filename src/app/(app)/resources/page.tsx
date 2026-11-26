import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProjectVisibilityWhere } from "@/lib/permissions";
import { isMediaProductionUser } from "@/lib/constants";
import { getVnDateString } from "@/lib/dates";
import { ResourcesHubView } from "@/components/resources-hub-view";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { projectId, tab } = await searchParams;

  const canSeeAllProjectResources =
    user.role === "LEADER" ||
    isMediaProductionUser(user.role, user.departmentScope);

  const projects = await prisma.project.findMany({
    where: canSeeAllProjectResources
      ? { isActive: true }
      : buildProjectVisibilityWhere(user),
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      color: true,
      masterResourceUrl: true,
      masterResourceNote: true,
    },
  });

  const visibleProjectIds = projects.map((p) => p.id);

  const count = await prisma.workspaceResource.count();
  if (count === 0 && projects[0]) {
    await prisma.workspaceResource.createMany({
      data: [
        {
          scope: "GLOBAL",
          projectId: null,
          category: "LOGO_BRAND",
          title: "Bộ Logo Meta Ecom & Watermark Chuẩn",
          url: "https://drive.google.com",
          description: "File AI, PNG tách nền logo Meta Ecom dùng cho mọi ấn phẩm.",
          tags: "logo,png,watermark",
          updatedById: user.id,
        },
        {
          scope: "GLOBAL",
          projectId: null,
          category: "GUIDELINE_DOC",
          title: "Brand Guideline & Quy Chuẩn Màu Chữ MKT",
          url: "https://www.canva.com",
          description: "Quy chuẩn font chữ, bảng màu, khung safe-zone TikTok/Reels/FB.",
          tags: "guideline,font,canva",
          updatedById: user.id,
        },
        {
          scope: "PROJECT",
          projectId: projects[0].id,
          category: "PHOTO_FOLDER",
          title: `Kho Ảnh Studio & Sản Phẩm — ${projects[0].name}`,
          url: "https://drive.google.com",
          description: "Thư mục tổng hợp ảnh chụp gốc & ảnh cắt nền dự án.",
          tags: "anh,studio,drive",
          updatedById: user.id,
        },
        {
          scope: "PROJECT",
          projectId: projects[0].id,
          category: "FINISHED_MEDIA",
          title: `Thư Mục Thành Phẩm Final — ${projects[0].name}`,
          url: "https://drive.google.com",
          description: "Nơi lưu các video/ảnh đã được Leader duyệt Final để đăng.",
          tags: "final,media",
          updatedById: user.id,
        },
      ],
    });
  }

  const eqCount = await prisma.equipmentItem.count();
  if (eqCount === 0) {
    await prisma.equipmentItem.createMany({
      data: [
        {
          code: "CAM-01",
          name: "Máy quay Sony ZV-E10 #1",
          category: "CAMCORDER",
          description: "Gắn kèm lens Sigma 16mm f1.4 quay Video TikTok / Reels",
        },
        {
          code: "CAM-02",
          name: "Máy ảnh Canon EOS R50 Studio",
          category: "CAMERA",
          description: "Chụp ảnh sản phẩm, Thumbnail, ảnh sự kiện",
        },
        {
          code: "PHN-01",
          name: "iPhone 15 Pro Max (Quay Reels)",
          category: "PHONE",
          description: "Máy quay dựng nhanh ngoài hiện trường + Livestream",
        },
        {
          code: "PHN-02",
          name: "iPhone 14 Pro (Livestream Bàn)",
          category: "PHONE",
          description: "Gắn cố định hoặc mượn quay góc phụ Livestream",
        },
        {
          code: "MIC-01",
          name: "Bộ Mic DJI Mic 2 + Đèn Godox SL60",
          category: "MIC_LIGHT",
          description: "Thu âm phỏng vấn & chiếu sáng trong phòng Studio",
        },
      ],
    });
  }

  const [resources, equipment, bookings, teamMembers] = await Promise.all([
    prisma.workspaceResource.findMany({
      where: {
        OR: [
          { scope: "GLOBAL" },
          { scope: "PROJECT", projectId: { in: visibleProjectIds } },
        ],
      },
      orderBy: [{ scope: "asc" }, { category: "asc" }, { updatedAt: "desc" }],
      include: {
        project: { select: { id: true, slug: true, name: true, color: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.equipmentItem.findMany({
      orderBy: [{ code: "asc" }, { name: "asc" }],
    }),
    prisma.equipmentBooking.findMany({
      orderBy: { startAt: "desc" },
      take: 80,
      include: {
        equipment: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarColor: true,
            pirateCharacter: true,
          },
        },
        project: { select: { id: true, slug: true, name: true, color: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ResourcesHubView
      currentUser={user}
      todayStr={getVnDateString()}
      initialResources={resources}
      initialEquipment={equipment}
      initialBookings={bookings}
      projects={projects}
      teamMembers={teamMembers}
      userRole={user.role}
      toneMode={user.preferredTone}
      initialProjectFilter={projectId || "ALL"}
      initialTab={tab === "equipment" ? "EQUIPMENT" : "RESOURCES"}
    />
  );
}
