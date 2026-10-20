// Shared status palette for Superadmin User Management and Admin Management.
export const STATUS_COLORS = Object.freeze({
  Active: '#16A34A',
  Invited: '#0284C7',
  'Pending Approval': '#D97706',
  'Resend Requested': '#D97706',
  'Link Expired': '#DC2626',
  Suspended: '#DC2626',
  Locked: '#B91C1C',
});

const createStatusMeta = (classNames) => Object.freeze(
  Object.fromEntries(Object.keys(STATUS_COLORS).map((status) => [
    status,
    { label: status, className: classNames[status] },
  ]))
);

export const USER_STATUS_META = createStatusMeta({
  Active: 'badge-active', Invited: 'badge-invited',
  'Pending Approval': 'badge-pending', 'Resend Requested': 'badge-pending',
  'Link Expired': 'badge-expired', Suspended: 'badge-suspended', Locked: 'badge-locked',
});

export const ADMIN_STATUS_META = createStatusMeta({
  Active: 'sam-badge-active', Invited: 'sam-badge-invited',
  'Pending Approval': 'sam-badge-pending', 'Resend Requested': 'sam-badge-pending',
  'Link Expired': 'sam-badge-expired', Suspended: 'sam-badge-suspended', Locked: 'sam-badge-locked',
});
