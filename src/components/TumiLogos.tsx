import React from 'react';

/**
 * Image 1: Primary App Logo Icon
 * Used in the application header/navbar before "Tumi ERP"
 */
export function TumiAppLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#E85A1C" />
      <ellipse cx="50" cy="49" rx="32" ry="28" fill="#FFFFFF" />
      <path
        d="M 50 28 C 42 37, 42 45, 50 48 C 58 45, 58 37, 50 28 Z
           M 50 70 C 42 61, 42 53, 50 50 C 58 53, 58 61, 50 70 Z
           M 29 49 C 38 41, 46 41, 49 49 C 46 57, 38 57, 29 49 Z
           M 71 49 C 62 41, 54 41, 51 49 C 54 57, 62 57, 71 49 Z"
        fill="#E85A1C"
      />
    </svg>
  );
}

/**
 * Image 2: Full Document Logo (Symbol + TUMI GHANA text)
 * Used on all printed documents: Payslips, Digital Certificates, Receipts, Vouchers, Invoices.
 */
export function TumiDocLogo({ className = "h-16" }: { className?: string }) {
  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="#E85A1C" />
        <ellipse cx="50" cy="49" rx="32" ry="28" fill="#FFFFFF" />
        <path
          d="M 50 28 C 42 37, 42 45, 50 48 C 58 45, 58 37, 50 28 Z
             M 50 70 C 42 61, 42 53, 50 50 C 58 53, 58 61, 50 70 Z
             M 29 49 C 38 41, 46 41, 49 49 C 46 57, 38 57, 29 49 Z
             M 71 49 C 62 41, 54 41, 51 49 C 54 57, 62 57, 71 49 Z"
          fill="#E85A1C"
        />
      </svg>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="font-extrabold text-base text-[#E85A1C] uppercase font-sans tracking-tight">TUMI</span>
        <span className="font-normal text-base text-slate-900 uppercase font-sans tracking-widest">GHANA</span>
      </div>
    </div>
  );
}
