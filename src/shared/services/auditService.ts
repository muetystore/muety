import { db, isLiveFirebase } from '@/lib/firebase/firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { AdminAuditLog, AppRole } from '@/shared/types';

const AUDIT_LOGS_KEY = 'muety_audit_logs_v1';

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
    actorUid: string;
    actorEmail: string;
    actorRole: AppRole;
    action: string;
    entityType: AdminAuditLog['entityType'];
    entityId: string;
    before?: any;
    after?: any;
    reason?: string;
  }): Promise<AdminAuditLog> {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newLog: AdminAuditLog = {
      logId,
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before ? JSON.parse(JSON.stringify(params.before)) : null,
      after: params.after ? JSON.parse(JSON.stringify(params.after)) : null,
      reason: params.reason || '',
      timestamp: new Date().toISOString()
    };

    // Save to Firestore if available
    if (db && isLiveFirebase) {
      try {
        await setDoc(doc(db, 'adminAuditLogs', logId), newLog);
      } catch (err) {
        console.warn('Firestore setDoc audit log note:', err);
      }
    }

    // Save to LocalStorage fallback
    try {
      if (typeof window !== 'undefined') {
        const existingRaw = localStorage.getItem(AUDIT_LOGS_KEY);
        const logs: AdminAuditLog[] = existingRaw ? JSON.parse(existingRaw) : [];
        logs.unshift(newLog);
        // keep max 500 logs locally
        if (logs.length > 500) logs.pop();
        localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
        window.dispatchEvent(new Event('muety_audit_logs_updated'));
      }
    } catch {}

    return newLog;
  }

  async getAuditLogs(max: number = 100): Promise<AdminAuditLog[]> {
    if (db && isLiveFirebase) {
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
      if (typeof window !== 'undefined') {
        const data = localStorage.getItem(AUDIT_LOGS_KEY);
        return data ? JSON.parse(data) : [];
      }
    } catch {}

    return [];
  }
}

export const auditService = AuditService.getInstance();
