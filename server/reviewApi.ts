/**
 * MUETY Executive Control Center - Review Server API
 * Provides administrative and storefront review persistence using Firebase Admin SDK.
 */

import { getAdminFirestore, verifyIdTokenAndGetClaims } from './firebaseAdmin';

interface VerifiedAdminCaller {
  uid: string;
  email: string;
  roles: string[];
}

function assertAdminCaller(caller: any): asserts caller is VerifiedAdminCaller {
  if (!caller || typeof caller !== 'object' || !caller.email) {
    throw new Error('UNAUTHENTICATED: Administrative authentication token is required.');
  }
  const roles = Array.isArray(caller.roles) ? caller.roles : [];
  const isAuthorized = roles.some((r: string) => [
    'superadmin', 'super_admin', 'admin', 'support_manager', 'support_executive', 'support_agent', 'catalog_manager'
  ].includes(r.toLowerCase())) || caller.email.toLowerCase() in {
    'superadmin@muety.in': true,
    'admin@muety.in': true,
    'catalog@muety.in': true
  };

  if (!isAuthorized) {
    throw new Error('PERMISSION_DENIED: Access restricted to authorized administrative staff.');
  }
}

function sanitizeReviewDoc(raw: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined && v !== null) {
      clean[k] = v;
    }
  }
  return clean;
}

export async function handleSubmitReviewServer(authHeader: string | null, body: any) {
  if (!body || typeof body !== 'object') {
    throw new Error('INVALID_ARGUMENT: Review body payload is required.');
  }

  const productId = String(body.productId || '').trim();
  const rating = Number(body.rating);

  if (!productId) {
    throw new Error('INVALID_ARGUMENT: productId is required.');
  }

  if (isNaN(rating) || rating < 1 || rating > 5) {
    throw new Error('INVALID_ARGUMENT: rating must be a number between 1 and 5.');
  }

  const id = (typeof body.id === 'string' && body.id.trim()) 
    ? body.id.trim() 
    : `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const reviewDoc = sanitizeReviewDoc({
    id,
    productId,
    productSlug: typeof body.productSlug === 'string' ? body.productSlug.trim() : '',
    productName: typeof body.productName === 'string' ? body.productName.trim() : 'Patron Review',
    authorName: typeof body.authorName === 'string' && body.authorName.trim() ? body.authorName.trim() : 'Patron',
    authorLocation: typeof body.authorLocation === 'string' && body.authorLocation.trim() ? body.authorLocation.trim() : 'India',
    rating: Math.round(rating * 10) / 10,
    title: typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Patron Review',
    quote: typeof body.quote === 'string' ? body.quote.trim() : (typeof body.comment === 'string' ? body.comment.trim() : ''),
    comment: typeof body.comment === 'string' ? body.comment.trim() : (typeof body.quote === 'string' ? body.quote.trim() : ''),
    status: body.status === 'pending' || body.status === 'rejected' ? body.status : 'approved',
    isFeatured: Boolean(body.isFeatured),
    showOnHome: Boolean(body.showOnHome || body.isFeatured),
    verifiedPurchase: body.verifiedPurchase !== undefined ? Boolean(body.verifiedPurchase) : true,
    photoUrl: typeof body.photoUrl === 'string' && body.photoUrl.trim() ? body.photoUrl.trim() : '',
    displayOrder: typeof body.displayOrder === 'number' ? body.displayOrder : 99,
    createdAt: typeof body.createdAt === 'string' && body.createdAt.trim() ? body.createdAt.trim() : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      await firestore.collection('reviews').doc(id).set(reviewDoc, { merge: true });
      console.log(`[ReviewServer] Successfully saved review ${id} to Firestore.`);

      // Update product rating and review count if product exists
      try {
        const prodSnap = await firestore.collection('products').doc(productId).get();
        if (prodSnap.exists) {
          const revsSnap = await firestore.collection('reviews')
            .where('productId', '==', productId)
            .where('status', '==', 'approved')
            .get();
          
          const approvedCount = revsSnap.docs.length;
          const totalRating = revsSnap.docs.reduce((sum, d) => sum + (Number(d.data().rating) || 5), 0);
          const avgRating = approvedCount > 0 ? Number((totalRating / approvedCount).toFixed(1)) : 5.0;

          await firestore.collection('products').doc(productId).update({
            reviewCount: approvedCount,
            rating: avgRating
          });
        }
      } catch (syncErr) {
        console.warn('[ReviewServer] Product rating sync note:', syncErr);
      }
    } catch (dbErr: any) {
      console.error('[ReviewServer] Error writing review to Firestore:', dbErr);
      throw new Error(`INTERNAL: Failed to save review to cloud database: ${dbErr?.message || dbErr}`);
    }
  }

  return {
    success: true,
    review: reviewDoc
  };
}

export async function handleDeleteReviewServer(authHeader: string | null, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader || undefined);
  assertAdminCaller(caller);

  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) {
    throw new Error('INVALID_ARGUMENT: Review id is required for deletion.');
  }

  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const docRef = firestore.collection('reviews').doc(id);
      const snap = await docRef.get();
      let targetProductId = '';
      if (snap.exists) {
        targetProductId = snap.data()?.productId || '';
      }

      await docRef.delete();
      console.log(`[ReviewServer] Admin ${caller.email} deleted review ${id} from Firestore.`);

      if (targetProductId) {
        try {
          const prodSnap = await firestore.collection('products').doc(targetProductId).get();
          if (prodSnap.exists) {
            const revsSnap = await firestore.collection('reviews')
              .where('productId', '==', targetProductId)
              .where('status', '==', 'approved')
              .get();

            const approvedCount = revsSnap.docs.length;
            const totalRating = revsSnap.docs.reduce((sum, d) => sum + (Number(d.data().rating) || 5), 0);
            const avgRating = approvedCount > 0 ? Number((totalRating / approvedCount).toFixed(1)) : 5.0;

            await firestore.collection('products').doc(targetProductId).update({
              reviewCount: approvedCount,
              rating: avgRating
            });
          }
        } catch {}
      }
    } catch (err: any) {
      console.error('[ReviewServer] Error deleting review from Firestore:', err);
      throw new Error(`INTERNAL: Failed to delete review from cloud database: ${err?.message || err}`);
    }
  }

  return {
    success: true,
    deletedId: id
  };
}

export async function handleUpdateReviewServer(authHeader: string | null, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader || undefined);
  assertAdminCaller(caller);

  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) {
    throw new Error('INVALID_ARGUMENT: Review id is required for update.');
  }

  const updates: Record<string, any> = sanitizeReviewDoc(body.updates || body);
  delete updates.id;
  updates.updatedAt = new Date().toISOString();

  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      await firestore.collection('reviews').doc(id).set(updates, { merge: true });
      console.log(`[ReviewServer] Admin ${caller.email} updated review ${id} in Firestore.`);
    } catch (err: any) {
      console.error('[ReviewServer] Error updating review in Firestore:', err);
      throw new Error(`INTERNAL: Failed to update review in cloud database: ${err?.message || err}`);
    }
  }

  return {
    success: true,
    id,
    updates
  };
}
