// desktopfrontend/src/pages/component/all-notifications.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  CheckCheck,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  UserCheck,
  ShieldAlert,
  FileText,
  Activity,
  Bell,
  Clock,
  CheckCircle2,
  Lock,
  KeyRound,
  Loader2
} from 'lucide-react';
import Sidebar from './sidebar';
import TopBar from './top-bar';
import { apiFetch } from '../../utils/apiFetch';

// Load layouts for the respective workspaces
import '../fdafolder/fda-css.css';
import '../leacidgfolder/lea-css.css';
import '../superadminfolder/superadmin-css.css';

// Event types with no real DB row — computed fresh on every backend read
// (see superadmin_notification_service.py). Clicking these can't call the
// mark-as-read endpoint. Mirrors the same list in top-bar.jsx.
const COMPUTED_EVENT_TYPES = ['invite_not_activated', 'invite_expired'];

const PAGE_SIZE = 20;

/**
 * Determines the authenticated role/agency. Kept in sync with
 * getAuthenticatedRole() in top-bar.jsx so both surfaces always agree on
 * which notification endpoint to call.
 */
const getAuthenticatedRole = () => {
  const raw = (
    localStorage.getItem('agency') ||
    localStorage.getItem('role') ||
    'fda'
  ).toString().trim().toLowerCase();

  if (raw.includes('super')) return 'superadmin';
  if (raw === 'lea' || raw === 'cidg' || raw.includes('lea') || raw.includes('cidg')) return 'lea';
  return 'fda';
};

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
}

function formatFullDate(dateString) {
  return new Date(dateString).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// Groups a notification into today / yesterday / previous_7_days / older,
// based on its real created_at timestamp.
function getDateGroup(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOf7DaysAgo = new Date(startOfToday);
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 7);

  if (date >= startOfToday) return 'today';
  if (date >= startOfYesterday) return 'yesterday';
  if (date >= startOf7DaysAgo) return 'previous_7_days';
  return 'older';
}

const GROUP_METADATA = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'previous_7_days', label: 'Previous 7 days' },
  { key: 'older', label: 'Older' }
];

// ── Superadmin: event_type -> icon / category / color theme ─────────────
// Covers every value in NotificationEventType (notification_enums.py).
const SUPERADMIN_EVENT_META = {
  account_locked:              { icon: 'lock',   category: 'Security',   theme: 'bg-red' },
  account_unlocked:            { icon: 'lock',   category: 'Security',   theme: 'bg-teal' },
  failed_login_warning:        { icon: 'audit',  category: 'Security',   theme: 'bg-red' },
  superadmin_invited:          { icon: 'user',   category: 'Personnel',  theme: 'bg-blue' },
  personnel_invited:           { icon: 'user',   category: 'Personnel',  theme: 'bg-blue' },
  registration_accomplished:   { icon: 'user',   category: 'Personnel',  theme: 'bg-teal' },
  superadmin_password_created: { icon: 'key',    category: 'Personnel',  theme: 'bg-teal' },
  resend_link_requested:       { icon: 'system', category: 'Invitation', theme: 'bg-amber' },
  password_changed:            { icon: 'key',    category: 'Account',    theme: 'bg-indigo' },
  account_info_updated:        { icon: 'report', category: 'Account',    theme: 'bg-indigo' },
  account_suspended:           { icon: 'audit',  category: 'Account',    theme: 'bg-purple' },
  account_reactivated:         { icon: 'audit',  category: 'Account',    theme: 'bg-teal' },
  account_activated:           { icon: 'user',   category: 'Personnel',  theme: 'bg-teal' },
  account_deleted:             { icon: 'audit',  category: 'Account',    theme: 'bg-red' },
  invite_not_activated:        { icon: 'system', category: 'Invitation', theme: 'bg-amber' },
  invite_expired:              { icon: 'system', category: 'Invitation', theme: 'bg-red' },
};

// ── LEA/FDA personnel: rows carry no event_type field (see Notification
// model / notification_service.py), so category is inferred from keywords
// in the backend-generated title text instead. ─────────────────────────
function getPersonnelMeta(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('complaint logged')) return { icon: 'complaint', category: 'Complaint', theme: 'bg-orange' };
  if (t.includes('rejected')) return { icon: 'verification', category: 'Verification', theme: 'bg-red' };
  if (t.includes('verification request')) return { icon: 'verification', category: 'Verification', theme: 'bg-teal' };
  if (t.includes('response received') || t.includes('acknowledged')) return { icon: 'verification', category: 'Verification', theme: 'bg-blue' };
  if (t.includes('case closed')) return { icon: 'complaint', category: 'Case', theme: 'bg-slate' };
  if (t.includes('takedown')) return { icon: 'takedown', category: 'Operation', theme: 'bg-amber' };
  if (t.includes('deadline') || t.includes('response needed')) return { icon: 'audit', category: 'SLA', theme: 'bg-red' };
  return { icon: 'system', category: 'General', theme: 'bg-slate' };
}

function getNotificationIcon(type) {
  switch (type) {
    case 'complaint': return <ClipboardList size={16} />;
    case 'advisory': return <AlertTriangle size={16} />;
    case 'verification': return <ShieldCheck size={16} />;
    case 'user': return <UserCheck size={16} />;
    case 'takedown': return <Activity size={16} />;
    case 'audit': return <ShieldAlert size={16} />;
    case 'report': return <FileText size={16} />;
    case 'lock': return <Lock size={16} />;
    case 'key': return <KeyRound size={16} />;
    case 'system':
    default: return <Bell size={16} />;
  }
}

function getCategoryTheme(themeKey) {
  const map = {
    'bg-orange': { bg: 'rgba(234, 88, 12, 0.1)', color: '#C2410C', badge: 'bg-orange' },
    'bg-red': { bg: 'rgba(220, 38, 38, 0.1)', color: '#DC2626', badge: 'bg-red' },
    'bg-teal': { bg: 'rgba(13, 148, 136, 0.12)', color: '#0D9488', badge: 'bg-teal' },
    'bg-blue': { bg: 'rgba(59, 130, 246, 0.1)', color: '#2563EB', badge: 'bg-blue' },
    'bg-amber': { bg: 'rgba(217, 119, 6, 0.12)', color: '#B45309', badge: 'bg-amber' },
    'bg-purple': { bg: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', badge: 'bg-purple' },
    'bg-indigo': { bg: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', badge: 'bg-indigo' },
    'bg-slate': { bg: 'rgba(100, 116, 139, 0.12)', color: '#475569', badge: 'bg-slate' },
  };
  return map[themeKey] || map['bg-slate'];
}

export default function AllNotifications() {
  const currentRole = getAuthenticatedRole(); // 'fda' | 'lea' | 'superadmin'
  const isSuperadmin = currentRole === 'superadmin';
  const notificationsBasePath = isSuperadmin ? '/notifications' : '/personnel-notifications';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Normalizes both backend shapes (superadmin rows carry event_type;
  // LEA/FDA rows don't) into one common shape the rest of the component uses.
  const normalizeNotification = useCallback((n) => {
    if (isSuperadmin) {
      const meta = SUPERADMIN_EVENT_META[n.event_type] || { icon: 'system', category: 'General', theme: 'bg-slate' };
      return {
        id: n.notification_id,
        title: n.title,
        message: n.message,
        isRead: n.is_read,
        createdAt: n.created_at,
        eventType: n.event_type,
        iconType: meta.icon,
        category: meta.category,
        theme: meta.theme,
      };
    }
    const meta = getPersonnelMeta(n.title);
    return {
      id: n.notification_id,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      createdAt: n.created_at,
      eventType: null,
      iconType: meta.icon,
      category: meta.category,
      theme: meta.theme,
    };
  }, [isSuperadmin]);

  const loadPage = useCallback((pageOffset, replace) => {
    const setBusy = replace ? setLoading : setLoadingMore;
    setBusy(true);
    apiFetch(`${notificationsBasePath}?limit=${PAGE_SIZE}&offset=${pageOffset}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const mapped = data.notifications.map(normalizeNotification);
        setNotifications((prev) => (replace ? mapped : [...prev, ...mapped]));
        setUnreadCount(data.unread_count);
        setHasMore(mapped.length === PAGE_SIZE);
        setOffset(pageOffset + mapped.length);
      })
      .catch((err) => console.error('Failed to load notifications:', err))
      .finally(() => setBusy(false));
  }, [notificationsBasePath, normalizeNotification]);

  useEffect(() => {
    loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsBasePath]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadPage(offset, false);
  };

  const handleMarkAllAsRead = () => {
    apiFetch(`${notificationsBasePath}/read-all`, { method: 'PATCH' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(data.unread_count);
      })
      .catch((err) => console.error('Failed to mark all as read:', err));
  };

  const handleMarkRead = (notif) => {
    // Computed entries (superadmin invite_not_activated / invite_expired)
    // have no real DB row — nothing to mark read, they resolve on their own.
    if (isSuperadmin && COMPUTED_EVENT_TYPES.includes(notif.eventType)) return;
    if (notif.isRead) return;

    apiFetch(`${notificationsBasePath}/${notif.id}/read`, { method: 'PATCH' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
        setUnreadCount(data.unread_count);
      })
      .catch((err) => console.error('Failed to mark notification as read:', err));
  };

  // Workspace Layout configuration matching existing FDA / LEA / Superadmin dashboards
  const layoutConfig = useMemo(() => {
    switch (currentRole) {
      case 'superadmin':
        return {
          sidebarType: 'SUPER_ADMIN',
          mainContainerClass: 'SuperadminMainContainer',
          contentContainerClass: 'SuperadminContentContainer',
          mainFeedClass: 'SuperadminMainfeed',
        };
      case 'lea':
        return {
          sidebarType: 'LEA',
          mainContainerClass: 'LeaDashboardMain',
          contentContainerClass: 'LeaContentContainer',
          mainFeedClass: 'LeaMainfeed',
        };
      case 'fda':
      default:
        return {
          sidebarType: 'FDA',
          mainContainerClass: 'FdaDashboardMain',
          contentContainerClass: 'FdaContentContainer',
          mainFeedClass: 'FdaMainFeed',
        };
    }
  }, [currentRole]);

  // Filtered list — filters only what's currently loaded on the page.
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'unread') return notifications.filter((n) => !n.isRead);
    if (activeFilter === 'read') return notifications.filter((n) => n.isRead);
    return notifications;
  }, [notifications, activeFilter]);

  // Group filtered notifications by section, using real created_at.
  const groupedNotifications = useMemo(() => {
    const groups = { today: [], yesterday: [], previous_7_days: [], older: [] };
    filteredNotifications.forEach((notif) => {
      groups[getDateGroup(notif.createdAt)].push(notif);
    });
    return groups;
  }, [filteredNotifications]);

  const agencyClass = `agency-${currentRole}`;

  return (
    <>
      <style>{`
        /* Page Level Styles */
        .NotifPageWrapper {
          max-width: 1040px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Tabs / Filter Bar Row */
        .NotifFilterBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .NotifFilterTabs {
          display: flex;
          align-items: center;
          background: #EBEFF5;
          padding: 4px;
          border-radius: 10px;
          gap: 4px;
        }

        .NotifFilterTabBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 20px;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: #64748B;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          user-select: none;
        }

        .NotifFilterTabBtn:hover:not(.active) {
          color: #1E293B;
          background: rgba(255, 255, 255, 0.6);
        }

        /* Agency-specific active tab highlight colors */
        .NotifFilterTabBtn.active.agency-fda {
          background: #1B4332;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(27, 67, 50, 0.25);
        }

        .NotifFilterTabBtn.active.agency-lea {
          background: #13213C;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(19, 33, 60, 0.25);
        }

        .NotifFilterTabBtn.active.agency-superadmin {
          background: #0D9488;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
        }

        .NotifSummaryText {
          font-size: 13px;
          color: #64748B;
          font-weight: 500;
        }

        /* Actions sub-bar: Mark all as read on the left */
        .NotifActionsSubBar {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin-bottom: 4px;
        }

        .NotifMarkAllBtn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          color: #475569;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .NotifMarkAllBtn:hover:not(:disabled) {
          background: #F8FAFC;
          border-color: #CBD5E1;
          color: #1E293B;
        }

        .NotifMarkAllBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Time-based Sections */
        .NotifSectionsContainer {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }

        .NotifGroupSection {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .NotifGroupHeader {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-left: 2px;
        }

        .NotifGroupTitle {
          font-size: 13.5px;
          font-weight: 700;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin: 0;
        }

        .NotifGroupCount {
          font-size: 11px;
          font-weight: 600;
          color: #94A3B8;
          background: #E2E8F0;
          padding: 2px 7px;
          border-radius: 12px;
        }

        .NotifGroupDivider {
          flex: 1;
          height: 1px;
          background: #E2E8F0;
        }

        /* Single Continuous Closed Container per Group (matches top-bar dropdown modal) */
        .NotifGroupCard {
          background: #FFFFFF;
          border: 1.5px solid #EDEDED;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
        }

        /* Continuous Row inside Container (reusing top-bar modal item structure and colors) */
        .NotifRowItem {
          display: flex;
          gap: 14px;
          padding: 14px 18px;
          border-bottom: 1px solid #f4f4f4;
          cursor: pointer;
          transition: background-color 0.2s ease;
          position: relative;
          align-items: flex-start;
          text-align: left;
        }

        .NotifRowItem:last-child {
          border-bottom: none;
        }

        .NotifRowItem:hover {
          background-color: #f8fafc;
        }

        .NotifRowItem.unread {
          background-color: rgba(252, 163, 17, 0.05);
        }

        .NotifRowItem.unread:hover {
          background-color: rgba(252, 163, 17, 0.1);
        }

        .NotifRowIconBox {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .NotifContent {
          flex: 1;
          min-width: 0;
          padding-right: 28px;
        }

        .NotifItemTitle {
          font-size: 13.5px;
          font-weight: 600;
          color: #1F2937;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .NotifRowItem.unread .NotifItemTitle {
          font-weight: 700;
          color: #111827;
        }

        .NotifCategoryTag {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 5px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .NotifCategoryTag.bg-orange { background: rgba(234, 88, 12, 0.1); color: #C2410C; }
        .NotifCategoryTag.bg-red { background: rgba(220, 38, 38, 0.1); color: #DC2626; }
        .NotifCategoryTag.bg-teal { background: rgba(13, 148, 136, 0.12); color: #0D9488; }
        .NotifCategoryTag.bg-blue { background: rgba(59, 130, 246, 0.1); color: #2563EB; }
        .NotifCategoryTag.bg-amber { background: rgba(217, 119, 6, 0.12); color: #B45309; }
        .NotifCategoryTag.bg-purple { background: rgba(124, 58, 237, 0.1); color: #7C3AED; }
        .NotifCategoryTag.bg-indigo { background: rgba(79, 70, 229, 0.1); color: #4F46E5; }
        .NotifCategoryTag.bg-slate { background: rgba(100, 116, 139, 0.12); color: #475569; }

        .NotifItemMsg {
          font-size: 12.5px;
          color: #4b5563;
          margin-bottom: 6px;
          line-height: 1.45;
        }

        .NotifItemTime {
          font-size: 11px;
          color: #9ca3af;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .NotifBadgeDot {
          width: 8px;
          height: 8px;
          background-color: #FCA311;
          border-radius: 50%;
          position: absolute;
          right: 18px;
          top: 20px;
        }

        /* Load more */
        .NotifLoadMoreRow {
          display: flex;
          justify-content: center;
          padding: 4px 0 8px;
        }

        .NotifLoadMoreBtn {
          padding: 9px 20px;
          border-radius: 8px;
          border: 1.5px solid #E2E8F0;
          background: #FFFFFF;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .NotifLoadMoreBtn:hover:not(:disabled) {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .NotifLoadMoreBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .NotifSpinner {
          animation: NotifSpin 0.9s linear infinite;
          color: #94A3B8;
        }

        @keyframes NotifSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Empty State */
        .NotifEmptyState {
          background: #FFFFFF;
          border: 1.5px dashed #CBD5E1;
          border-radius: 14px;
          padding: 56px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
        }

        .NotifEmptyIcon {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: #F1F5F9;
          color: #94A3B8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }

        .NotifEmptyTitle {
          font-size: 16px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
        }

        .NotifEmptyDesc {
          font-size: 13.5px;
          color: #64748B;
          max-width: 360px;
          margin: 0;
          line-height: 1.5;
        }

        /* Responsive Breakpoints */
        @media (max-width: 640px) {
          .NotifFilterBar {
            flex-direction: column;
            align-items: flex-start;
          }
          .NotifFilterTabs {
            width: 100%;
          }
          .NotifFilterTabBtn {
            flex: 1;
            justify-content: center;
            padding: 7px 10px;
          }
          .NotifRowItem {
            padding: 12px 14px;
            gap: 10px;
          }
          .NotifRowIconBox {
            width: 30px;
            height: 30px;
          }
        }
      `}</style>

      <div className={layoutConfig.mainContainerClass}>
        <Sidebar sidebarType={layoutConfig.sidebarType} />

        <div className={layoutConfig.contentContainerClass}>
          <TopBar topbarType={layoutConfig.sidebarType} />

          <div className={layoutConfig.mainFeedClass}>
            <div className="NotifPageWrapper">

              {/* Filter Tabs & Summary Row */}
              <div className="NotifFilterBar">
                <div className="NotifFilterTabs">
                  <button
                    type="button"
                    className={`NotifFilterTabBtn ${agencyClass} ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    All
                  </button>

                  <button
                    type="button"
                    className={`NotifFilterTabBtn ${agencyClass} ${activeFilter === 'unread' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('unread')}
                  >
                    Unread
                  </button>

                  <button
                    type="button"
                    className={`NotifFilterTabBtn ${agencyClass} ${activeFilter === 'read' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('read')}
                  >
                    Read
                  </button>
                </div>

                <div className="NotifSummaryText">
                  Showing {filteredNotifications.length} {filteredNotifications.length === 1 ? 'notification' : 'notifications'}
                </div>
              </div>

              {/* Actions Sub-bar: Mark all as read on the left */}
              <div className="NotifActionsSubBar">
                <button
                  type="button"
                  className="NotifMarkAllBtn"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                >
                  <CheckCheck size={14} />
                  <span>Mark all as read</span>
                </button>
              </div>

              {loading ? (
                <div className="NotifEmptyState">
                  <Loader2 size={28} className="NotifSpinner" />
                  <p className="NotifEmptyDesc">Loading notifications…</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="NotifEmptyState">
                  <div className="NotifEmptyIcon">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="NotifEmptyTitle">No notifications found</h3>
                  <p className="NotifEmptyDesc">
                    {activeFilter === 'unread'
                      ? "You're all caught up! There are no unread notifications at this time."
                      : activeFilter === 'read'
                      ? 'You have no read notifications in your history yet.'
                      : 'There are currently no notifications to display.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="NotifSectionsContainer">
                    {GROUP_METADATA.map((groupMeta) => {
                      const groupItems = groupedNotifications[groupMeta.key] || [];
                      if (groupItems.length === 0) return null;

                      return (
                        <div key={groupMeta.key} className="NotifGroupSection">
                          <div className="NotifGroupHeader">
                            <h2 className="NotifGroupTitle">{groupMeta.label}</h2>
                            <span className="NotifGroupCount">{groupItems.length}</span>
                            <div className="NotifGroupDivider" />
                          </div>

                          <div className="NotifGroupCard">
                            {groupItems.map((notif) => {
                              const theme = getCategoryTheme(notif.theme);

                              return (
                                <div
                                  key={notif.id}
                                  className={`NotifRowItem ${notif.isRead ? '' : 'unread'}`}
                                  onClick={() => handleMarkRead(notif)}
                                  title={notif.isRead ? '' : 'Click to mark as read'}
                                >
                                  <div
                                    className="NotifRowIconBox"
                                    style={{ background: theme.bg, color: theme.color }}
                                  >
                                    {getNotificationIcon(notif.iconType)}
                                  </div>

                                  <div className="NotifContent">
                                    <div className="NotifItemTitle">
                                      <span>{notif.title}</span>
                                      <span className={`NotifCategoryTag ${theme.badge}`}>
                                        {notif.category}
                                      </span>
                                    </div>

                                    <div className="NotifItemMsg">{notif.message}</div>

                                    <div className="NotifItemTime">
                                      <Clock size={11} />
                                      <span>{formatFullDate(notif.createdAt)} · {timeAgo(notif.createdAt)}</span>
                                    </div>
                                  </div>

                                  {!notif.isRead && <div className="NotifBadgeDot" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {hasMore && activeFilter === 'all' && (
                    <div className="NotifLoadMoreRow">
                      <button
                        type="button"
                        className="NotifLoadMoreBtn"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? 'Loading…' : 'Load more notifications'}
                      </button>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}