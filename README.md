# 🚀 Tumi ERP — Next-Generation Full-Stack Enterprise Platform

**Tumi ERP** is an all-in-one, multi-industry Enterprise Resource Planning (ERP) suite designed for retail POS, hospitality & lodging, warehouse procurement, financial management, and workforce governance. Built with modern full-stack web technologies, Tumi ERP integrates real-time AI automation (powered by Google Gemini Vision), multi-currency financial engines, offline resilience, and robust multi-role access control (RBAC).

---

## 🌟 Key Modules & Capabilities

### 🛒 1. Point of Sale (POS) & Retail Register
- **Multi-Currency Operating Engine:** Default active currency set to **Ghana Cedi (GH₵ / GHS)**, with real-time conversion and switching across USD ($), EUR (€), and GBP (£).
- **Flexible Optional Tax & VAT:** Toggleable **"Add Tax/VAT"** checkbox on POS checkout with support for GRA Standard (21.9%), GRA Flat (4%), Custom %, or Tax Exempt modes.
- **Offline Mode & Sync Queue:** Seamless offline order queueing with automatic background sync when reconnected.
- **Room Folio & Account Billing:** Direct checkout billing to hotel room folios, student vocational accounts, or corporate staff payroll accounts.
- **POS Data CSV Ingestion:** Import historical POS transaction records via structured CSV files.
- **Thermal Receipt & PDF Generation:** Print receipts or export high-fidelity PDF invoices.

### 📦 2. AI Procurement & Warehouse Ingestion
- **Gemini AI Vision Ingestion:** Upload receipt photos or capture vendor invoices via camera for automated OCR parsing of vendor names, dates, amounts, product names, quantities, cost prices, and selling prices.
- **Editable Ingestion Table:** Add custom item rows, delete rows, or update extracted field attributes before committing to inventory.
- **Audit Image Attachments:** Automatically stores original base64 receipt images attached to audit logs for compliance reviews.
- **Purchase Order Dispatch:** Generate purchase orders and dispatch via SMTP Email or WhatsApp API integrations.

### 🏨 3. Hospitality, Lodging & Channel Management
- **Interactive Drag-and-Drop Tape Chart:** Visual calendar grid for managing room assignments, cleaning statuses, and reservations across channels (Airbnb, Booking.com, Expedia, Direct).
- **Flexible POS & Online Payment Routing:**
  - 💳 **Send Payment through POS:** Route walk-in or online room reservations directly to the POS register for immediate cashier settlement.
  - 🌐 **Online Receipt Number Tracking:** Capture and verify online transaction references (e.g. Paystack, Stripe, MoMo).
  - 👤 **Bill to Individual:** Route charges to an unpaid room folio for settlement at checkout.
- **Extended Stay & Prolonged Stay Logic:** Prolong guest stays with automated additional fee calculation and customizable payment collection routing.
- **Walk-In Guest OCR ID Scanner:** Instant identity card / passport text extraction for rapid front desk check-in.
- **Automated Email PDF Invoice & Housekeeping:** Automatic PDF checkout invoices and automated housekeeping cleaning ticket generation.

### 🔐 4. System Admin & Multi-Role Governance (RBAC)
- **Multi-Role User Assignment:** Assign users multiple concurrent operational roles (e.g., *POS Cashier* + *Hotel Receptionist*).
- **Authentication Methods:** Google OAuth 2.0 popup sign-in, work email/password, and 4-digit terminal PIN access.
- **Immutable Audit Trail:** Comprehensive activity logging with filterable audit logs and image attachment lightbox modals.

### 📊 5. Financial Ledger, CRM & Customizer
- **Company Tax Customizer:** Configure local tax parameters, TIN numbers, and e-Invoicing parameters.
- **CRM Customer Profiles:** Buying habits tracking, guest lifetime value (LTV) calculation, and AI confirmation email parsing.
- **Payroll & Petty Cash:** Statutory SSNIT/PAYE tax withholding calculation, petty cash voucher approvals, and automated payslip compilation.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Motion (Framer Motion)
- **Backend Server:** Express.js running on Node.js with Vite middleware integration
- **AI Engine:** Google Gemini Vision SDK (`@google/genai`) for real-time receipt & document OCR parsing
- **Persistence & Cloud:** Firebase Firestore DB, Firebase Auth, and Local Storage Fallbacks
- **PDF & Document Engine:** JSPDF for automated invoice & receipt generation

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# Install dependencies
npm install

# Start the full-stack dev server (Express + Vite)
npm run dev
```

The application will run at `http://localhost:3000`.

### Building for Production
```bash
# Build the TypeScript application
npm run build

# Run production server
npm start
```

---

## 📄 License
This repository is released under the **MIT License**.
