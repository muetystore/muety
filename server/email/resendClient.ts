import { SendEmailPayload, SendEmailResult } from './types';

export function formatFromSender(name?: string, email?: string): string {
  const cleanEmail = (email || 'orders@muety.in').trim().replace(/[<>]/g, '');
  const cleanName = (name || '').trim().replace(/["'`<>]/g, '').trim();
  if (!cleanName || cleanName.toLowerCase() === cleanEmail.toLowerCase()) {
    return cleanEmail;
  }
  return `${cleanName} <${cleanEmail}>`;
}

export function normalizeFromSender(from: string): string {
  if (!from) return 'orders@muety.in';
  // Match "Name" <email@domain> or 'Name' <email@domain>
  const match = from.match(/^["']?([^"'<>]+)["']?\s*<([^<>]+)>$/);
  if (match) {
    const name = match[1].trim();
    const email = match[2].trim();
    return name ? `${name} <${email}>` : email;
  }
  const clean = from.replace(/["']/g, '').trim();
  return clean || 'orders@muety.in';
}

/**
 * Production-ready server-side Resend email client.
 * Strictly executes on the server; credentials are never sent to or visible in the client.
 */
export async function sendViaResend(payload: SendEmailPayload): Promise<SendEmailResult> {
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || !!process.env.VITEST;
  const apiKey = process.env.RESEND_API_KEY;

  // In test environments (Vitest / Jest / test runner), strictly prevent real outbound emails
  if (isTest && process.env.RESEND_ENABLE_LIVE_IN_TESTS !== 'true') {
    return {
      success: true,
      messageId: `resend-test-${Date.now()}`
    };
  }

  if (!apiKey || !apiKey.trim()) {
    // If not configured, report truth: do not fake delivery
    return {
      success: false,
      code: 'PROVIDER_NOT_CONFIGURED',
      error: 'Email service is unconfigured. RESEND_API_KEY is not defined in server environment.',
      statusCode: 503
    };
  }

  const toList = Array.isArray(payload.to) ? payload.to : [payload.to];
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey.trim()}`,
    'Content-Type': 'application/json',
    ...(payload.headers || {})
  };

  if (payload.idempotencyKey) {
    headers['Idempotency-Key'] = payload.idempotencyKey;
  }

  const requestBody: Record<string, any> = {
    from: normalizeFromSender(payload.from),
    to: toList,
    subject: payload.subject,
    html: payload.html
  };

  if (payload.text) {
    requestBody.text = payload.text;
  }
  if (payload.replyTo) {
    requestBody.reply_to = payload.replyTo;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.id) {
      return {
        success: true,
        messageId: data.id
      };
    }

    const errorMsg = data?.message || data?.error || `HTTP ${res.status}`;
    if (res.status === 403 || errorMsg.includes('verify a domain') || errorMsg.includes('testing emails')) {
      return {
        success: false,
        code: 'DOMAIN_NOT_VERIFIED',
        error: `Resend domain verification required for "${payload.from}". ${errorMsg}`,
        statusCode: 403
      };
    }

    if (res.status === 429) {
      return {
        success: false,
        code: 'RATE_LIMITED',
        error: `Email provider rate limit reached. ${errorMsg}`,
        statusCode: 429
      };
    }

    return {
      success: false,
      code: 'REJECTED',
      error: `Email provider rejected message: ${errorMsg}`,
      statusCode: res.status
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        code: 'NETWORK_ERROR',
        error: 'Email dispatch request timed out after 12 seconds.',
        statusCode: 504
      };
    }
    return {
      success: false,
      code: 'NETWORK_ERROR',
      error: err?.message || 'Network error while dispatching email via Resend.',
      statusCode: 500
    };
  }
}

export const sendResendEmail = sendViaResend;
