// desktopfrontend/src/pages/superadminfolder/superadmin-user-management.jsx
import './superadmin-css.css';
import { useState, useEffect, useRef } from 'react';
import { Send, UserCheck, UserX, TriangleAlert, CircleCheckBig, Mail, Eye, Trash2, MoreVertical, RotateCcw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Sidebar from '../component/sidebar';
import TopBar from '../component/top-bar';
import { apiFetch } from '../../utils/apiFetch';
import { createPortal } from 'react-dom';
import { USER_STATUS_META } from './superadmin-status-colors';

function StatusBadge({ status }) {
  const meta = USER_STATUS_META[status] || { label: status, className: '' };
  return <span className={`UMStatusBadge ${meta.className}`}>{meta.label}</span>;
}



function UserMgmtActionDropdown({ user, onAction, onView }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const displayStatus = user.display_status || user.status;

  function openMenu() {
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 6,
      left: rect.right - 190,
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
    <div className={`UserMgmtDropdownWrapper ${isOpen ? 'active-open' : ''}`}>
      <button
        ref={triggerRef}
        className="UserMgmtDropdownTrigger"
        data-tooltip="Actions"
        title="More Actions"
        onClick={(e) => {
          e.stopPropagation();
          isOpen ? setIsOpen(false) : openMenu();
        }}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && createPortal(
        <div
          className="UserMgmtDropdownMenu"
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
        >
          <button className="UserMgmtDropdownItem" onClick={() => { onView(); setIsOpen(false); }}>
            <Eye size={14} /> View Details
          </button>

          {displayStatus === 'Pending Approval' && (
            <button className="UserMgmtDropdownItem" onClick={() => { onAction('activate'); setIsOpen(false); }}>
              <UserCheck size={14} /> Activate Account
            </button>
          )}

          {displayStatus === 'Active' && (
            <button className="UserMgmtDropdownItem" onClick={() => { onAction('suspend'); setIsOpen(false); }}>
              <UserX size={14} /> Suspend Account
            </button>
          )}

          {displayStatus === 'Suspended' && (
            <>
              <button className="UserMgmtDropdownItem" onClick={() => { onAction('reactivate'); setIsOpen(false); }}>
                <RotateCcw size={14} /> Reactivate Account
              </button>
            </>
          )}
          
          {['Resend Requested', 'Link Expired'].includes(displayStatus) && (
            <button className="UserMgmtDropdownItem" onClick={() => { onAction('resend'); setIsOpen(false); }}>
              <Send size={14} /> Resend Link
            </button>
          )}
          {displayStatus === 'Link Expired' && (
            <>
              <div className="UserMgmtDropdownDivider" />
              <button className="UserMgmtDropdownItem danger" onClick={() => { onAction('delete'); setIsOpen(false); }}>
                <Trash2 size={14} /> Delete Account
              </button>
            </>
          )}
          {displayStatus === 'Locked' && (
            <button className="UserMgmtDropdownItem" onClick={() => { onAction('unlock'); setIsOpen(false); }}>
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
    title: 'Resend Registration Link',
    message: 'Are you sure you want to resend the registration link to this user?',
    confirmLabel: 'Resend',
  },
  activate: {
    title: 'Activate Account',
    message: 'Are you sure you want to activate this account? The user will receive access to the system.',
    confirmLabel: 'Activate',
  },
  suspend: {
    title: 'Suspend Account',
    message: 'Are you sure you want to suspend this account? The account will temporarily lose access to the system.',
    confirmLabel: 'Suspend',
  },
  reactivate: {
    title: 'Reactivate Account',
    message: 'Are you sure you want to reactivate this account? The account will regain access to the system.',
    confirmLabel: 'Reactivate',
  },
  delete: {
    title: 'Delete Account',
    message: 'Are you sure you want to delete this account entry? This action cannot be undone.',
    confirmLabel: 'Delete',
  },
  unlock: {
    title: 'Unlock Account',
    message: 'Are you sure you want to unlock this account? The user will regain access to the system.',
    confirmLabel: 'Unlock',
  },
};

function ConfirmModal({ open, actionType, onConfirm, onCancel }) {
  if (!open) return null;
  const meta = CONFIRM_MESSAGES[actionType] || {};
  return (
    <div className="UMModalOverlay">
      <div className="UMModal UMConfirmModal">
        <div className="UMConfirmIcon">
          {actionType === 'suspend' || actionType === 'delete' ? (
            <TriangleAlert size={40} color="#D97706" strokeWidth={3} />
          ) : actionType === 'activate' || actionType === 'reactivate' || actionType === 'unlock' ? (
            <CircleCheckBig size={40} color="#149660ff" strokeWidth={3} />
          ) : (
            <Mail size={40} color="#07338dff" strokeWidth={3} />
          )}
        </div>
        <h3 className="UMModalTitle">{meta.title}</h3>
        <p className="UMConfirmMessage">{meta.message}</p>
        <div className="UMModalFooter">
          <button className="UMCancelBtn" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`UMConfirmBtn ${actionType === 'suspend' || actionType === 'delete' ? 'danger' : 'primary'}`}
            onClick={onConfirm}
          >
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPersonnelModal({ open, onClose }) {
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [agency, setAgency] = useState('');
  const [regions, setRegions] = useState([]);

  const [emailError, setEmailError] = useState('');
  const [regionError, setRegionError] = useState('');
  const [agencyError, setAgencyError] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      apiFetch('/regions')
        .then((res) => res.json())
        .then((data) => setRegions(data))
        .catch((err) => console.error('Failed to load regions', err));
    }
  }, [open]);

  function handleClose() {
    setEmail('');
    setRegion('');
    setAgency('');

    setEmailError('');
    setRegionError('');
    setAgencyError('');

    setSuccessMsg('');
    setSending(false);

    onClose(null);
  }

  async function handleSend() {
    setEmailError('');
    setRegionError('');
    setAgencyError('');

    if (!email.trim()) {
      setEmailError('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    if (!region) {
      setRegionError('Please select a region.');
      return;
    }

    if (!agency) {
      setAgencyError('Please select an agency.');
      return;
    }

    setSending(true);

    try {
      const response = await apiFetch('/admin/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email, region_id: region, role: agency }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send invite.');
      }

      setSending(false);
      setSuccessMsg(`Registration link has been sent to ${email}`);
    } catch (err) {
      setSending(false);
      setEmailError(err.message);
    }
  }

  function handleDone() {
    onClose({
      email,
      region,
      agency,
    });

    setEmail('');
    setRegion('');
    setAgency('');

    setEmailError('');
    setRegionError('');
    setAgencyError('');

    setSuccessMsg('');
    setSending(false);
  }

  if (!open) return null;

  return (
    <div className="UMModalOverlay">
      <div className="UMModal UMAddModal">
        <div className="UMModalHeader">
          <h3 className="UMModalTitle">Add New Personnel</h3>
          <p className="UMModalSubtitle">
            Enter the email address, region, and agency of the new personnel.
            They will receive a registration link to complete their profile.
          </p>
        </div>

        {!successMsg ? (
          <>
            <div className="UMFormGroup">
              <label className="UMLabel">
                Email Address <span className="UMRequired">*</span>
              </label>

              <input
                type="email"
                className={`UMInput ${emailError ? 'input-error' : ''}`}
                placeholder="e.g. juan.delacruz@agency.gov.ph"
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

              {emailError && (
                <span className="UMFieldError">
                  {emailError}
                </span>
              )}
            </div>

            <div className="UMRegionAgencyRow">

              <div className="UMFormGroup">
                <label className="UMLabel">
                  Region <span className="UMRequired">*</span>
                </label>

                <select
                  className="UMRegionSelect"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setRegionError('');
                  }}
                  disabled={sending}
                >
                  <option value="">Select Region</option>
                  {regions.map((r) => (
                    <option key={r.region_id} value={r.region_id}>
                      {r.region_name}
                    </option>
                  ))}
                </select>

                {regionError && (
                  <span className="UMFieldError">
                    {regionError}
                  </span>
                )}
              </div>

              <div className="UMFormGroup">
                <label className="UMLabel">
                  Agency <span className="UMRequired">*</span>
                </label>

                <select
                  className="UMAgencySelect"
                  value={agency}
                  onChange={(e) => {
                    setAgency(e.target.value);
                    setAgencyError('');
                  }}
                  disabled={sending}
                >
                  <option value="">Select Agency</option>
                  <option value="fda_personnel">FDA</option>
                  <option value="lea_personnel">LEA-CIDG</option>
                </select>

                {agencyError && (
                  <span className="UMFieldError">
                    {agencyError}
                  </span>
                )}
              </div>

            </div>

            <div className="UMModalFooter">
              <button
                className="UMCancelBtn"
                onClick={handleClose}
                disabled={sending}
              >
                Cancel
              </button>

              <button
                className="UMConfirmBtn primary"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Send Registration Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="UMSuccessBox">
              <div className="UMSuccessIcon">✉️</div>
              <p className="UMSuccessMsg">{successMsg}</p>
            </div>

            <div className="UMModalFooter UMFooterCenter">
              <button
                className="UMConfirmBtn primary"
                onClick={handleDone}
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ViewPersonnelModal({ open, user, onClose }) {
  if (!open || !user) return null;
  const status = user.display_status || user.status;

  return (
    <div className="UMModalOverlay">
      <div className="UMModal UserMgmtViewModal">
        <div className="UMModalHeader">
          <h3 className="UMModalTitle">Personnel Details</h3>
          <p className="UMModalSubtitle">Viewing profile information for this user.</p>
        </div>
        <div className="UserMgmtViewDetails">
          <div className="UserMgmtDetailRow">
            <span className="UserMgmtDetailLabel">Full Name:</span>
            <span className="UserMgmtDetailValue">{user.fullname || '—'}</span>
          </div>
          <div className="UserMgmtDetailRow">
            <span className="UserMgmtDetailLabel">Employee ID:</span>
            <span className="UserMgmtDetailValue">{user.employee_id || user.employeeid || '—'}</span>
          </div>
          <div className="UserMgmtDetailRow">
            <span className="UserMgmtDetailLabel">Email:</span>
            <span className="UserMgmtDetailValue UserMgmtEmail">{user.email}</span>
          </div>
          <div className="UserMgmtDetailRow">
            <span className="UserMgmtDetailLabel">Agency:</span>
            <span className="UserMgmtDetailValue">{user.agency || '—'}</span>
          </div>
          <div className="UserMgmtDetailRow">
            <span className="UserMgmtDetailLabel">Region:</span>
            <span className="UserMgmtDetailValue">{user.region || '—'}</span>
          </div>
          <div className="UserMgmtDetailRow">
            <span className="UserMgmtDetailLabel">Department:</span>
            <span className="UserMgmtDetailValue">{user.department || '—'}</span>
          </div>
          <div className="UserMgmtDetailRow">
            <span className="UserMgmtDetailLabel">Position:</span>
            <span className="UserMgmtDetailValue">{user.position || '—'}</span>
          </div>
          <div className="UserMgmtDetailRow">
            <span className="UserMgmtDetailLabel">Contact No:</span>
            <span className="UserMgmtDetailValue">{user.contact_number || user.contactno || '—'}</span>
          </div>
          <div className="UserMgmtDetailRow">
            <span className="UserMgmtDetailLabel">Status:</span>
            <span className="UserMgmtDetailValue">
              <StatusBadge status={status} />
            </span>
          </div>
        </div>
        <div className="UMModalFooter UMFooterCenter">
          <button className="UMConfirmBtn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SuperAdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewUser, setViewUser] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    actionType: '',
    targetId: null,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
  try {
    const response = await apiFetch('/admin/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data);
    } else {
      console.error('Failed to fetch users');
    }
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}

  function handleAddModalClose(data) {
    setAddModalOpen(false);
    if (data) {
      fetchUsers();
    }
  }

  function openConfirm(actionType, userId) {
    setConfirmModal({ open: true, actionType, targetId: userId });
  }

  async function handleConfirm() {
  const { actionType, targetId } = confirmModal;
  let path = '';
  if (actionType === 'resend') {
    path = `/admin/users/${targetId}/resend`;
  } else if (actionType === 'activate') {
    path = `/admin/users/${targetId}/activate`;
  } else if (actionType === 'suspend') {
    path = `/admin/users/${targetId}/suspend`;
  } else if (actionType === 'reactivate') {
    path = `/admin/users/${targetId}/reactivate`;
  } else if (actionType === 'delete') {
    path = `/admin/users/${targetId}`;
  } else if (actionType === 'unlock') {
    path = `/admin/users/${targetId}/unlock`;
  }

  if (path) {
    try {
      const response = await apiFetch(path, {
        method: actionType === 'delete' ? 'DELETE' : 'POST',
      });
      if (!response.ok) {
        const errData = await response.json();
        alert(errData.detail || `Failed to perform action: ${actionType}`);
      } else {
        fetchUsers();
      }
    } catch (error) {
      console.error(`Error performing action ${actionType}:`, error);
    }
  }
  setConfirmModal({ open: false, actionType: '', targetId: null });
}

  function handleCancelConfirm() {
    setConfirmModal({ open: false, actionType: '', targetId: null });
  }

  const filteredUsers = users.filter((u) => {
    if (statusFilter === 'All') return true;
    return (u.display_status || u.status) === statusFilter;
  });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalItems);
  const displayedUsers = filteredUsers.slice(startIndex, startIndex + limit);

  return (
    <div className="SuperadminMainContainer">
      <Sidebar sidebarType="SUPER_ADMIN" />
      <div className="SuperadminContentContainer">
        <TopBar topbarType="SUPER_ADMIN" />
        <div className="SuperadminMainfeed">
          <div className="UMPageContainer">
            {/* Page Header */}
            <div className="UMPageHeader">
              <div className="UMPageTitleBlock">
                <h2 className="UMPageTitle">User Management</h2>
                <p className="UMPageSubtitle">
                  Manage personnel accounts — send invites, activate, and control access.
                </p>
              </div>
              <button className="UMAddPersonnelBtn" onClick={() => setAddModalOpen(true)}>
                <span className="UMBtnIcon">＋</span>
                Add New Personnel
              </button>
            </div>

            {/* Stats Row */}
            <div className="UMStatsRow">
              {[
                {
                  label: 'Active',
                  value: users.filter((u) => (u.display_status || u.status) === 'Active').length,
                  className: 'stat-active',
                },
                {
                  label: 'Pending Approval',
                  value: users.filter((u) => (u.display_status || u.status) === 'Pending Approval').length,
                  className: 'stat-pending',
                },
                {
                  label: 'Invited',
                  value: users.filter((u) => ['Invited', 'Resend Requested'].includes(u.display_status || u.status)).length,
                  className: 'stat-invited',
                },
                {
                  label: 'Link Expired',
                  value: users.filter((u) => (u.display_status || u.status) === 'Link Expired').length,
                  className: 'stat-expired',
                },
                {
                  label: 'Locked',
                  value: users.filter((u) => (u.display_status || u.status) === 'Locked').length,
                  className: 'stat-locked',
                },
              ].map((s) => (
                <div key={s.label} className={`UMStatCard ${s.className}`}>
                  <span className="UMStatValue">{s.value}</span>
                  <span className="UMStatLabel">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Filter Bar */}
            <div className="UserMgmtFiltersContainer">
              <div className="UserMgmtFilterRowContainer">
                <span className="UserMgmtFilterLabel">STATUS</span>
                <select
                  className="UserMgmtSelectFilter"
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
                  <option value="Locked">Locked </option>
                </select>
              </div>

              {statusFilter !== 'All' && (
                <button
                  className="BtnClearFiltersIcon"
                  aria-label="Clear Filters"
                  title="Clear Filters"
                  onClick={() => {
                    setStatusFilter('All');
                    setCurrentPage(1);
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {/* Table */}
            <div className="UMTableWrapper">
              <table className="UMTable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Full Name</th>
                    <th>Employee ID</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Contact No.</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map((user, idx) => {
                    const userId = user.user_id || user.id;
                    return (
                      <tr key={userId}>
                        <td className="UMTdCenter">{startIndex + idx + 1}</td>
                        <td>{user.fullname || <span className="UMEmpty">—</span>}</td>
                        <td>{user.employee_id || user.employeeid || <span className="UMEmpty">—</span>}</td>
                        <td className="UMEmailCell">{user.email}</td>
                        <td>{user.department || <span className="UMEmpty">—</span>}</td>
                        <td>{user.position || <span className="UMEmpty">—</span>}</td>
                        <td>{user.contact_number || user.contactno || <span className="UMEmpty">—</span>}</td>
                        <td>
                          <StatusBadge status={user.display_status || user.status} />
                        </td>
                        <td>
                          <UserMgmtActionDropdown
                            user={user}
                            onAction={(type) => openConfirm(type, user.user_id || user.id)}
                            onView={() => setViewUser(user)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredUsers.length > 0 && (
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

      {/* Add Personnel Modal */}
      <AddPersonnelModal open={addModalOpen} onClose={handleAddModalClose} />

      {/* Confirmation Modal */}
      <ConfirmModal
        open={confirmModal.open}
        actionType={confirmModal.actionType}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />

      {/* View Personnel Modal */}
      <ViewPersonnelModal
        open={!!viewUser}
        user={viewUser}
        onClose={() => setViewUser(null)}
      />
    </div>
  );
}

export default SuperAdminUserManagement;
