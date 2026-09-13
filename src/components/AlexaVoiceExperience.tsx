import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, Mic, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import type { AndonCall, AndonLine, AppLanguage, AppTheme, BrandConfig, UserProfile } from "../types";
import { canExecuteVoiceIntent, formatActiveCalls, formatDowntimeSummary, parseVoiceCommand, type ParsedVoiceCommand } from "../hackathon/voiceCommand";

interface AlexaVoiceExperienceProps {
  lines: AndonLine[];
  calls: AndonCall[];
  currentUser: UserProfile;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  theme: AppTheme;
  branding: BrandConfig;
  selectedLineId: string;
  onLineChange: (lineId: string) => void;
  onCreateCall: (call: Omit<AndonCall, "id" | "ticketNo" | "timestamp" | "status">) => Promise<void>;
}

const ENGLISH_EXAMPLES = [
  "Report machine breakdown on line HLA-A, line stop",
  "Show unresolved incidents",
  "Which line has the longest downtime?"
];
const INDONESIAN_EXAMPLES = [
  "Laporkan kerusakan mesin di line HLA-A, line stop",
  "Tampilkan panggilan aktif",
  "Line mana yang downtime paling lama?"
];

type SpeechRecognitionInstance = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onnomatch: (() => void) | null; onresult: ((event: { results: ArrayLike<{ [index: number]: { transcript: string } }> }) => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

export const AlexaVoiceExperience: React.FC<AlexaVoiceExperienceProps> = ({ lines, calls, currentUser, language, onLanguageChange, theme, branding, selectedLineId, onLineChange, onCreateCall }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<ParsedVoiceCommand | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>(() => [
    { role: "assistant", text: language === "id" ? "AndonVoice siap. Saya dapat membuat panggilan Andon dengan konfirmasi atau membacakan status insiden." : "AndonVoice is ready. I can create a controlled Andon call or read current incident status." }
  ]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeLine = lines.find((line) => line.id === selectedLineId) || lines[0];
  const examples = language === "id" ? INDONESIAN_EXAMPLES : ENGLISH_EXAMPLES;
  const appName = branding.customAppName || "AndonVoice AI";
  const supported = useMemo(() => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window), []);

  useEffect(() => () => { recognitionRef.current?.abort(); recognitionRef.current = null; }, []);

  const respond = (transcript: string) => {
    const parsed = parseVoiceCommand(transcript, lines, { language, activeLine, workstation: activeLine?.workstations[0] });
    let response = parsed.response;
    if (!canExecuteVoiceIntent(currentUser.role, parsed.intent)) response = language === "id" ? "Role pengguna saat ini tidak memiliki wewenang untuk tindakan tersebut." : "Your current role is not authorized for that action.";
    else if (parsed.intent === "set_language" && parsed.targetLanguage) onLanguageChange(parsed.targetLanguage);
    else if (parsed.intent === "select_line" && parsed.lineId) onLineChange(parsed.lineId);
    else if (parsed.intent === "list_active") response = formatActiveCalls(calls, language);
    else if (parsed.intent === "downtime_summary") response = formatDowntimeSummary(calls, Date.now(), language);
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
    setMessages((prev) => [...prev, { role: "assistant", text: language === "id" ? `Dikonfirmasi. Panggilan Andon untuk ${pending.lineName} sekarang aktif dan tercatat.` : `Confirmed. The Andon call for ${pending.lineName} is now active and traceable.` }]);
    setPending(null);
  };

  const addAssistantMessage = (text: string) => setMessages((prev) => [...prev, { role: "assistant", text }]);

  const startListening = async () => {
    if (!supported) { addAssistantMessage("Voice recognition is not supported here. Open this HTTPS page in Google Chrome or Microsoft Edge, or use the text command field."); return; }
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      addAssistantMessage(language === "id" ? "Izin mikrofon ditolak. Klik ikon kunci di address bar, izinkan Microphone, lalu coba lagi." : "Microphone permission was denied. Allow Microphone from the address-bar site settings, then try again.");
      return;
    }
    recognitionRef.current?.abort();
    const Recognition = (window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = language === "id" ? "id-ID" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onnomatch = () => addAssistantMessage(language === "id" ? "Suara terdengar, tetapi perintah belum dikenali. Coba bicara lebih dekat dan sebutkan nama line." : "I heard audio but could not recognize the command. Try again and include the production line.");
    recognition.onerror = (event) => {
      setListening(false); recognitionRef.current = null;
      const message = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? (language === "id" ? "Akses mikrofon diblokir oleh browser. Izinkan Microphone untuk situs ini." : "Microphone access is blocked by the browser. Allow it for this site.")
        : event.error === "no-speech"
          ? (language === "id" ? "Tidak ada suara yang terdeteksi. Tekan mikrofon dan mulai bicara setelah indikator merah muncul." : "No speech was detected. Start speaking after the microphone turns red.")
          : (language === "id" ? `Pengenalan suara gagal (${event.error || "unknown"}). Kamu tetap bisa memakai kolom teks.` : `Voice recognition failed (${event.error || "unknown"}). You can still use the text command field.`);
      addAssistantMessage(message);
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || "").join(" ").trim();
      if (transcript) respond(transcript);
    };
    try { recognition.start(); }
    catch { recognitionRef.current = null; setListening(false); addAssistantMessage(language === "id" ? "Mikrofon masih aktif. Tunggu sebentar lalu coba kembali." : "The microphone is already active. Wait a moment and try again."); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-700 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-cyan-900/30 hover:scale-[1.02] transition-transform">
      <Sparkles className="h-5 w-5" /> Alexa+ Experience
    </button>
  );

  return (
    <aside className={`fixed bottom-5 right-5 z-50 flex h-[650px] max-h-[86vh] w-[440px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border shadow-2xl shadow-black/50 ${theme === "dark" ? "border-cyan-400/30 bg-slate-950 text-white" : "border-cyan-600/25 bg-white text-slate-900"}`}>
      <header className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-cyan-950 to-blue-950 px-5 py-4">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-cyan-400/15 p-2"><Bot className="h-5 w-5 text-cyan-300" /></div><div><p className="font-black">{appName} · Voice</p><p className="text-xs text-cyan-200">{language === "id" ? "Asisten operasional Alexa+" : "Alexa+ operations assistant"}</p></div></div>
        <button aria-label="Close voice experience" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10"><X className="h-5 w-5" /></button>
      </header>
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-5 py-3 text-xs text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-400" /> {language === "id" ? "Konfirmasi manusia melindungi setiap tindakan perubahan data" : "Human confirmation protects every write action"}</div>
      <div className={`grid grid-cols-3 gap-2 border-b px-4 py-3 text-[11px] ${theme === "dark" ? "border-white/10 bg-white/[.02] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
        <label className="col-span-3 font-bold"><span className="mr-2">{language === "id" ? "Line aktif" : "Active line"}</span><select value={activeLine?.id || ""} onChange={(event) => onLineChange(event.target.value)} className={`rounded-lg border px-2 py-1 ${theme === "dark" ? "border-white/10 bg-slate-900" : "border-slate-300 bg-white"}`}>{lines.map(line => <option key={line.id} value={line.id}>{line.shortCode}</option>)}</select></label>
        <span><b>{language === "id" ? "Shift" : "Shift"}</b><br/>{activeLine?.currentShift || "-"}</span>
        <span><b>Role</b><br/>{currentUser.role}</span>
        <span><b>{language === "id" ? "Stasiun" : "Station"}</b><br/>{activeLine?.workstations[0] || "-"}</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message, index) => <div key={index} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "ml-auto bg-blue-600 text-white" : theme === "dark" ? "bg-white/10 text-slate-100" : "bg-slate-100 text-slate-800"}`}>{message.text}</div>)}
        {pending && <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4"><p className="text-xs font-bold uppercase tracking-widest text-amber-300">Confirmation required</p><p className="mt-2 text-sm">{pending.response}</p><div className="mt-3 flex gap-2"><button onClick={confirmCall} className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950"><Check className="h-4 w-4" /> Confirm call</button><button onClick={() => setPending(null)} className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold">Cancel</button></div></div>}
      </div>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">{examples.map((example) => <button key={example} onClick={() => respond(example)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] hover:border-cyan-400/50 ${theme === "dark" ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{example}</button>)}</div>
        {listening && <p className="mb-2 animate-pulse text-xs font-bold text-red-300">● {language === "id" ? "Mendengarkan… silakan bicara" : "Listening… speak now"}</p>}
        <div className="flex gap-2"><button title={supported ? "Speak" : "Speech recognition requires Chrome or Edge"} onClick={listening ? () => recognitionRef.current?.stop() : startListening} className={`rounded-xl p-3 ${listening ? "bg-red-500 ring-4 ring-red-500/20" : "bg-white/10"}`}><Mic className="h-5 w-5" /></button><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && input.trim()) respond(input); }} placeholder={language === "id" ? "Katakan atau ketik perintah Andon…" : "Ask Alexa+ about the shop floor..."} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-cyan-400" /><button onClick={() => input.trim() && respond(input)} className="rounded-xl bg-cyan-500 p-3 text-slate-950"><Send className="h-5 w-5" /></button></div>
      </div>
    </aside>
  );
};
