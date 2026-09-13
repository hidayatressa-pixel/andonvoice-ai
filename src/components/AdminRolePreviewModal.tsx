import React from "react";
import { X, Eye } from "lucide-react";
import { AppLanguage, AppTheme, UserRole } from "../types";

interface AdminRolePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  onChangeRole: (role: UserRole) => void;
  theme: AppTheme;
  language: AppLanguage;
}

const roles: UserRole[] = ["operator", "leader", "supervisor", "manager", "admin"];

export const AdminRolePreviewModal: React.FC<AdminRolePreviewModalProps> = ({ isOpen, onClose, role, onChangeRole, theme, language }) => {
  if (!isOpen) return null;
  const isLight = theme === "light";
  const labels: Record<UserRole, string> = {
    operator: "Operator",
    leader: "Leader",
    supervisor: "Supervisor",
    manager: "Manager",
    admin: "Admin",
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className={`w-full max-w-sm rounded-2xl border shadow-2xl ${isLight ? "bg-white border-slate-200 text-slate-900" : "bg-neutral-900 border-neutral-700 text-white"}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isLight ? "border-slate-200" : "border-neutral-800"}`}>
          <div className="flex items-center gap-2"><Eye className="w-4 h-4"/><span className="font-bold text-sm">{language === "en" ? "Switch Preview Account" : "Switch Preview Akun"}</span></div>
          <button onClick={onClose} className="p-1.5 rounded-lg" aria-label="Close"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-3 grid gap-2">
          {roles.map((item) => (
            <button key={item} onClick={() => { onChangeRole(item); onClose(); }} className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${role === item ? (isLight ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-900 border-white") : (isLight ? "bg-white hover:bg-slate-50 border-slate-200" : "bg-neutral-950 hover:bg-neutral-800 border-neutral-800")}`}>
              {labels[item]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};