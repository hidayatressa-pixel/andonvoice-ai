import React, { useState, useEffect } from "react";
import { Tv, PhoneCall, Wrench, Map, BarChart3, Volume2, VolumeX, Maximize, Minimize, Settings, Flame, Layers, History, LogOut, ShieldCheck, Sun, Moon, Eye } from "lucide-react";
import { ActiveTab, AndonCall, SoundConfig, UserProfile, UserRole, AppTheme, AppLanguage, BrandConfig } from "../types";
import { getTranslation, TranslationKey } from "../utils/i18n";
import { canResolveAndon, canManageMasterData } from "../utils/permissions";
import { AppLogo } from "./Logo";
import { loadSavedBranding } from "../utils/branding";

interface HeaderProps { activeTab: ActiveTab; setActiveTab: (tab: ActiveTab) => void; activeCalls: AndonCall[]; soundConfig: SoundConfig; setSoundConfig: (config: SoundConfig) => void; currentUser: UserProfile | null; previewRole?: UserRole; onOpenLogin: () => void; onLogout: () => void; onOpenConfig: () => void; onSimulateEmergency: () => void; theme: AppTheme; setTheme: (theme: AppTheme) => void; language: AppLanguage; setLanguage: (lang: AppLanguage) => void; }

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, activeCalls, soundConfig, setSoundConfig, currentUser, previewRole, onOpenLogin, onLogout, onOpenConfig, theme, setTheme, language, setLanguage }) => {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [branding, setBranding] = useState<BrandConfig>(loadSavedBranding);
  const t = (key: TranslationKey, params?: Record<string, string | number>) => getTranslation(language, key, params);
  const isLight = theme === "light";
  const isActualAdmin = currentUser?.role === "admin";
  const viewUser = currentUser && isActualAdmin && previewRole ? { ...currentUser, role: previewRole } : currentUser;
  const isOperator = viewUser?.role === "operator";
  const isLeader = canResolveAndon(viewUser);
  const isAdminView = canManageMasterData(viewUser);

  useEffect(() => { const h=(e:Event)=>setBranding((e as CustomEvent<BrandConfig>).detail || loadSavedBranding()); window.addEventListener("andon_brand_change",h); return()=>window.removeEventListener("andon_brand_change",h); },[]);
  useEffect(() => { const update=()=>{const now=new Date(); const locale=language==="id"?"id-ID":"en-US"; setCurrentTime(now.toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false})); setCurrentDate(now.toLocaleDateString(locale,{weekday:"short",day:"numeric",month:"short",year:"numeric"}));}; update(); const i=setInterval(update,1000); return()=>clearInterval(i);},[language]);
  const toggleFullscreen=()=>{if(!document.fullscreenElement){document.documentElement.requestFullscreen().catch(()=>{});setIsFullscreen(true);}else{document.exitFullscreen?.().catch(()=>{});setIsFullscreen(false);}};
  const lineStopCount=activeCalls.filter(c=>c.isLineStopped&&c.status!=="resolved").length;
  const totalActiveCalls=activeCalls.filter(c=>c.status!=="resolved").length;
  const navClass=(tab:ActiveTab)=>`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${activeTab===tab?(isLight?"bg-white text-slate-900 font-bold shadow-sm border border-slate-200":"bg-neutral-800 text-white font-bold shadow-sm border border-neutral-700"):(isLight?"text-slate-600 hover:text-slate-900 hover:bg-white/50":"text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900")}`;
  return <header className={`sticky top-0 z-40 select-none transition-colors border-b shadow-sm ${isLight?"bg-white border-slate-200 text-slate-800":"bg-neutral-900 border-neutral-800 text-neutral-100"}`}>
    {lineStopCount>0&&<div className="bg-red-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center gap-2 animate-pulse"><Flame className="w-4 h-4"/><span>{lineStopCount} LINE STOP</span></div>}
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><AppLogo size={branding.logoHeight||34} theme={theme}/><div className="h-6 w-px bg-slate-200 dark:bg-neutral-800 hidden sm:block"/><h1 className={`font-black text-xs sm:text-sm tracking-tight ${isLight?"text-slate-900":"text-white"}`}>{branding.customAppName||"ANDON SMART FACTORY"}</h1></div>
      <nav className={`flex items-center p-1 rounded-2xl border text-xs font-medium overflow-x-auto max-w-full ${isLight?"bg-slate-100/90 border-slate-200":"bg-neutral-950 border-neutral-800"}`}>
        {(isAdminView||isLeader)&&<button id="tab-main-board" onClick={()=>setActiveTab("main_board")} className={navClass("main_board")}><Tv className="w-3.5 h-3.5 text-cyan-500"/><span>{t("tabMainBoard")}</span>{totalActiveCalls>0&&<span className="bg-red-600 text-white text-[10px] px-1.5 rounded-full font-bold">{totalActiveCalls}</span>}</button>}
        {(isAdminView||isOperator||viewUser?.role==="manager")&&<button id="tab-operator-call" onClick={()=>setActiveTab("operator_call")} className={navClass("operator_call")}><PhoneCall className="w-3.5 h-3.5 text-amber-500"/><span>{t("tabOperatorCall")}</span></button>}
        {(isAdminView||isLeader)&&<button id="tab-responder-terminal" onClick={()=>setActiveTab("responder_terminal")} className={navClass("responder_terminal")}><Wrench className="w-3.5 h-3.5 text-blue-500"/><span>{t("tabResponderTerminal")}</span>{totalActiveCalls>0&&<span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 rounded-full font-bold">{totalActiveCalls}</span>}</button>}
        {(isAdminView||isLeader)&&<button id="tab-plant-map" onClick={()=>setActiveTab("plant_map")} className={navClass("plant_map")}><Map className="w-3.5 h-3.5 text-emerald-500"/><span>{t("tabPlantMap")}</span></button>}
        {isAdminView&&<button id="tab-admin-dashboard" onClick={()=>setActiveTab("admin_dashboard")} className={navClass("admin_dashboard")}><ShieldCheck className="w-3.5 h-3.5 text-rose-500"/><span>Admin</span></button>}
        {isAdminView&&<button id="tab-master-data" onClick={()=>setActiveTab("master_data")} className={navClass("master_data")}><Layers className="w-3.5 h-3.5 text-cyan-600"/><span>{t("tabMasterData")}</span></button>}
        {(isAdminView||isLeader)&&<button id="tab-activity-logs" onClick={()=>setActiveTab("activity_logs")} className={navClass("activity_logs")}><History className="w-3.5 h-3.5 text-amber-500"/><span>{t("tabActivityLogs")}</span></button>}
        {(isAdminView||isLeader)&&<button id="tab-analytics" onClick={()=>setActiveTab("analytics_reports")} className={navClass("analytics_reports")}><BarChart3 className="w-3.5 h-3.5 text-purple-500"/><span>{t("tabAnalytics")}</span></button>}
      </nav>
      <div className="flex items-center gap-1.5">
        {isActualAdmin&&<button id="btn-role-preview" onClick={onOpenLogin} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-bold ${isLight?"border-slate-200 bg-slate-50":"border-neutral-700 bg-neutral-800"}`} title={language==="en"?"Preview role":"Lihat sebagai"}><Eye className="w-3.5 h-3.5"/><span className="hidden sm:inline">{previewRole && previewRole!=="admin" ? previewRole.toUpperCase() : (language==="en"?"VIEW":"LIHAT")}</span></button>}
        <button id="btn-quick-lang" onClick={()=>{const l=language==="id"?"en":"id";setLanguage(l);setSoundConfig({...soundConfig,voiceLanguage:l==="id"?"id-ID":"en-US"});}} className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold ${isLight?"border-slate-200":"border-neutral-700"}`}>{language==="id"?"ID":"EN"}</button>
        <button onClick={()=>setTheme(theme==="light"?"dark":"light")} className="p-1.5 rounded-lg" title={t("themeToggle")}>{theme==="light"?<Moon className="w-4 h-4"/>:<Sun className="w-4 h-4"/>}</button>
        <button onClick={()=>setSoundConfig({...soundConfig,soundEnabled:!soundConfig.soundEnabled})} className="p-1.5 rounded-lg" title={soundConfig.soundEnabled?t("soundActive"):t("soundMuted")}>{soundConfig.soundEnabled?<Volume2 className="w-4 h-4"/>:<VolumeX className="w-4 h-4"/>}</button>
        <button onClick={toggleFullscreen} className="p-1.5 rounded-lg" title={t("fullscreen")}>{isFullscreen?<Minimize className="w-4 h-4"/>:<Maximize className="w-4 h-4"/>}</button>
        {isActualAdmin&&<button id="btn-settings" onClick={onOpenConfig} className="p-1.5 rounded-lg" title={t("settings")}><Settings className="w-4 h-4"/></button>}
        <div className={`hidden lg:block text-right border-l pl-2 ml-1 ${isLight?"border-slate-200":"border-neutral-700"}`}><div className="font-mono text-xs font-bold">{currentTime}</div><div className="text-[9px] opacity-60">{currentDate}</div></div>
        <button onClick={onLogout} className="p-1.5 rounded-lg" title={t("logout")}><LogOut className="w-4 h-4"/></button>
      </div>
    </div>
  </header>;
};