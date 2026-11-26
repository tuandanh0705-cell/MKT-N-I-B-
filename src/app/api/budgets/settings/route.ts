import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  BUDGET_GENERAL_INFO_KEY,
  DEFAULT_BUDGET_GENERAL_INFO,
  getBudgetGeneralInfo,
  type BudgetGeneralInfo,
} from "@/lib/budget-settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const info = await getBudgetGeneralInfo();
  return NextResponse.json({ info });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền cập nhật thông tin chung ngân sách." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const current = await getBudgetGeneralInfo();

    const rawSheetUrl =
      body.sheetUrl !== undefined
        ? String(body.sheetUrl ?? "").trim()
        : current.sheetUrl;

    if (rawSheetUrl && !/^https?:\/\//i.test(rawSheetUrl)) {
      return NextResponse.json(
        { error: "Link Google Sheet phải bắt đầu bằng http:// hoặc https://." },
        { status: 400 }
      );
    }

    const nextInfo: BudgetGeneralInfo = {
      invoiceEmail:
        String(body.invoiceEmail ?? current.invoiceEmail).trim() ||
        DEFAULT_BUDGET_GENERAL_INFO.invoiceEmail,
      companyName:
        String(body.companyName ?? current.companyName).trim() ||
        DEFAULT_BUDGET_GENERAL_INFO.companyName,
      taxCode:
        String(body.taxCode ?? current.taxCode).trim() ||
        DEFAULT_BUDGET_GENERAL_INFO.taxCode,
      address:
        String(body.address ?? current.address).trim() ||
        DEFAULT_BUDGET_GENERAL_INFO.address,
      paymentMethod:
        String(body.paymentMethod ?? current.paymentMethod).trim() ||
        DEFAULT_BUDGET_GENERAL_INFO.paymentMethod,
      goodsServiceName:
        String(body.goodsServiceName ?? current.goodsServiceName).trim() ||
        DEFAULT_BUDGET_GENERAL_INFO.goodsServiceName,
      sheetUrl: rawSheetUrl || DEFAULT_BUDGET_GENERAL_INFO.sheetUrl,
    };

    await prisma.appSetting.upsert({
      where: { key: BUDGET_GENERAL_INFO_KEY },
      create: {
        key: BUDGET_GENERAL_INFO_KEY,
        value: JSON.stringify(nextInfo),
      },
      update: {
        value: JSON.stringify(nextInfo),
      },
    });

    return NextResponse.json({ info: nextInfo });
  } catch (err) {
    console.error("Update budget general info error:", err);
    return NextResponse.json(
      { error: "Không thể lưu thông tin chung ngân sách." },
      { status: 500 }
    );
  }
}
