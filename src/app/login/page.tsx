"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Mail, ArrowRight, Anchor } from "lucide-react";
import {
  PirateAvatar,
  StrawHatLogo,
} from "@/components/pirate-art";
import { Pirate3DSoloStage } from "@/components/pirate-3d-stage";

const DEMO_ACCOUNTS = [
  {
    name: "Hương",
    email: "huong.leader@metaecom.vn",
    tag: "👒 Luffy",
    scope: "LEADER",
    hex: "#0f172a",
    color: "bg-amber-400/20 text-amber-200 border-amber-400/40",
  },
  {
    name: "Thảo",
    email: "thao@metaecom.vn",
    tag: "🧭 Nami",
    scope: "CONTENT",
    hex: "#7c3aed",
    color: "bg-violet-500/20 text-violet-200 border-violet-400/40",
  },
  {
    name: "Lâm",
    email: "lam@metaecom.vn",
    tag: "⚔️ Zoro",
    scope: "CONTENT_DESIGN",
    hex: "#2563eb",
    color: "bg-sky-500/20 text-sky-200 border-sky-400/40",
  },
  {
    name: "Vy",
    email: "vy@metaecom.vn",
    tag: "🌸 Robin",
    scope: "CONTENT_EDIT",
    hex: "#db2777",
    color: "bg-pink-500/20 text-pink-200 border-pink-400/40",
  },
  {
    name: "Cảnh",
    email: "canh@metaecom.vn",
    tag: "🍳 Sanji",
    scope: "CONTENT_EDIT",
    hex: "#0891b2",
    color: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  },
  {
    name: "Mai",
    email: "mai@metaecom.vn",
    tag: "🎨 Mai",
    scope: "MEDIA_DESIGN",
    hex: "#e11d48",
    color: "bg-rose-500/20 text-rose-200 border-rose-400/40",
  },
  {
    name: "Hoàng",
    email: "hoang@metaecom.vn",
    tag: "🎯 Usopp",
    scope: "MEDIA_VIDEO",
    hex: "#ea580c",
    color: "bg-orange-500/20 text-orange-200 border-orange-400/40",
  },
  {
    name: "Tuns",
    email: "tuan.web@metaecom.vn",
    tag: "⚙️ Franky",
    scope: "WEB_ADS",
    hex: "#059669",
    color: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  },
  {
    name: "Tuấn 2k8",
    email: "tuan.support@metaecom.vn",
    tag: "🩺 Chopper",
    scope: "SUPPORT",
    hex: "#65a30d",
    color: "bg-lime-500/20 text-lime-200 border-lime-400/40",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAccount, setPreviewAccount] = useState(DEMO_ACCOUNTS[0]);
  const [previewNonce, setPreviewNonce] = useState(0);

  const showDemoAccounts = process.env.NEXT_PUBLIC_HIDE_DEMO_USERS !== "true";

  async function submitLogin(loginEmail: string, loginPassword: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đăng nhập thất bại.");
        setLoading(false);
        return;
      }

      const target = data.user?.role === "LEADER" ? "/leader" : "/my-work";
      window.location.replace(target);
    } catch {
      setError("Không thể kết nối máy chủ.");
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitLogin(email, password);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071931] via-[#0B2545] to-[#134074] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-12 gap-6 items-stretch">
        {/* Cột trái: Form lên tàu */}
        <div className="md:col-span-6 bg-[#FFFDF7] rounded-3xl shadow-2xl border-2 border-amber-300/60 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center animate-float-slow">
                <StrawHatLogo className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                  Băng Mũ Rơm • Meta Ecom
                </h1>
                <p className="text-xs text-amber-800 font-medium">
                  Hải trình quản lý công việc nội bộ vui vẻ!
                </p>
              </div>
            </div>

            <Pirate3DSoloStage
              name={previewAccount.name}
              scope={previewAccount.scope}
              celebrateNonce={previewNonce}
              caption={`Nhân vật 3D: ${previewAccount.name}`}
              className="h-48 w-full mb-5"
            />

            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Lên tàu ra khơi thôi! ⚓
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Đăng nhập bằng tài khoản thuyền viên để xem hải đồ dự án của bạn.
            </p>

            {error && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1">
                  Tài khoản / Email đăng nhập
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ten@metaecom.vn hoặc tên đăng nhập"
                    className="w-full rounded-xl border border-amber-200 bg-white pl-10 pr-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full rounded-xl border border-amber-200 bg-white pl-10 pr-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-600 hover:to-amber-600 disabled:opacity-60 text-white font-bold py-2.5 px-4 text-sm flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                {loading ? "Đang nhổ neo..." : "Lên tàu Sunny!"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-100 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Hải đồ từng dự án được bảo vệ & phân quyền riêng biệt.</span>
          </div>
        </div>

        {/* Cột phải: Chọn nhanh thành viên băng Mũ Rơm */}
        {showDemoAccounts && (
          <div className="md:col-span-6 bg-[#0E2F56]/90 border-2 border-amber-400/30 backdrop-blur rounded-3xl p-6 text-slate-100 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 py-1 text-xs font-bold text-amber-200 mb-3">
                <Anchor className="w-3.5 h-3.5" />
                Chọn nhanh Thuyền viên (Pass: 123456)
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Trải nghiệm góc nhìn từng thành viên
              </h3>
              <p className="text-xs text-sky-200/80 mb-4 leading-relaxed">
                <strong>Thuyền trưởng</strong> nhìn thấy toàn bộ hạm đội; các <strong>Hoa tiêu</strong> chỉ xem hải đồ dự án mình phụ trách &amp; thanh năng lượng đồng đội.
              </p>

              <div className="space-y-2">
                {DEMO_ACCOUNTS.slice(0, 1).map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={loading}
                    onMouseEnter={() => {
                      setPreviewAccount(acc);
                      setPreviewNonce((n) => n + 1);
                    }}
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword("123456");
                      submitLogin(acc.email, "123456");
                    }}
                    className="w-full text-left rounded-2xl border-2 border-amber-400/40 bg-[#0B2545]/90 hover:bg-[#133A6B] hover:border-amber-300 px-3.5 py-2.5 transition hover:-translate-y-0.5 flex items-center justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate">
                        {acc.name}
                      </div>
                      <div className="text-[11px] text-sky-200/70 truncate">
                        {acc.tag} • {acc.email}
                      </div>
                    </div>
                    <PirateAvatar
                      name={acc.name}
                      color={acc.hex}
                      scope={acc.scope}
                      size="md"
                    />
                  </button>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.slice(1).map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={loading}
                      onMouseEnter={() => {
                        setPreviewAccount(acc);
                        setPreviewNonce((n) => n + 1);
                      }}
                      onClick={() => {
                        setEmail(acc.email);
                        setPassword("123456");
                        submitLogin(acc.email, "123456");
                      }}
                      className="w-full text-left rounded-2xl border border-sky-400/20 bg-[#0B2545]/80 hover:bg-[#133A6B] hover:border-amber-300/60 p-2.5 transition hover:-translate-y-0.5 flex items-center justify-between gap-2.5 cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-amber-200/90 font-semibold truncate">
                          {acc.tag}
                        </div>
                      </div>
                      <PirateAvatar
                        name={acc.name}
                        color={acc.hex}
                        scope={acc.scope}
                        size="md"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-sky-200/50">
              Khi chạy chính thức chỉ cần thêm{" "}
              <code className="text-amber-200">NEXT_PUBLIC_HIDE_DEMO_USERS=true</code>{" "}
              để ẩn danh sách demo này.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
