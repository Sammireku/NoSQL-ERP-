import { POSOrder } from '../types/erp';

export type SalesPeriodFilter = 'day' | 'week' | 'month' | 'quater' | 'year' | 'year_till_date';

export interface ReturnRecordItem {
  id: string;
  orderId: string;
  customerName?: string;
  returnedAt: string;
  totalRefundAmount: number;
  reason: string;
  refundMethod: 'cash' | 'original_payment_method';
  processedBy: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface PeriodDateRange {
  start: Date;
  end: Date;
  label: string;
  description: string;
}

export const PERIOD_DEFINITIONS: Record<SalesPeriodFilter, { label: string; sublabel: string; description: string }> = {
  day: {
    label: 'Day',
    sublabel: 'Today',
    description: 'Current 24-hour day from midnight to now'
  },
  week: {
    label: 'Week',
    sublabel: 'This Week',
    description: 'Past 7 days rolling period'
  },
  month: {
    label: 'Month',
    sublabel: 'This Month',
    description: 'Current calendar month from 1st to now'
  },
  quater: {
    label: 'Quarter',
    sublabel: 'This Quarter',
    description: 'Current fiscal quarter (Q1-Q4) to date'
  },
  year: {
    label: 'Year',
    sublabel: 'Last 12 Mo',
    description: 'Rolling 365 days / 12 months'
  },
  year_till_date: {
    label: 'Year till Date',
    sublabel: 'YTD',
    description: 'From January 1st of current year to present'
  }
};

/**
 * Returns the precise Date bounds for any selected period
 */
export function getPeriodDateRange(period: SalesPeriodFilter): PeriodDateRange {
  const now = new Date();
  let start = new Date();
  const meta = PERIOD_DEFINITIONS[period] || PERIOD_DEFINITIONS.month;

  switch (period) {
    case 'day':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'quater': {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0, 0);
      break;
    }
    case 'year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case 'year_till_date':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
  }

  return {
    start,
    end: now,
    label: meta.label,
    description: meta.description
  };
}

/**
 * Determines whether a date falls within the selected period
 */
export function isDateInPeriod(dateStr: string | undefined, period: SalesPeriodFilter): boolean {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  
  const { start, end } = getPeriodDateRange(period);
  return d >= start && d <= end;
}

/**
 * Detects whether an order is Credit Sales (billed to room / debtor account)
 * or Closed Sales (settled via cash, card, mobile money, online checkout)
 */
export function isCreditOrder(order: POSOrder): boolean {
  const pm = (order.paymentMethod || '').toLowerCase();
  const cust = (order.customerName || '').toLowerCase();
  return (
    pm === 'credit / billed' ||
    pm === 'credit' ||
    pm === 'room_folio' ||
    pm === 'billed_to_account' ||
    Boolean((order as any).billedToAccount) ||
    (cust.includes('(staff)') && Boolean((order as any).isStaffDeduction)) ||
    cust.includes('(room #') ||
    cust.includes('(billed')
  );
}

/**
 * Computes consolidated Gross Sales, Refunds, Net Sales, Closed Sales, and Credit Sales
 */
export function computeSalesKpiForPeriod(
  allOrders: POSOrder[],
  allReturns: ReturnRecordItem[],
  period: SalesPeriodFilter,
  channelFilter: 'all' | 'physical' | 'online' = 'all'
) {
  // 1. Channel filter
  let channelOrders = allOrders;
  if (channelFilter === 'physical') {
    channelOrders = allOrders.filter(o => o.cashierId !== 'woocommerce_bot');
  } else if (channelFilter === 'online') {
    channelOrders = allOrders.filter(o => o.cashierId === 'woocommerce_bot');
  }

  // 2. Period filter
  const periodOrders = channelOrders.filter(o => isDateInPeriod(o.createdAt, period));
  const periodReturns = allReturns.filter(r => isDateInPeriod(r.returnedAt, period));

  // 3. Compute figures
  const grossSales = periodOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const refundsTotal = periodReturns.reduce((sum, r) => sum + (r.totalRefundAmount || 0), 0);
  const netSales = Math.max(0, Number((grossSales - refundsTotal).toFixed(2)));

  // 4. Closed vs Credit breakdown
  const closedOrders = periodOrders.filter(o => !isCreditOrder(o));
  const creditOrders = periodOrders.filter(o => isCreditOrder(o));

  const closedSalesTotal = closedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const creditSalesTotal = creditOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const closedPct = grossSales > 0 ? Number(((closedSalesTotal / grossSales) * 100).toFixed(1)) : 0;
  const creditPct = grossSales > 0 ? Number(((creditSalesTotal / grossSales) * 100).toFixed(1)) : 0;

  return {
    periodOrders,
    periodReturns,
    grossSales: Number(grossSales.toFixed(2)),
    refundsTotal: Number(refundsTotal.toFixed(2)),
    netSales,
    closedOrders,
    creditOrders,
    closedSalesTotal: Number(closedSalesTotal.toFixed(2)),
    creditSalesTotal: Number(creditSalesTotal.toFixed(2)),
    closedPct,
    creditPct,
    totalCount: periodOrders.length,
    closedCount: closedOrders.length,
    creditCount: creditOrders.length,
    refundsCount: periodReturns.length
  };
}

/**
 * Ensures realistic orders and returns across all periods (day, week, month, quarter, year, YTD)
 */
export function ensureSeedOrdersAndReturns(): { orders: POSOrder[]; returns: ReturnRecordItem[] } {
  let existingOrders: POSOrder[] = [];
  let existingReturns: ReturnRecordItem[] = [];

  try {
    const rawOrders = localStorage.getItem('erp_sandbox_orders');
    if (rawOrders) {
      existingOrders = JSON.parse(rawOrders);
    }
  } catch (e) {}

  try {
    const rawReturns = localStorage.getItem('erp_sandbox_returns');
    if (rawReturns) {
      existingReturns = JSON.parse(rawReturns);
    }
  } catch (e) {}

  const nowMs = Date.now();
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;

  // If fewer than 5 orders exist, seed rich dataset spanning all periods
  if (!Array.isArray(existingOrders) || existingOrders.length < 5) {
    const seedOrders: POSOrder[] = [
      // TODAY (Day)
      {
        id: 'pos-10901',
        items: [{ productId: 'prod_1', name: 'Cotton Kente Tote Bag', quantity: 2, price: 45.00 }],
        totalAmount: 90.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 2 * HOUR).toISOString(),
        customerName: 'Kofi Mensah',
        customerPhone: '+233 24 555 1010',
        paymentMethod: 'Cash',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10902',
        items: [{ productId: 'prod_2', name: 'Handwoven Indigo Cushion', quantity: 1, price: 85.00 }],
        totalAmount: 85.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 4 * HOUR).toISOString(),
        customerName: 'Ama Serwaa',
        customerPhone: '+233 20 888 2323',
        paymentMethod: 'Mobile Money',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10903',
        items: [
          { productId: 'prod_3', name: 'Artisan Brass Table Lamp', quantity: 1, price: 110.00 }
        ],
        totalAmount: 110.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 5 * HOUR).toISOString(),
        customerName: 'David Copperfield (Room #104)',
        customerPhone: '+233 50 111 9999',
        paymentMethod: 'room_folio',
        ai_fraud_flag: false
      },

      // THIS WEEK (2 - 6 Days ago)
      {
        id: 'pos-10884',
        items: [{ productId: 'prod_4', name: 'Tailored Linen Safari Shirt', quantity: 2, price: 110.00 }],
        totalAmount: 220.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 2 * DAY).toISOString(),
        customerName: 'Grace Taylor',
        customerPhone: '+233 24 777 4411',
        paymentMethod: 'Card',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10885',
        items: [{ productId: 'prod_5', name: 'Embroidered Kaftan Set', quantity: 1, price: 350.00 }],
        totalAmount: 350.00,
        cashierId: 'cashier_02',
        cashierName: 'Kojo Sales',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 3 * DAY).toISOString(),
        customerName: 'Kwame Asante',
        customerPhone: '+233 27 333 5555',
        paymentMethod: 'Mobile Money',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10886',
        items: [{ productId: 'prod_6', name: 'Handcrafted Beaded Necklace', quantity: 2, price: 230.00 }],
        totalAmount: 460.00,
        cashierId: 'cashier_02',
        cashierName: 'Kojo Sales',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 5 * DAY).toISOString(),
        customerName: 'Akua Osei (Billed Account)',
        customerPhone: '+233 24 999 1234',
        paymentMethod: 'Credit / Billed',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10887',
        items: [{ productId: 'prod_7', name: 'Woven Bolga Basket Set', quantity: 1, price: 190.00 }],
        totalAmount: 190.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 6 * DAY).toISOString(),
        customerName: 'Michael Owusu',
        customerPhone: '+233 20 666 4321',
        paymentMethod: 'Cash',
        ai_fraud_flag: false
      },

      // THIS MONTH (10 - 24 Days ago)
      {
        id: 'pos-10850',
        items: [{ productId: 'prod_8', name: 'Ceramic Ashanti Water Pitcher', quantity: 2, price: 290.00 }],
        totalAmount: 580.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 12 * DAY).toISOString(),
        customerName: 'Abena Poku',
        customerPhone: '+233 55 444 8877',
        paymentMethod: 'Card',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10851',
        items: [{ productId: 'prod_9', name: 'Raw Silk Evening Wrap', quantity: 2, price: 370.00 }],
        totalAmount: 740.00,
        cashierId: 'cashier_02',
        cashierName: 'Kojo Sales',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 16 * DAY).toISOString(),
        customerName: 'Emmanuel Darko',
        customerPhone: '+233 24 123 9876',
        paymentMethod: 'Cash',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10852',
        items: [{ productId: 'prod_10', name: 'Executive Suite Room Folio Billing', quantity: 1, price: 620.00 }],
        totalAmount: 620.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 20 * DAY).toISOString(),
        customerName: 'Elena Rostova (Room #202)',
        customerPhone: '+233 50 333 4444',
        paymentMethod: 'room_folio',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10853',
        items: [{ productId: 'prod_11', name: 'Tie-Dye Batik Fabric Bolt', quantity: 2, price: 245.00 }],
        totalAmount: 490.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 24 * DAY).toISOString(),
        customerName: 'Yaa Boateng',
        customerPhone: '+233 26 777 9900',
        paymentMethod: 'Mobile Money',
        ai_fraud_flag: false
      },

      // THIS QUARTER (40 - 75 Days ago)
      {
        id: 'pos-10780',
        items: [{ productId: 'prod_12', name: 'Tailored Ceremonial Agbada', quantity: 1, price: 1250.00 }],
        totalAmount: 1250.00,
        cashierId: 'cashier_02',
        cashierName: 'Kojo Sales',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 45 * DAY).toISOString(),
        customerName: 'Kojo Antwi',
        customerPhone: '+233 24 333 1122',
        paymentMethod: 'Card',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10781',
        items: [{ productId: 'prod_13', name: 'Corporate Gift Hamper Pack', quantity: 3, price: 630.00 }],
        totalAmount: 1890.00,
        cashierId: 'cashier_02',
        cashierName: 'Kojo Sales',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 55 * DAY).toISOString(),
        customerName: 'AngloGold Ashanti Corp (Credit Billed)',
        customerPhone: '+233 30 222 1111',
        paymentMethod: 'Credit / Billed',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10782',
        items: [{ productId: 'prod_14', name: 'Leather Travel Duffel Bag', quantity: 2, price: 490.00 }],
        totalAmount: 980.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 65 * DAY).toISOString(),
        customerName: 'Beatrice Addo',
        customerPhone: '+233 20 444 3322',
        paymentMethod: 'Cash',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10783',
        items: [{ productId: 'prod_15', name: 'Hand-dyed Silk Scarves (Box of 20)', quantity: 1, price: 1420.00 }],
        totalAmount: 1420.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 75 * DAY).toISOString(),
        customerName: 'Samuel Frimpong',
        customerPhone: '+233 55 999 0011',
        paymentMethod: 'Mobile Money',
        ai_fraud_flag: false
      },

      // THIS YEAR / YTD (120 - 220 Days ago)
      {
        id: 'pos-10650',
        items: [{ productId: 'prod_16', name: 'Bespoke Executive Desk Organizers', quantity: 4, price: 700.00 }],
        totalAmount: 2800.00,
        cashierId: 'woocommerce_bot',
        cashierName: 'WordPress WooCommerce API',
        status: 'synced',
        offline: false,
        createdAt: new Date(nowMs - 120 * DAY).toISOString(),
        customerName: 'Ghana Tech Hub',
        customerPhone: '+233 24 555 9922',
        paymentMethod: 'Card',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10651',
        items: [{ productId: 'prod_17', name: 'Vocational Sewing Training Kits (x10)', quantity: 1, price: 3450.00 }],
        totalAmount: 3450.00,
        cashierId: 'cashier_02',
        cashierName: 'Kojo Sales',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 150 * DAY).toISOString(),
        customerName: 'UNESCO Youth Project (Receivable)',
        customerPhone: '+233 30 888 7766',
        paymentMethod: 'Credit / Billed',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10652',
        items: [{ productId: 'prod_18', name: 'Bulk Organic Cotton Bundles', quantity: 3, price: 550.00 }],
        totalAmount: 1650.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 180 * DAY).toISOString(),
        customerName: 'Retail Bulk Buyer',
        customerPhone: '+233 20 111 3344',
        paymentMethod: 'Cash',
        ai_fraud_flag: false
      },
      {
        id: 'pos-10653',
        items: [{ productId: 'prod_19', name: 'Artisanal Ceramic Dinnerware Set', quantity: 3, price: 700.00 }],
        totalAmount: 2100.00,
        cashierId: 'cashier_01',
        cashierName: 'Ama Cashier',
        status: 'completed',
        offline: false,
        createdAt: new Date(nowMs - 210 * DAY).toISOString(),
        customerName: 'Kumasi Arts Collective',
        customerPhone: '+233 26 555 6677',
        paymentMethod: 'Mobile Money',
        ai_fraud_flag: false
      }
    ];

    existingOrders = seedOrders;
    localStorage.setItem('erp_sandbox_orders', JSON.stringify(seedOrders));
  }

  // Seed returns across periods if fewer than 3
  if (!Array.isArray(existingReturns) || existingReturns.length < 3) {
    const seedReturns: ReturnRecordItem[] = [
      {
        id: 'ret-201',
        orderId: 'pos-10901',
        customerName: 'Kofi Mensah',
        returnedAt: new Date(nowMs - 3 * HOUR).toISOString(),
        totalRefundAmount: 25.00,
        reason: 'Customer exchange - sizing adjustment refund differential',
        refundMethod: 'cash',
        processedBy: 'Ama Cashier',
        items: [{ productId: 'prod_1', name: 'Cotton Kente Tote Bag', quantity: 1, price: 25.00 }]
      },
      {
        id: 'ret-202',
        orderId: 'pos-10884',
        customerName: 'Grace Taylor',
        returnedAt: new Date(nowMs - 3 * DAY).toISOString(),
        totalRefundAmount: 49.99,
        reason: 'Customer returned damaged accessory hem',
        refundMethod: 'cash',
        processedBy: 'Sam Mireku',
        items: [{ productId: 'prod_4', name: 'Tailored Linen Safari Shirt', quantity: 1, price: 49.99 }]
      },
      {
        id: 'ret-203',
        orderId: 'pos-10850',
        customerName: 'Abena Poku',
        returnedAt: new Date(nowMs - 16 * DAY).toISOString(),
        totalRefundAmount: 80.00,
        reason: 'Exchange for alternate glaze colorway',
        refundMethod: 'original_payment_method',
        processedBy: 'Ama Cashier',
        items: [{ productId: 'prod_8', name: 'Ceramic Ashanti Water Pitcher', quantity: 1, price: 80.00 }]
      },
      {
        id: 'ret-204',
        orderId: 'pos-10780',
        customerName: 'Kojo Antwi',
        returnedAt: new Date(nowMs - 50 * DAY).toISOString(),
        totalRefundAmount: 120.00,
        reason: 'Event postponement merchandise return',
        refundMethod: 'cash',
        processedBy: 'Kojo Sales',
        items: [{ productId: 'prod_12', name: 'Tailored Ceremonial Agbada', quantity: 1, price: 120.00 }]
      },
      {
        id: 'ret-205',
        orderId: 'pos-10650',
        customerName: 'Ghana Tech Hub',
        returnedAt: new Date(nowMs - 140 * DAY).toISOString(),
        totalRefundAmount: 150.00,
        reason: 'Transit sample credit adjustment',
        refundMethod: 'original_payment_method',
        processedBy: 'Sam Mireku',
        items: [{ productId: 'prod_16', name: 'Bespoke Executive Desk Organizers', quantity: 1, price: 150.00 }]
      }
    ];

    existingReturns = seedReturns;
    localStorage.setItem('erp_sandbox_returns', JSON.stringify(seedReturns));
  }

  return {
    orders: existingOrders,
    returns: existingReturns
  };
}
