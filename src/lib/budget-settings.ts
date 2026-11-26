import { prisma } from "@/lib/prisma";

export const BUDGET_GENERAL_INFO_KEY = "budget_general_info";

export interface BudgetGeneralInfo {
  invoiceEmail: string;
  companyName: string;
  taxCode: string;
  address: string;
  paymentMethod: string;
  goodsServiceName: string;
  sheetUrl: string;
}

export const DEFAULT_BUDGET_GENERAL_INFO: BudgetGeneralInfo = {
  invoiceEmail: "ketoan@metaecom.com",
  companyName: "CÔNG TY CỔ PHẦN META ECOM",
  taxCode: "0110050846",
  address:
    "Số nhà 33 ngõ 192 đường Lê Trọng Tấn, phường Phương Liệt, thành phố Hà Nội, Việt Nam",
  paymentMethod: "Tiền mặt",
  goodsServiceName: "...................................",
  sheetUrl:
    "https://docs.google.com/spreadsheets/d/15hZAggT2eI9Hbv8IiamZaMvTG8eorWTLUTN5nuGR0lc/edit?gid=400426526#gid=400426526",
};

export async function getBudgetGeneralInfo(): Promise<BudgetGeneralInfo> {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: BUDGET_GENERAL_INFO_KEY },
      select: { value: true },
    });
    if (!row?.value) return { ...DEFAULT_BUDGET_GENERAL_INFO };
    const parsed = JSON.parse(row.value) as Partial<BudgetGeneralInfo>;
    return {
      invoiceEmail:
        typeof parsed.invoiceEmail === "string" && parsed.invoiceEmail.trim()
          ? parsed.invoiceEmail.trim()
          : DEFAULT_BUDGET_GENERAL_INFO.invoiceEmail,
      companyName:
        typeof parsed.companyName === "string" && parsed.companyName.trim()
          ? parsed.companyName.trim()
          : DEFAULT_BUDGET_GENERAL_INFO.companyName,
      taxCode:
        typeof parsed.taxCode === "string" && parsed.taxCode.trim()
          ? parsed.taxCode.trim()
          : DEFAULT_BUDGET_GENERAL_INFO.taxCode,
      address:
        typeof parsed.address === "string" && parsed.address.trim()
          ? parsed.address.trim()
          : DEFAULT_BUDGET_GENERAL_INFO.address,
      paymentMethod:
        typeof parsed.paymentMethod === "string" && parsed.paymentMethod.trim()
          ? parsed.paymentMethod.trim()
          : DEFAULT_BUDGET_GENERAL_INFO.paymentMethod,
      goodsServiceName:
        typeof parsed.goodsServiceName === "string" &&
        parsed.goodsServiceName.trim()
          ? parsed.goodsServiceName.trim()
          : DEFAULT_BUDGET_GENERAL_INFO.goodsServiceName,
      sheetUrl:
        typeof parsed.sheetUrl === "string" && parsed.sheetUrl.trim()
          ? parsed.sheetUrl.trim()
          : DEFAULT_BUDGET_GENERAL_INFO.sheetUrl,
    };
  } catch {
    return { ...DEFAULT_BUDGET_GENERAL_INFO };
  }
}
