import './superadmin-css.css';
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
} from 'lucide-react';
import Sidebar from '../component/sidebar';
import TopBar from '../component/top-bar';
import { apiFetch } from '../../utils/apiFetch';
import { ADMIN_STATUS_META } from './superadmin-status-colors';

// Decode current superadmin's user_id from the JWT access token payload
function getCurrentAdminId() {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

// Maps backend SuperadminListItem -> frontend row shape
function mapAdmin(item) {
  const firstName = item.first_name || item.firstName || '';
  const lastName = item.last_name || item.lastName || '';
  const fullName = item.fullname || item.full_name || item.fullName || (firstName || lastName ? `${firstName} ${lastName}`.trim() : '');

  return {
    id: item.admin_id,
    first_name: firstName,
    last_name: lastName,
    fullname: fullName,
    email: item.email,
    invitation_date: item.invitation_date ? item.invitation_date.split('T')[0] : null,
    expiration_date: item.expiration_date ? item.expiration_date.split('T')[0] : null,
    status: item.status,
    is_locked: item.is_locked,
  };
}

function SAMStatusBadge({ status }) {
  const meta = ADMIN_STATUS_META[status] || { label: status, className: '' };
  return <span className={`SAMStatusBadge ${meta.className}`}>{meta.label}</span>;
}


function SAMActionDropdown({ admin, isSelf, isOpen, toggleDropdown, onAction, onView }) {
  const status = admin.status;
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
    <div className={`SAMDropdownWrapper ${isOpen ? 'active-open' : ''}`}>
      <button
        ref={triggerRef}
        className="SAMDropdownTrigger"
        data-tooltip="Actions"
        title="More Actions"
        onClick={handleToggle}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen &&
        createPortal(
          <div
            className={`SAMDropdownMenu ${openUpward ? 'open-upward' : ''}`}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              zIndex: 9999,
              width:`150px`,
            }}
          >
          <button
            className="SAMDropdownItem"
            onClick={() => {
              onView();
              toggleDropdown();
            }}
          >
            <Eye size={14} /> View Details
          </button>

          {/* Resend Requested / Link Expired — Resend Invitation */}
          {['Resend Requested', 'Link Expired'].includes(status) && (
            <button
              className="SAMDropdownItem"
              onClick={() => {
                onAction('resend');
                toggleDropdown();
              }}
            >
              <Send size={14} /> Resend Invitation
            </button>
          )}

          {/* Link Expired — Delete Invitation */}
          {status === 'Link Expired' && (
            <>
              <div className="SAMDropdownDivider" />
              <button
                className="SAMDropdownItem danger"
                onClick={() => {
                  onAction('delete');
                  toggleDropdown();
                }}
              >
                <Trash2 size={14} /> Delete Account
              </button>
            </>
          )}

          {/* Pending Approval — Activate */}
          {status === 'Pending Approval' && (
            <button
              className="SAMDropdownItem"
              onClick={() => {
                onAction('activate');
                toggleDropdown();
              }}
            >
              <ShieldCheck size={14} /> Activate Account
            </button>
          )}

          {/* Locked Account — Unlock */}
          {status === 'Locked' && (
            <button
              className="SAMDropdownItem"
              onClick={() => {
                onAction('unlock');
                toggleDropdown();
              }}
            >
              <RotateCcw size={14} /> Unlock Account
            </button>
          )}

          {/* Active — hidden for your own row */}
          {status === 'Active' && !isSelf && (
            <>
              <div className="SAMDropdownDivider" />
              <button
                className="SAMDropdownItem"
                onClick={() => {
                  onAction('suspend');
                  toggleDropdown();
                }}
              >
                <UserX size={14} /> Suspend Account
              </button>
            </>
          )}

          {/* Suspended — hidden for your own row */}
          {status === 'Suspended' && !isSelf && (
            <>
              <div className="SAMDropdownDivider" />
              <button
                className="SAMDropdownItem"
                onClick={() => {
                  onAction('reactivate');
                  toggleDropdown();
                }}
              >
                <RotateCcw size={14} /> Reactivate Account
              </button>
              <div className="SAMDropdownDivider" />
              <button
                className="SAMDropdownItem danger"
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

const CONFIRM_MESSAGES = {
  resend: {
    title: 'Resend Invitation Email',
    message: 'Are you sure you want to resend the Superadmin invitation email to this user?',
    confirmLabel: 'Resend Invitation',
  },
  suspend: {
    title: 'Suspend Account',
    message: 'Are you sure you want to suspend this Superadmin account? Access will be temporarily revoked.',
    confirmLabel: 'Suspend Account',
  },
  reactivate: {
    title: 'Reactivate Account',
    message: 'Are you sure you want to reactivate this Superadmin account? Access will be restored immediately.',
    confirmLabel: 'Reactivate Account',
  },
  delete: {
    title: 'Delete Admin Account',
    message: 'Are you sure you want to delete this Superadmin account entry? This action cannot be undone.',
    confirmLabel: 'Delete Account',
  },
  activate: {
    title: 'Activate Superadmin Account',
    message: 'Are you sure you want to activate this Superadmin account? The user will be notified and can now log in.',
    confirmLabel: 'Activate Account',
  },
  unlock: {
    title: 'Unlock Superadmin Account',
    message: 'Are you sure you want to unlock this Superadmin account? Access will be restored immediately.',
    confirmLabel: 'Unlock Account',
  },
};

function SAMConfirmModal({ open, actionType, onConfirm, onCancel }) {
  if (!open) return null;
  const meta = CONFIRM_MESSAGES[actionType] || {};

  const isDestructive = actionType === 'suspend' || actionType === 'delete';
  const isReactivate = actionType === 'reactivate' || actionType === 'unlock' || actionType === 'activate';

  return (
    <div className="SAMModalOverlay">
      <div className="SAMModal SAMConfirmModal">
        <div className="SAMConfirmIcon">
          {isDestructive ? (
            <TriangleAlert size={40} color="#D97706" strokeWidth={2.5} />
          ) : isReactivate ? (
            <CircleCheckBig size={40} color="#0D9488" strokeWidth={2.5} />
          ) : (
            <Mail size={40} color="#0D9488" strokeWidth={2.5} />
          )}
        </div>
        <h3 className="SAMModalTitle">{meta.title}</h3>
        <p className="SAMConfirmMessage">{meta.message}</p>
        <div className="SAMModalFooter">
          <button className="SAMCancelBtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`SAMConfirmBtn ${isDestructive ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSuperadminModal({ open, onClose }) {
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
    onClose(null);
  }

  async function handleSend() {
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

    try {
      const response = await apiFetch('/admin/superadmins/invite', {
        method: 'POST',
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to send invite.');
      }

      setSending(false);
      setSuccessMsg(`Superadmin invitation email has been sent to ${email.trim()}`);
    } catch (err) {
      setSending(false);
      setEmailError(err.message || 'Failed to send invitation.');
    }
  }

  function handleDone() {
    onClose({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
    });
    setFirstName('');
    setLastName('');
    setEmail('');
    setFirstNameError('');
    setLastNameError('');
    setEmailError('');
    setSuccessMsg('');
    setSending(false);
  }

  if (!open) return null;

  return (
    <div className="SAMModalOverlay">
      <div className="SAMModal SAMAddModal">
        <div className="SAMModalHeader">
          <h3 className="SAMModalTitle">Add Superadmin</h3>
          <p className="SAMModalSubtitle">
            Enter the name and email address of the new Superadmin personnel. They will receive an email invitation to set up their password.
          </p>
        </div>

        {!successMsg ? (
          <>
            <div className="SAMFormGroup">
              <label className="SAMLabel">
                First Name <span className="SAMRequired">*</span>
              </label>

              <input
                type="text"
                className={`SAMInput ${firstNameError ? 'input-error' : ''}`}
                placeholder="e.g. Juan"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (firstNameError) setFirstNameError('');
                }}
                disabled={sending}
                autoFocus
              />

              {firstNameError && <span className="SAMFieldError">{firstNameError}</span>}
            </div>

            <div className="SAMFormGroup">
              <label className="SAMLabel">
                Last Name <span className="SAMRequired">*</span>
              </label>

              <input
                type="text"
                className={`SAMInput ${lastNameError ? 'input-error' : ''}`}
                placeholder="e.g. Dela Cruz"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (lastNameError) setLastNameError('');
                }}
                disabled={sending}
              />

              {lastNameError && <span className="SAMFieldError">{lastNameError}</span>}
            </div>

            <div className="SAMFormGroup">
              <label className="SAMLabel">
                Email Address <span className="SAMRequired">*</span>
              </label>

              <input
                type="email"
                className={`SAMInput ${emailError ? 'input-error' : ''}`}
                placeholder="e.g. admin.personnel@icmda.gov.ph"
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

              {emailError && <span className="SAMFieldError">{emailError}</span>}
            </div>

            <div className="SAMModalFooter">
              <button className="SAMCancelBtn" onClick={handleClose} disabled={sending}>
                Cancel
              </button>

              <button
                className="SAMConfirmBtn primary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="SAMSuccessBox">
              <div className="SAMSuccessIcon">✉️</div>
              <p className="SAMSuccessMsg">{successMsg}</p>
            </div>

            <div className="SAMModalFooter SAMFooterCenter">
              <button className="SAMConfirmBtn primary" onClick={handleDone}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ViewAdminModal({ open, admin, onClose }) {
  if (!open || !admin) return null;

  const showExpiration = ['Invited', 'Resend Requested', 'Link Expired'].includes(admin.status);

  return (
    <div className="SAMModalOverlay">
      <div className="SAMModal SAMViewModal">
        <div className="SAMModalHeader">
          <div className="SAMViewTitleRow">
            <ShieldCheck size={24} color="#0D9488" />
            <h3 className="SAMModalTitle">Superadmin Details</h3>
          </div>
          <p className="SAMModalSubtitle">Viewing account status and invitation details.</p>
        </div>

        <div className="SAMViewDetails">
          <div className="SAMDetailRow">
            <span className="SAMDetailLabel">Full Name:</span>
            <span className="SAMDetailValue">{admin.fullname || (admin.first_name || admin.last_name ? `${admin.first_name} ${admin.last_name}`.trim() : '') || '—'}</span>
          </div>
          <div className="SAMDetailRow">
            <span className="SAMDetailLabel">Email Address:</span>
            <span className="SAMDetailValue SAMEmail">{admin.email}</span>
          </div>
          <div className="SAMDetailRow">
            <span className="SAMDetailLabel">Invitation Date:</span>
            <span className="SAMDetailValue">{admin.invitation_date || '—'}</span>
          </div>
          {showExpiration && (
            <div className="SAMDetailRow">
              <span className="SAMDetailLabel">Expiration Date:</span>
              <span className="SAMDetailValue">{admin.expiration_date || '—'}</span>
            </div>
          )}
          <div className="SAMDetailRow">
            <span className="SAMDetailLabel">Role:</span>
            <span className="SAMDetailValue">Super Administrator</span>
          </div>
          <div className="SAMDetailRow">
            <span className="SAMDetailLabel">Status:</span>
            <span className="SAMDetailValue">
              <SAMStatusBadge status={admin.status} />
            </span>
          </div>
        </div>

        <div className="SAMModalFooter SAMFooterCenter">
          <button className="SAMConfirmBtn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminAdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewAdmin, setViewAdmin] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    actionType: '',
    targetId: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const currentAdminId = getCurrentAdminId();

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        !event.target.closest('.SAMDropdownWrapper') &&
        !event.target.closest('.SAMDropdownMenu')
      ) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      setLoading(true);
      const response = await apiFetch('/admin/superadmins');
      if (!response.ok) {
        console.error('Failed to fetch superadmins');
        return;
      }
      const data = await response.json();
      setAdmins(data.map(mapAdmin));
    } catch (error) {
      console.error('Error fetching superadmins:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddModalClose(data) {
    setAddModalOpen(false);
    if (data && data.email) {
      // invite already sent inside AddSuperadminModal — just refresh the list
      await fetchAdmins();
    }
  }

  function openConfirm(actionType, adminId) {
    setConfirmModal({ open: true, actionType, targetId: adminId });
  }

  async function handleConfirm() {
    const { actionType, targetId } = confirmModal;

    const routes = {
      resend: { method: 'POST', path: `/admin/superadmins/${targetId}/resend` },
      suspend: { method: 'POST', path: `/admin/superadmins/${targetId}/suspend` },
      reactivate: { method: 'POST', path: `/admin/superadmins/${targetId}/reactivate` },
      delete: { method: 'DELETE', path: `/admin/superadmins/${targetId}` },
      activate: { method: 'POST', path: `/admin/superadmins/${targetId}/activate` },
      unlock: { method: 'POST', path: `/admin/superadmins/${targetId}/unlock` },
    };

    const route = routes[actionType];
    if (!route) {
      setConfirmModal({ open: false, actionType: '', targetId: null });
      return;
    }

    try {
      const response = await apiFetch(route.path, { method: route.method });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        alert(errData.detail || `Failed to ${actionType} account.`);
        return;
      }
      await fetchAdmins();
    } catch (error) {
      console.error(`Error performing ${actionType}:`, error);
      alert('Something went wrong. Please try again.');
    } finally {
      setConfirmModal({ open: false, actionType: '', targetId: null });
    }
  }

  function handleCancelConfirm() {
    setConfirmModal({ open: false, actionType: '', targetId: null });
  }

  const filteredAdmins = admins.filter((a) => {
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      a.email.toLowerCase().includes(query) ||
      (a.fullname && a.fullname.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const totalItems = filteredAdmins.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const displayedAdmins = filteredAdmins.slice(startIndex, startIndex + limit);

  return (
    <div className="SuperadminMainContainer">
      <Sidebar sidebarType="SUPER_ADMIN" />
      <div className="SuperadminContentContainer">
        <TopBar topbarType="SUPER_ADMIN" />
        <div className="SuperadminMainfeed">
          <div className="SAMPageContainer">
            <div className="SAMPageHeader">
              <div className="SAMPageTitleBlock">
                <h2 className="SAMPageTitle">Admin Management</h2>
                <p className="SAMPageSubtitle">
                  Manage Superadmin personnel accounts — send invitations, resend links, and control access.
                </p>
              </div>
              <button className="SAMAddBtn" onClick={() => setAddModalOpen(true)}>
                <Plus size={18} />
                Add Superadmin
              </button>
            </div>

            <div className="SAMStatsRow">
              {[
                {
                  label: 'Active',
                  value: admins.filter((a) => a.status === 'Active').length,
                  className: 'sam-stat-active',
                },
                {
                  label: 'Pending Approval',
                  value: admins.filter((a) => a.status === 'Pending Approval').length,
                  className: 'sam-stat-pending',
                },
                {
                  label: 'Invited',
                  value: admins.filter((a) => ['Invited', 'Resend Requested'].includes(a.status)).length,
                  className: 'sam-stat-invited',
                },
                {
                  label: 'Link Expired',
                  value: admins.filter((a) => a.status === 'Link Expired').length,
                  className: 'sam-stat-expired',
                },
                {
                  label: 'Locked',
                  value: admins.filter((a) => a.status === 'Locked').length,
                  className: 'sam-stat-locked',
                },
              ].map((s) => (
                <div key={s.label} className={`SAMStatCard ${s.className}`}>
                  <span className="SAMStatValue">{s.value}</span>
                  <span className="SAMStatLabel">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="SAMFiltersContainer">
              <div className="SAMSearchWrapper">
                <Search size={16} className="SAMSearchIcon" />
                <input
                  type="text"
                  className="SAMSearchInput"
                  placeholder="Search by email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    className="SAMClearSearch"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="SAMFilterGroup">
                <div className="SAMFilterItem">
                  <span className="SAMFilterLabel">STATUS</span>
                  <select
                    className="SAMSelectFilter"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All</option>
                    <option value="Invited">Invited</option>
                    <option value="Resend Requested">Resend Requested</option>
                  <option value="Link Expired">Link Expired</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>

                {(searchQuery !== '' || statusFilter !== 'All') && (
                  <button
                    className="BtnClearFiltersIcon"
                    aria-label="Clear Filters"
                    title="Clear Filters"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('All');
                      setCurrentPage(1);
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="SAMTableWrapper">
              <table className="SAMTable">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Invitation Date</th>
                    <th>Expiration Date</th>
                    <th>Status</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="SAMNoResults">
                        Loading superadmin records…
                      </td>
                    </tr>
                  ) : displayedAdmins.length > 0 ? (
                    displayedAdmins.map((admin, idx) => (
                      <tr key={admin.id}>
                        <td className="SAMTdCenter">{startIndex + idx + 1}</td>
                        <td>{admin.fullname || (admin.first_name || admin.last_name ? `${admin.first_name} ${admin.last_name}`.trim() : '') || <span className="SAMEmpty">—</span>}</td>
                        <td className="SAMEmailCell">{admin.email}</td>
                        <td>{admin.invitation_date || <span className="SAMEmpty">—</span>}</td>
                        <td>{admin.expiration_date || <span className="SAMEmpty">—</span>}</td>
                        <td>
                          <SAMStatusBadge status={admin.status} />
                        </td>
                        <td>
                          <SAMActionDropdown
                            admin={admin}
                            isSelf={admin.id === currentAdminId}
                            isOpen={activeDropdownId === admin.id}
                            toggleDropdown={() =>
                              setActiveDropdownId(
                                activeDropdownId === admin.id ? null : admin.id
                              )
                            }
                            onAction={(type) => openConfirm(type, admin.id)}
                            onView={() => setViewAdmin(admin)}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="SAMNoResults">
                        No superadmin records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {!loading && filteredAdmins.length > 0 && (
                <div className="AuditPaginationWrapper">
                  <span className="AuditPaginationInfo">
                    Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems} entries
                  </span>
                  <div className="AuditPaginationControls">
                    <button
                      className="AuditPageBtn"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`AuditPageNumber ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      className="AuditPageBtn"
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

      <AddSuperadminModal open={addModalOpen} onClose={handleAddModalClose} />

      <SAMConfirmModal
        open={confirmModal.open}
        actionType={confirmModal.actionType}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />

      <ViewAdminModal open={!!viewAdmin} admin={viewAdmin} onClose={() => setViewAdmin(null)} />
    </div>
  );
}
