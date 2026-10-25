import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phone Authentication & reCAPTCHA Resilience Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Verifies LoginPage.tsx recaptcha-container does NOT have display: none', () => {
    const loginFilePath = path.resolve(__dirname, '../features/auth/pages/LoginPage.tsx');
    const content = fs.readFileSync(loginFilePath, 'utf8');

    expect(content).toContain('id="recaptcha-container"');
    // Ensure display: none is NOT applied to the recaptcha container
    expect(content).not.toContain('id="recaptcha-container" style={{ display: \'none\' }}');
    expect(content).not.toContain('id="recaptcha-container" style={{display:\'none\'}}');
  });

  it('2. Verifies PatronAuthModal.tsx modal-recaptcha-container does NOT have display: none', () => {
    const modalFilePath = path.resolve(__dirname, '../shared/components/ui/PatronAuthModal.tsx');
    const content = fs.readFileSync(modalFilePath, 'utf8');

    expect(content).toContain('id="modal-recaptcha-container"');
    // Ensure display: none is NOT applied to the modal recaptcha container
    expect(content).not.toContain('id="modal-recaptcha-container" style={{ display: \'none\' }}');
    expect(content).not.toContain('id="modal-recaptcha-container" style={{display:\'none\'}}');
  });

  it('3. Verifies AccountPage.tsx phone-link-recaptcha does NOT have display: none', () => {
    const accountFilePath = path.resolve(__dirname, '../features/customers/pages/AccountPage.tsx');
    const content = fs.readFileSync(accountFilePath, 'utf8');

    expect(content).toContain('id="phone-link-recaptcha"');
    expect(content).not.toContain('id="phone-link-recaptcha" style={{ display: \'none\' }}');
  });

  it('4. Verifies authService.setupRecaptcha cleans up previous container DOM and window references', () => {
    const authServiceFilePath = path.resolve(__dirname, '../features/auth/services/authService.ts');
    const content = fs.readFileSync(authServiceFilePath, 'utf8');

    // Confirms container.innerHTML is wiped before instantiating RecaptchaVerifier
    expect(content).toContain("container.innerHTML = ''");
    // Confirms window.recaptchaVerifier is cleared
    expect(content).toContain('win.recaptchaVerifier.clear()');
  });

  it('5. Verifies error handling catches and resets recaptcha container on failure', () => {
    const loginFilePath = path.resolve(__dirname, '../features/auth/pages/LoginPage.tsx');
    const content = fs.readFileSync(loginFilePath, 'utf8');

    // In catch block: container.innerHTML is emptied
    expect(content).toContain("container.innerHTML = ''");
    expect(content).toContain('recaptchaVerifierRef.current.clear()');
  });

  it('6. Verifies authService handles billing-not-enabled gracefully with user-friendly message', () => {
    const authServiceFilePath = path.resolve(__dirname, '../features/auth/services/authService.ts');
    const content = fs.readFileSync(authServiceFilePath, 'utf8');

    expect(content).toContain("err?.code === 'auth/billing-not-enabled'");
    expect(content).toContain('billing activation');
  });
});
