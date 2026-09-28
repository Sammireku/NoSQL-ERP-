export const getCurrencySymbol = (code: string): string => {
  if (code === 'GHS') return 'GH₵';
  if (code === 'EUR') return '€';
  if (code === 'ZAR') return 'R';
  return '$';
};

export const getCurrencyRate = (code: string): number => {
  if (code === 'GHS') return 15.0; // 1 USD = 15 GHS
  if (code === 'EUR') return 0.92; // 1 USD = 0.92 EUR
  if (code === 'ZAR') return 18.0; // 1 USD = 18 ZAR
  return 1.0; // USD is base
};

export const formatPrice = (amount: number, activeCurrencyCode?: string, sourceCurrency: 'USD' | 'GHS' = 'USD'): string => {
  const code = activeCurrencyCode || localStorage.getItem('erp_active_currency') || 'GHS';
  const symbol = getCurrencySymbol(code);
  
  let usdAmount = amount;
  if (sourceCurrency === 'GHS') {
    usdAmount = amount / getCurrencyRate('GHS');
  }

  const rate = getCurrencyRate(code);
  const converted = usdAmount * rate;
  return `${symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
