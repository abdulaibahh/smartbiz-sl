// Currency utility for Sierra Leone Leones (NLE)
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SLL', // Sierra Leone Leones
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
};

// Format with decimals for precise amounts
export const formatCurrencyPrecise = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'SLL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

// Short format (e.g., 50K, 1.2M)
export const formatCurrencyShort = (value) => {
  const num = value || 0;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

// Currency symbol
export const CURRENCY_SYMBOL = 'Le ';
export const CURRENCY_NAME = 'Sierra Leone Leones';
