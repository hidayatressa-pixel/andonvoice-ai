import React, { useEffect, useState } from "react";
import { Activity, Bot, CheckCircle2, Cpu, Play, ShieldCheck, X, Zap } from "lucide-react";

interface Props { onRunScenario: () => void; }

export const HackathonDemoCenter: React.FC<Props> = ({ onRunScenario }) => {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState<"checking" | "online" | "static">("checking");
  useEffect(() => { if (!open) return; fetch("/api/health").then(r => setHealth(r.ok ? "online" : "static")).catch(() => setHealth("static")); }, [open]);

  if (!open) return <button onClick={() => setOpen(true)} className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-2xl border border-indigo-300/30 bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-2xl hover:scale-[1.02] transition-transform"><Zap className="h-5 w-5 text-amber-300" /> Guided Demo</button>;
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/80 p-4 backdrop-blur-sm">
    <section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-6 py-5 backdrop-blur"><div><p className="text-xs font-black uppercase tracking-[.25em] text-cyan-300">Amazon Developer Hackathon</p><h2 className="mt-1 text-2xl font-black">AndonVoice AI Guided Experience</h2></div><button onClick={() => setOpen(false)} aria-label="Close demo center" className="rounded-xl p-2 hover:bg-white/10"><X /></button></header>
      <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          <div className="rounded-3xl bg-gradient-to-br from-cyan-500/15 to-blue-600/10 p-6 ring-1 ring-cyan-400/20"><h3 className="text-xl font-black">Stop a factory problem from becoming hidden downtime.</h3><p className="mt-2 text-sm leading-6 text-slate-300">An operator speaks naturally. Alexa+ extracts safe intent. A human confirms the write. MCP creates one traceable incident and every operational screen sees it.</p><button onClick={() => { onRunScenario(); setOpen(false); }} className="mt-5 flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950"><Play className="h-4 w-4" /> Run 60-second line-stop scenario</button></div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[{n:"01",t:"Speak",d:"Report a machine fault on HLA-A."},{n:"02",t:"Confirm",d:"Human approval prevents silent writes."},{n:"03",t:"Respond",d:"The same incident appears across MCP and dashboard."}].map(s=><div key={s.n} className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><span className="text-xs font-black text-cyan-300">{s.n}</span><p className="mt-2 font-black">{s.t}</p><p className="mt-1 text-xs leading-5 text-slate-400">{s.d}</p></div>)}
          </div>
          <div className="rounded-2xl border border-white/10 p-5"><h3 className="font-black">Safety is part of the product</h3><div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">{["Explicit confirmation on writes","Duplicate-call interlock","Role-controlled incident closure","Fictional factory demo data"].map(x=><div key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{x}</div>)}</div></div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><div className="flex items-center justify-between"><h3 className="font-black">Live readiness</h3><span className={`rounded-full px-3 py-1 text-xs font-bold ${health==="online"?"bg-emerald-400/15 text-emerald-300":"bg-amber-400/15 text-amber-300"}`}>{health==="checking"?"Checking…":health==="online"?"Backend + MCP online":"Static simulator mode"}</span></div><div className="mt-4 space-y-3 text-sm">{[[Bot,"Alexa+ simulated experience"],[Cpu,"MCP Streamable HTTP 2025-11-25"],[Activity,"Unified incident workflow"],[ShieldCheck,"Human-in-the-loop controls"]].map(([Icon,label])=><div key={String(label)} className="flex items-center gap-3 rounded-xl bg-white/5 p-3"><Icon className="h-5 w-5 text-cyan-300" />{String(label)}</div>)}</div></div>
          <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-5"><h3 className="font-black">4M1E intelligence</h3><p className="mt-2 text-sm leading-6 text-slate-300">Amazon Bedrock can generate evidence-based hypotheses and containment questions. A deterministic engine keeps judging reliable when cloud credentials are absent.</p></div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 text-sm text-amber-100"><strong>Important:</strong> AndonVoice is decision support—not a certified emergency control or an autonomous maintenance authority.</div>
        </div>
      </div>
    </section>
  </div>;
};
