import { getDb } from '../db/mongo.js';

export async function getConfig(type) {
  const doc = await getDb().collection('settings').findOne({ _id: type });
  if (!doc) return {};
  const { _id, ...data } = doc;
  return data;
}

export async function saveConfig(type, data) {
  const { _id, ...payload } = data;
  await getDb().collection('settings').updateOne(
    { _id: type },
    { $set: payload },
    { upsert: true }
  );
  return payload;
}
