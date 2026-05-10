import mongoose from 'mongoose';

const recycleBinSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  type: { type: String, enum: ['service', 'inventory'], required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  deletedAt: { type: Date, default: Date.now }
});

recycleBinSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 86400 });

export const RecycleBin = mongoose.model('RecycleBin', recycleBinSchema);
