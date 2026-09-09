// desktopfrontend/src/pages/component/top-bar.jsx
import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { apiFetch } from '../../utils/apiFetch'

// Event types that are computed at read-time on the backend (not real
// stored rows) - clicking these can't call the mark-as-read endpoint,
// since there's no real notification_id to update.
const COMPUTED_EVENT_TYPES = ['invite_not_activated', 'invite_expired'];

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

/**
 * Helper function to retrieve and normalize the authenticated agency role from localStorage.
 * Standardizes agency/role values into 'fda', 'lea', or 'superadmin'.
 * Default fallback is 'fda' if no agency is explicitly set in localStorage.
 * 🔌 BACKEND: replace localStorage with JWT token claims when backend is connected
 */
const getAuthenticatedRole = () => {
    const raw = (
        localStorage.getItem('agency') ||
        localStorage.getItem('role') ||
        'fda'
    ).toString().trim().toLowerCase();

    if (raw.includes('national') || raw.includes('super')) return 'superadmin';
    if (raw.includes('admin') && raw.includes('fda')) return 'fda_admin';
    if (raw.includes('admin') && (raw.includes('lea') || raw.includes('cidg'))) return 'lea_admin';
    if (raw === 'lea' || raw === 'cidg' || raw.includes('lea') || raw.includes('cidg')) return 'lea';
    return 'fda';
};

// Mock notifications for frontend-only admin prototypes
const FDA_ADMIN_MOCK_NOTIFICATIONS = [
    {
        id: 'mock-fda-1',
        title: 'New Verification Request',
        message: 'A new product verification request has been submitted for review.',
        time: '5 minutes ago',
        isRead: false,
        eventType: 'verification_request'
    },
    {
        id: 'mock-fda-2',
        title: 'Report Escalation',
        message: 'Adverse event report #ADV-2026-042 requires admin sign-off.',
        time: '1 hour ago',
        isRead: false,
        eventType: 'report_escalation'
    },
    {
        id: 'mock-fda-3',
        title: 'Monthly Summary Generated',
        message: 'August 2026 product clearance summary is ready for download.',
        time: '1 day ago',
        isRead: true,
        eventType: 'system'
    }
];

const LEA_ADMIN_MOCK_NOTIFICATIONS = [
    {
        id: 'mock-lea-1',
        title: 'Intake Case Assigned',
        message: 'New intake report #LEA-9921 has been assigned to CIDG Region 7.',
        time: '12 minutes ago',
        isRead: false,
        eventType: 'case_intake'
    },
    {
        id: 'mock-lea-2',
        title: 'Urgent Coordination Alert',
        message: 'Cross-regional operation coordination update submitted.',
        time: '2 hours ago',
        isRead: false,
        eventType: 'coordination_alert'
    },
    {
        id: 'mock-lea-3',
        title: 'Personnel Clearance Update',
        message: 'Special Investigator status reviewed and updated.',
        time: '2 days ago',
        isRead: true,
        eventType: 'system'
    }
];

const NATIONAL_ADMIN_MOCK_NOTIFICATIONS = [
    {
        id: 'mock-na-1',
        title: 'Regional Admin Registered',
        message: 'New regional administrator account pending approval.',
        time: '10 minutes ago',
        isRead: false,
        eventType: 'admin_registration'
    },
    {
        id: 'mock-na-2',
        title: 'System Audit Completed',
        message: 'Quarterly system compliance audit logs compiled.',
        time: '3 hours ago',
        isRead: false,
        eventType: 'audit_log'
    },
    {
        id: 'mock-na-3',
        title: 'Security Policy Updated',
        message: 'Global Multi-Factor Authentication policy enforced.',
        time: '1 day ago',
        isRead: true,
        eventType: 'security'
    }
];

const getMockNotifications = (ws) => {
    switch (ws) {
        case 'FDA_ADMIN':
            return FDA_ADMIN_MOCK_NOTIFICATIONS;
        case 'LEA_ADMIN':
            return LEA_ADMIN_MOCK_NOTIFICATIONS;
        case 'NATIONAL_ADMIN':
        default:
            return NATIONAL_ADMIN_MOCK_NOTIFICATIONS;
    }
};

function TopBar({ topbarType, role, agency }) {
    const navigate = useNavigate();

    // Determine type to render (single source of truth: topbarType -> role -> agency -> fallback to localStorage)
    let type = topbarType;
    if (!type) {
        const rawRole = (role || '').toString();
        const rawAgency = (agency || '').toString();
        if (rawRole) type = rawRole;
        else if (rawAgency) type = rawAgency;
    }

    const getWorkspace = () => {
        if (type) {
            const raw = type.toString().trim().toUpperCase().replace(/[-\s]/g, '_');
            if (raw === 'NATIONAL_ADMIN' || raw === 'NATIONALADMIN') return 'NATIONAL_ADMIN';
            if (raw === 'SUPER_ADMIN' || raw === 'SUPERADMIN' || raw.includes('SUPER')) return 'NATIONAL_ADMIN';
            if (raw === 'FDA_ADMIN' || raw === 'FDAADMIN' || (raw.includes('FDA') && raw.includes('ADMIN'))) return 'FDA_ADMIN';
            if (raw === 'LEA_ADMIN' || raw === 'LEAADMIN' || ((raw.includes('LEA') || raw.includes('CIDG')) && raw.includes('ADMIN'))) return 'LEA_ADMIN';
            if (raw === 'FDA' || raw.includes('FDA')) return 'FDA';
            if (raw === 'LEA' || raw === 'CIDG' || raw.includes('LEA') || raw.includes('CIDG')) return 'LEA';
        }
        const authRole = getAuthenticatedRole();
        if (authRole === 'superadmin') return 'NATIONAL_ADMIN';
        if (authRole === 'fda_admin') return 'FDA_ADMIN';
        if (authRole === 'lea_admin') return 'LEA_ADMIN';
        if (authRole === 'lea') return 'LEA';
        return 'FDA';
    };

    const workspace = getWorkspace();
    const isSuperadmin = workspace === 'NATIONAL_ADMIN';
    const normalizedAgency = isSuperadmin ? 'superadmin' : (workspace === 'FDA_ADMIN' || workspace === 'FDA') ? 'fda' : 'lea';
    const notificationsBasePath = isSuperadmin ? '/notifications' : '/personnel-notifications';

    // Mock mode: used for FDA_ADMIN, LEA_ADMIN prototypes, or NATIONAL_ADMIN when unauthenticated/prototype
    const isMockWorkspace =
        workspace === 'FDA_ADMIN' ||
        workspace === 'LEA_ADMIN' ||
        (workspace === 'NATIONAL_ADMIN' && (!localStorage.getItem('access_token') || topbarType === 'NATIONAL_ADMIN'));

    // dropdown open/close states
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // End Session confirmation modal states
    const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // refs for detecting clicks outside dropdowns
    const notifRef = useRef(null);
    const profileRef = useRef(null);

    // Notifications state — initialized with mock data if in mock workspace
    const [notifications, setNotifications] = useState(() => {
        if (isMockWorkspace) {
            return getMockNotifications(workspace);
        }
        return [];
    });
    const [unreadCount, setUnreadCount] = useState(() => {
        if (isMockWorkspace) {
            return getMockNotifications(workspace).filter(n => !n.isRead).length;
        }
        return 0;
    });
    const [notifLoading, setNotifLoading] = useState(false);

    // ---- fetch unread count on mount + poll every 30s (live personnel) ----
    useEffect(() => {
        if (isMockWorkspace) {
            const mockList = getMockNotifications(workspace);
            setNotifications(mockList);
            setUnreadCount(mockList.filter(n => !n.isRead).length);
            return;
        }

        const fetchUnreadCount = async () => {
            try {
                const res = await apiFetch(`${notificationsBasePath}/unread-count`);
                if (!res.ok) return;
                const data = await res.json();
                setUnreadCount(data.unread_count);
            } catch (err) {
                console.error('Failed to fetch unread count:', err);
            }
        };

        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, [isMockWorkspace, notificationsBasePath, workspace]);

    // ---- fetch full list when dropdown opens (live personnel) ----
    useEffect(() => {
        if (!isNotifOpen) return;
        if (isMockWorkspace) return;

        const fetchNotifications = async () => {
            setNotifLoading(true);
            try {
                const res = await apiFetch(`${notificationsBasePath}?limit=20&offset=0`);
                if (!res.ok) return;
                const data = await res.json();
                setNotifications(
                    data.notifications.map(n => ({
                        id: n.notification_id,
                        title: n.title,
                        message: n.message,
                        time: timeAgo(n.created_at),
                        isRead: n.is_read,
                        eventType: n.event_type,
                    }))
                );
                setUnreadCount(data.unread_count);
            } catch (err) {
                console.error('Failed to fetch notifications:', err);
            } finally {
                setNotifLoading(false);
            }
        };

        fetchNotifications();
    }, [isNotifOpen, isMockWorkspace, notificationsBasePath]);

    // close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setIsNotifOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Unread count
    const displayUnreadCount = unreadCount;

    const handleMarkAllAsRead = async () => {
        if (isMockWorkspace) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            return;
        }

        try {
            const res = await apiFetch(`${notificationsBasePath}/read-all`, { method: 'PATCH' });
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(data.unread_count);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const handleNotificationClick = async (notif) => {
        if (isMockWorkspace) {
            if (notif.isRead) return;
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            return;
        }

        // Computed entries (invite_not_activated / invite_expired) have no
        // real DB row - nothing to mark read, they resolve on their own.
        if (COMPUTED_EVENT_TYPES.includes(notif.eventType)) return;
        if (notif.isRead) return;

        try {
            const res = await apiFetch(`${notificationsBasePath}/${notif.id}/read`, { method: 'PATCH' });
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            setUnreadCount(data.unread_count);
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    // Profile Settings
    const handleProfileClick = () => {
        setIsProfileOpen(false);
        if (workspace) {
            localStorage.setItem('current_workspace', workspace);
        }
        navigate('/profile-setting', { state: { workspace } });
    };

    // Logout — redirects to correct login page based on agency/workspace
    const handleLogoutClick = async () => {
        setIsProfileOpen(false);

        if (!isMockWorkspace) {
            const refreshToken = localStorage.getItem('refresh_token');
            try {
                if (refreshToken) {
                    await apiFetch('/auth/token/revoke', {
                        method: 'POST',
                        body: JSON.stringify({ refresh_token: refreshToken }),
                    });
                }
            } catch (err) {
                console.error('Logout failed:', err);
            }
        }

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('agency');
        localStorage.removeItem('role');

        if (workspace === 'NATIONAL_ADMIN') {
            navigate('/universal-login?tab=superadmin');
        } else {
            navigate('/universal-login');
        }
    };

    // Gated End Session UI Handlers — opens modal first, never ends session prematurely
    const handleEndSessionClick = () => {
        setIsProfileOpen(false);
        setIsEndSessionModalOpen(true);
    };

    const handleCancelEndSession = () => {
        if (isLoggingOut) return;
        setIsEndSessionModalOpen(false);
    };

    const handleConfirmEndSession = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await handleLogoutClick();
        } finally {
            setIsLoggingOut(false);
            setIsEndSessionModalOpen(false);
        }
    };

    const getDisplayName = () => {
        if (workspace === 'NATIONAL_ADMIN') return 'National Admin';
        if (workspace === 'FDA_ADMIN') return 'FDA Admin';
        if (workspace === 'LEA_ADMIN') return 'LEA Admin';
        return 'Admin';
    };

    const getAvatarClass = () => {
        switch (workspace) {
            case 'NATIONAL_ADMIN':
                return 'agency-national-admin agency-superadmin';
            case 'FDA_ADMIN':
                return 'agency-fda-admin agency-fda';
            case 'LEA_ADMIN':
                return 'agency-lea-admin agency-lea';
            case 'FDA':
                return 'agency-fda';
            case 'LEA':
            default:
                return 'agency-lea';
        }
    };

    const getContainerClass = () => {
        switch (workspace) {
            case 'NATIONAL_ADMIN':
                return 'NationalAdminTopBar';
            case 'FDA_ADMIN':
                return 'FDAAdminTopBar';
            case 'LEA_ADMIN':
                return 'LEAAdminTopBar';
            case 'FDA':
                return 'FDATopBar';
            case 'LEA':
            default:
                return 'LEATopBar';
        }
    };

    return (
        <>
            <style>{`
                .TopbarContainer {
                    height: 60px;
                    background: #FDFDFD;
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    padding: 0 24px;
                    border-bottom: 1.5px solid #EDEDED;
                    position: relative;
                    flex-shrink: 0;
                    gap: 20px;
                    box-sizing: border-box;
                }

                .TopbarActions {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .TopbarNotifWrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .TopbarBox {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                    background: #FDFDFD;
                    border: 1.5px solid #EDEDED;
                    color: #1F2937;
                    position: relative;
                }

                .TopbarBox:hover {
                    background: #EDEDED;
                    color: #13213C;
                    transform: translateY(-1px);
                }

                .TopbarBox svg {
                    width: 20px;
                    height: 20px;
                }

                .TopbarProfileWrapper {
                    position: relative;
                }

                .TopbarProfileBox {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    padding: 6px 12px;
                    border-radius: 20px;
                    border: 1.5px solid #EDEDED;
                    background: #FDFDFD;
                    transition: all 0.2s ease;
                    user-select: none;
                }

                .TopbarProfileBox:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    transform: translateY(-1px);
                }

                .TopbarAvatarCircle {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    color: #FDFDFD;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    border: 1px solid rgba(253, 253, 253, 0.2);
                }

                /* FDA & FDA Admin — dark green */
                .TopbarAvatarCircle.agency-fda,
                .TopbarAvatarCircle.agency-fda-admin {
                    background: #1B4332;
                }

                /* LEA-CIDG & LEA Admin — navy blue */
                .TopbarAvatarCircle.agency-lea,
                .TopbarAvatarCircle.agency-lea-admin {
                    background: #13213C;
                }

                /*National Admin — navy/slate */
                .TopbarAvatarCircle.agency-superadmin,
                .TopbarAvatarCircle.agency-national-admin {
                    background: linear-gradient(135deg, #1E293B 0%, #1E293B 100%);
                }

                /* Scoped theme styles */
                .FDAAdminTopBar .SeeAllNotifsBtn:hover,
                .FDATopBar .SeeAllNotifsBtn:hover {
                    color: #1B4332;
                }

                .LEAAdminTopBar .SeeAllNotifsBtn:hover,
                .LEATopBar .SeeAllNotifsBtn:hover {
                    color: #13213C;
                }

                .NationalAdminTopBar .SeeAllNotifsBtn:hover {
                    color: #1E293B; 
                }

                .TopbarAvatarCircle svg {
                    width: 14px;
                    height: 14px;
                }

                .TopbarUsername {
                    font-size: 13.5px;
                    font-weight: 600;
                    color: #1F2937;
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .TopbarChevron {
                    color: #94a3b8;
                    transition: transform 0.2s ease;
                }

                .TopbarChevron.open {
                    transform: rotate(180deg);
                    color: #13213C;
                }

                .TopbarDropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    width: min(340px, calc(100vw - 32px));
                    max-height: calc(100vh - 76px);
                    background: #FDFDFD;
                    border: 1.5px solid #EDEDED;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: TopbarDropdownFade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .TopbarProfileDropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    width: min(200px, calc(100vw - 32px));
                    max-height: calc(100vh - 76px);
                    background: #FDFDFD;
                    border: 1.5px solid #EDEDED;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                    padding: 6px;
                    overflow: hidden;
                    animation: TopbarDropdownFade 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes TopbarDropdownFade {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .TopNotifTitle {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 16px;
                    border-bottom: 1px solid #EDEDED;
                }

                .TopNotifTitle h5 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 700;
                    color: #13213C;
                }

                .MarkAllReadBtn {
                    background: none;
                    border: none;
                    color: #13213C;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .MarkAllReadBtn:hover {
                    background: rgba(252, 163, 17, 0.1);
                    color: #D97706;
                }

                .NotifList {
                    overflow-y: auto;
                    flex: 1;
                }

                .NotifItem {
                    display: flex;
                    gap: 12px;
                    padding: 12px 16px;
                    border-bottom: 1px solid #f4f4f4;
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                    position: relative;
                    align-items: flex-start;
                    text-align: left;
                }

                .NotifItem:hover {
                    background-color: #f8fafc;
                }

                .NotifItem.unread {
                    background-color: rgba(252, 163, 17, 0.05);
                }

                .NotifItem.unread:hover {
                    background-color: rgba(252, 163, 17, 0.1);
                }

                .NotifBadgeDot {
                    width: 7px;
                    height: 7px;
                    background-color: #FCA311;
                    border-radius: 50%;
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                }

                .NotifContent {
                    flex: 1;
                    padding-right: 12px;
                }

                .NotifItemTitle {
                    font-size: 13px;
                    font-weight: 600;
                    color: #1F2937;
                    margin-bottom: 4px;
                }

                .NotifItemMsg {
                    font-size: 11.5px;
                    color: #4b5563;
                    margin-bottom: 4px;
                    line-height: 1.4;
                }

                .NotifItemTime {
                    font-size: 10.5px;
                    color: #9ca3af;
                }

                .EmptyNotif {
                    padding: 32px 16px;
                    text-align: center;
                    color: #9ca3af;
                    font-size: 13px;
                }

                .TopNotifFooter {
                    padding: 10px 16px;
                    border-top: 1px solid #EDEDED;
                    background: #FAFAFA;
                    text-align: center;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .SeeAllNotifsBtn {
                    background: transparent;
                    border: none;
                    color: #13213C;
                    font-size: 12.5px;
                    font-weight: 600;
                    cursor: pointer;
                    width: 100%;
                    padding: 6px 10px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    text-decoration: none;
                }

                .SeeAllNotifsBtn:hover {
                    background: #EDEDED;
                    color: #0D9488;
                }

                .BellBadge {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    background: #b91c1c;
                    color: white;
                    font-size: 9px;
                    font-weight: 700;
                    border-radius: 10px;
                    padding: 1px 4px;
                    min-width: 14px;
                    height: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1.5px solid #FDFDFD;
                }

                .TopbarDropdownItem {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                    padding: 10px 12px;
                    border: none;
                    background: transparent;
                    color: #1F2937;
                    font-size: 13px;
                    font-weight: 550;
                    text-align: left;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.15s ease;
                    font-family: inherit;
                }

                .TopbarDropdownItem:hover {
                    background: #f1f5f9;
                    color: #13213C;
                }

                .TopbarDropdownItem svg {
                    color: #64748b;
                    transition: color 0.15s ease;
                }

                .TopbarDropdownItem:hover svg {
                    color: #13213C;
                }

                .TopbarDropdownItemLogout:hover {
                    background: rgba(185, 28, 28, 0.08);
                    color: #b91c1c;
                }

                .TopbarDropdownItemLogout:hover svg {
                    color: #b91c1c;
                }

                /* divider between profile settings and logout */
                .TopbarDropdownDivider {
                    height: 1px;
                    background: #EDEDED;
                    margin: 4px 0;
                }

                    /* RESPONSIVE — TopBar (tablet/mobile)                                          */
                    @media (max-width: 900px) {
                        .TopbarContainer {
                            padding: 0 16px;
                            gap: 12px;
                        }
                    }

                    @media (max-width: 640px) {
                        .TopbarContainer {
                            padding: 0 12px;
                        }

                        /* Hide username text, keep avatar + chevron only to save space */
                        .TopbarUsername {
                            display: none;
                        }

                        .TopbarProfileBox {
                            padding: 6px 8px;
                            gap: 6px;
                        }

                        /* Prevent dropdowns overflowing narrow viewports */
                        .TopbarDropdown {
                            width: min(320px, calc(100vw - 24px));
                            right: -8px;
                        }

                        .TopbarProfileDropdown {
                            width: min(200px, calc(100vw - 24px));
                            right: -8px;
                        }
                    }

                    @media (max-width: 400px) {
                        .TopbarBox {
                            width: 34px;
                            height: 34px;
                        }

                        .TopbarAvatarCircle {
                            width: 26px;
                            height: 26px;
                        }
                    }

                    /* End Session Confirmation Modal */
                    .TopbarModalOverlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(15, 23, 42, 0.45);
                        backdrop-filter: blur(4px);
                        -webkit-backdrop-filter: blur(4px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                        padding: 16px;
                        animation: TopbarModalFadeIn 0.2s ease-out;
                    }

                    .TopbarModalCard {
                        background: #FFFFFF;
                        border: 1.5px solid #EDEDED;
                        border-radius: 16px;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                        width: 100%;
                        max-width: 400px;
                        padding: 28px 24px 24px 24px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        box-sizing: border-box;
                        animation: TopbarModalCardSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    @keyframes TopbarModalFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    @keyframes TopbarModalCardSlide {
                        from { opacity: 0; transform: translateY(12px) scale(0.97); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }

                    .TopbarModalIconCircle {
                        width: 52px;
                        height: 52px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 16px;
                        background: rgba(220, 38, 38, 0.1);
                        color: #DC2626;
                        border: 1.5px solid rgba(220, 38, 38, 0.2);
                    }

                    .TopbarModalTitle {
                        margin: 0 0 8px 0;
                        font-size: 18px;
                        font-weight: 700;
                        color: #111827;
                        font-family: inherit;
                    }

                    .TopbarModalMessage {
                        margin: 0 0 24px 0;
                        font-size: 13.5px;
                        line-height: 1.5;
                        color: #64748B;
                        font-family: inherit;
                    }

                    .TopbarModalActions {
                        display: flex;
                        gap: 12px;
                        width: 100%;
                    }

                    .TopbarModalCancelBtn {
                        flex: 1;
                        padding: 10px 16px;
                        border-radius: 8px;
                        border: 1.5px solid #E2E8F0;
                        background: #F8FAFC;
                        color: #475569;
                        font-size: 13.5px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        font-family: inherit;
                    }

                    .TopbarModalCancelBtn:hover:not(:disabled) {
                        background: #EDEDED;
                        color: #1E293B;
                        border-color: #CBD5E1;
                    }

                    .TopbarModalCancelBtn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    .TopbarModalConfirmBtn {
                        flex: 1;
                        padding: 10px 16px;
                        border-radius: 8px;
                        border: none;
                        background: #DC2626;
                        color: #FFFFFF;
                        font-size: 13.5px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        box-shadow: 0 2px 6px rgba(220, 38, 38, 0.25);
                        font-family: inherit;
                    }

                    .TopbarModalConfirmBtn:hover:not(:disabled) {
                        background: #B91C1C;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 10px rgba(220, 38, 38, 0.35);
                    }

                    .TopbarModalConfirmBtn:active:not(:disabled) {
                        transform: translateY(0);
                    }

                    .TopbarModalConfirmBtn:disabled {
                        opacity: 0.65;
                        cursor: not-allowed;
                    }
            `}</style>

            <div className={`TopbarContainer ${getContainerClass()}`}>
                <div className='TopbarActions'>

                    {/* Profile Dropdown */}
                    <div className='TopbarProfileWrapper' ref={profileRef}>
                        <div
                            className='TopbarProfileBox'
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            {/* Avatar circle color changes per agency / workspace */}
                            <div className={`TopbarAvatarCircle ${getAvatarClass()}`}>
                                <User />
                            </div>

                            {/* Username label */}
                            <span className='TopbarUsername'>
                                {getDisplayName()}
                            </span>

                            <ChevronDown
                                size={14}
                                className={`TopbarChevron ${isProfileOpen ? 'open' : ''}`}
                            />
                        </div>

                        {isProfileOpen && (
                            <div className='TopbarProfileDropdown'>

                                {/* Profile Settings — visible for FDA, LEA, and SUPERADMIN */}
                                <button
                                    className='TopbarDropdownItem'
                                    onClick={handleProfileClick}
                                >
                                    <Settings size={16} />
                                    <span>Profile Settings</span>
                                </button>

                                <div className='TopbarDropdownDivider' />

                                {/* Logout / End Session */}
                                {/* redirects to superadmin-login if superadmin, else to /login */}
                                <button
                                    className='TopbarDropdownItem TopbarDropdownItemLogout'
                                    onClick={handleEndSessionClick}
                                >
                                    <LogOut size={16} />
                                    <span>End Session</span>
                                </button>

                            </div>
                        )}
                    </div>

                    {/* Notification Bell */}
                    <div className='TopbarNotifWrapper' ref={notifRef}>
                        <div
                            className='TopbarBox'
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                        >
                            <Bell />
                            {displayUnreadCount > 0 && (
                                <span className='BellBadge'>{displayUnreadCount}</span>
                            )}
                        </div>

                        {isNotifOpen && (
                            <div className='TopbarDropdown'>
                                <div className='TopNotifTitle'>
                                    <h5>Notifications</h5>
                                    {displayUnreadCount > 0 && (
                                        <button
                                            className='MarkAllReadBtn'
                                            onClick={handleMarkAllAsRead}
                                        >
                                            Mark all as read
                                        </button>
                                    )}
                                </div>
                                <div className='NotifList'>
                                    {notifLoading ? (
                                        <div className='EmptyNotif'>Loading...</div>
                                    ) : notifications.length === 0 ? (
                                        <div className='EmptyNotif'>No notifications</div>
                                    ) : (
                                        notifications.slice(0, 10).map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`NotifItem ${notif.isRead ? '' : 'unread'}`}
                                                onClick={() => handleNotificationClick(notif)}
                                            >
                                                <div className='NotifContent'>
                                                    <div className='NotifItemTitle'>{notif.title}</div>
                                                    <div className='NotifItemMsg'>{notif.message}</div>
                                                    <div className='NotifItemTime'>{notif.time}</div>
                                                </div>
                                                {!notif.isRead && <div className='NotifBadgeDot'></div>}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className='TopNotifFooter'>
                                    <button
                                        type='button'
                                        className='SeeAllNotifsBtn'
                                        onClick={() => {
                                            setIsNotifOpen(false);
                                            navigate('/all-notifications');
                                        }}
                                    >
                                        See all notifications
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* End Session Confirmation Modal */}
            {isEndSessionModalOpen && (
                <div className='TopbarModalOverlay' onClick={handleCancelEndSession}>
                    <div className='TopbarModalCard' onClick={(e) => e.stopPropagation()}>
                        <div className='TopbarModalIconCircle'>
                            <LogOut size={24} />
                        </div>
                        <h3 className='TopbarModalTitle'>End Session?</h3>
                        <p className='TopbarModalMessage'>
                            Are you sure you want to end your current session?
                        </p>
                        <div className='TopbarModalActions'>
                            <button
                                type='button'
                                className='TopbarModalCancelBtn'
                                onClick={handleCancelEndSession}
                                disabled={isLoggingOut}
                            >
                                Cancel
                            </button>
                            <button
                                type='button'
                                className='TopbarModalConfirmBtn'
                                onClick={handleConfirmEndSession}
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? 'Ending Session...' : 'End Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default TopBar;