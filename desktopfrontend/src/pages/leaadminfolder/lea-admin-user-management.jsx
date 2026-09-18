// desktopfrontend/src/pages/leaadminfolder/lea-admin-user-management.jsx
import './lea-admin-css.css';
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
  KeyRound,
  Edit3,
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

// Personnel never reach "Pending Approval" — that state only applies to
// admin-management. Personnel go Invited -> Active (or Invited ->
// Resend Requested / Link Expired if they don't act in time).
const STATUS_META = {
  Invited: { label: 'Invited', className: 'badge-pending' },
  Active: { label: 'Active', className: 'badge-active' },
  Suspended: { label: 'Suspended', className: 'badge-suspended' },
  'Resend Requested': { label: 'Resend Requested', className: 'badge-pending' },
  'Link Expired': { label: 'Link Expired', className: 'badge-expired' },
  Locked: { label: 'Locked', className: 'badge-locked' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, className: '' };
  return <span className={`LEAAdminStatusBadge ${meta.className}`}>{meta.label}</span>;
}

function UserMgmtActionDropdown({ user, onAction, onView, onEdit, onResetPassword }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const displayStatus = user.status;

  function openMenu() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const upward = spaceBelow < 220;
    setMenuPos({
      top: upward ? Math.max(8, rect.top - 200) : rect.bottom + 6,
      left: Math.max(8, rect.right - 185),
    });
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleOutsideClick(event) {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        triggerRef.current && !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className={`LEAAdminDropdownWrapper ${isOpen ? 'active-open' : ''}`}>
      <button
        ref={triggerRef}
        className="LEAAdminDropdownTrigger"
        data-tooltip="Actions"
        title="More Actions"
        onClick={(e) => {
          e.stopPropagation();
          isOpen ? setIsOpen(false) : openMenu();
        }}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen &&
        createPortal(
          <div
            className="LEAAdminDropdownMenu"
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          >
            <button
              className="LEAAdminDropdownItem"
              onClick={() => {
                onView();
                setIsOpen(false);
              }}
            >
              <Eye size={14} /> View Details
            </button>

            {/* Active -> Edit Profile, Reset Password, Suspend.
                Personnel have no self-edit/self-reset rights (see profile.py),
                so both actions live here, performed by their agency admin. */}
            {displayStatus === 'Active' && (
              <>
                <button
                  className="LEAAdminDropdownItem"
                  onClick={() => {
                    onEdit();
                    setIsOpen(false);
                  }}
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
                <button
                  className="LEAAdminDropdownItem"
                  onClick={() => {
                    onResetPassword();
                    setIsOpen(false);
                  }}
                >
                  <KeyRound size={14} /> Reset Password
                </button>
                <div className="LEAAdminDropdownDivider" />
                <button
                  className="LEAAdminDropdownItem danger"
                  onClick={() => {
                    onAction('suspend');
                    setIsOpen(false);
                  }}
                >
                  <UserX size={14} /> Suspend Account
                </button>
              </>
            )}

            {displayStatus === 'Suspended' && (
              <button
                className="LEAAdminDropdownItem primary-action"
                onClick={() => {
                  onAction('reactivate');
                  setIsOpen(false);
                }}
              >
                <RotateCcw size={14} /> Reactivate Account
              </button>
            )}

            {['Resend Requested', 'Link Expired'].includes(displayStatus) && (
              <button
                className="LEAAdminDropdownItem"
                onClick={() => {
                  onAction('resend');
                  setIsOpen(false);
                }}
              >
                <Send size={14} /> Resend Link
              </button>
            )}

            {displayStatus === 'Link Expired' && (
              <>
                <div className="LEAAdminDropdownDivider" />
                <button
                  className="LEAAdminDropdownItem danger"
                  onClick={() => {
                    onAction('delete');
                    setIsOpen(false);
                  }}
                >
                  <Trash2 size={14} /> Delete Account
                </button>
              </>
            )}

            {displayStatus === 'Locked' && (
              <button
                className="LEAAdminDropdownItem primary-action"
                onClick={() => {
                  onAction('unlock');
                  setIsOpen(false);
                }}
              >
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
  suspend: {
    title: 'Suspend Account',
    message: 'Are you sure you want to suspend this personnel account? The user will temporarily lose access to the system.',
    confirmLabel: 'Suspend Account',
  },
  reactivate: {
    title: 'Reactivate Account',
    message: 'Are you sure you want to reactivate this personnel account? System access will be restored immediately.',
    confirmLabel: 'Reactivate Account',
  },
  delete: {
    title: 'Delete Account',
    message: 'Are you sure you want to delete this personnel account entry? This action cannot be undone.',
    confirmLabel: 'Delete Account',
  },
  unlock: {
    title: 'Unlock Account',
    message: 'Are you sure you want to unlock this personnel account? Access will be restored.',
    confirmLabel: 'Unlock Account',
  },
  resend: {
    title: 'Resend Invitation Link',
    message: 'Are you sure you want to resend the registration link to this personnel account?',
    confirmLabel: 'Resend Link',
  },
  resetPassword: {
    title: 'Reset Account Password',
    message: 'Are you sure you want to reset the password for this active personnel account? A temporary password will be emailed to them.',
    confirmLabel: 'Reset Password',
  },
};

function ConfirmModal({ open, actionType, onConfirm, onCancel }) {
  if (!open) return null;
  const meta = CONFIRM_MESSAGES[actionType] || {};
  const isDestructive = actionType === 'suspend' || actionType === 'delete';
  const isKey = actionType === 'resetPassword';

  return (
    <div className="LEAAdminModalOverlay">
      <div className="LEAAdminModal" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          {isDestructive ? (
            <TriangleAlert size={44} color="#d97706" strokeWidth={2.5} />
          ) : isKey ? (
            <KeyRound size={44} color="#2563eb" strokeWidth={2.5} />
          ) : (
            <CircleCheckBig size={44} color="#2563eb" strokeWidth={2.5} />
          )}
        </div>
        <h3 className="LEAAdminModalTitle" style={{ textAlign: 'center' }}>{meta.title}</h3>
        <p className="LEAAdminModalSubtitle" style={{ marginTop: '8px', marginBottom: '24px' }}>
          {meta.message}
        </p>
        <div className="LEAAdminModalFooter center-footer" style={{ border: 'none', padding: 0 }}>
          <button className="LEAAdminCancelBtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`LEAAdminConfirmBtn ${isDestructive ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// 2-step Add Personnel flow — wired to POST /personnel-management.
// Region + agency are derived server-side from the logged-in admin, but we
// now also fetch and DISPLAY the real values here (via GET /profile), passed
// down as the `myProfile` prop, instead of hardcoded placeholder text.
function AddPersonnelFlow({ open, onClose, onCreated, myProfile }) {
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
  const agencyDisplay = myProfile ? `${myProfile.agency} Personnel` : 'Loading…';
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
        errs.contactNumber = 'Enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 09181234567).';
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
      const res = await apiFetch('/personnel-management', {
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

      onCreated(formData.email.trim());
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong.');
      setStep(1);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="LEAAdminModalOverlay">
      {step === 1 ? (
        <div className="LEAAdminModal LEAAdminAddModal">
          <div className="LEAAdminModalHeader">
            <h3 className="LEAAdminModalTitle">Add Personnel Account</h3>
            <p className="LEAAdminModalSubtitle">
              Register a new LEA-CIDG Personnel account under your current agency and region.
            </p>
            <button className="LEAAdminModalCloseBtn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleFormSubmit}>
            <div className="LEAAdminModalBody">
              <div className="LEAAdminFormRow3">
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">
                    First Name <span className="LEAAdminRequired">*</span>
                  </label>
                  <div className="LEAAdminInputWrapper">
                    <User className="LEAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className={`LEAAdminInput ${errors.firstName ? 'input-error' : ''}`}
                      placeholder="e.g. Cardo"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  {errors.firstName && (
                    <span className="LEAAdminFieldError">
                      <AlertCircle size={12} /> {errors.firstName}
                    </span>
                  )}
                </div>

                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Middle Name</label>
                  <div className="LEAAdminInputWrapper">
                    <User className="LEAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="LEAAdminInput"
                      placeholder="e.g. Santos (Optional)"
                      value={formData.middleName}
                      onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">
                    Last Name <span className="LEAAdminRequired">*</span>
                  </label>
                  <div className="LEAAdminInputWrapper">
                    <User className="LEAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className={`LEAAdminInput ${errors.lastName ? 'input-error' : ''}`}
                      placeholder="e.g. Dalisay"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  {errors.lastName && (
                    <span className="LEAAdminFieldError">
                      <AlertCircle size={12} /> {errors.lastName}
                    </span>
                  )}
                </div>
              </div>

              <div className="LEAAdminFormRow">
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Employee ID</label>
                  <div className="LEAAdminInputWrapper">
                    <Fingerprint className="LEAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="LEAAdminInput"
                      placeholder="e.g. CIDG-2026-091 (Optional)"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    />
                  </div>
                </div>

                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">
                    Contact Number <span className="LEAAdminRequired">*</span>
                  </label>
                  <div className="LEAAdminInputWrapper">
                    <Phone className="LEAAdminInputIcon" size={17} />
                    <input
                      type="tel"
                      maxLength={11}
                      className={`LEAAdminInput ${errors.contactNumber ? 'input-error' : ''}`}
                      placeholder="e.g. 09181234567"
                      value={formData.contactNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                        setFormData({ ...formData, contactNumber: val });
                      }}
                    />
                  </div>
                  {errors.contactNumber && (
                    <span className="LEAAdminFieldError">
                      <AlertCircle size={12} /> {errors.contactNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">
                  Email Address <span className="LEAAdminRequired">*</span>
                </label>
                <div className="LEAAdminInputWrapper">
                  <Mail className="LEAAdminInputIcon" size={17} />
                  <input
                    type="email"
                    className={`LEAAdminInput ${errors.email ? 'input-error' : ''}`}
                    placeholder="e.g. cardo.dalisay@cidg.pnp.gov.ph"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                {errors.email && (
                  <span className="LEAAdminFieldError">
                    <AlertCircle size={12} /> {errors.email}
                  </span>
                )}
              </div>

              <div className="LEAAdminFormRow">
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Agency</label>
                  <div className="LEAAdminInputWrapper">
                    <Building2 className="LEAAdminInputIcon" size={17} />
                    <input type="text" className="LEAAdminInput readonly-input" value={agencyDisplay} readOnly disabled />
                  </div>
                </div>
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Region</label>
                  <div className="LEAAdminInputWrapper">
                    <MapPin className="LEAAdminInputIcon" size={17} />
                    <input type="text" className="LEAAdminInput readonly-input" value={regionDisplay} readOnly disabled />
                  </div>
                </div>
              </div>

              <div className="LEAAdminFormRow">
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Department</label>
                  <div className="LEAAdminInputWrapper">
                    <Building2 className="LEAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="LEAAdminInput"
                      placeholder="e.g. Criminal Investigation Division (Optional)"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Position</label>
                  <div className="LEAAdminInputWrapper">
                    <Briefcase className="LEAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="LEAAdminInput"
                      placeholder="e.g. Lead Investigator (Optional)"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {submitError && (
                <span className="LEAAdminFieldError">
                  <AlertCircle size={12} /> {submitError}
                </span>
              )}
            </div>

            <div className="LEAAdminModalFooter">
              <button type="button" className="LEAAdminCancelBtn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="LEAAdminConfirmBtn primary">
                Review & Confirm
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="LEAAdminModal" style={{ maxWidth: '480px' }}>
          <div className="LEAAdminModalHeader">
            <h3 className="LEAAdminModalTitle">Confirm Personnel Registration</h3>
            <p className="LEAAdminModalSubtitle">
              Verify the details below before sending the invitation.
            </p>
          </div>

          <div className="LEAAdminModalBody">
            <div className="LEAAdminSummaryNotice">
              <Mail size={18} />
              <span>An invitation link will be emailed to this address. The account stays <strong>Invited</strong> until it's accepted.</span>
            </div>

            <div className="LEAAdminSummaryBox">
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Full Name:</span>
                <span className="LEAAdminSummaryValue">
                  {[formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ') || '-'}
                </span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Employee ID:</span>
                <span className="LEAAdminSummaryValue">{formData.employeeId || '-'}</span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Contact Number:</span>
                <span className="LEAAdminSummaryValue">{formData.contactNumber || '-'}</span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Email Address:</span>
                <span className="LEAAdminSummaryValue">{formData.email || '-'}</span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Agency:</span>
                <span className="LEAAdminSummaryValue">
                  <span className="LEAAdminAgencyTag">{agencyDisplay}</span>
                </span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Region:</span>
                <span className="LEAAdminSummaryValue">{regionDisplay}</span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Department:</span>
                <span className="LEAAdminSummaryValue">{formData.department || '-'}</span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Position:</span>
                <span className="LEAAdminSummaryValue">{formData.position || '-'}</span>
              </div>
            </div>

            {submitError && (
              <span className="LEAAdminFieldError">
                <AlertCircle size={12} /> {submitError}
              </span>
            )}
          </div>

          <div className="LEAAdminModalFooter">
            <button type="button" className="LEAAdminCancelBtn" onClick={() => setStep(1)} disabled={sending}>
              Go Back
            </button>
            <button type="button" className="LEAAdminConfirmBtn primary" onClick={handleFinalConfirm} disabled={sending}>
              {sending ? 'Sending Invitation…' : 'Confirm / Send Invitation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


function EditProfileModal({ open, user, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '',
    employeeId: '', contactNumber: '', department: '', position: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.first_name || '',
        middleName: user.middle_name || '',
        lastName: user.last_name || '',
        employeeId: user.employee_id || '',
        contactNumber: user.contact_number || '',
        department: user.department || '',
        position: user.position || '',
      });
      setErrors({});
      setSubmitError('');
    }
  }, [user]);

  if (!open || !user) return null;

  function validate() {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First Name is required.';
    if (!form.lastName.trim()) errs.lastName = 'Last Name is required.';
    if (!form.contactNumber.trim()) {
      errs.contactNumber = 'Contact Number is required.';
    } else {
      const digits = form.contactNumber.replace(/\D/g, '');
      if (digits.length !== 11 || !digits.startsWith('09')) {
        errs.contactNumber = 'Enter a valid 11-digit Philippine mobile number starting with 09.';
      }
    }
    return errs;
  }

  async function handleSave(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    setSubmitError('');
    try {
      const body = {
        first_name: form.firstName.trim(),
        middle_name: form.middleName.trim() || null, // middle_name is the ONLY field allowed to be blanked
        last_name: form.lastName.trim(),
        contact_number: form.contactNumber.trim() || null,
      };

      // These three are optional-at-creation but NOT blankable on edit —
      // only include them if they actually have a value, otherwise the
      // backend rejects the whole request with "X is required and cannot be blank."
      if (form.employeeId.trim()) body.employee_id = form.employeeId.trim();
      if (form.department.trim()) body.department = form.department.trim();
      if (form.position.trim()) body.position = form.position.trim();

      const res = await apiFetch(`/personnel-management/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(extractErrorMessage(errData, 'Failed to update profile.'));
      }
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="LEAAdminModalOverlay">
      <div className="LEAAdminModal LEAAdminAddModal">
        <div className="LEAAdminModalHeader">
          <h3 className="LEAAdminModalTitle">Edit Personnel Profile</h3>
          <p className="LEAAdminModalSubtitle">Update account details for this officer.</p>
          <button className="LEAAdminModalCloseBtn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="LEAAdminModalBody">
            <div className="LEAAdminFormRow3">
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">
                  First Name <span className="LEAAdminRequired">*</span>
                </label>
                <div className="LEAAdminInputWrapper">
                  <User className="LEAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className={`LEAAdminInput ${errors.firstName ? 'input-error' : ''}`}
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                {errors.firstName && (
                  <span className="LEAAdminFieldError">
                    <AlertCircle size={12} /> {errors.firstName}
                  </span>
                )}
              </div>

              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Middle Name</label>
                <div className="LEAAdminInputWrapper">
                  <User className="LEAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="LEAAdminInput"
                    placeholder="(Optional)"
                    value={form.middleName}
                    onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                  />
                </div>
              </div>

              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">
                  Last Name <span className="LEAAdminRequired">*</span>
                </label>
                <div className="LEAAdminInputWrapper">
                  <User className="LEAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className={`LEAAdminInput ${errors.lastName ? 'input-error' : ''}`}
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
                {errors.lastName && (
                  <span className="LEAAdminFieldError">
                    <AlertCircle size={12} /> {errors.lastName}
                  </span>
                )}
              </div>
            </div>

            <div className="LEAAdminFormRow">
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Employee ID</label>
                <div className="LEAAdminInputWrapper">
                  <Fingerprint className="LEAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="LEAAdminInput"
                    placeholder="(Optional)"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  />
                </div>
              </div>

              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">
                  Contact Number <span className="LEAAdminRequired">*</span>
                </label>
                <div className="LEAAdminInputWrapper">
                  <Phone className="LEAAdminInputIcon" size={17} />
                  <input
                    type="tel"
                    maxLength={11}
                    className={`LEAAdminInput ${errors.contactNumber ? 'input-error' : ''}`}
                    value={form.contactNumber}
                    onChange={(e) => setForm({ ...form, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                  />
                </div>
                {errors.contactNumber && (
                  <span className="LEAAdminFieldError">
                    <AlertCircle size={12} /> {errors.contactNumber}
                  </span>
                )}
              </div>
            </div>

            <div className="LEAAdminFormGroup">
              <label className="LEAAdminLabel">Email (read-only)</label>
              <div className="LEAAdminInputWrapper">
                <Mail className="LEAAdminInputIcon" size={17} />
                <input type="email" className="LEAAdminInput readonly-input" value={user.email} readOnly disabled />
              </div>
            </div>

            <div className="LEAAdminFormRow">
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Agency (read-only)</label>
                <div className="LEAAdminInputWrapper">
                  <Building2 className="LEAAdminInputIcon" size={17} />
                  <input type="text" className="LEAAdminInput readonly-input" value={user.agency || 'LEA Personnel'} readOnly disabled />
                </div>
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Region (read-only)</label>
                <div className="LEAAdminInputWrapper">
                  <MapPin className="LEAAdminInputIcon" size={17} />
                  <input type="text" className="LEAAdminInput readonly-input" value={user.region || '-'} readOnly disabled />
                </div>
              </div>
            </div>

            <div className="LEAAdminFormRow">
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Department</label>
                <div className="LEAAdminInputWrapper">
                  <Building2 className="LEAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="LEAAdminInput"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  />
                </div>
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Position</label>
                <div className="LEAAdminInputWrapper">
                  <Briefcase className="LEAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="LEAAdminInput"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {submitError && (
              <span className="LEAAdminFieldError">
                <AlertCircle size={12} /> {submitError}
              </span>
            )}
          </div>
          <div className="LEAAdminModalFooter">
            <button type="button" className="LEAAdminCancelBtn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="LEAAdminConfirmBtn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewPersonnelModal({ open, user, onClose }) {
  if (!open || !user) return null;
  return (
    <div className="LEAAdminModalOverlay">
      <div className="LEAAdminModal LEAAdminViewModal">
        <div className="LEAAdminModalHeader">
          <h3 className="LEAAdminModalTitle">Personnel Details</h3>
          <p className="LEAAdminModalSubtitle">Viewing profile information for this LEA officer.</p>
          <button className="LEAAdminModalCloseBtn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="LEAAdminModalBody">
          <div className="LEAAdminSummaryBox">
            <div className="LEAAdminVDGrid three-col">
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">First Name</span>
                <span className="LEAAdminVDValue">{user.first_name || '-'}</span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Middle Name</span>
                <span className="LEAAdminVDValue">{user.middle_name || '-'}</span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Last Name</span>
                <span className="LEAAdminVDValue">{user.last_name || '-'}</span>
              </div>

              <div className="LEAAdminVDField full-span">
                <span className="LEAAdminVDLabel">Full Name</span>
                <span className="LEAAdminVDValue">{user.fullname || '-'}</span>
              </div>

              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Employee ID</span>
                <span className="LEAAdminVDValue">{user.employee_id || '-'}</span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Contact Number</span>
                <span className="LEAAdminVDValue">{user.contact_number || '-'}</span>
              </div>

              <div className="LEAAdminVDField full-span">
                <span className="LEAAdminVDLabel">Email Address</span>
                <span className="LEAAdminVDValue LEAAdminEmailCell">{user.email || '-'}</span>
              </div>

              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Agency</span>
                <span className="LEAAdminVDValue">
                  <span className="LEAAdminAgencyTag">{user.agency || 'LEA Personnel'}</span>
                </span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Region</span>
                <span className="LEAAdminVDValue">{user.region || '-'}</span>
              </div>

              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Department</span>
                <span className="LEAAdminVDValue">{user.department || '-'}</span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Position</span>
                <span className="LEAAdminVDValue">{user.position || '-'}</span>
              </div>

              <div className="LEAAdminVDField full-span">
                <span className="LEAAdminVDLabel">Account Status</span>
                <span className="LEAAdminVDValue">
                  <StatusBadge status={user.status} />
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="LEAAdminModalFooter center-footer">
          <button className="LEAAdminConfirmBtn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LEAAdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Real region/agency of the LOGGED-IN admin, fetched once from GET /profile.
  // Passed into AddPersonnelFlow so the "Add Personnel Account" form shows
  // real data instead of the old hardcoded "Same as your region" text.
  const [myProfile, setMyProfile] = useState(null);

  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
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
  // Used for refetches triggered by an action (activate/suspend/reset
  // password/etc.) so the whole table doesn't flash back to "Loading
  // personnel records…" — only the initial mount-time fetch shows that.
  const fetchPersonnel = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setFetchError('');
    try {
      const res = await apiFetch('/personnel-management');
      if (!res.ok) throw new Error('Failed to load personnel records.');
      const data = await res.json();
      setUsers(
        data.map((u) => ({
          id: u.user_id,
          first_name: u.first_name,
          middle_name: u.middle_name,
          last_name: u.last_name,
          fullname: [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' '),
          email: u.email,
          agency: u.agency,
          region: u.region,
          department: u.department,
          position: u.position,
          employee_id: u.employee_id,
          contact_number: u.contact_number,
          status: u.status,
          is_locked: u.is_locked,
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
      setMyProfile(data); // { region, agency, first_name, ... }
    } catch (err) {
      console.error('Failed to fetch current admin profile:', err);
    }
  }, []);

  useEffect(() => {
    fetchPersonnel();
    fetchMyProfile();
  }, [fetchPersonnel, fetchMyProfile]);

  function handleAddPersonnelSuccess(email) {
    showToast(`Invitation sent to ${email}.`);
    fetchPersonnel(true); // silent — table already has data, just refresh it quietly
  }

  function openConfirm(actionType, userId) {
    setConfirmModal({ open: true, actionType, targetId: userId });
  }

  async function handleConfirmAction() {
    const { actionType, targetId } = confirmModal;
    const actionPathMap = {
      suspend: 'suspend',
      reactivate: 'reactivate',
      unlock: 'unlock',
      resend: 'resend-link',
      resetPassword: 'reset-password',
    };

    setConfirmModal({ open: false, actionType: '', targetId: null });

    try {
      if (actionType === 'delete') {
        const res = await apiFetch(`/personnel-management/${targetId}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(extractErrorMessage(errData, 'Delete failed.'));
        }
        showToast('Personnel entry deleted.');
      } else {
        const path = actionPathMap[actionType];
        if (!path) return;
        const res = await apiFetch(`/personnel-management/${targetId}/${path}`, { method: 'POST' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(extractErrorMessage(errData, 'Action failed.'));
        }
        showToast(
          actionType === 'resetPassword'
            ? 'Temporary password emailed to the user.'
            : 'Account updated.'
        );
      }
      await fetchPersonnel(true); // silent — no full-table "Loading…" flash after an action
    } catch (err) {
      showToast(err.message || 'Something went wrong.');
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.fullname && u.fullname.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.employee_id && u.employee_id.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.position && u.position.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const displayedUsers = filteredUsers.slice(startIndex, startIndex + limit);

  return (
    <div className="LEAAdminMainContainer">
      <Sidebar sidebarType="LEA_ADMIN" />
      <div className="LEAAdminContentContainer">
        <TopBar topbarType="LEA_ADMIN" />
        <div className="LEAAdminMainfeed">
          <div className="LEAAdminPageContainer">
            <div className="LEAAdminPageHeader">
              <div className="LEAAdminPageTitleBlock">
                <h1 className="LEAAdminPageTitle">
                  LEA Personnel Management
                  <span className="LEAAdminAgencyTag">LEA Personnel</span>
                </h1>
                <p className="LEAAdminPageSubtitle">
                  Manage law enforcement personnel accounts — review, activate, suspend, or update CIDG credentials.
                </p>
              </div>
              <button
                id="lea-add-personnel-btn"
                className="LEAAdminAddBtn"
                onClick={() => setAddFlowOpen(true)}
              >
                <span>＋</span> Add Personnel Account
              </button>
            </div>

            {fetchError && (
              <div className="LEAAdminFieldError" style={{ marginBottom: '12px' }}>
                <AlertCircle size={12} /> {fetchError}
              </div>
            )}

            <div className="LEAAdminStatsRow">
              {[
                { label: 'Active', value: users.filter((u) => u.status === 'Active').length, className: 'stat-active' },
                { label: 'Suspended', value: users.filter((u) => u.status === 'Suspended').length, className: 'stat-suspended' },
                { label: 'Locked', value: users.filter((u) => u.status === 'Locked').length, className: 'stat-locked' },
              ].map((s) => (
                <div key={s.label} className={`LEAAdminStatCard ${s.className}`}>
                  <span className="LEAAdminStatValue">{s.value}</span>
                  <span className="LEAAdminStatLabel">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="LEAAdminFiltersContainer">
              <div className="LEAAdminSearchGroup">
                <Search size={16} className="LEAAdminSearchIcon" />
                <input
                  type="text"
                  className="LEAAdminSearchInput"
                  placeholder="Search by officer name, email, badge/employee ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              <div className="LEAAdminFilterControls">
                <div className="LEAAdminFilterItem">
                  <span className="LEAAdminFilterLabel">Status:</span>
                  <select
                    className="LEAAdminSelect"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Locked">Locked</option>
                    <option value="Invited">Invited</option>
                    <option value="Resend Requested">Resend Requested</option>
                    <option value="Link Expired">Link Expired</option>
                  </select>
                </div>

                {(statusFilter !== 'All' || searchQuery) && (
                  <button
                    className="LEAAdminClearBtn"
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

            <div className="LEAAdminTableWrapper">
              <table className="LEAAdminTable">
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Status</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="LEAAdminEmpty">
                        Loading personnel records…
                      </td>
                    </tr>
                  ) : displayedUsers.length > 0 ? (
                    displayedUsers.map((user, idx) => (
                      <tr key={user.id}>
                        <td className="LEAAdminTdCenter">{startIndex + idx + 1}</td>
                        <td>
                          <strong>{user.fullname}</strong>
                        </td>
                        <td className="LEAAdminEmailCell">{user.email}</td>
                        <td>{user.employee_id || '-'}</td>
                        <td>{user.department || '-'}</td>
                        <td>{user.position || '-'}</td>
                        <td>
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="LEAAdminTdCenter">
                          <UserMgmtActionDropdown
                            user={user}
                            onAction={(type) => openConfirm(type, user.id)}
                            onView={() => setViewUser(user)}
                            onEdit={() => setEditUser(user)}
                            onResetPassword={() => openConfirm('resetPassword', user.id)}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="LEAAdminEmpty">
                        No LEA Personnel accounts found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {!loading && totalItems > 0 && (
                <div className="LEAAdminPaginationWrapper">
                  <span className="LEAAdminPaginationInfo">
                    Showing {startIndex + 1}–{endIndex} of {totalItems} personnel entries
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

      <AddPersonnelFlow
        open={addFlowOpen}
        onClose={() => setAddFlowOpen(false)}
        onCreated={handleAddPersonnelSuccess}
        myProfile={myProfile}
      />

      <ConfirmModal
        open={confirmModal.open}
        actionType={confirmModal.actionType}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ open: false, actionType: '', targetId: null })}
      />

      <ViewPersonnelModal
        open={!!viewUser}
        user={viewUser}
        onClose={() => setViewUser(null)}
      />

      <EditProfileModal
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={() => { showToast('Profile updated.'); fetchPersonnel(true); }}
      />

      {toastMessage && (
        <div className="LEAAdminToast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}