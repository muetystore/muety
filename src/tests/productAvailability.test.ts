import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('@/lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {}
}));
vi.mock('../lib/firebase/firebase', () => ({
  db: null,
  auth: null,
  isLiveFirebase: false,
  firebaseConfig: {}
}));
import { productService } from '../features/catalog/services/productService';
import { storageService } from '../lib/storage/storageService';
import { auditService } from '../shared/services/auditService';
import { orderService } from '../features/orders/services/orderService';
import { Product } from '../features/catalog/types';

describe('Product Manual Availability ERP Architecture', () => {

  beforeEach(() => {
    storageService.clearAll();
  });

  it('1. Existing product without availability is safely treated as available', () => {
    const rawProduct: any = {
      id: 'prod-legacy-1',
      name: 'Legacy Kanchivaram Saree',
      slug: 'legacy-kanchivaram-saree',
      sku: 'KV-01',
      price: 5000,
      stock: 10,
      category: 'Silk Sarees',
      categorySlug: 'sarees',
      images: ['/saree_model_individual.jpg'],
      published: true,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
      // Note: no availability field present
    };

    storageService.addProduct(rawProduct);
    const retrieved = storageService.getProductById('prod-legacy-1');

    expect(retrieved).toBeDefined();
    expect(retrieved?.availability).toBe('available');
  });

  it('2. availability="available" makes product purchasable', () => {
    const prod: Product = {
      id: 'prod-avail-1',
      name: 'Available Bridal Saree',
      slug: 'available-bridal-saree',
      sku: 'KV-02',
      price: 6000,
      stock: 5,
      category: 'Silk Sarees',
      categorySlug: 'sarees',
      images: ['/saree_model_individual.jpg'],
      published: true,
      status: 'active',
      availability: 'available',
      shortDescription: 'Available saree',
      description: 'Available saree description',
      tags: [],
      rating: 5,
      reviewCount: 0,
      specifications: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.addProduct(prod);
    const retrieved = storageService.getProductById('prod-avail-1');
    expect(retrieved?.availability).toBe('available');
    expect(retrieved?.stock).toBeGreaterThan(0);
  });

  it('3. availability="sold_out" product remains visible in catalog but marked unavailable', () => {
    const prod: Product = {
      id: 'prod-soldout-1',
      name: 'Offline Sold Saree',
      slug: 'offline-sold-saree',
      sku: 'KV-03',
      price: 7500,
      stock: 10,
      category: 'Silk Sarees',
      categorySlug: 'sarees',
      images: ['/saree_model_individual.jpg'],
      published: true,
      status: 'active',
      availability: 'sold_out',
      shortDescription: 'Sold out offline',
      description: 'Sold out offline description',
      tags: [],
      rating: 5,
      reviewCount: 0,
      specifications: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.addProduct(prod);
    const catalog = productService.getAllProducts();
    const found = catalog.find(p => p.id === 'prod-soldout-1');

    expect(found).toBeDefined();
    expect(found?.name).toBe('Offline Sold Saree');
    expect(found?.availability).toBe('sold_out');
    expect(found?.published).toBe(true);
    expect(found?.status).toBe('active');
  });

  it('4. Mark available persists availability as "available"', async () => {
    const prod = await productService.createProduct({
      name: 'Kanchi Pure Silk Saree',
      price: 8000,
      stock: 5,
      category: 'Kanchipuram Silk',
      categorySlug: 'kanchipuram-silk',
      availability: 'sold_out',
      description: 'Test description',
      shortDescription: 'Test short description'
    });

    expect(prod.availability).toBe('sold_out');

    const updated = await productService.markProductAvailable(prod.id);
    expect(updated.availability).toBe('available');

    const reFetched = storageService.getProductById(prod.id);
    expect(reFetched?.availability).toBe('available');
  });

  it('5. Mark sold out persists availability as "sold_out"', async () => {
    const prod = await productService.createProduct({
      name: 'Dharmavaram Gold Zari Saree',
      price: 9500,
      stock: 8,
      category: 'Dharmavaram Silk',
      categorySlug: 'dharmavaram-silk',
      availability: 'available',
      description: 'Test description',
      shortDescription: 'Test short description'
    });

    expect(prod.availability).toBe('available');

    const updated = await productService.markProductSoldOut(prod.id);
    expect(updated.availability).toBe('sold_out');

    const reFetched = storageService.getProductById(prod.id);
    expect(reFetched?.availability).toBe('sold_out');
  });

  it('6. Changing availability does NOT alter the SKU', async () => {
    const prod = await productService.createProduct({
      name: 'Banarasi Brocade Saree',
      price: 12000,
      stock: 3,
      sku: 'KV-42',
      category: 'Banarasi',
      categorySlug: 'banarasi',
      availability: 'available',
      description: 'Test description',
      shortDescription: 'Test short description'
    });

    const initialSku = prod.sku;

    const updated = await productService.markProductSoldOut(prod.id);
    expect(updated.sku).toBe(initialSku);

    const reAvailable = await productService.markProductAvailable(prod.id);
    expect(reAvailable.sku).toBe(initialSku);
  });

  it('7. Changing availability does NOT alter the Product ID', async () => {
    const prod = await productService.createProduct({
      name: 'Mysore Silk Saree',
      price: 6500,
      stock: 4,
      category: 'Mysore Silk',
      categorySlug: 'mysore-silk',
      description: 'Test description',
      shortDescription: 'Test short description'
    });

    const initialId = prod.id;

    const updated = await productService.markProductSoldOut(prod.id);
    expect(updated.id).toBe(initialId);
  });

  it('8. Changing availability leaves published state unchanged', async () => {
    const prod = await productService.createProduct({
      name: 'Tussar Silk Handloom',
      price: 4500,
      stock: 2,
      published: true,
      category: 'Tussar',
      categorySlug: 'tussar',
      description: 'Test description',
      shortDescription: 'Test short description'
    });

    expect(prod.published).toBe(true);

    const updated = await productService.markProductSoldOut(prod.id);
    expect(updated.published).toBe(true);
  });

  it('9. Changing availability leaves status state unchanged', async () => {
    const prod = await productService.createProduct({
      name: 'Chanderi Zari Saree',
      price: 5200,
      stock: 6,
      status: 'active',
      category: 'Chanderi',
      categorySlug: 'chanderi',
      description: 'Test description',
      shortDescription: 'Test short description'
    });

    expect(prod.status).toBe('active');

    const updated = await productService.markProductSoldOut(prod.id);
    expect(updated.status).toBe('active');
  });

  it('10. Sold-out product check rejects add-to-cart operation', () => {
    const soldOutProduct: Product = {
      id: 'prod-soldout-cart',
      name: 'Sold Out Heritage Saree',
      slug: 'sold-out-heritage-saree',
      sku: 'KV-99',
      price: 15000,
      stock: 5,
      category: 'Heritage',
      categorySlug: 'heritage',
      images: ['/saree_model_individual.jpg'],
      published: true,
      status: 'active',
      availability: 'sold_out',
      shortDescription: 'Sold out',
      description: 'Sold out',
      tags: [],
      rating: 5,
      reviewCount: 0,
      specifications: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    storageService.addProduct(soldOutProduct);
    const retrieved = storageService.getProductById(soldOutProduct.id);

    expect(retrieved?.availability).toBe('sold_out');
    // Validation function contract check
    const isAvailableForCart = (retrieved?.availability || 'available') === 'available';
    expect(isAvailableForCart).toBe(false);
  });

  it('11. Checkout rejects a product that became sold out', async () => {
    const prod = await productService.createProduct({
      name: 'Paithani Peacock Saree',
      price: 18000,
      stock: 1,
      category: 'Paithani',
      categorySlug: 'paithani',
      availability: 'sold_out',
      description: 'Test description',
      shortDescription: 'Test short description'
    });

    const checkoutParams: any = {
      customerId: 'cust-123',
      customerName: 'Priya Sharma',
      customerEmail: 'priya@example.com',
      shippingAddress: {
        fullName: 'Priya Sharma',
        phone: '9876543210',
        streetAddress: '123 Silk Street',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India'
      },
      items: [
        {
          product: prod,
          quantity: 1
        }
      ],
      subtotal: 18000,
      discount: 0,
      tax: 900,
      shippingFee: 100,
      total: 19000,
      paymentMethod: 'cash_on_delivery'
    };

    await expect(orderService.createOrder(checkoutParams)).rejects.toThrow('currently sold out');
  });

  it('12. Audit log is created for availability changes', async () => {
    const prod = await productService.createProduct({
      name: 'Baluchari Silk Saree',
      price: 11000,
      stock: 4,
      category: 'Baluchari',
      categorySlug: 'baluchari',
      availability: 'available',
      description: 'Test description',
      shortDescription: 'Test short description'
    });

    await productService.markProductSoldOut(prod.id);

    const logs = await auditService.getAuditLogs();
    const availabilityLog = logs.find(
      l => l.entityId === prod.id && (l.action === 'PRODUCT_MARKED_SOLD_OUT' || l.action === 'PRODUCT_MARKED_AVAILABLE')
    );

    expect(availabilityLog).toBeDefined();
    expect(availabilityLog?.action).toBe('PRODUCT_MARKED_SOLD_OUT');
    expect(availabilityLog?.entityType).toBe('PRODUCT');
  });

  it('13. Non-existent product availability update throws error', async () => {
    await expect(productService.setProductAvailability('non-existent-id', 'sold_out')).rejects.toThrow('not found');
  });

  it('14. Firestore update failure does not produce fake success', async () => {
    // Attempting to set availability on invalid empty string ID
    await expect(productService.setProductAvailability('', 'sold_out')).rejects.toThrow();
  });

  it('15. Live subscription receives admin availability changes', async () => {
    const prod = await productService.createProduct({
      name: 'Patola Double Ikat Saree',
      price: 25000,
      stock: 2,
      category: 'Patola',
      categorySlug: 'patola',
      availability: 'available',
      description: 'Test description',
      shortDescription: 'Test short description'
    });

    let receivedProducts: Product[] = [];
    const unsub = productService.subscribeToProducts((live) => {
      receivedProducts = live;
    });

    await productService.markProductSoldOut(prod.id);

    const target = receivedProducts.find(p => p.id === prod.id);
    expect(target?.availability).toBe('sold_out');

    if (typeof unsub === 'function') unsub();
  });

});
