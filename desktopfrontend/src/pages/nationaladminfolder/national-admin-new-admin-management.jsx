import './national-admin-css.css';
import { useState, useEffect, useRef } from 'react';
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

// Initial realistic mock accounts for National Admin
const INITIAL_NATIONAL_ADMINS = [
  {
    id: 'na-001',
    first_name: 'Kristine',
    last_name: 'Santos',
    fullname: 'Kristine Santos',
    email: 'kristine.santos@everifymo.gov.ph',
    invitation_date: '2026-01-15',
    expiration_date: '2026-01-17',
    status: 'Active',
    is_locked: false,
    role: 'National Administrator',
  },
  {
    id: 'na-002',
    first_name: 'Alexander',
    last_name: 'Reyes',
    fullname: 'Alexander Reyes',
    email: 'alex.reyes@everifymo.gov.ph',
    invitation_date: '2026-02-01',
    expiration_date: '2026-02-03',
    status: 'Active',
    is_locked: false,
    role: 'National Administrator',
  },
  {
    id: 'na-003',
    first_name: 'Maria Elena',
    last_name: 'Bautista',
    fullname: 'Maria Elena Bautista',
    email: 'maria.bautista@everifymo.gov.ph',
    invitation_date: '2026-02-14',
    expiration_date: '2026-02-16',
    status: 'Suspended',
    is_locked: false,
    role: 'National Administrator',
  },
  {
    id: 'na-004',
    first_name: 'Jonathan',
    last_name: 'Cruz',
    fullname: 'Jonathan Cruz',
    email: 'jonathan.cruz@everifymo.gov.ph',
    invitation_date: '2026-02-20',
    expiration_date: '2026-02-22',
    status: 'Locked',
    is_locked: true,
    role: 'National Administrator',
  },
  {
    id: 'na-005',
    first_name: 'Patricia',
    last_name: 'Villanueva',
    fullname: 'Patricia Villanueva',
    email: 'patricia.villanueva@everifymo.gov.ph',
    invitation_date: '2026-02-28',
    expiration_date: '2026-03-02',
    status: 'Active',
    is_locked: false,
    role: 'National Administrator',
  },
  {
    id: 'na-006',
    first_name: 'Eduardo',
    last_name: 'Mendoza',
    fullname: 'Eduardo Mendoza',
    email: 'eduardo.mendoza@everifymo.gov.ph',
    invitation_date: '2026-03-01',
    expiration_date: '2026-03-03',
    status: 'Invited',
    is_locked: false,
    role: 'National Administrator',
  },
  {
    id: 'na-007',
    first_name: 'Corazon',
    last_name: 'Aquino',
    fullname: 'Corazon Aquino',
    email: 'cory.aquino@everifymo.gov.ph',
    invitation_date: '2026-02-10',
    expiration_date: '2026-02-12',
    status: 'Link Expired',
    is_locked: false,
    role: 'National Administrator',
  },
  {
    id: 'na-008',
    first_name: 'Danilo',
    last_name: 'Gutierrez',
    fullname: 'Danilo Gutierrez',
    email: 'danilo.gutierrez@everifymo.gov.ph',
    invitation_date: '2026-03-04',
    expiration_date: '2026-03-06',
    status: 'Pending Approval',
    is_active: false,
    is_locked: false,
    role: 'National Administrator',
  },
];

export function computeAdminStatus(admin) {
  if (!admin) return '';
  const rawStatus = (admin.status || '').toString().trim().toLowerCase();

  // 1. Pending Approval check (must be recognized before generic active/inactive logic)
  if (rawStatus === 'pending_approval' || rawStatus === 'pending approval') {
    return 'Pending Approval';
  }

  // 2. Locked must take precedence over Active
  // Condition: status == active && is_active == true && is_locked == true
  if (
    (rawStatus === 'active' && admin.is_active === true && admin.is_locked === true) ||
    rawStatus === 'locked' ||
    (admin.is_locked === true && rawStatus === 'active' && admin.is_active !== false)
  ) {
    return 'Locked';
  }

  // 3. Suspended: status == active && is_active == false
  if (
    (rawStatus === 'active' && admin.is_active === false) ||
    rawStatus === 'suspended' ||
    rawStatus === 'suspend'
  ) {
    return 'Suspended';
  }

  // 4. Active: status == active && is_active == true && is_locked != true
  if (
    rawStatus === 'active' ||
    (!rawStatus && admin.is_active === true && !admin.is_locked)
  ) {
    return 'Active';
  }

  // 5. Invited / Resend Requested / Link Expired
  if (
    rawStatus === 'invited' ||
    rawStatus === 'resend requested' ||
    rawStatus === 'resend_requested' ||
    rawStatus === 'link expired' ||
    rawStatus === 'link_expired'
  ) {
    let isExpired = false;
    if (typeof admin.is_token_expired === 'boolean') {
      isExpired = admin.is_token_expired;
    } else if (typeof admin.token_expired === 'boolean') {
      isExpired = admin.token_expired;
    } else if (admin.expiration_date || admin.expires_at) {
      const expDate = new Date(admin.expiration_date || admin.expires_at);
      if (!isNaN(expDate.getTime())) {
        isExpired = expDate.getTime() < Date.now();
      }
    } else if (
      rawStatus === 'link expired' ||
      rawStatus === 'link_expired' ||
      rawStatus === 'resend requested' ||
      rawStatus === 'resend_requested'
    ) {
      isExpired = true;
    }

    const hasResendRequest =
      admin.resend_requested_at !== null && admin.resend_requested_at !== undefined;

    if (hasResendRequest && isExpired) {
      return 'Resend Requested';
    }
    if (!hasResendRequest && isExpired) {
      return 'Link Expired';
    }
    return 'Invited';
  }

  return admin.status || 'Active';
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
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const upward = spaceBelow < 170;
      setOpenUpward(upward);
      setMenuPos({
        top: upward ? Math.max(8, rect.top - 150) : rect.bottom + 4,
        left: Math.max(8, rect.right - 190),
      });
    }
    toggleDropdown();
  };

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
            className={`NAMDropdownMenu ${openUpward ? 'open-upward' : ''}`}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              zIndex: 9999,
              width: '165px',
            }}
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
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [sending, setSending] = useState(false);

  function handleClose() {
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setEmail('');
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setSuccessMsg('');
    setSending(false);
    onClose();
  }

  function handleSend() {
    let hasError = false;
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');

    if (!firstName.trim()) {
      setFirstNameError('First Name is required.');
      hasError = true;
    }

    if (!lastName.trim()) {
      setLastNameError('Last Name is required.');
      hasError = true;
    }

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

    // Simulate sending invitation with interactive state update
    setTimeout(() => {
      setSending(false);
      setSuccessMsg(`National Admin invitation email has been sent to ${email.trim()}`);
      const parts = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean);
      onAddSuccess({
        id: `na-${Date.now()}`,
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        fullname: parts.join(' '),
        email: email.trim(),
        invitation_date: new Date().toISOString().split('T')[0],
        expiration_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Invited',
        is_locked: false,
        role: 'National Administrator',
      });
    }, 600);
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
            {/* Row 1: Name Fields (3 columns) */}
            <div className="NAMFieldRow3">
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
                <label className="NAMLabel">Middle Name</label>
                <div className="NAMInputWrapper">
                  <User className="NAMInputIcon" size={16} />
                  <input
                    type="text"
                    className="NAMInput with-icon"
                    placeholder="Optional"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    disabled={sending}
                  />
                </div>
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
                <span className="NAMVDValue">{nationalAdmin.invitation_date || '-'}</span>
              </div>
              {showExpiration && (
                <div className="NAMVDField">
                  <span className="NAMVDLabel">Expiration Date</span>
                  <span className="NAMVDValue">{nationalAdmin.expiration_date || '-'}</span>
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
  const [nationalAdmins, setNationalAdmins] = useState(INITIAL_NATIONAL_ADMINS);
  const [nationalAdminLoading, setNationalAdminLoading] = useState(false);
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

  function handleAddSuccess(newAdmin) {
    setNationalAdmins((prev) => [newAdmin, ...prev]);
  }

  function openConfirm(actionType, adminId) {
    setNationalAdminConfirmModal({ open: true, actionType, targetId: adminId });
  }

  function handleConfirmAction() {
    const { actionType, targetId } = nationalAdminConfirmModal;

    setNationalAdmins((prev) =>
      prev
        .map((admin) => {
          if (admin.id !== targetId) return admin;

          switch (actionType) {
            case 'suspend':
              return { ...admin, status: 'Suspended', is_active: false };
            case 'reactivate':
            case 'activate':
              return { ...admin, status: 'Active', is_active: true, is_locked: false };
            case 'unlock':
              return { ...admin, status: 'Active', is_active: true, is_locked: false };
            case 'resend':
              return {
                ...admin,
                status: 'Invited',
                invitation_date: new Date().toISOString().split('T')[0],
              };
            default:
              return admin;
          }
        })
        .filter((admin) => (actionType === 'delete' ? admin.id !== targetId : true))
    );

    setNationalAdminConfirmModal({ open: false, actionType: '', targetId: null });
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
                        <td>{admin.invitation_date || <span className="NAMEmpty">-</span>}</td>
                        <td>
                          <NationalAdminStatusBadge status={admin} />
                        </td>
                        <td>
                          <NationalAdminActionDropdown
                            nationalAdmin={admin}
                            isSelf={false}
                            isOpen={nationalAdminActiveDropdownId === admin.id}
                            toggleDropdown={() =>
                              setNationalAdminActiveDropdownId(
                                nationalAdminActiveDropdownId === admin.id ? null : admin.id
                              )
                            }
                            onAction={(type) => openConfirm(type, admin.id)}
                            onView={() => setNationalAdminViewAdmin(admin)}
                          />
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
