import mongoose from 'mongoose';
import { documentSchema } from './shared.js';

const clusterSchema = new mongoose.Schema({ name: { type: String, required: true } }, { timestamps: true });

const divisionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', required: true },
  },
  { timestamps: true }
);

const gradeSchema = new mongoose.Schema(
  { name: { type: String, required: true }, amount: { type: Number, default: 0 } },
  { timestamps: true }
);

const departmentSchema = new mongoose.Schema({ name: { type: String, required: true } }, { timestamps: true });

// DR: belongs to cluster+division+grade (grade amount is reference only)
// Passenger (DR) master.
// Field set mirrors columns A-W of the MSL summary sheet.
const doctorSchema = new mongoose.Schema(
  {
    // ---- Basic (A-H) ----
    clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster' },       // A Cluster
    divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Division' },     // B Division
    // Sparse unique index: enforces uniqueness for new records without breaking
    // legacy passengers created before Dr. Code existed.
    drCode: { type: String, required: true, unique: true, sparse: true, trim: true },  // C Dr. Code
    name: { type: String, required: true },                                    // D Dr. Name
    category: { type: String, default: '' },                                   // E Category
    qualification: { type: String, default: '' },                              // F Qualification
    speciality: { type: String, default: '' },                                 // G Speciality
    divSubSpeciality: { type: String, default: '' },                           // H Div. Sub Spec.

    // ---- Clinic (I, P-U) ----
    clinicCity: { type: String, default: '' },                                 // I Dr. City (Clinic)
    clinicName: { type: String, default: '' },                                 // P Clinic/Hospital Name
    complexArea: { type: String, default: '' },                                // Q Complex/Area Name
    landmark: { type: String, default: '' },                                   // R Landmark
    clinicState: { type: String, default: '' },                                // S Clinic State
    pincode: { type: String, default: '' },                                    // T Pincode
    clinicPhone: { type: String, default: '' },                                // U Clinic Ph No

    // ---- Field force fields now repeat PER DIVISION (see `divisions` below) ----
    // These single fields are kept so older records still load; new data uses `divisions`.
    smsCode: { type: String, default: '' },
    designation: { type: String, default: '' },
    empCode: { type: String, default: '' },
    empName: { type: String, default: '' },
    hq: { type: String, default: '' },
    region: { type: String, default: '' },

    // ---- Contact (V-W) ----
    mobile: { type: String, default: '' },                                     // V Mobile No.
    email: { type: String, default: '' },                                      // W Email ID

    // ---- Divisions the passenger belongs to ----
    // A passenger can belong to several divisions; each carries its own field-force detail.
    divisions: [
      new mongoose.Schema(
        {
          divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Division' },
          clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster' },
          smsCode: { type: String, default: '' },
          designation: { type: String, default: '' },
          empCode: { type: String, default: '' },
          empName: { type: String, default: '' },
          hq: { type: String, default: '' },
          region: { type: String, default: '' },
        },
        { _id: true }
      ),
    ],

    // ---- Retained from before ----
    gradeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade' },
    contact: String,                       // legacy field, kept so old records still load
    isActive: { type: Boolean, default: true },
    documents: [documentSchema],
  },
  { timestamps: true }
);

// Fast lookup for the list filters and import duplicate checks.
doctorSchema.index({ name: 1 });
doctorSchema.index({ clusterId: 1, divisionId: 1 });

// FIT employee: department + (optional) cluster/division. No grade/spend limit.
const fitEmployeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: String,
    contact: String,
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster' },
    divisionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Division' },
    documents: [documentSchema],
  },
  { timestamps: true }
);

export const Cluster = mongoose.model('Cluster', clusterSchema);
export const Division = mongoose.model('Division', divisionSchema);
export const Grade = mongoose.model('Grade', gradeSchema);
export const Department = mongoose.model('Department', departmentSchema);
export const Doctor = mongoose.model('Doctor', doctorSchema);
export const FitEmployee = mongoose.model('FitEmployee', fitEmployeeSchema);
