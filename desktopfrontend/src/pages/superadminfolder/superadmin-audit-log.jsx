// desktopfrontend/src/pages/superadminfolder/superadmin-audit-logs.jsx
import './superadmin-css.css';
import { useState, useEffect } from 'react';
import Sidebar from '../component/sidebar';
import TopBar from '../component/top-bar';
import { Search, Calendar, X, ChevronLeft, ChevronRight, Info, History } from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';

// TODO(backend): user/region display names - These need to come pre-joined from the API, not resolved client-side.
// NOTE: mock data still powers LEA-CIDG / Superadmin / System tabs until those backend endpoints exist.
const MOCK_AUDIT_LOGS = [
  {
    log_id: 1,
    timestamp: "2026-07-10 14:05:22",
    user_id: 1,
    user_name: "Maria Santos",
    user_role: "FDA Admin",
    region: "NCR",
    action_type: "create",
    target_table: "products",
    target_id: "PROD-2026-00912",
    ip_address: "192.168.1.105",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: null,
    new_value: { product_name: "BioGlow Serum", registration_no: "FR-400000123", status: "Active", manufacturer: "BioGlow Cosmetics Inc." }
  },
  {
    log_id: 2,
    timestamp: "2026-07-10 13:48:10",
    user_id: 2,
    user_name: "Jose Reyes",
    user_role: "LEA Admin",
    region: "Region 3",
    action_type: "update",
    target_table: "verification_requests",
    target_id: "VR-2026-00045",
    ip_address: "192.168.22.45",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    old_value: { status: "Draft", priority: "standard" },
    new_value: { status: "Sent", priority: "high" }
  },
  {
    log_id: 3,
    timestamp: "2026-07-10 12:15:00",
    user_id: null,
    user_name: null,
    user_role: null,
    region: null,
    action_type: "update",
    target_table: "verification_requests",
    target_id: "VR-2026-00041",
    ip_address: "10.0.4.18",
    user_agent: null,
    old_value: { status: "Pending Verification" },
    new_value: { status: "Auto-Dismissed" }
  },
  {
    log_id: 4,
    timestamp: "2026-07-10 11:30:15",
    user_id: 3,
    user_name: "Admin Kristine",
    user_role: "Superadmin",
    region: "NCR",
    action_type: "create",
    target_table: "users",
    target_id: "EMP-009",
    ip_address: "124.83.120.4",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    old_value: null,
    new_value: { fullname: "Cardo Dalisay", email: "cardo.dalisay@cidg.gov.ph", agency: "LEA-CIDG", region: "Region 4A", status: "Pending" }
  },
  {
    log_id: 5,
    timestamp: "2026-07-10 10:02:44",
    user_id: 3,
    user_name: "Admin Kristine",
    user_role: "Superadmin",
    region: "NCR",
    action_type: "login",
    target_table: "sessions",
    target_id: "SESS-88123A",
    ip_address: "124.83.120.4",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: null,
    new_value: null
  },
  {
    log_id: 6,
    timestamp: "2026-07-09 16:55:30",
    user_id: 1,
    user_name: "Maria Santos",
    user_role: "FDA Admin",
    region: "NCR",
    action_type: "delete",
    target_table: "products",
    target_id: "PROD-2025-00112",
    ip_address: "192.168.1.105",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { product_name: "Expired Herbal Slim", status: "Registered" },
    new_value: null
  },
  {
    log_id: 7,
    timestamp: "2026-07-09 15:40:12",
    user_id: 5,
    user_name: "Juan Dela Cruz",
    user_role: "FDA Personnel",
    region: "Region 1",
    action_type: "update",
    target_table: "products",
    target_id: "PROD-2026-00445",
    ip_address: "192.168.4.12",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { status: "Under Review" },
    new_value: { status: "Registered" }
  },
  {
    log_id: 8,
    timestamp: "2026-07-09 14:12:00",
    user_id: 6,
    user_name: "Ramon Magsaysay",
    user_role: "LEA Personnel",
    region: "Region 7",
    action_type: "create",
    target_table: "walkin_complaints",
    target_id: "COMP-2026-0011",
    ip_address: "192.168.35.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: null,
    new_value: { complainant: "B. Aquino", product_name: "Fake Toothpaste", description: "Purchased from sidewalk vendor, caused gum irritation." }
  },
  {
    log_id: 9,
    timestamp: "2026-07-09 10:05:00",
    user_id: 3,
    user_name: "Admin Kristine",
    user_role: "Superadmin",
    region: "NCR",
    action_type: "update",
    target_table: "users",
    target_id: "EMP-002",
    ip_address: "124.83.120.4",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { status: "Active" },
    new_value: { status: "Suspended" }
  },
  {
    log_id: 10,
    timestamp: "2026-07-08 17:22:45",
    user_id: null,
    user_name: null,
    user_role: null,
    region: null,
    action_type: "login",
    target_table: "sessions",
    target_id: "SESS-FAILED-99",
    ip_address: "203.111.45.8",
    user_agent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    old_value: null,
    new_value: { status: "Failed Login Attempt", details: "Invalid credentials for email admin@fda.gov.ph" }
  },
  {
    log_id: 11,
    timestamp: "2026-07-08 13:02:11",
    user_id: 5,
    user_name: "Juan Dela Cruz",
    user_role: "FDA Personnel",
    region: "Region 1",
    action_type: "create",
    target_table: "products",
    target_id: "PROD-2026-00445",
    ip_address: "192.168.4.12",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: null,
    new_value: { product_name: "Healthy Herbal Capsule", manufacturer: "Pure Organics", registration_no: "PENDING" }
  },
  {
    log_id: 12,
    timestamp: "2026-07-08 11:45:00",
    user_id: 2,
    user_name: "Jose Reyes",
    user_role: "LEA Admin",
    region: "Region 3",
    action_type: "delete",
    target_table: "walkin_complaints",
    target_id: "COMP-2025-0902",
    ip_address: "192.168.22.45",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { complainant: "Anonymous", product_name: "Unknown Brand Soap" },
    new_value: null
  },
  {
    log_id: 13,
    timestamp: "2026-07-08 09:12:30",
    user_id: 6,
    user_name: "Ramon Magsaysay",
    user_role: "LEA Personnel",
    region: "Region 7",
    action_type: "login",
    target_table: "sessions",
    target_id: "SESS-RAMON-101",
    ip_address: "192.168.35.10",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: null,
    new_value: null
  },
  {
    log_id: 14,
    timestamp: "2026-07-07 16:30:00",
    user_id: 1,
    user_name: "Maria Santos",
    user_role: "FDA Admin",
    region: "NCR",
    action_type: "update",
    target_table: "products",
    target_id: "PROD-2026-00045",
    ip_address: "192.168.1.105",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { status: "Active" },
    new_value: { status: "Suspended", reason: "Safety recall alert" }
  },
  {
    log_id: 15,
    timestamp: "2026-07-07 14:15:22",
    user_id: 3,
    user_name: "Admin Kristine",
    user_role: "Superadmin",
    region: "NCR",
    action_type: "create",
    target_table: "users",
    target_id: "EMP-008",
    ip_address: "124.83.120.4",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: null,
    new_value: { fullname: "Ramon Magsaysay", email: "ramon.magsaysay@cidg.gov.ph", agency: "LEA-CIDG", region: "Region 7", status: "Active" }
  },
  {
    log_id: 16,
    timestamp: "2026-07-07 10:10:00",
    user_id: null,
    user_name: null,
    user_role: null,
    region: null,
    action_type: "update",
    target_table: "system_settings",
    target_id: "SETT-MAX-ATTEMPTS",
    ip_address: "127.0.0.1",
    user_agent: null,
    old_value: { value: "3" },
    new_value: { value: "5" }
  },
  {
    log_id: 17,
    timestamp: "2026-07-06 15:45:10",
    user_id: 7,
    user_name: "Clara Recto",
    user_role: "FDA Personnel",
    region: "Region 4A",
    action_type: "login",
    target_table: "sessions",
    target_id: "SESS-CLARA-88",
    ip_address: "192.168.12.89",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: null,
    new_value: null
  },
  {
    log_id: 18,
    timestamp: "2026-07-06 11:22:33",
    user_id: 7,
    user_name: "Clara Recto",
    user_role: "FDA Personnel",
    region: "Region 4A",
    action_type: "update",
    target_table: "products",
    target_id: "PROD-2025-00998",
    ip_address: "192.168.12.89",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { product_name: "VitC Glow Tablet", status: "Expired" },
    new_value: { product_name: "VitC Glow Tablet", status: "Renewed" }
  },
  {
    log_id: 19,
    timestamp: "2026-07-06 09:30:00",
    user_id: 2,
    user_name: "Jose Reyes",
    user_role: "LEA Admin",
    region: "Region 3",
    action_type: "update",
    target_table: "users",
    target_id: "EMP-002",
    ip_address: "192.168.22.45",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { fullname: "Jose A. Reyes", contactno: "" },
    new_value: { fullname: "Jose Reyes Jr.", contactno: "09281234567" }
  },
  {
    log_id: 20,
    timestamp: "2026-07-05 16:50:11",
    user_id: 3,
    user_name: "Admin Kristine",
    user_role: "Superadmin",
    region: "NCR",
    action_type: "update",
    target_table: "system_config",
    target_id: "CFG-MAINTENANCE-MODE",
    ip_address: "124.83.120.4",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { active: true },
    new_value: { active: false }
  },
  {
    log_id: 21,
    timestamp: "2026-07-05 13:10:00",
    user_id: 8,
    user_name: "Andres Bonifacio",
    user_role: "LEA Personnel",
    region: "NIR",
    action_type: "create",
    target_table: "verification_requests",
    target_id: "VR-2026-00088",
    ip_address: "192.168.88.19",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: null,
    new_value: { complainant: "A. Bonifacio", product_code: "P-882", reason: "Suspected adulteration" }
  },
  {
    log_id: 22,
    timestamp: "2026-07-05 10:05:00",
    user_id: 8,
    user_name: "Andres Bonifacio",
    user_role: "LEA Personnel",
    region: "NIR",
    action_type: "login",
    target_table: "sessions",
    target_id: "SESS-ANDRES-77",
    ip_address: "192.168.88.19",
    user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    old_value: null,
    new_value: null
  },
  {
    log_id: 23,
    timestamp: "2026-07-04 16:15:30",
    user_id: 1,
    user_name: "Maria Santos",
    user_role: "FDA Admin",
    region: "NCR",
    action_type: "update",
    target_table: "products",
    target_id: "PROD-2025-00122",
    ip_address: "192.168.1.105",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { status: "Pending Registration" },
    new_value: { status: "Registered" }
  },
  {
    log_id: 24,
    timestamp: "2026-07-04 14:00:22",
    user_id: 3,
    user_name: "Admin Kristine",
    user_role: "Superadmin",
    region: "NCR",
    action_type: "update",
    target_table: "users",
    target_id: "EMP-003",
    ip_address: "124.83.120.4",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    old_value: { status: "Pending" },
    new_value: { status: "For Activation" }
  },
  {
    log_id: 25,
    timestamp: "2026-07-04 09:15:40",
    user_id: null,
    user_name: null,
    user_role: null,
    region: null,
    action_type: "delete",
    target_table: "sessions",
    target_id: "SESS-EXP-110",
    ip_address: "127.0.0.1",
    user_agent: null,
    old_value: { session_id: "SESS-EXP-110", expiry: "2026-07-04 09:00:00" },
    new_value: null
  }
];

const REGION_OPTIONS = [
  'NCR', 'CAR', 'Region 1', 'Region 2', 'Region 3', 'Region 4A', 'MIMAROPA', 
  'Region 5', 'Region 6', 'Region 7', 'Region 8', 'NIR', 'Region 9', 
  'Region 10', 'Region 11', 'Region 12', 'Region 13', 'BARMM'
];

// Real region_code values seeded so far for the FDA backend (extend as more get seeded).
const FDA_REGION_OPTIONS = [
  { code: 'NCR', label: 'National Capital Region' },
  { code: 'RO3', label: 'Region 3 — Central Luzon' },
];

// Finalized FDA action codes. All except the three login/session ones are
// prefixed CREATE_/UPDATE_/DELETE_, so the category is derived from the prefix
// rather than hand-mapped one by one.
const FDA_ACTION_OPTIONS = [
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'UPDATE_COMPLAINT_STATUS',
  'UPDATE_VERIFICATION_STATUS',
  'CREATE_REGISTERED_PRODUCT',
  'UPDATE_REGISTERED_PRODUCT',
  'DELETE_REGISTERED_PRODUCT',
  'CONVERT_TO_REGISTERED_PRODUCT',
  'CREATE_UNREGISTERED_ADVISORY',
  'UPDATE_UNREGISTERED_ADVISORY',
  'DELETE_UNREGISTERED_ADVISORY',
  'CONVERT_TO_UNREGISTERED_ADVISORY',
  'UPDATE_USER_PROFILE',
  'UPDATE_USER_PASSWORD',
];

// Finalized LEA-CIDG action codes. PERSONNEL_REQUEST_INVITE is
// deliberately excluded — those rows are redirected to the
// Superadmin tab for review, same as FDA's equivalent requests.
const LEA_ACTION_OPTIONS = [
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'CREATE_COMPLAINT_LOG',
  'UPDATE_COMPLAINT_LOG',
  'DELETE_COMPLAINT_LOG',
  'CREATE_VERIFICATION_REQUEST',
  'DELETE_VERIFICATION_REQUEST',
  'UPDATE_COMPLAINT_STATUS',
];

// Finalized Superadmin action codes (excludes actions destined for the
// future System tab: PERSONNEL_PENDING_APPROVAL, SUPERADMIN_PENDING_APPROVAL,
// LOCK_SUPERADMIN_ACCOUNT, LOCK_PERSONNEL_ACCOUNT).
const SUPERADMIN_ACTION_OPTIONS = [
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'UPDATE_SUPERADMIN_PASSWORD',
  'INVITE_PERSONNEL',
  'PERSONNEL_REQUEST_INVITE',
  'INVITE_PERSONNEL_RESENT',
  'APPROVE_PERSONNEL_ACCOUNT',
  'SUSPEND_PERSONNEL_ACCOUNT',
  'REACTIVATE_PERSONNEL_ACCOUNT',
  'DELETE_PERSONNEL_ACCOUNT',
  'UNLOCK_PERSONNEL_ACCOUNT',
  'INVITE_SUPERADMIN',
  'INVITE_SUPERADMIN_RESENT',
  'SUPERADMIN_REQUEST_INVITE',
  'APPROVE_SUPERADMIN_ACCOUNT',
  'SUSPEND_SUPERADMIN_ACCOUNT',
  'REACTIVATE_SUPERADMIN_ACCOUNT',
  'DELETE_SUPERADMIN_ACCOUNT',
  'UNLOCK_SUPERADMIN_ACCOUNT',
];

// Finalized System-tab action codes — automatic actions only, not manually
// triggered by a user click. Rows here carry the real user_role of whichever
// account the automatic action happened to (fda_personnel/lea_personnel/
// superadmin), not a generic "system" role, so the agency badge shows the
// real agency (Option 1 — decided over showing a flat "System" badge).
const SYSTEM_ACTION_OPTIONS = [
  'PERSONNEL_PENDING_APPROVAL',
  'SUPERADMIN_PENDING_APPROVAL',
  'LOCK_PERSONNEL_ACCOUNT',
  'LOCK_SUPERADMIN_ACCOUNT',
];

function getFdaActionCategory(actionCode) {
  if (!actionCode) return 'login';
  if (actionCode.startsWith('CREATE_')) return 'create';
  if (actionCode.startsWith('UPDATE_')) return 'update';
  if (actionCode.startsWith('DELETE_')) return 'delete';
  if (actionCode.startsWith('CONVERT_')) return 'convert';
  // LOGIN, LOGIN_FAILED, LOGOUT all fall here
  return 'login';
}

function deriveAgencyInfo(userId, userRole) {
  if (!userId || !userRole) {
    return { name: 'System', badgeClass: 'badge-agency-system' };
  }
  const roleUpper = userRole.toUpperCase();
  if (roleUpper.includes('FDA')) {
    return { name: 'FDA', badgeClass: 'badge-agency-fda' };
  }
  if (roleUpper.includes('LEA') || roleUpper.includes('CIDG')) {
    return { name: 'LEA-CIDG', badgeClass: 'badge-agency-lea' };
  }
  if (roleUpper.includes('SUPERADMIN')) {
    return { name: 'Superadmin', badgeClass: 'badge-agency-super' };
  }
  return { name: 'System', badgeClass: 'badge-agency-system' };
}

// Agency badge class lookup for rows where the API already tells us the
// agency (FDA tab) instead of us having to derive it from a role string.
function agencyBadgeClassFor(agencyName) {
  switch (agencyName) {
    case 'FDA': return 'badge-agency-fda';
    case 'LEA-CIDG': return 'badge-agency-lea';
    case 'Superadmin': return 'badge-agency-super';
    case 'System':
    default: return 'badge-agency-system';
  }
}

function getActionBadgeClass(actionType) {
  switch (actionType) {
    case 'create':
      return 'badge-action-create';
    case 'update':
      return 'badge-action-update';
    case 'delete':
      return 'badge-action-delete';
    case 'convert':
      return 'badge-action-convert';
    case 'login':
    default:
      return 'badge-action-neutral';
  }
}

// Badge color still comes from the category (create/update/delete/login),
// but the visible label is the full action code where one exists (FDA rows).
// Mock rows have no action_code, so they fall back to the short category.
function getActionBadgeLabel(log) {
  return log.action_code || log.action_type;
}

// NOTE: target_table is rendered as-is from the backend, whatever it says
// (e.g. login rows currently come back as "sessions" in seed data even
// though the real model/table is "user_sessions" — that's a backend seed
// issue, not something to special-case or hardcode around here).
function truncateTargetId(id) {
  if (!id) return '—';
  const idStr = String(id);
  if (idStr.length > 10) {
    return `${idStr.substring(0, 6)}...${idStr.substring(idStr.length - 4)}`;
  }
  return idStr;
}

const ACTION_BADGES = {
  create: { label: 'Create', className: 'AuditLogDetailsBadgeCreate' },
  update: { label: 'Update', className: 'AuditLogDetailsBadgeUpdate' },
  delete: { label: 'Delete', className: 'AuditLogDetailsBadgeDelete' },
  login:  { label: 'Login',  className: 'AuditLogDetailsBadgeLogin' },
};

function ActionBadge({ action, label }) {
  if (!action) return null;
  const meta = ACTION_BADGES[action.toLowerCase()] || { label: action, className: 'AuditLogDetailsBadgeNeutral' };
  return <span className={`AuditLogDetailsActionBadge ${meta.className}`}>{label || meta.label}</span>;
}

// Normalizes a raw FDA API row into the same shape the table/drawer JSX
// already expects from mock rows, so the rendering code below doesn't need
// to branch on data source.
function normalizeFdaLog(raw) {
  const category = getFdaActionCategory(raw.action);
  return {
    log_id: raw.log_id,
    timestamp: raw.timestamp,
    user_id: raw.user_id,
    user_email: raw.user_email,
    // FDA rows: system-fallback is driven by user_name being null, not user_id
    user_name: raw.user_name,
    user_role: raw.user_role,
    agency: raw.agency, // pre-derived server-side, no client-side guessing needed
    region: raw.region_code,
    action_type: category,        // for badge class / filter-tab bucketing
    action_code: raw.action,      // raw code, shown in the drawer
    target_table: raw.target_table,
    target_reference: raw.target_reference,
    target_id: raw.target_id,
    ip_address: raw.ip_address,
    user_agent: raw.user_agent,
    old_value: raw.old_value,
    new_value: raw.new_value,
    _isFdaRow: true,
  };
}

function SuperAdminAuditLog() {
  // Filters & State mapping query parameters
  const [activeTab, setActiveTab] = useState('FDA'); // 'FDA', 'LEA-CIDG', 'Superadmin', 'System'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10); // page size
  
  // Simulated server-side response states (mock tabs: LEA-CIDG / Superadmin / System)
  const [logs, setLogs] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Real backend state (FDA tab only)
  const [fdaLogs, setFdaLogs] = useState([]);
  const [fdaTotalItems, setFdaTotalItems] = useState(0);
  const [fdaTotalPages, setFdaTotalPages] = useState(1);
  const [fdaLoading, setFdaLoading] = useState(false);
  const [fdaError, setFdaError] = useState(null);

  // Real backend state (Superadmin tab only)
  const [superadminLogs, setSuperadminLogs] = useState([]);
  const [superadminTotalItems, setSuperadminTotalItems] = useState(0);
  const [superadminTotalPages, setSuperadminTotalPages] = useState(1);
  const [superadminLoading, setSuperadminLoading] = useState(false);
  const [superadminError, setSuperadminError] = useState(null);

  // Real backend state (LEA-CIDG tab only)
  const [leaLogs, setLeaLogs] = useState([]);
  const [leaTotalItems, setLeaTotalItems] = useState(0);
  const [leaTotalPages, setLeaTotalPages] = useState(1);
  const [leaLoading, setLeaLoading] = useState(false);
  const [leaError, setLeaError] = useState(null);

  // Real backend state (System tab only)
  const [systemLogs, setSystemLogs] = useState([]);
  const [systemTotalItems, setSystemTotalItems] = useState(0);
  const [systemTotalPages, setSystemTotalPages] = useState(1);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState(null);

  // Detail Drawer State
  const [selectedLog, setSelectedLog] = useState(null);

  const isFdaTab = activeTab === 'FDA';
  const isSuperadminTab = activeTab === 'Superadmin';
  const isLeaTab = activeTab === 'LEA-CIDG';
  const isSystemTab = activeTab === 'System';

  // Reset filters that don't make sense across tabs (FDA action codes vs.
  // mock create/update/delete/login, FDA region_code vs. mock region names)
  // whenever the tab changes, and reset to page 1.
  const handleTabClick = (tabName) => {
    if (activeTab === tabName) return;
    setCurrentPage(1);
    setActionFilter('All');
    setRegionFilter('All');

    if (!document.startViewTransition) {
      setActiveTab(tabName);
      return;
    }
    document.startViewTransition(() => {
      setActiveTab(tabName);
    });
  };

  // Reset Filters handler
  const handleClearFilters = () => {
    setSearchQuery('');
    setActionFilter('All');
    setRegionFilter('All');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  // ---- FDA tab: real backend fetch ----
  // GET /admin/audit-logs/fda — superadmin-only, returns 403 for non-superadmin tokens
  useEffect(() => {
    if (!isFdaTab) return;

    let cancelled = false;
    setFdaLoading(true);
    setFdaError(null);

    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', String(limit));
    if (actionFilter !== 'All') params.set('action', actionFilter);
    if (regionFilter !== 'All') params.set('region_code', regionFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    apiFetch(`/admin/audit-logs/fda?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You do not have permission to view FDA audit logs.');
          }
          throw new Error(`Failed to load audit logs (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setFdaLogs((data.items || []).map(normalizeFdaLog));
        setFdaTotalItems(data.total ?? 0);
        setFdaTotalPages(data.total_pages ?? 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setFdaError(err.message || 'Failed to load audit logs.');
        setFdaLogs([]);
        setFdaTotalItems(0);
        setFdaTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setFdaLoading(false);
      });

    return () => { cancelled = true; };
  }, [isFdaTab, actionFilter, regionFilter, dateFrom, dateTo, searchQuery, currentPage, limit]);

    // ---- Superadmin tab: real backend fetch ----
  // GET /admin/audit-logs/superadmin — superadmin-only; no region filter (superadmins have no region)
  useEffect(() => {
    if (!isSuperadminTab) return;

    let cancelled = false;
    setSuperadminLoading(true);
    setSuperadminError(null);

    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', String(limit));
    if (actionFilter !== 'All') params.set('action', actionFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    apiFetch(`/admin/audit-logs/superadmin?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You do not have permission to view Superadmin audit logs.');
          }
          throw new Error(`Failed to load audit logs (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSuperadminLogs((data.items || []).map(normalizeFdaLog));
        setSuperadminTotalItems(data.total ?? 0);
        setSuperadminTotalPages(data.total_pages ?? 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setSuperadminError(err.message || 'Failed to load audit logs.');
        setSuperadminLogs([]);
        setSuperadminTotalItems(0);
        setSuperadminTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setSuperadminLoading(false);
      });

    return () => { cancelled = true; };
  }, [isSuperadminTab, actionFilter, dateFrom, dateTo, searchQuery, currentPage, limit]);

    // ---- LEA-CIDG tab: real backend fetch ----
  // GET /admin/audit-logs/lea — superadmin-only, region-scoped same as FDA
  useEffect(() => {
    if (!isLeaTab) return;

    let cancelled = false;
    setLeaLoading(true);
    setLeaError(null);

    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', String(limit));
    if (actionFilter !== 'All') params.set('action', actionFilter);
    if (regionFilter !== 'All') params.set('region_code', regionFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    apiFetch(`/admin/audit-logs/lea?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You do not have permission to view LEA-CIDG audit logs.');
          }
          throw new Error(`Failed to load audit logs (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setLeaLogs((data.items || []).map(normalizeFdaLog));
        setLeaTotalItems(data.total ?? 0);
        setLeaTotalPages(data.total_pages ?? 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setLeaError(err.message || 'Failed to load audit logs.');
        setLeaLogs([]);
        setLeaTotalItems(0);
        setLeaTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setLeaLoading(false);
      });

    return () => { cancelled = true; };
  }, [isLeaTab, actionFilter, regionFilter, dateFrom, dateTo, searchQuery, currentPage, limit]);

  // ---- System tab: real backend fetch ----
  // GET /admin/audit-logs/system — superadmin-only; region filter applies
  // (personnel rows have a region, superadmin rows don't — filtering by
  // region naturally excludes superadmin rows, same as any other tab).
  useEffect(() => {
    if (!isSystemTab) return;

    let cancelled = false;
    setSystemLoading(true);
    setSystemError(null);

    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('limit', String(limit));
    if (actionFilter !== 'All') params.set('action', actionFilter);
    if (regionFilter !== 'All') params.set('region_code', regionFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    apiFetch(`/admin/audit-logs/system?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('You do not have permission to view System audit logs.');
          }
          throw new Error(`Failed to load audit logs (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setSystemLogs((data.items || []).map(normalizeFdaLog));
        setSystemTotalItems(data.total ?? 0);
        setSystemTotalPages(data.total_pages ?? 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setSystemError(err.message || 'Failed to load audit logs.');
        setSystemLogs([]);
        setSystemTotalItems(0);
        setSystemTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setSystemLoading(false);
      });

    return () => { cancelled = true; };
  }, [isSystemTab, actionFilter, regionFilter, dateFrom, dateTo, searchQuery, currentPage, limit]);

  // ---- Mock tabs (All): unchanged mock filtering ----
  // FDA / Superadmin / LEA-CIDG / System tabs now use real backend data
  // (see effects above) — only "All" still falls through to mock data.
  useEffect(() => {
    if (isFdaTab || isSuperadminTab || isLeaTab || isSystemTab) return;

    setLoading(true);
    const timer = setTimeout(() => {
      let filtered = [...MOCK_AUDIT_LOGS];

      // 1. Agency tab filter (FDA green / LEA teal / Superadmin navy / System gray)
      if (activeTab !== 'All') {
        filtered = filtered.filter(log => {
          const agencyInfo = deriveAgencyInfo(log.user_id, log.user_role);
          return agencyInfo.name === activeTab;
        });
      }

      // 2. Action filter
      if (actionFilter !== 'All') {
        filtered = filtered.filter(log => log.action_type === actionFilter);
      }

      // 3. Region filter
      if (regionFilter !== 'All') {
        filtered = filtered.filter(log => log.region === regionFilter);
      }

      // 4. Date From filter
      if (dateFrom) {
        filtered = filtered.filter(log => log.timestamp >= `${dateFrom} 00:00:00`);
      }

      // 5. Date To filter
      if (dateTo) {
        filtered = filtered.filter(log => log.timestamp <= `${dateTo} 23:59:59`);
      }

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(log =>
          (log.target_id && log.target_id.toLowerCase().includes(query)) ||
          (log.user_name && log.user_name.toLowerCase().includes(query)) ||
          (log.target_table && log.target_table.toLowerCase().includes(query))
        );
      }

      // Pagination slice
      const count = filtered.length;
      const pages = Math.ceil(count / limit) || 1;
      const activePage = Math.min(Math.max(1, currentPage), pages);
      const startIdx = (activePage - 1) * limit;
      const slicedLogs = filtered.slice(startIdx, startIdx + limit);

      setLogs(slicedLogs);
      setTotalItems(count);
      setTotalPages(pages);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [isFdaTab, isSuperadminTab, isLeaTab, isSystemTab, activeTab, actionFilter, regionFilter, dateFrom, dateTo, searchQuery, currentPage, limit]);

  // Tab count calculation based on active secondary filters (mock tabs only —
  // FDA's count comes from fdaTotalItems since the real total lives server-side
  // and only applies while the FDA tab itself is active).
  const getTabCount = (tabName) => {
    if (tabName === 'FDA') return isFdaTab ? fdaTotalItems : null;
    if (tabName === 'Superadmin') return isSuperadminTab ? superadminTotalItems : null;
    if (tabName === 'LEA-CIDG') return isLeaTab ? leaTotalItems : null;
    if (tabName === 'System') return isSystemTab ? systemTotalItems : null;

    let result = [...MOCK_AUDIT_LOGS];

    if (actionFilter !== 'All') {
      result = result.filter(log => log.action_type === actionFilter);
    }
    if (regionFilter !== 'All') {
      result = result.filter(log => log.region === regionFilter);
    }
    if (dateFrom) {
      result = result.filter(log => log.timestamp >= `${dateFrom} 00:00:00`);
    }
    if (dateTo) {
      result = result.filter(log => log.timestamp <= `${dateTo} 23:59:59`);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(log =>
        (log.target_id && log.target_id.toLowerCase().includes(query)) ||
        (log.user_name && log.user_name.toLowerCase().includes(query)) ||
        (log.target_table && log.target_table.toLowerCase().includes(query))
      );
    }

    if (tabName === 'All') return result.length;

    return result.filter(log => {
      const agencyInfo = deriveAgencyInfo(log.user_id, log.user_role);
      return agencyInfo.name === tabName;
    }).length;
  };

    // ---- Unified view of "what to render" regardless of data source ----
  const displayLogs = isFdaTab ? fdaLogs : isSuperadminTab ? superadminLogs : isLeaTab ? leaLogs : isSystemTab ? systemLogs : logs;
  const displayLoading = isFdaTab ? fdaLoading : isSuperadminTab ? superadminLoading : isLeaTab ? leaLoading : isSystemTab ? systemLoading : loading;
  const displayTotalItems = isFdaTab ? fdaTotalItems : isSuperadminTab ? superadminTotalItems : isLeaTab ? leaTotalItems : isSystemTab ? systemTotalItems : totalItems;
  const displayTotalPages = isFdaTab ? fdaTotalPages : isSuperadminTab ? superadminTotalPages : isLeaTab ? leaTotalPages : isSystemTab ? systemTotalPages : totalPages;

  const startIndex = (currentPage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, displayTotalItems);

  return (
    <div className="SuperadminMainContainer">
      <Sidebar sidebarType="SUPER_ADMIN" />
      <div className="SuperadminContentContainer">
        <TopBar topbarType="SUPER_ADMIN" />
        <div className="SuperadminMainfeed">
          <div className="UMPageContainer">
            {/* Page Header */}
            <div className="UMPageHeader">
              <div className="UMPageTitleBlock">
                <h2 className="UMPageTitle">Audit Trail Logs</h2>
                <p className="UMPageSubtitle">
                  Track and examine system actions, resource creations, profile changes, and session activities.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="AuditTabsContainer">
              <div className="AuditTabsButton">
                {['FDA', 'LEA-CIDG', 'Superadmin', 'System'].map((tab) => {
                  const count = getTabCount(tab);
                  return (
                    <button
                      key={tab}
                      className={`AuditTabButton ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => handleTabClick(tab)}
                    >
                      {tab}
                      {count !== null && <span className="AuditTabCount">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secondary Filter Controls */}
            <div className="AuditFiltersRow">
              <div className="AuditSearchWrapper">
                <Search size={16} className="AuditSearchIcon" />
                <input
                  type="text"
                  placeholder="Search by user, target reference/table/ID..."
                  className="AuditSearchInput"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

    <div className="AuditFiltersGroup">
  <div className="AuditFilterItem">
    <span className="AuditFilterLabel">ACTION</span>
                <select
                  className="AuditSelectFilter"
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="All">All Actions</option>
                  {isFdaTab ? (
                    FDA_ACTION_OPTIONS.map(code => (
                      <option key={code} value={code}>{code.replaceAll('_', ' ')}</option>
                    ))
                  ) : isSuperadminTab ? (
                    SUPERADMIN_ACTION_OPTIONS.map(code => (
                      <option key={code} value={code}>{code.replaceAll('_', ' ')}</option>
                    ))
                  ) : isLeaTab ? (
                    LEA_ACTION_OPTIONS.map(code => (
                      <option key={code} value={code}>{code.replaceAll('_', ' ')}</option>
                    ))
                  ) : isSystemTab ? (
                    SYSTEM_ACTION_OPTIONS.map(code => (
                      <option key={code} value={code}>{code.replaceAll('_', ' ')}</option>
                    ))
                  ) : (
                    <>
                      <option value="create">Create</option>
                      <option value="update">Update</option>
                      <option value="delete">Delete</option>
                      <option value="login">Login</option>
                    </>
                  )}
                </select>
  </div>

                  {!isSuperadminTab && (
                  <div className="AuditFilterItem">
                    <span className="AuditFilterLabel">REGION</span>
                    <select
                      className="AuditSelectFilter"
                      value={regionFilter}
                      onChange={(e) => {
                        setRegionFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="All">All Regions</option>
                      {isFdaTab || isLeaTab || isSystemTab ? (
                        FDA_REGION_OPTIONS.map(({ code, label }) => (
                          <option key={code} value={code}>{label}</option>
                        ))
                      ) : (
                        REGION_OPTIONS.map(reg => (
                          <option key={reg} value={reg}>{reg}</option>
                        ))
                      )}
                    </select>
                  </div>
                )}

  <div className="AuditDateGroup">
                  <span className="AuditDateLabel">TO</span>
                  <input
                    type="date"
                    className="AuditDateInput"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {(searchQuery || actionFilter !== 'All' || regionFilter !== 'All' || dateFrom || dateTo) && (
                  <button
                    className="BtnClearFiltersIcon"
                    aria-label="Clear Filters"
                    title="Clear Filters"
                    onClick={handleClearFilters}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Table Container */}
            <div className="UMTableWrapper">
              {fdaError && isFdaTab ? (
                <div className="UMEmpty" style={{ padding: '40px', textAlign: 'center', color: '#b91c1c' }}>
                  {fdaError}
                </div>
              ) : superadminError && isSuperadminTab ? (
                <div className="UMEmpty" style={{ padding: '40px', textAlign: 'center', color: '#b91c1c' }}>
                  {superadminError}
                </div>
              ) : leaError && isLeaTab ? (
                <div className="UMEmpty" style={{ padding: '40px', textAlign: 'center', color: '#b91c1c' }}>
                  {leaError}
                </div>
              ) : systemError && isSystemTab ? (
                <div className="UMEmpty" style={{ padding: '40px', textAlign: 'center', color: '#b91c1c' }}>
                  {systemError}
                </div>
              ) : displayLoading ? (
                <div className="UMEmpty" style={{ padding: '40px', textAlign: 'center' }}>
                  Loading logs...
                </div>
              ) : displayLogs.length > 0 ? (
                <>
                  <table className="UMTable">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User</th>
                        <th>Agency</th>
                        <th>Region</th>
                        <th>Action</th>
                        <th>Target Table</th>
                        <th className="AuditTextCenter">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayLogs.map((log) => {
                        // FDA rows already carry `agency`; mock rows still need it derived.
                        const agencyInfo = log._isFdaRow
                          ? { name: log.agency, badgeClass: agencyBadgeClassFor(log.agency) }
                          : deriveAgencyInfo(log.user_id, log.user_role);

                        // FDA system-fallback: agency/role says "System" — NOT just a
                        // null user_name, since a real seeded user can have no
                        // first/last name set and still be a real account.
                        // Mock rows: still keyed off user_id, unchanged.
                        const isSystemRow = log._isFdaRow
                          ? log.agency === 'System' || log.user_role === 'system'
                          : !log.user_id;

                        // FDA row, real user, but no display name on file — show the
                        // role instead of fabricating a name or mislabeling as System.
                        const fdaUserLabel = log.user_name || 'Unnamed';

                        return (
                          <tr key={log.log_id}>
                            <td className="AuditNoWrap">{log.timestamp}</td>
                            <td>
                              {!isSystemRow ? (
                                <div className="AuditUserCell">
                                  <strong>{log._isFdaRow ? fdaUserLabel : log.user_name}</strong>
                                </div>
                              ) : (
                                <strong>System</strong>
                              )}
                            </td>
                            <td>
                              <span className={`UMStatusBadge ${agencyInfo.badgeClass}`}>
                                {agencyInfo.name}
                              </span>
                            </td>
                            <td>{log.region || '—'}</td>
                            <td>
                              <span className={getActionBadgeClass(log.action_type)}>
                                {getActionBadgeLabel(log)}
                              </span>
                            </td>
                            <td>
                              <span className="AuditNoWrap">
                                {log.target_table}
                              </span>
                            </td>
                            <td className="AuditTextCenter">
                              <button
                                className="AuditDetailsBtn"
                                onClick={() => setSelectedLog(log)}
                                title="View detailed audit changes"
                              >
                                <Info size={14} /> Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  <div className="AuditPaginationWrapper">
                    <span className="AuditPaginationInfo">
                      Showing {displayTotalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {displayTotalItems} entries
                    </span>
                    <div className="AuditPaginationControls">
                      <button
                        className="AuditPageBtn"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      
                      {Array.from({ length: displayTotalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          className={`AuditPageNumber ${currentPage === page ? 'active' : ''}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        className="AuditPageBtn"
                        disabled={currentPage === displayTotalPages}
                        onClick={() => setCurrentPage(prev => Math.min(displayTotalPages, prev + 1))}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="UMEmpty" style={{ padding: '60px', textAlign: 'center' }}>
                  No audit logs found matching your criteria.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row Detail Drawer Overlay */}
      {selectedLog && (
        <div className="AuditDrawerOverlay" onClick={() => setSelectedLog(null)}>
          <div className="AuditDrawerContent AuditLogDetailsPanel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="AuditDrawerHeader AuditLogDetailsHeader">
              <div className="AuditLogDetailsHeaderTitleBlock">
                <History size={20} className="AuditLogDetailsHeaderIcon" />
                <h3 className="AuditDrawerTitle">Audit Log Details</h3>
              </div>
            </div>

            {/* Body */}
            <div className="AuditDrawerBody AuditLogDetailsBody">
              {/* Card 1: Event Information */}
              <div className="AuditLogDetailsCard">
                <h4 className="AuditLogDetailsCardTitle">Event Information</h4>
                <div className="AuditLogDetailsGrid">
                  <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">Log ID</span>
                    <span className="AuditLogDetailsValue">{selectedLog.log_id}</span>
                  </div>
                  <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">Date & Time</span>
                    <span className="AuditLogDetailsValue">{selectedLog.timestamp}</span>
                  </div>
                                    <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">User</span>
                    <span className="AuditLogDetailsValue">
                      {selectedLog._isFdaRow
                        ? (selectedLog.agency === 'System' || selectedLog.user_role === 'system'
                            ? 'System'
                            : (selectedLog.user_name || 'Unnamed'))
                        : (selectedLog.user_name || 'System')}
                    </span>
                  </div>
                  <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">User ID</span>
                    <span className="AuditLogDetailsValue">
                      {selectedLog.user_id || '—'}
                    </span>
                  </div>
                  <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">Email</span>
                    <span className="AuditLogDetailsValue">
                      {selectedLog.user_email || '—'}
                    </span>
                  </div>
                  <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">User Role</span>
                    <span className="AuditLogDetailsValue">
                      {selectedLog.user_role || 'System / Automated'}
                    </span>
                  </div>
                  <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">IP Address</span>
                    <span className="AuditLogDetailsValue">{selectedLog.ip_address || '—'}</span>
                  </div>
                  <div className="AuditLogDetailsRow" style={{ alignItems: 'flex-start' }}>
                    <span className="AuditLogDetailsLabel" style={{ paddingTop: '2px', flexShrink: 0 }}>User Agent</span>
                    <span
                      className="AuditLogDetailsValue"
                      style={{ textAlign: 'right', wordBreak: 'break-word', fontSize: '0.85em', lineHeight: '1.4' }}
                    >
                      {selectedLog.user_agent || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Activity Information */}
              <div className="AuditLogDetailsCard">
                <h4 className="AuditLogDetailsCardTitle">Activity Information</h4>
                <div className="AuditLogDetailsGrid">
                  <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">Action</span>
                    <span className="AuditLogDetailsValue">
                      <ActionBadge action={selectedLog.action_type} label={getActionBadgeLabel(selectedLog)} />
                    </span>
                  </div>
                  <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">Target Table</span>
                    <span className="AuditLogDetailsValue">{selectedLog.target_table}</span>
                  </div>
                  {selectedLog.target_reference && (
                    <div className="AuditLogDetailsRow">
                      <span className="AuditLogDetailsLabel">Target Reference</span>
                      <span className="AuditLogDetailsValue">{selectedLog.target_reference}</span>
                    </div>
                  )}
                  <div className="AuditLogDetailsRow">
                    <span className="AuditLogDetailsLabel">Record / Target ID</span>
                    <span className="AuditLogDetailsValue">{selectedLog.target_id || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Changes */}
              <div className="AuditLogDetailsCard">
                <h4 className="AuditLogDetailsCardTitle">Data Changes</h4>
                {selectedLog.old_value === null && selectedLog.new_value === null ? (
                  <div className="AuditLogDetailsNoChanges">No data changes recorded for this action.</div>
                ) : (
                  <div className="AuditLogDetailsChangesContainer">
                    <div className="AuditLogDetailsChangeSubCard">
                      <span className="AuditLogDetailsSubCardLabel">Before Changes</span>
                      <pre className="AuditLogDetailsPre">
                        {selectedLog.old_value ? JSON.stringify(selectedLog.old_value, null, 2) : 'No previous data'}
                      </pre>
                    </div>
                    <div className="AuditLogDetailsChangeSubCard">
                      <span className="AuditLogDetailsSubCardLabel">After Changes</span>
                      <pre className="AuditLogDetailsPre">
                        {selectedLog.new_value ? JSON.stringify(selectedLog.new_value, null, 2) : 'No previous data'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="AuditLogDetailsFooter">
              <button 
                className="AuditLogDetailsCloseBtn" 
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

export default SuperAdminAuditLog;
