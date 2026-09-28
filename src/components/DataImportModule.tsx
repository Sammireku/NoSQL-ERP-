import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Upload, Download, CheckCircle2, AlertCircle, Package, Users, Building2, Sparkles, Copy, Check } from 'lucide-react';
import { dataStore } from '../config/firebase';
import { UserProfile, Product, CustomerProfile, Vendor } from '../types/erp';

interface DataImportModuleProps {
  activeUser: UserProfile;
}

export default function DataImportModule({ activeUser }: DataImportModuleProps) {
  const [importTarget, setImportTarget] = useState<'stock' | 'clients' | 'vendors'>('stock');
  const [fileType, setFileType] = useState<'csv' | 'pdf'>('csv');
  const [pastedContent, setPastedContent] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Process and import raw CSV or PDF extracted text
  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedContent.trim()) return;

    const lines = pastedContent.trim().split(/\r?\n/);
    let count = 0;

    try {
      if (importTarget === 'stock') {
        lines.forEach((line, idx) => {
          if (idx === 0 && (line.toLowerCase().includes('sku') || line.toLowerCase().includes('product'))) return;
          const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 3) {
            const sku = parts[0] || `SKU-${Date.now()}-${idx}`;
            const name = parts[1] || 'Imported Product';
            const price = Number(parts[2]) || 10;
            const category = parts[3] || 'General Stock';
            const stockLevel = Number(parts[4]) || 50;

            const newProd: Product = {
              id: 'prod_imp_' + Date.now() + '_' + idx,
              sku,
              name,
              price,
              category,
              description: `Imported via ${fileType.toUpperCase()} file upload`
            };
            dataStore.createProduct(newProd, activeUser);
            count++;
          }
        });
        setToastMsg(`Successfully imported ${count} Stock & Product Catalog records!`);
      } else if (importTarget === 'clients') {
        lines.forEach((line, idx) => {
          if (idx === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('email'))) return;
          const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 2) {
            const name = parts[0] || 'Imported Client';
            const email = parts[1] || `client_${idx}@imported.com`;
            const phone = parts[2] || '+1 (555) 019-9281';
            const ltv = Number(parts[3]) || 500;

            const newCust: CustomerProfile = {
              id: 'cust_imp_' + Date.now() + '_' + idx,
              name,
              email,
              phone,
              lifetime_value: ltv,
              ai_churn_risk: 0.15,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            dataStore.createCustomer(newCust, activeUser);
            count++;
          }
        });
        setToastMsg(`Successfully imported ${count} Client & CRM profiles!`);
      } else if (importTarget === 'vendors') {
        lines.forEach((line, idx) => {
          if (idx === 0 && line.toLowerCase().includes('company')) return;
          const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
          if (parts.length >= 2) {
            const companyName = parts[0] || 'Imported Supplier';
            const contactPerson = parts[1] || 'Sales Manager';
            const email = parts[2] || 'contact@supplier.com';
            const category = parts[3] || 'General Wholesale';

            const newVendor: Vendor = {
              id: 'vend_imp_' + Date.now() + '_' + idx,
              name: companyName,
              contactName: contactPerson,
              email,
              phone: '+1 (555) 888-0000',
              category,
              leadTimeDays: 3
            };
            const currentVendors = dataStore.getVendors();
            dataStore.saveVendors([newVendor, ...currentVendors]);
            count++;
          }
        });
        setToastMsg(`Successfully imported ${count} Vendor & Supplier profiles!`);
      }

      setPastedContent('');
      setTimeout(() => setToastMsg(null), 5000);
    } catch (err: any) {
      setToastMsg(`Import Error: ${err.message || 'Check CSV column format'}`);
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">CSV & PDF Batch Data Import Engine</h3>
            <p className="text-xs text-slate-500">Bulk upload stock inventory, client rosters, and vendor price lists</p>
          </div>
        </div>

        {/* Target Dataset Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setImportTarget('stock')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              importTarget === 'stock' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-indigo-600" />
            <span>Stock Items</span>
          </button>
          <button
            onClick={() => setImportTarget('clients')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              importTarget === 'clients' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-rose-600" />
            <span>Clients</span>
          </button>
          <button
            onClick={() => setImportTarget('vendors')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${
              importTarget === 'vendors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Vendors</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-emerald-950 text-emerald-200 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-emerald-400">✕</button>
        </div>
      )}

      <form onSubmit={handleImportSubmit} className="space-y-4">
        <div className="flex items-center space-x-4">
          <span className="text-xs font-bold text-slate-700">Source Format:</span>
          <label className="flex items-center space-x-1.5 text-xs font-semibold cursor-pointer">
            <input
              type="radio"
              name="filetype"
              checked={fileType === 'csv'}
              onChange={() => setFileType('csv')}
              className="text-emerald-600"
            />
            <span className="flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> CSV File / Spreadsheets</span>
          </label>
          <label className="flex items-center space-x-1.5 text-xs font-semibold cursor-pointer">
            <input
              type="radio"
              name="filetype"
              checked={fileType === 'pdf'}
              onChange={() => setFileType('pdf')}
              className="text-indigo-600"
            />
            <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-indigo-600" /> PDF Text / Document Extract</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-slate-700 mb-1">
            {importTarget === 'stock' && 'Paste CSV / PDF text (Format: SKU, Product Name, Price, Category, Stock Quantity)'}
            {importTarget === 'clients' && 'Paste CSV / PDF text (Format: Name, Email, Phone, Lifetime Value)'}
            {importTarget === 'vendors' && 'Paste CSV / PDF text (Format: Company Name, Contact Person, Email, Category)'}
          </label>
          <textarea
            rows={5}
            value={pastedContent}
            onChange={(e) => setPastedContent(e.target.value)}
            placeholder={
              importTarget === 'stock'
                ? 'PROD-101, Wireless Barcode Scanner, 85, Electronics, 120\nPROD-102, Thermal Receipt Paper Roll, 12, Supplies, 500'
                : importTarget === 'clients'
                ? 'Acme Logistics, sarah@acme.com, +1-555-0199, 12500\nGlobal Retail Ltd, david@globalretail.com, +1-555-0288, 8400'
                : 'Prime Paper Wholesalers, John Smith, orders@primepaper.com, Office Supplies'
            }
            className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-[11px] text-slate-500">
            PDF text extracts are parsed automatically line-by-line using standard delimiter matching.
          </span>
          <button
            type="submit"
            disabled={!pastedContent.trim()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-md transition-all disabled:opacity-40"
          >
            <Upload className="w-4 h-4" />
            <span>Process & Import Records</span>
          </button>
        </div>
      </form>
    </div>
  );
}
