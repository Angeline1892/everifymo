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

    if (raw.includes('super')) return 'superadmin';
    if (raw === 'lea' || raw === 'cidg' || raw.includes('lea') || raw.includes('cidg')) return 'lea';
    return 'fda';
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

    const getNormalizedAgency = () => {
        if (type) {
            const raw = type.toString().trim().toLowerCase();
            if (raw.includes('super')) return 'superadmin';
            if (raw === 'lea' || raw === 'cidg' || raw.includes('lea') || raw.includes('cidg')) return 'lea';
            if (raw === 'fda' || raw.includes('fda')) return 'fda';
        }
        return getAuthenticatedRole();
    };

    const normalizedAgency = getNormalizedAgency();
    const isSuperadmin = normalizedAgency === 'superadmin';  
    const notificationsBasePath = isSuperadmin ? '/notifications' : '/personnel-notifications';

    // dropdown open/close states
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // End Session confirmation modal states
    const [isEndSessionModalOpen, setIsEndSessionModalOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // refs for detecting clicks outside dropdowns
    const notifRef = useRef(null);
    const profileRef = useRef(null);

    // CHANGED — notifications now always come from the real backend,
    // for every personnel role (fda, lea, superadmin alike). The old
    // FDA/LEA mock-data branch has been removed entirely.
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifLoading, setNotifLoading] = useState(false);

    // ---- fetch unread count on mount + poll every 30s ----
    useEffect(() => {
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
    }, []);

    // ---- fetch full list when dropdown opens ----
    useEffect(() => {
        if (!isNotifOpen) return;

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
    }, [isNotifOpen]);

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

    // CHANGED — unread count now always comes from backend state,
    // for every role. No more local-mock-derived count.
    const displayUnreadCount = unreadCount;

    const handleMarkAllAsRead = async () => {
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

    // Profile Settings — only for FDA and LEA, NOT superadmin
    const handleProfileClick = () => {
        setIsProfileOpen(false);
        navigate('/profile-setting');
    };

    // Logout — redirects to correct login page based on agency
    const handleLogoutClick = async () => {
    setIsProfileOpen(false);

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
        // proceed with local cleanup regardless — don't trap the user in a logged-in UI
        // just because the network call failed
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('agency');
    localStorage.removeItem('role');

    if (normalizedAgency === 'superadmin') {
        navigate('/superadmin-login');
    } else {
        navigate('/login');
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

                /* FDA — dark green */
                .TopbarAvatarCircle.agency-fda {
                    background: #1B4332;
                }

                /* LEA-CIDG — navy blue */
                .TopbarAvatarCircle.agency-lea {
                    background: #13213C;
                }

                /* Superadmin — teal */
                .TopbarAvatarCircle.agency-superadmin {
                    background: linear-gradient(135deg, #0D9488 0%, #0f766e 100%);
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

            <div className='TopbarContainer'>
                <div className='TopbarActions'>
                    
                    {/* Profile Dropdown */}
                    <div className='TopbarProfileWrapper' ref={profileRef}>
                        <div
                            className='TopbarProfileBox'
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            {/* Avatar circle color changes per agency */}
                            <div className={`TopbarAvatarCircle ${
                                normalizedAgency === 'fda'
                                    ? 'agency-fda'
                                    : normalizedAgency === 'superadmin'
                                        ? 'agency-superadmin'
                                        : 'agency-lea'
                            }`}>
                                <User />
                            </div>

                            {/* Username label */}
                            {/* 🔌 BACKEND: replace 'Admin' with actual logged-in user's name */}
                            <span className='TopbarUsername'>
                                {normalizedAgency === 'superadmin' ? 'Super Admin' : 'Admin'}
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
                                        notifications.map((notif) => (
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