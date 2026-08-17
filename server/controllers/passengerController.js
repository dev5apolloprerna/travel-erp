import { Doctor, Cluster, Division } from '../models/FitMasters.js';

/**
 * Passenger (DR) master.
 * Core identity is single; field-force details repeat per division.
 */

const str = (v) => (v === null || v === undefined ? '' : String(v).trim());

// Clean an incoming divisions array (drop blank rows, coerce empty ids to undefined).
const cleanDivisions = (divisions = []) =>
  (Array.isArray(divisions) ? divisions : [])
    .filter((d) => d && (d.divisionId || d.empCode || d.empName || d.hq))
    .map((d) => ({
      divisionId: d.divisionId || undefined,
      clusterId: d.clusterId || undefined,
      smsCode: str(d.smsCode),
      designation: str(d.designation),
      empCode: str(d.empCode),
      empName: str(d.empName),
      hq: str(d.hq),
      region: str(d.region),
    }));

/* ============================ CRUD ============================ */

export const listPassengers = async (req, res) => {
  const { search, divisionId, speciality, city } = req.query;
  const filter = {};
  if (divisionId) filter['divisions.divisionId'] = divisionId;
  if (speciality) filter.speciality = speciality;
  if (city) filter.clinicCity = city;
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { drCode: rx }, { mobile: rx }, { email: rx }, { clinicName: rx }];
  }

  const docs = await Doctor.find(filter)
    .populate('divisions.divisionId', 'name')
    .populate('divisions.clusterId', 'name')
    .sort('name')
    .limit(Number(req.query.limit) || 500);
  res.json(docs);
};

export const getPassenger = async (req, res) => {
  const doc = await Doctor.findById(req.params.id)
    .populate('divisions.divisionId', 'name')
    .populate('divisions.clusterId', 'name');
  if (!doc) return res.status(404).json({ message: 'Passenger not found' });
  res.json(doc);
};

export const createPassenger = async (req, res) => {
  const drCode = str(req.body.drCode);
  if (!drCode) return res.status(400).json({ message: 'Dr. Code is required' });
  if (!str(req.body.name)) return res.status(400).json({ message: 'Dr. Name is required' });

  const clash = await Doctor.findOne({ drCode });
  if (clash) return res.status(400).json({ message: `Dr. Code ${drCode} already exists` });

  const doc = await Doctor.create({
    ...req.body,
    drCode,
    divisions: cleanDivisions(req.body.divisions),
  });
  res.status(201).json(doc);
};

export const updatePassenger = async (req, res) => {
  const doc = await Doctor.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Passenger not found' });

  if (req.body.drCode && str(req.body.drCode) !== doc.drCode) {
    const clash = await Doctor.findOne({ drCode: str(req.body.drCode), _id: { $ne: doc._id } });
    if (clash) return res.status(400).json({ message: `Dr. Code ${req.body.drCode} already exists` });
  }

  const body = { ...req.body };
  if (body.divisions !== undefined) body.divisions = cleanDivisions(body.divisions);
  Object.assign(doc, body);
  await doc.save();
  res.json(doc);
};

export const deletePassenger = async (req, res) => {
  await Doctor.findByIdAndDelete(req.params.id);
  res.json({ message: 'Passenger deleted' });
};

/** Distinct values used to populate the list filters. */
export const passengerFilters = async (req, res) => {
  const [specialities, cities] = await Promise.all([
    Doctor.distinct('speciality'),
    Doctor.distinct('clinicCity'),
  ]);
  res.json({
    specialities: specialities.filter(Boolean).sort(),
    cities: cities.filter(Boolean).sort(),
  });
};

/* ============================ SOCIETY BOOKING SEARCH ============================ */
/**
 * Society booking is passenger-driven.
 * GET /api/fit/passengers/search?drCode=... -> matching passengers (by code or name)
 * so the desk can pick the passenger, then pick one of their divisions, and the
 * division's field-force details (SMS/Designation/Emp/HQ/Region) come with it.
 */
export const searchForBooking = async (req, res) => {
  const q = str(req.query.drCode || req.query.q);
  if (!q) return res.json([]);

  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const docs = await Doctor.find({ $or: [{ drCode: rx }, { name: rx }] })
    .populate('divisions.divisionId', 'name')
    .populate('divisions.clusterId', 'name')
    .limit(20);

  res.json(
    docs.map((d) => ({
      _id: d._id,
      drCode: d.drCode,
      name: d.name,
      speciality: d.speciality,
      qualification: d.qualification,
      clinicName: d.clinicName,
      clinicCity: d.clinicCity,
      mobile: d.mobile,
      email: d.email,
      divisions: (d.divisions || []).map((dv) => ({
        _id: dv._id,
        divisionId: dv.divisionId?._id || dv.divisionId,
        divisionName: dv.divisionId?.name || '',
        clusterName: dv.clusterId?.name || '',
        smsCode: dv.smsCode,
        designation: dv.designation,
        empCode: dv.empCode,
        empName: dv.empName,
        hq: dv.hq,
        region: dv.region,
      })),
    }))
  );
};
