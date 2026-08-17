// Pre-create all v13 collections so they are visible in the database even before
// any data is entered. Uses createCollection (no-op if it already exists).
import mongoose from 'mongoose';

// Import model modules for their side-effect (registers the models/collections).
import '../models/Company.js';
import '../models/Content.js';
import '../models/Customer.js';
import '../models/Destination.js';
import '../models/FitMasters.js';
import '../models/Holiday.js';
import '../models/Leave.js';
import '../models/Order.js';
import '../models/Passenger.js';
import '../models/Payment.js';
import '../models/SalarySlip.js';
import '../models/Service.js';
import '../models/Settings.js';
import '../models/TourPackage.js';
import '../models/User.js';
import '../models/WebsiteBooking.js';

export const seedV13Collections = async () => {
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  let created = 0;
  // Every registered model -> ensure its collection exists.
  for (const name of mongoose.modelNames()) {
    const coll = mongoose.model(name).collection.collectionName;
    if (!existing.has(coll)) {
      try { await db.createCollection(coll); created++; existing.add(coll); } catch (e) { /* race/edge: ignore */ }
    }
  }
  return created;
};
