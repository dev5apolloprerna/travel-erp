import mongoose from 'mongoose';

/**
 * One flexible collection per master, created on demand and cached.
 * strict:false lets each master store exactly the columns from its spec without a
 * hand-written schema. Collection name = 'me_' + master key (kept separate from existing
 * collections so nothing existing is touched).
 */
const cache = new Map();

export const modelForMaster = (masterKey) => {
  if (cache.has(masterKey)) return cache.get(masterKey);
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true, minimize: false });
  const model = mongoose.models[`ME_${masterKey}`] ||
    mongoose.model(`ME_${masterKey}`, schema, `me_${masterKey}`);
  cache.set(masterKey, model);
  return model;
};
