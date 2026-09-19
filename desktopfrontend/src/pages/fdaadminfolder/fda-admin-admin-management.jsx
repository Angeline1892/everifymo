// desktopfrontend/src/pages/fdaadminfolder/fda-admin-admin-management.jsx
import './fda-admin-css.css';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../../utils/apiFetch';
import {
  Send,
  UserCheck,
  UserX,
  TriangleAlert,
  CircleCheckBig,
  Mail,
  Eye,
  Trash2,
  MoreVertical,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  CheckCircle2,
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

// Status badge: backend (`compute_display_status`) already returns the final
// label, so we no longer re-derive it from raw is_active/is_locked flags.
const STATUS_META = {
  Invited: { label: 'Invited', className: 'badge-pending' },
  Active: { label: 'Active', className: 'badge-active' },
  Suspended: { label: 'Suspended', className: 'badge-suspended' },
  'Resend Requested': { label: 'Resend Requested', className: 'badge-pending' },
  'Link Expired': { label: 'Link Expired', className: 'badge-expired' },
  'Pending Approval': { label: 'Pending Approval', className: 'badge-pending' },
  Locked: { label: 'Locked', className: 'badge-locked' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, className: '' };
  return <span className={`FDAAdminStatusBadge ${meta.className}`}>{meta.label}</span>;
}

function AdminMgmtActionDropdown({ admin, isSelf, isOpen, toggleDropdown, onAction, onView }) {
  const [openUpward, setOpenUpward] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const displayStatus = admin.status;

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
        minWidth: '175px',
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
        minWidth: '175px',
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
    <div className={`FDAAdminDropdownWrapper ${isOpen ? 'active-open' : ''}`}>
      <button
        ref={triggerRef}
        className="FDAAdminDropdownTrigger"
        data-tooltip="Actions"
        title="More Actions"
        onClick={handleToggle}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen &&
        createPortal(
          <div
            className={`FDAAdminDropdownMenu ${openUpward ? 'open-upward' : ''}`}
            ref={menuRef}
            style={menuStyle}
          >
            <button className="FDAAdminDropdownItem" onClick={() => { onView(); toggleDropdown(); }}>
              <Eye size={14} /> View Details
            </button>

            {displayStatus === 'Active' && !isSelf && (
              <button className="FDAAdminDropdownItem danger" onClick={() => { onAction('suspend'); toggleDropdown(); }}>
                <UserX size={14} /> Suspend Account
              </button>
            )}

            {displayStatus === 'Suspended' && !isSelf && (
              <button className="FDAAdminDropdownItem primary-action" onClick={() => { onAction('reactivate'); toggleDropdown(); }}>
                <RotateCcw size={14} /> Reactivate Account
              </button>
            )}

            {displayStatus === 'Pending Approval' && (
              <button className="FDAAdminDropdownItem primary-action" onClick={() => { onAction('activate'); toggleDropdown(); }}>
                <CheckCircle2 size={14} /> Activate Account
              </button>
            )}

            {['Resend Requested', 'Link Expired'].includes(displayStatus) && (
              <button className="FDAAdminDropdownItem" onClick={() => { onAction('resend'); toggleDropdown(); }}>
                <Send size={14} /> Resend Link
              </button>
            )}

            {displayStatus === 'Link Expired' && (
              <>
                <div className="FDAAdminDropdownDivider" />
                <button className="FDAAdminDropdownItem danger" onClick={() => { onAction('delete'); toggleDropdown(); }}>
                  <Trash2 size={14} /> Delete Account
                </button>
              </>
            )}

            {displayStatus === 'Locked' && (
              <button className="FDAAdminDropdownItem primary-action" onClick={() => { onAction('unlock'); toggleDropdown(); }}>
                <UserCheck size={14} /> Unlock Account
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

const CONFIRM_MESSAGES = {
  resend: {
    title: 'Resend Admin Invitation',
    message: 'Are you sure you want to resend the registration link to this administrator?',
    confirmLabel: 'Resend Link',
  },
  suspend: {
    title: 'Suspend Admin Account',
    message: 'Are you sure you want to suspend this administrator account? The user will temporarily lose administrative access.',
    confirmLabel: 'Suspend Account',
  },
  reactivate: {
    title: 'Reactivate Admin Account',
    message: 'Are you sure you want to reactivate this administrator account? Administrative access will be restored immediately.',
    confirmLabel: 'Reactivate Account',
  },
  delete: {
    title: 'Delete Admin Account',
    message: 'Are you sure you want to delete this administrator account entry? This action cannot be undone.',
    confirmLabel: 'Delete Account',
  },
  unlock: {
    title: 'Unlock Admin Account',
    message: 'Are you sure you want to unlock this administrator account? Access will be restored.',
    confirmLabel: 'Unlock Account',
  },
  activate: {
    title: 'Activate Admin Account',
    message: 'Are you sure you want to activate this administrator account? Administrative access will be granted immediately.',
    confirmLabel: 'Activate Account',
  },
};

function ConfirmModal({ open, actionType, onConfirm, onCancel }) {
  if (!open) return null;
  const meta = CONFIRM_MESSAGES[actionType] || {};
  const isDestructive = actionType === 'suspend' || actionType === 'delete';

  return (
    <div className="FDAAdminModalOverlay">
      <div className="FDAAdminModal" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          {isDestructive ? (
            <TriangleAlert size={44} color="#d97706" strokeWidth={2.5} />
          ) : (
            <CircleCheckBig size={44} color="#0d9488" strokeWidth={2.5} />
          )}
        </div>
        <h3 className="FDAAdminModalTitle" style={{ textAlign: 'center' }}>{meta.title}</h3>
        <p className="FDAAdminModalSubtitle" style={{ marginTop: '8px', marginBottom: '24px' }}>
          {meta.message}
        </p>
        <div className="FDAAdminModalFooter center-footer" style={{ border: 'none', padding: 0 }}>
          <button className="FDAAdminCancelBtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`FDAAdminConfirmBtn ${isDestructive ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// 2-step Add Admin flow — wired to POST /admin-management/by-fellow-admin.
// Agency + region are derived server-side from the logged-in admin, but we
// now also fetch and DISPLAY the real values here (via GET /profile),
// passed down as the `myProfile` prop, instead of hardcoded placeholder text.
function AddAdminFlow({ open, onClose, onCreated, myProfile }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    department: '',
    position: '',
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      setStep(1);
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        employeeId: '',
        contactNumber: '',
        email: '',
        department: '',
        position: '',
      });
      setErrors({});
      setSubmitError('');
      setSending(false);
    }
  }, [open]);

  if (!open) return null;

  // Real agency/region of the current logged-in admin, fetched via /profile
  // by the parent component. Falls back to "Loading…" until it resolves.
  const agencyDisplay = myProfile ? `${myProfile.agency} Admin` : 'Loading…';
  const regionDisplay = myProfile?.region || 'Loading…';

  function validate() {
    const errs = {};
    if (!formData.firstName.trim()) errs.firstName = 'First Name is required.';
    if (!formData.lastName.trim()) errs.lastName = 'Last Name is required.';

    if (!formData.contactNumber.trim()) {
      errs.contactNumber = 'Contact Number is required.';
    } else {
      const digits = formData.contactNumber.replace(/\D/g, '');
      if (digits.length !== 11 || !digits.startsWith('09')) {
        errs.contactNumber = 'Enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).';
      }
    }

    if (!formData.email.trim()) {
      errs.email = 'Email Address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errs.email = 'Please enter a valid email address.';
      }
    }

    return errs;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setStep(2);
  }

  async function handleFinalConfirm() {
    setSending(true);
    setSubmitError('');
    try {
      const res = await apiFetch('/admin-management/by-fellow-admin', {
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
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData, 'Failed to send invitation.'));
      }

      onCreated(formData.email.trim(), [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' '));
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong.');
      setStep(1); // let them fix the input
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="FDAAdminModalOverlay">
      {step === 1 ? (
        <div className="FDAAdminModal FDAAdminAddModal">
          <div className="FDAAdminModalHeader">
            <h3 className="FDAAdminModalTitle">Add New FDA Admin</h3>
            <p className="FDAAdminModalSubtitle">
              Provision a new administrative account for FDA workspace operations. The account
              will be added under your current agency and region.
            </p>
            <button className="FDAAdminModalCloseBtn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleFormSubmit}>
            <div className="FDAAdminModalBody">
              <div className="FDAAdminFormRow3">
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">
                    First Name <span className="FDAAdminRequired">*</span>
                  </label>
                  <div className="FDAAdminInputWrapper">
                    <User className="FDAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className={`FDAAdminInput ${errors.firstName ? 'input-error' : ''}`}
                      placeholder="e.g. Gabriel"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  {errors.firstName && (
                    <span className="FDAAdminFieldError">
                      <AlertCircle size={12} /> {errors.firstName}
                    </span>
                  )}
                </div>

                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Middle Name</label>
                  <div className="FDAAdminInputWrapper">
                    <User className="FDAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="FDAAdminInput"
                      placeholder="e.g. Jose (Optional)"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">
                    Last Name <span className="FDAAdminRequired">*</span>
                  </label>
                  <div className="FDAAdminInputWrapper">
                    <User className="FDAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className={`FDAAdminInput ${errors.lastName ? 'input-error' : ''}`}
                      placeholder="e.g. Alvarez"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  {errors.lastName && (
                    <span className="FDAAdminFieldError">
                      <AlertCircle size={12} /> {errors.lastName}
                    </span>
                  )}
                </div>
              </div>

              <div className="FDAAdminFormRow">
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Employee ID</label>
                  <div className="FDAAdminInputWrapper">
                    <Fingerprint className="FDAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="FDAAdminInput"
                      placeholder="e.g. FDA-ADM-0104 (Optional)"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">
                    Contact Number <span className="FDAAdminRequired">*</span>
                  </label>
                  <div className="FDAAdminInputWrapper">
                    <Phone className="FDAAdminInputIcon" size={17} />
                    <input
                      type="tel"
                      maxLength={11}
                      className={`FDAAdminInput ${errors.contactNumber ? 'input-error' : ''}`}
                      placeholder="e.g. 09171234567"
                      value={formData.contactNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData({ ...formData, contactNumber: val });
                      }}
                    />
                  </div>
                  {errors.contactNumber && (
                    <span className="FDAAdminFieldError">
                      <AlertCircle size={12} /> {errors.contactNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">
                  Email Address <span className="FDAAdminRequired">*</span>
                </label>
                <div className="FDAAdminInputWrapper">
                  <Mail className="FDAAdminInputIcon" size={17} />
                  <input
                    type="email"
                    className={`FDAAdminInput ${errors.email ? 'input-error' : ''}`}
                    placeholder="e.g. gabriel.alvarez@fda.gov.ph"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {errors.email && (
                  <span className="FDAAdminFieldError">
                    <AlertCircle size={12} /> {errors.email}
                  </span>
                )}
              </div>

              <div className="FDAAdminFormRow">
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Agency</label>
                  <div className="FDAAdminInputWrapper">
                    <Building2 className="FDAAdminInputIcon" size={17} />
                    <input type="text" className="FDAAdminInput readonly-input" value={agencyDisplay} readOnly disabled />
                  </div>
                </div>
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Region</label>
                  <div className="FDAAdminInputWrapper">
                    <MapPin className="FDAAdminInputIcon" size={17} />
                    <input type="text" className="FDAAdminInput readonly-input" value={regionDisplay} readOnly disabled />
                  </div>
                </div>
              </div>

              <div className="FDAAdminFormRow">
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Department</label>
                  <div className="FDAAdminInputWrapper">
                    <Building2 className="FDAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="FDAAdminInput"
                      placeholder="e.g. Regional Administration (Optional)"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Position</label>
                  <div className="FDAAdminInputWrapper">
                    <Briefcase className="FDAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="FDAAdminInput"
                      placeholder="e.g. Regional Administrator (Optional)"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {submitError && (
                <span className="FDAAdminFieldError">
                  <AlertCircle size={12} /> {submitError}
                </span>
              )}
            </div>

            <div className="FDAAdminModalFooter">
              <button type="button" className="FDAAdminCancelBtn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="FDAAdminConfirmBtn primary">
                Review & Confirm
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="FDAAdminModal" style={{ maxWidth: '480px' }}>
          <div className="FDAAdminModalHeader">
            <h3 className="FDAAdminModalTitle">Confirm Administrator Creation</h3>
            <p className="FDAAdminModalSubtitle">
              Verify administrator credentials before sending the invitation.
            </p>
          </div>

          <div className="FDAAdminModalBody">
            <div className="FDAAdminSummaryNotice">
              <Mail size={18} />
              <span>An invitation link will be emailed to this address. The account stays <strong>Invited</strong> until it's accepted.</span>
            </div>

            <div className="FDAAdminSummaryBox">
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Full Name:</span>
                <span className="FDAAdminSummaryValue">
                  {[formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ') || '-'}
                </span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Employee ID:</span>
                <span className="FDAAdminSummaryValue">{formData.employeeId || '-'}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Contact Number:</span>
                <span className="FDAAdminSummaryValue">{formData.contactNumber || '-'}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Email Address:</span>
                <span className="FDAAdminSummaryValue">{formData.email || '-'}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Agency:</span>
                <span className="FDAAdminSummaryValue">
                  <span className="FDAAdminAgencyTag">{agencyDisplay}</span>
                </span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Region:</span>
                <span className="FDAAdminSummaryValue">{regionDisplay}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Department:</span>
                <span className="FDAAdminSummaryValue">{formData.department || '-'}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Position:</span>
                <span className="FDAAdminSummaryValue">{formData.position || '-'}</span>
              </div>
            </div>

            {submitError && (
              <span className="FDAAdminFieldError">
                <AlertCircle size={12} /> {submitError}
              </span>
            )}
          </div>

          <div className="FDAAdminModalFooter">
            <button type="button" className="FDAAdminCancelBtn" onClick={() => setStep(1)} disabled={sending}>
              Go Back
            </button>
            <button type="button" className="FDAAdminConfirmBtn primary" onClick={handleFinalConfirm} disabled={sending}>
              {sending ? 'Sending Invitation…' : 'Confirm / Send Invitation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function ViewAdminModal({ open, admin, onClose }) {
  if (!open || !admin) return null;

  return (
    <div className="FDAAdminModalOverlay">
      <div className="FDAAdminModal FDAAdminViewModal">
        <div className="FDAAdminModalHeader">
          <h3 className="FDAAdminModalTitle">Administrator Details</h3>
          <p className="FDAAdminModalSubtitle">Viewing administrative account information.</p>
          <button className="FDAAdminModalCloseBtn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="FDAAdminModalBody">
          <div className="FDAAdminSummaryBox">
            <div className="FDAAdminVDGrid three-col">
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">First Name</span>
                <span className="FDAAdminVDValue">{admin.first_name || '-'}</span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Middle Name</span>
                <span className="FDAAdminVDValue">{admin.middle_name || '-'}</span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Last Name</span>
                <span className="FDAAdminVDValue">{admin.last_name || '-'}</span>
              </div>

              <div className="FDAAdminVDField full-span">
                <span className="FDAAdminVDLabel">Full Name</span>
                <span className="FDAAdminVDValue">{admin.fullname || '-'}</span>
              </div>

              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Employee ID</span>
                <span className="FDAAdminVDValue">{admin.employee_id || '-'}</span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Contact Number</span>
                <span className="FDAAdminVDValue">{admin.contact_number || '-'}</span>
              </div>

              <div className="FDAAdminVDField full-span">
                <span className="FDAAdminVDLabel">Email Address</span>
                <span className="FDAAdminVDValue FDAAdminEmailCell">{admin.email || '-'}</span>
              </div>

              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Agency</span>
                <span className="FDAAdminVDValue">
                  <span className="FDAAdminAgencyTag">{admin.agency || 'FDA Admin'}</span>
                </span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Region</span>
                <span className="FDAAdminVDValue">{admin.region || '-'}</span>
              </div>

              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Department</span>
                <span className="FDAAdminVDValue">{admin.department || '-'}</span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Position</span>
                <span className="FDAAdminVDValue">{admin.position || '-'}</span>
              </div>

              <div className="FDAAdminVDField full-span">
                <span className="FDAAdminVDLabel">Account Status</span>
                <span className="FDAAdminVDValue">
                  <StatusBadge status={admin.status} />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="FDAAdminModalFooter center-footer">
          <button className="FDAAdminConfirmBtn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FDAAdminAdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Real region/agency of the LOGGED-IN admin, fetched once from GET /profile.
  // Passed into AddAdminFlow so the "Add New FDA Admin" form shows real data
  // instead of the old hardcoded "Same as your region" placeholder text.
  const [myProfile, setMyProfile] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null); 

  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewAdmin, setViewAdmin] = useState(null);
  const [addFlowOpen, setAddFlowOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    actionType: '',
    targetId: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  }

  // `silent`: when true, skips toggling the table-wide `loading` state.
  // Used for refetches triggered by an action (activate/suspend/etc.) so the
  // whole table doesn't flash back to "Loading administrator records…" —
  // only the initial mount-time fetch shows that loading state.
  const fetchAdmins = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError('');
    try {
      const res = await apiFetch('/admin-management');
      if (!res.ok) throw new Error('Failed to load administrator records.');
      const data = await res.json();
      setAdmins(
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
          status: a.status,
          is_locked: a.is_locked,
        }))
      );
    } catch (err) {
      setFetchError(err.message || 'Something went wrong.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchMyProfile = useCallback(async () => {
    try {
      const res = await apiFetch('/profile');
      if (!res.ok) return;
      const data = await res.json();
      setMyProfile(data); 
    } catch (err) {
      console.error('Failed to fetch current admin profile:', err);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchMyProfile();
  }, [fetchAdmins, fetchMyProfile]);

   useEffect(() => {
    function handleOutsideClick(event) {
      if (
        !event.target.closest('.FDAAdminDropdownWrapper') &&
        !event.target.closest('.FDAAdminDropdownMenu')
      ) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  function handleAddAdminSuccess(email) {
    showToast(`Invitation sent to ${email}.`);
    fetchAdmins(true); // silent — table already has data, just refresh it quietly
  }

  function openConfirm(actionType, adminId) {
    setConfirmModal({ open: true, actionType, targetId: adminId });
  }

  async function handleConfirmAction() {
    const { actionType, targetId } = confirmModal;
    const actionPathMap = {
      suspend: 'suspend',
      reactivate: 'reactivate',
      activate: 'activate',
      unlock: 'unlock',
      resend: 'resend-link',
    };

    setConfirmModal({ open: false, actionType: '', targetId: null });

    try {
      if (actionType === 'delete') {
        const res = await apiFetch(`/admin-management/${targetId}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(extractErrorMessage(errData, 'Delete failed.'));
        }
        showToast('Admin entry deleted.');
      } else {
        const path = actionPathMap[actionType];
        if (!path) return;
        const res = await apiFetch(`/admin-management/${targetId}/${path}`, { method: 'POST' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(extractErrorMessage(errData, 'Action failed.'));
        }
        showToast('Account updated.');
      }
      await fetchAdmins(true); // silent — no full-table "Loading…" flash after an action
    } catch (err) {
      showToast(err.message || 'Something went wrong.');
    }
  }

  const filteredAdmins = admins.filter((a) => {
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (a.fullname && a.fullname.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.employee_id && a.employee_id.toLowerCase().includes(q)) ||
      (a.region && a.region.toLowerCase().includes(q)) ||
      (a.department && a.department.toLowerCase().includes(q)) ||
      (a.position && a.position.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const totalItems = filteredAdmins.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const displayedAdmins = filteredAdmins.slice(startIndex, startIndex + limit);

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
                  FDA Admin Management
                  <span className="FDAAdminAgencyTag">FDA Admin</span>
                </h1>
                <p className="FDAAdminPageSubtitle">
                  Manage agency administrators — provision and monitor FDA administrative workspace access.
                </p>
              </div>
              <button
                id="fda-add-admin-btn"
                className="FDAAdminAddBtn"
                onClick={() => setAddFlowOpen(true)}
              >
                <span>＋</span> Add New Admin
              </button>
            </div>

            {fetchError && (
              <div className="FDAAdminFieldError" style={{ marginBottom: '12px' }}>
                <AlertCircle size={12} /> {fetchError}
              </div>
            )}

            <div className="FDAAdminStatsRow">
              {[
                { label: 'Active', value: admins.filter((a) => a.status === 'Active').length, className: 'stat-active' },
                { label: 'Suspended', value: admins.filter((a) => a.status === 'Suspended').length, className: 'stat-suspended' },
                { label: 'Locked', value: admins.filter((a) => a.status === 'Locked').length, className: 'stat-locked' },
              ].map((s) => (
                <div key={s.label} className={`FDAAdminStatCard ${s.className}`}>
                  <span className="FDAAdminStatValue">{s.value}</span>
                  <span className="FDAAdminStatLabel">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="FDAAdminFiltersContainer">
              <div className="FDAAdminSearchGroup">
                <Search size={16} className="FDAAdminSearchIcon" />
                <input
                  type="text"
                  className="FDAAdminSearchInput"
                  placeholder="Search by name, email, employee ID, region..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="FDAAdminFilterControls">
                <div className="FDAAdminFilterItem">
                  <span className="FDAAdminFilterLabel">Status:</span>
                  <select
                    className="FDAAdminSelect"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
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

                {(statusFilter !== 'All' || searchQuery) && (
                  <button
                    className="FDAAdminClearBtn"
                    title="Clear Filters"
                    onClick={() => {
                      setStatusFilter('All');
                      setSearchQuery('');
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
                    <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Employee ID</th>
                    <th>Region</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="FDAAdminEmpty">
                        Loading administrator records…
                      </td>
                    </tr>
                  ) : displayedAdmins.length > 0 ? (
                    displayedAdmins.map((admin, idx) => (
                      <tr key={admin.id}>
                        <td className="FDAAdminTdCenter">{startIndex + idx + 1}</td>
                        <td>
                          <strong>{admin.fullname}</strong>
                        </td>
                        <td className="FDAAdminEmailCell">{admin.email}</td>
                        <td>{admin.employee_id || '-'}</td>
                        <td>{admin.region || '-'}</td>
                        <td>{admin.department || '-'}</td>
                        <td>
                          <StatusBadge status={admin.status} />
                        </td>
                        <td className="FDAAdminTdCenter">
                          {myProfile !== null ? (
                          <AdminMgmtActionDropdown
                            admin={admin}
                            isSelf={admin.id === myProfile?.user_id}
                            isOpen={activeDropdownId === admin.id}                                   
                            toggleDropdown={() =>
                              setActiveDropdownId(activeDropdownId === admin.id ? null : admin.id)    
                            }
                            onAction={(type) => openConfirm(type, admin.id)}
                            onView={() => setViewAdmin(admin)}
                          />
                          ) : (
                            <span className="FDAAdminActionsPlaceholder">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="FDAAdminEmpty">
                        No FDA Administrator accounts found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {!loading && totalItems > 0 && (
                <div className="FDAAdminPaginationWrapper">
                  <span className="FDAAdminPaginationInfo">
                    Showing {startIndex + 1}–{endIndex} of {totalItems} admin entries
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

      <AddAdminFlow
        open={addFlowOpen}
        onClose={() => setAddFlowOpen(false)}
        onCreated={handleAddAdminSuccess}
        myProfile={myProfile}
      />

      <ConfirmModal
        open={confirmModal.open}
        actionType={confirmModal.actionType}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ open: false, actionType: '', targetId: null })}
      />

      <ViewAdminModal
        open={!!viewAdmin}
        admin={viewAdmin}
        onClose={() => setViewAdmin(null)}
      />

      {toastMessage && (
        <div className="FDAAdminToast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}