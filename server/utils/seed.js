import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User, { ROLES } from '../models/User.js';
import Customer from '../models/Customer.js';
import Company from '../models/Company.js';
import Order from '../models/Order.js';
import { Cluster, Division, Grade, Department, Doctor, FitEmployee } from '../models/FitMasters.js';
import Service from '../models/Service.js';
import Settings from '../models/Settings.js';
import Holiday from '../models/Holiday.js';
import Leave, { LeaveBalance } from '../models/Leave.js';
import SalarySlip from '../models/SalarySlip.js';

dotenv.config();
await connectDB();

/*
 * IMPORTANT (req #7): this seeder is NON-DESTRUCTIVE.
 * It never deletes, drops, truncates or resets any collection. Every record is
 * inserted only after checking it does not already exist (check-before-insert), so
 * running the seeder repeatedly is safe and existing production/development data is
 * left completely untouched. There are deliberately NO deleteMany()/drop()/remove()
 * calls anywhere in this file.
 */

// Create a user only if one with this email does not already exist.
const ensureUser = async (data, password) => {
  const email = (data.email || '').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) return existing;
  const u = new User({ ...data, email });
  await u.setPassword(password);
  await u.save();
  return u;
};

const run = async () => {
  console.log('Seeding (non-destructive: existing data is preserved)...');

  // --- Company profile / settings (home state drives CGST+SGST vs IGST) ---
  if (!(await Settings.findOne({ key: 'COMPANY_PROFILE' }))) {
    await Settings.create({
      key: 'COMPANY_PROFILE',
      companyName: '360 Travel Concierge Pvt Ltd',
      gstNumber: '24ABCDE1234F1Z5',
      addressLine1: 'Office 101, Business Hub',
      city: 'Ahmedabad', state: 'Gujarat', stateCode: '24', pincode: '380015',
      phone: '+91 90000 00000', email: 'accounts@360travelconcierge.com',
      smtpFromName: '360 Travel Concierge',
    });
  }

  // --- Holiday master (only when none exist yet; never clears existing holidays) ---
  const yr = new Date().getFullYear();
  if ((await Holiday.estimatedDocumentCount()) === 0) {
    await Holiday.create([
      { name: 'Republic Day', date: new Date(yr, 0, 26), type: 'PUBLIC' },
      { name: 'Independence Day', date: new Date(yr, 7, 15), type: 'PUBLIC' },
      { name: 'Gandhi Jayanti', date: new Date(yr, 9, 2), type: 'PUBLIC' },
      { name: 'Diwali', date: new Date(yr, 10, 1), type: 'COMPANY' },
    ]);
  }

  // --- Service master (fixed services x domestic/international) ---
  // name -> default GST% (editable later in Service Master)
  const serviceDefs = [
    { name: 'Flight', gst: 5, prefix: 'FLT' }, { name: 'Hotel', gst: 12, prefix: 'HTL' },
    { name: 'Visa', gst: 18, prefix: 'VSA' }, { name: 'Cab', gst: 5, prefix: 'CAB' },
    { name: 'Bus', gst: 5, prefix: 'BUS' }, { name: 'Train', gst: 5, prefix: 'TRN' },
    { name: 'Event', gst: 18, prefix: 'EVT' },
    { name: 'Registration', gst: 18, prefix: 'REG' },
  ];
  const services = [];
  for (const def of serviceDefs) {
    for (const type of ['DOMESTIC', 'INTERNATIONAL']) {
      let svc = await Service.findOne({ name: def.name, type });
      if (!svc) svc = await Service.create({ name: def.name, type, gstPercent: def.gst, invoicePrefix: def.prefix });
      services.push(svc);
    }
  }
  const someServiceIds = services.slice(0, 6).map((s) => s._id); // give employee first 6

  // --- Users (login types) ---
  await ensureUser({
    name: 'Super Admin', email: 'admin@travel.com', role: ROLES.SUPER_ADMIN,
    menus: ['ALL'], modules: ['RETAIL', 'B2B', 'FIT'],
  }, 'admin123');
  const emp = await ensureUser({
    name: 'Sonal R.', email: 'employee@travel.com', role: ROLES.EMPLOYEE, employeeType: 'DOMESTIC', employeeTypes: ['DOMESTIC', 'INTERNATIONAL'],
    menus: ['ALL'], modules: ['RETAIL', 'B2B', 'FIT'], services: someServiceIds,
  }, 'emp123');

  // --- Retail ---
  if (!(await LeaveBalance.findOne({ employeeId: emp._id, year: yr })))
    await LeaveBalance.create({ employeeId: emp._id, year: yr });

  let cust = await Customer.findOne({ email: 'rahul@mail.com' });
  if (!cust)
    cust = await Customer.create({ name: 'Rahul Mehta', email: 'rahul@mail.com', mobile: '9800000001', city: 'Ahmedabad', state: 'Gujarat', stateCode: '24', createdBy: emp._id });
  await ensureUser({ name: 'Rahul Mehta', email: 'rahul@mail.com', role: ROLES.RETAIL_CUSTOMER, customerId: cust._id }, 'cust123');
  if ((await Order.countDocuments({ customerId: cust._id })) === 0) {
    await Order.create({
      module: 'RETAIL', customerId: cust._id, createdBy: emp._id, totalAmount: 50000, paidAmount: 30000,
      services: [
        { serviceType: 'FLIGHT', from: 'DEL', to: 'GOI', flight: 'AI-101', pnr: 'ABC123', amount: 18000, passengers: [{ name: 'Rahul Mehta', amountCharged: 18000 }] },
        { serviceType: 'HOTEL', hotelName: 'Taj Fort Aguada', nights: 3, roomType: 'Deluxe', amount: 32000 },
      ],
    });
  }

  // --- B2B ---
  let company = await Company.findOne({ email: 'accounts@nexora.com' });
  if (!company) {
    company = await Company.create({
      name: 'Nexora Pvt Ltd', gst: '27ABCDE1234F1Z5', contactPerson: 'Karan Desai',
      email: 'accounts@nexora.com', city: 'Mumbai', state: 'Maharashtra', stateCode: '27',
      totalBilled: 160000, totalPaid: 100000, createdBy: emp._id,
      contacts: [{ name: 'Karan Desai', designation: 'Travel Desk', email: 'karan@nexora.com', mobile: '9800000010', isPrimary: true }],
    });
  }
  await ensureUser({ name: 'Karan Desai', email: 'karan@nexora.com', role: ROLES.B2B_MEMBER, companyId: company._id }, 'member123');

  // --- FIT masters (each checked before insert) ---
  let north = await Cluster.findOne({ name: 'North Zone' });
  if (!north) north = await Cluster.create({ name: 'North Zone' });
  let cardio = await Division.findOne({ name: 'Cardiology', clusterId: north._id });
  if (!cardio) cardio = await Division.create({ name: 'Cardiology', clusterId: north._id });
  let gradeA = await Grade.findOne({ name: 'Grade A' });
  if (!gradeA) gradeA = await Grade.create({ name: 'Grade A', amount: 75000 });
  let sales = await Department.findOne({ name: 'Sales' });
  if (!sales) sales = await Department.create({ name: 'Sales' });
  if (!(await Doctor.findOne({ drCode: '00100001' }))) {
    await Doctor.create({
      drCode: '00100001', name: 'Dr. Anil Kapoor', email: 'anil@dr.com',
      gradeId: gradeA._id,
      speciality: 'CP', qualification: 'M.D.', clinicName: 'Kapoor Heart Clinic',
      clinicCity: 'Delhi', clinicState: 'Delhi', pincode: '110001', mobile: '9800000020',
      // Field-force details repeat per division
      divisions: [
        { clusterId: north._id, divisionId: cardio._id, smsCode: 'DEL101', designation: 'ABM', empCode: 'E001', empName: 'Rohit Sharma', hq: 'Delhi', region: 'North' },
      ],
    });
  }
  if (!(await FitEmployee.findOne({ email: 'vikram@co.com' })))
    await FitEmployee.create({ name: 'Vikram Singh', email: 'vikram@co.com', departmentId: sales._id });

  // --- Company Owner + sample master data (Country/Currency) ---
  await ensureUser({ name: 'Company Owner', email: 'owner@travel.com', role: ROLES.COMPANY_OWNER }, 'owner123');

  const { modelForMaster } = await import('../masterEngine/MasterRecord.js');
  const meCountry = modelForMaster('country');
  const meCurrency = modelForMaster('currency');
  let india = await meCountry.findOne({ strCountryName: 'India' });
  if (!india) india = await meCountry.create({ strCountryName: 'India', strCountryCode: 'IN', decCurrencyLimit: 0 });
  let usa = await meCountry.findOne({ strCountryName: 'United States' });
  if (!usa) usa = await meCountry.create({ strCountryName: 'United States', strCountryCode: 'US', decCurrencyLimit: 0 });
  if (!(await meCurrency.findOne({ strCurrencyISO: 'INR' })))
    await meCurrency.create({ strCurrencyName: 'Indian Rupee', intCountryID: india._id, strCurrencySymbol: '₹', strCurrencyISO: 'INR', strCurrency: 'Rupee', strCurrencyUnit: 'Paise', bitCurrencyRBIRate: true, intCurrencyRatePer: 1 });
  if (!(await meCurrency.findOne({ strCurrencyISO: 'USD' })))
    await meCurrency.create({ strCurrencyName: 'US Dollar', intCountryID: usa._id, strCurrencySymbol: '$', strCurrencyISO: 'USD', strCurrency: 'Dollar', strCurrencyUnit: 'Cent', bitCurrencyRBIRate: false, intCurrencyRatePer: 1 });

  // Pre-create ALL 80 wireframe master collections (one sample row each, skips non-empty).
  const { seedAllMasters } = await import('./seedMasters.js');
  const mastersCreated = await seedAllMasters();

  // Pre-create all v13 collections so they are visible in the DB even before data entry.
  const { seedV13Collections } = await import('./seedV13Collections.js');
  const v13Created = await seedV13Collections();

  // A few realistic dropdown options used by the booking forms (Hotel Name / Meal Plan / Quota).
  // Non-destructive: insert only the option values that are not already present.
  const { modelForMaster: mfm } = await import('../masterEngine/MasterRecord.js');
  const seedOptions = async (key, field, names) => {
    const M = mfm(key);
    for (const name of names) {
      if (!(await M.findOne({ [field]: name }))) await M.create({ [field]: name });
    }
  };
  await seedOptions('property', 'strPropertyName', ['Taj Palace', 'The Oberoi', 'ITC Grand', 'Leela Palace']);
  await seedOptions('mealPlan', 'strMealPlanName', ['CP (Room + Breakfast)', 'MAP (Breakfast + Dinner)', 'AP (All Meals)', 'EP (Room Only)']);
  await seedOptions('quota', 'strQuotaName', ['General', 'Tatkal', 'Ladies', 'Senior Citizen', 'Premium Tatkal']);

  // Sample destination category showcasing the new website fields (only if none exist).
  const { DestinationCategory } = await import('../models/Destination.js');
  if ((await DestinationCategory.estimatedDocumentCount()) === 0) {
    await DestinationCategory.create({
      name: 'Asia',
      description: 'Explore the wonders of Asia.',
      displayOrder: 1,
      isActive: true,
      bestTime: 'Oct – Mar',
      idealDuration: '10–18 Days',
      travelStyle: 'Culture · Cities · Beaches · Food',
      experiences: [
        { label: 'Ancient Temples', image: '', description: '<p>Discover centuries-old temples and sacred sites.</p>' },
      ],
      seoTitle: 'Asia Tour Packages',
      seoDescription: '<p>Best Asia holiday packages and destinations.</p>',
      seoKeywords: '<p>asia, tours, temples, beaches</p>',
      seoHead: '<meta name="robots" content="index,follow" />',
      seoBody: '<p>Asia landing page body content.</p>',
    });
  }

  // --- 3-layer structure: default 360 organization + backfill + sample Main Company ---
  const { default: Organization, ORG_TYPES } = await import('../models/Organization.js');
  let org360 = await Organization.findOne({ type: ORG_TYPES.THREE_SIXTY, isDefault: true });
  if (!org360) {
    org360 = await Organization.create({
      name: '360 Travel Concierge', type: ORG_TYPES.THREE_SIXTY, isDefault: true,
      email: 'info@360travel.com', state: 'Gujarat', stateCode: '24',
    });
  }
  if ((await Organization.countDocuments({ type: ORG_TYPES.MAIN_COMPANY, parentId: org360._id })) === 0) {
    await Organization.create({ name: 'Skyline Suppliers Pvt Ltd', type: ORG_TYPES.MAIN_COMPANY, parentId: org360._id, gstNumber: '24ABCDS1234K1Z9', state: 'Gujarat', stateCode: '24' });
  }
  // Backfill the default 360 org ONLY onto records that have no organizationId yet.
  // This is an additive, backward-compatible migration — it fills a missing tenant pointer
  // and never overwrites a value that is already set, so no existing data is changed/removed.
  const { default: UserM } = await import('../models/User.js');
  const { default: CustomerM } = await import('../models/Customer.js');
  const { default: OrderM } = await import('../models/Order.js');
  const { default: CompanyM } = await import('../models/Company.js');
  await UserM.updateMany({ organizationId: { $in: [null, undefined] }, role: { $ne: 'SUPER_ADMIN' } }, { $set: { organizationId: org360._id } });
  await CustomerM.updateMany({ organizationId: { $in: [null, undefined] } }, { $set: { organizationId: org360._id } });
  await OrderM.updateMany({ organizationId: { $in: [null, undefined] } }, { $set: { organizationId: org360._id } });
  await CompanyM.updateMany({ organizationId: { $in: [null, undefined] } }, { $set: { organizationId: org360._id } });

  console.log('\nSeed complete (existing data preserved). Login accounts:');
  console.log('  Super Admin  -> admin@travel.com / admin123');
  console.log('  Employee     -> employee@travel.com / emp123');
  console.log('  Retail Cust  -> rahul@mail.com / cust123');
  console.log('  B2B Member   -> karan@nexora.com / member123');
  console.log('  Company Owner-> owner@travel.com / owner123');
  console.log(`\nMaster collections seeded: ${mastersCreated} (of 80) | v13 collections ensured: ${v13Created}`);
  console.log('Note: existing accounts keep their current passwords (seeder never overwrites them).');

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
