import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { API_BASE_URL } from '../../utils/apiConfig'
import {
  LayoutDashboard, //dashboard icon
  ClipboardList, //complaints menu icon
  ShieldCheck, //verification request menu icon
  RefreshCw, //status update menu icon
  Database, //product database menu icon
  FileText, // view reports menu icon
  CirclePlus, //new walk in intake menu icon
  Bookmark, // saved draft menu icon
  UsersRound, // user management icon
  UserCog, // admin management icon
  ScrollText, // audit logs icon
  Menu, // hamburger icon (NEW - responsive sidebar)
} from "lucide-react";


// Images
import CIDGLogo from '../../images/pnp-cidg.jpg'
import FDALogo from '../../images/FDA.png'

const SuperAdminMenuItems = [
    { icon: UsersRound, label: 'User Management', path: '/superadminfolder/superadmin-user-management' },
    { icon: UserCog, label: 'Admin Management', path: '/superadminfolder/superadmin-admin-management' },
    { icon: ScrollText, label: 'Audit Logs', path: '/superadminfolder/superadmin-audit-log' },
]

const FDAMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/fdafolder/fda-dashboard' },
    { icon: FileText, label: 'View Reports', path: '/fdafolder/fda-view-reports' },
    { icon: ShieldCheck, label: 'Verification Queue', path: '/fdafolder/fda-verification' },
    { icon: RefreshCw, label: 'Status Update', path: '/fdafolder/fda-status' },
    { icon: Database, label: 'Product Database', path: '/fdafolder/fda-product-db' },
    {icon: Bookmark, label: 'Saved Drafts', path: '/fdafolder/fda-saved-draft'},
]

const LeaMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/leacidgfolder/lea-dashboard' },
    { icon: CirclePlus, label: 'New Walk-in Intake', path: '/leacidgfolder/lea-new-intake' },
    { icon: ClipboardList, label: 'Walk-in Complaints', path: '/leacidgfolder/lea-walkin-complaints' },
    { icon: ShieldCheck, label: 'Verification Request', path: '/leacidgfolder/lea-verification-request' },
    { icon: Bookmark, label: 'Saved Drafts', path: '/leacidgfolder/lea-saved-draft' },
]

const sidebarStyles = `
/* SuperAdmin Sidebar Styles*/

.SuperAdminSidebarMain {
  width: 280px;
  height: 100vh;
  background: #1E293B;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
}

.SuperAdminSidebarTop {
  width: 280px;
  min-height: 70px;
  height: fit-content;
  display: flex;
  justify-content: center;
  gap: 10px;
  align-items: center;
  padding: 20px 10px;
  color: #fdfdfd;
  font-size: small;
  font-weight: 600;
  border-bottom: 1px solid rgba(253, 253, 253, 0.2);
  box-sizing: border-box;
}

.SuperAdminSidebarMenu {
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  gap: 4px;
  align-items: center;
  flex: 1;
}

.SuperAdminSidebarMenu .MenuBtn {
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.SuperAdminSidebarMenu .MenuBtn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.SuperAdminSidebarMenu .MenuBtn.active {
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

/* ========================================== */
/* FDA Sidebar Styles                         */
/* ========================================== */
.FdaSidebarMain {
  width: 280px;
  height: 100vh;
  background: #1B4332;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
}

.FdaSidebarTop {
  width: 280px;
  min-height: 70px;
  height: fit-content;
  display: flex;
  justify-content: center;
  gap: 10px;
  align-items: center;
  padding: 10px;
  color: #fdfdfd;
  font-size: small;
  border-bottom: 1px solid rgba(253, 253, 253, 0.2);
  box-sizing: border-box;
}

.FdaSidebarTop img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.FdaSidebarMenu {
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  gap: 4px;
  align-items: center;
  flex: 1;
}

.FdaMenuBtn {
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.FdaMenuBtn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.FdaMenuBtn.active {
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.FdaMenuIcons svg {
  width: 21px;
  height: 21px;
  display: block;
}

/* ========================================== */
/* LEA Sidebar Styles                         */
/* ========================================== */
.LeaSidebarMain {
  width: 250px;
  height: 100vh;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
}

.LeaSidebarTop {
  width: 250px;
  min-height: 70px;
  height: fit-content;
  display: flex;
  justify-content: center;
  gap: 10px;
  align-items: center;
  padding: 10px;
  color: #fdfdfd;
  font-size: small;
  border-bottom: 1px solid rgba(253, 253, 253, 0.2);
  box-sizing: border-box;
}

.LeaSidebarTop img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.LeaSidebarMenu {
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  gap: 4px;
  align-items: center;
  flex: 1;
}

.LeaSidebarMain .MenuBtn {
  width: 100%;
  padding: 12px 16px;
  background: transparent;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  text-align: left;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.LeaSidebarMain .MenuBtn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.LeaSidebarMain .MenuBtn.active {
  background: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.LeaSidebarMain .MenuIcons svg {
  width: 21px;
  height: 21px;
  display: block;
}

/* ========================================================== */
/* RESPONSIVE SIDEBAR STYLES (shared across all workspaces)   */
/* ========================================================== */

.SidebarLogoWrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.SidebarWorkspaceTitle {
  margin: 0;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
}

.SidebarOverlay {
  display: none;
}

.SidebarMobileTrigger {
  display: none;
}

.SidebarHamburgerBtn {
  display: none;
  width: 100%;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 10px 0;
  color: #ffffff;
  border-bottom: 1px solid rgba(253, 253, 253, 0.15);
  box-sizing: border-box;
  transition: background 0.2s;
}

.SidebarMobileTrigger.IsOpen {
  color: #ffffff;
}

.SidebarHamburgerBtn:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* All sidebars smooth transition for width/collapse */
.SuperAdminSidebarMain,
.FdaSidebarMain,
.LeaSidebarMain {
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
}

/* TABLET: 768px - 1199px -> icon-only collapse */
@media (max-width: 1199px) and (min-width: 768px) {
  .SuperAdminSidebarMain,
  .FdaSidebarMain,
  .LeaSidebarMain {
    width: 76px;
    overflow: visible;
  }

  /* Hamburger at TOP of sidebar when collapsed */
  .SidebarHamburgerBtn {
    display: flex;
    order: 1;
    height: 52px;
    padding: 0;
    z-index: 15;
  }

  /* Navigation menu in the MIDDLE */
  .SuperAdminSidebarMenu,
  .FdaSidebarMenu,
  .LeaSidebarMenu {
    order: 2;
    flex: 1;
    padding: 12px 8px;
    margin-bottom: 64px;
    transition: margin-bottom 0.3s ease;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .SuperAdminSidebarTop,
  .FdaSidebarTop,
  .LeaSidebarTop {
    width: 76px;
    min-height: 0;
    height: 0;
    padding: 0;
    border-bottom: none;
    position: static;
    display: flex;
    align-items: center;
  }

  .SuperAdminSidebarTop p,
  .FdaSidebarTop p,
  .LeaSidebarTop p,
  .SidebarWorkspaceTitle {
    display: none;
    opacity: 0;
  }

  /* Logo positioned at the BOTTOM when collapsed, with smooth transition */
  .SidebarLogoWrapper {
    position: absolute;
    top: calc(100% - 58px);
    left: 50%;
    transform: translateX(-50%);
    width: 36px;
    height: 36px;
    z-index: 10;
    transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                left 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                width 0.3s ease,
                height 0.3s ease;
  }

  .SidebarLogoWrapper img,
  .FdaSidebarTop img,
  .LeaSidebarTop img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    transition: width 0.3s ease, height 0.3s ease;
  }

  .SuperAdminSidebarMenu .MenuLabels,
  .FdaSidebarMenu .FdaMenuLabels,
  .LeaSidebarMain .MenuLabels {
    display: none;
  }

  .SuperAdminSidebarMenu .MenuBtn,
  .FdaSidebarMenu .FdaMenuBtn,
  .LeaSidebarMain .MenuBtn {
    justify-content: center;
    padding: 12px 0;
    position: relative;
  }

  /* keyboard + hover accessible tooltip */
  .SuperAdminSidebarMenu .MenuBtn[data-tooltip]:hover::after,
  .SuperAdminSidebarMenu .MenuBtn[data-tooltip]:focus-visible::after,
  .FdaSidebarMenu .FdaMenuBtn[data-tooltip]:hover::after,
  .FdaSidebarMenu .FdaMenuBtn[data-tooltip]:focus-visible::after,
  .LeaSidebarMain .MenuBtn[data-tooltip]:hover::after,
  .LeaSidebarMain .MenuBtn[data-tooltip]:focus-visible::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 10px;
    background: #111827;
    color: #ffffff;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    z-index: 50;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  }

  /* Temporary expand via hamburger (overlay, doesn't shift layout) */
  .SuperAdminSidebarMain.MenuOpen,
  .FdaSidebarMain.MenuOpen,
  .LeaSidebarMain.MenuOpen {
    width: 280px;
    position: absolute;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 100;
    box-shadow: 4px 0 16px rgba(0,0,0,0.25);
  }

  .SuperAdminSidebarMain.MenuOpen .SuperAdminSidebarTop,
  .FdaSidebarMain.MenuOpen .FdaSidebarTop,
  .LeaSidebarMain.MenuOpen .LeaSidebarTop {
    width: 280px;
    min-height: 70px;
    height: fit-content;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(253, 253, 253, 0.2);
    order: 1;
    position: relative;
  }

  .SuperAdminSidebarMain.MenuOpen .SidebarHamburgerBtn,
  .FdaSidebarMain.MenuOpen .SidebarHamburgerBtn,
  .LeaSidebarMain.MenuOpen .SidebarHamburgerBtn {
    position: absolute;
    top: 16px;
    right: 12px;
    width: 36px;
    height: 36px;
    padding: 0;
    border-bottom: none;
    border-radius: 6px;
    z-index: 20;
  }

  .SuperAdminSidebarMain.MenuOpen .SidebarLogoWrapper,
  .FdaSidebarMain.MenuOpen .SidebarLogoWrapper,
  .LeaSidebarMain.MenuOpen .SidebarLogoWrapper {
    position: static;
    top: auto;
    left: auto;
    transform: none;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }

  .SuperAdminSidebarMain.MenuOpen .SidebarLogoWrapper img,
  .FdaSidebarMain.MenuOpen .SidebarLogoWrapper img,
  .LeaSidebarMain.MenuOpen .SidebarLogoWrapper img {
    width: 44px;
    height: 44px;
  }

  .SuperAdminSidebarMain.MenuOpen .SuperAdminSidebarTop p,
  .FdaSidebarMain.MenuOpen .FdaSidebarTop p,
  .LeaSidebarMain.MenuOpen .LeaSidebarTop p,
  .SuperAdminSidebarMain.MenuOpen .SidebarWorkspaceTitle,
  .FdaSidebarMain.MenuOpen .SidebarWorkspaceTitle,
  .LeaSidebarMain.MenuOpen .SidebarWorkspaceTitle {
    display: block;
    opacity: 1;
    color: #fdfdfd;
    font-size: 14px;
    font-weight: 600;
    margin-left: 0;
  }

  .SuperAdminSidebarMain.MenuOpen .SuperAdminSidebarMenu,
  .FdaSidebarMain.MenuOpen .FdaSidebarMenu,
  .LeaSidebarMain.MenuOpen .LeaSidebarMenu {
    margin-bottom: 0;
  }

  .SuperAdminSidebarMain.MenuOpen .MenuLabels,
  .FdaSidebarMain.MenuOpen .FdaMenuLabels,
  .LeaSidebarMain.MenuOpen .MenuLabels {
    display: inline;
  }

  .SuperAdminSidebarMain.MenuOpen .MenuBtn,
  .FdaSidebarMain.MenuOpen .FdaMenuBtn,
  .LeaSidebarMain.MenuOpen .MenuBtn {
    justify-content: flex-start;
    padding: 12px 16px;
  }

  .SuperAdminSidebarMain.MenuOpen .MenuBtn[data-tooltip]:hover::after,
  .FdaSidebarMain.MenuOpen .FdaMenuBtn[data-tooltip]:hover::after,
  .LeaSidebarMain.MenuOpen .MenuBtn[data-tooltip]:hover::after {
    content: none;
  }
}

/* MOBILE: below 768px -> off-canvas drawer */
@media (max-width: 767px) {
  .SidebarMobileTrigger {
    display: flex;
    position: fixed;
    top: 14px;
    left: 14px;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    background: none;
    color: #111827;
    border: none;
    cursor: pointer;
    z-index: 120;
  }

  .SidebarMobileTrigger.IsOpen {
    display: none;
  }

  .SuperAdminSidebarMain,
  .FdaSidebarMain,
  .LeaSidebarMain {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    transform: translateX(-100%);
    z-index: 110;
  }

  .SuperAdminSidebarMain.MenuOpen,
  .FdaSidebarMain.MenuOpen,
  .LeaSidebarMain.MenuOpen {
    transform: translateX(0); 
  }

  .SuperAdminSidebarTop,
  .FdaSidebarTop,
  .LeaSidebarTop {
    width: 280px;
  }

  .SuperAdminSidebarMain.MenuOpen .SuperAdminSidebarTop,
  .FdaSidebarMain.MenuOpen .FdaSidebarTop,
  .LeaSidebarMain.MenuOpen .LeaSidebarTop {
    width: 280px;
    min-height: 70px;
    height: fit-content;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    padding: 10px 48px 10px 12px;
    border-bottom: 1px solid rgba(253, 253, 253, 0.2);
    position: relative;
    box-sizing: border-box;
  }

  .SidebarHamburgerBtn {
    display: none;
  }

  .SuperAdminSidebarMain.MenuOpen .SidebarHamburgerBtn,
  .FdaSidebarMain.MenuOpen .SidebarHamburgerBtn,
  .LeaSidebarMain.MenuOpen .SidebarHamburgerBtn {
    display: flex;
    position: absolute;
    top: 17px;
    right: 12px;
    width: 36px;
    height: 36px;
    padding: 0;
    border-bottom: none;
    border-radius: 6px;
    z-index: 20;
  }

  .SuperAdminSidebarMain.MenuOpen .SidebarLogoWrapper,
  .FdaSidebarMain.MenuOpen .SidebarLogoWrapper,
  .LeaSidebarMain.MenuOpen .SidebarLogoWrapper {
    position: static;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .SuperAdminSidebarMain.MenuOpen .SidebarLogoWrapper img,
  .FdaSidebarMain.MenuOpen .SidebarLogoWrapper img,
  .LeaSidebarMain.MenuOpen .SidebarLogoWrapper img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .SuperAdminSidebarMain.MenuOpen .SidebarWorkspaceTitle,
  .FdaSidebarMain.MenuOpen .SidebarWorkspaceTitle,
  .LeaSidebarMain.MenuOpen .SidebarWorkspaceTitle {
    flex: 1;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    color: #fdfdfd;
    margin: 0 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .SidebarOverlay.MenuOpen {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 105;
  }
}
`

function Sidebar({ sidebarType, role, agency }) {
    const navigate = useNavigate()
    const location = useLocation()
    const sidebarRef = useRef(null)

    // Controls tablet temporary expand AND mobile off-canvas open
    const [menuOpen, setMenuOpen] = useState(false)

    // Close the expanded/drawer sidebar when clicking outside it
    useEffect(() => {
        function handleClickOutside(e) {
            if (!menuOpen) return
            if (sidebarRef.current && sidebarRef.current.contains(e.target)) return
            if (e.target.closest && e.target.closest('.SidebarMobileTrigger, .SidebarHamburgerBtn')) return
            setMenuOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [menuOpen])

    // Auto-close the expanded/drawer sidebar after navigating
    useEffect(() => {
        setMenuOpen(false)
    }, [location.pathname])

    function toggleMenu() {
        setMenuOpen((prev) => !prev)
    }

    // Determine type to render
    let type = sidebarType
    if (!type) {
        const normalizedRole = (role || '').toUpperCase()
        const normalizedAgency = (agency || '').toUpperCase()
        if (normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'SUPERADMIN') {
            type = 'SUPER_ADMIN'
        } else if (normalizedRole === 'FDA' || normalizedAgency === 'FDA') {
            type = 'FDA'
        } else if (normalizedRole === 'LEA' || normalizedAgency === 'LEA' || normalizedAgency === 'CIDG') {
            type = 'LEA'
        }
    }

    // End session / logout handler
    async function handleLogout() {
        const refreshToken = localStorage.getItem('refresh_token');

        try {
            if (refreshToken) {
                await fetch(`${API_BASE_URL}/auth/token/revoke`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken }),
                });
            }
        } catch (err) {
            console.error('Failed to revoke session:', err);
        }

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        if (type === 'SUPER_ADMIN') {
            navigate('/');
        } else {
            navigate('/login');
        }
    }

    const renderStyles = () => (
        <style dangerouslySetInnerHTML={{ __html: sidebarStyles }} />
    )

    if (type === 'SUPER_ADMIN') {
        return (
            <>
                {renderStyles()}
                <button
                    className={`SidebarMobileTrigger ${menuOpen ? 'IsOpen' : ''}`}
                    aria-label={menuOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
                    onClick={toggleMenu}
                >
                    <Menu size={20} />
                </button>
                <div
                    className={`SidebarOverlay ${menuOpen ? 'MenuOpen' : ''}`}
                    onClick={() => setMenuOpen(false)}
                />
                <div className={`SuperAdminSidebarMain ${menuOpen ? 'MenuOpen' : ''}`} ref={sidebarRef}>
                    <div className='SuperAdminSidebarTop'>
                        <p className='SidebarWorkspaceTitle'>ICMDA: Superadmin Workspace</p>
                    </div>
                    <button
                        className='SidebarHamburgerBtn'
                        aria-label={menuOpen ? 'Collapse menu' : 'Expand menu'}
                        onClick={toggleMenu}
                    >
                        <Menu size={20} />
                    </button>
                    <div className='SuperAdminSidebarMenu'>
                        {SuperAdminMenuItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <button
                                    key={item.path}
                                    className={`MenuBtn ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={() => navigate(item.path)}
                                    data-tooltip={item.label}
                                >
                                    <span className='MenuIcons'>{Icon && <Icon />}</span>
                                    <span className='MenuLabels'>{item.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </>
        )
    }

    if (type === 'FDA') {
        return (
            <>
                {renderStyles()}
                <button
                    className={`SidebarMobileTrigger ${menuOpen ? 'IsOpen' : ''}`}
                    aria-label={menuOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
                    onClick={toggleMenu}
                >
                    <Menu size={20} />
                </button>
                <div
                    className={`SidebarOverlay ${menuOpen ? 'MenuOpen' : ''}`}
                    onClick={() => setMenuOpen(false)}
                />
                <div className={`FdaSidebarMain ${menuOpen ? 'MenuOpen' : ''}`} ref={sidebarRef}>
                    <div className='FdaSidebarTop'>
                        <div className='SidebarLogoWrapper'><img src={FDALogo} alt="FDA Logo" /></div>
                        <p className='SidebarWorkspaceTitle'>FDA Workspace</p>
                    </div>
                    <button
                        className='SidebarHamburgerBtn'
                        aria-label={menuOpen ? 'Collapse menu' : 'Expand menu'}
                        onClick={toggleMenu}
                    >
                        <Menu size={20} />
                    </button>
                    <div className='FdaSidebarMenu'>
                        {FDAMenuItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <button
                                    key={item.path}
                                    className={`FdaMenuBtn ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={() => navigate(item.path)}
                                    data-tooltip={item.label}>
                                    <span className='FdaMenuIcons'><Icon /></span>
                                    <span className='FdaMenuLabels'>{item.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </>
        )
    }

    if (type === 'LEA') {
        return (
            <>
                {renderStyles()}
                <button
                    className={`SidebarMobileTrigger ${menuOpen ? 'IsOpen' : ''}`}
                    aria-label={menuOpen ? 'Close sidebar menu' : 'Open sidebar menu'}
                    onClick={toggleMenu}
                >
                    <Menu size={20} />
                </button>
                <div
                    className={`SidebarOverlay ${menuOpen ? 'MenuOpen' : ''}`}
                    onClick={() => setMenuOpen(false)}
                />
                <div className={`LeaSidebarMain ${menuOpen ? 'MenuOpen' : ''}`} ref={sidebarRef}>
                    <div className='LeaSidebarTop'>
                        <div className='SidebarLogoWrapper'><img src={CIDGLogo} alt="CIDG LOGO" /></div>
                        <p className='SidebarWorkspaceTitle'>LEA-CIDG Workspace</p>
                    </div>
                    <button
                        className='SidebarHamburgerBtn'
                        aria-label={menuOpen ? 'Collapse menu' : 'Expand menu'}
                        onClick={toggleMenu}
                    >
                        <Menu size={20} />
                    </button>
                    <div className='LeaSidebarMenu'>
                        {LeaMenuItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <button
                                    key={item.path}
                                    className={`MenuBtn ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={() => navigate(item.path)}
                                    data-tooltip={item.label}>
                                    <span className='MenuIcons'><Icon /></span>
                                    <span className='MenuLabels'>{item.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </>
        )
    }

    return null
}

export default Sidebar