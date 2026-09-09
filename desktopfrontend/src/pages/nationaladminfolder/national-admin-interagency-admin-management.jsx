import './national-admin-css.css';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  UserX,
  UserCheck,
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

// Realistic Philippine regions list
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

// Initial realistic mock data for Regional Agency Admins (FDA & LEA)
const INITIAL_REGIONAL_ADMINS = [
  {
    id: 'ra-001',
    first_name: 'Gabriel',
    middle_name: 'Jose',
    last_name: 'Alvarez',
    fullname: 'Gabriel Jose Alvarez',
    employee_id: 'FDA-REG-0104',
    contact_number: '09171234567',
    email: 'gabriel.alvarez@fda.gov.ph',
    agency: 'FDA',
    region: 'National Capital Region (NCR)',
    department: 'Regulatory Compliance and Inspection',
    position: 'Regional Admin Supervisor',
    status: 'Active',
    is_locked: false,
  },
  {
    id: 'ra-002',
    first_name: 'Dominic',
    middle_name: 'Cruz',
    last_name: 'Valdez',
    fullname: 'Dominic Cruz Valdez',
    employee_id: 'CIDG-REG-0892',
    contact_number: '09189876543',
    email: 'dominic.valdez@cidg.pnp.gov.ph',
    agency: 'LEA-CIDG',
    region: 'Region III - Central Luzon',
    department: 'Special Operations Division',
    position: 'Regional Investigation Admin',
    status: 'Active',
    is_locked: false,
  },
  {
    id: 'ra-003',
    first_name: 'Lourdes',
    middle_name: 'Santos',
    last_name: 'Magsaysay',
    fullname: 'Lourdes Santos Magsaysay',
    employee_id: 'FDA-REG-0219',
    contact_number: '09228881234',
    email: 'lourdes.magsaysay@fda.gov.ph',
    agency: 'FDA',
    region: 'Region VII - Central Visayas',
    department: 'Field Regulatory Enforcement',
    position: 'Regional Director / Admin',
    status: 'Suspended',
    is_locked: false,
  },
  {
    id: 'ra-004',
    first_name: 'Renato',
    middle_name: 'Perez',
    last_name: 'Soriano',
    fullname: 'Renato Perez Soriano',
    employee_id: 'CIDG-REG-0341',
    contact_number: '09194567890',
    email: 'renato.soriano@cidg.pnp.gov.ph',
    agency: 'LEA-CIDG',
    region: 'Region XI - Davao Region',
    department: 'Anti-Fraud and Counterfeiting Unit',
    position: 'Senior Regional Admin',
    status: 'Locked',
    is_locked: true,
  },
  {
    id: 'ra-005',
    first_name: 'Cynthia',
    middle_name: 'Navarro',
    last_name: 'Dizon',
    fullname: 'Cynthia Navarro Dizon',
    employee_id: 'FDA-REG-0435',
    contact_number: '09176543210',
    email: 'cynthia.dizon@fda.gov.ph',
    agency: 'FDA',
    region: 'Region IV-A - CALABARZON',
    department: 'Post-Marketing Surveillance',
    position: 'Regional Admin Officer',
    status: 'Active',
    is_locked: false,
  },
  {
    id: 'ra-006',
    first_name: 'Marc',
    middle_name: 'Villanueva',
    last_name: 'Tan',
    fullname: 'Marc Villanueva Tan',
    employee_id: 'CIDG-REG-0512',
    contact_number: '09201122334',
    email: 'marc.tan@cidg.pnp.gov.ph',
    agency: 'LEA-CIDG',
    region: 'Region VI - Western Visayas',
    department: 'Criminal Investigation Branch',
    position: 'Agency Admin Specialist',
    status: 'Link Expired',
    is_locked: false,
  },
  {
    id: 'ra-007',
    first_name: 'Angelica',
    middle_name: 'Torres',
    last_name: 'Aquino',
    fullname: 'Angelica Torres Aquino',
    employee_id: 'FDA-REG-0678',
    contact_number: '09289900112',
    email: 'angelica.aquino@fda.gov.ph',
    agency: 'FDA',
    region: 'Region I - Ilocos Region',
    department: 'Inspection and Licensing',
    position: 'Regional Administrator',
    status: 'Invited',
    is_locked: false,
  },
  {
    id: 'ra-008',
    first_name: 'Danilo',
    middle_name: 'Morales',
    last_name: 'Gutierrez',
    fullname: 'Danilo Morales Gutierrez',
    employee_id: 'FDA-REG-0723',
    contact_number: '09176667788',
    email: 'danilo.gutierrez@fda.gov.ph',
    agency: 'FDA',
    region: 'Region II - Cagayan Valley',
    department: 'Field Operations Administration',
    position: 'Regional Admin Officer',
    status: 'Pending Approval',
    is_active: false,
    is_locked: false,
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
  isOpen,
  toggleDropdown,
  onAction,
  onView,
}) {
  const status = computeAdminStatus(regionalAdmin);
  const [openUpward, setOpenUpward] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const upward = spaceBelow < 180;
      setOpenUpward(upward);
      setMenuPos({
        top: upward ? Math.max(8, rect.top - 160) : rect.bottom + 4,
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

            {status === 'Active' && (
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

            {status === 'Suspended' && (
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

function AddRegionalAdminModal({ open, onClose, onAddSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    agency: '',
    region: '',
    department: '',
    position: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [sending, setSending] = useState(false);

  function resetForm() {
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      employeeId: '',
      contactNumber: '',
      email: '',
      agency: '',
      region: '',
      department: '',
      position: '',
    });
    setFormErrors({});
    setSuccessMsg('');
    setSending(false);
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
    if (!formData.region) errors.region = 'Region is required. Please select an agency region.';

    return errors;
  }

  function handleSend() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setSending(true);

    // Simulate account creation & invite dispatch with state update
    setTimeout(() => {
      setSending(false);
      setSuccessMsg(
        `Administrator account created! Invitation has been sent to ${formData.email.trim()}`
      );

      const parts = [
        formData.firstName.trim(),
        formData.middleName.trim(),
        formData.lastName.trim(),
      ].filter(Boolean);

      onAddSuccess({
        id: `ra-${Date.now()}`,
        first_name: formData.firstName.trim(),
        middle_name: formData.middleName.trim() || null,
        last_name: formData.lastName.trim(),
        fullname: parts.join(' '),
        employee_id: formData.employeeId.trim(),
        contact_number: formData.contactNumber.trim(),
        email: formData.email.trim(),
        agency: formData.agency,
        region: formData.region,
        department: formData.department.trim(),
        position: formData.position.trim(),
        status: 'Active',
        is_locked: false,
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
                    name="region"
                    className={`NAMSelect with-icon ${formErrors.region ? 'input-error' : ''}`}
                    value={formData.region}
                    onChange={handleInputChange}
                    disabled={sending}
                  >
                    <option value="">Select Region</option>
                    {PHILIPPINE_REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                {formErrors.region && (
                  <span className="NAMFieldError">
                    <AlertCircle size={12} /> {formErrors.region}
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

            <div className="NAMModalFooter">
              <button className="NAMCancelBtn" onClick={handleClose} disabled={sending}>
                Cancel
              </button>
              <button
                className="NAMConfirmBtn primary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? 'Creating Account…' : 'Create Admin Account'}
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
  const [regionalAdmins, setRegionalAdmins] = useState(INITIAL_REGIONAL_ADMINS);
  const [regionalAdminLoading, setRegionalAdminLoading] = useState(false);
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

  function handleAddSuccess(newAdmin) {
    setRegionalAdmins((prev) => [newAdmin, ...prev]);
  }

  function openConfirm(actionType, adminId) {
    setRegionalAdminConfirmModal({ open: true, actionType, targetId: adminId });
  }

  function handleConfirmAction() {
    const { actionType, targetId } = regionalAdminConfirmModal;

    setRegionalAdmins((prev) =>
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
              return { ...admin, status: 'Invited' };
            default:
              return admin;
          }
        })
        .filter((admin) => (actionType === 'delete' ? admin.id !== targetId : true))
    );

    setRegionalAdminConfirmModal({ open: false, actionType: '', targetId: null });
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
      a.email.toLowerCase().includes(query) ||
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
                          <RegionalAdminActionDropdown
                            regionalAdmin={admin}
                            isOpen={regionalAdminActiveDropdownId === admin.id}
                            toggleDropdown={() =>
                              setRegionalAdminActiveDropdownId(
                                regionalAdminActiveDropdownId === admin.id ? null : admin.id
                              )
                            }
                            onAction={(type) => openConfirm(type, admin.id)}
                            onView={() => setRegionalAdminViewAdmin(admin)}
                          />
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
