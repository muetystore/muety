import { auth, db, isLiveFirebase } from '@/lib/firebase/firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { AdminAuditLog, AppRole } from '@/shared/types';

const AUDIT_LOGS_KEY = 'muety_audit_logs_v1';
const memoryAuditLogs: AdminAuditLog[] = [];

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'accesstoken',
  'idtoken',
  'refreshtoken',
  'apikey',
  'card',
  'cvv',
  'authcode',
  'privatekey'
]);

export function sanitizeAuditPayload(data: any, depth = 0): any {
  if (depth > 6 || data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeAuditPayload(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      SENSITIVE_KEYS.has(lowerKey) || 
      lowerKey.includes('password') || 
      lowerKey.includes('secret') || 
      lowerKey.includes('token') ||
      lowerKey.includes('card') ||
      lowerKey.includes('key') ||
      lowerKey.includes('cvv') ||
      lowerKey.includes('authcode')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditPayload(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class AuditService {
  private static instance: AuditService;

  private constructor() {}

  public static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async logAction(params: {
    actorUid?: string;
    actorEmail?: string;
    actorRole?: AppRole;
    action: string;
    entityType: AdminAuditLog['entityType'];
    entityId: string;
    before?: any;
    after?: any;
    reason?: string;
  }): Promise<AdminAuditLog> {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Derive actor from trusted Firebase Authentication session whenever available
    const currentFbUser = auth?.currentUser;
    const actorUid = currentFbUser?.uid || params.actorUid || 'system';
    const actorEmail = currentFbUser?.email || params.actorEmail || 'system@muety.in';
    const actorRole = params.actorRole || 'admin';

    const safeBefore = params.before ? sanitizeAuditPayload(JSON.parse(JSON.stringify(params.before))) : null;
    const safeAfter = params.after ? sanitizeAuditPayload(JSON.parse(JSON.stringify(params.after))) : null;

    const newLog: AdminAuditLog = {
      logId,
      actorUid,
      actorEmail,
      actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: safeBefore,
      after: safeAfter,
      reason: params.reason || '',
      timestamp: new Date().toISOString()
    };

    memoryAuditLogs.unshift(newLog);

    // Persist to canonical Firestore adminAuditLogs collection
    const isTest = typeof process !== 'undefined' && Boolean(process.env?.NODE_ENV === 'test' || Boolean((process.env as any)?.VITEST));
    if (db && isLiveFirebase && !isTest && auth?.currentUser) {
      try {
        await Promise.race([
          setDoc(doc(db, 'adminAuditLogs', logId), newLog),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Audit write timeout')), 1500))
        ]);
      } catch (err) {
        console.warn('Firestore setDoc audit log note:', err);
      }
    }

    // Save to LocalStorage fallback
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const existingRaw = localStorage.getItem(AUDIT_LOGS_KEY);
        const logs: AdminAuditLog[] = existingRaw ? JSON.parse(existingRaw) : [];
        logs.unshift(newLog);
        // keep max 500 logs locally
        if (logs.length > 500) logs.pop();
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
        if (typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new Event('muety_audit_logs_updated'));
        }
      }
    } catch {}

    return newLog;
  }

  async getAuditLogs(max: number = 100): Promise<AdminAuditLog[]> {
    const isTest = typeof process !== 'undefined' && Boolean(process.env?.NODE_ENV === 'test' || Boolean((process.env as any)?.VITEST));
    if (db && isLiveFirebase && !isTest) {
      try {
        const q = query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'), limit(max));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return snap.docs.map(d => d.data() as AdminAuditLog);
        }
      } catch (err) {
        console.warn('Firestore fetch audit logs note:', err);
      }
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(AUDIT_LOGS_KEY);
        if (data) return JSON.parse(data);
      }
    } catch {}

    return memoryAuditLogs.slice(0, max);
  }
}

export const auditService = AuditService.getInstance();
