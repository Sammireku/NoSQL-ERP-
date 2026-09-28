export interface ExchangeRate {
  currency: string; // 'USD' | 'EUR' | 'GBP'
  name: string; // 'US Dollar' | 'Euro' | 'British Pound'
  buyingRate: number;
  sellingRate: number;
}

export interface RoomBookingRateConfig {
  bookingComRate: number; // e.g. 15.10
  bankOfGhanaBuyingRate: number; // e.g. 15.20
  activeSource: 'booking_com' | 'bank_of_ghana';
}

const DEFAULT_RATES: ExchangeRate[] = [
  { currency: 'USD', name: 'US Dollar', buyingRate: 15.20, sellingRate: 15.65 },
  { currency: 'EUR', name: 'Euro', buyingRate: 16.30, sellingRate: 16.80 },
  { currency: 'GBP', name: 'British Pound', buyingRate: 19.50, sellingRate: 20.10 }
];

const DEFAULT_ROOM_CONFIG: RoomBookingRateConfig = {
  bookingComRate: 15.10,
  bankOfGhanaBuyingRate: 15.20,
  activeSource: 'booking_com'
};

export const currencyStore = {
  getRates: (): ExchangeRate[] => {
    const saved = localStorage.getItem('tumi_exchange_rates');
    return saved ? JSON.parse(saved) : DEFAULT_RATES;
  },
  saveRates: (rates: ExchangeRate[]) => {
    localStorage.setItem('tumi_exchange_rates', JSON.stringify(rates));
    window.dispatchEvent(new Event('tumi_currency_rates_updated'));
  },
  getRoomConfig: (): RoomBookingRateConfig => {
    const saved = localStorage.getItem('tumi_room_currency_config');
    return saved ? JSON.parse(saved) : DEFAULT_ROOM_CONFIG;
  },
  saveRoomConfig: (config: RoomBookingRateConfig) => {
    localStorage.setItem('tumi_room_currency_config', JSON.stringify(config));
    window.dispatchEvent(new Event('tumi_currency_rates_updated'));
  }
};
