import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Netlify Orders API & Automated Email Delivery Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Verifies netlify/functions/orders.mjs exists and contains handler, Resend, and templates', () => {
    const fnPath = path.resolve(__dirname, '../../netlify/functions/orders.mjs');
    expect(fs.existsSync(fnPath)).toBe(true);

    const content = fs.readFileSync(fnPath, 'utf8');
    expect(content).toContain('export async function handler');
    expect(content).toContain('api.resend.com/emails');
    expect(content).toContain('renderPatronOrderConfirmationEmail');
    expect(content).toContain('renderAdminOrderNotificationEmail');
    expect(content).toContain('emailTransactionalJobs');
  });

  it('2. Verifies public/_redirects routes /api/orders/* to netlify orders function', () => {
    const redirectsPath = path.resolve(__dirname, '../../public/_redirects');
    const content = fs.readFileSync(redirectsPath, 'utf8');

    expect(content).toContain('/api/orders/create               /.netlify/functions/orders');
    expect(content).toContain('/api/orders/send-confirmation     /.netlify/functions/orders');
    expect(content).toContain('/api/orders/*                    /.netlify/functions/orders');
    expect(content).toContain('https://muety.in/api/orders/*                     /.netlify/functions/orders');
    expect(content).toContain('https://admin.muety.in/api/orders/*                   /.netlify/functions/orders');
    expect(content).toContain('https://store.muety.in/api/orders/*                  /.netlify/functions/orders');
  });

  it('3. Verifies netlify.toml routes /api/orders/* to netlify orders function', () => {
    const tomlPath = path.resolve(__dirname, '../../netlify.toml');
    const content = fs.readFileSync(tomlPath, 'utf8');

    expect(content).toContain('from = "/api/orders/*"');
    expect(content).toContain('to = "/.netlify/functions/orders"');
    expect(content).toContain('from = "https://muety.in/api/orders/*"');
    expect(content).toContain('from = "https://admin.muety.in/api/orders/*"');
    expect(content).toContain('from = "https://store.muety.in/api/orders/*"');
  });

  it('4. Verifies orderService.ts triggers background /api/orders/send-confirmation', () => {
    const servicePath = path.resolve(__dirname, '../features/orders/services/orderService.ts');
    const content = fs.readFileSync(servicePath, 'utf8');

    expect(content).toContain('/api/orders/send-confirmation');
  });

  it('5. Verifies OrderConfirmationPage.tsx triggers /api/orders/send-confirmation on order load', () => {
    const pagePath = path.resolve(__dirname, '../features/orders/pages/OrderConfirmationPage.tsx');
    const content = fs.readFileSync(pagePath, 'utf8');

    expect(content).toContain('/api/orders/send-confirmation');
  });
});
