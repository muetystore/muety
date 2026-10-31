import { SareeCollection } from '../types';
import { storageService, subscribeLocalCollections } from '@/lib/storage/storageService';
import { db } from '@/lib/firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  Unsubscribe 
} from 'firebase/firestore';
import { INITIAL_COLLECTIONS } from '../../../../scripts/seed/seedData';

const isTestEnv = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || Boolean((process.env as any).VITEST));

class CollectionService {
  private hasCheckedInitialSeed = false;

  getCollections(): SareeCollection[] {
    return storageService.getCollections();
  }

  getCollectionById(idOrSlug: string): SareeCollection | undefined {
    return storageService.getCollectionById(idOrSlug);
  }

  getOccasionCollections(): SareeCollection[] {
    const list = this.getCollections();
    return list
      .filter(c => c.showInFestiveEdits !== false)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  getShopByCollections(type?: 'occasion' | 'fabric' | 'style' | 'collection' | 'curated'): SareeCollection[] {
    const list = this.getCollections();
    return list
      .filter(c => c.showInShopBy !== false && (!type || c.type === type))
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  async saveCollection(data: Partial<SareeCollection> & { name: string }): Promise<SareeCollection> {
    const nowIso = new Date().toISOString();
    const id = data.id || `col-${Date.now()}`;
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || id;

    const payload: SareeCollection = {
      id,
      collectionId: id,
      name: data.name.trim(),
      slug: slug.trim(),
      description: (data.description || '').trim(),
      bannerImage: data.bannerImage || '/saree_model_individual.jpg',
      featured: data.featured ?? true,
      productCount: Number(data.productCount || 0),
      displayOrder: Number(data.displayOrder !== undefined ? data.displayOrder : 1),
      type: data.type || 'occasion',
      badge: (data.badge || '').trim(),
      showInShopBy: data.showInShopBy !== false,
      showInFestiveEdits: data.showInFestiveEdits !== false,
      createdAt: data.createdAt || nowIso,
      updatedAt: nowIso
    };

    if (db && !isTestEnv) {
      try {
        const colDocRef = doc(db, 'collections', id);
        await setDoc(colDocRef, payload, { merge: true });
        if (import.meta.env.DEV) {
          console.log('[FIRESTORE WRITE SUCCESS] Collection saved:', id, payload.name);
        }
      } catch (err: any) {
        console.error('[FIRESTORE WRITE ERROR] Collection save failed:', err);
        throw new Error(`Firestore collection save failed: ${err?.message || 'Permission denied or network failure.'}`);
      }
    }

    storageService.addCollection(payload);
    return payload;
  }

  async deleteCollection(id: string): Promise<boolean> {
    if (db && !isTestEnv) {
      try {
        await deleteDoc(doc(db, 'collections', id));
        if (import.meta.env.DEV) {
          console.log('[FIRESTORE WRITE SUCCESS] Collection deleted:', id);
        }
      } catch (err: any) {
        console.error('[FIRESTORE WRITE ERROR] Collection delete failed:', err);
        throw new Error(`Firestore collection deletion failed: ${err?.message || 'Permission denied or network failure.'}`);
      }
    }

    storageService.deleteCollection(id);
    return true;
  }

  async seedInitialCollectionsIfEmpty(): Promise<void> {
    if (this.hasCheckedInitialSeed || isTestEnv || !db) return;
    this.hasCheckedInitialSeed = true;

    try {
      const snap = await getDocs(collection(db, 'collections'));
      if (snap.empty) {
        console.log('[FIRESTORE SEED] Seeding default collections...');
        for (const col of INITIAL_COLLECTIONS) {
          await setDoc(doc(db, 'collections', col.id), col, { merge: true });
        }
        console.log('[FIRESTORE SEED] Default collections seeded successfully.');
      }
    } catch (err) {
      console.warn('[FIRESTORE SEED NOTE] Could not seed collections to Firestore:', err);
    }
  }

  subscribeToCollections(
    callback: (collections: SareeCollection[]) => void, 
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (db && !isTestEnv) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'collections'), (snapshot) => {
          const cloudCols: SareeCollection[] = [];
          if (!snapshot.empty) {
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as any;
              if (raw && (raw.id || docSnap.id)) {
                cloudCols.push({
                  ...raw,
                  id: docSnap.id || raw.id,
                  bannerImage: raw.bannerImage || '/saree_model_individual.jpg',
                  displayOrder: Number(raw.displayOrder !== undefined ? raw.displayOrder : 99),
                  showInShopBy: raw.showInShopBy !== false,
                  showInFestiveEdits: raw.showInFestiveEdits !== false
                });
              }
            });
          }

          // If firestore has items, sort and save them
          if (cloudCols.length > 0) {
            cloudCols.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
            storageService.saveCollections(cloudCols);
            callback(cloudCols);
          } else {
            // When Firestore collections are empty (e.g. admin deleted them), respect deletion
            storageService.saveCollections([]);
            callback([]);
          }
        }, (err) => {
          console.error('[Firestore Collections] Live subscription read error:', err);
          if (onError) onError(err as Error);
          else callback(storageService.getCollections());
        });

        return unsubscribe;
      } catch (err: any) {
        console.error('[Firestore Collections] Live subscription init error:', err);
        if (onError) onError(err as Error);
      }
    }

    callback(storageService.getCollections());
    const unsubLocal = subscribeLocalCollections((updatedCols) => callback(updatedCols));
    const handler = () => callback(storageService.getCollections());
    if (typeof window !== 'undefined') {
      window.addEventListener('muety_collections_updated', handler);
      return () => {
        unsubLocal();
        window.removeEventListener('muety_collections_updated', handler);
      };
    }
    return unsubLocal;
  }
}

export const collectionService = new CollectionService();
