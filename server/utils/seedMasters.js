// AUTO-GENERATED: pre-create all 80 master collections so they appear in the DB.
import mongoose from 'mongoose';
import { MASTERS } from '../masterEngine/masterDefs.js';
import { modelForMaster } from '../masterEngine/MasterRecord.js';

// Insert one sample row per master (only if the collection is empty), so every
// wireframe master shows up as a collection after seeding.
export const seedAllMasters = async () => {
  let created = 0;
  for (const def of Object.values(MASTERS)) {
    const Model = modelForMaster(def.key);
    const count = await Model.estimatedDocumentCount();
    if (count > 0) continue;
    const row = {};
    for (const f of def.fields) {
      if (f.type === 'ref') continue;                 // leave FK empty
      if (f.type === 'boolean') row[f.key] = false;
      else if (f.type === 'number') row[f.key] = 0;
      else if (f.type === 'date') row[f.key] = new Date();
      else row[f.key] = 'Sample ' + def.label;
    }
    await Model.create(row);
    created++;
  }
  return created;
};