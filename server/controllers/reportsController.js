// =============================================================================
//  REPORTS CONTROLLER (v60)
// -----------------------------------------------------------------------------
//  Serves the report catalog, runs a report over a date range, and exports
//  single / bulk PDFs. Access is gated in routes/reportRoutes.js (SUPER_ADMIN
//  only for now; see that file for the future per-user-rights extension point).
// =============================================================================
import { catalogForClient, catalogStats, getReport } from '../reports/registry.js';
import { RUNNERS } from '../reports/runners.js';
import Settings from '../models/Settings.js';
import { buildReportPdf } from '../utils/reportPdf.js';
import { logActivity } from '../utils/activityLog.js';

/** GET /api/reports — the full categorized catalog + counts. */
export const listReports = (req, res) => {
  res.json({ catalog: catalogForClient(), stats: catalogStats() });
};

/** Resolve a report + run its runner, or return a "planned" marker. */
async function execute(req, id, params) {
  const def = getReport(id);
  if (!def) return { error: 404, message: `Unknown report: ${id}` };
  if (!def.runner || !RUNNERS[def.runner]) {
    return {
      planned: true,
      meta: { id: def.id, label: def.label, type: def.typeLabel, group: def.group, sub: def.sub },
    };
  }
  const result = await RUNNERS[def.runner](req, params);
  return {
    result: {
      ...result,
      title: result.title || def.label,
      meta: { id: def.id, label: def.label, type: def.typeLabel, group: def.group, sub: def.sub, ...(result.meta || {}) },
    },
  };
}

/** GET /api/reports/:id?from=&to= — run one report. */
export const runReport = async (req, res) => {
  try {
    const { from = '', to = '' } = req.query;
    const out = await execute(req, req.params.id, { from, to, query: req.query });
    if (out.error) return res.status(out.error).json({ message: out.message });
    if (out.planned) {
      return res.json({
        status: 'planned',
        ...out.meta,
        message: 'This report is catalogued and will be available in a future release. Its data source is not yet wired up.',
        columns: [], rows: [], totals: {},
      });
    }
    res.json({ status: 'ready', from, to, ...out.result });
  } catch (err) {
    console.error('runReport error:', err);
    res.status(500).json({ message: 'Failed to run report', error: err.message });
  }
};

/** GET /api/reports/:id/pdf?from=&to= — single report PDF. */
export const reportPdf = async (req, res) => {
  try {
    const { from = '', to = '' } = req.query;
    const out = await execute(req, req.params.id, { from, to, query: req.query });
    if (out.error) return res.status(out.error).json({ message: out.message });
    if (out.planned) return res.status(409).json({ message: 'Report not yet available — no data source wired up.' });

    const settings = await Settings.getSettings();
    const safe = (out.result.title || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safe}.pdf"`);
    buildReportPdf({ reports: [{ result: out.result, from, to }], settings }, res);
    logActivity(req, { action: 'EXPORT', module: 'Report', recordLabel: out.result.title, message: `Report PDF: ${out.result.title}` }).catch(() => {});
  } catch (err) {
    console.error('reportPdf error:', err);
    res.status(500).json({ message: 'Failed to build report PDF', error: err.message });
  }
};

/**
 * POST /api/reports/bulk-pdf  { ids:[...], from, to }
 * Combine several reports into one PDF (skips planned/unknown ids).
 */
export const reportBulkPdf = async (req, res) => {
  try {
    const { ids = [], from = '', to = '' } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'Provide ids: [reportId, ...]' });

    const reports = [];
    for (const id of ids) {
      const out = await execute(req, id, { from, to, query: req.body });
      if (out.result) reports.push({ result: out.result, from, to });
    }
    if (!reports.length) return res.status(409).json({ message: 'None of the selected reports have a live data source yet.' });

    const settings = await Settings.getSettings();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="reports-bulk.pdf"');
    buildReportPdf({ reports, settings, title: `Bulk report export (${reports.length})` }, res);
    logActivity(req, { action: 'EXPORT', module: 'Report', recordLabel: 'Bulk', message: `Bulk report PDF: ${reports.length} report(s)` }).catch(() => {});
  } catch (err) {
    console.error('reportBulkPdf error:', err);
    res.status(500).json({ message: 'Failed to build bulk PDF', error: err.message });
  }
};
