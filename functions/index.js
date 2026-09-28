const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

exports.updateInventoryOnOrder = onDocumentCreated("pos_orders/{orderId}", async (event) => {
  const order = event.data.data();
  if (!order) {
    console.log("No order data found.");
    return null;
  }

  // Process completed or synced orders (skip drafts)
  if (order.status === "draft") {
    console.log(`Skipping draft order: ${event.params.orderId}`);
    return null;
  }

  const items = order.items;
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log("Order contains no items.");
    return null;
  }

  const db = admin.firestore();
  const batch = db.batch();

  console.log(`Processing inventory decrement for order ${event.params.orderId} containing ${items.length} items`);

  for (const item of items) {
    const productId = item.productId;
    const quantityPurchased = item.quantity;

    if (!productId || !quantityPurchased) continue;

    // In our system, the inventory document ID corresponds to the productId
    const invRef = db.collection("inventory_levels").doc(productId);
    const invDoc = await invRef.get();

    if (invDoc.exists) {
      const currentStock = invDoc.data().stockLevel || 0;
      const reorderPoint = invDoc.data().ai_reorder_point || 0;
      const newStock = Math.max(0, currentStock - quantityPurchased);

      const updates = {
        stockLevel: newStock,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      };

      // Add logic to check if quantity falls below reorder point and flag it
      if (newStock < reorderPoint) {
        updates.needsRestock = true;
        updates.ai_restock_flag = true;
        updates.restockFlaggedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      batch.update(invRef, updates);
      console.log(`Queued stock decrement for product ${productId}: ${currentStock} -> ${newStock} (Reorder point: ${reorderPoint})`);
    } else {
      console.log(`Inventory record for product ${productId} does not exist. Skipping.`);
    }
  }

  await batch.commit();
  console.log(`Inventory batch update committed successfully for order ${event.params.orderId}`);
  return null;
});

exports.detectPOSFraud = onDocumentCreated("pos_orders/{orderId}", async (event) => {
  const order = event.data.data();
  if (!order) return null;

  const cashierUid = order.cashierUid;
  if (!cashierUid) return null;

  // Check if current order is voided or heavily discounted
  const isVoided = order.status === "voided" || order.status === "void" || order.isVoided === true;
  const isHeavilyDiscounted = order.discountAmount > 50 || order.discountPercent > 25 || order.isHeavilyDiscounted === true;

  if (!isVoided && !isHeavilyDiscounted) {
    return null;
  }

  const db = admin.firestore();
  
  // Define 15 minutes window
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  // Retrieve cashier's recent transactions within 15 minutes
  const snapshot = await db.collection("pos_orders")
    .where("cashierUid", "==", cashierUid)
    .where("createdAt", ">=", fifteenMinutesAgo)
    .get();

  let suspiciousCount = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const dVoid = data.status === "voided" || data.status === "void" || data.isVoided === true;
    const dDisc = data.discountAmount > 50 || data.discountPercent > 25 || data.isHeavilyDiscounted === true;
    if (dVoid || dDisc) {
      suspiciousCount++;
    }
  }

  console.log(`Cashier: ${cashierUid} has processed ${suspiciousCount} voided or discounted orders in the last 15 minutes.`);

  if (suspiciousCount > 3) {
    console.log(`[ALERT] FRAUD SIGNATURE DETECTED: Flagging order ${event.params.orderId}`);

    // Flag the latest order in Firestore
    await db.collection("pos_orders").doc(event.params.orderId).update({
      ai_fraud_flag: true,
      fraudReason: `Cashier processed ${suspiciousCount} void/discount actions within a 15-minute window.`
    });

    // Send push notification to manager's device via Firebase Cloud Messaging (FCM)
    try {
      const payload = {
        notification: {
          title: "⚠️ POS Fraud Warning",
          body: `Cashier ${order.cashierName || cashierUid} processed ${suspiciousCount} void/discount transactions within 15 minutes.`
        },
        topic: "managers"
      };
      await admin.messaging().send(payload);
      console.log("FCM Manager warning push notification sent.");
    } catch (err) {
      console.warn("FCM Dispatch bypassed or subscriber topic 'managers' has no devices:", err.message);
    }
  }

  return null;
});

exports.setRole = onCall(async (request) => {
  // 1. Authenticate the caller
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  // 2. Authorize the caller (Only current managers can assign roles)
  // Ensure the caller's token already contains the 'manager' claim
  if (request.auth.token.role !== "manager") {
    throw new HttpsError("permission-denied", "Only managers can assign roles.");
  }

  // 3. Extract the target user and desired role from the request data
  const targetUid = request.data.uid;
  const newRole = request.data.role; // e.g., 'manager', 'sales', 'cashier'

  if (!targetUid || !newRole) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  // Set claims
  await admin.auth().setCustomUserClaims(targetUid, { role: newRole });
  
  // Update firestore profile doc
  await admin.firestore().collection('users').doc(targetUid).set({
    role: newRole,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  return { success: true };
});
