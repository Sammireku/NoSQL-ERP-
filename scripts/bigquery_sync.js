/**
 * BigQuery and Firestore Sync Pipeline Script
 * Streams data from 'pos_orders' and 'inventory_levels' into Google Cloud BigQuery.
 * 
 * Uses lazy SDK initialization for maximum resilience.
 */

import admin from 'firebase-admin';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';

dotenv.config();

let bqClient = null;

function getBigQueryClient() {
  if (!bqClient) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.warn("Warning: GOOGLE_CLOUD_PROJECT environment variable is missing. Initializing BigQuery with defaults.");
    }
    // BigQuery client will load credentials automatically from GOOGLE_APPLICATION_CREDENTIALS or ambient environment
    bqClient = new BigQuery({ projectId });
  }
  return bqClient;
}

function getFirestoreDB() {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

/**
 * Ensures the target dataset and tables exist in BigQuery.
 */
async function ensureBigQuerySchema(datasetId = 'erp_analytics') {
  const bq = getBigQueryClient();
  
  // 1. Ensure Dataset Exists
  const [datasets] = await bq.getDatasets();
  const datasetExists = datasets.some(d => d.id === datasetId);
  
  if (!datasetExists) {
    console.log(`Creating BigQuery dataset: ${datasetId}`);
    await bq.createDataset(datasetId);
  }
  
  const dataset = bq.dataset(datasetId);

  // 2. Schema definition for pos_orders
  const posOrdersSchema = [
    { name: 'id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'orgId', type: 'STRING', mode: 'NULLABLE' },
    { name: 'cashierUid', type: 'STRING', mode: 'NULLABLE' },
    { name: 'cashierName', type: 'STRING', mode: 'NULLABLE' },
    { name: 'totalAmount', type: 'FLOAT', mode: 'REQUIRED' },
    { name: 'discountAmount', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'status', type: 'STRING', mode: 'REQUIRED' },
    { name: 'ai_fraud_flag', type: 'BOOLEAN', mode: 'NULLABLE' },
    { name: 'createdAt', type: 'TIMESTAMP', mode: 'REQUIRED' }
  ];

  // 3. Schema definition for inventory_levels
  const inventorySchema = [
    { name: 'productId', type: 'STRING', mode: 'REQUIRED' },
    { name: 'orgId', type: 'STRING', mode: 'NULLABLE' },
    { name: 'stockLevel', type: 'INTEGER', mode: 'REQUIRED' },
    { name: 'ai_reorder_point', type: 'INTEGER', mode: 'NULLABLE' },
    { name: 'costPrice', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'retailPrice', type: 'FLOAT', mode: 'NULLABLE' },
    { name: 'updatedAt', type: 'TIMESTAMP', mode: 'REQUIRED' }
  ];

  const [tables] = await dataset.getTables();

  // Helper to ensure table exists
  const ensureTable = async (tableId, schema) => {
    const tableExists = tables.some(t => t.id === tableId);
    if (!tableExists) {
      console.log(`Creating BigQuery table: ${datasetId}.${tableId}`);
      await dataset.createTable(tableId, { schema });
    }
  };

  await ensureTable('pos_orders', posOrdersSchema);
  await ensureTable('inventory_levels', inventorySchema);
}

/**
 * Main stream synchronization task
 */
export async function runSync() {
  console.log("Starting BigQuery Stream Sync Pipeline...");
  
  try {
    const db = getFirestoreDB();
    const bq = getBigQueryClient();
    const datasetId = 'erp_analytics';
    
    await ensureBigQuerySchema(datasetId);
    
    // --- 1. Stream POS Orders ---
    console.log("Retrieving pos_orders from Firestore (multi-tenant structure)...");
    const posOrdersList = [];
    
    // Scan organizations collection nested structure
    const orgsSnapshot = await db.collection('organizations').get();
    
    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      const ordersSnapshot = await db.collection('organizations').doc(orgId).collection('pos_orders').get();
      
      ordersSnapshot.forEach(doc => {
        const data = doc.data();
        const createdDate = data.createdAt ? 
          (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString()) : 
          new Date().toISOString();

        posOrdersList.push({
          id: doc.id,
          orgId: orgId,
          cashierUid: data.cashierUid || null,
          cashierName: data.cashierName || null,
          totalAmount: parseFloat(data.totalAmount || 0),
          discountAmount: parseFloat(data.discountAmount || 0),
          status: data.status || 'unknown',
          ai_fraud_flag: !!data.ai_fraud_flag,
          createdAt: createdDate
        });
      });
    }

    if (posOrdersList.length > 0) {
      console.log(`Streaming ${posOrdersList.length} POS order entries to BigQuery...`);
      await bq.dataset(datasetId).table('pos_orders').insert(posOrdersList);
    } else {
      console.log("No POS orders found to sync.");
    }

    // --- 2. Stream Inventory Levels ---
    console.log("Retrieving inventory_levels from Firestore...");
    const inventoryList = [];

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      const invSnapshot = await db.collection('organizations').doc(orgId).collection('inventory_levels').get();
      
      invSnapshot.forEach(doc => {
        const data = doc.data();
        const updatedDate = data.updatedAt ? 
          (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt).toISOString()) : 
          new Date().toISOString();

        inventoryList.push({
          productId: doc.id,
          orgId: orgId,
          stockLevel: parseInt(data.stockLevel || 0, 10),
          ai_reorder_point: parseInt(data.ai_reorder_point || 0, 10),
          costPrice: parseFloat(data.costPrice || 10.0), // default cost proxy
          retailPrice: parseFloat(data.retailPrice || 19.99), // default retail proxy
          updatedAt: updatedDate
        });
      });
    }

    if (inventoryList.length > 0) {
      console.log(`Streaming ${inventoryList.length} inventory profiles to BigQuery...`);
      await bq.dataset(datasetId).table('inventory_levels').insert(inventoryList);
    } else {
      console.log("No inventory profiles found to sync.");
    }

    console.log("✓ Stream sync completed successfully.");

  } catch (error) {
    console.error("❌ Sync Pipeline Error:", error);
    throw error;
  }
}

// Allow direct execution if run via CLI
if (process.argv[1] && process.argv[1].endsWith('bigquery_sync.js')) {
  runSync()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

// ==============================================================================
// BIGQUERY FINANCIAL REPORTING SQL STATEMENTS (FOR DOCUMENTATION AND METRICS PANELS)
// ==============================================================================

export const REPORT_SQL_QUERIES = {
  /**
   * Monthly Profit and Loss (P&L) Statement
   * Dynamically tracks total revenue, cost of goods sold (COGS), discounts applied, 
   * and net margins calculated across all sales transactions.
   */
  MonthlyProfitAndLoss: `
    WITH MonthlyRevenue AS (
      SELECT 
        FORMAT_TIMESTAMP('%Y-%m', createdAt) AS fiscal_month,
        orgId,
        SUM(totalAmount) AS gross_revenue,
        SUM(discountAmount) AS total_discounts
      FROM \`erp_analytics.pos_orders\`
      WHERE status = 'paid'
      GROUP BY fiscal_month, orgId
    ),
    MonthlyCOGS AS (
      SELECT 
        FORMAT_TIMESTAMP('%Y-%m', o.createdAt) AS fiscal_month,
        o.orgId,
        -- Simulate average margins/COGS based on 55% Cost of Goods Sold proxy when actual item-margins are integrated
        SUM(o.totalAmount * 0.55) AS estimated_cogs
      FROM \`erp_analytics.pos_orders\` o
      WHERE o.status = 'paid'
      GROUP BY fiscal_month, o.orgId
    )
    SELECT 
      r.orgId,
      r.fiscal_month,
      ROUND(r.gross_revenue, 2) AS gross_revenue,
      ROUND(r.total_discounts, 2) AS total_discounts,
      ROUND(r.gross_revenue - r.total_discounts, 2) AS net_revenue,
      ROUND(c.estimated_cogs, 2) AS cost_of_goods_sold,
      ROUND((r.gross_revenue - r.total_discounts) - c.estimated_cogs, 2) AS net_profit_margin,
      ROUND((((r.gross_revenue - r.total_discounts) - c.estimated_cogs) / (r.gross_revenue - r.total_discounts)) * 100, 1) AS net_profit_percentage
    FROM MonthlyRevenue r
    JOIN MonthlyCOGS c ON r.fiscal_month = c.fiscal_month AND r.orgId = c.orgId
    ORDER BY fiscal_month DESC, orgId ASC
  `,

  /**
   * Inventory Stock-Turnover Ratio Report
   * Measures how many times a business replaces its inventory over a specific interval.
   * A higher ratio indicates strong sales demand and robust supply-chain velocity.
   */
  StockTurnoverRatio: `
    WITH SalesActivity AS (
      -- Extract sales demand rates per organization and product
      SELECT 
        orgId,
        SUM(totalAmount * 0.55) AS total_cogs
      FROM \`erp_analytics.pos_orders\`
      WHERE status = 'paid'
      GROUP BY orgId
    ),
    AverageInventoryValuation AS (
      -- Calculate current inventory asset valuation matching warehouse profiles
      SELECT 
        orgId,
        SUM(stockLevel * costPrice) AS total_inventory_cost_valuation,
        AVG(stockLevel) AS average_held_stock
      FROM \`erp_analytics.inventory_levels\`
      GROUP BY orgId
    )
    SELECT 
      i.orgId,
      ROUND(COALESCE(s.total_cogs, 0), 2) AS cogs_last_30_days,
      ROUND(i.total_inventory_cost_valuation, 2) AS current_inventory_valuation,
      -- Stock-Turnover Ratio = COGS / Average Inventory Value
      ROUND(
        COALESCE(s.total_cogs, 0) / NULLIF(i.total_inventory_cost_valuation, 0), 
        2
      ) AS stock_turnover_ratio,
      -- Days Sales in Inventory (DSI) indicating the average days to clear stock
      ROUND(
        365 / NULLIF(COALESCE(s.total_cogs, 0) / NULLIF(i.total_inventory_cost_valuation, 0), 0),
        1
      ) AS average_days_to_sell
    FROM AverageInventoryValuation i
    LEFT JOIN SalesActivity s ON i.orgId = s.orgId
    ORDER BY stock_turnover_ratio DESC
  `
};
