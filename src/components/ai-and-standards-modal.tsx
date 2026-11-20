"use client";

import { useState } from "react";
import { BookOpenCheck, Bot, KeyRound, X } from "lucide-react";
import { GeminiSettingsPanel } from "@/components/gemini-settings-modal";
import { QcStandardsManagerPanel } from "@/components/qc-standards-manager-modal";
import type { GeminiConfigInfo } from "@/lib/gemini-shared";
import type { SimpleProject } from "@/types/crm";

export type AiAndStandardsTab = "STANDARDS" | "GEMINI";

interface AiAndStandardsModalProps {
  open: boolean;
  initialTab?: AiAndStandardsTab;
  initialConfig: GeminiConfigInfo;
  projects: SimpleProject[];
  onClose: () => void;
  onConfigSaved: (nextConfig: GeminiConfigInfo) => void;
  onStandardsChanged?: (activeCount: number, includeDefaultQc: boolean) => void;
}

/**
 * Popup gộp dành riêng cho Leader:
 * Tab 1: Tài liệu Tiêu chuẩn QC
 * Tab 2: API Key & Model Google Gemini AI
 */
export function AiAndStandardsModal({
  open,
  initialTab = "STANDARDS",
  initialConfig,
  projects,
  onClose,
  onConfigSaved,
  onStandardsChanged,
}: AiAndStandardsModalProps) {
  const [activeTab, setActiveTab] = useState<AiAndStandardsTab>(initialTab);
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (open !== prevOpen || initialTab !== prevInitialTab) {
    setPrevOpen(open);
    setPrevInitialTab(initialTab);
    if (open) setActiveTab(initialTab);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`w-full ${
          activeTab === "STANDARDS" ? "max-w-5xl" : "max-w-xl"
        } rounded-2xl border-2 border-amber-300 bg-white shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 bg-gradient-to-r from-[#0B2545] to-[#13315C] text-white space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Bot className="w-6 h-6 text-amber-300 shrink-0" />
              <div>
                <h3 className="text-base sm:text-lg font-extrabold">
                  Cài đặt Gemini AI &amp; Tiêu chuẩn QC (Chỉ Leader)
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-300">
                  Quản lý API Key, Model và bộ tiêu chí chấm Output dùng chung cho toàn đội ngũ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="inline-flex rounded-xl bg-white/10 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("STANDARDS")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "STANDARDS"
                  ? "bg-amber-300 text-slate-950 shadow-xs"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              Tài liệu Tiêu chuẩn QC ({initialConfig.activeStandardsCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("GEMINI")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                activeTab === "GEMINI"
                  ? "bg-amber-300 text-slate-950 shadow-xs"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              API Key &amp; Model ({initialConfig.model})
            </button>
          </div>
        </div>

        {activeTab === "STANDARDS" ? (
          <QcStandardsManagerPanel
            projects={projects}
            onClose={onClose}
            onStandardsChanged={onStandardsChanged}
          />
        ) : (
          <div className="overflow-y-auto">
            <GeminiSettingsPanel
              key={`${initialConfig.model}-${initialConfig.source}-${initialConfig.maskedKey || ""}`}
              initialConfig={initialConfig}
              onClose={onClose}
              onSaved={onConfigSaved}
              closeOnSave={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
