import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/mongo.js';

const COLLECTION = 'tire_brands';

function collection() {
  return getDb().collection(COLLECTION);
}

export async function readAll() {
  const docs = await collection().find({}).sort({ name: 1 }).toArray();
  return docs.map(({ _id, name }) => ({ id: String(_id), name }));
}

export async function create(name) {
  const id = uuidv4();
  const result = await collection().insertOne({ _id: id, name });
  const storedId = String(result.insertedId);
  return { id: storedId, name };
}

export async function updateById(id, name) {
  await collection().updateOne({ _id: id }, { $set: { name } });
  return { id, name };
}

export async function deleteById(id) {
  const result = await collection().deleteOne({ _id: id });
  return result.deletedCount === 1;
}
