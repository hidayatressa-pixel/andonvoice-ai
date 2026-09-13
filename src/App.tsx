import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { MainAndonBoard } from "./components/MainAndonBoard";
import { OperatorTerminal } from "./components/OperatorTerminal";
import { ResponderDashboard } from "./components/ResponderDashboard";
import { PlantLayoutMap } from "./components/PlantLayoutMap";
import { AnalyticsReports } from "./components/AnalyticsReports";
import { MasterDataManager } from "./components/MasterDataManager";
import { ActivityLogsViewer } from "./components/ActivityLogsViewer";
import { AdminDashboard } from "./components/AdminDashboard";
import { LoginScreen } from "./components/LoginScreen";
import { AdminRolePreviewModal } from "./components/AdminRolePreviewModal";
import { AlexaVoiceExperience } from "./components/AlexaVoiceExperience";
import { HackathonDemoCenter } from "./components/HackathonDemoCenter";
import { ConfigModal } from "./components/ConfigModal";
import { CallDetailModal } from "./components/CallDetailModal";
import { ActiveTab, AndonCall, AndonLine, CallStatus, SoundConfig, UserProfile, UserRole, ActivityLog, AppTheme, AppLanguage } from "./types";
import { loadSavedLines, loadSoundConfig, saveSoundConfig, loadSavedTheme, saveThemeToStorage, loadSavedLanguage, saveLanguageToStorage, generateTicketNo } from "./utils/storage";
import { loadCurrentSession, clearSession } from "./utils/auth";
import { subscribeAndonCalls, subscribeMasterLines, subscribeActivityLogs, createAndonCallInDb, updateAndonCallInDb, deleteAndonCallInDb, saveMasterLineInDb, logActivity } from "./lib/firestoreService";
import { playAndonSound, speakAndonCall } from "./utils/audioAlert";
import { CATEGORIES_DATA } from "./utils/categories";
import { canManageMasterData, canManageSettings } from "./utils/permissions";
import { createUnifiedCall, deleteUnifiedCall, fetchUnifiedCalls, updateUnifiedCall } from "./hackathon/incidentApi";
import { IS_DEMO_MODE } from "./lib/firestoreService";

const secureRandomIndex = (length: number): number => { if (length <= 1) return 0; const values = new Uint32Array(1); crypto.getRandomValues(values); return values[0] % length; };

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => { const session = loadCurrentSession(); if (session) return session.role === "operator" ? "operator_call" : "main_board"; return "main_board"; });
  const [lines, setLines] = useState<AndonLine[]>(loadSavedLines);
  const [calls, setCalls] = useState<AndonCall[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [soundConfig, setSoundConfig] = useState<SoundConfig>(loadSoundConfig);
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [theme, setTheme] = useState<AppTheme>(loadSavedTheme);
  const [language, setLanguage] = useState<AppLanguage>(loadSavedLanguage);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(loadCurrentSession());
  const [previewRole, setPreviewRole] = useState<UserRole>("admin");
  const [isRolePreviewOpen, setIsRolePreviewOpen] = useState(false);
  const [inspectedCall, setInspectedCall] = useState<AndonCall | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const isAdmin = canManageSettings(currentUser);
  const viewUser: UserProfile | null = currentUser && isAdmin ? { ...currentUser, role: previewRole, lineAccess: previewRole === "admin" ? currentUser.lineAccess : [] } : currentUser;
  const isAdminView = viewUser?.role === "admin";

  useEffect(() => { saveThemeToStorage(theme); }, [theme]);
  useEffect(() => { saveLanguageToStorage(language); }, [language]);
  useEffect(() => { saveSoundConfig(soundConfig); }, [soundConfig]);
  useEffect(() => { const unsubCalls=subscribeAndonCalls(setCalls); const unsubLines=subscribeMasterLines((dbLines)=>{ if(dbLines&&dbLines.length>0){setLines(dbLines);if(!selectedLineId||!dbLines.some(l=>l.id===selectedLineId))setSelectedLineId(dbLines[0].id);} else { setLines([]); setSelectedLineId(""); } }); const unsubLogs=subscribeActivityLogs(setActivityLogs); return()=>{unsubCalls();unsubLines();unsubLogs();}; },[]);
  useEffect(() => {
    if (!IS_DEMO_MODE) return;
    let active = true;
    const sync = async () => { try { const remoteCalls = await fetchUnifiedCalls(); if (active) setCalls(remoteCalls); } catch { /* Static demo falls back to local state. */ } };
    void sync(); const timer = window.setInterval(sync, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  useEffect(() => { if (!viewUser) return; if (!isAdminView && (activeTab === "admin_dashboard" || activeTab === "master_data")) setActiveTab(viewUser.role === "operator" ? "operator_call" : "main_board"); }, [previewRole, viewUser?.role]);
  useEffect(() => { if (!isAdmin && isConfigOpen) setIsConfigOpen(false); }, [isAdmin, isConfigOpen]);

  const recalculateLineStatuses=useCallback((currentCalls:AndonCall[])=>{setLines(prev=>prev.map(line=>{const lineActiveCalls=currentCalls.filter(c=>c.lineId===line.id&&c.status!=="resolved");const hasStop=lineActiveCalls.some(c=>c.isLineStopped);return{...line,status:hasStop?"critical":lineActiveCalls.length>0?"warning":"running",activeCallsCount:lineActiveCalls.length};}));},[]);
  useEffect(()=>{recalculateLineStatuses(calls);},[calls,recalculateLineStatuses]);

  const handleCreateCall=async(callData:Omit<AndonCall,"id"|"ticketNo"|"timestamp"|"status">)=>{let newCall:AndonCall;try{if(!IS_DEMO_MODE)throw new Error("cloud-provider");newCall=await createUnifiedCall(callData);setCalls(prev=>[newCall,...prev.filter(c=>c.id!==newCall.id)]);}catch{newCall={...callData,id:`call-${Date.now()}`,ticketNo:generateTicketNo(),timestamp:Date.now(),status:"calling",escalated:false,escalationLevel:1};await createAndonCallInDb(newCall,currentUser?{name:currentUser.name,id:currentUser.badgeId,role:currentUser.role}:undefined);}if(soundConfig.soundEnabled)playAndonSound(soundConfig.alarmType,newCall.severity,soundConfig.volume);if(soundConfig.soundEnabled&&soundConfig.voiceAnnouncement){const catLabel=language==="en"?(CATEGORIES_DATA[newCall.category]?.labelEn||newCall.category):(CATEGORIES_DATA[newCall.category]?.label||newCall.category);speakAndonCall(newCall.lineName,catLabel,newCall.workstation,language==="en"?"en-US":soundConfig.voiceLanguage);}};
  const handleUpdateCallStatus=async(callId:string,status:CallStatus,extra?:Partial<AndonCall>)=>{try{if(!IS_DEMO_MODE)throw new Error("cloud-provider");const updated=await updateUnifiedCall(callId,status);setCalls(prev=>prev.map(c=>c.id===callId?{...c,...updated,...extra}:c));}catch{await updateAndonCallInDb(callId,status,extra,currentUser?{name:currentUser.name,id:currentUser.badgeId,role:currentUser.role}:undefined);}if(inspectedCall&&inspectedCall.id===callId)setInspectedCall({...inspectedCall,status,...extra});};
  const handleCancelCall=async(callId:string)=>{try{if(!IS_DEMO_MODE)throw new Error("cloud-provider");await deleteUnifiedCall(callId);setCalls(prev=>prev.filter(c=>c.id!==callId));}catch{await deleteAndonCallInDb(callId,currentUser?{name:currentUser.name,id:currentUser.badgeId,role:currentUser.role}:undefined);}};
  const handleUpdateLineTarget=async(lineId:string,targetDaily:number)=>{if(!canManageMasterData(currentUser))throw new Error("PERMISSION_DENIED: administrator privileges required");const targetLine=lines.find(l=>l.id===lineId);if(targetLine)await saveMasterLineInDb({...targetLine,targetDaily},{name:currentUser!.name,id:currentUser!.badgeId,role:currentUser!.role});};
  const handleLogout=()=>{if(currentUser)void logActivity("login",`User Logout: ${currentUser.name}`,"User session logged out.",{name:currentUser.name,id:currentUser.badgeId,role:currentUser.role});clearSession();setCurrentUser(null);setPreviewRole("admin");};
  const handleLoginSuccess=(user:UserProfile)=>{setCurrentUser(user);setPreviewRole(user.role);const storedLineId=localStorage.getItem("andon_active_login_line_id");if(storedLineId)setSelectedLineId(storedLineId);setActiveTab(user.role==="operator"?"operator_call":"main_board");};
  const handlePreviewRole=(role:UserRole)=>{if(!isAdmin)return;setPreviewRole(role);if(role==="operator")setActiveTab("operator_call");else if(role==="admin")setActiveTab("main_board");else if(activeTab==="admin_dashboard"||activeTab==="master_data")setActiveTab("main_board");};
  const handleSimulateEmergency=()=>{const randomLine=lines[secureRandomIndex(lines.length)]||lines[0];if(!randomLine)return;const randomStation=randomLine.workstations[secureRandomIndex(randomLine.workstations.length)]||"OP-20 Station";void handleCreateCall({lineId:randomLine.id,lineName:randomLine.name,workstation:randomStation,category:"machine_breakdown",severity:"critical_line_stop",isLineStopped:true,operatorName:currentUser?currentUser.name:"Demo",operatorId:currentUser?currentUser.badgeId:"DEMO",machineId:"ROBOT-SIM-01",partNumber:"DEMO-PART-2026",description:"Optical sensor detects clamping position deviation. Conveyor auto line stop."});};

  const isLight=theme==="light";
  if(!currentUser)return <LoginScreen onLoginSuccess={handleLoginSuccess} theme={theme} language={language} setLanguage={setLanguage} lines={lines}/>;
  return <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-200 ${isLight?"bg-slate-100 text-slate-900":"bg-neutral-950 text-neutral-100"}`}>
    <Header activeTab={activeTab} setActiveTab={setActiveTab} activeCalls={calls} soundConfig={soundConfig} setSoundConfig={setSoundConfig} currentUser={currentUser} previewRole={previewRole} onOpenLogin={()=>{if(isAdmin)setIsRolePreviewOpen(true);}} onLogout={handleLogout} onOpenConfig={()=>{if(isAdmin)setIsConfigOpen(true);}} onSimulateEmergency={handleSimulateEmergency} theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage}/>
    <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
      {activeTab==="main_board"&&<MainAndonBoard lines={lines} calls={calls} onSelectCall={setInspectedCall} onNavigateToCall={(lineId)=>{setSelectedLineId(lineId);setActiveTab("operator_call");}} theme={theme} language={language}/>} 
      {activeTab==="operator_call"&&<OperatorTerminal lines={lines} activeCalls={calls} selectedLineId={selectedLineId} setSelectedLineId={setSelectedLineId} onSubmitCall={handleCreateCall} onCancelCall={handleCancelCall} currentUser={viewUser} theme={theme} language={language}/>} 
      {activeTab==="responder_terminal"&&<ResponderDashboard calls={calls} onUpdateCallStatus={handleUpdateCallStatus} currentUser={viewUser} theme={theme} language={language}/>} 
      {activeTab==="plant_map"&&<PlantLayoutMap lines={lines} activeCalls={calls} onSelectLine={(lineId)=>{setSelectedLineId(lineId);setActiveTab("operator_call");}} onSelectCall={setInspectedCall} theme={theme} language={language}/>} 
      {activeTab==="master_data"&&isAdminView&&<MasterDataManager lines={lines} currentUser={currentUser} theme={theme} language={language}/>} 
      {activeTab==="admin_dashboard"&&isAdminView&&<AdminDashboard lines={lines} calls={calls} currentUser={currentUser} theme={theme} language={language}/>} 
      {activeTab==="activity_logs"&&<ActivityLogsViewer logs={activityLogs} currentUser={viewUser} theme={theme} language={language}/>} 
      {activeTab==="analytics_reports"&&<AnalyticsReports calls={calls} lines={lines} activityLogs={activityLogs} theme={theme} language={language}/>} 
    </main>
    <CallDetailModal call={inspectedCall} onClose={()=>setInspectedCall(null)} onUpdateStatus={handleUpdateCallStatus} theme={theme} language={language}/>
    {isAdmin&&<ConfigModal isOpen={isConfigOpen} onClose={()=>setIsConfigOpen(false)} soundConfig={soundConfig} setSoundConfig={setSoundConfig} lines={lines} onUpdateLineTarget={handleUpdateLineTarget} theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} currentUser={currentUser}/>} 
    {isAdmin&&<AdminRolePreviewModal isOpen={isRolePreviewOpen} onClose={()=>setIsRolePreviewOpen(false)} role={previewRole} onChangeRole={handlePreviewRole} theme={theme} language={language}/>} 
    <AlexaVoiceExperience lines={lines} calls={calls} currentUser={currentUser} onCreateCall={handleCreateCall}/>
    <HackathonDemoCenter onRunScenario={handleSimulateEmergency}/>
  </div>;
}
