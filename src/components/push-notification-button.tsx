"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Smartphone, Send, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/components/toast-provider";

const emptySubscribe = () => () => {};
function useCanUseWebPush(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
    () => false
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationButton({ compact = false }: { compact?: boolean }) {
  const { showToast } = useToast();
  const supported = useCanUseWebPush();
  const [subscribed, setSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (supported) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setSubscribed(Boolean(sub)))
        .catch(() => {});
    }

    fetch("/api/push/subscribe")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.subscribedCount === "number") {
          setSubCount(data.subscribedCount);
        }
      })
      .catch(() => {});
  }, [supported]);

  async function enablePush() {
    if (!supported) {
      setGuideOpen(true);
      return;
    }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast(
          "Trình duyệt đang chặn thông báo. Hãy bật cho phép Notification trong cài đặt.",
          "error"
        );
        setGuideOpen(true);
        return;
      }

      const keyRes = await fetch("/api/push/subscribe");
      const keyData = await keyRes.json();
      if (!keyRes.ok || !keyData.publicKey) {
        showToast("Không lấy được khóa VAPID Push.", "error");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(keyData.publicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const saveData = await saveRes.json();
      if (saveRes.ok) {
        setSubscribed(true);
        setSubCount(saveData.subscribedCount || 1);
        showToast("Đã bật thông báo công việc trên thiết bị này!");
      }
    } catch (err) {
      console.error("Push subscribe failed:", err);
      showToast("Không bật được Push. Xem hướng dẫn PWA cho điện thoại.", "error");
      setGuideOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const endpoint = sub?.endpoint;
      if (sub) await sub.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      setSubscribed(false);
      setSubCount(0);
      showToast("Đã tắt thông báo Push trên thiết bị này.");
    } finally {
      setLoading(false);
    }
  }

  async function sendTestPush() {
    setLoading(true);
    try {
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TEST_PUSH" }),
      });
      const data = await res.json();
      if (res.ok && data.sent > 0) {
        showToast(`Đã gửi thử Push tới ${data.sent} thiết bị!`);
      } else {
        showToast(
          "Chưa có thiết bị nào đăng ký Push. Bấm Bật chuông điện thoại trước nhé.",
          "error"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => (subscribed ? setGuideOpen(true) : enablePush())}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition cursor-pointer ${
            subscribed
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              : "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100"
          }`}
          title="Bật thông báo PWA miễn phí về điện thoại / máy tính"
        >
          {subscribed ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <Smartphone className="w-3.5 h-3.5" />
          )}
          {compact ? (
            <span>{subscribed ? "Đã bật Push" : "Bật Push ĐT"}</span>
          ) : (
            <span>
              {subscribed
                ? `Chuông ĐT đã bật (${subCount})`
                : "Bật chuông điện thoại"}
            </span>
          )}
        </button>
      </div>

      {guideOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setGuideOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0B2545] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Smartphone className="w-4 h-4 text-amber-300" />
                Thông báo Điện thoại PWA (Miễn phí 100%)
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1">
                <div className="font-bold text-amber-900">
                  📱 Cách nhận thông báo ngoài màn hình khóa:
                </div>
                <p>
                  • <strong>Android (Chrome):</strong> Bấm nút{" "}
                  <em>&ldquo;Bật thông báo ngay&rdquo;</em> bên dưới (có thể chọn Thêm vào
                  Màn hình chính).
                </p>
                <p>
                  • <strong>iPhone (iOS 16.4+ Safari):</strong> Bấm biểu tượng{" "}
                  <strong>Chia sẻ (⬆️)</strong> $\rightarrow${" "}
                  <strong>Thêm vào Màn hình chính</strong> $\rightarrow$ Mở app từ màn hình chính rồi bấm <em>Bật thông báo ngay</em>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {!subscribed ? (
                  <button
                    type="button"
                    disabled={loading || !supported}
                    onClick={enablePush}
                    className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    Bật thông báo ngay
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={sendTestPush}
                      className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Gửi test về máy
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={disablePush}
                      className="rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 px-3 py-2.5 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <BellOff className="w-3.5 h-3.5" />
                      Tắt máy này
                    </button>
                  </>
                )}
              </div>
              {!supported && (
                <p className="text-[11px] text-rose-600 font-medium">
                  Trình duyệt hiện tại chưa hỗ trợ Web Push (trên iOS bạn cần mở qua
                  icon đã &ldquo;Thêm vào Màn hình chính&rdquo;).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
