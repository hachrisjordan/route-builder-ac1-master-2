import { currencyList } from '../data/currency_list';

// Cache for exchange rates
let exchangeRates = null;
let lastFetchTime = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Fetch exchange rates from the API
export const fetchExchangeRates = async () => {
  try {
    // Check cache first
    if (exchangeRates && lastFetchTime && (Date.now() - lastFetchTime < CACHE_DURATION)) {
      console.log('Using cached exchange rates');
      return exchangeRates;
    }

    console.log('Fetching fresh exchange rates');
    const corsProxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = encodeURIComponent('https://storage.googleapis.com/exchange-rates-fabled-emblem-451602/exchange-rates/latest.json');
    
    const response = await fetch(`${corsProxyUrl}${targetUrl}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received exchange rates data:', data);
    
    if (!data?.rates || !Array.isArray(data.rates)) {
      throw new Error('Invalid exchange rates data format');
    }
    
    // Convert array to object for easier lookup
    exchangeRates = data.rates.reduce((acc, curr) => {
      if (curr?.code && typeof curr.rate === 'number') {
        acc[curr.code] = curr.rate;
      }
      return acc;
    }, {});
    
    console.log('Processed exchange rates:', exchangeRates);
    lastFetchTime = Date.now();
    return exchangeRates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
};

// Convert amount from one currency to another
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (!amount || amount === 0) return 0;
  if (fromCurrency === toCurrency) return amount;
  if (!fromCurrency || !toCurrency) return amount;

  try {
    console.log(`Converting ${amount} from ${fromCurrency} to ${toCurrency}`);
    const rates = await fetchExchangeRates();
    if (!rates || !rates[fromCurrency] || !rates[toCurrency]) {
      console.warn('Missing exchange rates for', fromCurrency, 'or', toCurrency);
      return amount;
    }

    // Convert to USD first (base currency)
    const amountInUSD = fromCurrency === 'USD' 
      ? Number(amount)
      : Number(amount) / rates[fromCurrency];

    // Convert from USD to target currency
    const finalAmount = toCurrency === 'USD' 
      ? amountInUSD 
      : amountInUSD * rates[toCurrency];

    console.log(`Conversion result: ${finalAmount}`);
    return Math.round(finalAmount * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error converting currency:', error);
    return amount;
  }
};

/**
 * Format a currency amount with the appropriate currency symbol or code
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code
 * @param {boolean} useCurrencyCode - Whether to use currency code instead of symbol
 * @returns {string} Formatted amount with currency
 */
export const formatCurrencyAmount = (amount, currency, useCurrencyCode = false) => {
  if (!amount || !currency) return '';
  
  try {
    // Get exchange rate for the currency to determine if it's a high-value currency
    const rates = exchangeRates || {};
    const rate = rates[currency];
    const isHighValueCurrency = rate && rate > 1000;
    
    // For high-value currencies, round to nearest thousand and remove decimals
    if (isHighValueCurrency) {
      // Round to nearest thousand
      const roundedAmount = Math.round(amount / 1000) * 1000;
      const formattedAmount = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(roundedAmount);
      
      if (useCurrencyCode) {
        return `${currency} ${formattedAmount}`;
      }
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(roundedAmount);
    }
    
    // For normal currencies, keep decimals
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    if (useCurrencyCode) {
      return `${currency} ${formattedAmount}`;
    }
    
    // Format with currency symbol if not using code
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency amount:', error);
    // Fallback formatting
    const rate = exchangeRates?.[currency];
    const isHighValueCurrency = rate && rate > 1000;
    
    if (isHighValueCurrency) {
      const roundedAmount = Math.round(amount / 1000) * 1000;
      return `${currency} ${roundedAmount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      })}`;
    }
    
    return `${currency} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}; 