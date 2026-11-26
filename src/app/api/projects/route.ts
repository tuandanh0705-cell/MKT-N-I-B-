import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buildProjectVisibilityWhere, canAccessProject } from "@/lib/permissions";
import { isMediaProductionUser } from "@/lib/constants";
import { normalizeContentMatrix, sanitizeOptionList } from "@/lib/content-plan";

function normalizeMasterLinkUrl(
  raw: unknown
): { ok: true; url: string | null } | { ok: false; error: string } {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: true, url: null };

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        ok: false,
        error: "Link tổng dự án chỉ hỗ trợ đường dẫn http:// hoặc https://.",
      };
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return {
        ok: false,
        error: "Link tổng dự án chưa đúng định dạng (VD: https://drive.google.com/...).",
      };
    }
    return { ok: true, url: parsed.toString() };
  } catch {
    return {
      ok: false,
      error: "Link tổng dự án chưa đúng định dạng (VD: https://drive.google.com/...).",
    };
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: buildProjectVisibilityWhere(user),
    orderBy: { createdAt: "asc" },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              title: true,
              departmentScope: true,
              avatarColor: true,
            },
          },
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền tạo dự án mới." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Tên dự án không được để trống." },
        { status: 400 }
      );
    }

    const baseSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const slug = body.slug
      ? String(body.slug).trim()
      : `${baseSlug || "du-an"}-${Date.now().toString(36).slice(-4)}`;

    const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];
    const parsedMasterUrl = normalizeMasterLinkUrl(body.masterResourceUrl);
    if (!parsedMasterUrl.ok) {
      return NextResponse.json({ error: parsedMasterUrl.error }, { status: 400 });
    }
    const masterResourceNote = parsedMasterUrl.url && body.masterResourceNote
      ? String(body.masterResourceNote).trim().slice(0, 160) || null
      : null;

    const created = await prisma.project.create({
      data: {
        slug,
        name,
        description: body.description ? String(body.description) : null,
        channelSummary: body.channelSummary ? String(body.channelSummary) : null,
        masterResourceUrl: parsedMasterUrl.url,
        masterResourceNote,
        weeklySocialTarget: Number(body.weeklySocialTarget || 0),
        weeklyAdsTarget: Number(body.weeklyAdsTarget || 0),
        weeklyVideoTarget: Number(body.weeklyVideoTarget || 0),
        weeklyImageTarget: Number(body.weeklyImageTarget || 0),
        kpiNote: body.kpiNote ? String(body.kpiNote) : null,
        color: body.color ? String(body.color) : "#2563eb",
        members: {
          create: memberIds.map((uid) => ({
            userId: uid,
            scope: "PROJECT_WIDE",
          })),
        },
      },
    });

    return NextResponse.json({ project: created }, { status: 201 });
  } catch (err) {
    console.error("Create project error:", err);
    return NextResponse.json(
      { error: "Không thể tạo dự án (có thể slug bị trùng)." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "Thiếu id dự án." }, { status: 400 });
    }

    const editingCoreFields =
      body.name !== undefined ||
      body.description !== undefined ||
      body.channelSummary !== undefined ||
      body.weeklySocialTarget !== undefined ||
      body.weeklyAdsTarget !== undefined ||
      body.weeklyVideoTarget !== undefined ||
      body.weeklyImageTarget !== undefined ||
      body.kpiNote !== undefined ||
      body.color !== undefined;

    if (editingCoreFields && user.role !== "LEADER") {
      return NextResponse.json(
        { error: "Chỉ Leader mới có quyền chỉnh sửa KPI và thông tin gốc dự án." },
        { status: 403 }
      );
    }

    if (!editingCoreFields) {
      const editingOnlyMasterLink =
        (body.masterResourceUrl !== undefined ||
          body.masterResourceNote !== undefined) &&
        body.campaignStartAt === undefined &&
        body.campaignEndAt === undefined &&
        body.campaignWeeks === undefined &&
        body.contentPillarsJson === undefined &&
        body.overviewJson === undefined &&
        body.contentMatrixJson === undefined &&
        body.contentOptions === undefined &&
        body.optionRenames === undefined;

      const allowed =
        (editingOnlyMasterLink &&
          isMediaProductionUser(user.role, user.departmentScope)) ||
        (await canAccessProject(user, id));
      if (!allowed) {
        return NextResponse.json(
          { error: "Bạn không có quyền chỉnh sửa kế hoạch dự án này." },
          { status: 403 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined && String(body.name).trim()) {
      data.name = String(body.name).trim();
    }
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description) : null;
    }
    if (body.channelSummary !== undefined) {
      data.channelSummary = body.channelSummary ? String(body.channelSummary) : null;
    }
    if (body.masterResourceUrl !== undefined) {
      const parsedMasterUrl = normalizeMasterLinkUrl(body.masterResourceUrl);
      if (!parsedMasterUrl.ok) {
        return NextResponse.json({ error: parsedMasterUrl.error }, { status: 400 });
      }
      data.masterResourceUrl = parsedMasterUrl.url;
      if (!parsedMasterUrl.url && body.masterResourceNote === undefined) {
        data.masterResourceNote = null;
      }
    }
    if (body.masterResourceNote !== undefined) {
      const note = String(body.masterResourceNote ?? "").trim();
      data.masterResourceNote = note ? note.slice(0, 160) : null;
    }
    if (body.weeklySocialTarget !== undefined) {
      data.weeklySocialTarget = Math.max(0, Number(body.weeklySocialTarget));
    }
    if (body.weeklyAdsTarget !== undefined) {
      data.weeklyAdsTarget = Math.max(0, Number(body.weeklyAdsTarget));
    }
    if (body.weeklyVideoTarget !== undefined) {
      data.weeklyVideoTarget = Math.max(0, Number(body.weeklyVideoTarget));
    }
    if (body.weeklyImageTarget !== undefined) {
      data.weeklyImageTarget = Math.max(0, Number(body.weeklyImageTarget));
    }
    if (body.kpiNote !== undefined) {
      data.kpiNote = body.kpiNote ? String(body.kpiNote) : null;
    }
    if (body.color !== undefined) {
      data.color = String(body.color);
    }
    if (body.campaignStartAt !== undefined) {
      data.campaignStartAt = body.campaignStartAt
        ? new Date(body.campaignStartAt)
        : null;
    }
    if (body.campaignEndAt !== undefined) {
      data.campaignEndAt = body.campaignEndAt
        ? new Date(body.campaignEndAt)
        : null;
    }
    if (body.campaignWeeks !== undefined) {
      data.campaignWeeks = Math.max(1, Math.min(52, Number(body.campaignWeeks) || 4));
    }
    if (body.contentPillarsJson !== undefined && Array.isArray(body.contentPillarsJson)) {
      data.contentPillarsJson = body.contentPillarsJson
        .map((s: unknown) => String(s).trim())
        .filter(Boolean)
        .slice(0, 12);
    }
    if (body.overviewJson !== undefined || body.contentOptions !== undefined) {
      const existingProj = await prisma.project.findUnique({
        where: { id },
        select: { overviewJson: true },
      });
      const existingObj =
        existingProj?.overviewJson &&
        typeof existingProj.overviewJson === "object" &&
        !Array.isArray(existingProj.overviewJson)
          ? { ...(existingProj.overviewJson as Record<string, unknown>) }
          : {};

      const mergedOverview: Record<string, unknown> =
        body.overviewJson !== undefined &&
        body.overviewJson &&
        typeof body.overviewJson === "object" &&
        !Array.isArray(body.overviewJson)
          ? {
              ...existingObj,
              ...(body.overviewJson as Record<string, unknown>),
            }
          : existingObj;

      if (
        body.contentOptions &&
        typeof body.contentOptions === "object" &&
        !Array.isArray(body.contentOptions)
      ) {
        const opts = body.contentOptions as Record<string, unknown>;
        for (const key of [
          "routeOptions",
          "platformOptions",
          "formatOptions",
        ] as const) {
          if (opts[key] === null) {
            delete mergedOverview[key];
          } else if (Array.isArray(opts[key])) {
            const sanitized = sanitizeOptionList(opts[key]);
            if (sanitized.length > 0) {
              mergedOverview[key] = sanitized;
            } else {
              delete mergedOverview[key];
            }
          }
        }
      }

      data.overviewJson = mergedOverview;
    }
    if (body.contentMatrixJson !== undefined) {
      data.contentMatrixJson = body.contentMatrixJson;
    }

    let renamedTasksCount = 0;
    const validRenames: Array<{
      field: "contentAngle" | "platform" | "postFormat";
      from: string;
      to: string;
    }> = [];
    if (Array.isArray(body.optionRenames)) {
      for (const item of body.optionRenames) {
        if (!item || typeof item !== "object") continue;
        const r = item as Record<string, unknown>;
        const field = r.field;
        const from = String(r.from ?? "").trim();
        const to = String(r.to ?? "").trim();
        if (
          (field === "contentAngle" ||
            field === "platform" ||
            field === "postFormat") &&
          from &&
          to &&
          from !== to
        ) {
          validRenames.push({ field, from, to });
        }
      }
    }

    if (validRenames.length > 0 && body.contentMatrixJson === undefined) {
      const existingProjMatrix = await prisma.project.findUnique({
        where: { id },
        select: { contentMatrixJson: true },
      });
      if (existingProjMatrix?.contentMatrixJson) {
        const matrix = normalizeContentMatrix(existingProjMatrix.contentMatrixJson);
        let matrixChanged = false;
        const nextIdeas = matrix.ideas.map((idea) => {
          let nextRoute = idea.route;
          let nextFormat = idea.format;
          for (const rn of validRenames) {
            if (
              rn.field === "contentAngle" &&
              nextRoute &&
              (nextRoute.toLowerCase() === rn.from.toLowerCase() ||
                (rn.from.toUpperCase() === "CASE STUDY" &&
                  nextRoute.toUpperCase() === "CASE") ||
                (rn.from.toUpperCase() === "BÁN HÀNG / PR" &&
                  nextRoute.toUpperCase() === "BÁN HÀNG"))
            ) {
              nextRoute = rn.to;
              matrixChanged = true;
            }
            if (
              rn.field === "postFormat" &&
              nextFormat &&
              nextFormat.toLowerCase() === rn.from.toLowerCase()
            ) {
              nextFormat = rn.to;
              matrixChanged = true;
            }
          }
          return nextRoute === idea.route && nextFormat === idea.format
            ? idea
            : { ...idea, route: nextRoute, format: nextFormat };
        });
        if (matrixChanged) {
          data.contentMatrixJson = { ...matrix, ideas: nextIdeas };
        }
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    for (const rn of validRenames) {
      if (rn.field === "contentAngle") {
        const matchValues = [rn.from];
        if (rn.from.toUpperCase() === "CASE STUDY") matchValues.push("CASE");
        if (rn.from.toUpperCase() === "BÁN HÀNG / PR") matchValues.push("BÁN HÀNG");
        const res = await prisma.task.updateMany({
          where: {
            projectId: id,
            deletedAt: null,
            contentAngle: { in: matchValues },
          },
          data: { contentAngle: rn.to },
        });
        renamedTasksCount += res.count;
      } else if (rn.field === "platform") {
        const res = await prisma.task.updateMany({
          where: {
            projectId: id,
            deletedAt: null,
            platform: rn.from,
          },
          data: { platform: rn.to },
        });
        renamedTasksCount += res.count;
      } else if (rn.field === "postFormat") {
        const res = await prisma.task.updateMany({
          where: {
            projectId: id,
            deletedAt: null,
            postFormat: rn.from,
          },
          data: { postFormat: rn.to },
        });
        renamedTasksCount += res.count;
      }
    }

    return NextResponse.json({ project: updated, renamedTasksCount });
  } catch (err) {
    console.error("Update project error:", err);
    return NextResponse.json(
      { error: "Không thể cập nhật thông tin dự án." },
      { status: 500 }
    );
  }
}
