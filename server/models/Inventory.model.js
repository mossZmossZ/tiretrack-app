import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  _id: String,
  tire_brand: { type: String, default: '' },
  tire_size: { type: String, default: '' },
  tire_model: { type: String, default: '' },
  cost_price: { type: String, default: '0' },
  created_at: { type: String, default: '' }
});

export const Inventory = mongoose.model('Inventory', inventorySchema);
