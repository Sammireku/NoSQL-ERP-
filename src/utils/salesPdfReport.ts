import { POSOrder, Product } from '../types/erp';
import { formatPrice } from './currency';

export interface PDFReportData {
  generatedBy: string;
  generatedDate: string;
  totalRevenue: number;
  totalPOSSales: number;
  totalOnlineSales: number;
  totalOrders: number;
  salesPerItem: Array<{ name: string; sku: string; category: string; quantitySold: number; avgPrice: number; revenue: number; sharePct: string }>;
  salesPerCategory: Array<{ category: string; unitsSold: number; ordersCount: number; revenue: number; sharePct: string }>;
  salesPerDate: Array<{ date: string; ordersCount: number; itemsCount: number; aov: number; revenue: number }>;
  paymentBreakdown: {
    cash: { total: number; count: number };
    momo: { total: number; count: number };
    card: { total: number; count: number };
    billed: { total: number; count: number };
  };
  discountsOverview: {
    totalDiscountGranted: number;
    discountedOrdersCount: number;
  };
}

export function generateExecutiveSalesPDF(data: PDFReportData) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to open and print/save the Executive PDF Report.");
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>TUMI GHANA - Executive Sales Performance Report</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 11pt; line-height: 1.5; }
          .header-banner { border-bottom: 3px solid #E85A1C; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end; }
          .brand-logo { font-size: 24pt; font-weight: 900; color: #E85A1C; letter-spacing: -1px; }
          .brand-subtitle { font-size: 10pt; font-weight: bold; color: #0f172a; tracking: 2px; text-transform: uppercase; }
          .report-title { text-align: right; }
          .report-title h1 { margin: 0; font-size: 16pt; color: #0f172a; text-transform: uppercase; }
          .report-title p { margin: 2px 0 0; font-size: 9pt; color: #64748b; font-family: monospace; }
          
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
          .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
          .kpi-label { font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase; }
          .kpi-val { font-size: 14pt; font-weight: 900; color: #0f172a; margin-top: 4px; font-family: monospace; }
          
          .section-heading { font-size: 12pt; font-weight: 800; color: #0f172a; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px; margin-top: 25px; margin-bottom: 12px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9.5pt; }
          th { background: #f1f5f9; color: #334155; font-size: 8pt; font-weight: 800; text-transform: uppercase; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: monospace; font-weight: bold; }
          .font-bold { font-weight: bold; }
          
          .footer { margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 15px; text-align: center; font-size: 8.5pt; color: #64748b; }
        </style>
      </head>
      <body>
        
        <div class="header-banner">
          <div>
            <div class="brand-logo">TUMI <span style="color:#0f172a">GHANA</span></div>
            <div class="brand-subtitle">Enterprise ERP System & Retail Operations</div>
          </div>
          <div class="report-title">
            <h1>Executive Sales Report</h1>
            <p>Generated: ${data.generatedDate}</p>
            <p>Prepared By: ${data.generatedBy}</p>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Gross Sales Revenue</div>
            <div class="kpi-val">${formatPrice(data.totalRevenue)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Physical Shop POS</div>
            <div class="kpi-val">${formatPrice(data.totalPOSSales)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Online WooCommerce</div>
            <div class="kpi-val">${formatPrice(data.totalOnlineSales)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Completed Orders</div>
            <div class="kpi-val">${data.totalOrders} Orders</div>
          </div>
        </div>

        <div class="section-heading">1. Sales Per Product Item</div>
        <table>
          <thead>
            <tr>
              <th>Product / Item Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th class="text-center">Units Sold</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Gross Revenue</th>
              <th class="text-right">% Share</th>
            </tr>
          </thead>
          <tbody>
            ${data.salesPerItem.map(item => `
              <tr>
                <td class="font-bold">${item.name}</td>
                <td style="font-family: monospace; font-size: 8pt; color: #64748b;">${item.sku}</td>
                <td>${item.category}</td>
                <td class="text-center font-mono">${item.quantitySold}</td>
                <td class="text-right font-mono">${formatPrice(item.avgPrice)}</td>
                <td class="text-right font-mono font-bold">${formatPrice(item.revenue)}</td>
                <td class="text-right font-mono" style="color: #059669;">${item.sharePct}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-heading">2. Sales Per Product Category</div>
        <table>
          <thead>
            <tr>
              <th>Product Category</th>
              <th class="text-center">Orders Count</th>
              <th class="text-center">Units Sold</th>
              <th class="text-right">Category Revenue</th>
              <th class="text-right">% Share</th>
            </tr>
          </thead>
          <tbody>
            ${data.salesPerCategory.map(cat => `
              <tr>
                <td class="font-bold">${cat.category}</td>
                <td class="text-center font-mono">${cat.ordersCount}</td>
                <td class="text-center font-mono">${cat.unitsSold}</td>
                <td class="text-right font-mono font-bold">${formatPrice(cat.revenue)}</td>
                <td class="text-right font-mono" style="color: #059669;">${cat.sharePct}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-heading">3. Sales On Specific Dates</div>
        <table>
          <thead>
            <tr>
              <th>Transaction Date</th>
              <th class="text-center">Orders Count</th>
              <th class="text-center">Items Sold</th>
              <th class="text-right">Average Order Value (AOV)</th>
              <th class="text-right">Daily Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${data.salesPerDate.map(d => `
              <tr>
                <td class="font-mono font-bold">${d.date}</td>
                <td class="text-center font-mono">${d.ordersCount}</td>
                <td class="text-center font-mono">${d.itemsCount}</td>
                <td class="text-right font-mono">${formatPrice(d.aov)}</td>
                <td class="text-right font-mono font-bold">${formatPrice(d.revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-heading">4. Transaction Insights & Payment Method Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Payment Method / Channel</th>
              <th class="text-center">Transaction Count</th>
              <th class="text-right">Total Revenue Processed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold">💵 Cash Tender</td>
              <td class="text-center font-mono">${data.paymentBreakdown.cash.count}</td>
              <td class="text-right font-mono font-bold">${formatPrice(data.paymentBreakdown.cash.total)}</td>
            </tr>
            <tr>
              <td class="font-bold">📱 Mobile Money (MTN / Telecel / AT MoMo)</td>
              <td class="text-center font-mono">${data.paymentBreakdown.momo.count}</td>
              <td class="text-right font-mono font-bold">${formatPrice(data.paymentBreakdown.momo.total)}</td>
            </tr>
            <tr>
              <td class="font-bold">💳 Credit Card / Stripe / WooCommerce</td>
              <td class="text-center font-mono">${data.paymentBreakdown.card.count}</td>
              <td class="text-right font-mono font-bold">${formatPrice(data.paymentBreakdown.card.total)}</td>
            </tr>
            <tr>
              <td class="font-bold">📌 Billed To Account (Room Folio / Payroll / Student)</td>
              <td class="text-center font-mono">${data.paymentBreakdown.billed.count}</td>
              <td class="text-right font-mono font-bold">${formatPrice(data.paymentBreakdown.billed.total)}</td>
            </tr>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td>Discount Concessions Granted</td>
              <td class="text-center font-mono">${data.discountsOverview.discountedOrdersCount} orders</td>
              <td class="text-right font-mono" style="color: #dc2626;">-${formatPrice(data.discountsOverview.totalDiscountGranted)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          *** OFFICIAL CERTIFIED DOCUMENT - TUMI ENTERPRISE GHANA ***<br/>
          Confidential executive report generated automatically by Tumi ERP System.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
