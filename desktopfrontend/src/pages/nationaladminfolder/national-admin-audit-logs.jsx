// desktopfrontend/src/pages/nationaladminfolder/national-admin-audit-logs.jsx
import './national-admin-css.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  ScrollText,
} from 'lucide-react';
import Sidebar from '../component/sidebar';
import TopBar from '../component/top-bar';

// ── Action code lists, scoped per tab ──
// Built directly from AuditAction (backend/app/core/constants.py) and each
// tab's actual query scope in audit_logs_service.py, NOT categories — the
// backend has no action_type field, only exact action codes.

const NATIONAL_TAB_ACTIONS = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
  'INVITE_NATIONAL_ADMIN', 'INVITE_NATIONAL_ADMIN_RESENT', 'NATIONAL_ADMIN_REQUEST_INVITE',
  'APPROVE_NATIONAL_ADMIN_ACCOUNT', 'SUSPEND_NATIONAL_ADMIN_ACCOUNT', 'REACTIVATE_NATIONAL_ADMIN_ACCOUNT',
  'DELETE_NATIONAL_ADMIN_ACCOUNT', 'UNLOCK_NATIONAL_ADMIN_ACCOUNT',
  'UPDATE_NATIONAL_ADMIN_PASSWORD', 'UPDATE_NATIONAL_ADMIN_INFORMATION',
  // Shown on this tab too — a National Admin can perform these on Regional Admins
  'APPROVE_REGIONAL_ADMIN_ACCOUNT', 'SUSPEND_REGIONAL_ADMIN_ACCOUNT', 'REACTIVATE_REGIONAL_ADMIN_ACCOUNT',
];

// get_fda_audit_logs returns fda_admin + fda_personnel together (no split),
// so this tab's filter needs both roles' action codes.
// National Admin's FDA tab is oversight-scoped: it only shows Regional Admin
// account status changes, not FDA's day-to-day business activity (that's
// what FDA Admin's own audit-logs page is for).
const FDA_TAB_ACTIONS = [
  'APPROVE_REGIONAL_ADMIN_ACCOUNT', 'SUSPEND_REGIONAL_ADMIN_ACCOUNT', 'REACTIVATE_REGIONAL_ADMIN_ACCOUNT',
];

// get_lea_audit_logs likewise returns lea_admin + lea_personnel together.
const LEA_TAB_ACTIONS = [
  'APPROVE_REGIONAL_ADMIN_ACCOUNT', 'SUSPEND_REGIONAL_ADMIN_ACCOUNT', 'REACTIVATE_REGIONAL_ADMIN_ACCOUNT',
];

// National Admin's own System tab is scoped to National-Admin events only —
// personnel/regional-admin lockouts and pending-approvals show on FDA/LEA
// Admin's own System tabs instead.
const SYSTEM_TAB_ACTIONS = [
  'LOCK_NATIONAL_ADMIN_ACCOUNT', 'PENDING_NATIONAL_ADMIN_ACCOUNT', 'INVITATION_EXPIRED_NATIONAL_ADMIN',
  'INVITATION_EXPIRED_REGIONAL_ADMIN',
];

// Agency filter options for the System tab only — once
// INVITATION_EXPIRED_REGIONAL_ADMIN rows are mixed in, the tab spans more
// than one agency and needs its own way to narrow that down.
const SYSTEM_AGENCY_OPTIONS = ['National Admin', 'FDA', 'LEA-CIDG'];

const SHARED_LOGIN_ACTIONS = ['LOGIN', 'LOGOUT', 'LOGIN_FAILED'];

// Same derivation logic as the LEA Admin audit-logs page — the backend has
// no action_type field, only exact action codes, so category is inferred
// from the code's prefix purely for badge coloring.
function deriveActionType(action) {
  if (!action) return 'neutral';
  if (action.startsWith('DELETE') || action.startsWith('SUSPEND') || action.startsWith('LOCK')) return 'delete';
  if (action.startsWith('CREATE') || action.startsWith('INVITE') || action.startsWith('APPROVE') || action.startsWith('REACTIVATE') || action.startsWith('UNLOCK') || action.startsWith('PERSONNEL_SELF_ACTIVATE')) return 'create';
  if (action.startsWith('UPDATE') || action.startsWith('CONVERT')) return 'update';
  if (SHARED_LOGIN_ACTIONS.includes(action)) return 'login';
  return 'neutral';
}

function formatTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Local (not UTC) calendar date, so the date filter agrees with what
// formatTimestamp displays — a raw ISO string's date portion is UTC and
// can be off by a day from the viewer's local date.
function toLocalDateStr(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ActionBadge({ action }) {
  const actionType = deriveActionType(action);
  const badgeClass =
    actionType === 'create'
      ? 'badge-action-create'
      : actionType === 'update'
      ? 'badge-action-update'
      : actionType === 'delete'
      ? 'badge-action-delete'
      : actionType === 'security'
      ? 'badge-action-security'
      : 'badge-action-neutral';

  return <span className={badgeClass}>{action}</span>;
}

function AgencyBadge({ agency }) {
  const agencyClass =
    agency === 'National Admin'
      ? 'nam-agency-national'
      : agency === 'FDA'
      ? 'nam-agency-fda'
      : agency === 'LEA-CIDG'
      ? 'nam-agency-lea'
      : 'nam-agency-system';

  return <span className={`NAMAgencyBadge ${agencyClass}`}>{agency}</span>;
}

const REGION_OPTIONS = [
  'NCR', 'CAR', 'Region 1', 'Region 2', 'Region 3', 'Region 4A', 'Region 4B',
  'Region 5', 'Region 6', 'Region 7', 'Region 8', 'Region 9', 'Region 10',
  'Region 11', 'Region 12', 'Region 13', 'BARMM',
];

export default function NationalAdminAuditLogs() {
  // Tabs: 'National' | 'FDA' | 'LEA' | 'System'
  const [activeTab, setActiveTab] = useState('National');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [agencyFilter, setAgencyFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(8);

  const [nationalRows, setNationalRows] = useState([]);
  const [fdaRows, setFdaRows] = useState([]);
  const [leaRows, setLeaRows] = useState([]);
  const [systemRows, setSystemRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [nationalRes, fdaRes, leaRes, systemRes] = await Promise.all([
        apiFetch('/admin/audit-logs/national-admin?limit=500'),
        apiFetch('/admin/audit-logs/fda?limit=500'),
        apiFetch('/admin/audit-logs/lea?limit=500'),
        apiFetch('/admin/audit-logs/national-admin/system?limit=500'),
      ]);

      if (!nationalRes.ok) throw new Error('Failed to load National Admin audit logs.');
      if (!fdaRes.ok) throw new Error('Failed to load FDA audit logs.');
      if (!leaRes.ok) throw new Error('Failed to load LEA-CIDG audit logs.');
      if (!systemRes.ok) throw new Error('Failed to load system audit logs.');

      const nationalData = await nationalRes.json();
      const fdaData = await fdaRes.json();
      const leaData = await leaRes.json();
      const systemData = await systemRes.json();

      setNationalRows(nationalData.items || []);
      setFdaRows(fdaData.items || []);
      setLeaRows(leaData.items || []);
      setSystemRows(systemData.items || []);
    } catch (err) {
      setFetchError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // FDA/LEA/System endpoints return everything in scope, unfiltered — these
  // three tabs only show the subset relevant to National Admin's own
  // oversight, so scope the fetched rows down to match the tab's own
  // action list before counting or rendering.
  const scopedFdaRows = fdaRows.filter((row) => FDA_TAB_ACTIONS.includes(row.action));
  const scopedLeaRows = leaRows.filter((row) => LEA_TAB_ACTIONS.includes(row.action));
  const scopedSystemRows = systemRows.filter((row) => SYSTEM_TAB_ACTIONS.includes(row.action));

  const tabCounts = {
    National: nationalRows.length,
    FDA: scopedFdaRows.length,
    LEA: scopedLeaRows.length,
    System: scopedSystemRows.length,
  };

  const rawLogs =
    activeTab === 'National' ? nationalRows
    : activeTab === 'FDA' ? scopedFdaRows
    : activeTab === 'LEA' ? scopedLeaRows
    : scopedSystemRows;

  const actionOptions =
    activeTab === 'National' ? NATIONAL_TAB_ACTIONS
    : activeTab === 'FDA' ? FDA_TAB_ACTIONS
    : activeTab === 'LEA' ? LEA_TAB_ACTIONS
    : SYSTEM_TAB_ACTIONS;

  // Filter logs according to search, action, region, and date range.
  // Tab scope is already applied above via rawLogs (each tab's own endpoint).
  const filteredLogs = useMemo(() => {
    return rawLogs.filter((log) => {
      if (actionFilter !== 'All' && log.action !== actionFilter) return false;

      if ((activeTab === 'FDA' || activeTab === 'LEA') && regionFilter !== 'All' && log.region_code !== regionFilter) {
        return false;
      }

      if (activeTab === 'System' && agencyFilter !== 'All' && log.agency !== agencyFilter) {
        return false;
      }

      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          (log.user_email && log.user_email.toLowerCase().includes(q)) ||
          (log.user_name && log.user_name.toLowerCase().includes(q)) ||
          (log.target_id && String(log.target_id).toLowerCase().includes(q)) ||
          (log.target_table && log.target_table.toLowerCase().includes(q)) ||
          (log.target_reference && log.target_reference.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      const logDate = toLocalDateStr(log.timestamp);
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > dateTo) return false;

      return true;
    });
  }, [rawLogs, activeTab, searchQuery, actionFilter, regionFilter, agencyFilter, dateFrom, dateTo]);

  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const displayedLogs = filteredLogs.slice(startIndex, startIndex + limit);

  const isFiltered =
    searchQuery !== '' ||
    actionFilter !== 'All' ||
    ((activeTab === 'FDA' || activeTab === 'LEA') && regionFilter !== 'All') ||
    (activeTab === 'System' && agencyFilter !== 'All') ||
    dateFrom !== '' ||
    dateTo !== '';

  function switchTab(tab) {
    setActiveTab(tab);
    setRegionFilter('All');
    setAgencyFilter('All');
    setActionFilter('All');
    setCurrentPage(1);
  }

  function handleResetFilters() {
    setSearchQuery('');
    setActionFilter('All');
    setRegionFilter('All');
    setAgencyFilter('All');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  }

  return (
    <div className="NAMMainContainer">
      <Sidebar sidebarType="NATIONAL_ADMIN" />
      <div className="NAMContentContainer">
        <TopBar topbarType="NATIONAL_ADMIN" />
        <div className="NAMMainfeed">
          <div className="NAMPageContainer">
            {/* Page Header */}
            <div className="NAMPageHeader">
              <div className="NAMPageTitleBlock">
                <h1 className="NAMPageTitle" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ScrollText size={24} color="#0D9488" />
                  National Admin Audit Logs
                </h1>
                <p className="NAMPageSubtitle">
                  Inspect immutable historical activity across National Administration, FDA, LEA-CIDG, and System transactions.
                </p>
              </div>
            </div>

            {fetchError && (
              <div className="NAMFieldError" style={{ marginBottom: '12px' }}>
                {fetchError}
              </div>
            )}

            {/* Scope Tabs */}
            <div className="NAMAuditTabsRow">
              <div className="NAMAuditTabsWrapper">
                <button
                  className={`NAMAuditTabBtn ${activeTab === 'National' ? 'active' : ''}`}
                  onClick={() => switchTab('National')}
                >
                  National Admin
                  <span className="NAMAuditTabBadge">{tabCounts.National}</span>
                </button>
                <button
                  className={`NAMAuditTabBtn ${activeTab === 'FDA' ? 'active' : ''}`}
                  onClick={() => switchTab('FDA')}
                >
                  FDA Admin
                  <span className="NAMAuditTabBadge">{tabCounts.FDA}</span>
                </button>
                <button
                  className={`NAMAuditTabBtn ${activeTab === 'LEA' ? 'active' : ''}`}
                  onClick={() => switchTab('LEA')}
                >
                  LEA Admin
                  <span className="NAMAuditTabBadge">{tabCounts.LEA}</span>
                </button>
                <button
                  className={`NAMAuditTabBtn ${activeTab === 'System' ? 'active' : ''}`}
                  onClick={() => switchTab('System')}
                >
                  System Events
                  <span className="NAMAuditTabBadge">{tabCounts.System}</span>
                </button>
              </div>
            </div>

            {/* Search & Filters Bar */}
            <div className="NAMFiltersContainer">
              <div className="NAMSearchWrapper">
                <Search size={16} className="NAMSearchIcon" />
                <input
                  type="text"
                  className="NAMSearchInput"
                  placeholder="Search by email, name, target ID, table, or reference..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    className="NAMClearSearch"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="NAMFilterGroup">
                <div className="NAMFilterItem">
                  <span className="NAMFilterLabel">ACTION</span>
                  <select
                    className="NAMSelectFilter"
                    value={actionFilter}
                    onChange={(e) => {
                      setActionFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All Actions</option>
                    {actionOptions.map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>

                {(activeTab === 'FDA' || activeTab === 'LEA') && (
                  <div className="NAMFilterItem">
                    <span className="NAMFilterLabel">REGION</span>
                    <select
                      className="NAMSelectFilter"
                      value={regionFilter}
                      onChange={(e) => {
                        setRegionFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="All">All Regions</option>
                      {REGION_OPTIONS.map((reg) => (
                        <option key={reg} value={reg}>
                          {reg}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTab === 'System' && (
                  <div className="NAMFilterItem">
                    <span className="NAMFilterLabel">AGENCY</span>
                    <select
                      className="NAMSelectFilter"
                      value={agencyFilter}
                      onChange={(e) => {
                        setAgencyFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="All">All Agencies</option>
                      {SYSTEM_AGENCY_OPTIONS.map((ag) => (
                        <option key={ag} value={ag}>
                          {ag}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="NAMFilterItem">
                  <span className="NAMFilterLabel">FROM</span>
                  <input
                    type="date"
                    className="NAMSelectFilter"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <div className="NAMFilterItem">
                  <span className="NAMFilterLabel">TO</span>
                  <input
                    type="date"
                    className="NAMSelectFilter"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {isFiltered && (
                  <button
                    className="NAMBtnClearFiltersIcon"
                    title="Clear All Filters"
                    aria-label="Clear All Filters"
                    onClick={handleResetFilters}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="NAMTableWrapper">
              <table className="NAMTable">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th style={{ width: '170px' }}>Timestamp</th>
                    <th>User / Actor</th>
                    <th>Agency</th>
                    {activeTab !== 'National' && <th>Region</th>}
                    <th>Action</th>
                    <th>Target Table & Record</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={activeTab === 'National' ? 7 : 8} className="NAMNoResults">
                        Loading audit logs…
                      </td>
                    </tr>
                  ) : displayedLogs.length > 0 ? (
                    displayedLogs.map((log, idx) => (
                      <tr key={log.log_id}>
                        <td className="NAMTdCenter">{startIndex + idx + 1}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px', fontFamily: 'monospace' }}>
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td>
                          <strong>{log.user_name || log.user_email || 'System Worker'}</strong>
                          {log.user_role && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{log.user_role}</div>
                          )}
                        </td>
                        <td>
                          <AgencyBadge agency={log.agency} />
                        </td>
                        {activeTab !== 'National' && <td>{log.region_code || '—'}</td>}
                        <td>
                          <ActionBadge action={log.action} />
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12.5px' }}>
                          {log.target_table}
                          {log.target_reference && (
                            <span style={{ color: '#0D9488', marginLeft: '6px', fontWeight: 600 }}>
                              ({log.target_reference})
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="NAMTableActionBtn"
                            onClick={() => setSelectedLog(log)}
                            title="Inspect Audit Transaction Details"
                          >
                            <Info size={14} /> Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={activeTab === 'National' ? 7 : 8} className="NAMNoResults">
                        No audit logs recorded for the selected scope or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Table Pagination */}
              {!loading && totalItems > 0 && (
                <div className="NAMPaginationWrapper">
                  <span className="NAMPaginationInfo">
                    Showing {startIndex + 1}–{endIndex} of {totalItems} audit logs
                  </span>
                  <div className="NAMPaginationControls">
                    <button
                      className="NAMPaginationBtn"
                      disabled={activePage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`NAMPaginationPageNumber ${activePage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="NAMPaginationBtn"
                      disabled={activePage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="NAMModalOverlay" onClick={() => setSelectedLog(null)}>
          <div
            className="NAMModal"
            style={{ maxWidth: '640px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="NAMModalHeader" style={{ padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
              <div className="NAMViewTitleRow">
                <h3 className="NAMModalTitle">Audit Log Transaction Details</h3>
              </div>
              <p className="NAMModalSubtitle">
                Transaction Reference: <code>{selectedLog.log_id}</code>
              </p>
              <button
                className="NAMClearSearch"
                style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '20px' }}
                onClick={() => setSelectedLog(null)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="NAMAuditSummaryBox">
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Log ID:</span>
                  <span className="NAMAuditSummaryValue" style={{ fontFamily: 'monospace' }}>
                    {selectedLog.log_id}
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Timestamp:</span>
                  <span className="NAMAuditSummaryValue">{formatTimestamp(selectedLog.timestamp)}</span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Actor / Role:</span>
                  <span className="NAMAuditSummaryValue">
                    {selectedLog.user_name || selectedLog.user_email || 'Automated System Service'} ({selectedLog.user_role || 'system'})
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">User ID:</span>
                  <span className="NAMAuditSummaryValue" style={{ fontFamily: 'monospace' }}>
                    {selectedLog.user_id || '—'}
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Email:</span>
                  <span className="NAMAuditSummaryValue">
                    {selectedLog.user_email || '—'}
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Agency / Region:</span>
                  <span className="NAMAuditSummaryValue">
                    <AgencyBadge agency={selectedLog.agency} />
                    <span style={{ marginLeft: '8px', color: '#64748b' }}>({selectedLog.region_code || 'National'})</span>
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Action Code:</span>
                  <span className="NAMAuditSummaryValue">
                    <ActionBadge action={selectedLog.action} />
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Target Table:</span>
                  <span className="NAMAuditSummaryValue" style={{ fontFamily: 'monospace' }}>
                    {selectedLog.target_table || '—'}
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Target Reference:</span>
                  <span className="NAMAuditSummaryValue" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0D9488' }}>
                    {selectedLog.target_reference || '—'}
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Record / Target ID:</span>
                  <span className="NAMAuditSummaryValue" style={{ fontFamily: 'monospace' }}>
                    {selectedLog.target_id || '—'}
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Origin IP:</span>
                  <span className="NAMAuditSummaryValue" style={{ fontFamily: 'monospace' }}>
                    {selectedLog.ip_address || '—'}
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">User Agent:</span>
                  <span className="NAMAuditSummaryValue" style={{ fontSize: '11px', color: '#64748b' }}>
                    {selectedLog.user_agent || '—'}
                  </span>
                </div>
              </div>

              {/* State Difference Inspection */}
              {selectedLog.old_value && (
                <div className="NAMFormGroup" style={{ marginBottom: 0 }}>
                  <label className="NAMLabel">Previous State (Old Value):</label>
                  <pre className="NAMAuditJsonPre old-state">
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div className="NAMFormGroup" style={{ marginBottom: 0 }}>
                  <label className="NAMLabel">Modified State (New Value):</label>
                  <pre className="NAMAuditJsonPre new-state">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="NAMModalFooter NAMFooterCenter" style={{ padding: '16px 28px 24px', borderTop: '1px solid #f1f5f9' }}>
              <button
                className="NAMConfirmBtn primary"
                onClick={() => setSelectedLog(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}