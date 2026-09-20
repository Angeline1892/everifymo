import './fda-admin-css.css';
import { useState, useEffect, useCallback } from 'react';
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

// Action codes an FDA Admin can trigger — their own account lifecycle,
// plus every account-management action they perform on personnel accounts
// (since the actor, not the target, decides which tab a row belongs to).
const REGIONAL_ADMIN_ACTIONS = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
  'INVITE_REGIONAL_ADMIN', 'INVITE_REGIONAL_ADMIN_RESENT', 'REGIONAL_ADMIN_REQUEST_INVITE',
  'DELETE_REGIONAL_ADMIN_ACCOUNT', 'UNLOCK_REGIONAL_ADMIN_ACCOUNT', 'UPDATE_REGIONAL_ADMIN_PASSWORD',
  'UPDATE_REGIONAL_ADMIN_INFORMATION', 'APPROVE_REGIONAL_ADMIN_ACCOUNT', 'SUSPEND_REGIONAL_ADMIN_ACCOUNT',
  'REACTIVATE_REGIONAL_ADMIN_ACCOUNT',
  'INVITE_PERSONNEL', 'INVITE_PERSONNEL_RESENT', 'SUSPEND_PERSONNEL_ACCOUNT', 'REACTIVATE_PERSONNEL_ACCOUNT',
  'DELETE_PERSONNEL_ACCOUNT', 'UNLOCK_PERSONNEL_ACCOUNT', 'UPDATE_PERSONNEL_PASSWORD', 'UPDATE_PERSONNEL_INFORMATION',
];

// Action codes a Personnel account triggers themselves — logins and their
// own job actions (products, advisories, complaints, verification, and
// their self-service requests).
const PERSONNEL_ACTIONS = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
  'PERSONNEL_REQUEST_INVITE', 'PERSONNEL_REQUEST_PASSWORD_UPDATE', 'PERSONNEL_SELF_ACTIVATE',
  'UPDATE_VERIFICATION_STATUS', 'CREATE_REGISTERED_PRODUCT', 'CONVERT_TO_REGISTERED_PRODUCT',
  'UPDATE_REGISTERED_PRODUCT', 'DELETE_REGISTERED_PRODUCT', 'CREATE_UNREGISTERED_ADVISORY',
  'CONVERT_TO_UNREGISTERED_ADVISORY', 'UPDATE_UNREGISTERED_ADVISORY', 'DELETE_UNREGISTERED_ADVISORY',
  'UPDATE_COMPLAINT_STATUS',
];

const SHARED_LOGIN_ACTIONS = ['LOGIN', 'LOGOUT', 'LOGIN_FAILED'];

// Split is purely by who performed the action — the row's own user_role —
// not by which account the action concerns. So "FDA Admin suspended a
// personnel account" is an admin action, and belongs on the Admin tab.
function getRowTab(row) {
  return row.user_role === 'fda_admin' ? 'admin' : 'personnel';
}

const ROLE_LABELS = {
  fda_admin: 'FDA Admin',
  fda_personnel: 'FDA Personnel',
  system: 'System',
};

function humanizeRole(role) {
  return ROLE_LABELS[role] || role;
}

// Badges are derived from keywords in the action code itself, since the
// real API doesn't return a separate "action_type" field the way the old
// mock data did.
function deriveActionType(action) {
  if (!action) return 'neutral';
  if (action.startsWith('DELETE') || action.startsWith('SUSPEND') || action.startsWith('LOCK')) return 'delete';
  if (action.startsWith('CREATE') || action.startsWith('INVITE') || action.startsWith('APPROVE') || action.startsWith('REACTIVATE') || action.startsWith('UNLOCK') || action.startsWith('PERSONNEL_SELF_ACTIVATE')) return 'create';
  if (action.startsWith('UPDATE') || action.startsWith('CONVERT')) return 'update';
  if (SHARED_LOGIN_ACTIONS.includes(action)) return 'login';
  return 'neutral';
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
      : 'badge-action-neutral';

  return <span className={badgeClass}>{action}</span>;
}

function formatTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Action-filter dropdown options, per tab — only actions that can actually
// appear on that tab are listed, instead of the old generic create/update/
// delete/login buckets.
const ADMIN_TAB_ACTION_OPTIONS = REGIONAL_ADMIN_ACTIONS;
const PERSONNEL_TAB_ACTION_OPTIONS = PERSONNEL_ACTIONS;
const SYSTEM_TAB_ACTION_OPTIONS = [
  'PENDING_NATIONAL_ADMIN_ACCOUNT', 'LOCK_PERSONNEL_ACCOUNT', 'LOCK_NATIONAL_ADMIN_ACCOUNT', 'LOCK_REGIONAL_ADMIN_ACCOUNT',
];

export default function FDAAdminAuditLogs() {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' | 'personnel' | 'system'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(8);

  const [fdaRows, setFdaRows] = useState([]);
  const [systemRows, setSystemRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [fdaRes, systemRes] = await Promise.all([
        apiFetch('/admin/audit-logs/fda?limit=500'),
        apiFetch('/admin/audit-logs/system?limit=500'),
      ]);

      if (!fdaRes.ok) throw new Error('Failed to load FDA audit logs.');
      if (!systemRes.ok) throw new Error('Failed to load system audit logs.');

      const fdaData = await fdaRes.json();
      const systemData = await systemRes.json();

      setFdaRows(fdaData.items || []);
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

  const adminRows = fdaRows.filter((row) => getRowTab(row) === 'admin');
  const personnelRows = fdaRows.filter((row) => getRowTab(row) === 'personnel');

  const rawLogs = activeTab === 'admin' ? adminRows : activeTab === 'personnel' ? personnelRows : systemRows;

  const actionOptions =
    activeTab === 'admin' ? ADMIN_TAB_ACTION_OPTIONS
    : activeTab === 'personnel' ? PERSONNEL_TAB_ACTION_OPTIONS
    : SYSTEM_TAB_ACTION_OPTIONS;

  const filteredLogs = rawLogs.filter((log) => {
    const matchesAction = actionFilter === 'All' ? true : log.action === actionFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (log.user_name && log.user_name.toLowerCase().includes(q)) ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.target_table && log.target_table.toLowerCase().includes(q)) ||
      (log.target_reference && log.target_reference.toLowerCase().includes(q));

    const logDate = log.timestamp ? log.timestamp.split('T')[0] : '';
    const matchesDateFrom = !dateFrom || logDate >= dateFrom;
    const matchesDateTo = !dateTo || logDate <= dateTo;

    return matchesAction && matchesSearch && matchesDateFrom && matchesDateTo;
  });

  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const displayedLogs = filteredLogs.slice(startIndex, startIndex + limit);

  function switchTab(tab) {
    setActiveTab(tab);
    setCurrentPage(1);
    setActionFilter('All');
  }

  return (
    <div className="FDAAdminMainContainer">
      <Sidebar sidebarType="FDA_ADMIN" />
      <div className="FDAAdminContentContainer">
        <TopBar topbarType="FDA_ADMIN" />
        <div className="FDAAdminMainfeed">
          <div className="FDAAdminPageContainer">
            <div className="FDAAdminPageHeader">
              <div className="FDAAdminPageTitleBlock">
                <h1 className="FDAAdminPageTitle">
                  <ScrollText size={24} color="#0d9488" />
                  FDA Audit Logs
                </h1>
                <p className="FDAAdminPageSubtitle">
                  Inspect immutable historical activity, personnel actions, and system transactions.
                </p>
              </div>
            </div>

            {fetchError && (
              <div className="FDAAdminFieldError" style={{ marginBottom: '12px' }}>
                {fetchError}
              </div>
            )}

            <div className="FDAAdminAuditTabsRow">
              <div className="FDAAdminAuditTabsWrapper">
                <button
                  className={`FDAAdminAuditTabBtn ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => switchTab('admin')}
                >
                  Regional Admin Activity
                  <span className="FDAAdminAuditTabBadge">{adminRows.length}</span>
                </button>
                <button
                  className={`FDAAdminAuditTabBtn ${activeTab === 'personnel' ? 'active' : ''}`}
                  onClick={() => switchTab('personnel')}
                >
                  Personnel Activity
                  <span className="FDAAdminAuditTabBadge">{personnelRows.length}</span>
                </button>
                <button
                  className={`FDAAdminAuditTabBtn ${activeTab === 'system' ? 'active' : ''}`}
                  onClick={() => switchTab('system')}
                >
                  System Events
                  <span className="FDAAdminAuditTabBadge">{systemRows.length}</span>
                </button>
              </div>
            </div>

            <div className="FDAAdminFiltersContainer">
              <div className="FDAAdminSearchGroup">
                <Search size={16} className="FDAAdminSearchIcon" />
                <input
                  type="text"
                  className="FDAAdminSearchInput"
                  placeholder="Search user, action, target table..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="FDAAdminFilterControls">
                <div className="FDAAdminFilterItem">
                  <span className="FDAAdminFilterLabel">Action:</span>
                  <select
                    className="FDAAdminSelect"
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

                <div className="FDAAdminFilterItem">
                  <span className="FDAAdminFilterLabel">From:</span>
                  <input
                    type="date"
                    className="FDAAdminSelect"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <div className="FDAAdminFilterItem">
                  <span className="FDAAdminFilterLabel">To:</span>
                  <input
                    type="date"
                    className="FDAAdminSelect"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {(searchQuery || actionFilter !== 'All' || dateFrom || dateTo) && (
                  <button
                    className="FDAAdminClearBtn"
                    title="Clear Filters"
                    onClick={() => {
                      setSearchQuery('');
                      setActionFilter('All');
                      setDateFrom('');
                      setDateTo('');
                      setCurrentPage(1);
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="FDAAdminTableWrapper">
              <table className="FDAAdminTable">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Agency</th>
                    <th>Region</th>
                    <th>Action</th>
                    <th>Target Table</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="FDAAdminEmpty">Loading audit logs…</td>
                    </tr>
                  ) : displayedLogs.length > 0 ? (
                    displayedLogs.map((log) => (
                      <tr key={log.log_id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px' }}>{formatTimestamp(log.timestamp)}</td>
                        <td>
                          <strong>{log.user_name || log.user_email || 'System Worker'}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{humanizeRole(log.user_role)}</div>
                        </td>
                        <td>
                          <span
                            className={`FDAAdminStatusBadge ${
                              log.agency === 'FDA' ? 'badge-agency-fda' : 'badge-agency-system'
                            }`}
                          >
                            {log.agency}
                          </span>
                        </td>
                        <td>{log.region_code || '—'}</td>
                        <td>
                          <ActionBadge action={log.action} />
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12.5px' }}>
                          {log.target_table}
                          {log.target_reference && (
                            <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                              ({log.target_reference})
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="FDAAdminPageBtn"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setSelectedLog(log)}
                          >
                            <Info size={14} /> Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="FDAAdminEmpty">
                        No audit logs recorded for the selected scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {!loading && totalItems > 0 && (
                <div className="FDAAdminPaginationWrapper">
                  <span className="FDAAdminPaginationInfo">
                    Showing {startIndex + 1}–{endIndex} of {totalItems} audit logs
                  </span>
                  <div className="FDAAdminPaginationControls">
                    <button
                      className="FDAAdminPageBtn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`FDAAdminPageNumber ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="FDAAdminPageBtn"
                      disabled={currentPage === totalPages}
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

      {selectedLog && (
        <div className="FDAAdminModalOverlay">
          <div className="FDAAdminModal" style={{ maxWidth: '580px' }}>
            <div className="FDAAdminModalHeader">
              <h3 className="FDAAdminModalTitle">Audit Log Details</h3>
              <p className="FDAAdminModalSubtitle">
                Transaction ID: <code>{selectedLog.log_id}</code>
              </p>
              <button className="FDAAdminModalCloseBtn" onClick={() => setSelectedLog(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="FDAAdminModalBody">
              <div className="FDAAdminSummaryBox">
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Timestamp:</span>
                  <span className="FDAAdminSummaryValue">{formatTimestamp(selectedLog.timestamp)}</span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Actor:</span>
                  <span className="FDAAdminSummaryValue">
                    {selectedLog.user_name || selectedLog.user_email || 'Automated System Service'} ({humanizeRole(selectedLog.user_role)})
                  </span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Action Code:</span>
                  <span className="FDAAdminSummaryValue">
                    <ActionBadge action={selectedLog.action} />
                  </span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Target Table:</span>
                  <span className="FDAAdminSummaryValue">{selectedLog.target_table || '—'}</span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Target Reference:</span>
                  <span className="FDAAdminSummaryValue">{selectedLog.target_reference || '—'}</span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">IP Address:</span>
                  <span className="FDAAdminSummaryValue">{selectedLog.ip_address || '—'}</span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">User Agent:</span>
                  <span className="FDAAdminSummaryValue" style={{ fontSize: '11.5px' }}>
                    {selectedLog.user_agent || '—'}
                  </span>
                </div>
              </div>

              {selectedLog.old_value && (
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Previous State (Old Value):</label>
                  <pre style={{ background: '#f1f5f9', padding: '10px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto' }}>
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Modified State (New Value):</label>
                  <pre style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px', borderRadius: '8px', fontSize: '12px', overflowX: 'auto', color: '#065f46' }}>
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="FDAAdminModalFooter center-footer">
              <button className="FDAAdminConfirmBtn primary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}