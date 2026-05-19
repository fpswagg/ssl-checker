import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env.js";

const TOKEN_TTL = "7d";

/** bcrypt hashes start with $2a$, $2b$, or $2y$ */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

export type AuthPayload = { admin: true };

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = env.dashboardPasswordHash()?.trim();
  if (hash && isBcryptHash(hash)) {
    return bcrypt.compare(password, hash);
  }
  const plain = env.dashboardPassword();
  if (plain) {
    return password === plain;
  }
  if (hash) {
    throw new Error(
      "DASHBOARD_PASSWORD_HASH is set but is not a valid bcrypt hash. Clear it or use DASHBOARD_PASSWORD.",
    );
  }
  throw new Error("Set DASHBOARD_PASSWORD or DASHBOARD_PASSWORD_HASH");
}

export function signToken(): string {
  return jwt.sign({ admin: true } satisfies AuthPayload, env.jwtSecret(), {
    expiresIn: TOKEN_TTL,
  });
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret()) as AuthPayload;
    if (!payload.admin) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function cronAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (header !== `Bearer ${env.cronSecret()}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
