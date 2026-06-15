import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/mongo.js';
import { create as createInventory } from './inventory.service.js';

const COLLECTION = 'import_pending';

function collection() {
  return getDb().collection(COLLECTION);
}

function toApi(doc) {
  if (!doc) return null;
  const { _id, key, ...rest } = doc;
  return { id: _id, ...rest };
}

export async function readAll() {
  const docs = await collection().find({}).sort({ created_at: -1 }).toArray();
  return docs.map(toApi);
}

export async function countAll() {
  return collection().countDocuments();
}

// Upsert: increment count if same key already exists, otherwise insert
export async function upsert(brand, model, sizeRaw, width, aspect, rim) {
  const key = `${brand}|${model}|${width}|${aspect}|${rim}`;
  const existing = await collection().findOne({ key });
  if (existing) {
    await collection().updateOne({ key }, { $inc: { count: 1 } });
  } else {
    await collection().insertOne({
      _id: uuidv4(),
      key,
      tire_brand: brand,
      tire_model: model,
      tire_size: sizeRaw,
      tire_width: width,
      tire_aspect: aspect,
      tire_rim: rim,
      count: 1,
      created_at: new Date().toISOString()
    });
  }
}

// Create new inventory entry (cost=0) and remove pending
export async function resolveAdd(id) {
  const doc = await collection().findOne({ _id: id });
  if (!doc) return null;
  const inventory = await createInventory({
    tire_brand: doc.tire_brand,
    tire_model: doc.tire_model,
    tire_width: doc.tire_width,
    tire_aspect: doc.tire_aspect,
    tire_rim: doc.tire_rim,
    cost_price: '0'
  });
  await collection().deleteOne({ _id: id });
  return inventory;
}

// Admin has linked to existing inventory — just dismiss
export async function resolveLink(id) {
  await collection().deleteOne({ _id: id });
}

export async function deleteById(id) {
  await collection().deleteOne({ _id: id });
}
