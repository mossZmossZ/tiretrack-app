import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/mongo.js';

const COLLECTION = 'parts_inventory';

function collection() {
  return getDb().collection(COLLECTION);
}

function toApi(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export async function readAll() {
  const docs = await collection().find({}).sort({ name: 1 }).toArray();
  return docs.map(toApi);
}

export async function findById(id) {
  const doc = await collection().findOne({ _id: id });
  return toApi(doc);
}

export async function create(data) {
  const id = uuidv4();
  const record = {
    _id: id,
    name: data.name || '',
    category: data.category || '',
    cost_price: data.cost_price || '0',
    created_at: new Date().toISOString(),
  };
  await collection().insertOne(record);
  return toApi(record);
}

export async function updateById(id, updates) {
  const current = await collection().findOne({ _id: id });
  if (!current) return null;
  const merged = { ...current, ...updates };
  delete merged._id;
  await collection().updateOne({ _id: id }, { $set: merged });
  return toApi({ _id: id, ...merged });
}

export async function deleteById(id) {
  const res = await collection().deleteOne({ _id: id });
  return res.deletedCount === 1;
}
