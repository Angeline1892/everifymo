// desktopfrontend/src/pages/leaadminfolder/lea-admin-user-management.jsx
import './lea-admin-css.css';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

// Personnel accounts strictly use: Active, Suspended, Locked
const STATUS_META = {
  Active: { label: 'Active', className: 'badge-active' },
  Suspended: { label: 'Suspended', className: 'badge-suspended' },
  Locked: { label: 'Locked', className: 'badge-locked' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, className: '' };
  return <span className={`LEAAdminStatusBadge ${meta.className}`}>{meta.label}</span>;
}

// Realistic mock LEA-CIDG personnel accounts (Active, Suspended, Locked only)
const INITIAL_LEA_PERSONNEL = [
  {
    id: 'lea-u-001',
    first_name: 'Cardo',
    middle_name: 'Santos',
    last_name: 'Dalisay',
    fullname: 'Cardo Santos Dalisay',
    employee_id: 'CIDG-NCR-2024-001',
    email: 'cardo.dalisay@cidg.pnp.gov.ph',
    contact_number: '09171112233',
    agency: 'LEA Personnel',
    region: 'National Capital Region (NCR)',
    department: 'Anti-Fraud and Commercial Crimes Division',
    position: 'Special Senior Investigator',
    status: 'Active',
  },
  {
    id: 'lea-u-002',
    first_name: 'Ramon',
    middle_name: 'Alvarez',
    last_name: 'Magsaysay',
    fullname: 'Ramon Alvarez Magsaysay',
    employee_id: 'CIDG-REG7-2024-032',
    email: 'ramon.magsaysay@cidg.pnp.gov.ph',
    contact_number: '09183334455',
    agency: 'LEA Personnel',
    region: 'Region VII - Central Visayas',
    department: 'Special Operations Group',
    position: 'Lead Field Operative',
    status: 'Active',
  },
  {
    id: 'lea-u-003',
    first_name: 'Marc',
    middle_name: 'Villanueva',
    last_name: 'Tan',
    fullname: 'Marc Villanueva Tan',
    employee_id: 'CIDG-REG6-2024-051',
    email: 'marc.tan@cidg.pnp.gov.ph',
    contact_number: '09201122334',
    agency: 'LEA Personnel',
    region: 'Region VI - Western Visayas',
    department: 'Criminal Investigation Branch',
    position: 'Investigative Case Officer',
    status: 'Active',
  },
  {
    id: 'lea-u-004',
    first_name: 'Rodrigo',
    middle_name: 'Bernardo',
    last_name: 'Custodio',
    fullname: 'Rodrigo Bernardo Custodio',
    employee_id: 'CIDG-REG3-2023-019',
    email: 'rodrigo.custodio@cidg.pnp.gov.ph',
    contact_number: '09195556677',
    agency: 'LEA Personnel',
    region: 'Region III - Central Luzon',
    department: 'Surveillance and Interdiction Unit',
    position: 'Field Detective',
    status: 'Suspended',
  },
  {
    id: 'lea-u-005',
    first_name: 'Benjamin',
    middle_name: 'De Vera',
    last_name: 'Aguirre',
    fullname: 'Benjamin De Vera Aguirre',
    employee_id: 'CIDG-REG4A-2024-088',
    email: 'benjamin.aguirre@cidg.pnp.gov.ph',
    contact_number: '09228889900',
    agency: 'LEA Personnel',
    region: 'Region IV-A - CALABARZON',
    department: 'Intelligence & Verification Branch',
    position: 'Forensic Case Analyst',
    status: 'Locked',
  },
  {
    id: 'lea-u-006',
    first_name: 'Gregorio',
    middle_name: 'Castor',
    last_name: 'Del Pilar',
    fullname: 'Gregorio Castor Del Pilar',
    employee_id: 'CIDG-REG1-2024-004',
    email: 'gregorio.delpilar@cidg.pnp.gov.ph',
    contact_number: '09279998877',
    agency: 'LEA Personnel',
    region: 'Region I - Ilocos Region',
    department: 'Counterfeit Products Division',
    position: 'Assistant Case Investigator',
    status: 'Active',
  },
  {
    id: 'lea-u-007',
    first_name: 'Danilo',
    middle_name: 'Aquino',
    last_name: 'Silang',
    fullname: 'Danilo Aquino Silang',
    employee_id: 'CIDG-REG11-2024-012',
    email: 'danilo.silang@cidg.pnp.gov.ph',
    contact_number: '09391234509',
    agency: 'LEA Personnel',
    region: 'Region XI - Davao Region',
    department: 'Special Operations Task Force',
    position: 'Field Intelligence Officer',
    status: 'Active',
  },
  {
    id: 'lea-u-008',
    first_name: 'Vicente',
    middle_name: 'Perez',
    last_name: 'Enriquez',
    fullname: 'Vicente Perez Enriquez',
    employee_id: 'CIDG-NCR-2023-099',
    email: 'vicente.enriquez@cidg.pnp.gov.ph',
    contact_number: '09459876543',
    agency: 'LEA Personnel',
    region: 'National Capital Region (NCR)',
    department: 'Commercial Fraud Unit',
    position: 'Legal and Case Reviewer',
    status: 'Suspended',
  },
];

const PHILIPPINE_REGIONS = [
  'National Capital Region (NCR)',
  'Cordillera Administrative Region (CAR)',
  'Region I - Ilocos Region',
  'Region II - Cagayan Valley',
  'Region III - Central Luzon',
  'Region IV-A - CALABARZON',
  'MIMAROPA Region',
  'Region V - Bicol Region',
  'Region VI - Western Visayas',
  'Region VII - Central Visayas',
  'Region VIII - Eastern Visayas',
  'Region IX - Zamboanga Peninsula',
  'Region X - Northern Mindanao',
  'Region XI - Davao Region',
  'Region XII - SOCCSKSARGEN',
  'Region XIII - Caraga',
  'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
];

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
    const upward = spaceBelow < 200;
    setMenuPos({
      top: upward ? Math.max(8, rect.top - 180) : rect.bottom + 6,
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

            {/* Active Accounts: Edit Profile, Reset Password (ONLY for Active), Suspend */}
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

            {/* Suspended -> Reactivate, Delete */}
            {displayStatus === 'Suspended' && (
              <>
                <button
                  className="LEAAdminDropdownItem primary-action"
                  onClick={() => {
                    onAction('reactivate');
                    setIsOpen(false);
                  }}
                >
                  <RotateCcw size={14} /> Reactivate Account
                </button>
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

            {/* Locked -> Unlock */}
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
  resetPassword: {
    title: 'Reset Account Password',
    message: 'Are you sure you want to reset the password for this active personnel account? A temporary password notification will be issued.',
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

// 2-Step Add Personnel Flow: Form -> Verification/Confirmation Summary Modal -> Confirmed as Active
function AddPersonnelFlow({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    agency: 'LEA Personnel', // Read-only
    region: '',
    department: '',
    position: '',
  });

  const [errors, setErrors] = useState({});

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
        agency: 'LEA Personnel',
        region: '',
        department: '',
        position: '',
      });
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

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

    if (!formData.region) {
      errs.region = 'Region is required. Please select an agency region.';
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

  function handleFinalConfirm() {
    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');
    const newAccount = {
      id: `lea-u-${Date.now()}`,
      first_name: formData.firstName.trim(),
      middle_name: formData.middleName.trim(),
      last_name: formData.lastName.trim(),
      fullname: fullName,
      employee_id: formData.employeeId.trim(),
      email: formData.email.trim().toLowerCase(),
      contact_number: formData.contactNumber.trim(),
      agency: 'LEA Personnel',
      region: formData.region,
      department: formData.department.trim(),
      position: formData.position.trim(),
      status: 'Active', // Automatically Active upon confirmation
    };

    onCreated(newAccount);
    onClose();
  }

  return (
    <div className="LEAAdminModalOverlay">
      {step === 1 ? (
        <div className="LEAAdminModal LEAAdminAddModal">
          <div className="LEAAdminModalHeader">
            <h3 className="LEAAdminModalTitle">Add Personnel Account</h3>
            <p className="LEAAdminModalSubtitle">
              Register a new LEA-CIDG Personnel account. Confirmed accounts are immediately activated.
            </p>
            <button className="LEAAdminModalCloseBtn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleFormSubmit}>
            <div className="LEAAdminModalBody">
              {/* Row 1: First Name, Middle Name, Last Name */}
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

              {/* Row 2: Employee ID, Contact Number */}
              <div className="LEAAdminFormRow">
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Employee ID</label>
                  <div className="LEAAdminInputWrapper">
                    <Fingerprint className="LEAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="LEAAdminInput"
                      placeholder="e.g. 2026-001 (Optional)"
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

              {/* Row 3: Email Address */}
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">
                  Email Address <span className="LEAAdminRequired">*</span>
                </label>
                <div className="LEAAdminInputWrapper">
                  <Mail className="LEAAdminInputIcon" size={17} />
                  <input
                    type="email"
                    className={`LEAAdminInput ${errors.email ? 'input-error' : ''}`}
                    placeholder="e.g. cardo.dalisay@cidg.gov.ph"
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

              {/* Row 4: Agency, Region */}
              <div className="LEAAdminFormRow">
                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">Agency (Read-only)</label>
                  <div className="LEAAdminInputWrapper">
                    <Building2 className="LEAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="LEAAdminInput readonly-input"
                      value={formData.agency}
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel">
                    Region <span className="LEAAdminRequired">*</span>
                  </label>
                  <div className="LEAAdminInputWrapper">
                    <MapPin className="LEAAdminInputIcon" size={17} />
                    <select
                      className={`LEAAdminSelect ${errors.region ? 'input-error' : ''}`}
                      value={formData.region}
                      onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    >
                      <option value="">Select Region</option>
                      {PHILIPPINE_REGIONS.map((reg) => (
                        <option key={reg} value={reg}>{reg}</option>
                      ))}
                    </select>
                  </div>
                  {errors.region && (
                    <span className="LEAAdminFieldError">
                      <AlertCircle size={12} /> {errors.region}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 5: Department, Position */}
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
        /* STEP 2: Summary Confirmation */
        <div className="LEAAdminModal" style={{ maxWidth: '480px' }}>
          <div className="LEAAdminModalHeader">
            <h3 className="LEAAdminModalTitle">Confirm Personnel Registration</h3>
            <p className="LEAAdminModalSubtitle">
              Review details before creating and activating this personnel account.
            </p>
          </div>

          <div className="LEAAdminModalBody">
            <div className="LEAAdminSummaryNotice">
              <CircleCheckBig size={18} />
              <span>This account will be created directly with <strong>Active</strong> status.</span>
            </div>

            <div className="LEAAdminSummaryBox">
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Full Name:</span>
                <span className="LEAAdminSummaryValue">
                  {[formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ') || '-'}
                </span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">First Name:</span>
                <span className="LEAAdminSummaryValue">{formData.firstName || '-'}</span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Middle Name:</span>
                <span className="LEAAdminSummaryValue">{formData.middleName || '-'}</span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Last Name:</span>
                <span className="LEAAdminSummaryValue">{formData.lastName || '-'}</span>
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
                  <span className="LEAAdminAgencyTag">LEA Personnel</span>
                </span>
              </div>
              <div className="LEAAdminSummaryRow">
                <span className="LEAAdminSummaryLabel">Region:</span>
                <span className="LEAAdminSummaryValue">{formData.region || '-'}</span>
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
          </div>

          <div className="LEAAdminModalFooter">
            <button type="button" className="LEAAdminCancelBtn" onClick={() => setStep(1)}>
              Go Back
            </button>
            <button type="button" className="LEAAdminConfirmBtn primary" onClick={handleFinalConfirm}>
              Confirm / Add Personnel Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Profile Modal
function EditProfileModal({ open, user, onClose, onSave }) {
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    agency: 'LEA Personnel',
    region: '',
    department: '',
    position: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.first_name || '',
        middleName: user.middle_name || '',
        lastName: user.last_name || '',
        employeeId: user.employee_id || '',
        contactNumber: user.contact_number || '',
        email: user.email || '',
        agency: 'LEA Personnel',
        region: user.region || 'National Capital Region (NCR)',
        department: user.department || '',
        position: user.position || '',
      });
    }
  }, [user]);

  if (!open || !user) return null;

  function handleSave(e) {
    e.preventDefault();
    const updated = {
      ...user,
      first_name: form.firstName.trim(),
      middle_name: form.middleName.trim(),
      last_name: form.lastName.trim(),
      fullname: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' '),
      employee_id: form.employeeId.trim(),
      contact_number: form.contactNumber.trim(),
      email: form.email.trim(),
      agency: 'LEA Personnel',
      region: form.region,
      department: form.department.trim(),
      position: form.position.trim(),
    };
    onSave(updated);
    onClose();
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
            {/* Row 1: First Name, Middle Name, Last Name */}
            <div className="LEAAdminFormRow3">
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">
                  First Name <span className="LEAAdminRequired">*</span>
                </label>
                <div className="LEAAdminInputWrapper">
                  <User className="LEAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="LEAAdminInput"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
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
                    className="LEAAdminInput"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Employee ID, Contact Number */}
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
                    className="LEAAdminInput"
                    value={form.contactNumber}
                    onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Email Address */}
            <div className="LEAAdminFormGroup">
              <label className="LEAAdminLabel">
                Email Address <span className="LEAAdminRequired">*</span>
              </label>
              <div className="LEAAdminInputWrapper">
                <Mail className="LEAAdminInputIcon" size={17} />
                <input
                  type="email"
                  className="LEAAdminInput"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Row 4: Agency, Region */}
            <div className="LEAAdminFormRow">
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Agency (Read-only)</label>
                <div className="LEAAdminInputWrapper">
                  <Building2 className="LEAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="LEAAdminInput readonly-input"
                    value={form.agency}
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">
                  Region <span className="LEAAdminRequired">*</span>
                </label>
                <div className="LEAAdminInputWrapper">
                  <MapPin className="LEAAdminInputIcon" size={17} />
                  <select
                    className="LEAAdminSelect"
                    style={{ width: '100%' }}
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                  >
                    {PHILIPPINE_REGIONS.map((reg) => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Row 5: Department, Position */}
            <div className="LEAAdminFormRow">
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Department</label>
                <div className="LEAAdminInputWrapper">
                  <Building2 className="LEAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="LEAAdminInput"
                    placeholder="(Optional)"
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
                    placeholder="(Optional)"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="LEAAdminModalFooter">
            <button type="button" className="LEAAdminCancelBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="LEAAdminConfirmBtn primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Details Modal
function ViewPersonnelModal({ open, user, onClose }) {
  if (!open || !user) return null;

  const resolvedFullName =
    user.fullname ||
    [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(' ') ||
    '-';

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
                <span className="LEAAdminVDValue">{resolvedFullName}</span>
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
  const [users, setUsers] = useState(INITIAL_LEA_PERSONNEL);
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

  function handleAddPersonnelSuccess(newAccount) {
    setUsers((prev) => [newAccount, ...prev]);
    showToast(`Account for ${newAccount.fullname} has been successfully created and activated.`);
  }

  function openConfirm(actionType, userId) {
    setConfirmModal({ open: true, actionType, targetId: userId });
  }

  function handleConfirmAction() {
    const { actionType, targetId } = confirmModal;
    setUsers((prev) =>
      prev.flatMap((u) => {
        if (u.id !== targetId) return [u];
        if (actionType === 'suspend') {
          showToast(`Account ${u.fullname} suspended.`);
          return [{ ...u, status: 'Suspended' }];
        }
        if (actionType === 'reactivate') {
          showToast(`Account ${u.fullname} reactivated.`);
          return [{ ...u, status: 'Active' }];
        }
        if (actionType === 'unlock') {
          showToast(`Account ${u.fullname} unlocked.`);
          return [{ ...u, status: 'Active' }];
        }
        if (actionType === 'resetPassword') {
          showToast(`Password reset notification dispatched for ${u.email}.`);
          return [u];
        }
        if (actionType === 'delete') {
          showToast(`Account record for ${u.fullname} removed.`);
          return [];
        }
        return [u];
      })
    );
    setConfirmModal({ open: false, actionType: '', targetId: null });
  }

  function handleSaveEdit(updatedUser) {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    showToast(`Profile information for ${updatedUser.fullname} updated.`);
  }

  // Frontend search and filter
  const filteredUsers = users.filter((u) => {
    const matchesStatus = statusFilter === 'All' ? true : u.status === statusFilter;
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
            {/* Header */}
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

            {/* Stats Row - Active, Suspended, Locked */}
            <div className="LEAAdminStatsRow">
              {[
                {
                  label: 'Active',
                  value: users.filter((u) => u.status === 'Active').length,
                  className: 'stat-active',
                },
                {
                  label: 'Suspended',
                  value: users.filter((u) => u.status === 'Suspended').length,
                  className: 'stat-suspended',
                },
                {
                  label: 'Locked',
                  value: users.filter((u) => u.status === 'Locked').length,
                  className: 'stat-locked',
                },
              ].map((s) => (
                <div key={s.label} className={`LEAAdminStatCard ${s.className}`}>
                  <span className="LEAAdminStatValue">{s.value}</span>
                  <span className="LEAAdminStatLabel">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Filter & Search Bar */}
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

            {/* Table */}
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
                  {displayedUsers.length > 0 ? (
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

              {totalItems > 0 && (
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

      {/* Add Personnel 2-Step Flow */}
      <AddPersonnelFlow
        open={addFlowOpen}
        onClose={() => setAddFlowOpen(false)}
        onCreated={handleAddPersonnelSuccess}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmModal.open}
        actionType={confirmModal.actionType}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ open: false, actionType: '', targetId: null })}
      />

      {/* View Personnel Modal */}
      <ViewPersonnelModal
        open={!!viewUser}
        user={viewUser}
        onClose={() => setViewUser(null)}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSave={handleSaveEdit}
      />

      {/* Success Toast */}
      {toastMessage && (
        <div className="LEAAdminToast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
