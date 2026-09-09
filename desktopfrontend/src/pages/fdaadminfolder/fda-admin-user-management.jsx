// desktopfrontend/src/pages/fdaadminfolder/fda-admin-user-management.jsx
import './fda-admin-css.css';
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
  return <span className={`FDAAdminStatusBadge ${meta.className}`}>{meta.label}</span>;
}

// Initial realistic mock FDA personnel data (Active, Suspended, Locked only)
const INITIAL_FDA_PERSONNEL = [
  {
    id: 'fda-u-001',
    first_name: 'Maria Clara',
    middle_name: 'Santos',
    last_name: 'Cruz',
    fullname: 'Maria Clara Santos Cruz',
    employee_id: 'FDA-NCR-2024-001',
    email: 'mariaclara.cruz@fda.gov.ph',
    contact_number: '09171234567',
    agency: 'FDA Personnel',
    region: 'National Capital Region (NCR)',
    department: 'Center for Drug Regulation and Research',
    position: 'Senior Food and Drug Regulation Officer',
    status: 'Active',
  },
  {
    id: 'fda-u-002',
    first_name: 'Juan',
    middle_name: 'Reyes',
    last_name: 'Dela Cruz',
    fullname: 'Juan Reyes Dela Cruz',
    employee_id: 'FDA-REG3-2024-042',
    email: 'juan.delacruz@fda.gov.ph',
    contact_number: '09182345678',
    agency: 'FDA Personnel',
    region: 'Region III - Central Luzon',
    department: 'Field Regulatory Operations Office',
    position: 'Regulatory Enforcement Inspector',
    status: 'Active',
  },
  {
    id: 'fda-u-003',
    first_name: 'Elena',
    middle_name: 'Villanueva',
    last_name: 'Bautista',
    fullname: 'Elena Villanueva Bautista',
    employee_id: 'FDA-NCR-2024-088',
    email: 'elena.bautista@fda.gov.ph',
    contact_number: '09223456789',
    agency: 'FDA Personnel',
    region: 'National Capital Region (NCR)',
    department: 'Center for Cosmetics and Household Devices',
    position: 'Product Verification Specialist',
    status: 'Active',
  },
  {
    id: 'fda-u-004',
    first_name: 'Antonio',
    middle_name: 'Mercado',
    last_name: 'Luna',
    fullname: 'Antonio Mercado Luna',
    employee_id: 'FDA-REG7-2023-115',
    email: 'antonio.luna@fda.gov.ph',
    contact_number: '09194567890',
    agency: 'FDA Personnel',
    region: 'Region VII - Central Visayas',
    department: 'Post-Marketing Surveillance Unit',
    position: 'Field Inspection Supervisor',
    status: 'Suspended',
  },
  {
    id: 'fda-u-005',
    first_name: 'Corazon',
    middle_name: 'Aquino',
    last_name: 'Mendoza',
    fullname: 'Corazon Aquino Mendoza',
    employee_id: 'FDA-REG4A-2024-023',
    email: 'corazon.mendoza@fda.gov.ph',
    contact_number: '09205678901',
    agency: 'FDA Personnel',
    region: 'Region IV-A - CALABARZON',
    department: 'Center for Food Regulation and Research',
    position: 'Laboratory Analyst III',
    status: 'Locked',
  },
  {
    id: 'fda-u-006',
    first_name: 'Danilo',
    middle_name: 'Perez',
    last_name: 'Ramos',
    fullname: 'Danilo Perez Ramos',
    employee_id: 'FDA-NCR-2024-119',
    email: 'danilo.ramos@fda.gov.ph',
    contact_number: '09276789012',
    agency: 'FDA Personnel',
    region: 'National Capital Region (NCR)',
    department: 'Policy and Planning Service',
    position: 'Information Technology Officer',
    status: 'Active',
  },
  {
    id: 'fda-u-007',
    first_name: 'Rosario',
    middle_name: 'Castillo',
    last_name: 'Navarro',
    fullname: 'Rosario Castillo Navarro',
    employee_id: 'FDA-REG1-2024-009',
    email: 'rosario.navarro@fda.gov.ph',
    contact_number: '09397890123',
    agency: 'FDA Personnel',
    region: 'Region I - Ilocos Region',
    department: 'Field Regulatory Operations Office',
    position: 'Licensing Inspector II',
    status: 'Active',
  },
  {
    id: 'fda-u-008',
    first_name: 'Felipe',
    middle_name: 'Gomez',
    last_name: 'Salazar',
    fullname: 'Felipe Gomez Salazar',
    employee_id: 'FDA-REG11-2023-078',
    email: 'felipe.salazar@fda.gov.ph',
    contact_number: '09458901234',
    agency: 'FDA Personnel',
    region: 'Region XI - Davao Region',
    department: 'Common Services Laboratory',
    position: 'Chemical Control Officer',
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
    <div className={`FDAAdminDropdownWrapper ${isOpen ? 'active-open' : ''}`}>
      <button
        ref={triggerRef}
        className="FDAAdminDropdownTrigger"
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
            className="FDAAdminDropdownMenu"
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          >
            <button
              className="FDAAdminDropdownItem"
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
                  className="FDAAdminDropdownItem"
                  onClick={() => {
                    onEdit();
                    setIsOpen(false);
                  }}
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
                <button
                  className="FDAAdminDropdownItem"
                  onClick={() => {
                    onResetPassword();
                    setIsOpen(false);
                  }}
                >
                  <KeyRound size={14} /> Reset Password
                </button>
                <div className="FDAAdminDropdownDivider" />
                <button
                  className="FDAAdminDropdownItem danger"
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
                  className="FDAAdminDropdownItem primary-action"
                  onClick={() => {
                    onAction('reactivate');
                    setIsOpen(false);
                  }}
                >
                  <RotateCcw size={14} /> Reactivate Account
                </button>
                <div className="FDAAdminDropdownDivider" />
                <button
                  className="FDAAdminDropdownItem danger"
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
                className="FDAAdminDropdownItem primary-action"
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
    <div className="FDAAdminModalOverlay">
      <div className="FDAAdminModal" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          {isDestructive ? (
            <TriangleAlert size={44} color="#d97706" strokeWidth={2.5} />
          ) : isKey ? (
            <KeyRound size={44} color="#0d9488" strokeWidth={2.5} />
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

// 2-Step Add Personnel Flow: Form -> Verification/Confirmation Summary Modal -> Confirmed as Active
function AddPersonnelFlow({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1 = Form, 2 = Confirmation Summary
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    agency: 'FDA Personnel', // Read-only
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
        agency: 'FDA Personnel',
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
    setStep(2); // Proceed to Step 2: Confirmation Modal
  }

  function handleFinalConfirm() {
    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');
    const newAccount = {
      id: `fda-u-${Date.now()}`,
      first_name: formData.firstName.trim(),
      middle_name: formData.middleName.trim(),
      last_name: formData.lastName.trim(),
      fullname: fullName,
      employee_id: formData.employeeId.trim() || `FDA-${Math.floor(1000 + Math.random() * 9000)}`,
      email: formData.email.trim().toLowerCase(),
      contact_number: formData.contactNumber.trim(),
      agency: 'FDA Personnel',
      region: formData.region,
      department: formData.department.trim() || 'General Regulatory Affairs',
      position: formData.position.trim() || 'Regulatory Officer',
      status: 'Active', // Confirmed accounts are automatically Active
    };

    onCreated(newAccount);
    onClose();
  }

  return (
    <div className="FDAAdminModalOverlay">
      {step === 1 ? (
        <div className="FDAAdminModal FDAAdminAddModal">
          <div className="FDAAdminModalHeader">
            <h3 className="FDAAdminModalTitle">Add Personnel Account</h3>
            <p className="FDAAdminModalSubtitle">
              Register a new FDA Personnel account. All confirmed accounts will be automatically activated.
            </p>
            <button className="FDAAdminModalCloseBtn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleFormSubmit}>
            <div className="FDAAdminModalBody">
              {/* Row 1: First Name, Middle Name, Last Name */}
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
                      placeholder="e.g. Maria"
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
                      placeholder="e.g. Santos"
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
                      placeholder="e.g. Cruz"
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

              {/* Row 2: Employee ID, Contact Number */}
              <div className="FDAAdminFormRow">
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Employee ID</label>
                  <div className="FDAAdminInputWrapper">
                    <Fingerprint className="FDAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="FDAAdminInput"
                      placeholder="e.g. FDA-2026-091"
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

              {/* Row 3: Email Address */}
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">
                  Email Address <span className="FDAAdminRequired">*</span>
                </label>
                <div className="FDAAdminInputWrapper">
                  <Mail className="FDAAdminInputIcon" size={17} />
                  <input
                    type="email"
                    className={`FDAAdminInput ${errors.email ? 'input-error' : ''}`}
                    placeholder="e.g. maria.cruz@fda.gov.ph"
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

              {/* Row 4: Agency, Region */}
              <div className="FDAAdminFormRow">
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Agency (Read-only)</label>
                  <div className="FDAAdminInputWrapper">
                    <Building2 className="FDAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="FDAAdminInput readonly-input"
                      value={formData.agency}
                      readOnly
                      disabled
                    />
                  </div>
                </div>

                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">
                    Region <span className="FDAAdminRequired">*</span>
                  </label>
                  <div className="FDAAdminInputWrapper">
                    <MapPin className="FDAAdminInputIcon" size={17} />
                    <select
                      className={`FDAAdminSelect ${errors.region ? 'input-error' : ''}`}
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
                    <span className="FDAAdminFieldError">
                      <AlertCircle size={12} /> {errors.region}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 5: Department, Position */}
              <div className="FDAAdminFormRow">
                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel">Department</label>
                  <div className="FDAAdminInputWrapper">
                    <Building2 className="FDAAdminInputIcon" size={17} />
                    <input
                      type="text"
                      className="FDAAdminInput"
                      placeholder="e.g. Regulatory Compliance"
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
                      placeholder="e.g. Inspection Officer"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>
              </div>
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
        /* STEP 2: Readable Summary Confirmation Modal */
        <div className="FDAAdminModal" style={{ maxWidth: '480px' }}>
          <div className="FDAAdminModalHeader">
            <h3 className="FDAAdminModalTitle">Confirm Personnel Creation</h3>
            <p className="FDAAdminModalSubtitle">
              Please verify the following information before creating this account.
            </p>
          </div>

          <div className="FDAAdminModalBody">
            <div className="FDAAdminSummaryNotice">
              <CircleCheckBig size={18} />
              <span>Upon confirmation, this personnel account will be created immediately with <strong>Active</strong> status.</span>
            </div>

            <div className="FDAAdminSummaryBox">
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">First Name:</span>
                <span className="FDAAdminSummaryValue">{formData.firstName}</span>
              </div>
              {formData.middleName && (
                <div className="FDAAdminSummaryRow">
                  <span className="FDAAdminSummaryLabel">Middle Name:</span>
                  <span className="FDAAdminSummaryValue">{formData.middleName}</span>
                </div>
              )}
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Last Name:</span>
                <span className="FDAAdminSummaryValue">{formData.lastName}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Employee ID:</span>
                <span className="FDAAdminSummaryValue">{formData.employeeId || '— (Auto-generated)'}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Contact Number:</span>
                <span className="FDAAdminSummaryValue">{formData.contactNumber}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Email Address:</span>
                <span className="FDAAdminSummaryValue">{formData.email}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Agency:</span>
                <span className="FDAAdminSummaryValue">
                  <span className="FDAAdminAgencyTag">FDA Personnel</span>
                </span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Region:</span>
                <span className="FDAAdminSummaryValue">{formData.region}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Department:</span>
                <span className="FDAAdminSummaryValue">{formData.department || '—'}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Position:</span>
                <span className="FDAAdminSummaryValue">{formData.position || '—'}</span>
              </div>
            </div>
          </div>

          <div className="FDAAdminModalFooter">
            <button type="button" className="FDAAdminCancelBtn" onClick={() => setStep(1)}>
              Go Back
            </button>
            <button type="button" className="FDAAdminConfirmBtn primary" onClick={handleFinalConfirm}>
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
    agency: 'FDA Personnel',
    region: '',
    department: '',
    position: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.first_name || '',
        middleName: user.middle_name || '',
        lastName: user.last_name || '',
        employeeId: user.employee_id || '',
        contactNumber: user.contact_number || '',
        email: user.email || '',
        agency: user.agency || 'FDA Personnel', // Read-only
        region: user.region || '',
        department: user.department || '',
        position: user.position || '',
      });
      setErrors({});
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
    if (!form.email.trim()) {
      errs.email = 'Email Address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        errs.email = 'Please enter a valid email address.';
      }
    }
    if (!form.region) {
      errs.region = 'Region is required. Please select an agency region.';
    }
    return errs;
  }

  function handleSave(e) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const updated = {
      ...user,
      first_name: form.firstName.trim(),
      middle_name: form.middleName.trim(),
      last_name: form.lastName.trim(),
      fullname: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' '),
      employee_id: form.employeeId.trim(),
      contact_number: form.contactNumber.trim(),
      email: form.email.trim().toLowerCase(),
      agency: 'FDA Personnel',
      region: form.region,
      department: form.department.trim(),
      position: form.position.trim(),
    };
    onSave(updated);
    onClose();
  }

  return (
    <div className="FDAAdminModalOverlay">
      <div className="FDAAdminModal FDAAdminAddModal">
        <div className="FDAAdminModalHeader">
          <h3 className="FDAAdminModalTitle">Edit Personnel Profile</h3>
          <p className="FDAAdminModalSubtitle">Update account details for this FDA Personnel.</p>
          <button className="FDAAdminModalCloseBtn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="FDAAdminModalBody">
            {/* Row 1: First Name, Middle Name, Last Name */}
            <div className="FDAAdminFormRow3">
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">
                  First Name <span className="FDAAdminRequired">*</span>
                </label>
                <div className="FDAAdminInputWrapper">
                  <User className="FDAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className={`FDAAdminInput with-icon ${errors.firstName ? 'input-error' : ''}`}
                    placeholder="e.g. Maria"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
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
                    className="FDAAdminInput with-icon"
                    placeholder="e.g. Santos"
                    value={form.middleName}
                    onChange={(e) => setForm({ ...form, middleName: e.target.value })}
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
                    className={`FDAAdminInput with-icon ${errors.lastName ? 'input-error' : ''}`}
                    placeholder="e.g. Cruz"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
                {errors.lastName && (
                  <span className="FDAAdminFieldError">
                    <AlertCircle size={12} /> {errors.lastName}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: Employee ID, Contact Number */}
            <div className="FDAAdminFormRow">
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Employee ID</label>
                <div className="FDAAdminInputWrapper">
                  <Fingerprint className="FDAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="FDAAdminInput with-icon"
                    placeholder="e.g. FDA-2026-091"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
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
                    className={`FDAAdminInput with-icon ${errors.contactNumber ? 'input-error' : ''}`}
                    placeholder="e.g. 09171234567"
                    value={form.contactNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setForm({ ...form, contactNumber: val });
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

            {/* Row 3: Email Address */}
            <div className="FDAAdminFormGroup">
              <label className="FDAAdminLabel">
                Email Address <span className="FDAAdminRequired">*</span>
              </label>
              <div className="FDAAdminInputWrapper">
                <Mail className="FDAAdminInputIcon" size={17} />
                <input
                  type="email"
                  className={`FDAAdminInput with-icon ${errors.email ? 'input-error' : ''}`}
                  placeholder="e.g. maria.cruz@fda.gov.ph"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              {errors.email && (
                <span className="FDAAdminFieldError">
                  <AlertCircle size={12} /> {errors.email}
                </span>
              )}
            </div>

            {/* Row 4: Agency, Region */}
            <div className="FDAAdminFormRow">
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Agency (Read-only)</label>
                <div className="FDAAdminInputWrapper">
                  <Building2 className="FDAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="FDAAdminInput with-icon readonly-input"
                    value={form.agency}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">
                  Region <span className="FDAAdminRequired">*</span>
                </label>
                <div className="FDAAdminInputWrapper">
                  <MapPin className="FDAAdminInputIcon" size={17} />
                  <select
                    className={`FDAAdminSelect with-icon ${errors.region ? 'input-error' : ''}`}
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                  >
                    <option value="">Select Region</option>
                    {PHILIPPINE_REGIONS.map((reg) => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>
                {errors.region && (
                  <span className="FDAAdminFieldError">
                    <AlertCircle size={12} /> {errors.region}
                  </span>
                )}
              </div>
            </div>

            {/* Row 5: Department, Position */}
            <div className="FDAAdminFormRow">
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Department</label>
                <div className="FDAAdminInputWrapper">
                  <Building2 className="FDAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="FDAAdminInput with-icon"
                    placeholder="e.g. Regulatory Compliance"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Position</label>
                <div className="FDAAdminInputWrapper">
                  <Briefcase className="FDAAdminInputIcon" size={17} />
                  <input
                    type="text"
                    className="FDAAdminInput with-icon"
                    placeholder="e.g. Inspection Officer"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="FDAAdminModalFooter">
            <button type="button" className="FDAAdminCancelBtn" onClick={onClose}>Cancel</button>
            <button type="submit" className="FDAAdminConfirmBtn primary">Save Changes</button>
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
    <div className="FDAAdminModalOverlay">
      <div className="FDAAdminModal FDAAdminViewModal">
        <div className="FDAAdminModalHeader">
          <h3 className="FDAAdminModalTitle">Personnel Details</h3>
          <p className="FDAAdminModalSubtitle">Viewing profile information for this FDA Personnel.</p>
          <button className="FDAAdminModalCloseBtn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="FDAAdminModalBody">
          <div className="FDAAdminSummaryBox">
            <div className="FDAAdminVDGrid three-col">
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">First Name</span>
                <span className="FDAAdminVDValue">{user.first_name || '-'}</span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Middle Name</span>
                <span className="FDAAdminVDValue">{user.middle_name || '-'}</span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Last Name</span>
                <span className="FDAAdminVDValue">{user.last_name || '-'}</span>
              </div>

              <div className="FDAAdminVDField full-span">
                <span className="FDAAdminVDLabel">Full Name</span>
                <span className="FDAAdminVDValue">{resolvedFullName}</span>
              </div>

              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Employee ID</span>
                <span className="FDAAdminVDValue">{user.employee_id || '-'}</span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Contact Number</span>
                <span className="FDAAdminVDValue">{user.contact_number || '-'}</span>
              </div>

              <div className="FDAAdminVDField full-span">
                <span className="FDAAdminVDLabel">Email Address</span>
                <span className="FDAAdminVDValue FDAAdminEmailCell">{user.email || '-'}</span>
              </div>

              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Agency</span>
                <span className="FDAAdminVDValue">
                  <span className="FDAAdminAgencyTag">{user.agency || 'FDA Personnel'}</span>
                </span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Region</span>
                <span className="FDAAdminVDValue">{user.region || '-'}</span>
              </div>

              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Department</span>
                <span className="FDAAdminVDValue">{user.department || '-'}</span>
              </div>
              <div className="FDAAdminVDField">
                <span className="FDAAdminVDLabel">Position</span>
                <span className="FDAAdminVDValue">{user.position || '-'}</span>
              </div>

              <div className="FDAAdminVDField full-span">
                <span className="FDAAdminVDLabel">Account Status</span>
                <span className="FDAAdminVDValue">
                  <StatusBadge status={user.status} />
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

export default function FDAAdminUserManagement() {
  const [users, setUsers] = useState(INITIAL_FDA_PERSONNEL);
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
                  FDA Personnel Management
                  <span className="FDAAdminAgencyTag">FDA Personnel</span>
                </h1>
                <p className="FDAAdminPageSubtitle">
                  Manage agency personnel accounts — review, activate, suspend, or update FDA credentials.
                </p>
              </div>
              <button
                id="fda-add-personnel-btn"
                className="FDAAdminAddBtn"
                onClick={() => setAddFlowOpen(true)}
              >
                <span>＋</span> Add Personnel Account
              </button>
            </div>

            {/* Stats Row - Active, Suspended, Locked */}
            <div className="FDAAdminStatsRow">
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
                <div key={s.label} className={`FDAAdminStatCard ${s.className}`}>
                  <span className="FDAAdminStatValue">{s.value}</span>
                  <span className="FDAAdminStatLabel">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Filter & Search Bar */}
            <div className="FDAAdminFiltersContainer">
              <div className="FDAAdminSearchGroup">
                <Search size={16} className="FDAAdminSearchIcon" />
                <input
                  type="text"
                  className="FDAAdminSearchInput"
                  placeholder="Search by name, email, employee ID, department..."
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
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Locked">Locked</option>
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

            {/* Table */}
            <div className="FDAAdminTableWrapper">
              <table className="FDAAdminTable">
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
                        <td className="FDAAdminTdCenter">{startIndex + idx + 1}</td>
                        <td>
                          <strong>{user.fullname}</strong>
                        </td>
                        <td className="FDAAdminEmailCell">{user.email}</td>
                        <td>{user.employee_id || '—'}</td>
                        <td>{user.department || '—'}</td>
                        <td>{user.position || '—'}</td>
                        <td>
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="FDAAdminTdCenter">
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
                      <td colSpan={8} className="FDAAdminEmpty">
                        No FDA Personnel accounts found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalItems > 0 && (
                <div className="FDAAdminPaginationWrapper">
                  <span className="FDAAdminPaginationInfo">
                    Showing {startIndex + 1}–{endIndex} of {totalItems} personnel entries
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
        <div className="FDAAdminToast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
