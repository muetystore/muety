import { Category, Product } from '../types';
import { storageService } from '@/lib/storage/storageService';
import { db } from '@/lib/firebase/firebase';
import { collection, doc, getDoc, getDocs, query, where, runTransaction } from 'firebase/firestore';

/**
 * Generate a 2-letter uppercase category code suggestion from a category name.
 *  
 * CASE 1 — single-word category:
 * Take the first two alphabetic characters.
 * Examples: Saree → SA, Silk → SI, Kurti → KU, Jewellery → JE
 * 
 * CASE 2 — multiple-word category:
 * Take the first alphabetic character of the first two meaningful words.
 * Examples: Kanchivaram Saree → KS, Silk Saree → SS, Wedding Collection → WC, Designer Blouse → DB
 */
export function generateCategoryCodeSuggestion(categoryName: string): string {
  if (!categoryName || !categoryName.trim()) return '';

  // Clean string: remove numbers, punctuation, special chars. Keep letters and spaces.
  const cleaned = categoryName.trim().replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ');
  const words = cleaned.split(' ').filter(w => w.length > 0);

  if (words.length === 0) return '';

  if (words.length === 1) {
    // Single word: take first two characters
    const word = words[0].toUpperCase();
    if (word.length >= 2) return word.slice(0, 2);
    return (word + 'X').slice(0, 2);
  } else {
    // Multiple words: take first letter of first two words
    const letter1 = words[0][0].toUpperCase();
    const letter2 = words[1][0].toUpperCase();
    return `${letter1}${letter2}`;
  }
}

/**
 * Validates category code format:
 * - Exactly 2 alphabetic characters (A-Z)
 * - Uppercase
 * - No numbers, spaces, or hyphens
 */
export function validateCategoryCode(code: string): { valid: boolean; error?: string } {
  if (!code) {
    return { valid: false, error: 'Category code is required.' };
  }
  const clean = code.trim();
  if (clean.length !== 2) {
    return { valid: false, error: 'Category code must be exactly 2 letters.' };
  }
  if (!/^[A-Z]{2}$/.test(clean)) {
    return { valid: false, error: 'Category code must contain only uppercase A-Z letters.' };
  }
  return { valid: true };
}

/**
 * Check if a categoryCode is already used by another category.
 * Enforces case-insensitive uniqueness across Firestore and local storage.
 */
export async function isCategoryCodeUnique(code: string, currentCategoryId?: string): Promise<boolean> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode || cleanCode.length !== 2) return false;

  // Check local categories
  const localCats = storageService.getCategories();
  const localMatch = localCats.some(
    c => (c.categoryCode || '').toUpperCase() === cleanCode && c.id !== currentCategoryId
  );
  if (localMatch) return false;

  // Check Firestore canonical categoryCodes index / collection (only in non-test mode)
  const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));
  if (db && !isTestEnv) {
    try {
      const codeRef = doc(db, 'categoryCodes', cleanCode);
      const codeSnap = await getDoc(codeRef);
      if (codeSnap.exists() && codeSnap.data()?.categoryId !== currentCategoryId) {
        return false;
      }

      const q = query(collection(db, 'categories'), where('categoryCode', '==', cleanCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const matchingDoc = snap.docs.find(d => d.id !== currentCategoryId);
        if (matchingDoc) return false;
      }
    } catch (err) {
      console.warn('[CategoryCodeService] Firestore uniqueness check note:', err);
    }
  }

  return true;
}

/**
 * Check if a category code is locked because it is associated with existing products.
 */
export function isCategoryCodeLocked(categoryId: string): boolean {
  if (!categoryId) return false;
  const products = storageService.getProducts();
  return products.some(p => 
    (p.categoryIds && p.categoryIds.includes(categoryId)) || 
    p.primaryCategoryId === categoryId ||
    p.categoryId === categoryId
  );
}
