import { Router } from 'express';
import * as c from '../controllers/reportsController.js';
import { protect, allow } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';

// =============================================================================
//  REPORTS ROUTES (v60) — mounted at /api/reports
// -----------------------------------------------------------------------------
//  ACCESS CONTROL (per client instruction):
//    "want report in super admin login only for now ... in future we can right
//     user wise so they can view report according to their rights."
//
//  So today every report endpoint is locked to SUPER_ADMIN via `allow(...)`.
//
//  FUTURE PER-USER RIGHTS — extension point:
//    Each report already owns a stable id, and its permission key is
//    `reports.<id>` (see reports/registry.js). To grant reports per user later,
//    replace the blanket `allow(ROLES.SUPER_ADMIN)` below with a per-id check,
//    e.g. a small middleware:
//
//        import { can } from '../middleware/auth.js';
//        const canReport = (req,res,next)=> can('reports.'+req.params.id,'SELECT')(req,res,next);
//        r.get('/:id', canReport, c.runReport);
//
//    and seed `reports.<id>` keys into the employee permission matrix. No other
//    layer needs to change — the registry, runners, controller and UI are all
//    permission-agnostic.
// =============================================================================
const r = Router();

// Single gate for the whole module. Swap for per-report checks in the future.
const reportGate = [protect, allow(ROLES.SUPER_ADMIN)];

r.get('/', reportGate, c.listReports);              // catalog + stats
r.post('/bulk-pdf', reportGate, c.reportBulkPdf);   // combine several into one PDF
r.get('/:id', reportGate, c.runReport);             // run one report (JSON)
r.get('/:id/pdf', reportGate, c.reportPdf);         // one report as PDF

export default r;
