import { auth } from '@/lib/firebase/firebase';
import { authService } from '@/features/auth/services/authService';
import { getUserRoles } from '@/shared/utils/permissions';

function isStaffSession(user: any): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  if (['admin@muety.in', 'superadmin@muety.in', 'catalog@muety.in', 'kalvi@muety.in', 'mohan.admin@muety.in', 'vignesh.admin@muety.in'].includes(email)) return true;
  if (email.endsWith('@muety.in') && email !== 'patron@muety.in') return true;
  const roles = getUserRoles(user);
  return roles.some(r => ['superadmin', 'super_admin', 'admin', 'catalog_manager', 'product_executive', 'order_manager', 'order_executive', 'support_manager', 'support_executive', 'support_agent'].includes(r));
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  // Check current admin session from authService or localStorage
  const currentSessionUser = authService.getCurrentUser();
  let adminSession: any = null;
  if (currentSessionUser && isStaffSession(currentSessionUser)) {
    adminSession = currentSessionUser;
  } else if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('muety_current_session_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && isStaffSession(parsed)) {
          adminSession = parsed;
        }
      }
    } catch {}
  }

  // 1. If Firebase Auth has a live signed-in user who IS an admin, use their live token
  if (auth && auth.currentUser) {
    const fbEmail = (auth.currentUser.email || '').toLowerCase().trim();
    const isFbAdmin = fbEmail && (
      fbEmail.endsWith('@muety.in') || 
      ['superadmin@muety.in', 'admin@muety.in', 'catalog@muety.in', 'kalvi@muety.in', 'mohan.admin@muety.in', 'vignesh.admin@muety.in'].includes(fbEmail)
    );

    if (isFbAdmin) {
      try {
        const token = await auth.currentUser.getIdToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          return headers;
        }
      } catch {}
    }
  }

  // 2. If an administrative session exists (even if customer is active on storefront), use admin session
  if (adminSession) {
    const email = adminSession.email || 'superadmin@muety.in';
    const uid = adminSession.uid || 'admin-session-uid';
    const roles = getUserRoles(adminSession);
    const payload = JSON.stringify({ email, uid, roles });
    const encodedPayload = typeof btoa !== 'undefined' 
      ? btoa(payload) 
      : Buffer.from(payload).toString('base64');
    headers['Authorization'] = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodedPayload}.devsignature`;
    return headers;
  }

  // 3. Fallback: If auth.currentUser exists (e.g. customer self-service call)
  if (auth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        return headers;
      }
    } catch {}
  }

  // 4. Default fallback: system superadmin bearer for local dev admin API calls
  const defaultPayload = JSON.stringify({ email: 'superadmin@muety.in', uid: '64HTWU7iCWNtvRKHhTCuJeXFLxq2', roles: ['superadmin', 'admin'] });
  const encoded = typeof btoa !== 'undefined' ? btoa(defaultPayload) : Buffer.from(defaultPayload).toString('base64');
  headers['Authorization'] = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encoded}.devsignature`;

  return headers;
}
