import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Database,
  HelpCircle,
  PhoneCall,
  Tv,
  Wrench,
} from "lucide-react";
import { AppLanguage, AppTheme } from "../types";

interface WorkflowGuideProps {
  theme: AppTheme;
  language: AppLanguage;
  onOpenOperator: () => void;
}

export const WorkflowGuide: React.FC<WorkflowGuideProps> = ({ theme, language, onOpenOperator }) => {
  const [open, setOpen] = useState(true);
  const isLight = theme === "light";
  const isEn = language === "en";

  const steps = [
    {
      icon: PhoneCall,
      title: isEn ? "Operator" : "Operator",
      desc: isEn ? "Send an Andon call for the selected line and problem category." : "Kirim panggilan Andon sesuai line dan kategori masalah.",
      tone: "text-amber-600 bg-amber-500/15",
    },
    {
      icon: Tv,
      title: "Andon",
      desc: isEn ? "The active call appears on the Andon board with its current status." : "Panggilan aktif tampil di Andon Board beserta statusnya.",
      tone: "text-red-600 bg-red-500/15",
    },
    {
      icon: Wrench,
      title: isEn ? "Responder" : "Responder",
      desc: isEn ? "Responder handles the call and updates the handling status." : "Responder menangani panggilan dan memperbarui status penanganan.",
      tone: "text-blue-600 bg-blue-500/15",
    },
    {
      icon: Database,
      title: isEn ? "History" : "Riwayat",
      desc: isEn ? "Resolved calls remain available as handling history." : "Panggilan yang selesai tersimpan sebagai riwayat penanganan.",
      tone: "text-emerald-600 bg-emerald-500/15",
    },
  ];

  return (
    <section className={`border rounded-2xl p-4 sm:p-5 shadow-sm ${isLight ? "bg-slate-50/80 border-slate-200 text-slate-900" : "bg-neutral-900/90 border-neutral-800 text-neutral-100"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isLight ? "bg-amber-100 text-amber-800" : "bg-amber-500/20 text-amber-400"}`}>
            <HelpCircle className="w-4 h-4" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold">{isEn ? "Workflow" : "Alur Andon"}</h3>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className={`text-xs font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1 border ${isLight ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-700" : "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-300"}`}>
          <span>{open ? (isEn ? "Close" : "Tutup") : (isEn ? "Open" : "Buka")}</span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-neutral-800">
          {steps.map(({ icon: Icon, title, desc, tone }, index) => (
            <div key={title} className={`p-3 rounded-xl border ${isLight ? "bg-white border-slate-200/80" : "bg-neutral-950 border-neutral-800/80"}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${tone}`}><Icon className="w-3.5 h-3.5" /></div>
                <span className="text-xs font-bold">{index + 1}. {title}</span>
              </div>
              <p className={`text-[11px] leading-relaxed ${isLight ? "text-slate-600" : "text-neutral-400"}`}>{desc}</p>
              {index === 0 && (
                <button type="button" onClick={onOpenOperator} className="mt-2.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline">
                  {isEn ? "Open Operator" : "Buka Operator"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
