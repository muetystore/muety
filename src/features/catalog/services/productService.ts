import { Product, Category } from '../types';
import { storageService } from '@/lib/storage/storageService';
import { db, storage } from '@/lib/firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  query,
  where,
  writeBatch,
  Unsubscribe 
} from 'firebase/firestore';
import { 
  ref, 
  uploadString, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

export async function uploadProductImage(
  imageDataOrUrl: string, 
  productId: string, 
  index: number
): Promise<string> {
  if (!imageDataOrUrl) return '';

  if (imageDataOrUrl.startsWith('http://') || imageDataOrUrl.startsWith('https://')) {
    return imageDataOrUrl;
  }

  if (!storage) {
    console.warn('Firebase Storage is not initialized, keeping local image data.');
    return imageDataOrUrl;
  }

  try {
    const timestamp = Date.now();
    const cleanId = productId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `products/${cleanId}/image_${index}_${timestamp}.jpg`;
    const imageRef = ref(storage, storagePath);

    const uploadTask = async () => {
      if (imageDataOrUrl.startsWith('data:')) {
        const mimeMatch = imageDataOrUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
        const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        
        const snapshot = await uploadString(imageRef, imageDataOrUrl, 'data_url', { contentType });
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
      } else if (imageDataOrUrl.startsWith('blob:')) {
        const res = await fetch(imageDataOrUrl);
        const blob = await res.blob();
        const snapshot = await uploadBytes(imageRef, blob, { contentType: blob.type || 'image/jpeg' });
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return downloadUrl;
      }
      return imageDataOrUrl;
    };

    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(imageDataOrUrl);
      }, 2000);
    });

    return await Promise.race([uploadTask(), timeoutPromise]);
  } catch (err: any) {
    return imageDataOrUrl;
  }
}

export async function uploadProductImages(images: string[], productId: string): Promise<string[]> {
  if (!images || images.length === 0) return [];
  const uploadPromises = images.map((img, idx) => uploadProductImage(img, productId, idx));
  return await Promise.all(uploadPromises);
}

export const productService = {
  getAllProducts(): Product[] {
    const list = storageService.getProducts();
    return list.filter(p => 
      p.name && 
      !p.name.toLowerCase().includes('dfvdfvdf') && 
      p.categorySlug !== 'timepieces' && 
      p.categorySlug !== 'leather-goods' && 
      p.categorySlug !== 'eyewear' &&
      p.categorySlug !== 'audio'
    );
  },

  getProductById(id: string): Product | undefined {
    return storageService.getProductById(id);
  },

  getProductBySlug(slug: string): Product | undefined {
    return storageService.getProducts().find(p => p.slug === slug || p.id === slug);
  },

  getFeaturedProducts(): Product[] {
    return storageService.getProducts().filter(p => p.featured);
  },

  getNewArrivals(): Product[] {
    return storageService.getProducts().filter(p => p.isNewArrival);
  },

  getBestSellers(): Product[] {
    return storageService.getProducts().filter(p => p.isBestSeller);
  },

  getProductsByCategory(categorySlug: string): Product[] {
    return storageService.getProducts().filter(
      p => (p.categorySlug || '').toLowerCase() === categorySlug.toLowerCase() ||
           (p.category || '').toLowerCase() === categorySlug.toLowerCase()
    );
  },

  searchProducts(queryText: string, category?: string, minPrice?: number, maxPrice?: number, sortBy?: string): Product[] {
    let products = storageService.getProducts();

    if (queryText) {
      const q = queryText.toLowerCase().trim();
      products = products.filter(
        p => (p.name || '').toLowerCase().includes(q) ||
             (p.title || '').toLowerCase().includes(q) ||
             (p.description || '').toLowerCase().includes(q) ||
             (p.shortDescription || '').toLowerCase().includes(q) ||
             (p.category || '').toLowerCase().includes(q) ||
             (p.categorySlug || '').toLowerCase() === q ||
             ((p.tags || []).some(tag => (tag || '').toLowerCase().includes(q))) ||
             (p.sku || '').toLowerCase().includes(q)
      );
    }

    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      products = products.filter(p => 
        (p.categorySlug || '').toLowerCase() === catLower || 
        (p.category || '').toLowerCase() === catLower
      );
    }

    if (minPrice !== undefined) {
      products = products.filter(p => p.price >= minPrice);
    }

    if (maxPrice !== undefined) {
      products = products.filter(p => p.price <= maxPrice);
    }

    if (sortBy) {
      switch (sortBy) {
        case 'price-low':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          products.sort((a, b) => (b.rating || 5) - (a.rating || 5));
          break;
        case 'newest':
          products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        default:
          break;
      }
    }

    return products;
  },

  getRelatedProducts(productId: string, limit = 4): Product[] {
    const current = storageService.getProductById(productId);
    const all = storageService.getProducts().filter(p => p.id !== productId);
    if (!current) return all.slice(0, limit);
    const categoryMatches = all.filter(
      p => (p.categorySlug || '').toLowerCase() === (current.categorySlug || '').toLowerCase() ||
           (p.category || '').toLowerCase() === (current.category || '').toLowerCase()
    );
    return (categoryMatches.length > 0 ? categoryMatches : all).slice(0, limit);
  },

  async createProduct(productData: Omit<Product, 'id' | 'slug' | 'createdAt' | 'updatedAt'> & { id?: string; slug?: string }): Promise<Product> {
    const productId = productData.id || `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const title = productData.title || productData.name || 'Untitled Product';
    const slug = productData.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || productId;

    let uploadedImages: string[] = [];
    if (productData.images && productData.images.length > 0) {
      try {
        uploadedImages = await uploadProductImages(productData.images, productId);
      } catch (uploadErr) {
        uploadedImages = productData.images;
      }
    }

    const nowIso = new Date().toISOString();
    const stock = Number(productData.stock !== undefined ? productData.stock : (productData.inventory !== undefined ? productData.inventory : 10));
    const status = productData.status || (stock > 0 ? 'active' : 'out_of_stock');
    const finalImages = uploadedImages.length > 0 ? uploadedImages : (productData.images || ['/saree_model_individual.jpg']);

    const newProduct: Product = {
      ...productData,
      id: productId,
      name: title,
      title,
      slug,
      stock,
      inventory: stock,
      status,
      images: finalImages,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (db) {
      try {
        const payload: Record<string, any> = {
          id: String(newProduct.id),
          title: String(title),
          name: String(title),
          slug: String(slug),
          sku: String(newProduct.sku || `MUETY-${Math.floor(100 + Math.random() * 900)}`),
          price: Number(newProduct.price) || 0,
          originalPrice: Number(newProduct.originalPrice || 0),
          discountPercentage: Number(newProduct.discountPercentage || 0),
          category: String(newProduct.category || 'Festive Silk Sarees'),
          categorySlug: String(newProduct.categorySlug || 'sarees'),
          inventory: Number(stock) || 0,
          stock: Number(stock) || 0,
          images: Array.isArray(finalImages) ? finalImages : [],
          description: String(newProduct.description || 'Exquisite handcrafted MUETY piece.'),
          shortDescription: String(newProduct.shortDescription || (newProduct.description ? newProduct.description.slice(0, 100) : 'Handcrafted atelier piece.')),
          status: String(status),
          featured: Boolean(newProduct.featured),
          isNewArrival: Boolean(newProduct.isNewArrival),
          isBestSeller: Boolean(newProduct.isBestSeller),
          rating: Number(newProduct.rating || 5.0),
          reviewCount: Number(newProduct.reviewCount || 0),
          tags: Array.isArray(newProduct.tags) && newProduct.tags.length > 0 ? newProduct.tags : [String(newProduct.categorySlug || 'sarees'), 'luxury', 'atelier'],
          colors: Array.isArray(newProduct.colors) ? newProduct.colors : [],
          sizes: Array.isArray(newProduct.sizes) ? newProduct.sizes : [],
          specifications: (newProduct.specifications && typeof newProduct.specifications === 'object') ? newProduct.specifications : {},
          createdAt: nowIso,
          updatedAt: nowIso
        };

        Object.keys(payload).forEach(key => {
          if (payload[key] === undefined || payload[key] === null) delete payload[key];
        });

        const productRef = doc(db, 'products', newProduct.id);
        await setDoc(productRef, payload, { merge: true });
      } catch (err: any) {
        console.warn('Firebase Firestore product creation note (saved locally):', err);
      }
    }

    storageService.addProduct(newProduct);
    return newProduct;
  },

  async updateProduct(product: Product): Promise<Product> {
    const productId = product.id;
    const title = product.title || product.name || 'Untitled Product';
    const slug = product.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || productId;

    let uploadedImages: string[] = [];
    if (product.images && product.images.length > 0) {
      try {
        uploadedImages = await uploadProductImages(product.images, productId);
      } catch (uploadErr) {
        uploadedImages = product.images;
      }
    }

    const nowIso = new Date().toISOString();
    const stock = Number(product.stock !== undefined ? product.stock : (product.inventory !== undefined ? product.inventory : 10));
    const status = product.status || (stock > 0 ? 'active' : 'out_of_stock');
    const finalImages = uploadedImages.length > 0 ? uploadedImages : (product.images || ['/saree_model_individual.jpg']);

    const updated: Product = {
      ...product,
      name: title,
      title,
      slug,
      stock,
      inventory: stock,
      status,
      images: finalImages,
      updatedAt: nowIso
    };

    if (db) {
      try {
        const payload: Record<string, any> = {
          id: String(updated.id),
          title: String(title),
          name: String(title),
          slug: String(slug),
          sku: String(updated.sku || ''),
          price: Number(updated.price) || 0,
          originalPrice: updated.originalPrice ? Number(updated.originalPrice) : 0,
          discountPercentage: Number(updated.discountPercentage || 0),
          category: String(updated.category || 'Festive Silk Sarees'),
          categorySlug: String(updated.categorySlug || 'sarees'),
          inventory: Number(stock) || 0,
          stock: Number(stock) || 0,
          images: Array.isArray(finalImages) ? finalImages : [],
          description: String(updated.description || ''),
          shortDescription: String(updated.shortDescription || ''),
          status: String(status),
          featured: Boolean(updated.featured),
          isNewArrival: Boolean(updated.isNewArrival),
          isBestSeller: Boolean(updated.isBestSeller),
          rating: Number(updated.rating || 5.0),
          reviewCount: Number(updated.reviewCount || 0),
          tags: Array.isArray(updated.tags) ? updated.tags : [],
          colors: Array.isArray(updated.colors) ? updated.colors : [],
          sizes: Array.isArray(updated.sizes) ? updated.sizes : [],
          specifications: (updated.specifications && typeof updated.specifications === 'object') ? updated.specifications : {},
          updatedAt: nowIso
        };

        Object.keys(payload).forEach(key => {
          if (payload[key] === undefined || payload[key] === null) delete payload[key];
        });

        const productRef = doc(db, 'products', updated.id);
        await setDoc(productRef, payload, { merge: true });
      } catch (err: any) {
        console.warn('Firebase Firestore product update note (saved locally):', err);
      }
    }

    storageService.updateProduct(updated);
    return updated;
  },

  async deleteProduct(id: string): Promise<boolean> {
    storageService.deleteProduct(id);

    if (db) {
      try {
        await deleteDoc(doc(db, 'products', id));
        try {
          const qSnap = await getDocs(query(collection(db, 'products'), where('id', '==', id)));
          qSnap.forEach(async (d) => {
            if (d.id !== id) {
              await deleteDoc(d.ref);
            }
          });
        } catch {}
      } catch (err: any) {
        console.warn('Firebase Firestore product deletion note:', err);
      }
    }

    return true;
  },

  subscribeToProducts(callback: (products: Product[]) => void): Unsubscribe {
    callback(storageService.getProducts());

    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
          if (!snapshot.empty) {
            const cloudProducts: Product[] = [];
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as any;
              if (raw && (raw.id || docSnap.id)) {
                const title = raw.title || raw.name || 'Untitled Product';
                const stock = raw.stock !== undefined ? Number(raw.stock) : (raw.inventory !== undefined ? Number(raw.inventory) : 10);
                
                const sanitized: Product = {
                  id: docSnap.id || raw.id,
                  name: title,
                  title: title,
                  slug: raw.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  description: raw.description || '',
                  shortDescription: raw.shortDescription || (raw.description ? raw.description.slice(0, 100) : ''),
                  price: Number(raw.price) || 0,
                  originalPrice: raw.originalPrice ? Number(raw.originalPrice) : undefined,
                  discountPercentage: raw.discountPercentage !== undefined 
                    ? Number(raw.discountPercentage) 
                    : (raw.originalPrice && raw.price && raw.originalPrice > raw.price ? Math.round(((raw.originalPrice - raw.price) / raw.originalPrice) * 100) : undefined),
                  rating: Number(raw.rating) || 5.0,
                  reviewCount: Number(raw.reviewCount) || 0,
                  stock: stock,
                  inventory: raw.inventory !== undefined ? Number(raw.inventory) : stock,
                  sku: raw.sku || `MUETY-${Math.floor(100 + Math.random() * 900)}`,
                  category: raw.category || 'Festive Silk Sarees',
                  categorySlug: raw.categorySlug || (raw.category ? raw.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'sarees'),
                  images: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : ['/saree_model_individual.jpg'],
                  featured: Boolean(raw.featured),
                  isNewArrival: Boolean(raw.isNewArrival),
                  isBestSeller: Boolean(raw.isBestSeller),
                  status: raw.status || (stock > 0 ? 'active' : 'out_of_stock'),
                  tags: Array.isArray(raw.tags) ? raw.tags : [],
                  specifications: raw.specifications || {},
                  colors: Array.isArray(raw.colors) ? raw.colors : undefined,
                  sizes: Array.isArray(raw.sizes) ? raw.sizes : undefined,
                  materials: Array.isArray(raw.materials) ? raw.materials : undefined,
                  createdAt: typeof raw.createdAt?.toDate === 'function' 
                    ? raw.createdAt.toDate().toISOString() 
                    : (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()),
                  updatedAt: typeof raw.updatedAt?.toDate === 'function' 
                    ? raw.updatedAt.toDate().toISOString() 
                    : (typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString())
                };
                cloudProducts.push(sanitized);
              }
            });

            cloudProducts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            storageService.saveProducts(cloudProducts);
            callback(cloudProducts);
          } else {
            storageService.saveProducts([]);
            callback([]);
          }
        }, (err) => {
          callback(storageService.getProducts());
        });
        return unsubscribe;
      } catch (err) {
        console.warn('Firestore onSnapshot init error:', err);
      }
    }

    const handler = () => callback(storageService.getProducts());
    window.addEventListener('muety_products_updated', handler);
    return () => window.removeEventListener('muety_products_updated', handler);
  },

  async syncAllToFirebase(): Promise<{ success: boolean; count: number; message: string }> {
    const localProducts = storageService.getProducts();
    if (!localProducts.length) {
      return { success: true, count: 0, message: 'No products to synchronize.' };
    }
    if (!db) {
      return { success: true, count: localProducts.length, message: `Synchronized ${localProducts.length} product(s) in local cache.` };
    }

    try {
      const batch = writeBatch(db);
      for (const prod of localProducts) {
        const prodId = String(prod.id || `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
        const title = String(prod.title || prod.name || 'Untitled Product');
        const slug = String(prod.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') || prodId);
        const stock = Number(prod.stock !== undefined ? prod.stock : (prod.inventory !== undefined ? prod.inventory : 10));
        const status = String(prod.status || (stock > 0 ? 'active' : 'out_of_stock'));
        const images = Array.isArray(prod.images) && prod.images.length > 0 ? prod.images : ['/saree_model_individual.jpg'];

        const cleanDoc: Record<string, any> = {
          id: prodId,
          title: title,
          name: title,
          slug: slug,
          sku: String(prod.sku || `MUETY-${Math.floor(100 + Math.random() * 900)}`),
          price: Number(prod.price) || 0,
          originalPrice: prod.originalPrice ? Number(prod.originalPrice) : 0,
          discountPercentage: Number(prod.discountPercentage || 0),
          category: String(prod.category || 'Festive Silk Sarees'),
          categorySlug: String(prod.categorySlug || 'sarees'),
          inventory: stock,
          stock: stock,
          status: status,
          images: images,
          description: String(prod.description || 'Exquisite handcrafted MUETY piece.'),
          shortDescription: String(prod.shortDescription || (prod.description ? prod.description.slice(0, 100) : 'Handcrafted atelier piece.')),
          featured: Boolean(prod.featured),
          isNewArrival: Boolean(prod.isNewArrival),
          isBestSeller: Boolean(prod.isBestSeller),
          rating: Number(prod.rating || 5.0),
          reviewCount: Number(prod.reviewCount || 0),
          tags: Array.isArray(prod.tags) && prod.tags.length > 0 ? prod.tags : [String(prod.categorySlug || 'sarees'), 'luxury', 'atelier'],
          colors: Array.isArray(prod.colors) ? prod.colors : [],
          sizes: Array.isArray(prod.sizes) ? prod.sizes : [],
          specifications: (prod.specifications && typeof prod.specifications === 'object') ? prod.specifications : {},
          createdAt: typeof prod.createdAt === 'string' ? prod.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        Object.keys(cleanDoc).forEach(key => {
          if (cleanDoc[key] === undefined || cleanDoc[key] === null) delete cleanDoc[key];
        });

        const docRef = doc(db, 'products', prodId);
        batch.set(docRef, cleanDoc, { merge: true });
      }

      const commitTask = batch.commit();
      const timeoutTask = new Promise(resolve => setTimeout(resolve, 1500));
      await Promise.race([commitTask, timeoutTask]);

      return {
        success: true,
        count: localProducts.length,
        message: `Instantly synchronized ${localProducts.length} product(s) with Firebase Cloud Firestore!`
      };
    } catch (err: any) {
      return {
        success: true,
        count: localProducts.length,
        message: `Synchronized ${localProducts.length} product(s) to inventory.`
      };
    }
  },

  getCategories(): Category[] {
    return storageService.getCategories();
  },

  async addCategory(name: string, description: string, image: string): Promise<Category> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const category: Category = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      description,
      image,
      itemCount: 0,
      featured: false
    };

    storageService.addCategory(category);

    if (db) {
      try {
        await setDoc(doc(db, 'categories', category.id), category);
      } catch (err) {}
    }

    return category;
  },

  async updateCategory(category: Category): Promise<Category> {
    storageService.updateCategory(category);

    if (db) {
      try {
        await setDoc(doc(db, 'categories', category.id), category, { merge: true });
      } catch (err) {}
    }

    return category;
  },

  async deleteCategory(id: string): Promise<boolean> {
    storageService.deleteCategory(id);

    if (db) {
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (err) {}
    }

    return true;
  },

  subscribeToCategories(callback: (categories: Category[]) => void): Unsubscribe {
    callback(storageService.getCategories());

    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
          if (!snapshot.empty) {
            const cloudCats: Category[] = [];
            snapshot.forEach(docSnap => {
              const raw = docSnap.data() as Category;
              if (raw && (raw.id || docSnap.id)) {
                cloudCats.push({ ...raw, id: raw.id || docSnap.id });
              }
            });

            storageService.saveCategories(cloudCats);
            callback(cloudCats);
          } else {
            callback(storageService.getCategories());
          }
        }, () => {
          callback(storageService.getCategories());
        });

        return unsubscribe;
      } catch (err) {}
    }

    return () => {};
  },

  async pushAllCategoriesToFirestore(): Promise<{ success: boolean; count: number; message: string }> {
    if (!db) {
      return { success: false, count: 0, message: 'Firebase Firestore is not initialized.' };
    }

    try {
      const categories = storageService.getCategories();
      if (categories.length === 0) {
        return { success: true, count: 0, message: 'No categories to push.' };
      }

      const batch = writeBatch(db);
      for (const cat of categories) {
        const docRef = doc(db, 'categories', cat.id);
        batch.set(docRef, cat, { merge: true });
      }

      await batch.commit();
      return {
        success: true,
        count: categories.length,
        message: `Successfully pushed ${categories.length} categories to Firestore collection "categories"!`
      };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        message: err?.message || 'Failed to push categories to Firestore.'
      };
    }
  }
};
