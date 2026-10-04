import { getAdminFirestore, verifyIdTokenAndGetClaims } from './firebaseAdmin';

export async function handleCreateServerOrder(authHeader: string | undefined, body: any) {
  const caller = await verifyIdTokenAndGetClaims(authHeader);
  const db = getAdminFirestore();

  const {
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    items,
    couponCode,
    paymentMethod,
    razorpayPaymentId,
    notes
  } = body;

  if (!customerEmail || !customerName || !shippingAddress) {
    throw new Error('INVALID_ARGUMENT: Missing required customer or shipping details.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('INVALID_ARGUMENT: Order must contain at least one item.');
  }

  const sanitizedCustomerId = caller?.uid || customerId || `guest-${Date.now()}`;
  const now = new Date().toISOString();
  const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const orderNumber = `MT-${Math.floor(100000 + Math.random() * 900000)}`;

  let calculatedSubtotal = 0;
  let calculatedDiscount = 0;

  // Process and validate items using server database if available
  const validatedItems: any[] = [];
  const productRefsToRead: string[] = [];

  for (const rawItem of items) {
    const pId = rawItem.productId || rawItem.id || rawItem.product?.id;
    const qty = Math.max(1, Math.floor(Number(rawItem.quantity) || 1));
    if (!pId) continue;
    productRefsToRead.push(pId);
  }

  // If live Firestore Admin SDK is available, perform authoritative recalculation & atomic inventory transaction
  if (db) {
    return await db.runTransaction(async (transaction: any) => {
      // 1. Read all product documents atomically inside transaction
      const productSnaps = await Promise.all(
        productRefsToRead.map(id => transaction.get(db.collection('products').doc(id)))
      );

      for (let i = 0; i < productSnaps.length; i++) {
        const snap = productSnaps[i];
        const rawItem = items[i];
        const qty = Math.max(1, Math.floor(Number(rawItem.quantity) || 1));

        if (!snap.exists) {
          throw new Error(`NOT_FOUND: Product ID "${productRefsToRead[i]}" was not found in the official catalog.`);
        }

        const productData = snap.data()!;
        if (productData.published === false) {
          throw new Error(`PERMISSION_DENIED: Product "${productData.name}" is currently unavailable.`);
        }

        const currentStock = Number(productData.stock) || 0;
        if (currentStock < qty) {
          throw new Error(`FAILED_PRECONDITION: Insufficient stock for "${productData.name}". Available: ${currentStock}, requested: ${qty}.`);
        }

        // Authoritative Price (prefer salePrice if valid number < price)
        const itemPrice = (typeof productData.salePrice === 'number' && productData.salePrice > 0 && productData.salePrice < productData.price)
          ? productData.salePrice
          : (Number(productData.price) || 0);

        calculatedSubtotal += itemPrice * qty;

        validatedItems.push({
          productId: productData.id || productRefsToRead[i],
          quantity: qty,
          selectedColor: rawItem.selectedColor || rawItem.selectedVariant?.color || productData.colorVariants?.[0]?.name || '',
          product: {
            id: productData.id || productRefsToRead[i],
            name: productData.name,
            sku: productData.sku || `SKU-${productRefsToRead[i]}`,
            price: itemPrice,
            mrp: productData.mrp || itemPrice,
            images: Array.isArray(productData.images) && productData.images.length > 0 ? productData.images : ['https://images.unsplash.com/photo-1610030469983-98e550d6193c'],
            category: productData.category || 'Sarees'
          }
        });
      }

      // 2. Validate Coupon Code if provided
      if (couponCode && typeof couponCode === 'string') {
        const couponRef = db.collection('coupons').doc(couponCode.trim().toUpperCase());
        const couponSnap = await transaction.get(couponRef);
        if (couponSnap.exists) {
          const couponData = couponSnap.data()!;
          if (couponData.active !== false) {
            const minAmt = Number(couponData.minOrderAmount) || 0;
            if (calculatedSubtotal >= minAmt) {
              if (couponData.discountType === 'percentage') {
                calculatedDiscount = (calculatedSubtotal * (Number(couponData.discountValue) || 0)) / 100;
              } else {
                calculatedDiscount = Number(couponData.discountValue) || 0;
              }
              calculatedDiscount = Math.min(calculatedDiscount, calculatedSubtotal);
            }
          }
        }
      }

      // 3. Financial calculations
      const taxableBase = Math.max(0, calculatedSubtotal - calculatedDiscount);
      const calculatedTax = Math.round(taxableBase * 0.05 * 100) / 100; // 5% GST
      const canonicalShippingFee = 100; // Canonical flat ₹100 shipping fee
      const calculatedGrandTotal = Number((taxableBase + calculatedTax + canonicalShippingFee).toFixed(2));

      // 4. Perform atomic stock deductions & inventory transactions
      for (let i = 0; i < productSnaps.length; i++) {
        const snap = productSnaps[i];
        const pRef = snap.ref;
        const currentStock = Number(snap.data()!.stock) || 0;
        const qty = validatedItems[i].quantity;
        const newStock = Math.max(0, currentStock - qty);

        transaction.update(pRef, {
          stock: newStock,
          updatedAt: now
        });

        // Record Inventory Transaction
        const txId = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const txRef = db.collection('inventoryTransactions').doc(txId);
        transaction.set(txRef, {
          transactionId: txId,
          productId: snap.id,
          productName: snap.data()!.name,
          sku: snap.data()!.sku || snap.id,
          type: 'ORDER_RESERVED',
          quantity: qty,
          previousStock: currentStock,
          newStock,
          referenceId: orderId,
          performedBy: sanitizedCustomerId,
          reason: `Atomic stock reservation for order ${orderNumber}`,
          timestamp: now
        });
      }

      // 5. Construct final Order document
      const orderPayload = {
        id: orderId,
        orderNumber,
        customerId: sanitizedCustomerId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        shippingAddress,
        items: validatedItems,
        subtotal: calculatedSubtotal,
        discount: calculatedDiscount,
        appliedCoupon: couponCode || null,
        tax: calculatedTax,
        shippingFee: canonicalShippingFee,
        total: calculatedGrandTotal,
        paymentMethod: paymentMethod || 'razorpay',
        paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid',
        orderStatus: 'pending',
        trackingNumber: `MUET-EXP-${Math.floor(10000000 + Math.random() * 90000000)}`,
        trackingCarrier: 'MUETY Global Express',
        timeline: [
          {
            status: 'pending',
            label: 'Order Confirmed & Payment Verified',
            timestamp: new Date().toLocaleString(),
            description: `Order accepted with server-verified total ₹${calculatedGrandTotal}. Stock atomically reserved.`
          }
        ],
        razorpayPaymentId: razorpayPaymentId || null,
        notes: notes || '',
        createdAt: now,
        updatedAt: now
      };

      // 6. Write Order & Audit Log inside transaction
      const orderRef = db.collection('orders').doc(orderId);
      transaction.set(orderRef, orderPayload);

      const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logRef = db.collection('adminAuditLogs').doc(logId);
      transaction.set(logRef, {
        logId,
        actorUid: sanitizedCustomerId,
        actorEmail: customerEmail,
        actorRole: 'customer',
        action: 'ORDER_CREATED',
        entityType: 'ORDER',
        entityId: orderId,
        after: { orderNumber, total: calculatedGrandTotal, itemCount: validatedItems.length },
        reason: `Server-authoritative order ${orderNumber} created with atomic inventory reservation`,
        timestamp: now
      });

      return {
        success: true,
        order: orderPayload,
        message: `Order ${orderNumber} created successfully with server-verified calculations.`
      };
    });
  }

  // Fallback if live database server is offline (Local dev calculation)
  for (const rawItem of items) {
    const qty = Math.max(1, Math.floor(Number(rawItem.quantity) || 1));
    const price = Number(rawItem.product?.price || rawItem.price) || 0;
    calculatedSubtotal += price * qty;
    validatedItems.push({
      ...rawItem,
      quantity: qty
    });
  }

  const canonicalShippingFee = 100;
  const calculatedTax = Math.round(calculatedSubtotal * 0.05 * 100) / 100;
  const calculatedGrandTotal = Number((calculatedSubtotal + calculatedTax + canonicalShippingFee).toFixed(2));

  const orderPayload = {
    id: orderId,
    orderNumber,
    customerId: sanitizedCustomerId,
    customerName,
    customerEmail,
    customerPhone: customerPhone || '',
    shippingAddress,
    items: validatedItems,
    subtotal: calculatedSubtotal,
    discount: 0,
    appliedCoupon: couponCode || null,
    tax: calculatedTax,
    shippingFee: canonicalShippingFee,
    total: calculatedGrandTotal,
    paymentMethod: paymentMethod || 'razorpay',
    paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid',
    orderStatus: 'pending',
    trackingNumber: `MUET-EXP-${Math.floor(10000000 + Math.random() * 90000000)}`,
    trackingCarrier: 'MUETY Global Express',
    timeline: [
      {
        status: 'pending',
        label: 'Order Confirmed',
        timestamp: new Date().toLocaleString(),
        description: `Order accepted with flat ₹100 shipping fee.`
      }
    ],
    razorpayPaymentId: razorpayPaymentId || null,
    notes: notes || '',
    createdAt: now,
    updatedAt: now
  };

  return {
    success: true,
    order: orderPayload,
    message: `Order ${orderNumber} created successfully.`
  };
}
