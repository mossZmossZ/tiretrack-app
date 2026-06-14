import { api } from '../services/api.js';

export const DEFAULT_CONFIG = {
  shop_name: '',
  tax_id: '',
  address: '',
  vat_registered: true,
};

export const DEFAULT_CASH_BILL_CONFIG = {
  shop_name: '',
  address: '',
};

export async function getReceiptConfig() {
  try {
    const res = await api.get('/settings/receipt');
    if (res.success) return { ...DEFAULT_CONFIG, ...res.data };
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export async function saveReceiptConfig(config) {
  return api.put('/settings/receipt', config);
}

export async function getCashBillConfig() {
  try {
    const res = await api.get('/settings/cashbill');
    if (res.success) return { ...DEFAULT_CASH_BILL_CONFIG, ...res.data };
  } catch {}
  return { ...DEFAULT_CASH_BILL_CONFIG };
}

export async function saveCashBillConfig(config) {
  return api.put('/settings/cashbill', config);
}
