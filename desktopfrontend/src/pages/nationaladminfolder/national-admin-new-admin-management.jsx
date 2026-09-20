import './national-admin-css.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import { createPortal } from 'react-dom';
import {
  Send,
  UserX,
  Trash2,
  Eye,
  MoreVertical,
  TriangleAlert,
  CircleCheckBig,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  User,
} from 'lucide-react';
import Sidebar from '../component/sidebar';
import TopBar from '../component/top-bar';


function extractErrorMessage(errorData, fallback) {
    const detail = errorData?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail.map(d => d?.msg || JSON.stringify(d)).join(' ');
    }
    if (detail && typeof detail === 'object') {
        return detail.msg || detail.message || JSON.stringify(detail);
    }
    return fallback;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr; // fallback if unparseable
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const KNOWN_ADMIN_STATUSES = [
  'Pending Approval',
  'Locked',
  'Suspended',
  'Active',
  'Invited',
  'Resend Requested',
  'Link Expired',
];

export function computeAdminStatus(admin) {
  if (!admin) return '';
  const raw = (admin.status || '').toString().trim();
  const match = KNOWN_ADMIN_STATUSES.find((s) => s.toLowerCase() === raw.toLowerCase());
  return match || admin.status || '';
}

const NATIONAL_ADMIN_STATUS_META = {
  Invited: { label: 'Invited', className: 'nam-badge-invited' },
  'Link Expired': { label: 'Link Expired', className: 'nam-badge-expired' },
  'Resend Requested': { label: 'Resend Requested', className: 'nam-badge-pending' },
  Active: { label: 'Active', className: 'nam-badge-active' },
  Suspended: { label: 'Suspended', className: 'nam-badge-suspended' },
  Suspend: { label: 'Suspended', className: 'nam-badge-suspended' },
  'Pending Approval': { label: 'Pending Approval', className: 'nam-badge-pending' },
  Locked: { label: 'Locked', className: 'nam-badge-locked' },
};

function NationalAdminStatusBadge({ status }) {
  const statusStr = typeof status === 'object' && status !== null ? computeAdminStatus(status) : status;
  const meta = NATIONAL_ADMIN_STATUS_META[statusStr] || { label: statusStr, className: '' };
  return <span className={`NAMStatusBadge ${meta.className}`}>{meta.label}</span>;
}

function NationalAdminActionDropdown({
  nationalAdmin,
  isSelf,
  isOpen,
  toggleDropdown,
  onAction,
  onView,
}) {
  const status = computeAdminStatus(nationalAdmin);
  const [openUpward, setOpenUpward] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const upward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const right = Math.max(8, window.innerWidth - rect.right);

    if (upward) {
      setMenuStyle({
        position: 'fixed',
        bottom: `${Math.max(8, window.innerHeight - rect.top + 4)}px`,
        top: 'auto',
        right: `${right}px`,
        left: 'auto',
        zIndex: 9999,
        minWidth: '165px',
        maxHeight: `${Math.max(120, rect.top - 16)}px`,
        overflowY: 'auto',
      });
    } else {
      setMenuStyle({
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        bottom: 'auto',
        right: `${right}px`,
        left: 'auto',
        zIndex: 9999,
        minWidth: '165px',
        maxHeight: `${Math.max(120, spaceBelow - 16)}px`,
        overflowY: 'auto',
      });
    }
    setOpenUpward(upward);
  }, []);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      updateMenuPosition();
    }
    toggleDropdown();
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    function handleOutsideClick(event) {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        triggerRef.current && !triggerRef.current.contains(event.target)
      ) {
        toggleDropdown();
      }
    }

    function handleScrollOrResize(event) {
      if (menuRef.current && menuRef.current.contains(event.target)) return;
      toggleDropdown();
    }

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, toggleDropdown, updateMenuPosition]);

  return (
    <div className={`NAMDropdownWrapper ${isOpen ? 'active-open' : ''}`}>
      <button
        ref={triggerRef}
        className="NAMDropdownTrigger"
        data-tooltip="Actions"
        title="More Actions"
        onClick={handleToggle}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`NAMDropdownMenu ${openUpward ? 'open-upward' : ''}`}
            style={menuStyle}
          >
            <button
              className="NAMDropdownItem"
              onClick={() => {
                onView();
                toggleDropdown();
              }}
            >
              <Eye size={14} /> View Details
            </button>

            {['Resend Requested', 'Link Expired'].includes(status) && (
              <button
                className="NAMDropdownItem"
                onClick={() => {
                  onAction('resend');
                  toggleDropdown();
                }}
              >
                <Send size={14} /> Resend Invitation
              </button>
            )}

            {status === 'Link Expired' && (
              <>
                <div className="NAMDropdownDivider" />
                <button
                  className="NAMDropdownItem danger"
                  onClick={() => {
                    onAction('delete');
                    toggleDropdown();
                  }}
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </>
            )}

            {status === 'Pending Approval' && (
              <button
                className="NAMDropdownItem"
                onClick={() => {
                  onAction('activate');
                  toggleDropdown();
                }}
              >
                <ShieldCheck size={14} /> Activate Account
              </button>
            )}

            {status === 'Locked' && (
              <button
                className="NAMDropdownItem"
                onClick={() => {
                  onAction('unlock');
                  toggleDropdown();
                }}
              >
                <RotateCcw size={14} /> Unlock Account
              </button>
            )}

            {status === 'Active' && !isSelf && (
              <>
                <div className="NAMDropdownDivider" />
                <button
                  className="NAMDropdownItem"
                  onClick={() => {
                    onAction('suspend');
                    toggleDropdown();
                  }}
                >
                  <UserX size={14} /> Suspend Account
                </button>
              </>
            )}

            {status === 'Suspended' && !isSelf && (
              <>
                <div className="NAMDropdownDivider" />
                <button
                  className="NAMDropdownItem"
                  onClick={() => {
                    onAction('reactivate');
                    toggleDropdown();
                  }}
                >
                  <RotateCcw size={14} /> Reactivate Account
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

const NATIONAL_ADMIN_CONFIRM_MESSAGES = {
  resend: {
    title: 'Resend Invitation Email',
    message: 'Are you sure you want to resend the National Admin invitation email to this user?',
    confirmLabel: 'Resend Invitation',
  },
  suspend: {
    title: 'Suspend Account',
    message:
      'Are you sure you want to suspend this National Admin account? Access will be temporarily revoked.',
    confirmLabel: 'Suspend Account',
  },
  reactivate: {
    title: 'Reactivate Account',
    message:
      'Are you sure you want to reactivate this National Admin account? Access will be restored immediately.',
    confirmLabel: 'Reactivate Account',
  },
  delete: {
    title: 'Delete National Admin Account',
    message:
      'Are you sure you want to delete this National Admin account entry? This action cannot be undone.',
    confirmLabel: 'Delete Account',
  },
  activate: {
    title: 'Activate National Admin Account',
    message:
      'Are you sure you want to activate this National Admin account? The user will be notified and can now log in.',
    confirmLabel: 'Activate Account',
  },
  unlock: {
    title: 'Unlock National Admin Account',
    message:
      'Are you sure you want to unlock this National Admin account? Access will be restored immediately.',
    confirmLabel: 'Unlock Account',
  },
};

function NationalAdminConfirmModal({ open, actionType, onConfirm, onCancel }) {
  if (!open) return null;
  const meta = NATIONAL_ADMIN_CONFIRM_MESSAGES[actionType] || {};

  const isDestructive = actionType === 'suspend' || actionType === 'delete';
  const isReactivate =
    actionType === 'reactivate' || actionType === 'unlock' || actionType === 'activate';

  return (
    <div className="NAMModalOverlay">
      <div className="NAMModal NAMConfirmModal">
        <div className="NAMConfirmIcon">
          {isDestructive ? (
            <TriangleAlert size={40} color="#D97706" strokeWidth={2.5} />
          ) : isReactivate ? (
            <CircleCheckBig size={40} color="#0D9488" strokeWidth={2.5} />
          ) : (
            <Mail size={40} color="#0D9488" strokeWidth={2.5} />
          )}
        </div>
        <h3 className="NAMModalTitle">{meta.title}</h3>
        <p className="NAMConfirmMessage">{meta.message}</p>
        <div className="NAMModalFooter">
          <button className="NAMCancelBtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`NAMConfirmBtn ${isDestructive ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddNationalAdminModal({ open, onClose, onAddSuccess }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sending, setSending] = useState(false);

  function handleClose() {
    setFirstName('');
    setLastName('');
    setEmail('');
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setSuccessMsg('');
    setSending(false);
    onClose();
  }

  async function handleSend() {
  let hasError = false;
  setFirstNameError('');
  setLastNameError('');
  setEmailError('');

  if (!firstName.trim()) { setFirstNameError('First Name is required.'); hasError = true; }
  if (!lastName.trim()) { setLastNameError('Last Name is required.'); hasError = true; }
  if (!email.trim()) {
    setEmailError('Email address is required.');
    hasError = true;
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    }
  }
  if (hasError) return;

  setSending(true);
  try {
    const res = await apiFetch('/national-admin-management', {
      method: 'POST',
      body: JSON.stringify({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(extractErrorMessage(errData, 'Failed to send invitation.'));
    }
    setSuccessMsg(`National Admin invitation email has been sent to ${email.trim()}`);
    onAddSuccess(); // now just triggers a refetch, see below
  } catch (err) {
    setEmailError(err.message);
  } finally {
    setSending(false);
  }
}

  function handleDone() {
    handleClose();
  }

  if (!open) return null;

  return (
    <div className="NAMModalOverlay">
      <div className="NAMModal NAMAdminAddModal">
        <div className="NAMModalHeader">
          <h3 className="NAMModalTitle">Add New National Admin</h3>
          <p className="NAMModalSubtitle">
            Enter the name and email address of the new National Admin. They will receive an email
            invitation to set up their account.
          </p>
        </div>

        {!successMsg ? (
          <>
            {/* Row 1: Name Fields */}
            <div className="NAMFieldRow">
              <div className="NAMFormGroup">
                <label className="NAMLabel">
                  First Name <span className="NAMRequired">*</span>
                </label>
                <div className="NAMInputWrapper">
                  <User className="NAMInputIcon" size={16} />
                  <input
                    type="text"
                    className={`NAMInput with-icon ${firstNameError ? 'input-error' : ''}`}
                    placeholder="e.g. Juan"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (firstNameError) setFirstNameError('');
                    }}
                    disabled={sending}
                    autoFocus
                  />
                </div>
                {firstNameError && <span className="NAMFieldError">{firstNameError}</span>}
              </div>

              <div className="NAMFormGroup">
                <label className="NAMLabel">
                  Last Name <span className="NAMRequired">*</span>
                </label>
                <div className="NAMInputWrapper">
                  <User className="NAMInputIcon" size={16} />
                  <input
                    type="text"
                    className={`NAMInput with-icon ${lastNameError ? 'input-error' : ''}`}
                    placeholder="e.g. Dela Cruz"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (lastNameError) setLastNameError('');
                    }}
                    disabled={sending}
                  />
                </div>
                {lastNameError && <span className="NAMFieldError">{lastNameError}</span>}
              </div>
            </div>

            {/* Row 2: Email Address */}
            <div className="NAMFormGroup">
              <label className="NAMLabel">
                Email Address <span className="NAMRequired">*</span>
              </label>
              <div className="NAMInputWrapper">
                <Mail className="NAMInputIcon" size={16} />
                <input
                  type="email"
                  className={`NAMInput with-icon ${emailError ? 'input-error' : ''}`}
                  placeholder="e.g. admin.national@everifymo.gov.ph"
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmail(val);
                    if (!val.trim()) {
                      setEmailError('');
                    } else {
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(val.trim())) {
                        setEmailError('Please enter a valid email address.');
                      } else {
                        setEmailError('');
                      }
                    }
                  }}
                  disabled={sending}
                />
              </div>
              {emailError && <span className="NAMFieldError">{emailError}</span>}
            </div>

            <div className="NAMModalFooter">
              <button className="NAMCancelBtn" onClick={handleClose} disabled={sending}>
                Cancel
              </button>
              <button
                className="NAMConfirmBtn primary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="NAMSuccessBox">
              <div className="NAMSuccessIcon">✉️</div>
              <p className="NAMSuccessMsg">{successMsg}</p>
            </div>

            <div className="NAMModalFooter NAMFooterCenter">
              <button className="NAMConfirmBtn primary" onClick={handleDone}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NationalAdminViewModal({ open, nationalAdmin, onClose }) {
  if (!open || !nationalAdmin) return null;

  const showExpiration = ['Invited', 'Resend Requested', 'Link Expired'].includes(
    nationalAdmin.status
  );

  const resolvedFullName =
    nationalAdmin.fullname ||
    [nationalAdmin.first_name, nationalAdmin.middle_name, nationalAdmin.last_name].filter(Boolean).join(' ') ||
    '-';

  return (
    <div className="NAMModalOverlay">
      <div className="NAMModal NAMViewModal">
        <div className="NAMModalHeader">
          <div className="NAMViewTitleRow">
            <ShieldCheck size={24} color="#0D9488" />
            <h3 className="NAMModalTitle">National Admin Details</h3>
          </div>
          <p className="NAMModalSubtitle">Viewing account status and invitation details.</p>
        </div>

        <div className="NAMViewBody">
          <div className="NAMViewDetails">
            <div className="NAMVDGrid three-col">
              <div className="NAMVDField">
                <span className="NAMVDLabel">First Name</span>
                <span className="NAMVDValue">{nationalAdmin.first_name || '-'}</span>
              </div>
              <div className="NAMVDField">
                <span className="NAMVDLabel">Middle Name</span>
                <span className="NAMVDValue">{nationalAdmin.middle_name || '-'}</span>
              </div>
              <div className="NAMVDField">
                <span className="NAMVDLabel">Last Name</span>
                <span className="NAMVDValue">{nationalAdmin.last_name || '-'}</span>
              </div>

              <div className="NAMVDField full-span">
                <span className="NAMVDLabel">Full Name</span>
                <span className="NAMVDValue">{resolvedFullName}</span>
              </div>

              <div className="NAMVDField full-span">
                <span className="NAMVDLabel">Email Address</span>
                <span className="NAMVDValue NAMEmailCell">{nationalAdmin.email || '-'}</span>
              </div>

              <div className="NAMVDField">
                <span className="NAMVDLabel">Role</span>
                <span className="NAMVDValue">{nationalAdmin.role || 'National Administrator'}</span>
              </div>
              <div className="NAMVDField">
                <span className="NAMVDLabel">Account Status</span>
                <span className="NAMVDValue">
                  <NationalAdminStatusBadge status={nationalAdmin} />
                </span>
              </div>

              <div className="NAMVDField">
                <span className="NAMVDLabel">Invitation Date</span>
                <span className="NAMVDValue">
                  {nationalAdmin.invitation_date
                    ? formatDate(nationalAdmin.invitation_date)
                    : <span className="NAMSystemCreatedTag">System Created</span>}
                </span>
              </div>
              {showExpiration && (
                <div className="NAMVDField">
                  <span className="NAMVDLabel">Expiration Date</span>
                  <span className="NAMVDValue">{formatDate(nationalAdmin.expiration_date)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="NAMViewFooter">
          <button className="NAMConfirmBtn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


export default function NationalAdminNewAdminManagement() {
  const [nationalAdmins, setNationalAdmins] = useState([]);
  const [nationalAdminLoading, setNationalAdminLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [myUserId, setMyUserId] = useState(null); 
  const [nationalAdminStatusFilter, setNationalAdminStatusFilter] = useState('All');
  const [nationalAdminSearchQuery, setNationalAdminSearchQuery] = useState('');
  const [nationalAdminViewAdmin, setNationalAdminViewAdmin] = useState(null);
  const [nationalAdminActiveDropdownId, setNationalAdminActiveDropdownId] = useState(null);
  const [nationalAdminAddModalOpen, setNationalAdminAddModalOpen] = useState(false);
  const [nationalAdminConfirmModal, setNationalAdminConfirmModal] = useState({
    open: false,
    actionType: '',
    targetId: null,
  });


  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const fetchNationalAdmins = useCallback(async (silent = false) => {
    if (!silent) setNationalAdminLoading(true);
    setFetchError('');
    try {
      const res = await apiFetch('/national-admin-management');
      if (!res.ok) throw new Error('Failed to load national admins.');
      const data = await res.json();
      setNationalAdmins(
        data.map((a) => ({
          id: a.user_id,
          first_name: a.first_name,
          middle_name: a.middle_name,
          last_name: a.last_name,
          fullname: [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(' '),
          email: a.email,
          invitation_date: a.invitation_date,
          expiration_date: a.expiration_date,
          status: a.status,
          is_locked: a.is_locked,
          role: 'National Administrator',
        }))
      );
    } catch (err) {
      setFetchError(err.message || 'Something went wrong.');
    } finally {
      if (!silent) setNationalAdminLoading(false);
    }
  }, []);

    const fetchMyProfile = useCallback(async () => {  // ⬅️ ADD
    try {
      const res = await apiFetch('/profile');
      if (!res.ok) return;
      const data = await res.json();
      setMyUserId(data.user_id);
    } catch (err) {
      console.error('Failed to fetch current admin profile:', err);
    }
  }, []);

useEffect(() => {
  fetchNationalAdmins();
  fetchMyProfile();
}, [fetchNationalAdmins, fetchMyProfile]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        !event.target.closest('.NAMDropdownWrapper') &&
        !event.target.closest('.NAMDropdownMenu')
      ) {
        setNationalAdminActiveDropdownId(null);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  function handleOpenAddModal() {
    setNationalAdminAddModalOpen(true);
  }

  function handleAddSuccess() {
    fetchNationalAdmins(true);
  }

  function openConfirm(actionType, adminId) {
    setNationalAdminConfirmModal({ open: true, actionType, targetId: adminId });
  }

  async function handleConfirmAction() {
  const { actionType, targetId } = nationalAdminConfirmModal;
  const actionPathMap = {
    suspend: 'suspend',
    reactivate: 'reactivate',
    activate: 'activate',
    unlock: 'unlock',
    resend: 'resend-link',
  };

  setNationalAdminConfirmModal({ open: false, actionType: '', targetId: null });

  try {
    if (actionType === 'delete') {
      const res = await apiFetch(`/national-admin-management/${targetId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData, 'Delete failed.'));
      }
    } else {
      const path = actionPathMap[actionType];
      if (!path) return;
      const res = await apiFetch(`/national-admin-management/${targetId}/${path}`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData, 'Action failed.'));
      }
    }
    await fetchNationalAdmins(true);
  } catch (err) {
    setFetchError(err.message || 'Something went wrong.');
  }
}
  function handleCancelConfirm() {
    setNationalAdminConfirmModal({ open: false, actionType: '', targetId: null });
  }

  // Calculate statistics (Display: Active, Suspended, Locked)
  const activeCount = nationalAdmins.filter((a) => computeAdminStatus(a) === 'Active').length;
  const suspendedCount = nationalAdmins.filter((a) => {
    const s = computeAdminStatus(a);
    return s === 'Suspended' || s === 'Suspend';
  }).length;
  const lockedCount = nationalAdmins.filter((a) => computeAdminStatus(a) === 'Locked').length;

  // Filter & Search
  const filteredNationalAdmins = nationalAdmins.filter((a) => {
    const dispStatus = computeAdminStatus(a);
    const matchesStatus =
      nationalAdminStatusFilter === 'All' ||
      dispStatus === nationalAdminStatusFilter ||
      (nationalAdminStatusFilter === 'Suspended' && dispStatus === 'Suspend');
    const query = nationalAdminSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      a.email.toLowerCase().includes(query) ||
      (a.fullname && a.fullname.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  // Pagination calculation
  const totalItems = filteredNationalAdmins.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const displayedAdmins = filteredNationalAdmins.slice(startIndex, startIndex + limit);

  return (
    <div className="NAMMainContainer">
      <Sidebar sidebarType="NATIONAL_ADMIN" />
      <div className="NAMContentContainer">
        <TopBar topbarType="NATIONAL_ADMIN" />
        <div className="NAMMainfeed">
          <div className="NAMPageContainer">
            {/* Header */}
            <div className="NAMPageHeader">
              <div className="NAMPageTitleBlock">
                <h2 className="NAMPageTitle">National Admin Management</h2>
                <p className="NAMPageSubtitle">
                  Manage National Admin accounts — send invitations, resend links, and control
                  system access.
                </p>
              </div>
              <button className="NAMAddBtn" onClick={handleOpenAddModal}>
                <Plus size={18} />
                Add New National Admin
              </button>
            </div>

            {/* Statistics Cards (Required: Active, Suspended, Locked) */}
            <div className="NAMStatsRow">
              <div className="NAMStatCard nam-stat-active">
                <span className="NAMStatValue">{activeCount}</span>
                <span className="NAMStatLabel">Active</span>
              </div>
              <div className="NAMStatCard nam-stat-suspended">
                <span className="NAMStatValue">{suspendedCount}</span>
                <span className="NAMStatLabel">Suspended</span>
              </div>
              <div className="NAMStatCard nam-stat-locked">
                <span className="NAMStatValue">{lockedCount}</span>
                <span className="NAMStatLabel">Locked</span>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="NAMFiltersContainer">
              <div className="NAMSearchWrapper">
                <Search size={16} className="NAMSearchIcon" />
                <input
                  type="text"
                  className="NAMSearchInput"
                  placeholder="Search by name or email..."
                  value={nationalAdminSearchQuery}
                  onChange={(e) => {
                    setNationalAdminSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {nationalAdminSearchQuery && (
                  <button
                    className="NAMClearSearch"
                    onClick={() => {
                      setNationalAdminSearchQuery('');
                      setCurrentPage(1);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="NAMFilterGroup">
                <div className="NAMFilterItem">
                  <span className="NAMFilterLabel">STATUS</span>
                  <select
                    className="NAMSelectFilter"
                    value={nationalAdminStatusFilter}
                    onChange={(e) => {
                      setNationalAdminStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Locked">Locked</option>
                    <option value="Invited">Invited</option>
                    <option value="Resend Requested">Resend Requested</option>
                    <option value="Link Expired">Link Expired</option>
                    <option value="Pending Approval">Pending Approval</option>
                  </select>
                </div>

                {(nationalAdminSearchQuery !== '' || nationalAdminStatusFilter !== 'All') && (
                  <button
                    className="NAMBtnClearFiltersIcon"
                    aria-label="Clear Filters"
                    title="Clear Filters"
                    onClick={() => {
                      setNationalAdminSearchQuery('');
                      setNationalAdminStatusFilter('All');
                      setCurrentPage(1);
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="NAMTableWrapper">
              <table className="NAMTable">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Invitation Date</th>
                    <th>Status</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {nationalAdminLoading ? (
                    <tr>
                      <td colSpan={6} className="NAMNoResults">
                        Loading National Admin records…
                      </td>
                    </tr>
                  ) : displayedAdmins.length > 0 ? (
                    displayedAdmins.map((admin, idx) => (
                      <tr key={admin.id}>
                        <td className="NAMTdCenter">{startIndex + idx + 1}</td>
                        <td>{admin.fullname || <span className="NAMEmpty">-</span>}</td>
                        <td className="NAMEmailCell">{admin.email}</td>
                        <td>
                          {admin.invitation_date
                            ? formatDate(admin.invitation_date)
                            : <span className="NAMSystemCreatedTag">System Created</span>}
                        </td>
                        <td>
                          <NationalAdminStatusBadge status={admin} />
                        </td>
                        <td>
                          {myUserId !== null ? (
                          <NationalAdminActionDropdown
                            nationalAdmin={admin}
                            isSelf={admin.id === myUserId} 
                            isOpen={nationalAdminActiveDropdownId === admin.id}
                            toggleDropdown={() =>
                              setNationalAdminActiveDropdownId(
                                nationalAdminActiveDropdownId === admin.id ? null : admin.id
                              )
                            }
                            onAction={(type) => openConfirm(type, admin.id)}
                            onView={() => setNationalAdminViewAdmin(admin)}
                          />
                           ) : (
                            <span className="NAMActionsPlaceholder">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="NAMNoResults">
                        No National Admin records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {!nationalAdminLoading && filteredNationalAdmins.length > 0 && (
                <div className="NAMPaginationWrapper">
                  <span className="NAMPaginationInfo">
                    Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems} entries
                  </span>
                  <div className="NAMPaginationControls">
                    <button
                      className="NAMPaginationBtn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`NAMPaginationPageNumber ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      className="NAMPaginationBtn"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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

      {/* Add Modal */}
      <AddNationalAdminModal
        open={nationalAdminAddModalOpen}
        onClose={() => setNationalAdminAddModalOpen(false)}
        onAddSuccess={handleAddSuccess}
      />

      {/* Confirmation Modal */}
      <NationalAdminConfirmModal
        open={nationalAdminConfirmModal.open}
        actionType={nationalAdminConfirmModal.actionType}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
      />

      {/* View Details Modal */}
      <NationalAdminViewModal
        open={!!nationalAdminViewAdmin}
        nationalAdmin={nationalAdminViewAdmin}
        onClose={() => setNationalAdminViewAdmin(null)}
      />
    </div>
  );
}