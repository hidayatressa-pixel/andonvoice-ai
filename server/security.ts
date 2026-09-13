import { timingSafeEqual, randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function safeTokenEqual(actual: string, expected: string): boolean {
  const left = Buffer.from(actual); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.set({
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer", "Permissions-Policy": "camera=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-origin"
  });
  res.locals.requestId = randomUUID(); res.set("X-Request-ID", res.locals.requestId); next();
}

export function apiAuthentication(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.MCP_API_KEY?.trim();
  if (!expected && process.env.API_AUTH_MODE !== "required") return next();
  if (!expected) { res.status(503).json({ error: "API_AUTH_NOT_CONFIGURED" }); return; }
  const header = req.get("authorization") || "";
  const actual = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!actual || !safeTokenEqual(actual, expected)) { res.status(401).json({ error: "UNAUTHORIZED" }); return; }
  next();
}

export function apiRateLimit(req: Request, res: Response, next: NextFunction): void {
  const now = Date.now(); const windowMs = 60_000; const limit = Number(process.env.API_RATE_LIMIT || 120);
  const key = req.ip || "unknown"; const current = buckets.get(key);
  if (!current || current.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return next(); }
  current.count += 1;
  if (current.count > limit) { res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000))); res.status(429).json({ error: "RATE_LIMITED" }); return; }
  next();
}

export function resetRateLimitsForTests(): void { buckets.clear(); }
