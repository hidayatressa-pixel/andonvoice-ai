import type { NextFunction, Request, Response } from "express";

const startedAt = Date.now();
let requests = 0; let failures = 0;

export function observeRequest(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith("/assets/")) requests += 1;
  res.on("finish", () => { if (res.statusCode >= 500) failures += 1; });
  next();
}

export function telemetrySnapshot() {
  return { uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000), requests, serverFailures: failures, timestamp: new Date().toISOString() };
}
