export const SERVICE_TYPES = [
  { value: 'tire_change', label: 'เปลี่ยนยาง', icon: 'tire_repair', color: '#F97316' },
  { value: 'wheel_balance', label: 'ถ่วงล้อ', icon: 'balance', color: '#3B82F6' },
  { value: 'wheel_alignment', label: 'ตั้งศูนย์ล้อ', icon: 'straighten', color: '#8B5CF6' },
  { value: 'tire_switch', label: 'สลับยาง', icon: 'swap_horiz', color: '#10B981' },
  { value: 'tire_pressure', label: 'เช็คลมยาง', icon: 'speed', color: '#F59E0B' },
  { value: 'part_change', label: 'เปลี่ยนอะไหล่', icon: 'build', color: '#EC4899' },
];

export const SERVICE_TYPE_MAP = Object.fromEntries(SERVICE_TYPES.map(s => [s.value, s]));

export const TIRE_BRANDS = [
  { code: 'MC', label: 'Michelin' },
  { code: 'BS', label: 'Bridgestone' },
  { code: 'GY', label: 'Goodyear' },
  { code: 'ML', label: 'Maxxis' },
  { code: 'MS', label: 'Maxxis' },
  { code: 'DL', label: 'Dunlop' },
  { code: 'YK', label: 'Yokohama' },
  { code: 'TY', label: 'Toyo' },
  { code: 'HK', label: 'Hankook' },
  { code: 'KD', label: 'Kumho' },
  { code: 'DS', label: 'Deestone' },
  { code: 'SP', label: 'Sportrak' },
  { code: 'FS', label: 'Firestone' },
  { code: 'OT', label: 'อื่นๆ' },
];

export const CAR_COLORS = [
  'ดำ', 'ขาว', 'เทา', 'เงิน', 'แดง', 'น้ำเงิน', 'ทอง', 'น้ำตาล', 'เขียว', 'ส้ม', 'บอรน์', 'อื่นๆ'
];

export const PROVINCES = [
  'กระบี่', 'กรุงเทพมหานคร', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา', 'ชลบุรี', 'ชัยนาท', 
  'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก', 'นครปฐม', 'นครพนม', 
  'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน', 'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 
  'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา', 'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 
  'แพร่', 'ภูเก็ต', 'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 
  'ราชบุรี', 'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ', 
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี', 'สุรินทร์', 'หนองคาย', 
  'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี', 'อุบลราชธานี'
];

export const QUANTITY_OPTIONS = [1, 2, 3, 4, 5, 6];
