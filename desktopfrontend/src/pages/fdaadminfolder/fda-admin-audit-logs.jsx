// desktopfrontend/src/pages/fdaadminfolder/fda-admin-audit-logs.jsx
import './fda-admin-css.css';
import { useState } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  ScrollText,
  Calendar,
} from 'lucide-react';
import Sidebar from '../component/sidebar';
import TopBar from '../component/top-bar';

const MOCK_FDA_AUDIT_LOGS = [
  {
    log_id: 'fda-log-001',
    timestamp: '2026-07-15 15:32:10',
    user_name: 'Maria Clara Santos Cruz',
    user_role: 'FDA Personnel',
    agency: 'FDA',
    region: 'NCR',
    action_type: 'create',
    action_code: 'CREATE_PRODUCT_RECORD',
    target_table: 'products',
    target_id: 'PROD-2026-0941',
    ip_address: '192.168.1.105',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: null,
    new_value: {
      product_name: 'DermaGlow Restorative Cream',
      registration_no: 'FR-400000941',
      classification: 'Cosmetics',
      status: 'Active',
      manufacturer: 'BioDerma Labs Philippines Inc.',
    },
  },
  {
    log_id: 'fda-log-002',
    timestamp: '2026-07-15 14:15:45',
    user_name: 'Gabriel Jose Alvarez',
    user_role: 'FDA Admin',
    agency: 'FDA',
    region: 'NCR',
    action_type: 'update',
    action_code: 'UPDATE_PERSONNEL_STATUS',
    target_table: 'users',
    target_id: 'FDA-REG3-2024-042',
    ip_address: '192.168.1.14',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: { status: 'Pending Approval' },
    new_value: { status: 'Active' },
  },
  {
    log_id: 'fda-log-003',
    timestamp: '2026-07-15 11:20:00',
    user_name: 'Juan Reyes Dela Cruz',
    user_role: 'FDA Personnel',
    agency: 'FDA',
    region: 'Region 3',
    action_type: 'update',
    action_code: 'VERIFY_PRODUCT_APPLICATION',
    target_table: 'verification_requests',
    target_id: 'VR-2026-00881',
    ip_address: '192.168.24.18',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0',
    old_value: { verification_status: 'In Review' },
    new_value: { verification_status: 'Verified Valid' },
  },
  {
    log_id: 'fda-log-004',
    timestamp: '2026-07-14 16:45:12',
    user_name: 'Gabriel Jose Alvarez',
    user_role: 'FDA Admin',
    agency: 'FDA',
    region: 'NCR',
    action_type: 'create',
    action_code: 'PROVISION_PERSONNEL_ACCOUNT',
    target_table: 'users',
    target_id: 'FDA-NCR-2026-091',
    ip_address: '192.168.1.14',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: null,
    new_value: {
      fullname: 'Danilo Perez Ramos',
      email: 'danilo.ramos@fda.gov.ph',
      agency: 'FDA Personnel',
      status: 'Active',
    },
  },
  {
    log_id: 'fda-log-005',
    timestamp: '2026-07-14 10:12:30',
    user_name: 'Elena Villanueva Bautista',
    user_role: 'FDA Personnel',
    agency: 'FDA',
    region: 'NCR',
    action_type: 'login',
    action_code: 'USER_LOGIN_SUCCESS',
    target_table: 'sessions',
    target_id: 'SESS-FDA-9901',
    ip_address: '192.168.1.88',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    old_value: null,
    new_value: null,
  },
  {
    log_id: 'fda-log-006',
    timestamp: '2026-07-13 17:05:00',
    user_name: 'Lourdes Santos Magsaysay',
    user_role: 'FDA Admin',
    agency: 'FDA',
    region: 'Region 7',
    action_type: 'delete',
    action_code: 'DELETE_EXPIRED_DRAFT',
    target_table: 'saved_drafts',
    target_id: 'DRAFT-2026-0012',
    ip_address: '192.168.70.12',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    old_value: { draft_id: 'DRAFT-2026-0012', title: 'Cosmetics Compliance Inspection Notice' },
    new_value: null,
  },
];

const MOCK_SYSTEM_AUDIT_LOGS = [
  {
    log_id: 'sys-log-001',
    timestamp: '2026-07-15 16:00:00',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'NCR',
    action_type: 'update',
    action_code: 'SYSTEM_AUTOMATED_SYNC',
    target_table: 'product_catalog',
    target_id: 'SYNC-TASK-771',
    ip_address: '10.0.0.1',
    user_agent: 'EverifyMo-InternalScheduler/1.0',
    old_value: { last_sync: '2026-07-14 16:00:00', records_checked: 1420 },
    new_value: { last_sync: '2026-07-15 16:00:00', records_checked: 1428, updated: 8 },
  },
  {
    log_id: 'sys-log-002',
    timestamp: '2026-07-15 03:00:00',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'NCR',
    action_type: 'delete',
    action_code: 'PURGE_EXPIRED_INVITATIONS',
    target_table: 'invitations',
    target_id: 'BATCH-PURGE-08',
    ip_address: '10.0.0.1',
    user_agent: 'EverifyMo-InternalScheduler/1.0',
    old_value: { expired_tokens: 3 },
    new_value: { status: 'Purged', tokens_revoked: 3 },
  },
  {
    log_id: 'sys-log-003',
    timestamp: '2026-07-14 23:59:59',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'NCR',
    action_type: 'update',
    action_code: 'DATABASE_BACKUP_SNAPSHOT',
    target_table: 'database_snapshots',
    target_id: 'SNAP-20260714',
    ip_address: '10.0.0.2',
    user_agent: 'PostgreSQL-Backup-Service',
    old_value: null,
    new_value: { snapshot_size: '1.4GB', checksum: 'sha256-8a9d18e9...' },
  },
  {
    log_id: 'sys-log-004',
    timestamp: '2026-07-13 12:00:00',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'Region 3',
    action_type: 'update',
    action_code: 'AUTO_LOCK_INACTIVE_SESSION',
    target_table: 'sessions',
    target_id: 'SESS-AUTO-881',
    ip_address: '10.0.4.18',
    user_agent: 'SessionSecurityWorker',
    old_value: { session_state: 'Idle (30m)' },
    new_value: { session_state: 'Terminated', reason: 'Inactivity Timeout' },
  },
];

function ActionBadge({ actionType, actionCode }) {
  const badgeClass =
    actionType === 'create'
      ? 'badge-action-create'
      : actionType === 'update'
      ? 'badge-action-update'
      : actionType === 'delete'
      ? 'badge-action-delete'
      : 'badge-action-neutral';

  return <span className={badgeClass}>{actionCode || actionType}</span>;
}

export default function FDAAdminAuditLogs() {
  const [activeTab, setActiveTab] = useState('FDA'); // Exactly 'FDA' | 'System' (NO LEA!)
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(8);

  // Active dataset according to tab
  const rawLogs = activeTab === 'FDA' ? MOCK_FDA_AUDIT_LOGS : MOCK_SYSTEM_AUDIT_LOGS;

  const filteredLogs = rawLogs.filter((log) => {
    const matchesAction = actionFilter === 'All' ? true : log.action_type === actionFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (log.user_name && log.user_name.toLowerCase().includes(q)) ||
      (log.action_code && log.action_code.toLowerCase().includes(q)) ||
      (log.target_table && log.target_table.toLowerCase().includes(q)) ||
      (log.target_id && log.target_id.toLowerCase().includes(q));

    const logDate = log.timestamp.split(' ')[0];
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

  return (
    <div className="FDAAdminMainContainer">
      <Sidebar sidebarType="FDA_ADMIN" />
      <div className="FDAAdminContentContainer">
        <TopBar topbarType="FDA_ADMIN" />
        <div className="FDAAdminMainfeed">
          <div className="FDAAdminPageContainer">
            {/* Header */}
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

            {/* Exactly FDA | System Tabs (NO LEA) */}
            <div className="FDAAdminAuditTabsWrapper">
              <button
                className={`FDAAdminAuditTabBtn ${activeTab === 'FDA' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('FDA');
                  setCurrentPage(1);
                  setActionFilter('All');
                }}
              >
                FDA Activity
                <span className="FDAAdminAuditTabBadge">{MOCK_FDA_AUDIT_LOGS.length}</span>
              </button>
              <button
                className={`FDAAdminAuditTabBtn ${activeTab === 'System' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('System');
                  setCurrentPage(1);
                  setActionFilter('All');
                }}
              >
                System Events
                <span className="FDAAdminAuditTabBadge">{MOCK_SYSTEM_AUDIT_LOGS.length}</span>
              </button>
            </div>

            {/* Filter Bar */}
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
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="login">Login / Session</option>
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

            {/* Table */}
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
                  {displayedLogs.length > 0 ? (
                    displayedLogs.map((log) => (
                      <tr key={log.log_id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px' }}>{log.timestamp}</td>
                        <td>
                          <strong>{log.user_name || 'System Worker'}</strong>
                          {log.user_role && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{log.user_role}</div>
                          )}
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
                        <td>{log.region || '—'}</td>
                        <td>
                          <ActionBadge actionType={log.action_type} actionCode={log.action_code} />
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12.5px' }}>
                          {log.target_table}
                          {log.target_id && (
                            <span style={{ color: '#94a3b8', marginLeft: '6px' }}>
                              ({log.target_id})
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

              {totalItems > 0 && (
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

      {/* Audit Detail Modal */}
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
                  <span className="FDAAdminSummaryValue">{selectedLog.timestamp}</span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Actor:</span>
                  <span className="FDAAdminSummaryValue">
                    {selectedLog.user_name || 'Automated System Service'} ({selectedLog.user_role || 'System'})
                  </span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Action Code:</span>
                  <span className="FDAAdminSummaryValue">
                    <ActionBadge
                      actionType={selectedLog.action_type}
                      actionCode={selectedLog.action_code}
                    />
                  </span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Target Table:</span>
                  <span className="FDAAdminSummaryValue">{selectedLog.target_table}</span>
                </div>
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Target ID:</span>
                  <span className="FDAAdminSummaryValue">{selectedLog.target_id || '—'}</span>
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

              {/* Payload details */}
              {selectedLog.old_value && (
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Previous State (Old Value):</label>
                  <pre
                    style={{
                      background: '#f1f5f9',
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(selectedLog.old_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Modified State (New Value):</label>
                  <pre
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      overflowX: 'auto',
                      color: '#065f46',
                    }}
                  >
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
