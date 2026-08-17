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

const mkUser = async (data, password) => {
  const u = new User(data);
  await u.setPassword(password);
  await u.save();
  return u;
};

const run = async () => {
  console.log('Clearing collections...');
  await Promise.all([
    User.deleteMany({}), Customer.deleteMany({}), Company.deleteMany({}), Order.deleteMany({}),
    Cluster.deleteMany({}), Division.deleteMany({}), Grade.deleteMany({}),
    Department.deleteMany({}), Doctor.deleteMany({}), FitEmployee.deleteMany({}),
    Service.deleteMany({}), Settings.deleteMany({}), Holiday.deleteMany({}),
    Leave.deleteMany({}), LeaveBalance.deleteMany({}), SalarySlip.deleteMany({}),
  ]);

  // --- Company profile / settings (home state drives CGST+SGST vs IGST) ---
  await Settings.create({
    key: 'COMPANY_PROFILE',
    companyName: '360 Travel Concierge Pvt Ltd',
    gstNumber: '24ABCDE1234F1Z5',
    addressLine1: 'Office 101, Business Hub',
    city: 'Ahmedabad', state: 'Gujarat', stateCode: '24', pincode: '380015',
    phone: '+91 90000 00000', email: 'accounts@360travelconcierge.com',
    smtpFromName: '360 Travel Concierge',
  });

  // --- Holiday master ---
  const yr = new Date().getFullYear();
  await Holiday.create([
    { name: 'Republic Day', date: new Date(yr, 0, 26), type: 'PUBLIC' },
    { name: 'Independence Day', date: new Date(yr, 7, 15), type: 'PUBLIC' },
    { name: 'Gandhi Jayanti', date: new Date(yr, 9, 2), type: 'PUBLIC' },
    { name: 'Diwali', date: new Date(yr, 10, 1), type: 'COMPANY' },
  ]);

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
      services.push(await Service.create({ name: def.name, type, gstPercent: def.gst, invoicePrefix: def.prefix }));
    }
  }
  const someServiceIds = services.slice(0, 6).map((s) => s._id); // give employee first 6

  // --- Users (4 login types) ---
  await mkUser({
    name: 'Super Admin', email: 'admin@travel.com', role: ROLES.SUPER_ADMIN,
    menus: ['ALL'], modules: ['RETAIL', 'B2B', 'FIT'],
  }, 'admin123');
  const emp = await mkUser({
    name: 'Sonal R.', email: 'employee@travel.com', role: ROLES.EMPLOYEE, employeeType: 'DOMESTIC', employeeTypes: ['DOMESTIC', 'INTERNATIONAL'],
    menus: ['ALL'], modules: ['RETAIL', 'B2B', 'FIT'], services: someServiceIds,
  }, 'emp123');

  // --- Retail ---
  await LeaveBalance.create({ employeeId: emp._id, year: yr });

  const cust = await Customer.create({ name: 'Rahul Mehta', email: 'rahul@mail.com', mobile: '9800000001', city: 'Ahmedabad', state: 'Gujarat', stateCode: '24', createdBy: emp._id });
  await mkUser({ name: 'Rahul Mehta', email: 'rahul@mail.com', role: ROLES.RETAIL_CUSTOMER, customerId: cust._id }, 'cust123');
  await Order.create({
    module: 'RETAIL', customerId: cust._id, createdBy: emp._id, totalAmount: 50000, paidAmount: 30000,
    services: [
      { serviceType: 'FLIGHT', from: 'DEL', to: 'GOI', flight: 'AI-101', pnr: 'ABC123', amount: 18000, passengers: [{ name: 'Rahul Mehta', amountCharged: 18000 }] },
      { serviceType: 'HOTEL', hotelName: 'Taj Fort Aguada', nights: 3, roomType: 'Deluxe', amount: 32000 },
    ],
  });

  // --- B2B ---
  const company = await Company.create({
    name: 'Nexora Pvt Ltd', gst: '27ABCDE1234F1Z5', contactPerson: 'Karan Desai',
    email: 'accounts@nexora.com', city: 'Mumbai', state: 'Maharashtra', stateCode: '27',
    totalBilled: 160000, totalPaid: 100000, createdBy: emp._id,
    contacts: [{ name: 'Karan Desai', designation: 'Travel Desk', email: 'karan@nexora.com', mobile: '9800000010', isPrimary: true }],
  });
  await mkUser({ name: 'Karan Desai', email: 'karan@nexora.com', role: ROLES.B2B_MEMBER, companyId: company._id }, 'member123');

  // --- FIT masters ---
  const north = await Cluster.create({ name: 'North Zone' });
  const cardio = await Division.create({ name: 'Cardiology', clusterId: north._id });
  const gradeA = await Grade.create({ name: 'Grade A', amount: 75000 });
  const sales = await Department.create({ name: 'Sales' });
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
  await FitEmployee.create({ name: 'Vikram Singh', email: 'vikram@co.com', departmentId: sales._id });

  // --- Company Owner + sample master data (Country/Currency) ---
  await mkUser({ name: 'Company Owner', email: 'owner@travel.com', role: ROLES.COMPANY_OWNER }, 'owner123');

  const { modelForMaster } = await import('../masterEngine/MasterRecord.js');
  const meCountry = modelForMaster('country');
  const meCurrency = modelForMaster('currency');
  await meCountry.deleteMany({});
  await meCurrency.deleteMany({});
  const india = await meCountry.create({ strCountryName: 'India', strCountryCode: 'IN', decCurrencyLimit: 0 });
  const usa = await meCountry.create({ strCountryName: 'United States', strCountryCode: 'US', decCurrencyLimit: 0 });
  await meCurrency.create({ strCurrencyName: 'Indian Rupee', intCountryID: india._id, strCurrencySymbol: '₹', strCurrencyISO: 'INR', strCurrency: 'Rupee', strCurrencyUnit: 'Paise', bitCurrencyRBIRate: true, intCurrencyRatePer: 1 });
  await meCurrency.create({ strCurrencyName: 'US Dollar', intCountryID: usa._id, strCurrencySymbol: '$', strCurrencyISO: 'USD', strCurrency: 'Dollar', strCurrencyUnit: 'Cent', bitCurrencyRBIRate: false, intCurrencyRatePer: 1 });

  // Pre-create ALL 80 wireframe master collections (one sample row each, skips non-empty).
  const { seedAllMasters } = await import('./seedMasters.js');
  const mastersCreated = await seedAllMasters();

  // Pre-create all v13 collections so they are visible in the DB even before data entry.
  const { seedV13Collections } = await import('./seedV13Collections.js');
  const v13Created = await seedV13Collections();

  console.log('\nSeed complete. Login accounts:');
  console.log('  Super Admin  -> admin@travel.com / admin123');
  console.log('  Employee     -> employee@travel.com / emp123');
  console.log('  Retail Cust  -> rahul@mail.com / cust123');
  console.log('  B2B Member   -> karan@nexora.com / member123');
  console.log('  Company Owner-> owner@travel.com / owner123');
  console.log(`\nMaster collections seeded: ${mastersCreated} (of 80) | v13 collections ensured: ${v13Created}`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
