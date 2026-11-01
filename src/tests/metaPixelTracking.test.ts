import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metaPixel, META_PIXEL_ID } from '@/lib/analytics/metaPixel';

describe('Meta Pixel E-Commerce Event Tracking Authority', () => {
  let fbqMock: any;
  const storageMap = new Map<string, string>();

  beforeEach(() => {
    storageMap.clear();
    fbqMock = vi.fn();

    const mockSessionStorage = {
      getItem: vi.fn((key: string) => storageMap.get(key) || null),
      setItem: vi.fn((key: string, val: string) => { storageMap.set(key, val); }),
      removeItem: vi.fn((key: string) => { storageMap.delete(key); }),
      clear: vi.fn(() => { storageMap.clear(); })
    };

    (global as any).window = {
      fbq: fbqMock,
      sessionStorage: mockSessionStorage
    };
  });

  afterEach(() => {
    storageMap.clear();
    delete (global as any).window;
    vi.restoreAllMocks();
  });

  it('verifies Meta Pixel ID matches the configured merchant ID', () => {
    expect(META_PIXEL_ID).toBe('4445856915724282');
  });

  it('tracks ViewContent event with product ID, value, and INR currency', () => {
    const mockProduct = {
      id: 'prod-101',
      name: 'Rani Pink Salem Handloom Silk Saree',
      price: 12999,
      salePrice: 9999,
      category: 'Pure Silk Sarees'
    };

    metaPixel.trackViewContent(mockProduct);

    expect(fbqMock).toHaveBeenCalledTimes(1);
    expect(fbqMock).toHaveBeenCalledWith('track', 'ViewContent', {
      content_name: 'Rani Pink Salem Handloom Silk Saree',
      content_ids: ['prod-101'],
      content_type: 'product',
      value: 9999,
      currency: 'INR',
      content_category: 'Pure Silk Sarees'
    });
  });

  it('tracks AddToCart event with calculated total value for given quantity in INR', () => {
    const mockProduct = {
      id: 'prod-202',
      name: 'Emerald Green Kanjivaram Saree',
      price: 15000,
      salePrice: 13500,
      category: 'Bridal Sarees'
    };

    metaPixel.trackAddToCart(mockProduct, 2);

    expect(fbqMock).toHaveBeenCalledTimes(1);
    expect(fbqMock).toHaveBeenCalledWith('track', 'AddToCart', {
      content_name: 'Emerald Green Kanjivaram Saree',
      content_ids: ['prod-202'],
      content_type: 'product',
      value: 27000, // 13500 * 2
      currency: 'INR',
      content_category: 'Bridal Sarees'
    });
  });

  it('tracks InitiateCheckout event with item count, contents, and total value', () => {
    const mockItems = [
      {
        productId: 'prod-1',
        quantity: 1,
        price: 5000,
        product: { id: 'prod-1', name: 'Item 1', price: 5000 }
      },
      {
        productId: 'prod-2',
        quantity: 2,
        price: 3000,
        product: { id: 'prod-2', name: 'Item 2', price: 3000 }
      }
    ];

    metaPixel.trackInitiateCheckout(mockItems, 11000);

    expect(fbqMock).toHaveBeenCalledTimes(1);
    expect(fbqMock).toHaveBeenCalledWith('track', 'InitiateCheckout', {
      content_ids: ['prod-1', 'prod-2'],
      contents: [
        { id: 'prod-1', quantity: 1, item_price: 5000 },
        { id: 'prod-2', quantity: 2, item_price: 3000 }
      ],
      content_type: 'product',
      value: 11000,
      currency: 'INR',
      num_items: 3
    });
  });

  it('tracks AddPaymentInfo event with payment method and total value in INR', () => {
    const mockItems = [{ productId: 'prod-1' }, { productId: 'prod-2' }];

    metaPixel.trackAddPaymentInfo('cash_on_delivery', 89, mockItems);

    expect(fbqMock).toHaveBeenCalledTimes(1);
    expect(fbqMock).toHaveBeenCalledWith('track', 'AddPaymentInfo', {
      content_ids: ['prod-1', 'prod-2'],
      content_type: 'product',
      value: 89,
      currency: 'INR',
      payment_method: 'cash_on_delivery'
    });
  });

  it('tracks Purchase event upon order confirmation and deduplicates subsequent triggers for the same order', () => {
    const mockOrder = {
      id: 'order_live_99999',
      orderNumber: 'MUETY-99999',
      total: 18450,
      items: [
        {
          productId: 'prod-101',
          quantity: 1,
          price: 18450
        }
      ]
    };

    // First trigger: should successfully track
    const firstAttempt = metaPixel.trackPurchase(mockOrder);
    expect(firstAttempt).toBe(true);
    expect(fbqMock).toHaveBeenCalledTimes(1);
    expect(fbqMock).toHaveBeenCalledWith('track', 'Purchase', {
      content_ids: ['prod-101'],
      contents: [{ id: 'prod-101', quantity: 1, item_price: 18450 }],
      content_type: 'product',
      value: 18450,
      currency: 'INR',
      order_id: 'order_live_99999',
      num_items: 1
    });

    // Second trigger (e.g. patron refreshes /order-confirmation/:id or revisits): must be prevented!
    const secondAttempt = metaPixel.trackPurchase(mockOrder);
    expect(secondAttempt).toBe(false);
    expect(fbqMock).toHaveBeenCalledTimes(1); // Still 1, strictly deduplicated!
  });

  it('does not fire fbq if window.fbq is undefined (graceful degradation)', () => {
    delete (global as any).window.fbq;
    expect(() => {
      metaPixel.trackViewContent({ id: 'prod-1', price: 1000 });
      metaPixel.trackAddToCart({ id: 'prod-1', price: 1000 });
      metaPixel.trackInitiateCheckout([], 0);
      metaPixel.trackAddPaymentInfo('online', 1000);
      metaPixel.trackPurchase({ id: 'o-1', total: 1000, items: [] });
    }).not.toThrow();
  });
});
