export const SERVICE_TYPES = [
  { value: 'tire_change', label: 'เปลี่ยนยาง', icon: 'tire_repair', color: '#F97316' },
  { value: 'wheel_balance', label: 'ถ่วงล้อ', icon: 'balance', color: '#3B82F6' },
  { value: 'wheel_alignment', label: 'ตั้งศูนย์ล้อ', icon: 'straighten', color: '#8B5CF6' },
  { value: 'tire_switch', label: 'สลับยาง', icon: 'swap_horiz', color: '#10B981' },
  { value: 'tire_pressure', label: 'เช็คลมยาง', icon: 'speed', color: '#F59E0B' },
];

export const SERVICE_TYPE_MAP = Object.fromEntries(SERVICE_TYPES.map(s => [s.value, s]));

export const TIRE_BRANDS = [
  { code: 'MC', label: 'Michelin' },
  { code: 'BS', label: 'Bridgestone' },
  { code: 'GY', label: 'Goodyear' },
  { code: 'ML', label: 'Maxxis' },
  { code: 'DL', label: 'Dunlop' },
  { code: 'YK', label: 'Yokohama' },
  { code: 'TY', label: 'Toyo' },
  { code: 'MS', label: 'Maxxis Sport' },
  { code: 'HK', label: 'Hankook' },
  { code: 'KD', label: 'Kumho' },
  { code: 'OT', label: 'อื่นๆ' },
];

export const TIRE_SIZES = [
  '175/65-14', '185/55-15', '185/60-15', '185/65-15',
  '195/50-15', '195/55-15', '195/60-15', '195/65-15',
  '205/45-17', '205/55-16', '205/60-16',
  '215/45-17', '215/50-17', '215/55-17', '215/60-16', '215/70-15',
  '225/45-17', '225/45-18', '225/55-17', '225/65-17',
  '235/55-18', '235/60-18',
  '245/40-18', '245/45-18',
  '255/70-15',
  '265/50-20', '265/65-17', '265/70-16',
];

export const CAR_COLORS = [
  'ดำ', 'ขาว', 'เทา', 'เงิน', 'แดง', 'น้ำเงิน', 'ทอง', 'น้ำตาล', 'เขียว', 'ส้ม', 'บอรน์', 'อื่นๆ'
];

export const PROVINCES = [
  'กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ',
  'เพชรบูรณ์', 'นครราชสีมา', 'ชลบุรี', 'เชียงใหม่',
  'ขอนแก่น', 'สงขลา', 'อื่นๆ'
];

export const QUANTITY_OPTIONS = [1, 2, 3, 4, 5, 6];
