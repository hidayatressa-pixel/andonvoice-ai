import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Languages, Lock, MapPin, User } from "lucide-react";
import { UserProfile, AndonLine, AppTheme, AppLanguage } from "../types";
import { saveSession, DEFAULT_USERS } from "../utils/auth";
import { subscribeMasterOperators, logActivity, IS_DEMO_MODE } from "../lib/firestoreService";
import { AppLogo } from "./Logo";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { sanitizeIdentifier, safeLocalStorageSet } from "../utils/sanitizer";

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  theme: AppTheme;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  lines: AndonLine[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, theme, language, setLanguage, lines }) => {
  const [badgeIdOrName, setBadgeIdOrName] = useState("");
  const [selectedLineId, setSelectedLineId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [dbOperators, setDbOperators] = useState<UserProfile[]>([]);
  const isLight = theme === "light";

  useEffect(() => {
    const unsub = subscribeMasterOperators(setDbOperators);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (lines.length > 0 && !selectedLineId) setSelectedLineId(lines[0].id);
    if (lines.length === 0) setSelectedLineId("");
  }, [lines, selectedLineId]);

  const allUsers = useMemo(() => {
    const users = [...dbOperators];
    DEFAULT_USERS.forEach((defaultUser) => {
      const exists = users.some((u) => u.badgeId?.toLowerCase() === defaultUser.badgeId?.toLowerCase() || u.email?.toLowerCase() === defaultUser.email?.toLowerCase());
      if (!exists) users.push(defaultUser);
    });
    return users;
  }, [dbOperators]);

  const identityMatch = useMemo(() => {
    const input = badgeIdOrName.trim().toLowerCase();
    if (!input) return undefined;
    return allUsers.find((usr) => usr.id?.toLowerCase() === input || usr.badgeId?.toLowerCase() === input || usr.name?.toLowerCase() === input || usr.email?.toLowerCase() === input);
  }, [badgeIdOrName, allUsers]);

  const adminIdentity = identityMatch?.role === "admin";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    const inputClean = badgeIdOrName.trim();
    if (!inputClean) return setErrorMessage(language === "en" ? "NPK, Email, or Badge ID is required." : "NPK, Email, atau Badge ID diperlukan.");

    let matchedUser: UserProfile | undefined;
    if (IS_DEMO_MODE) {
      matchedUser = allUsers.find((usr) => {
        const input = inputClean.toLowerCase();
        const identityOk = usr.id?.toLowerCase() === input || usr.badgeId?.toLowerCase() === input || usr.name?.toLowerCase() === input || usr.email?.toLowerCase() === input;
        return identityOk && password === (usr.pin || "1234");
      });
    } else {
      try {
        if (!inputClean.includes("@")) return setErrorMessage(language === "en" ? "Firebase account email required." : "Email akun Firebase diperlukan.");
        const credential = await signInWithEmailAndPassword(auth, inputClean.toLowerCase(), password);
        const fbUser = credential.user;
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../lib/firebase");
        const snap = await getDoc(doc(db, "master_operators", fbUser.uid));
        if (!snap.exists()) {
          await auth.signOut();
          return setErrorMessage(language === "en" ? "Smart Andon profile not found." : "Profil Smart Andon tidak ditemukan.");
        }
        const profile = snap.data() as UserProfile;
        matchedUser = { ...profile, id: fbUser.uid, email: fbUser.email || profile.email || "", pin: undefined };
      } catch (err) {
        console.error("Firebase Auth login failed:", err);
        return setErrorMessage(language === "en" ? "Invalid email or password." : "Email atau password salah.");
      }
    }

    if (!matchedUser) return setErrorMessage(language === "en" ? "Invalid credentials." : "Kredensial salah.");

    const isAdmin = matchedUser.role === "admin";
    let activeLineId = "";
    if (!isAdmin) {
      if (lines.length === 0) {
        if (!IS_DEMO_MODE) await auth.signOut();
        return setErrorMessage(language === "en" ? "Master Line unavailable." : "Master Line belum tersedia.");
      }
      if (!selectedLineId) {
        if (!IS_DEMO_MODE) await auth.signOut();
        return setErrorMessage(language === "en" ? "Production line required." : "Line produksi diperlukan.");
      }
      const sanitized = sanitizeIdentifier(selectedLineId);
      if (!lines.some((line) => line.id === sanitized)) {
        if (!IS_DEMO_MODE) await auth.signOut();
        return setErrorMessage(language === "en" ? "Invalid production line." : "Line produksi tidak valid.");
      }
      const access = matchedUser.lineAccess || [];
      if (!(access.includes("*") || access.includes(sanitized))) {
        if (!IS_DEMO_MODE) await auth.signOut();
        return setErrorMessage(language === "en" ? "No access to this line." : "Tidak memiliki akses ke line ini.");
      }
      activeLineId = sanitized;
      safeLocalStorageSet("andon_active_login_line_id", activeLineId);
    } else {
      localStorage.removeItem("andon_active_login_line_id");
    }

    const sessionUser: UserProfile = { ...matchedUser };
    saveSession(sessionUser);
    logActivity("login", `User Login: ${sessionUser.name}`, isAdmin ? "Masuk sebagai ADMIN tanpa konteks Line." : `Masuk sebagai ${sessionUser.role.toUpperCase()} di Line ${activeLineId}.`, { name: sessionUser.name, id: sessionUser.badgeId, role: sessionUser.role });
    onLoginSuccess(sessionUser);
  };

  const inputClass = `w-full rounded-xl pl-9 pr-3 py-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-amber-500 ${isLight ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" : "bg-neutral-950 border-neutral-800 text-white focus:bg-neutral-900"}`;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative ${isLight ? "bg-slate-50" : "bg-neutral-950"}`}>
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className={`w-full max-w-md border rounded-3xl p-8 space-y-6 shadow-2xl relative z-10 ${isLight ? "bg-white border-slate-200" : "bg-neutral-900 border-neutral-800"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><AppLogo size={32} theme={theme} /><span className={`text-[10px] font-black tracking-widest uppercase ${isLight ? "text-slate-500" : "text-neutral-400"}`}>ANDON SYSTEM</span></div>
          <button type="button" onClick={() => setLanguage(language === "id" ? "en" : "id")} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-neutral-800 text-neutral-200 border-neutral-700"}`}><Languages className="w-3 h-3" />{language === "id" ? "ID" : "EN"}</button>
        </div>
        <h2 className={`text-xl font-black ${isLight ? "text-slate-900" : "text-white"}`}>Smart Andon</h2>
        {errorMessage && <div className="p-3.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-semibold">{errorMessage}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div><label className={`block text-xs font-bold mb-1.5 uppercase ${isLight ? "text-slate-700" : "text-neutral-300"}`}>NPK / User ID / Email</label><div className="relative"><User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" required value={badgeIdOrName} onChange={(e) => setBadgeIdOrName(e.target.value)} className={inputClass} /></div></div>
          {!adminIdentity && <div><label className={`block text-xs font-bold mb-1.5 uppercase ${isLight ? "text-slate-700" : "text-neutral-300"}`}>Line</label><div className="relative"><MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><select required={lines.length > 0} disabled={lines.length === 0} value={selectedLineId} onChange={(e) => setSelectedLineId(e.target.value)} className={`${inputClass} appearance-none disabled:opacity-60`}>{lines.length === 0 ? <option value="">{language === "id" ? "Master Line belum tersedia" : "Master Line unavailable"}</option> : lines.map((line) => <option key={line.id} value={line.id}>{line.name} ({line.id})</option>)}</select></div></div>}
          <div><label className={`block text-xs font-bold mb-1.5 uppercase ${isLight ? "text-slate-700" : "text-neutral-300"}`}>Password / PIN</label><div className="relative"><Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••" /></div></div>
          <button type="submit" className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 group">{language === "id" ? "Masuk" : "Sign In"}<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></button>
        </form>
        <div className={`pt-4 border-t text-center text-[10px] font-bold tracking-wider uppercase ${isLight ? "border-slate-100 text-slate-400" : "border-neutral-800 text-neutral-500"}`}>&copy; {new Date().getFullYear()} {import.meta.env.VITE_APP_COMPANY || "Your Company"} &bull; v{import.meta.env.VITE_APP_VERSION || "1.0.0"}</div>
      </div>
    </div>
  );
};