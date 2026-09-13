import { AndonCall } from "../types";
import { getFirebaseAuth } from "../lib/firebase";

function escapeHtml(text: string | undefined | null): string {
  if (!text) return "-";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sends a pre-formatted notification through the same-origin backend.
 * Telegram credentials stay exclusively on the server and are never bundled
 * into browser JavaScript. Production requests include the signed-in user's
 * Firebase ID token so the backend can reject unauthenticated callers.
 */
export async function sendTelegramNotification(message: string): Promise<boolean> {
  if (!message || message.trim() === "") return false;

  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) {
      console.error("Telegram notification skipped: Firebase authentication is required.");
      return false;
    }

    const idToken = await user.getIdToken();
    const response = await fetch("/api/notifications/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      console.error("Telegram notification failed with HTTP status", response.status);
      return false;
    }

    return true;
  } catch {
    console.error("Telegram notification request failed.");
    return false;
  }
}

export function formatAndonCallTelegramMessage(
  call: AndonCall,
  actionType: "OPEN" | "ACK" | "RESOLVE" | "CANCEL"
): string {
  const headerText = {
    OPEN: "<b>ANDON CALL RAISED</b>",
    ACK: "<b>ANDON CALL ACKNOWLEDGED</b>",
    RESOLVE: "<b>ANDON CALL RESOLVED</b>",
    CANCEL: "<b>ANDON CALL CANCELLED</b>"
  }[actionType];

  const timestampStr = new Date(call.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  let msg = `-----------------------------------------\n${headerText}\n-----------------------------------------\n`;
  msg += `<b>No. WO:</b> <code>${escapeHtml(call.ticketNo || call.id)}</code>\n`;
  msg += `<b>Line:</b> ${escapeHtml(call.lineName)}\n`;
  msg += `<b>Workstation:</b> ${escapeHtml(call.workstation)}\n`;
  msg += `<b>Kategori:</b> ${escapeHtml(call.category.toUpperCase())}\n`;
  msg += `<b>Severity:</b> ${escapeHtml(call.severity.toUpperCase())}\n`;
  msg += `<b>Line Stop:</b> ${call.isLineStopped ? "YA" : "TIDAK"}\n`;
  msg += `<b>Operator:</b> ${escapeHtml(call.operatorName)}\n`;
  msg += `<b>Waktu:</b> ${escapeHtml(timestampStr)}\n`;

  if (actionType === "ACK" && call.acknowledgedBy) {
    msg += `-----------------------------------------\n<b>Responder:</b> ${escapeHtml(call.acknowledgedBy)}\n`;
    if (call.acknowledgedAt) {
      const responseTime = Math.round((call.acknowledgedAt - call.timestamp) / 1000);
      msg += `<b>Response Time:</b> ${responseTime} detik\n`;
    }
  }

  if (actionType === "RESOLVE") {
    msg += `-----------------------------------------\n`;
    if (call.resolvedBy) msg += `<b>Diperbaiki Oleh:</b> ${escapeHtml(call.resolvedBy)}\n`;
    if (call.rootCause) msg += `<b>Akar Masalah:</b> ${escapeHtml(call.rootCause)}\n`;
    if (call.resolutionNotes) msg += `<b>Tindakan Korektif:</b> ${escapeHtml(call.resolutionNotes)}\n`;
    if (call.resolvedAt) {
      const totalDowntimeSec = Math.round((call.resolvedAt - call.timestamp) / 1000);
      const m = Math.floor(totalDowntimeSec / 60);
      const s = totalDowntimeSec % 60;
      msg += `<b>Total Downtime:</b> ${m}m ${s}s\n`;
    }
  }
  return `${msg}-----------------------------------------`;
}
