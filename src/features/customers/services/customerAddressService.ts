import { Address, UserProfile } from '@/shared/types';
import { storageService } from '@/lib/storage/storageService';
import { authService } from '@/features/auth/services/authService';
import { db, isLiveFirebase } from '@/lib/firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';

const ADDRESS_STORAGE_KEY_PREFIX = 'muety_customer_addresses_';

export const INDIAN_STATES = [
  'Tamil Nadu',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'Kerala',
  'Maharashtra',
  'Gujarat',
  'Delhi',
  'Rajasthan',
  'West Bengal',
  'Uttar Pradesh',
  'Madhya Pradesh',
  'Punjab',
  'Haryana',
  'Bihar',
  'Odisha',
  'Assam',
  'Goa',
  'Puducherry'
];

export const isValidIndianPin = (pin: string): boolean => {
  return /^[1-9][0-9]{5}$/.test((pin || '').trim());
};

export const isValidPhone = (phone: string): boolean => {
  const clean = (phone || '').replace(/[^0-9]/g, '');
  return clean.length >= 10 && clean.length <= 12;
};

class CustomerAddressService {
  private getStorageKey(userId?: string): string {
    return `${ADDRESS_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
  }

  public getAddresses(userId?: string): Address[] {
    const key = this.getStorageKey(userId);
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved addresses:', e);
    }

    // Fallback: Check if user has a defaultAddress in profile
    const currentUser = authService.getCurrentUser();
    if (currentUser?.defaultAddress) {
      const initialAddr: Address = {
        ...currentUser.defaultAddress,
        id: currentUser.defaultAddress.id || `addr_${Date.now()}`,
        isDefault: true,
        type: currentUser.defaultAddress.type || 'home'
      };
      this.saveToStorage(userId, [initialAddr]);
      return [initialAddr];
    }

    return [];
  }

  private saveToStorage(userId: string | undefined, addresses: Address[]): void {
    const key = this.getStorageKey(userId);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(addresses));
      }
    } catch (e) {
      console.warn('Failed to save addresses to localStorage:', e);
    }

    // Sync with user profile if authenticated
    const currentUser = authService.getCurrentUser();
    if (currentUser && userId && currentUser.uid === userId) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0] || undefined;
      const updatedUser: UserProfile = {
        ...currentUser,
        addresses,
        defaultAddress: defaultAddr,
        defaultShippingAddressId: defaultAddr?.id
      };
      storageService.saveUser(updatedUser);

      if (db && isLiveFirebase) {
        try {
          setDoc(doc(db, 'users', userId), {
            addresses,
            defaultAddress: defaultAddr || null,
            defaultShippingAddressId: defaultAddr?.id || null
          }, { merge: true }).catch(() => {});
        } catch {}
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('muety_addresses_updated', { detail: addresses }));
    }
  }

  public addAddress(
    userId: string | undefined,
    address: Omit<Address, 'id'> & { id?: string }
  ): Address {
    const current = this.getAddresses(userId);
    const newId = address.id || `addr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // If marked default or first address, set as default
    const shouldBeDefault = address.isDefault || current.length === 0;

    const formatted: Address = {
      ...address,
      id: newId,
      fullName: (address.fullName || '').trim(),
      phone: (address.phone || '').trim(),
      streetAddress: (address.streetAddress || '').trim(),
      city: (address.city || '').trim(),
      state: (address.state || 'Tamil Nadu').trim(),
      postalCode: (address.postalCode || '').trim(),
      country: (address.country || 'India').trim(),
      type: address.type || 'home',
      isDefault: shouldBeDefault
    };

    let updatedList = shouldBeDefault
      ? current.map(a => ({ ...a, isDefault: false }))
      : [...current];

    updatedList = [formatted, ...updatedList];
    this.saveToStorage(userId, updatedList);
    return formatted;
  }

  public updateAddress(
    userId: string | undefined,
    addressId: string,
    updates: Partial<Address>
  ): Address | null {
    const current = this.getAddresses(userId);
    const idx = current.findIndex(a => a.id === addressId);
    if (idx === -1) return null;

    const isNowDefault = updates.isDefault;

    const updatedList = current.map(a => {
      if (a.id === addressId) {
        return { ...a, ...updates, id: addressId };
      }
      if (isNowDefault) {
        return { ...a, isDefault: false };
      }
      return a;
    });

    this.saveToStorage(userId, updatedList);
    return updatedList.find(a => a.id === addressId) || null;
  }

  public deleteAddress(userId: string | undefined, addressId: string): boolean {
    const current = this.getAddresses(userId);
    const target = current.find(a => a.id === addressId);
    if (!target) return false;

    const updatedList = current.filter(a => a.id !== addressId);

    // If deleted address was default, promote the first remaining address to default
    if (target.isDefault && updatedList.length > 0) {
      updatedList[0].isDefault = true;
    }

    this.saveToStorage(userId, updatedList);
    return true;
  }

  public setDefaultAddress(userId: string | undefined, addressId: string): Address | null {
    const current = this.getAddresses(userId);
    const target = current.find(a => a.id === addressId);
    if (!target) return null;

    const updatedList = current.map(a => ({
      ...a,
      isDefault: a.id === addressId
    }));

    this.saveToStorage(userId, updatedList);
    return updatedList.find(a => a.id === addressId) || null;
  }
}

export const customerAddressService = new CustomerAddressService();
