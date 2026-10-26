import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inquiryService } from '@/features/inquiries/services/inquiryService';

describe('Inquiry Live Sync & Notification Target Architecture', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] || null,
      length: Object.keys(store).length
    } as any;

    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = {
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {}
      };
    }
    vi.restoreAllMocks();
  });

  it('1. submitInquiry dispatches email notification to support@muety.in', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })));

    const inquiry = await inquiryService.submitInquiry({
      name: 'Logesh.R',
      email: 'logkihub@gmail.com',
      message: 'Consultation request for custom order',
      subject: 'Custom Order'
    });

    expect(inquiry.name).toBe('Logesh.R');
    expect(inquiry.email).toBe('logkihub@gmail.com');
    expect(inquiry.inquiryNumber).toMatch(/^MUET-INQ-\d{6}$/);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://formsubmit.co/ajax/support@muety.in',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );

    fetchSpy.mockRestore();
  });

  it('2. subscribeToInquiries returns immediate cached inquiries and listens to live updates', () => {
    localStorage.setItem(
      'muety_inquiries_v1',
      JSON.stringify([
        {
          id: 'inq-test-1',
          inquiryNumber: 'MUET-INQ-119147',
          name: 'Logesh.R',
          email: 'logkihub@gmail.com',
          message: 'hello',
          status: 'unread',
          createdAt: new Date().toISOString()
        }
      ])
    );

    let delivered: any[] = [];
    const unsub = inquiryService.subscribeToInquiries((items) => {
      delivered = items;
    });

    expect(delivered.length).toBe(1);
    expect(delivered[0].inquiryNumber).toBe('MUET-INQ-119147');
    expect(delivered[0].name).toBe('Logesh.R');

    unsub();
  });

  it('3. updateStatus updates both local cache and triggers notification', async () => {
    const inquiry = await inquiryService.submitInquiry({
      name: 'Test Patron',
      email: 'patron@example.com',
      message: 'Testing notes update'
    });

    const updated = await inquiryService.updateStatus(inquiry.id, 'replied', 'Spoke on WhatsApp');
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('replied');
    expect(updated?.adminNotes).toBe('Spoke on WhatsApp');

    const list = inquiryService.getInquiries();
    const found = list.find(i => i.id === inquiry.id);
    expect(found?.status).toBe('replied');
  });
});
