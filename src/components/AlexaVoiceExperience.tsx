import React, { useMemo, useState } from "react";
import { Bot, Check, Mic, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import type { AndonCall, AndonLine, UserProfile } from "../types";
import { canExecuteVoiceIntent, formatActiveCalls, formatDowntimeSummary, parseVoiceCommand, type ParsedVoiceCommand } from "../hackathon/voiceCommand";

interface AlexaVoiceExperienceProps {
  lines: AndonLine[];
  calls: AndonCall[];
  currentUser: UserProfile;
  onCreateCall: (call: Omit<AndonCall, "id" | "ticketNo" | "timestamp" | "status">) => Promise<void>;
}

const EXAMPLES = [
  "Report machine breakdown on line HLA-A, line stop",
  "Show unresolved incidents",
  "Which line has the longest downtime?"
];

export const AlexaVoiceExperience: React.FC<AlexaVoiceExperienceProps> = ({ lines, calls, currentUser, onCreateCall }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<ParsedVoiceCommand | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "AndonVoice is ready. I can create a controlled Andon call or read current incident status." }
  ]);
  const [listening, setListening] = useState(false);
  const supported = useMemo(() => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window), []);

  const respond = (transcript: string) => {
    const parsed = parseVoiceCommand(transcript, lines);
    let response = parsed.response;
    if (!canExecuteVoiceIntent(currentUser.role, parsed.intent)) response = "Your current role is not authorized for that action.";
    else if (parsed.intent === "list_active") response = formatActiveCalls(calls);
    else if (parsed.intent === "downtime_summary") response = formatDowntimeSummary(calls);
    setMessages((prev) => [...prev, { role: "user", text: transcript }, { role: "assistant", text: response }]);
    setPending(parsed.requiresConfirmation ? parsed : null);
    setInput("");
  };

  const confirmCall = async () => {
    if (!pending?.lineId || !pending.lineName || !pending.category || !pending.severity) return;
    await onCreateCall({
      lineId: pending.lineId,
      lineName: pending.lineName,
      workstation: pending.workstation || "Operator Station",
      category: pending.category,
      severity: pending.severity,
      isLineStopped: pending.severity === "critical_line_stop",
      operatorName: currentUser.name,
      operatorId: currentUser.badgeId,
      description: pending.description || pending.transcript
    });
    setMessages((prev) => [...prev, { role: "assistant", text: `Confirmed. The Andon call for ${pending.lineName} is now active and traceable.` }]);
    setPending(null);
  };

  const startListening = () => {
    if (!supported) return;
    const Recognition = (window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: any) => respond(event.results[0][0].transcript);
    recognition.start();
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-cyan-900/30 hover:scale-[1.02] transition-transform">
      <Sparkles className="h-5 w-5" /> Alexa+ Experience
    </button>
  );

  return (
    <aside className="fixed bottom-5 right-5 z-50 flex h-[620px] max-h-[82vh] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-cyan-400/30 bg-slate-950 text-white shadow-2xl shadow-black/50">
      <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-cyan-950 to-blue-950 px-5 py-4">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-cyan-400/15 p-2"><Bot className="h-5 w-5 text-cyan-300" /></div><div><p className="font-black">AndonVoice AI</p><p className="text-xs text-cyan-200">Alexa+ simulated experience</p></div></div>
        <button aria-label="Close voice experience" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X className="h-5 w-5" /></button>
      </header>
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-5 py-3 text-xs text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Human confirmation protects every write action</div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message, index) => <div key={index} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "ml-auto bg-blue-600" : "bg-white/10 text-slate-100"}`}>{message.text}</div>)}
        {pending && <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4"><p className="text-xs font-bold uppercase tracking-widest text-amber-300">Confirmation required</p><p className="mt-2 text-sm">{pending.response}</p><div className="mt-3 flex gap-2"><button onClick={confirmCall} className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950"><Check className="h-4 w-4" /> Confirm call</button><button onClick={() => setPending(null)} className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold">Cancel</button></div></div>}
      </div>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{EXAMPLES.map((example) => <button key={example} onClick={() => respond(example)} className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 hover:border-cyan-400/50">{example}</button>)}</div>
        <div className="flex gap-2"><button title={supported ? "Speak" : "Speech recognition is not supported in this browser"} onClick={startListening} disabled={!supported} className={`rounded-xl p-3 ${listening ? "bg-red-500" : "bg-white/10"} disabled:opacity-40`}><Mic className="h-5 w-5" /></button><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && input.trim()) respond(input); }} placeholder="Ask Alexa+ about the shop floor..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-cyan-400" /><button onClick={() => input.trim() && respond(input)} className="rounded-xl bg-cyan-500 p-3 text-slate-950"><Send className="h-5 w-5" /></button></div>
      </div>
    </aside>
  );
};
