import { AndonLine, AndonCall, SoundConfig, MasterMachine, UserProfile } from "../types";

export const INITIAL_CALLS: AndonCall[] = [];

// Master Line is database-managed. Admin can log in without a Line and provision it first.
// Demo/local storage also starts empty after a clean installation.
export const INITIAL_LINES: AndonLine[] = [
  { id: "line-a", name: "Headlamp Assembly A", shortCode: "HLA-A", department: "Assembly", status: "running", workstations: ["Loading", "Hot Melt", "Lens Press", "Final Inspection"], activeCallsCount: 0, targetDaily: 420, actualOutput: 286, efficiency: 92, leaderName: "Shift Leader A", currentShift: "Shift 1" },
  { id: "line-b", name: "Rear Combination Lamp B", shortCode: "RCL-B", department: "Assembly", status: "running", workstations: ["PCB Test", "Ultrasonic Welding", "Leak Test", "Packing"], activeCallsCount: 0, targetDaily: 500, actualOutput: 331, efficiency: 88, leaderName: "Shift Leader B", currentShift: "Shift 1" },
  { id: "line-c", name: "Smart Lamp Camera C", shortCode: "SLC-C", department: "New Project", status: "running", workstations: ["Camera Fitment", "Calibration", "Lighting Test", "Audit"], activeCallsCount: 0, targetDaily: 240, actualOutput: 151, efficiency: 84, leaderName: "Shift Leader C", currentShift: "Shift 1" }
];

// Master Machine is database-managed and never bundled into source.
export const INITIAL_MACHINES: MasterMachine[] = [];

// Authentication/demo defaults are defined in utils/auth.ts (DEFAULT_USERS).
export const INITIAL_OPERATORS: UserProfile[] = [];

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  soundEnabled: true,
  volume: 0.8,
  alarmType: "industrial_siren",
  voiceAnnouncement: true,
  voiceLanguage: "en-US",
  escalationMinutes: 5
};
