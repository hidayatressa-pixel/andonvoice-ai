import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { mountMcpEndpoint } from "./server/mcpServer";
import { listIncidents } from "./server/hackathonStore";

dotenv.config();

const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;
const TELEGRAM_RATE_LIMIT_WINDOW_MS = 60_000;
const TELEGRAM_RATE_LIMIT_MAX_REQUESTS = 10;
const telegramRateLimit = new Map<string, { count: number; resetAt: number }>();

function getBearerToken(authorization?: string): string | null {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
}

async function verifyFirebaseIdToken(idToken: string): Promise<boolean> {
  const apiKey = process.env.FIREBASE_WEB_API_KEY?.trim() || process.env.VITE_FIREBASE_API_KEY?.trim();
  if (!apiKey) return false;

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) return false;
    const payload = await response.json() as { users?: Array<{ localId?: string }> };
    return Boolean(payload.users?.[0]?.localId);
  } catch (error) {
    console.error("Firebase ID token verification failed.", error);
    return false;
  }
}

function isTelegramRateLimited(key: string): boolean {
  const now = Date.now();
  const current = telegramRateLimit.get(key);

  if (!current || current.resetAt <= now) {
    telegramRateLimit.set(key, { count: 1, resetAt: now + TELEGRAM_RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > TELEGRAM_RATE_LIMIT_MAX_REQUESTS;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", product: "AndonVoice AI", mcpProtocol: "2025-11-25", timestamp: new Date().toISOString() });
  });

  app.get("/api/hackathon/incidents", (_req, res) => res.json({ incidents: listIncidents() }));
  mountMcpEndpoint(app);

  app.post("/api/notifications/telegram", async (req, res) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";

    if (!botToken || !chatId) {
      return res.status(503).json({ ok: false, error: "Telegram notifications are not configured." });
    }

    const idToken = getBearerToken(req.get("authorization"));
    if (!idToken || !(await verifyFirebaseIdToken(idToken))) {
      return res.status(401).json({ ok: false, error: "Authentication required." });
    }

    if (isTelegramRateLimited(req.ip || "unknown")) {
      return res.status(429).json({ ok: false, error: "Too many notification requests. Try again shortly." });
    }

    if (!message || message.length > MAX_TELEGRAM_MESSAGE_LENGTH) {
      return res.status(400).json({ ok: false, error: "Invalid Telegram message." });
    }

    try {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
      });

      if (!telegramResponse.ok) {
        console.error("Telegram notification failed with HTTP status", telegramResponse.status);
        return res.status(502).json({ ok: false, error: "Telegram delivery failed." });
      }

      return res.json({ ok: true });
    } catch (error) {
      console.error("Telegram notification request failed.", error);
      return res.status(502).json({ ok: false, error: "Telegram delivery failed." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🏭 Andon Server running on http://localhost:${PORT}`);
  });
}

startServer();
