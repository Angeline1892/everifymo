// desktopfrontend/src/pages/leaadminfolder/lea-admin-audit-logs.jsx
import './lea-admin-css.css';
import { useState } from 'react';
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

const MOCK_LEA_AUDIT_LOGS = [
  {
    log_id: 'lea-log-001',
    timestamp: '2026-07-15 15:45:20',
    user_name: 'Cardo Santos Dalisay',
    user_role: 'LEA Personnel',
    agency: 'LEA-CIDG',
    region: 'NCR',
    action_type: 'create',
    action_code: 'LOG_WALKIN_COMPLAINT',
    target_table: 'walkin_complaints',
    target_id: 'COMP-2026-0044',
    ip_address: '192.168.35.10',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: null,
    new_value: {
      complainant: 'Rodrigo B. Santos',
      product_reported: 'Counterfeit Antibiotic Ointment',
      batch_id: 'BATCH-FAKE-091',
      status: 'Open for Investigation',
    },
  },
  {
    log_id: 'lea-log-002',
    timestamp: '2026-07-15 13:20:10',
    user_name: 'Dominic Cruz Valdez',
    user_role: 'LEA Admin',
    agency: 'LEA-CIDG',
    region: 'Region 3',
    action_type: 'update',
    action_code: 'DISPATCH_VERIFICATION_REQUEST',
    target_table: 'verification_requests',
    target_id: 'VR-2026-00045',
    ip_address: '192.168.22.45',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: { status: 'Draft', priority: 'standard' },
    new_value: { status: 'Sent to FDA', priority: 'high' },
  },
  {
    log_id: 'lea-log-003',
    timestamp: '2026-07-15 11:05:32',
    user_name: 'Ramon Alvarez Magsaysay',
    user_role: 'LEA Personnel',
    agency: 'LEA-CIDG',
    region: 'Region 7',
    action_type: 'create',
    action_code: 'CREATE_INTAKE_REPORT',
    target_table: 'intake_reports',
    target_id: 'INTK-2026-019',
    ip_address: '192.168.77.104',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    old_value: null,
    new_value: {
      location: 'Cebu Seaport Terminal 2',
      alleged_violation: 'Smuggled Unregistered Supplements',
      seizure_quantity: '45 cartons',
    },
  },
  {
    log_id: 'lea-log-004',
    timestamp: '2026-07-14 14:18:00',
    user_name: 'Dominic Cruz Valdez',
    user_role: 'LEA Admin',
    agency: 'LEA-CIDG',
    region: 'Region 3',
    action_type: 'update',
    action_code: 'UPDATE_OFFICER_STATUS',
    target_table: 'users',
    target_id: 'CIDG-REG6-2024-051',
    ip_address: '192.168.22.45',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    old_value: { status: 'Pending Approval' },
    new_value: { status: 'Active' },
  },
  {
    log_id: 'lea-log-005',
    timestamp: '2026-07-14 09:30:15',
    user_name: 'Marc Villanueva Tan',
    user_role: 'LEA Personnel',
    agency: 'LEA-CIDG',
    region: 'Region 6',
    action_type: 'login',
    action_code: 'USER_LOGIN_SUCCESS',
    target_table: 'sessions',
    target_id: 'SESS-LEA-4402',
    ip_address: '192.168.61.12',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    old_value: null,
    new_value: null,
  },
  {
    log_id: 'lea-log-006',
    timestamp: '2026-07-13 16:40:00',
    user_name: 'Renato Perez Soriano',
    user_role: 'LEA Admin',
    agency: 'LEA-CIDG',
    region: 'Region 11',
    action_type: 'delete',
    action_code: 'REMOVE_CANCELLED_COMPLAINT',
    target_table: 'walkin_complaints',
    target_id: 'COMP-2026-0012',
    ip_address: '192.168.91.14',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    old_value: { complaint_id: 'COMP-2026-0012', reason: 'Filed in Error by Complainant' },
    new_value: null,
  },
];

const MOCK_SYSTEM_AUDIT_LOGS = [
  {
    log_id: 'sys-log-101',
    timestamp: '2026-07-15 16:30:00',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'NCR',
    action_type: 'update',
    action_code: 'SYSTEM_INTAKE_INDEXING',
    target_table: 'case_indices',
    target_id: 'IDX-TASK-902',
    ip_address: '10.0.4.1',
    user_agent: 'EverifyMo-InternalScheduler/1.0',
    old_value: { indexed_cases: 890 },
    new_value: { indexed_cases: 896, newly_indexed: 6 },
  },
  {
    log_id: 'sys-log-102',
    timestamp: '2026-07-15 04:00:00',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'NCR',
    action_type: 'delete',
    action_code: 'EXPIRE_STALE_INVITATIONS',
    target_table: 'invitations',
    target_id: 'BATCH-EXP-02',
    ip_address: '10.0.4.1',
    user_agent: 'EverifyMo-InternalScheduler/1.0',
    old_value: { expired: 2 },
    new_value: { tokens_invalidated: 2 },
  },
  {
    log_id: 'sys-log-103',
    timestamp: '2026-07-14 23:59:59',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'NCR',
    action_type: 'update',
    action_code: 'DATABASE_BACKUP_SNAPSHOT',
    target_table: 'database_snapshots',
    target_id: 'SNAP-LEA-20260714',
    ip_address: '10.0.4.2',
    user_agent: 'PostgreSQL-Backup-Service',
    old_value: null,
    new_value: { snapshot_size: '1.2GB', verification: 'Valid' },
  },
  {
    log_id: 'sys-log-104',
    timestamp: '2026-07-13 14:22:00',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'Region 3',
    action_type: 'update',
    action_code: 'AUTO_DISMISS_INCOMPLETE_VERIFICATION',
    target_table: 'verification_requests',
    target_id: 'VR-2026-00041',
    ip_address: '10.0.4.18',
    user_agent: 'VerificationTimeoutWorker',
    old_value: { status: 'Pending Intake Verification' },
    new_value: { status: 'Auto-Dismissed', reason: 'SLA Exceeded' },
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

export default function LEAAdminAuditLogs() {
  const [activeTab, setActiveTab] = useState('LEA'); // Exactly 'LEA' | 'System' (NO FDA!)
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(8);

  // Active dataset according to tab
  const rawLogs = activeTab === 'LEA' ? MOCK_LEA_AUDIT_LOGS : MOCK_SYSTEM_AUDIT_LOGS;

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
    <div className="LEAAdminMainContainer">
      <Sidebar sidebarType="LEA_ADMIN" />
      <div className="LEAAdminContentContainer">
        <TopBar topbarType="LEA_ADMIN" />
        <div className="LEAAdminMainfeed">
          <div className="LEAAdminPageContainer">
            {/* Header */}
            <div className="LEAAdminPageHeader">
              <div className="LEAAdminPageTitleBlock">
                <h1 className="LEAAdminPageTitle">
                  <ScrollText size={24} color="#1d4ed8" />
                  LEA Audit Logs
                </h1>
                <p className="LEAAdminPageSubtitle">
                  Inspect immutable historical activity, CIDG officer actions, and system transactions.
                </p>
              </div>
            </div>

            {/* Exactly LEA | System Tabs (NO FDA) */}
            <div className="LEAAdminAuditTabsWrapper">
              <button
                className={`LEAAdminAuditTabBtn ${activeTab === 'LEA' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('LEA');
                  setCurrentPage(1);
                  setActionFilter('All');
                }}
              >
                LEA-CIDG Activity
                <span className="LEAAdminAuditTabBadge">{MOCK_LEA_AUDIT_LOGS.length}</span>
              </button>
              <button
                className={`LEAAdminAuditTabBtn ${activeTab === 'System' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('System');
                  setCurrentPage(1);
                  setActionFilter('All');
                }}
              >
                System Events
                <span className="LEAAdminAuditTabBadge">{MOCK_SYSTEM_AUDIT_LOGS.length}</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="LEAAdminFiltersContainer">
              <div className="LEAAdminSearchGroup">
                <Search size={16} className="LEAAdminSearchIcon" />
                <input
                  type="text"
                  className="LEAAdminSearchInput"
                  placeholder="Search officer, action, target table..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="LEAAdminFilterControls">
                <div className="LEAAdminFilterItem">
                  <span className="LEAAdminFilterLabel">Action:</span>
                  <select
                    className="LEAAdminSelect"
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

                <div className="LEAAdminFilterItem">
                  <span className="LEAAdminFilterLabel">From:</span>
                  <input
                    type="date"
                    className="LEAAdminSelect"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <div className="LEAAdminFilterItem">
                  <span className="LEAAdminFilterLabel">To:</span>
                  <input
                    type="date"
                    className="LEAAdminSelect"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {(searchQuery || actionFilter !== 'All' || dateFrom || dateTo) && (
                  <button
                    className="LEAAdminClearBtn"
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
            <div className="LEAAdminTableWrapper">
              <table className="LEAAdminTable">
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
                            className={`LEAAdminStatusBadge ${
                              log.agency === 'LEA-CIDG' ? 'badge-agency-lea' : 'badge-agency-system'
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
                            className="LEAAdminPageBtn"
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
                      <td colSpan={7} className="LEAAdminEmpty">
                        No audit logs recorded for the selected scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalItems > 0 && (
                <div className="LEAAdminPaginationWrapper">
                  <span className="LEAAdminPaginationInfo">
                    Showing {startIndex + 1}–{endIndex} of {totalItems} audit logs
                  </span>
                  <div className="LEAAdminPaginationControls">
                    <button
                      className="LEAAdminPageBtn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`LEAAdminPageNumber ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="LEAAdminPageBtn"
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
        <div className="LEAAdminModalOverlay">
          <div className="LEAAdminModal" style={{ maxWidth: '580px' }}>
            <div className="LEAAdminModalHeader">
              <h3 className="LEAAdminModalTitle">Audit Log Details</h3>
              <p className="LEAAdminModalSubtitle">
                Transaction ID: <code>{selectedLog.log_id}</code>
              </p>
              <button className="LEAAdminModalCloseBtn" onClick={() => setSelectedLog(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="LEAAdminModalBody">
              <div className="LEAAdminSummaryBox">
                <div className="LEAAdminSummaryRow">
                  <span className="LEAAdminSummaryLabel">Timestamp:</span>
                  <span className="LEAAdminSummaryValue">{selectedLog.timestamp}</span>
                </div>
                <div className="LEAAdminSummaryRow">
                  <span className="LEAAdminSummaryLabel">Actor:</span>
                  <span className="LEAAdminSummaryValue">
                    {selectedLog.user_name || 'Automated System Service'} ({selectedLog.user_role || 'System'})
                  </span>
                </div>
                <div className="LEAAdminSummaryRow">
                  <span className="LEAAdminSummaryLabel">Action Code:</span>
                  <span className="LEAAdminSummaryValue">
                    <ActionBadge
                      actionType={selectedLog.action_type}
                      actionCode={selectedLog.action_code}
                    />
                  </span>
                </div>
                <div className="LEAAdminSummaryRow">
                  <span className="LEAAdminSummaryLabel">Target Table:</span>
                  <span className="LEAAdminSummaryValue">{selectedLog.target_table}</span>
                </div>
                <div className="LEAAdminSummaryRow">
                  <span className="LEAAdminSummaryLabel">Target ID:</span>
                  <span className="LEAAdminSummaryValue">{selectedLog.target_id || '—'}</span>
                </div>
                <div className="LEAAdminSummaryRow">
                  <span className="LEAAdminSummaryLabel">IP Address:</span>
                  <span className="LEAAdminSummaryValue">{selectedLog.ip_address || '—'}</span>
                </div>
                <div className="LEAAdminSummaryRow">
                  <span className="LEAAdminSummaryLabel">User Agent:</span>
                  <span className="LEAAdminSummaryValue" style={{ fontSize: '11.5px' }}>
                    {selectedLog.user_agent || '—'}
                  </span>
                </div>
              </div>

              {/* Payload details */}
              {selectedLog.old_value && (
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Previous State (Old Value):</label>
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
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Modified State (New Value):</label>
                  <pre
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      overflowX: 'auto',
                      color: '#1e40af',
                    }}
                  >
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="LEAAdminModalFooter center-footer">
              <button className="LEAAdminConfirmBtn primary" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
