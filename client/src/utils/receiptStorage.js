const KEY = 'tiretrack_receipt_config';

export const DEFAULT_CONFIG = {
  shop_name: '',
  tax_id: '',
  address: '',
  vat_registered: true,
};

export function getReceiptConfig() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function saveReceiptConfig(config) {
  localStorage.setItem(KEY, JSON.stringify(config));
}
