import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  isGeneratedPatronName, 
  sanitizeClientFirestoreProfile 
} from '@/features/auth/services/authService';
import { 
  mergeCustomerProfiles 
} from '@/features/customers/services/customerService';
import { UserProfile } from '@/shared/types';

describe('Phone Registered Patron Detail Display Resilience', () => {
  it('correctly identifies generated placeholder patron names', () => {
    expect(isGeneratedPatronName('MUETY Patron')).toBe(true);
    expect(isGeneratedPatronName('muety patron')).toBe(true);
    expect(isGeneratedPatronName('Patron')).toBe(true);
    expect(isGeneratedPatronName('Patron (8576)')).toBe(true);
    expect(isGeneratedPatronName('Valued Patron')).toBe(true);
    expect(isGeneratedPatronName('')).toBe(true);
    expect(isGeneratedPatronName(null)).toBe(true);

    // Real human names must NOT be flagged as generated
    expect(isGeneratedPatronName('Logesh R')).toBe(false);
    expect(isGeneratedPatronName('Vignesh')).toBe(false);
    expect(isGeneratedPatronName('Mohan Kalvi')).toBe(false);
  });

  it('strips all protected keys in sanitizeClientFirestoreProfile to satisfy Firestore security rules', () => {
    const rawProfile: Partial<UserProfile> = {
      uid: 'user-phone-123',
      displayName: 'Patron (8576)',
      fullName: 'Patron (8576)',
      phoneNumber: '+918825898576',
      phone: '+918825898576',
      email: '',
      customerStatus: 'active',
      role: 'customer',
      roles: ['customer'],
      ordersCount: 2,
      totalSpent: 4197.90,
      isBlocked: false,
      patronCircleMember: true,
      createdAt: '2026-10-25T05:00:00.000Z'
    };

    const sanitized = sanitizeClientFirestoreProfile(rawProfile);

    // Protected keys forbidden by firestore.rules create/update must be stripped
    expect(sanitized.role).toBeUndefined();
    expect(sanitized.roles).toBeUndefined();
    expect(sanitized.customerStatus).toBeUndefined();
    expect(sanitized.ordersCount).toBeUndefined();
    expect(sanitized.totalSpent).toBeUndefined();
    expect(sanitized.isBlocked).toBeUndefined();

    // Critical phone profile keys must be preserved
    expect(sanitized.uid).toBe('user-phone-123');
    expect(sanitized.phoneNumber).toBe('+918825898576');
    expect(sanitized.phone).toBe('+918825898576');
    expect(sanitized.displayName).toBe('Patron (8576)');
    expect(sanitized.patronCircleMember).toBe(true);
  });

  it('mergeCustomerProfiles replaces placeholder name with Patron (phone.slice(-4)) for phone-only patrons', () => {
    const existingPlaceholder: UserProfile = {
      uid: 'user-phone-123',
      email: '',
      displayName: 'MUETY Patron',
      fullName: 'MUETY Patron',
      phoneNumber: '+918825898576',
      phone: '+918825898576',
      createdAt: '2026-10-25T05:00:00.000Z'
    };

    const serverUpdate: Partial<UserProfile> = {
      uid: 'user-phone-123',
      phoneNumber: '+918825898576',
      patronCircleMember: true
    };

    const merged = mergeCustomerProfiles(existingPlaceholder, serverUpdate);

    // Must NOT display "MUETY Patron"
    expect(merged.displayName).not.toBe('MUETY Patron');
    expect(merged.displayName).toBe('Patron (8576)');
    expect(merged.phoneNumber).toBe('+918825898576');
    expect(merged.phone).toBe('+918825898576');
  });

  it('preserves existing real customer names when merging', () => {
    const existingReal: UserProfile = {
      uid: 'user-real-456',
      email: 'logesh@example.com',
      displayName: 'Logesh R',
      fullName: 'Logesh R',
      phoneNumber: '+919876543210',
      phone: '+919876543210',
      createdAt: '2026-10-25T05:00:00.000Z'
    };

    const update: Partial<UserProfile> = {
      uid: 'user-real-456',
      patronCircleMember: true
    };

    const merged = mergeCustomerProfiles(existingReal, update);
    expect(merged.displayName).toBe('Logesh R');
    expect(merged.phoneNumber).toBe('+919876543210');
  });
});
