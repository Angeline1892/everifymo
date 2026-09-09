// desktopfrontend/src/pages/fdaadminfolder/fda-admin-admin-management.jsx
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
  Edit3,
  Search,
  CheckCircle2,
  ShieldAlert,
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
  return <span className={`FDAAdminStatusBadge ${meta.className}`}>{meta.label}</span>;
}

// Realistic mock FDA Admin accounts
const INITIAL_FDA_ADMINS = [
  {
    id: 'fda-adm-001',
    first_name: 'Gabriel',
    middle_name: 'Jose',
    last_name: 'Alvarez',
    fullname: 'Gabriel Jose Alvarez',
    employee_id: 'FDA-ADM-0104',
    email: 'gabriel.alvarez@fda.gov.ph',
    contact_number: '09171234567',
    agency: 'FDA Admin',
    region: 'National Capital Region (NCR)',
    department: 'Executive Field Regulatory Bureau',
    position: 'Regional Admin Supervisor',
    status: 'Active',
  },
  {
    id: 'fda-adm-002',
    first_name: 'Lourdes',
    middle_name: 'Santos',
    last_name: 'Magsaysay',
    fullname: 'Lourdes Santos Magsaysay',
    employee_id: 'FDA-ADM-0219',
    email: 'lourdes.magsaysay@fda.gov.ph',
    contact_number: '09228881234',
    agency: 'FDA Admin',
    region: 'Region VII - Central Visayas',
    department: 'Field Operations Administration',
    position: 'Regional Administrator',
    status: 'Active',
  },
  {
    id: 'fda-adm-003',
    first_name: 'Cynthia',
    middle_name: 'Navarro',
    last_name: 'Dizon',
    fullname: 'Cynthia Navarro Dizon',
    employee_id: 'FDA-ADM-0435',
    email: 'cynthia.dizon@fda.gov.ph',
    contact_number: '09176543210',
    agency: 'FDA Admin',
    region: 'Region IV-A - CALABARZON',
    department: 'Regulatory Compliance and Oversight',
    position: 'Senior Administrative Officer',
    status: 'Link Expired',
  },
  {
    id: 'fda-adm-004',
    first_name: 'Angelica',
    middle_name: 'Torres',
    last_name: 'Aquino',
    fullname: 'Angelica Torres Aquino',
    employee_id: 'FDA-ADM-0678',
    email: 'angelica.aquino@fda.gov.ph',
    contact_number: '09289900112',
    agency: 'FDA Admin',
    region: 'Region I - Ilocos Region',
    department: 'Inspection & Enforcement Management',
    position: 'Regional Admin Coordinator',
    status: 'Suspended',
  },
  {
    id: 'fda-adm-005',
    first_name: 'Eduardo',
    middle_name: 'Cruz',
    last_name: 'Bermudez',
    fullname: 'Eduardo Cruz Bermudez',
    employee_id: 'FDA-ADM-0891',
    email: 'eduardo.bermudez@fda.gov.ph',
    contact_number: '09193344556',
    agency: 'FDA Admin',
    region: 'Region III - Central Luzon',
    department: 'Inter-Agency Operations',
    position: 'Security & Access Administrator',
    status: 'Locked',
  },
  {
    id: 'fda-adm-006',
    first_name: 'Patricia',
    middle_name: 'Roxas',
    last_name: 'Lim',
    fullname: 'Patricia Roxas Lim',
    employee_id: 'FDA-ADM-0922',
    email: 'patricia.lim@fda.gov.ph',
    contact_number: '09214455667',
    agency: 'FDA Admin',
    region: 'Region XI - Davao Region',
    department: 'Administrative Services Division',
    position: 'Associate Admin Director',
    status: 'Invited',
  },
  {
    id: 'fda-adm-007',
    first_name: 'Mariano',
    middle_name: 'Ponce',
    last_name: 'Castillo',
    fullname: 'Mariano Ponce Castillo',
    employee_id: 'FDA-ADM-0554',
    email: 'mariano.castillo@fda.gov.ph',
    contact_number: '09175556677',
    agency: 'FDA Admin',
    region: 'Region II - Cagayan Valley',
    department: 'Field Operations Administration',
    position: 'Regional Admin Officer',
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

            {/* Active -> Edit Profile, Suspend (NO RESET PASSWORD ON ADMIN MGMT!) */}
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
            {(displayStatus === 'Suspended' || displayStatus === 'Suspend') && (
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

            {/* Pending Approval -> Activate */}
            {displayStatus === 'Pending Approval' && (
              <button
                className="FDAAdminDropdownItem primary-action"
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
                className="FDAAdminDropdownItem"
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

// 2-Step Add FDA Admin Flow
function AddAdminFlow({ open, onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    agency: 'FDA Admin', // Read-only
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
        agency: 'FDA Admin',
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
    setStep(2);
  }

  function handleFinalConfirm() {
    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');
    const newAdmin = {
      id: `fda-adm-${Date.now()}`,
      first_name: formData.firstName.trim(),
      middle_name: formData.middleName.trim(),
      last_name: formData.lastName.trim(),
      fullname: fullName,
      employee_id: formData.employeeId.trim(),
      email: formData.email.trim().toLowerCase(),
      contact_number: formData.contactNumber.trim(),
      agency: 'FDA Admin',
      region: formData.region,
      department: formData.department.trim(),
      position: formData.position.trim(),
      status: 'Active', // Confirmed accounts automatically Active
    };

    onCreated(newAdmin);
    onClose();
  }

  return (
    <div className="FDAAdminModalOverlay">
      {step === 1 ? (
        <div className="FDAAdminModal FDAAdminAddModal">
          <div className="FDAAdminModalHeader">
            <h3 className="FDAAdminModalTitle">Add New FDA Admin</h3>
            <p className="FDAAdminModalSubtitle">
              Provision a new administrative account for FDA workspace operations.
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

              {/* Row 2: Employee ID, Contact Number */}
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
        /* STEP 2: Summary Confirmation */
        <div className="FDAAdminModal" style={{ maxWidth: '480px' }}>
          <div className="FDAAdminModalHeader">
            <h3 className="FDAAdminModalTitle">Confirm Administrator Creation</h3>
            <p className="FDAAdminModalSubtitle">
              Verify administrator credentials before finalizing account creation.
            </p>
          </div>

          <div className="FDAAdminModalBody">
            <div className="FDAAdminSummaryNotice">
              <CircleCheckBig size={18} />
              <span>This account will be created directly with <strong>Active</strong> administrative status.</span>
            </div>

            <div className="FDAAdminSummaryBox">
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Full Name:</span>
                <span className="FDAAdminSummaryValue">
                  {[formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ') || '-'}
                </span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">First Name:</span>
                <span className="FDAAdminSummaryValue">{formData.firstName || '-'}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Middle Name:</span>
                <span className="FDAAdminSummaryValue">{formData.middleName || '-'}</span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Last Name:</span>
                <span className="FDAAdminSummaryValue">{formData.lastName || '-'}</span>
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
                  <span className="FDAAdminAgencyTag">FDA Admin</span>
                </span>
              </div>
              <div className="FDAAdminSummaryRow">
                <span className="FDAAdminSummaryLabel">Region:</span>
                <span className="FDAAdminSummaryValue">{formData.region || '-'}</span>
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
          </div>

          <div className="FDAAdminModalFooter">
            <button type="button" className="FDAAdminCancelBtn" onClick={() => setStep(1)}>
              Go Back
            </button>
            <button type="button" className="FDAAdminConfirmBtn primary" onClick={handleFinalConfirm}>
              Confirm / Add New Admin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Profile Modal for FDA Admin
function EditAdminModal({ open, admin, onClose, onSave }) {
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    agency: 'FDA Admin',
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
        agency: 'FDA Admin',
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
      agency: 'FDA Admin',
      region: form.region,
      department: form.department.trim(),
      position: form.position.trim(),
    };
    onSave(updated);
    onClose();
  }

  return (
    <div className="FDAAdminModalOverlay">
      <div className="FDAAdminModal">
        <div className="FDAAdminModalHeader">
          <h3 className="FDAAdminModalTitle">Edit Administrator Profile</h3>
          <p className="FDAAdminModalSubtitle">Update credentials for this FDA Administrator.</p>
          <button className="FDAAdminModalCloseBtn" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="FDAAdminModalBody">
            <div className="FDAAdminFormGrid">
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">First Name</label>
                <input
                  type="text"
                  className="FDAAdminInput"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Middle Name</label>
                <input
                  type="text"
                  className="FDAAdminInput"
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                />
              </div>
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Last Name</label>
                <input
                  type="text"
                  className="FDAAdminInput"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Employee ID</label>
                <input
                  type="text"
                  className="FDAAdminInput"
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                />
              </div>
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Contact Number</label>
                <input
                  type="tel"
                  maxLength={11}
                  className="FDAAdminInput"
                  value={form.contactNumber}
                  onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                  required
                />
              </div>
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Email Address</label>
                <input
                  type="email"
                  className="FDAAdminInput"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Agency (Read-only)</label>
                <input
                  type="text"
                  className="FDAAdminInput readonly-input"
                  value={form.agency}
                  readOnly
                  disabled
                />
              </div>
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Region</label>
                <select
                  className="FDAAdminSelect"
                  style={{ width: '100%' }}
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                >
                  {PHILIPPINE_REGIONS.map((reg) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Department</label>
                <input
                  type="text"
                  className="FDAAdminInput"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </div>
              <div className="FDAAdminFormGroup">
                <label className="FDAAdminLabel">Position</label>
                <input
                  type="text"
                  className="FDAAdminInput"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
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

// View Admin Details
function ViewAdminModal({ open, admin, onClose }) {
  if (!open || !admin) return null;

  const resolvedFullName =
    admin.fullname ||
    [admin.first_name, admin.middle_name, admin.last_name].filter(Boolean).join(' ') ||
    '-';

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
                <span className="FDAAdminVDValue">{resolvedFullName}</span>
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
                  <StatusBadge status={admin} />
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
  const [admins, setAdmins] = useState(INITIAL_FDA_ADMINS);
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
    showToast(`FDA Admin account for ${newAdmin.fullname} created and activated.`);
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

            {/* Stats Row - Primary Account States Only */}
            <div className="FDAAdminStatsRow">
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
                <div key={s.label} className={`FDAAdminStatCard ${s.className}`}>
                  <span className="FDAAdminStatValue">{s.value}</span>
                  <span className="FDAAdminStatLabel">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Filters & Search */}
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

            {/* Table */}
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
                  {displayedAdmins.length > 0 ? (
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
                          <StatusBadge status={admin} />
                        </td>
                        <td className="FDAAdminTdCenter">
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
                      <td colSpan={8} className="FDAAdminEmpty">
                        No FDA Administrator accounts found matching current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {totalItems > 0 && (
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
        <div className="FDAAdminToast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
