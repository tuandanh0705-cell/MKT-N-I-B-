import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getGeminiConfigStatus,
  saveGeminiConfig,
  testGeminiConnection,
} from "@/lib/gemini-ai";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const status = await getGeminiConfigStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (user.role !== "LEADER") {
    return NextResponse.json(
      { error: "Chỉ Leader mới có quyền cấu hình Gemini API Key." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    if (body.action === "TEST") {
      const testRes = await testGeminiConnection(body.apiKey, body.model);
      return NextResponse.json(testRes, { status: testRes.ok ? 200 : 400 });
    }

    if (body.testBeforeSave && typeof body.apiKey === "string" && body.apiKey.trim()) {
      const testRes = await testGeminiConnection(body.apiKey, body.model);
      if (!testRes.ok) {
        return NextResponse.json(
          { error: testRes.message, testResult: testRes },
          { status: 400 }
        );
      }
    }

    const updated = await saveGeminiConfig({
      apiKey: typeof body.apiKey === "string" ? body.apiKey : undefined,
      model: typeof body.model === "string" ? body.model : undefined,
      clearDbKey: Boolean(body.clearDbKey),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Save Gemini config error:", error);
    return NextResponse.json(
      { error: "Không thể lưu cấu hình Gemini AI." },
      { status: 500 }
    );
  }
}
