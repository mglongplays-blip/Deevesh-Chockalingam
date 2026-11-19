import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { dbStore, getSupabaseAdmin } from '../db/store.ts';
import type { ProfileRecord } from '../types.ts';

const COOKIE_NAME = 'mg_session';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || 'mg-meet-genie-dev-session-secret-change-in-prod';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

interface SessionPayload {
  userId: string;
  email: string;
  role: 'student' | 'admin';
  exp: number;
}

export function signSessionToken(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(encoded).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (!parsed.userId || !parsed.exp || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, profile: ProfileRecord) {
  const token = signSessionToken({
    userId: profile.id,
    email: profile.email,
    role: profile.role,
    exp: Date.now() + TOKEN_TTL_MS,
  });
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: TOKEN_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function sanitizeProfile(profile: ProfileRecord): Omit<ProfileRecord, 'password_hash'> {
  const { password_hash: _removed, ...safe } = profile;
  return safe;
}

export interface AuthenticatedRequest extends Request {
  user?: ProfileRecord;
}

export async function resolveUserFromRequest(req: Request): Promise<ProfileRecord | null> {
  // 1. Check signed HTTP-only session cookie
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) {
    const payload = verifySessionToken(cookieToken);
    if (payload) {
      const profile = await dbStore.findProfileById(payload.userId);
      if (profile) return profile;
    }
  }

  // 2. Check Bearer token (supports Supabase Auth JWT when configured)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    const localPayload = verifySessionToken(bearer);
    if (localPayload) {
      const profile = await dbStore.findProfileById(localPayload.userId);
      if (profile) return profile;
    }
    const sb = getSupabaseAdmin();
    if (sb) {
      const { data } = await sb.auth.getUser(bearer);
      if (data?.user) {
        const existing = await dbStore.findProfileById(data.user.id);
        if (existing) return existing;
      }
    }
  }

  return null;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const user = await resolveUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid session. Please sign in again.' });
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Administrator privileges required.' });
      return;
    }
    next();
  });
}

export function determineInitialRole(email: string, existingCount: number): 'student' | 'admin' {
  const configuredAdmin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (configuredAdmin && email.trim().toLowerCase() === configuredAdmin) {
    return 'admin';
  }
  // If no ADMIN_EMAIL is set and this is the very first user on a fresh instance, make them admin so Admin Console is testable
  if (!configuredAdmin && existingCount === 0) {
    return 'admin';
  }
  return 'student';
}
