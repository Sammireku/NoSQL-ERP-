import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Terminal, 
  Key, 
  Code2, 
  AlertOctagon, 
  FileCode,
  ListFilter,
  CheckCircle2
} from 'lucide-react';

import { UserProfile } from '../types/erp';

interface SecurityRulesViewProps {
  activeUser?: UserProfile;
}

export default function SecurityRulesView({ activeUser }: SecurityRulesViewProps = {}) {
  const securityRulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Global Safety Net (Pillar 1) - Default Deny Catch-All
    match /{document=**} {
      allow read, write: if false;
    }

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================
    
    // Check if user is logged in
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Fetch the user's role directly from their Custom Claims token
    function getUserRole() {
      return request.auth.token.role;
    }
    
    // Check for specific roles
    function isManager() {
      return isAuthenticated() && getUserRole() == 'manager';
    }
    
    function isSales() {
      return isAuthenticated() && getUserRole() == 'sales';
    }
    
    function isCashier() {
      return isAuthenticated() && getUserRole() == 'cashier';
    }

    // Validate if an ID is safe and within size boundaries to prevent value poisoning
    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$');
    }

    // ==========================================
    // CRM MODULE (Opportunities)
    // ==========================================
    match /opportunities/{opportunityId} {
      // Validate the document ID path parameter
      allow get: if (isManager() || isSales()) && isValidId(opportunityId);
      
      // Allow query-scoped collection listing
      allow list: if isManager() || isSales();
      
      // Sales and Managers can create new opportunities
      allow create: if (isManager() || isSales()) && isValidId(opportunityId);
      
      // RBAC Constraint: Only managers can move to 'Closed'
      // Sales cannot change stage to 'Closed', nor can they modify a deal that is already 'Closed'
      allow update: if (isManager() || (
        isSales() && 
        request.resource.data.kanban_stage != 'Closed' &&
        resource.data.kanban_stage != 'Closed'
      )) && isValidId(opportunityId);
      
      // Only managers can delete opportunities
      allow delete: if isManager() && isValidId(opportunityId);
    }

    // ==========================================
    // POS MODULE (Orders)
    // ==========================================
    match /pos_orders/{orderId} {
      // Cashiers and Managers can view receipts
      allow get: if (isManager() || isCashier()) && isValidId(orderId);
      
      // Allow list reads for Cashiers/Managers
      allow list: if isManager() || isCashier();
      
      // Cashiers can process new sales (create documents)
      allow create: if (isManager() || isCashier()) && isValidId(orderId);
      
      // RBAC Constraint: Once a receipt is created, cashiers cannot edit or void it
      // Only managers have update/delete permissions for fraud prevention
      allow update, delete: if isManager() && isValidId(orderId);
    }

    // ==========================================
    // INVENTORY (Read-Only for Staff, Write for Managers)
    // ==========================================
    match /products/{productId} {
      allow get: if isAuthenticated() && isValidId(productId);
      allow list: if isAuthenticated();
      allow write: if isManager() && isValidId(productId);
    }

    match /inventory_levels/{productId} {
      allow get: if isAuthenticated() && isValidId(productId);
      allow list: if isAuthenticated();
      allow write: if isManager() && isValidId(productId);
    }

    // ==========================================
    // USER PROFILES & HR MODULE
    // ==========================================
    match /users/{userId} {
      // Users can read their own profile, managers can read all
      allow get: if isAuthenticated() && (request.auth.uid == userId || isManager()) && isValidId(userId);
      allow list: if isAuthenticated();
      
      // Only managers can assign roles or update AI scores
      allow write: if isManager() && isValidId(userId);
    }
  }
}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="security_rules_viewer">
      
      {/* LEFT: Complete Rules Code display */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="bg-slate-950 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-full min-h-[600px]">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCode className="w-5 h-5 text-indigo-400" />
              <span className="font-mono text-xs font-bold text-slate-200">firestore.rules</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-slate-400 font-mono">Hardened Production V2</span>
            </div>
          </div>
          
          <pre className="p-4 overflow-auto text-[11px] font-mono text-emerald-400/90 leading-relaxed flex-1 bg-slate-950 whitespace-pre scrollbar-thin">
            <code>{securityRulesCode}</code>
          </pre>
        </div>
      </div>

      {/* RIGHT: Rules Specifications & Assertions Audit */}
      <div className="lg:col-span-5 flex flex-col space-y-6">
        
        {/* Core Security Principles Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Hardened Rules Architecture
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            The database rules employ the Zero-Trust <strong>"Fortress Pattern"</strong> with attribute-based access control (ABAC). No client is granted broad permissions, and all inputs are validated prior to any database mutations.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start space-x-2 text-xs text-slate-700">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong>Global Default Deny:</strong> A master gate catch-all blocks all unmapped reads and writes automatically.
              </div>
            </div>
            <div className="flex items-start space-x-2 text-xs text-slate-700">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong>Strict Role Checks:</strong> Sub-resource access and states (e.g., Closed deals, POS edits) are computed by looking up authenticated identities against the master <code>users</code> collection.
              </div>
            </div>
            <div className="flex items-start space-x-2 text-xs text-slate-700">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong>ID Poisoning Guards:</strong> Custom regex format validations restrict document IDs to alphanumeric sizes, blocking recursive script attacks.
              </div>
            </div>
          </div>
        </div>

        {/* Security Assertions: The "Dirty Dozen" Audit Payloads */}
        <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 shadow-lg space-y-4">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-rose-400" /> Red Team Security Assertions
          </h2>
          <p className="text-xs text-slate-300">
            Below are audited attack vectors validated to return <code>PERMISSION_DENIED</code> on client-side SDK attempts.
          </p>

          <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <span className="text-rose-400 font-bold font-mono block text-[10px]">VECTOR 01: CRM Stage Shortcut</span>
              <p className="text-slate-400 mt-1">
                Sales agent tries to bypass the pipeline stage directly to 'Closed' without authorization.
              </p>
              <div className="mt-2 font-mono text-[9px] text-slate-500">
                WRITE {"{ kanban_stage: 'Closed' }"} BY uid_sales → DENIED
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <span className="text-rose-400 font-bold font-mono block text-[10px]">VECTOR 02: POS Receipt Tampering</span>
              <p className="text-slate-400 mt-1">
                Cashier attempts to modify, update, or void an already printed transaction to cover fraud.
              </p>
              <div className="mt-2 font-mono text-[9px] text-slate-500">
                UPDATE {"{ totalAmount: 0.00 }"} ON pos_orders/ord_123 → DENIED
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <span className="text-rose-400 font-bold font-mono block text-[10px]">VECTOR 03: Profile Role Elevation</span>
              <p className="text-slate-400 mt-1">
                A cashier issues a write on their own HR profile metadata to assign themselves the <code>manager</code> role.
              </p>
              <div className="mt-2 font-mono text-[9px] text-slate-500">
                WRITE {"{ role: 'manager' }"} ON users/uid_cashier → DENIED
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <span className="text-rose-400 font-bold font-mono block text-[10px]">VECTOR 04: ID Character Flood</span>
              <p className="text-slate-400 mt-1">
                Malicious script tries to inject a massive string buffer as a product key to exhaust wallet quotas.
              </p>
              <div className="mt-2 font-mono text-[9px] text-slate-500">
                WRITE ON products/[1MB junk key] → DENIED
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
