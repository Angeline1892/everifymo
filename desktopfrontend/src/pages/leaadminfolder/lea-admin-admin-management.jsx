// desktopfrontend/src/pages/leaadminfolder/lea-admin-admin-management.jsx
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

// Mirroring the exact status system from Superadmin Admin Management
const STATUS_META = {
  Invited: { label: 'Invited', className: 'badge-pending' },
  Active: { label: 'Active', className: 'badge-active' },
  Suspended: { label: 'Suspended', className: 'badge-suspended' },
  Suspend: { label: 'Suspended', className: 'badge-suspended' },
  'Resend Requested': { label: 'Resend Requested', className: 'badge-pending' },
  'Link Expired': { label: 'Link Expired', className: 'badge-expired' },
  'Pending Approval': { label: 'Pending Approval', className: 'badge-pending' },
  Locked: { label: 'Locked', className: 'badge-locked' },
};

function StatusBadge({ status }) {
  const statusStr = typeof status === 'object' && status !== null ? computeAdminStatus(status) : status;
  const meta = STATUS_META[statusStr] || { label: statusStr, className: '' };
  return <span className={`LEAAdminStatusBadge ${meta.className}`}>{meta.label}</span>;
}

// Realistic mock LEA Admin accounts
const INITIAL_LEA_ADMINS = [
  {
    id: 'lea-adm-001',
    first_name: 'Dominic',
    middle_name: 'Cruz',
    last_name: 'Valdez',
    fullname: 'Dominic Cruz Valdez',
    employee_id: 'CIDG-ADM-0892',
    email: 'dominic.valdez@cidg.pnp.gov.ph',
    contact_number: '09189876543',
    agency: 'LEA Admin',
    region: 'Region III - Central Luzon',
    department: 'Special Operations Command',
    position: 'Regional Inter-Agency Administrator',
    status: 'Active',
  },
  {
    id: 'lea-adm-002',
    first_name: 'Renato',
    middle_name: 'Perez',
    last_name: 'Soriano',
    fullname: 'Renato Perez Soriano',
    employee_id: 'CIDG-ADM-0341',
    email: 'renato.soriano@cidg.pnp.gov.ph',
    contact_number: '09194567890',
    agency: 'LEA Admin',
    region: 'Region XI - Davao Region',
    department: 'Anti-Fraud Command Center',
    position: 'Senior Regional CIDG Admin',
    status: 'Active',
  },
  {
    id: 'lea-adm-003',
    first_name: 'Alexander',
    middle_name: 'David',
    last_name: 'Mercado',
    fullname: 'Alexander David Mercado',
    employee_id: 'CIDG-ADM-0442',
    email: 'alexander.mercado@cidg.pnp.gov.ph',
    contact_number: '09221112233',
    agency: 'LEA Admin',
    region: 'National Capital Region (NCR)',
    department: 'National Operations Oversight',
    position: 'Central Agency Administrator',
    status: 'Link Expired',
  },
  {
    id: 'lea-adm-004',
    first_name: 'Gerardo',
    middle_name: 'Bautista',
    last_name: 'Castro',
    fullname: 'Gerardo Bautista Castro',
    employee_id: 'CIDG-ADM-0671',
    email: 'gerardo.castro@cidg.pnp.gov.ph',
    contact_number: '09283334455',
    agency: 'LEA Admin',
    region: 'Region VII - Central Visayas',
    department: 'Field Logistics & Investigations',
    position: 'Regional Command Admin',
    status: 'Suspended',
  },
  {
    id: 'lea-adm-005',
    first_name: 'Rodolfo',
    middle_name: 'Ignacio',
    last_name: 'Santos',
    fullname: 'Rodolfo Ignacio Santos',
    employee_id: 'CIDG-ADM-0129',
    email: 'rodolfo.santos@cidg.pnp.gov.ph',
    contact_number: '09177778899',
    agency: 'LEA Admin',
    region: 'Region IV-A - CALABARZON',
    department: 'Intelligence Administration',
    position: 'Regional Security Administrator',
    status: 'Locked',
  },
  {
    id: 'lea-adm-006',
    first_name: 'Teodoro',
    middle_name: 'Villanueva',
    last_name: 'Ramos',
    fullname: 'Teodoro Villanueva Ramos',
    employee_id: 'CIDG-ADM-0995',
    email: 'teodoro.ramos@cidg.pnp.gov.ph',
    contact_number: '09395556677',
    agency: 'LEA Admin',
    region: 'Region I - Ilocos Region',
    department: 'Operations Support Division',
    position: 'Regional Admin Officer',
    status: 'Invited',
  },
  {
    id: 'lea-adm-007',
    first_name: 'Danilo',
    middle_name: 'Morales',
    last_name: 'Gutierrez',
    fullname: 'Danilo Morales Gutierrez',
    employee_id: 'CIDG-ADM-0723',
    email: 'danilo.gutierrez@cidg.pnp.gov.ph',
    contact_number: '09176667788',
    agency: 'LEA Admin',
    region: 'Region II - Cagayan Valley',
    department: 'Anti-Cybercrime Administrative Unit',
    position: 'Regional Operations Admin',
    status: 'Pending Approval',
    is_active: false,
    is_locked: false,
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

function AdminMgmtActionDropdown({ admin, onAction, onView, onEdit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const displayStatus = computeAdminStatus(admin);

  function openMenu() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const upward = spaceBelow < 190;
    setMenuPos({
      top: upward ? Math.max(8, rect.top - 170) : rect.bottom + 6,
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

            {/* Active -> Edit Profile, Suspend (STRICTLY NO RESET PASSWORD IN ADMIN MGMT!) */}
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
            {(displayStatus === 'Suspended' || displayStatus === 'Suspend') && (
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

            {/* Pending Approval -> Activate */}
            {displayStatus === 'Pending Approval' && (
              <button
                className="LEAAdminDropdownItem primary-action"
                onClick={() => {
                  onAction('activate');
                  setIsOpen(false);
                }}
              >
                <CheckCircle2 size={14} /> Activate Account
              </button>
            )}

            {/* Resend link */}
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

            {/* Link Expired -> Delete */}
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
  resend: {
    title: 'Resend Admin Invitation',
    message: 'Are you sure you want to resend the registration link to this LEA administrator?',
    confirmLabel: 'Resend Link',
  },
  suspend: {
    title: 'Suspend Admin Account',
    message: 'Are you sure you want to suspend this administrator account? Administrative access will be temporarily revoked.',
    confirmLabel: 'Suspend Account',
  },
  reactivate: {
    title: 'Reactivate Admin Account',
    message: 'Are you sure you want to reactivate this administrator account? Administrative privileges will be restored immediately.',
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
    message: 'Are you sure you want to activate this administrator account? Administrative privileges will be restored immediately.',
    confirmLabel: 'Activate Account',
  },
};

function ConfirmModal({ open, actionType, onConfirm, onCancel }) {
  if (!open) return null;
  const meta = CONFIRM_MESSAGES[actionType] || {};
  const isDestructive = actionType === 'suspend' || actionType === 'delete';

  return (
    <div className="LEAAdminModalOverlay">
      <div className="LEAAdminModal" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          {isDestructive ? (
            <TriangleAlert size={44} color="#d97706" strokeWidth={2.5} />
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

// 2-Step Add LEA Admin Flow
function AddAdminFlow({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    agency: 'LEA Admin', // Read-only
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
        agency: 'LEA Admin',
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
        errs.contactNumber = 'Enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 09189876543).';
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
    const newAdmin = {
      id: `lea-adm-${Date.now()}`,
      first_name: formData.firstName.trim(),
      middle_name: formData.middleName.trim(),
      last_name: formData.lastName.trim(),
      fullname: fullName,
      employee_id: formData.employeeId.trim(),
      email: formData.email.trim().toLowerCase(),
      contact_number: formData.contactNumber.trim(),
      agency: 'LEA Admin',
      region: formData.region,
      department: formData.department.trim(),
      position: formData.position.trim(),
      status: 'Active', // Confirmed accounts automatically Active
    };

    onCreated(newAdmin);
    onClose();
  }

  return (
    <div className="LEAAdminModalOverlay">
      {step === 1 ? (
        <div className="LEAAdminModal LEAAdminAddModal">
          <div className="LEAAdminModalHeader">
            <h3 className="LEAAdminModalTitle">Add New LEA Admin</h3>
            <p className="LEAAdminModalSubtitle">
              Provision a new administrator account for LEA workspace operations.
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
                      placeholder="e.g. Dominic"
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
                      placeholder="e.g. Cruz (Optional)"
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
                      placeholder="e.g. Valdez"
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
                      placeholder="e.g. CIDG-ADM-0892 (Optional)"
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
                      placeholder="e.g. 09189876543"
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
                    placeholder="e.g. dominic.valdez@cidg.gov.ph"
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
                      placeholder="e.g. Regional Administration (Optional)"
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
                      placeholder="e.g. Regional Director (Optional)"
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
            <h3 className="LEAAdminModalTitle">Confirm Administrator Creation</h3>
            <p className="LEAAdminModalSubtitle">
              Verify administrator credentials before finalizing account creation.
            </p>
          </div>

          <div className="LEAAdminModalBody">
            <div className="LEAAdminSummaryNotice">
              <CircleCheckBig size={18} />
              <span>This account will be created directly with <strong>Active</strong> administrative status.</span>
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
                  <span className="LEAAdminAgencyTag">LEA Admin</span>
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
              Confirm / Add New Admin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Profile Modal for LEA Admin
function EditAdminModal({ open, admin, onClose, onSave }) {
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    agency: 'LEA Admin',
    region: '',
    department: '',
    position: '',
  });

  useEffect(() => {
    if (admin) {
      setForm({
        firstName: admin.first_name || '',
        middleName: admin.middle_name || '',
        lastName: admin.last_name || '',
        employeeId: admin.employee_id || '',
        contactNumber: admin.contact_number || '',
        email: admin.email || '',
        agency: 'LEA Admin',
        region: admin.region || 'National Capital Region (NCR)',
        department: admin.department || '',
        position: admin.position || '',
      });
    }
  }, [admin]);

  if (!open || !admin) return null;

  function handleSave(e) {
    e.preventDefault();
    const updated = {
      ...admin,
      first_name: form.firstName.trim(),
      middle_name: form.middleName.trim(),
      last_name: form.lastName.trim(),
      fullname: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' '),
      employee_id: form.employeeId.trim(),
      contact_number: form.contactNumber.trim(),
      email: form.email.trim(),
      agency: 'LEA Admin',
      region: form.region,
      department: form.department.trim(),
      position: form.position.trim(),
    };
    onSave(updated);
    onClose();
  }

  return (
    <div className="LEAAdminModalOverlay">
      <div className="LEAAdminModal">
        <div className="LEAAdminModalHeader">
          <h3 className="LEAAdminModalTitle">Edit Administrator Profile</h3>
          <p className="LEAAdminModalSubtitle">Update credentials for this LEA Administrator.</p>
          <button className="LEAAdminModalCloseBtn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="LEAAdminModalBody">
            <div className="LEAAdminFormGrid">
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">First Name</label>
                <input
                  type="text"
                  className="LEAAdminInput"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Middle Name</label>
                <input
                  type="text"
                  className="LEAAdminInput"
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                />
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Last Name</label>
                <input
                  type="text"
                  className="LEAAdminInput"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Employee ID</label>
                <input
                  type="text"
                  className="LEAAdminInput"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                />
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Contact Number</label>
                <input
                  type="tel"
                  maxLength={11}
                  className="LEAAdminInput"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  required
                />
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Email Address</label>
                <input
                  type="email"
                  className="LEAAdminInput"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Agency (Read-only)</label>
                <input
                  type="text"
                  className="LEAAdminInput readonly-input"
                  value={form.agency}
                  readOnly
                  disabled
                />
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Region</label>
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
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Department</label>
                <input
                  type="text"
                  className="LEAAdminInput"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
              <div className="LEAAdminFormGroup">
                <label className="LEAAdminLabel">Position</label>
                <input
                  type="text"
                  className="LEAAdminInput"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
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

// View Admin Details
function ViewAdminModal({ open, admin, onClose }) {
  if (!open || !admin) return null;

  const resolvedFullName =
    admin.fullname ||
    [admin.first_name, admin.middle_name, admin.last_name].filter(Boolean).join(' ') ||
    '-';

  return (
    <div className="LEAAdminModalOverlay">
      <div className="LEAAdminModal LEAAdminViewModal">
        <div className="LEAAdminModalHeader">
          <h3 className="LEAAdminModalTitle">Administrator Details</h3>
          <p className="LEAAdminModalSubtitle">Viewing administrative account information.</p>
          <button className="LEAAdminModalCloseBtn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="LEAAdminModalBody">
          <div className="LEAAdminSummaryBox">
            <div className="LEAAdminVDGrid three-col">
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">First Name</span>
                <span className="LEAAdminVDValue">{admin.first_name || '-'}</span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Middle Name</span>
                <span className="LEAAdminVDValue">{admin.middle_name || '-'}</span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Last Name</span>
                <span className="LEAAdminVDValue">{admin.last_name || '-'}</span>
              </div>

              <div className="LEAAdminVDField full-span">
                <span className="LEAAdminVDLabel">Full Name</span>
                <span className="LEAAdminVDValue">{resolvedFullName}</span>
              </div>

              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Employee ID</span>
                <span className="LEAAdminVDValue">{admin.employee_id || '-'}</span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Contact Number</span>
                <span className="LEAAdminVDValue">{admin.contact_number || '-'}</span>
              </div>

              <div className="LEAAdminVDField full-span">
                <span className="LEAAdminVDLabel">Email Address</span>
                <span className="LEAAdminVDValue LEAAdminEmailCell">{admin.email || '-'}</span>
              </div>

              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Agency</span>
                <span className="LEAAdminVDValue">
                  <span className="LEAAdminAgencyTag">{admin.agency || 'LEA Admin'}</span>
                </span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Region</span>
                <span className="LEAAdminVDValue">{admin.region || '-'}</span>
              </div>

              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Department</span>
                <span className="LEAAdminVDValue">{admin.department || '-'}</span>
              </div>
              <div className="LEAAdminVDField">
                <span className="LEAAdminVDLabel">Position</span>
                <span className="LEAAdminVDValue">{admin.position || '-'}</span>
              </div>

              <div className="LEAAdminVDField full-span">
                <span className="LEAAdminVDLabel">Account Status</span>
                <span className="LEAAdminVDValue">
                  <StatusBadge status={admin} />
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


export default function LEAAdminAdminManagement() {
  const [admins, setAdmins] = useState(INITIAL_LEA_ADMINS);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewAdmin, setViewAdmin] = useState(null);
  const [editAdmin, setEditAdmin] = useState(null);
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

  function handleAddAdminSuccess(newAdmin) {
    setAdmins((prev) => [newAdmin, ...prev]);
    showToast(`LEA Admin account for ${newAdmin.fullname} created and activated.`);
  }

  function openConfirm(actionType, adminId) {
    setConfirmModal({ open: true, actionType, targetId: adminId });
  }

  function handleConfirmAction() {
    const { actionType, targetId } = confirmModal;
    setAdmins((prev) =>
      prev.flatMap((a) => {
        if (a.id !== targetId) return [a];
        if (actionType === 'activate') {
          showToast(`Admin account ${a.fullname} activated.`);
          return [{ ...a, status: 'Active', is_active: true, is_locked: false }];
        }
        if (actionType === 'suspend') {
          showToast(`Admin account ${a.fullname} suspended.`);
          return [{ ...a, status: 'Suspended', is_active: false }];
        }
        if (actionType === 'reactivate') {
          showToast(`Admin account ${a.fullname} reactivated.`);
          return [{ ...a, status: 'Active', is_active: true, is_locked: false }];
        }
        if (actionType === 'unlock') {
          showToast(`Admin account ${a.fullname} unlocked.`);
          return [{ ...a, status: 'Active', is_active: true, is_locked: false }];
        }
        if (actionType === 'resend') {
          showToast(`Invitation resent to ${a.email}.`);
          return [{ ...a, status: 'Invited' }];
        }
        if (actionType === 'delete') {
          showToast(`Admin entry for ${a.fullname} deleted.`);
          return [];
        }
        return [a];
      })
    );
    setConfirmModal({ open: false, actionType: '', targetId: null });
  }

  function handleSaveEdit(updatedAdmin) {
    setAdmins((prev) => prev.map((a) => (a.id === updatedAdmin.id ? updatedAdmin : a)));
    showToast(`Profile for ${updatedAdmin.fullname} successfully updated.`);
  }

  // Search & Filter
  const filteredAdmins = admins.filter((a) => {
    const dispStatus = computeAdminStatus(a);
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : dispStatus === statusFilter ||
          (statusFilter === 'Suspended' && dispStatus === 'Suspend');
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
                  LEA Admin Management
                  <span className="LEAAdminAgencyTag">LEA Admin</span>
                </h1>
                <p className="LEAAdminPageSubtitle">
                  Manage law enforcement administrators — provision and monitor CIDG administrative workspace access.
                </p>
              </div>
              <button
                id="lea-add-admin-btn"
                className="LEAAdminAddBtn"
                onClick={() => setAddFlowOpen(true)}
              >
                <span>＋</span> Add New Admin
              </button>
            </div>

            {/* Stats Row - Primary Account States Only */}
            <div className="LEAAdminStatsRow">
              {[
                {
                  label: 'Active',
                  value: admins.filter((a) => computeAdminStatus(a) === 'Active').length,
                  className: 'stat-active',
                },
                {
                  label: 'Suspended',
                  value: admins.filter((a) => {
                    const s = computeAdminStatus(a);
                    return s === 'Suspended' || s === 'Suspend';
                  }).length,
                  className: 'stat-suspended',
                },
                {
                  label: 'Locked',
                  value: admins.filter((a) => computeAdminStatus(a) === 'Locked').length,
                  className: 'stat-locked',
                },
              ].map((s) => (
                <div key={s.label} className={`LEAAdminStatCard ${s.className}`}>
                  <span className="LEAAdminStatValue">{s.value}</span>
                  <span className="LEAAdminStatLabel">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Filters & Search */}
            <div className="LEAAdminFiltersContainer">
              <div className="LEAAdminSearchGroup">
                <Search size={16} className="LEAAdminSearchIcon" />
                <input
                  type="text"
                  className="LEAAdminSearchInput"
                  placeholder="Search by admin name, email, employee ID, region..."
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
                    <th>Region</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAdmins.length > 0 ? (
                    displayedAdmins.map((admin, idx) => (
                      <tr key={admin.id}>
                        <td className="LEAAdminTdCenter">{startIndex + idx + 1}</td>
                        <td>
                          <strong>{admin.fullname}</strong>
                        </td>
                        <td className="LEAAdminEmailCell">{admin.email}</td>
                        <td>{admin.employee_id || '-'}</td>
                        <td>{admin.region || '-'}</td>
                        <td>{admin.department || '-'}</td>
                        <td>
                          <StatusBadge status={admin} />
                        </td>
                        <td className="LEAAdminTdCenter">
                          <AdminMgmtActionDropdown
                            admin={admin}
                            onAction={(type) => openConfirm(type, admin.id)}
                            onView={() => setViewAdmin(admin)}
                            onEdit={() => setEditAdmin(admin)}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="LEAAdminEmpty">
                        No LEA Administrator accounts found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalItems > 0 && (
                <div className="LEAAdminPaginationWrapper">
                  <span className="LEAAdminPaginationInfo">
                    Showing {startIndex + 1}–{endIndex} of {totalItems} admin entries
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

      {/* Add Admin Flow */}
      <AddAdminFlow
        open={addFlowOpen}
        onClose={() => setAddFlowOpen(false)}
        onCreated={handleAddAdminSuccess}
      />

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmModal.open}
        actionType={confirmModal.actionType}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmModal({ open: false, actionType: '', targetId: null })}
      />

      {/* View Admin Modal */}
      <ViewAdminModal
        open={!!viewAdmin}
        admin={viewAdmin}
        onClose={() => setViewAdmin(null)}
      />

      {/* Edit Admin Modal */}
      <EditAdminModal
        open={!!editAdmin}
        admin={editAdmin}
        onClose={() => setEditAdmin(null)}
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
