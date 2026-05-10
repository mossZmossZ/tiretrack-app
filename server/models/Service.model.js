import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  _id: String,
  date: { type: String, default: '' },
  license_plate: { type: String, default: '' },
  province: { type: String, default: '' },
  car_model: { type: String, default: '' },
  car_color: { type: String, default: '' },
  service_type: { type: String, default: 'tire_change' },
  quantity: { type: String, default: '' },
  tire_brand: { type: String, default: '' },
  tire_model: { type: String, default: '' },
  tire_size: { type: String, default: '' },
  price_per_unit: { type: String, default: '' },
  total_price: { type: String, default: '0' },
  technician: { type: String, default: '' },
  notes: { type: String, default: '' },
  cost_price: { type: String, default: '0' },
  created_at: { type: String, default: '' },
  created_by: { type: String, default: '' }
});

export const Service = mongoose.model('Service', serviceSchema);
