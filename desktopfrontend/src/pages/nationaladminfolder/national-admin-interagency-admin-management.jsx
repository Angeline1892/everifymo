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
  RotateCcw,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Fingerprint,
  Phone,
  Building2,
  MapPin,
  Briefcase,
  AlertCircle,
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

export function computeAdminStatus(admin) {
  if (!admin) return '';
  const rawStatus = (admin.status || '').toString().trim().toLowerCase();

  // 1. Pending Approval check (must be recognized before generic active/inactive logic)
  if (rawStatus === 'pending_approval' || rawStatus === 'pending approval') {
    return 'Pending Approval';
  }

  // 2. Locked must take precedence over Active
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

const REGIONAL_ADMIN_STATUS_META = {
  Invited: { label: 'Invited', className: 'nam-badge-invited' },
  'Link Expired': { label: 'Link Expired', className: 'nam-badge-expired' },
  'Resend Requested': { label: 'Resend Requested', className: 'nam-badge-pending' },
  Active: { label: 'Active', className: 'nam-badge-active' },
  Suspended: { label: 'Suspended', className: 'nam-badge-suspended' },
  Suspend: { label: 'Suspended', className: 'nam-badge-suspended' },
  'Pending Approval': { label: 'Pending Approval', className: 'nam-badge-pending' },
  Locked: { label: 'Locked', className: 'nam-badge-locked' },
};

function RegionalAdminStatusBadge({ status }) {
  const statusStr = typeof status === 'object' && status !== null ? computeAdminStatus(status) : status;
  const meta = REGIONAL_ADMIN_STATUS_META[statusStr] || { label: statusStr, className: '' };
  return <span className={`NAMStatusBadge ${meta.className}`}>{meta.label}</span>;
}

function RegionalAdminActionDropdown({
  regionalAdmin,
  isSelf,
  isOpen,
  toggleDropdown,
  onAction,
  onView,
}) {
  const status = computeAdminStatus(regionalAdmin);
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

            {['Resend Requested', 'Link Expired'].includes(status) && (
              <button
                className="NAMDropdownItem"
                onClick={() => {
                  onAction('resend');
                  toggleDropdown();
                }}
              >
                <Send size={14} /> Resend Link
              </button>
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
          </div>,
          document.body
        )}
    </div>
  );
}

const REGIONAL_ADMIN_CONFIRM_MESSAGES = {
  resend: {
    title: 'Resend Invitation Link',
    message: 'Are you sure you want to resend the account invitation link to this administrator?',
    confirmLabel: 'Resend Link',
  },
  suspend: {
    title: 'Suspend Account',
    message:
      'Are you sure you want to suspend this administrator account? The user will temporarily lose workspace access.',
    confirmLabel: 'Suspend Account',
  },
  reactivate: {
    title: 'Reactivate Account',
    message:
      'Are you sure you want to reactivate this administrator account? Access will be restored immediately.',
    confirmLabel: 'Reactivate Account',
  },
  activate: {
    title: 'Activate Administrator Account',
    message:
      'Are you sure you want to activate this administrator account? Access will be granted immediately.',
    confirmLabel: 'Activate Account',
  },
  delete: {
    title: 'Delete Administrator Account',
    message:
      'Are you sure you want to delete this administrator account entry? This action cannot be undone.',
    confirmLabel: 'Delete Account',
  },
  unlock: {
    title: 'Unlock Administrator Account',
    message:
      'Are you sure you want to unlock this administrator account? Access will be restored immediately.',
    confirmLabel: 'Unlock Account',
  },
};

function RegionalAdminConfirmModal({ open, actionType, onConfirm, onCancel }) {
  if (!open) return null;
  const meta = REGIONAL_ADMIN_CONFIRM_MESSAGES[actionType] || {};

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

function AddRegionalAdminModal({ open, onClose, onAddSuccess, regions, regionsLoading, regionsError }) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    agency: '',
    regionId: '',
    department: '',
    position: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function resetForm() {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      employeeId: '',
      contactNumber: '',
      email: '',
      agency: '',
      regionId: '',
      department: '',
      position: '',
    });
    setFormErrors({});
    setSuccessMsg('');
    setSending(false);
    setSubmitError('');
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleInputChange(e) {
    const { name, value } = e.target;

    if (name === 'contactNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
      if (formErrors[name]) {
        setFormErrors((prev) => ({ ...prev, [name]: '' }));
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function validate() {
    const errors = {};

    if (!formData.firstName.trim()) errors.firstName = 'First Name is required.';
    if (!formData.lastName.trim()) errors.lastName = 'Last Name is required.';

    if (!formData.contactNumber.trim()) {
      errors.contactNumber = 'Contact Number is required.';
    } else if (formData.contactNumber.length !== 11) {
      errors.contactNumber = 'Contact Number must be exactly 11 digits (e.g. 09XXXXXXXXX).';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email Address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address.';
      }
    }

    if (!formData.agency) errors.agency = 'Agency is required. Please select FDA or LEA-CIDG.';
    if (!formData.regionId) errors.regionId = 'Region is required. Please select an agency region.';

    return errors;
  }

  async function handleSend() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setSending(true);
    setSubmitError('');

    try {
      const res = await apiFetch('/admin-management/by-national-admin', {
        method: 'POST',
        body: JSON.stringify({
          first_name: formData.firstName.trim(),
          middle_name: formData.middleName.trim() || null,
          last_name: formData.lastName.trim(),
          email: formData.email.trim(),
          contact_number: formData.contactNumber.trim() || null,
          employee_id: formData.employeeId.trim() || null,
          position: formData.position.trim() || null,
          department: formData.department.trim() || null,
          region_id: formData.regionId,
          agency: formData.agency,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData, 'Failed to create administrator account.'));
      }

      setSuccessMsg(`Invitation has been sent to ${formData.email.trim()}`);
      onAddSuccess(); // triggers a refetch of the real list
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong.');
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
          <h3 className="NAMModalTitle">Add Admin</h3>
          <p className="NAMModalSubtitle">
            Create an administrator account for FDA or LEA-CIDG personnel.
          </p>
        </div>

        {!successMsg ? (
          <>
            {/* Row 1: Name Fields */}
            <div className="NAMFieldRow3">
              <div className="NAMFormGroup">
                <label className="NAMLabel">
                  First Name <span className="NAMRequired">*</span>
                </label>
                <div className="NAMInputWrapper">
                  <User className="NAMInputIcon" size={16} />
                  <input
                    type="text"
                    name="firstName"
                    className={`NAMInput with-icon ${formErrors.firstName ? 'input-error' : ''}`}
                    placeholder="e.g. Juan"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={sending}
                    autoFocus
                  />
                </div>
                {formErrors.firstName && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {formErrors.firstName}
                  </span>
                )}
              </div>

              <div className="NAMFormGroup">
                <label className="NAMLabel">Middle Name</label>
                <div className="NAMInputWrapper">
                  <User className="NAMInputIcon" size={16} />
                  <input
                    type="text"
                    name="middleName"
                    className="NAMInput with-icon"
                    placeholder="Optional"
                    value={formData.middleName}
                    onChange={handleInputChange}
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
                    name="lastName"
                    className={`NAMInput with-icon ${formErrors.lastName ? 'input-error' : ''}`}
                    placeholder="e.g. Dela Cruz"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={sending}
                  />
                </div>
                {formErrors.lastName && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {formErrors.lastName}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Employee ID & Contact Number */}
            <div className="NAMFieldRow">
              <div className="NAMFormGroup">
                <label className="NAMLabel">Employee ID</label>
                <div className="NAMInputWrapper">
                  <Fingerprint className="NAMInputIcon" size={16} />
                  <input
                    type="text"
                    name="employeeId"
                    className={`NAMInput with-icon ${formErrors.employeeId ? 'input-error' : ''}`}
                    placeholder="e.g. EMP-2026-001"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    disabled={sending}
                  />
                </div>
                {formErrors.employeeId && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {formErrors.employeeId}
                  </span>
                )}
              </div>

              <div className="NAMFormGroup">
                <label className="NAMLabel">
                  Contact Number <span className="NAMRequired">*</span>
                </label>
                <div className="NAMInputWrapper">
                  <Phone className="NAMInputIcon" size={16} />
                  <input
                    type="text"
                    name="contactNumber"
                    className={`NAMInput with-icon ${formErrors.contactNumber ? 'input-error' : ''}`}
                    placeholder="09XXXXXXXXX"
                    maxLength={11}
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    disabled={sending}
                  />
                </div>
                {formErrors.contactNumber && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {formErrors.contactNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Row 3: Email Address */}
            <div className="NAMFormGroup">
              <label className="NAMLabel">
                Email Address <span className="NAMRequired">*</span>
              </label>
              <div className="NAMInputWrapper">
                <Mail className="NAMInputIcon" size={16} />
                <input
                  type="email"
                  name="email"
                  className={`NAMInput with-icon ${formErrors.email ? 'input-error' : ''}`}
                  placeholder="e.g. admin.officer@agency.gov.ph"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={sending}
                />
              </div>
              {formErrors.email && (
                <span className="NAMFieldError">
                  <AlertCircle size={12} /> {formErrors.email}
                </span>
              )}
            </div>

            {/* Row 4: Agency & Region Selection */}
            <div className="NAMFieldRow">
              <div className="NAMFormGroup">
                <label className="NAMLabel">
                  Agency <span className="NAMRequired">*</span>
                </label>
                <div className="NAMInputWrapper">
                  <Building2 className="NAMInputIcon" size={16} />
                  <select
                    name="agency"
                    className={`NAMSelect with-icon ${formErrors.agency ? 'input-error' : ''}`}
                    value={formData.agency}
                    onChange={handleInputChange}
                    disabled={sending}
                  >
                    <option value="">Select Agency</option>
                    <option value="FDA">Food and Drug Administration (FDA)</option>
                    <option value="LEA-CIDG">Law Enforcement Agency (LEA-CIDG)</option>
                  </select>
                </div>
                {formErrors.agency && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {formErrors.agency}
                  </span>
                )}
              </div>

              <div className="NAMFormGroup">
                <label className="NAMLabel">
                  Region <span className="NAMRequired">*</span>
                </label>
                <div className="NAMInputWrapper">
                  <MapPin className="NAMInputIcon" size={16} />
                  <select
                    name="regionId"
                    className={`NAMSelect with-icon ${formErrors.regionId ? 'input-error' : ''}`}
                    value={formData.regionId}
                    onChange={handleInputChange}
                    disabled={sending || regionsLoading}
                  >
                    <option value="">
                      {regionsLoading ? 'Loading regions…' : 'Select Region'}
                    </option>
                    {regions.map((r) => (
                      <option key={r.region_id} value={r.region_id}>
                        {r.region_name}
                      </option>
                    ))}
                  </select>
                </div>
                {formErrors.regionId && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {formErrors.regionId}
                  </span>
                )}
                {regionsError && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {regionsError}
                  </span>
                )}
              </div>
            </div>

            {/* Row 5: Department & Position */}
            <div className="NAMFieldRow">
              <div className="NAMFormGroup">
                <label className="NAMLabel">Department</label>
                <div className="NAMInputWrapper">
                  <Building2 className="NAMInputIcon" size={16} />
                  <input
                    type="text"
                    name="department"
                    className={`NAMInput with-icon ${formErrors.department ? 'input-error' : ''}`}
                    placeholder="e.g. Operations Division"
                    value={formData.department}
                    onChange={handleInputChange}
                    disabled={sending}
                  />
                </div>
                {formErrors.department && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {formErrors.department}
                  </span>
                )}
              </div>

              <div className="NAMFormGroup">
                <label className="NAMLabel">Position</label>
                <div className="NAMInputWrapper">
                  <Briefcase className="NAMInputIcon" size={16} />
                  <input
                    type="text"
                    name="position"
                    className={`NAMInput with-icon ${formErrors.position ? 'input-error' : ''}`}
                    placeholder="e.g. Regional Admin Officer"
                    value={formData.position}
                    onChange={handleInputChange}
                    disabled={sending}
                  />
                </div>
                {formErrors.position && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {formErrors.position}
                  </span>
                )}
              </div>
            </div>

            {submitError && (
              <span className="NAMFieldError">
                <AlertCircle size={12} /> {submitError}
              </span>
            )}

            <div className="NAMModalFooter">
              <button className="NAMCancelBtn" onClick={handleClose} disabled={sending}>
                Cancel
              </button>
              <button
                className="NAMConfirmBtn primary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? 'Sending Invitation…' : 'Send Invitation'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="NAMSuccessBox">
              <div className="NAMSuccessIcon">🎉</div>
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

function RegionalAdminViewModal({ open, regionalAdmin, onClose }) {
  if (!open || !regionalAdmin) return null;

  const resolvedFullName =
    regionalAdmin.fullname ||
    [regionalAdmin.first_name, regionalAdmin.middle_name, regionalAdmin.last_name].filter(Boolean).join(' ') ||
    '-';

  return (
    <div className="NAMModalOverlay">
      <div className="NAMModal NAMViewModal">
        <div className="NAMModalHeader">
          <div className="NAMViewTitleRow">
            <Building2 size={24} color="#0D9488" />
            <h3 className="NAMModalTitle">Admin Details</h3>
          </div>
          <p className="NAMModalSubtitle">Viewing profile and agency assignment details.</p>
        </div>

        <div className="NAMViewBody">
          <div className="NAMViewDetails">
            <div className="NAMVDGrid three-col">
              <div className="NAMVDField">
                <span className="NAMVDLabel">First Name</span>
                <span className="NAMVDValue">{regionalAdmin.first_name || '-'}</span>
              </div>
              <div className="NAMVDField">
                <span className="NAMVDLabel">Middle Name</span>
                <span className="NAMVDValue">{regionalAdmin.middle_name || '-'}</span>
              </div>
              <div className="NAMVDField">
                <span className="NAMVDLabel">Last Name</span>
                <span className="NAMVDValue">{regionalAdmin.last_name || '-'}</span>
              </div>

              <div className="NAMVDField full-span">
                <span className="NAMVDLabel">Full Name</span>
                <span className="NAMVDValue">{resolvedFullName}</span>
              </div>

              <div className="NAMVDField">
                <span className="NAMVDLabel">Employee ID</span>
                <span className="NAMVDValue">{regionalAdmin.employee_id || '-'}</span>
              </div>
              <div className="NAMVDField">
                <span className="NAMVDLabel">Contact Number</span>
                <span className="NAMVDValue">{regionalAdmin.contact_number || '-'}</span>
              </div>

              <div className="NAMVDField full-span">
                <span className="NAMVDLabel">Email Address</span>
                <span className="NAMVDValue NAMEmailCell">{regionalAdmin.email || '-'}</span>
              </div>

              <div className="NAMVDField">
                <span className="NAMVDLabel">Agency</span>
                <span className="NAMVDValue">
                  <span
                    className={`NAMAgencyBadge ${
                      regionalAdmin.agency === 'FDA' ? 'nam-agency-fda' : 'nam-agency-lea'
                    }`}
                  >
                    {regionalAdmin.agency || '-'}
                  </span>
                </span>
              </div>
              <div className="NAMVDField">
                <span className="NAMVDLabel">Region</span>
                <span className="NAMVDValue">{regionalAdmin.region || '-'}</span>
              </div>

              <div className="NAMVDField">
                <span className="NAMVDLabel">Department</span>
                <span className="NAMVDValue">{regionalAdmin.department || '-'}</span>
              </div>
              <div className="NAMVDField">
                <span className="NAMVDLabel">Position</span>
                <span className="NAMVDValue">{regionalAdmin.position || '-'}</span>
              </div>

              <div className="NAMVDField full-span">
                <span className="NAMVDLabel">Account Status</span>
                <span className="NAMVDValue">
                  <RegionalAdminStatusBadge status={regionalAdmin} />
                </span>
              </div>
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


export default function NationalAdminRegionalAdminManagement() {
  const [regionalAdmins, setRegionalAdmins] = useState([]);
  const [regionalAdminLoading, setRegionalAdminLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [myUserId, setMyUserId] = useState(null);

  const [regions, setRegions] = useState([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState('');

  const [regionalAdminStatusFilter, setRegionalAdminStatusFilter] = useState('All');
  const [regionalAdminAgencyFilter, setRegionalAdminAgencyFilter] = useState('All');
  const [regionalAdminSearchQuery, setRegionalAdminSearchQuery] = useState('');
  const [regionalAdminViewAdmin, setRegionalAdminViewAdmin] = useState(null);
  const [regionalAdminActiveDropdownId, setRegionalAdminActiveDropdownId] = useState(null);
  const [regionalAdminAddModalOpen, setRegionalAdminAddModalOpen] = useState(false);
  const [regionalAdminConfirmModal, setRegionalAdminConfirmModal] = useState({
    open: false,
    actionType: '',
    targetId: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // fetchRegionalAdmins — add the silent param
  const fetchRegionalAdmins = useCallback(async (silent = false) => {
    if (!silent) setRegionalAdminLoading(true);
    setFetchError('');
    try {
      const res = await apiFetch('/admin-management');
      if (!res.ok) throw new Error('Failed to load administrator records.');
      const data = await res.json();
      setRegionalAdmins(
        data.map((a) => ({
          id: a.user_id,
          first_name: a.first_name,
          middle_name: a.middle_name,
          last_name: a.last_name,
          fullname: [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(' '),
          email: a.email,
          agency: a.agency,
          region: a.region,
          department: a.department,
          position: a.position,
          employee_id: a.employee_id,
          contact_number: a.contact_number,
          invitation_date: a.invitation_date,
          expiration_date: a.expiration_date,
          status: a.status,
          is_locked: a.is_locked,
        }))
      );
    } catch (err) {
      setFetchError(err.message || 'Something went wrong.');
    } finally {
      if (!silent) setRegionalAdminLoading(false);
    }
  }, []);

  const fetchRegions = useCallback(async () => {
    setRegionsLoading(true);
    setRegionsError('');
    try {
      const res = await apiFetch('/regions');
      if (!res.ok) throw new Error('Failed to load regions.');
      const data = await res.json();
      setRegions(data);
    } catch (err) {
      setRegionsError(err.message || 'Failed to load regions.');
    } finally {
      setRegionsLoading(false);
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
    fetchRegionalAdmins();
    fetchRegions();
    fetchMyProfile();
  }, [fetchRegionalAdmins, fetchRegions, fetchMyProfile]);

  // Outside click listener for dropdown close
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        !event.target.closest('.NAMDropdownWrapper') &&
        !event.target.closest('.NAMDropdownMenu')
      ) {
        setRegionalAdminActiveDropdownId(null);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  function handleOpenAddModal() {
    setRegionalAdminAddModalOpen(true);
  }

  function handleAddSuccess() {
    fetchRegionalAdmins(true);
  }

  function openConfirm(actionType, adminId) {
    setRegionalAdminConfirmModal({ open: true, actionType, targetId: adminId });
  }

  async function handleConfirmAction() {
    const { actionType, targetId } = regionalAdminConfirmModal;
    const actionPathMap = {
      suspend: 'suspend',
      reactivate: 'reactivate',
      activate: 'activate',
      unlock: 'unlock',
      resend: 'resend-link',
    };

    setRegionalAdminConfirmModal({ open: false, actionType: '', targetId: null });

    try {
      if (actionType === 'delete') {
        const res = await apiFetch(`/admin-management/${targetId}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(extractErrorMessage(errData, 'Delete failed.'));
        }
      } else {
        const path = actionPathMap[actionType];
        if (!path) return;
        const res = await apiFetch(`/admin-management/${targetId}/${path}`, { method: 'POST' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(extractErrorMessage(errData, 'Action failed.'));
        }
      }
      await fetchRegionalAdmins(true);
    } catch (err) {
      setFetchError(err.message || 'Something went wrong.');
    }
  }

  function handleCancelConfirm() {
    setRegionalAdminConfirmModal({ open: false, actionType: '', targetId: null });
  }

  // Statistics calculation (Required: Active, Suspended, Locked)
  const activeCount = regionalAdmins.filter((a) => computeAdminStatus(a) === 'Active').length;
  const suspendedCount = regionalAdmins.filter((a) => {
    const s = computeAdminStatus(a);
    return s === 'Suspended' || s === 'Suspend';
  }).length;
  const lockedCount = regionalAdmins.filter((a) => computeAdminStatus(a) === 'Locked').length;

  // Filter & Search
  const filteredRegionalAdmins = regionalAdmins.filter((a) => {
    const dispStatus = computeAdminStatus(a);
    const matchesStatus =
      regionalAdminStatusFilter === 'All' ||
      dispStatus === regionalAdminStatusFilter ||
      (regionalAdminStatusFilter === 'Suspended' && dispStatus === 'Suspend');
    const matchesAgency =
      regionalAdminAgencyFilter === 'All' || a.agency === regionalAdminAgencyFilter;
    const query = regionalAdminSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (a.email && a.email.toLowerCase().includes(query)) ||
      (a.fullname && a.fullname.toLowerCase().includes(query)) ||
      (a.region && a.region.toLowerCase().includes(query)) ||
      (a.department && a.department.toLowerCase().includes(query)) ||
      (a.position && a.position.toLowerCase().includes(query));
    return matchesStatus && matchesAgency && matchesSearch;
  });

  // Pagination calculation
  const totalItems = filteredRegionalAdmins.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const displayedAdmins = filteredRegionalAdmins.slice(startIndex, startIndex + limit);

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
                <h2 className="NAMPageTitle">Inter-Agency Admin Management</h2>
                <p className="NAMPageSubtitle">
                  Manage Inter-Agency Administrator accounts for FDA and LEA-CIDG.
                </p>
              </div>
              <button className="NAMAddBtn" onClick={handleOpenAddModal}>
                <Plus size={18} />
                Add Inter-Agency Admin
              </button>
            </div>

            {fetchError && (
              <div className="NAMFieldError" style={{ marginBottom: '12px' }}>
                <AlertCircle size={12} /> {fetchError}
              </div>
            )}

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

            {/* Filters Bar */}
            <div className="NAMFiltersContainer">
              <div className="NAMSearchWrapper">
                <Search size={16} className="NAMSearchIcon" />
                <input
                  type="text"
                  className="NAMSearchInput"
                  placeholder="Search by name, email, department..."
                  value={regionalAdminSearchQuery}
                  onChange={(e) => {
                    setRegionalAdminSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {regionalAdminSearchQuery && (
                  <button
                    className="NAMClearSearch"
                    onClick={() => {
                      setRegionalAdminSearchQuery('');
                      setCurrentPage(1);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="NAMFilterGroup">
                <div className="NAMFilterItem">
                  <span className="NAMFilterLabel">AGENCY</span>
                  <select
                    className="NAMSelectFilter"
                    value={regionalAdminAgencyFilter}
                    onChange={(e) => {
                      setRegionalAdminAgencyFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All Agencies</option>
                    <option value="FDA">FDA</option>
                    <option value="LEA-CIDG">LEA-CIDG</option>
                  </select>
                </div>

                <div className="NAMFilterItem">
                  <span className="NAMFilterLabel">STATUS</span>
                  <select
                    className="NAMSelectFilter"
                    value={regionalAdminStatusFilter}
                    onChange={(e) => {
                      setRegionalAdminStatusFilter(e.target.value);
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

                {(regionalAdminSearchQuery !== '' ||
                  regionalAdminStatusFilter !== 'All' ||
                  regionalAdminAgencyFilter !== 'All') && (
                  <button
                    className="NAMBtnClearFiltersIcon"
                    aria-label="Clear Filters"
                    title="Clear Filters"
                    onClick={() => {
                      setRegionalAdminSearchQuery('');
                      setRegionalAdminStatusFilter('All');
                      setRegionalAdminAgencyFilter('All');
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
                    <th>Agency</th>
                    <th>Region</th>
                    <th>Status</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalAdminLoading ? (
                    <tr>
                      <td colSpan={7} className="NAMNoResults">
                        Loading administrator records…
                      </td>
                    </tr>
                  ) : displayedAdmins.length > 0 ? (
                    displayedAdmins.map((admin, idx) => (
                      <tr key={admin.id}>
                        <td className="NAMTdCenter">{startIndex + idx + 1}</td>
                        <td>{admin.fullname || <span className="NAMEmpty">-</span>}</td>
                        <td className="NAMEmailCell">{admin.email}</td>
                        <td>
                          <span
                            className={`NAMAgencyBadge ${
                              admin.agency === 'FDA' ? 'nam-agency-fda' : 'nam-agency-lea'
                            }`}
                          >
                            {admin.agency}
                          </span>
                        </td>
                        <td>{admin.region || <span className="NAMEmpty">-</span>}</td>
                        <td>
                          <RegionalAdminStatusBadge status={admin} />
                        </td>
                        <td>
                          {myUserId !== null ? (
                          <RegionalAdminActionDropdown
                            regionalAdmin={admin}
                            isSelf={admin.id === myUserId}
                            isOpen={regionalAdminActiveDropdownId === admin.id}
                            toggleDropdown={() =>
                              setRegionalAdminActiveDropdownId(
                                regionalAdminActiveDropdownId === admin.id ? null : admin.id
                              )
                            }
                            onAction={(type) => openConfirm(type, admin.id)}
                            onView={() => setRegionalAdminViewAdmin(admin)}
                          />
                          ) : (
                            <span className="NAMActionsPlaceholder">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="NAMNoResults">
                        No administrator records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {!regionalAdminLoading && filteredRegionalAdmins.length > 0 && (
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

      {/* Add Regional Admin Modal */}
      <AddRegionalAdminModal
        open={regionalAdminAddModalOpen}
        onClose={() => setRegionalAdminAddModalOpen(false)}
        onAddSuccess={handleAddSuccess}
        regions={regions}
        regionsLoading={regionsLoading}
        regionsError={regionsError}
      />

      {/* Confirmation Modal */}
      <RegionalAdminConfirmModal
        open={regionalAdminConfirmModal.open}
        actionType={regionalAdminConfirmModal.actionType}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
      />

      {/* View Details Modal */}
      <RegionalAdminViewModal
        open={!!regionalAdminViewAdmin}
        regionalAdmin={regionalAdminViewAdmin}
        onClose={() => setRegionalAdminViewAdmin(null)}
      />
    </div>
  );
}