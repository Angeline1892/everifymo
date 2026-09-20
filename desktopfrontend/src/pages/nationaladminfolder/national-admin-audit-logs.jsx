// desktopfrontend/src/pages/nationaladminfolder/national-admin-audit-logs.jsx
import './national-admin-css.css';
import { useState, useMemo } from 'react';
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

// ── Mock Audit Log Data (Frontend-Only Dataset) ──
const MOCK_NATIONAL_ADMIN_AUDIT_LOGS = [
  // National Admin Scope
  {
    log_id: 'nam-log-001',
    timestamp: '2026-07-16 10:14:32',
    user_name: 'Kristine National Admin',
    user_role: 'National Admin',
    agency: 'National Admin',
    region: 'NCR',
    action_type: 'create',
    action_code: 'INVITE_INTERAGENCY_ADMIN',
    target_table: 'invitations',
    target_id: 'INV-2026-081',
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: null,
    new_value: {
      recipient_name: 'Col. Roberto S. Morales',
      recipient_email: 'roberto.morales@cidg.gov.ph',
      agency: 'LEA-CIDG',
      region: 'Region 7',
      department: 'Special Operations Unit',
      status: 'Invited',
    },
  },
  {
    log_id: 'nam-log-002',
    timestamp: '2026-07-16 09:22:15',
    user_name: 'Kristine National Admin',
    user_role: 'National Admin',
    agency: 'National Admin',
    region: 'NCR',
    action_type: 'update',
    action_code: 'APPROVE_ADMIN_REGISTRATION',
    target_table: 'users',
    target_id: 'FDA-REG3-ADM-004',
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: { status: 'Pending Approval', is_active: false },
    new_value: { status: 'Active', is_active: true, approved_at: '2026-07-16 09:22:15' },
  },
  {
    log_id: 'nam-log-003',
    timestamp: '2026-07-15 17:40:10',
    user_name: 'Kristine National Admin',
    user_role: 'National Admin',
    agency: 'National Admin',
    region: 'NCR',
    action_type: 'security',
    action_code: 'ENFORCE_INTERAGENCY_MFA',
    target_table: 'system_security_policies',
    target_id: 'SEC-POL-MFA-002',
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: { mfa_required_for_fda: false, mfa_required_for_lea: false },
    new_value: { mfa_required_for_fda: true, mfa_required_for_lea: true, grace_period_days: 7 },
  },
  {
    log_id: 'nam-log-004',
    timestamp: '2026-07-15 16:05:44',
    user_name: 'Kristine National Admin',
    user_role: 'National Admin',
    agency: 'National Admin',
    region: 'NCR',
    action_type: 'update',
    action_code: 'LOCK_ADMIN_ACCOUNT',
    target_table: 'users',
    target_id: 'CIDG-REG3-ADM-002',
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: { is_locked: false, status: 'Active' },
    new_value: { is_locked: true, status: 'Locked', lock_reason: 'Consecutive failed MFA attempts' },
  },
  {
    log_id: 'nam-log-005',
    timestamp: '2026-07-15 08:30:00',
    user_name: 'Kristine National Admin',
    user_role: 'National Admin',
    agency: 'National Admin',
    region: 'NCR',
    action_type: 'login',
    action_code: 'USER_LOGIN_SUCCESS',
    target_table: 'sessions',
    target_id: 'SESS-NAT-0912',
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EverifyMoDesktop/2.0',
    old_value: null,
    new_value: { session_type: 'Desktop Electron Application', auth_method: 'Email + OTP' },
  },

  // Inter-Agency FDA Operations
  {
    log_id: 'nam-log-006',
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
    log_id: 'nam-log-007',
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
    log_id: 'nam-log-008',
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
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    old_value: { verification_status: 'In Review' },
    new_value: { verification_status: 'Verified Valid', reviewer_notes: 'Compliance documents certified' },
  },
  {
    log_id: 'nam-log-009',
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
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    old_value: null,
    new_value: {
      fullname: 'Danilo Perez Ramos',
      email: 'danilo.ramos@fda.gov.ph',
      agency: 'FDA',
      status: 'Active',
    },
  },

  // Inter-Agency LEA-CIDG Operations
  {
    log_id: 'nam-log-010',
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
    log_id: 'nam-log-011',
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
    new_value: { status: 'Sent to FDA', priority: 'high', notes: 'Cross-regional inspection underway' },
  },
  {
    log_id: 'nam-log-012',
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
    log_id: 'nam-log-013',
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

  // System & Automated Operations
  {
    log_id: 'nam-log-014',
    timestamp: '2026-07-15 16:30:00',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'All Regions',
    action_type: 'update',
    action_code: 'SYSTEM_INTAKE_INDEXING',
    target_table: 'case_indices',
    target_id: 'IDX-TASK-902',
    ip_address: '10.0.4.1',
    user_agent: 'EverifyMo-InternalScheduler/1.0',
    old_value: { indexed_cases: 890 },
    new_value: { indexed_cases: 896, newly_indexed: 6, execution_time_ms: 240 },
  },
  {
    log_id: 'nam-log-015',
    timestamp: '2026-07-15 04:00:00',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'All Regions',
    action_type: 'delete',
    action_code: 'EXPIRE_STALE_INVITATIONS',
    target_table: 'invitations',
    target_id: 'BATCH-EXP-02',
    ip_address: '10.0.4.1',
    user_agent: 'EverifyMo-InternalScheduler/1.0',
    old_value: { active_invitations: 14, expired: 2 },
    new_value: { tokens_invalidated: 2, notified_admins: 2 },
  },
  {
    log_id: 'nam-log-016',
    timestamp: '2026-07-14 23:59:59',
    user_name: null,
    user_role: 'system',
    agency: 'System',
    region: 'All Regions',
    action_type: 'update',
    action_code: 'DATABASE_BACKUP_SNAPSHOT',
    target_table: 'database_snapshots',
    target_id: 'SNAP-NAT-20260714',
    ip_address: '10.0.4.2',
    user_agent: 'PostgreSQL-Backup-Service',
    old_value: null,
    new_value: { snapshot_size: '2.6GB', checksum: 'sha256-f8a1299c...', verification: 'Valid' },
  },
  {
    log_id: 'nam-log-017',
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
    new_value: { status: 'Auto-Dismissed', reason: 'SLA Exceeded (> 30 business days)' },
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
      : actionType === 'security'
      ? 'badge-action-security'
      : 'badge-action-neutral';

  return <span className={badgeClass}>{actionCode || actionType}</span>;
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(8);

  // Tab counts based on unfiltered mock logs
  const tabCounts = useMemo(() => {
    return {
      National: MOCK_NATIONAL_ADMIN_AUDIT_LOGS.filter((l) => l.agency === 'National Admin').length,
      FDA: MOCK_NATIONAL_ADMIN_AUDIT_LOGS.filter((l) => l.agency === 'FDA').length,
      LEA: MOCK_NATIONAL_ADMIN_AUDIT_LOGS.filter((l) => l.agency === 'LEA-CIDG').length,
      System: MOCK_NATIONAL_ADMIN_AUDIT_LOGS.filter((l) => l.agency === 'System').length,
    };
  }, []);

  // Filter logs according to tab, search query, dropdown filters, and date range
  const filteredLogs = useMemo(() => {
    return MOCK_NATIONAL_ADMIN_AUDIT_LOGS.filter((log) => {
      // 1. Tab Scope
      if (activeTab === 'National' && log.agency !== 'National Admin') return false;
      if (activeTab === 'FDA' && log.agency !== 'FDA') return false;
      if (activeTab === 'LEA' && log.agency !== 'LEA-CIDG') return false;
      if (activeTab === 'System' && log.agency !== 'System') return false;

      // 2. Action Filter
      if (actionFilter !== 'All' && log.action_type !== actionFilter) return false;

      // 3. Region Filter (FDA Admin and LEA Admin tabs only)
      if ((activeTab === 'FDA' || activeTab === 'LEA') && regionFilter !== 'All' && log.region !== regionFilter) {
        return false;
      }

      // 4. Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          (log.user_name && log.user_name.toLowerCase().includes(q)) ||
          (log.action_code && log.action_code.toLowerCase().includes(q)) ||
          (log.target_table && log.target_table.toLowerCase().includes(q)) ||
          (log.target_id && log.target_id.toLowerCase().includes(q)) ||
          (log.region && log.region.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // 5. Date Range
      const logDate = log.timestamp.split(' ')[0];
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo && logDate > dateTo) return false;

      return true;
    });
  }, [activeTab, searchQuery, actionFilter, regionFilter, dateFrom, dateTo]);

  // Pagination calculation
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
    dateFrom !== '' ||
    dateTo !== '';

  function handleResetFilters() {
    setSearchQuery('');
    setActionFilter('All');
    setRegionFilter('All');
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

            {/* Scope Tabs */}
            <div className="NAMAuditTabsRow">
              <div className="NAMAuditTabsWrapper">
                <button
                  className={`NAMAuditTabBtn ${activeTab === 'National' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('National');
                    setRegionFilter('All');
                    setCurrentPage(1);
                  }}
                >
                  National Admin
                  <span className="NAMAuditTabBadge">{tabCounts.National}</span>
                </button>
                <button
                  className={`NAMAuditTabBtn ${activeTab === 'FDA' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('FDA');
                    setRegionFilter('All');
                    setCurrentPage(1);
                  }}
                >
                  FDA Admin
                  <span className="NAMAuditTabBadge">{tabCounts.FDA}</span>
                </button>
                <button
                  className={`NAMAuditTabBtn ${activeTab === 'LEA' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('LEA');
                    setRegionFilter('All');
                    setCurrentPage(1);
                  }}
                >
                  LEA Admin
                  <span className="NAMAuditTabBadge">{tabCounts.LEA}</span>
                </button>
                <button
                  className={`NAMAuditTabBtn ${activeTab === 'System' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('System');
                    setRegionFilter('All');
                    setCurrentPage(1);
                  }}
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
                  placeholder="Search by actor, action code, table, or ID..."
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
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="security">Security / Config</option>
                    <option value="login">Login / Session</option>
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
                  {displayedLogs.length > 0 ? (
                    displayedLogs.map((log, idx) => (
                      <tr key={log.log_id}>
                        <td className="NAMTdCenter">{startIndex + idx + 1}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12.5px', fontFamily: 'monospace' }}>
                          {log.timestamp}
                        </td>
                        <td>
                          <strong>{log.user_name || 'System Worker'}</strong>
                          {log.user_role && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{log.user_role}</div>
                          )}
                        </td>
                        <td>
                          <AgencyBadge agency={log.agency} />
                        </td>
                        {activeTab !== 'National' && <td>{log.region || '—'}</td>}
                        <td>
                          <ActionBadge actionType={log.action_type} actionCode={log.action_code} />
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12.5px' }}>
                          {log.target_table}
                          {log.target_id && (
                            <span style={{ color: '#0D9488', marginLeft: '6px', fontWeight: 600 }}>
                              ({log.target_id})
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
              {totalItems > 0 && (
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
                  <span className="NAMAuditSummaryLabel">Timestamp:</span>
                  <span className="NAMAuditSummaryValue">{selectedLog.timestamp}</span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Actor / Role:</span>
                  <span className="NAMAuditSummaryValue">
                    {selectedLog.user_name || 'Automated System Service'} ({selectedLog.user_role})
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Agency / Region:</span>
                  <span className="NAMAuditSummaryValue">
                    <AgencyBadge agency={selectedLog.agency} />
                    <span style={{ marginLeft: '8px', color: '#64748b' }}>({selectedLog.region || 'National'})</span>
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Action Code:</span>
                  <span className="NAMAuditSummaryValue">
                    <ActionBadge
                      actionType={selectedLog.action_type}
                      actionCode={selectedLog.action_code}
                    />
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Target Table:</span>
                  <span className="NAMAuditSummaryValue" style={{ fontFamily: 'monospace' }}>
                    {selectedLog.target_table}
                  </span>
                </div>
                <div className="NAMAuditSummaryRow">
                  <span className="NAMAuditSummaryLabel">Target Record ID:</span>
                  <span className="NAMAuditSummaryValue" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0D9488' }}>
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
