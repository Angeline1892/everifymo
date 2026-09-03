import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Users, ShieldCheck } from 'lucide-react'
import FDALogo from '../images/FDA.png'
import PNPLogo from '../images/pnp-cidg.jpg'
import { API_BASE_URL } from '../utils/apiConfig'



const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/i;

function UniversalLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Which tab is active: 'personnel' | 'superadmin'
  // Supports being deep-linked to a specific tab via ?tab=superadmin
  const initialTab = searchParams.get('tab') === 'superadmin' ? 'superadmin' : 'personnel';
  const [universalLoginActiveTab, setUniversalLoginActiveTab] = useState(initialTab);

  // Tracks whether either child form is on its OTP screen
  const [isShowingOtp, setIsShowingOtp] = useState(false);

  function handleUniversalLoginTabSwitch(tab) {
    if (tab === universalLoginActiveTab) return;
    setIsShowingOtp(false);
    setUniversalLoginActiveTab(tab);
  }

  return (
    <div>
      <div className="universal-login-page">
        <div className="universal-login-glass-container">
          {/* LEFT PANEL — original large branding and logos preserved */}
          <div className="universal-login-left-panel">
            <div className="universal-login-agency universal-login-agency-top">
              <img src={FDALogo} alt="FDA AGENCY LOGO" className="universal-login-fda-logo" />
              <div>
                <p>REPUBLIC OF THE PHILIPPINES</p>
                <h3>FOOD AND DRUGS ADMINISTRATION</h3>
              </div>
            </div>

            <div className="universal-login-hero">
              <h1>WELCOME! <br /></h1>
              <h4>
                This is Interagency <span>Complaint Management </span> <br />
                System Desktop Application (<span>ICMDA</span>)
              </h4>
            </div>

            <div className="universal-login-agency universal-login-agency-bottom">
              <img src={PNPLogo} alt="PNP-CIDG AGENCY LOGO" />
              <div>
                <p>REPUBLIC OF THE PHILIPPINES</p>
                <h3>CRIMINAL INVESTIGATION AND DETECTION GROUP</h3>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE — compact white card with role toggle at top */}
          <div className="universal-login-right-wrapper">
            <div className="universal-login-right-panel" style={isShowingOtp ? { justifyContent: 'center' } : undefined}>
              {/* TOP GLASS SEGMENTED ROLE TOGGLE — hidden while on OTP screen */}
              {!isShowingOtp && (
                <div className="universal-login-tabs-container">
                  <button
                    type="button"
                    className={`universal-login-tab-btn ${universalLoginActiveTab === 'personnel' ? 'active' : ''}`}
                    onClick={() => handleUniversalLoginTabSwitch('personnel')}
                  >
                    <Users size={15} />
                    <span>Personnel</span>
                  </button>
                  <button
                    type="button"
                    className={`universal-login-tab-btn ${universalLoginActiveTab === 'superadmin' ? 'active' : ''}`}
                    onClick={() => handleUniversalLoginTabSwitch('superadmin')}
                  >
                    <ShieldCheck size={15} />
                    <span>Super Admin</span>
                  </button>
                </div>
              )}

              {universalLoginActiveTab === 'personnel' ? (
                <PersonnelLoginForm navigate={navigate} onOtpStateChange={setIsShowingOtp} />
              ) : (
                <SuperAdminLoginForm navigate={navigate} onOtpStateChange={setIsShowingOtp} />
              )}
            </div>
          </div>
        </div>
      </div>


      <style>{`
        * { padding: 0; margin: 0; box-sizing: border-box; }
        body { font-family: 'Poppins', sans-serif; }

        /* ===== LARGE OUTER GLASS CONTAINER (RESTORED TO PREVIOUS FULL SIZE) ===== */
        .universal-login-page {
          background-color: #1D3439;
          width: 100vw;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 24px;
          color: #fdfdfd;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        .universal-login-glass-container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: stretch;
          width: min(88vw, 1280px);
          min-height: 560px;
          background: rgba(253, 253, 253, 0.07);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          padding: 48px 56px;
          gap: 36px;
          box-sizing: border-box;
        }

        /* ===== LEFT BRANDING PANEL & LOGOS (RESTORED TO PREVIOUS SIZES) ===== */
        .universal-login-left-panel {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0;
          gap: 24px;
        }

        .universal-login-agency {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-direction: row;
        }
        .universal-login-agency img {
          width: 56px;
          height: 56px;
          object-fit: contain;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.95);
          padding: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          flex-shrink: 0;
        }
        .universal-login-agency-top img,
        .universal-login-fda-logo {
          width: 60px;
          height: 60px;
        }
        .universal-login-agency h3 {
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          line-height: 1.3;
          margin: 0;
        }
        .universal-login-agency p {
          color: rgba(255, 255, 255, 0.75);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .universal-login-hero {
          margin: 16px 0;
          text-align: left;
        }
        .universal-login-hero h1 {
          font-size: clamp(1.5rem, 2.5vw, 2.9rem);
          line-height: 1.15;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.5px;
        }
        .universal-login-hero span {
          color: #f7931a;
          font-weight: 600;
        }
        .universal-login-hero h4 {
          font-size: 1.45rem;
          color: rgba(255, 255, 255, 0.82);
          font-weight: 600;
          margin-top: 12px;
        }

        /* ===== RIGHT WRAPPER & GLASS SEGMENTED ROLE TOGGLE ===== */
        .universal-login-right-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 1;
          min-width: 0;
          align-self: center;
        }

        .universal-login-tabs-container {
          display: flex;
          width: 100%;
          background: rgba(29, 52, 57, 0.07);
          border: 1px solid rgba(29, 52, 57, 0.12);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 10px;
          padding: 4px;
          gap: 4px;
          margin-bottom: 16px;
          box-sizing: border-box;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
          height: 44px;
          flex-shrink: 0;
        }

        .universal-login-tab-btn {
          flex: 1;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 12px;
          height: 100%;
          border-radius: 7px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          font-size: 12.5px;
          font-weight: 600;
          font-family: inherit;
          letter-spacing: 0.2px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          box-sizing: border-box;
        }

        .universal-login-tab-btn:hover:not(.active) {
          background: rgba(29, 52, 57, 0.04);
          color: #1e293b;
          border-color: rgba(29, 52, 57, 0.06);
        }

        .universal-login-tab-btn.active {
          background: #ffffff;
          color: #1D3439;
          font-weight: 700;
          border-color: rgba(0, 0, 0, 0.06);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .universal-login-tab-btn.active svg { color: #1D3439; }

        /* ===== SMALLER COMPACT WHITE LOGIN CARD ===== */
        .universal-login-right-panel {
          width: 440px;
          max-width: 100%;
          min-height: 520px;
          height: auto;
          background: #ffffff;
          padding: 24px 28px;
          border-radius: 16px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          flex-shrink: 0;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          position: relative;
          z-index: 1;
        }

        /* ===== COMMON CARD HEADER STYLES ===== */
        .universal-login-card-header {
          margin-bottom: 20px;
        }
        .universal-login-card-header h2 {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 2px;
          letter-spacing: -0.3px;
        }
        .universal-login-card-header small {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 2px;
        }
        .universal-login-card-header p {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 16px;
        }

        .universal-login-otp-header {
          text-align: center;
          margin-bottom: 6px;
        }
        .universal-login-otp-header h2, .universal-login-otp-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.2px;
          margin-bottom: 3px;
        }
        .universal-login-otp-header small {
          display: block;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 3px;
        }
        .universal-login-otp-header p {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 16px;
        }

        /* ===== FORM CONTROLS ===== */
        .universal-login-personnel-form,
        .universal-login-admin-form {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .universal-login-form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 12px;
        }

        .universal-login-form-group label,
        .universal-login-personnel-form label,
        .universal-login-admin-form label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 5px;
        }

        .universal-login-form-group span.required-star,
        .universal-login-personnel-form span.required-star,
        .universal-login-admin-form span.required-star {
          color: #ef4444;
        }

        .universal-login-agency-buttons {
          display: flex;
          gap: 8px;
          margin-top: 0;
          margin-bottom: 0;
          flex-direction: row;
          justify-content: center;
        }
        .universal-login-agency-buttons input[type="radio"] { display: none; }
        .universal-login-inter-buttons {
          flex: 1;
          padding: 7px 10px;
          border: 1.5px solid #e2e8f0;
          border-radius: 7px;
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 600;
          transition: all 0.2s ease;
          text-align: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          color: #334155;
          margin: 0 !important;
        }
        .universal-login-agency-btn-fda:hover { border-color: #1b4322; background: #1b4322; color: #fdfdfd; }
        .universal-login-agency-btn-cidg:hover { background: #1f2937; border-color: #1f2937; color: #fdfdfd; }
        input[type="radio"]#universal-login-fda:checked + label {
          border-color: #2d6c39; background: #2d6c39; color: #fff;
          box-shadow: 0 3px 10px rgba(45, 108, 57, 0.25); transform: translateY(-1px);
        }
        input[type="radio"]#universal-login-cidg:checked + label {
          border-color: #1f2937; background: #1f2937; color: #fff;
          box-shadow: 0 3px 10px rgba(31, 41, 55, 0.25); transform: translateY(-1px);
        }

        .universal-login-input-wrapper,
        .universal-login-admin-input-wrapper,
        .universal-login-password-wrapper,
        .universal-login-admin-password-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .universal-login-input-wrapper input,
        .universal-login-admin-input-wrapper input {
          width: 100%;
          padding: 9px 12px 9px 36px !important;
          margin-bottom: 0 !important;
          border: 1.5px solid #cbd5e1;
          border-radius: 7px;
          font-size: 13px;
          background: #ffffff;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
        }
        .universal-login-input-wrapper input:focus,
        .universal-login-admin-input-wrapper input:focus {
          border-color: #f7931a;
          box-shadow: 0 0 0 3px rgba(247, 147, 26, 0.15);
        }

        .universal-login-password-wrapper input,
        .universal-login-admin-password-wrapper input {
          width: 100%;
          padding: 9px 38px 9px 36px !important;
          margin-bottom: 0 !important;
          border: 1.5px solid #cbd5e1;
          border-radius: 7px;
          font-size: 13px;
          background: #ffffff;
          color: #0f172a;
          outline: none;
          transition: all 0.2s ease;
        }
        .universal-login-password-wrapper input:focus,
        .universal-login-admin-password-wrapper input:focus {
          border-color: #f7931a;
          box-shadow: 0 0 0 3px rgba(247, 147, 26, 0.15);
        }

        .universal-login-input-icon,
        .universal-login-admin-input-icon {
          position: absolute;
          left: 11px;
          color: #94a3b8;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .universal-login-toggle-password-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }
        .universal-login-toggle-password-btn:hover { color: #ef4444; }

        /* FIELD VALIDATION ERROR MESSAGES */
        .universal-login-field-error {
          font-size: 11.5px;
          color: #ef4444 !important;
          margin-top: 5px !important;
          margin-bottom: 1px !important;
          display: flex;
          align-items: center;
          gap: 4px;
          line-height: 1.2;
          font-weight: 500;
        }

        /* REMEMBER ME & FORGOT PASSWORD ROWS */
        .universal-login-remember-me,
        .universal-login-admin-remember-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
          margin-bottom: 14px;
        }
        .universal-login-remember-me label,
        .universal-login-admin-remember-row label {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px;
          margin: 0 !important;
          font-size: 12px;
          color: #475569;
          cursor: pointer;
        }
        .universal-login-remember-me input[type="checkbox"],
        .universal-login-admin-remember-row input[type="checkbox"] {
          width: 14px !important;
          height: 14px !important;
          margin: 0 !important;
          cursor: pointer;
          accent-color: #1D3439;
        }

        .universal-login-forget-pass,
        .universal-login-forgot-password-link {
          color: #dc2626;
          font-size: 12px;
          font-weight: 500;
          text-align: right;
          margin: 0 !important;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.15s ease;
        }
        .universal-login-forget-pass a,
        .universal-login-forgot-password-link {
          color: #dc2626;
          text-decoration: none;
        }
        .universal-login-forget-pass:hover,
        .universal-login-forget-pass a:hover,
        .universal-login-forgot-password-link:hover {
          color: #b91c1c;
          text-decoration: underline;
        }

        /* BANNER ERROR CONTAINER */
        .universal-login-error-msg-container,
        .universal-login-admin-error-container {
          background-color: #fef2f2;
          border: 1px solid #fca5a5;
          padding: 7px 10px;
          border-radius: 7px;
          margin-top: 0;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .universal-login-error-msg,
        .universal-login-admin-error-msg {
          color: #dc2626 !important;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          margin: 0 !important;
        }

        /* UNIFIED SUBMIT BUTTON */
        .universal-login-submit-btn {
          width: 100%;
          margin-top: 25px;
          padding: 10px 14px;
          background: #1D3439;
          color: #ffffff;
          font-size: 14px;
          font-weight: 600;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 3px 10px rgba(30, 41, 59, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: inherit;
        }
        .universal-login-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(15, 23, 42, 0.3);
          background: #244249;
        }
        .universal-login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .universal-login-submit-btn:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
          opacity: 0.75;
        }

        /* OTP CONTAINER & CONTROLS */
        .universal-login-otp-container {
          display: flex;
          flex-direction: column;
          animation: universalLoginFadeIn 0.35s ease-out forwards;
        }
        .universal-login-otp-instructions {
          font-size: 12px;
          color: #475569;
          margin-bottom: 14px;
          line-height: 1.45;
          text-align: center;
        }
        .universal-login-otp-instructions span { font-weight: 600; color: #0f172a; }
        .universal-login-otp-input-grid,
        .universal-login-admin-otp-grid {
          display: flex;
          gap: 6px;
          justify-content: center;
          margin-bottom: 12px;
        }
        .universal-login-otp-digit-input,
        .universal-login-admin-otp-digit-input {
          width: 40px;
          height: 44px;
          text-align: center;
          font-size: 18px;
          font-weight: 700;
          border-radius: 7px;
          border: 1.5px solid #cbd5e1 !important;
          background-color: #ffffff;
          color: #0f172a;
          transition: all 0.2s ease;
          margin-bottom: 0 !important;
          padding: 0 !important;
        }
        .universal-login-otp-digit-input:focus,
        .universal-login-admin-otp-digit-input:focus {
          border-color: #f7931a !important;
          box-shadow: 0 0 0 3px rgba(247, 147, 26, 0.2);
          outline: none;
        }
        .universal-login-otp-timer-container,
        .universal-login-admin-otp-timer-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          margin-bottom: 10px;
          font-size: 12px;
          color: #64748b;
          text-align: center;
        }
        .universal-login-otp-timer-container strong,
        .universal-login-admin-otp-timer-container strong {
          color: #1D3439;
          font-weight: 700;
        }
        .universal-login-resend-button,
        .universal-login-admin-resend-button {
          background: none;
          border: none;
          color: #f7931a;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
        }
        .universal-login-resend-button:disabled,
        .universal-login-admin-resend-button:disabled {
          color: #94a3b8;
          cursor: not-allowed;
          text-decoration: none;
        }
        .universal-login-back-btn,
        .universal-login-admin-back-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 8px;
          text-decoration: underline;
        }
        .universal-login-back-btn:hover,
        .universal-login-admin-back-btn:hover {
          color: #0f172a;
        }

        @keyframes universalLoginFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

        /* ===== RESPONSIVENESS ===== */
        @media (max-width: 1023px) {
          .universal-login-glass-container {
            flex-direction: column;
            width: min(92vw, 640px);
            min-height: auto;
            padding: 36px 28px;
            gap: 32px;
            align-items: center;
          }
          .universal-login-left-panel {
            width: 100%;
            align-items: center;
            text-align: center;
            gap: 24px;
            padding: 0;
          }
          .universal-login-hero { margin: 12px 0; text-align: center; }
          .universal-login-agency { justify-content: center; text-align: left; }
          .universal-login-hero h1 { font-size: 2.1rem; }
          .universal-login-right-wrapper {
            width: 100%;
            max-width: 440px;
            margin-left: 0;
            align-items: center;
            justify-content: center;
          }
          .universal-login-right-panel {
            width: 100%;
            max-width: 100%;
            min-height: 480px;
            height: auto;
            max-height: none;
            padding: 22px 20px;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
        }

        @media (max-width: 767px) {
          .universal-login-page { padding: 20px 12px; justify-content: flex-start; }
          .universal-login-glass-container { width: 95vw; padding: 24px 18px; border-radius: 14px; gap: 24px; }
          .universal-login-hero h1 { font-size: 1.55rem; }
          .universal-login-hero h4 { font-size: 0.95rem; }
          .universal-login-agency img,
          .universal-login-agency-top img,
          .universal-login-fda-logo { width: 46px; height: 46px; }
          .universal-login-agency h3 { font-size: 0.85rem; }
          .universal-login-right-panel {
            padding: 18px 14px;
            border-radius: 14px;
            min-height: auto;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }
          .universal-login-tabs-container {
            margin-bottom: 14px;
            padding: 3px;
            border-radius: 8px;
            height: 40px;
            flex-shrink: 0;
          }
          .universal-login-tab-btn {
            padding: 0 8px;
            height: 100%;
            font-size: 12px;
            gap: 5px;
            border-radius: 6px;
          }
          .universal-login-card-header h2 { font-size: 18px; }
          .universal-login-agency-buttons { gap: 6px; }
          .universal-login-inter-buttons { padding: 6px 5px; font-size: 11.5px; }
          .universal-login-otp-input-grid, .universal-login-admin-otp-grid { gap: 5px; }
          .universal-login-otp-digit-input, .universal-login-admin-otp-digit-input { width: 36px; height: 40px; font-size: 16px; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// PERSONNEL LOGIN FORM
// Supports both mock frontend testing and real API fallback
// ============================================================================
function PersonnelLoginForm({ navigate, onOtpStateChange }) {
  const [personnelAgency, setPersonnelAgency] = useState('');
  const [personnelEmail, setPersonnelEmail] = useState('');
  const [personnelPassword, setPersonnelPassword] = useState('');
  const [personnelShowPassword, setPersonnelShowPassword] = useState(false);
  const [personnelLoginError, setPersonnelLoginError] = useState('');
  const [personnelRememberMe, setPersonnelRememberMe] = useState(false);
  const [personnelErrors, setPersonnelErrors] = useState({});


  function rememberedEmailKey(forAgency) {
    return forAgency ? `remembered_email_user_${forAgency}` : null;
  }

  useEffect(() => {
    const key = rememberedEmailKey(personnelAgency);
    if (!key) return;
    const savedEmail = localStorage.getItem(key);
    if (savedEmail) {
      setPersonnelEmail(savedEmail);
      setPersonnelRememberMe(true);
    } else {
      setPersonnelEmail('');
      setPersonnelRememberMe(false);
    }
  }, [personnelAgency]);

  const [personnelIsOtpSent, setPersonnelIsOtpSent] = useState(false);
  const [personnelOtp, setPersonnelOtp] = useState(new Array(6).fill(''));
  const [personnelTimer, setPersonnelTimer] = useState(300);
  const personnelOtpRefs = useRef([]);

  // Notify parent when OTP screen visibility changes
  useEffect(() => {
    if (onOtpStateChange) onOtpStateChange(personnelIsOtpSent);
  }, [personnelIsOtpSent]);

  useEffect(() => {
    let interval;
    if (personnelIsOtpSent && personnelTimer > 0) {
      interval = setInterval(() => setPersonnelTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [personnelIsOtpSent, personnelTimer]);

  function handlePersonnelOtpChange(element, index) {
    let val = element.value;
    if (!/^\d*$/.test(val)) return;
    val = val.substring(val.length - 1);
    const newOtp = [...personnelOtp];
    newOtp[index] = val;
    setPersonnelOtp(newOtp);
    if (val && index < 5) personnelOtpRefs.current[index + 1].focus();
  }

  function handlePersonnelOtpKeyDown(e, index) {
    if (e.key === 'Backspace') {
      if (!personnelOtp[index] && index > 0) {
        const newOtp = [...personnelOtp];
        newOtp[index - 1] = '';
        setPersonnelOtp(newOtp);
        personnelOtpRefs.current[index - 1].focus();
      } else {
        const newOtp = [...personnelOtp];
        newOtp[index] = '';
        setPersonnelOtp(newOtp);
      }
    }
  }

  function handlePersonnelOtpPaste(e) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().substring(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newOtp = [...personnelOtp];
      for (let i = 0; i < 6; i++) newOtp[i] = digits[i] || '';
      setPersonnelOtp(newOtp);
      const targetFocusIndex = Math.min(digits.length, 5);
      personnelOtpRefs.current[targetFocusIndex]?.focus();
    }
  }

  async function handlePersonnelResendOtp() {
    setPersonnelLoginError('');


    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: personnelEmail.trim(), password: personnelPassword, agency: personnelAgency }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to resend code.');
      }

      setPersonnelTimer(300);
      setPersonnelOtp(new Array(6).fill(''));
      setTimeout(() => personnelOtpRefs.current[0]?.focus(), 0);
    } catch (err) {
      setPersonnelLoginError(err.message);
    }
  }

  function handlePersonnelBackToLogin() {
    setPersonnelIsOtpSent(false);
    setPersonnelOtp(new Array(6).fill(''));
    setPersonnelLoginError('');
  }

  const formatPersonnelTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function maskPersonnelEmail(rawEmail) {
    if (!rawEmail || !rawEmail.includes('@')) return rawEmail;
    const [localPart, domain] = rawEmail.split('@');
    const visibleChars = Math.min(2, localPart.length);
    const maskedLocal = localPart.slice(0, visibleChars) + '*'.repeat(Math.max(localPart.length - visibleChars, 3));
    return `${maskedLocal}@${domain}`;
  }

  function handlePersonnelEmailChange(e) {
    const val = e.target.value;
    setPersonnelEmail(val);
    if (!val.trim()) {
      setPersonnelErrors((prev) => ({ ...prev, email: '' }));
    } else if (!EMAIL_REGEX.test(val.trim())) {
      setPersonnelErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
    } else {
      setPersonnelErrors((prev) => ({ ...prev, email: '' }));
    }
  }

  function handlePersonnelPasswordChange(e) {
    setPersonnelPassword(e.target.value);
    if (personnelErrors.password) setPersonnelErrors((prev) => ({ ...prev, password: '' }));
  }

  function handlePersonnelAgencyChange(value) {
    setPersonnelAgency(value);
    if (personnelErrors.agency) setPersonnelErrors((prev) => ({ ...prev, agency: '' }));
  }

  async function handlePersonnelLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!personnelIsOtpSent) {
      const newErrors = {};

      if (!personnelAgency) {
        newErrors.agency = 'Please select an agency.';
      }

      if (!personnelEmail.trim()) {
        newErrors.email = 'Email is required.';
      } else if (!EMAIL_REGEX.test(personnelEmail.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }

      if (!personnelPassword.trim()) {
        newErrors.password = 'Password is required.';
      }

      if (Object.keys(newErrors).length > 0) {
        setPersonnelErrors(newErrors);
        return;
      }
      setPersonnelErrors({});

      const cleanEmail = personnelEmail.trim().toLowerCase();


      // REAL BACKEND LOGIN API CALL
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: personnelEmail.trim(), password: personnelPassword, agency: personnelAgency }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Invalid email or password.');
        }

        const key = rememberedEmailKey(personnelAgency);
        if (key) {
          if (personnelRememberMe) localStorage.setItem(key, personnelEmail.trim());
          else localStorage.removeItem(key);
        }


        setPersonnelIsOtpSent(true);
        setPersonnelTimer(300);
        setPersonnelLoginError('');
      } catch (err) {
        setPersonnelLoginError(err.message || 'Something went wrong. Please try again.');
      }
    } else {
      // OTP VERIFICATION STEP
      const otpCode = personnelOtp.join('');
      if (otpCode.length < 6) {
        setPersonnelLoginError('Please enter the full 6-digit verification code.');
        return;
      }



      // REAL BACKEND OTP VERIFICATION
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: personnelEmail.trim(), otp: otpCode }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Invalid verification code. Please try again.');
        }

        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('agency', personnelAgency);

        if (data.force_password_change) {
          navigate('/change-password');
        } else if (personnelAgency === 'fda') {
          navigate('/fdafolder/fda-dashboard');
        } else {
          navigate('/leacidgfolder/lea-dashboard');
        }
      } catch (err) {
        setPersonnelLoginError(err.message || 'Invalid verification code. Please try again.');
        setPersonnelOtp(new Array(6).fill(''));
        setTimeout(() => personnelOtpRefs.current[0]?.focus(), 0);
        if (/request a new otp/i.test(err.message)) {
          setPersonnelTimer(0);
        }
      }
    }
  }

  return (
    <div className="universal-login-personnel-form">
      {!personnelIsOtpSent ? (
        <form noValidate onSubmit={handlePersonnelLoginSubmit}>
          <div className="universal-login-card-header">
            <small>AUTHORIZED LOGIN</small>
            <h2>Please log in to continue</h2>
            <p>Select your agency and enter your credentials.</p>
          </div>

          <div className="universal-login-form-group">
            <label htmlFor="universal-login-personnel-agency">
              Agency <span className="required-star">*</span>
            </label>
            <div className="universal-login-agency-buttons" id="universal-login-personnel-agency">
              <input
                type="radio"
                id="universal-login-fda"
                name="universal-login-personnel-agency-radio"
                value="fda"
                onChange={() => handlePersonnelAgencyChange('fda')}
                checked={personnelAgency === 'fda'}
              />
              <label htmlFor="universal-login-fda" className="universal-login-inter-buttons universal-login-agency-btn-fda">FDA</label>

              <input
                type="radio"
                id="universal-login-cidg"
                name="universal-login-personnel-agency-radio"
                value="lea"
                onChange={() => handlePersonnelAgencyChange('lea')}
                checked={personnelAgency === 'lea'}
              />
              <label htmlFor="universal-login-cidg" className="universal-login-inter-buttons universal-login-agency-btn-cidg">LEA-CIDG</label>
            </div>
            {personnelErrors.agency && (
              <span className="universal-login-field-error">
                <AlertCircle size={11} /> {personnelErrors.agency}
              </span>
            )}
          </div>

          <div className="universal-login-form-group">
            <label htmlFor="universal-login-personnel-email">
              Email <span className="required-star">*</span>
            </label>
            <div className="universal-login-input-wrapper">
              <Mail className="universal-login-input-icon" size={15} />
              <input
                type="email"
                id="universal-login-personnel-email"
                placeholder="you@example.com"
                value={personnelEmail}
                onChange={handlePersonnelEmailChange}
                required
              />
            </div>
            {personnelErrors.email && (
              <span className="universal-login-field-error">
                <AlertCircle size={11} /> {personnelErrors.email}
              </span>
            )}
          </div>

          <div className="universal-login-form-group">
            <label htmlFor="universal-login-personnel-password">
              Password <span className="required-star">*</span>
            </label>
            <div className="universal-login-password-wrapper">
              <Lock className="universal-login-input-icon" size={15} />
              <input
                type={personnelShowPassword ? 'text' : 'password'}
                id="universal-login-personnel-password"
                placeholder="Enter your password"
                value={personnelPassword}
                onChange={handlePersonnelPasswordChange}
                required
              />
              <button
                type="button"
                className="universal-login-toggle-password-btn"
                onClick={() => setPersonnelShowPassword(!personnelShowPassword)}
                aria-label={personnelShowPassword ? "Hide password" : "Show password"}
              >
                {personnelShowPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {personnelErrors.password && (
              <span className="universal-login-field-error">
                <AlertCircle size={11} /> {personnelErrors.password}
              </span>
            )}
          </div>

          <div className="universal-login-remember-me">
            <label htmlFor="universal-login-personnel-remember-me">
              <input
                type="checkbox"
                id="universal-login-personnel-remember-me"
                checked={personnelRememberMe}
                onChange={(e) => setPersonnelRememberMe(e.target.checked)}
              />
              Remember my email
            </label>
            <a
              onClick={() => navigate('/forgot-password?from=interagency')}
              className="universal-login-forget-pass"
            >
              Forgot password?
            </a>
          </div>

          {personnelLoginError && (
            <div className="universal-login-error-msg-container">
              <p className="universal-login-error-msg">{personnelLoginError}</p>
            </div>
          )}

          <button type="submit" className="universal-login-submit-btn">
            Login
          </button>
        </form>
      ) : (
        <form noValidate onSubmit={handlePersonnelLoginSubmit}>
          <div className="universal-login-otp-header">
            <small>SECURITY VERIFICATION</small>
            <h2>Enter Security Code</h2>
            <p>We've sent a 6-digit verification code to your email.</p>
          </div>

          <div className="universal-login-otp-container">
            <div className="universal-login-otp-instructions">
              Enter the code sent to <span>{maskPersonnelEmail(personnelEmail)}</span>
            </div>

            <div className="universal-login-otp-input-grid">
              {personnelOtp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`universal-login-personnel-otp-digit-${idx}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="universal-login-otp-digit-input"
                  value={digit}
                  ref={(el) => (personnelOtpRefs.current[idx] = el)}
                  onChange={(e) => handlePersonnelOtpChange(e.target, idx)}
                  onKeyDown={(e) => handlePersonnelOtpKeyDown(e, idx)}
                  onPaste={handlePersonnelOtpPaste}
                  required
                />
              ))}
            </div>

            <div className="universal-login-otp-timer-container">
              {personnelTimer > 0 ? (
                <p>Resend code in <strong>{formatPersonnelTimer(personnelTimer)}</strong></p>
              ) : (
                <p>
                  Didn't receive the code?{' '}
                  <button type="button" className="universal-login-resend-button" onClick={handlePersonnelResendOtp}>
                    Resend OTP
                  </button>
                </p>
              )}
            </div>

            {personnelLoginError && (
              <div className="universal-login-error-msg-container">
                <p className="universal-login-error-msg">{personnelLoginError}</p>
              </div>
            )}

            <button type="submit" className="universal-login-submit-btn">
              Verify &amp; Login
            </button>
            <button type="button" className="universal-login-back-btn" onClick={handlePersonnelBackToLogin}>
              ← Back to login credentials
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ============================================================================
// SUPER ADMIN LOGIN FORM
// Supports both mock frontend testing and real API fallback
// ============================================================================
function SuperAdminLoginForm({ navigate, onOtpStateChange }) {
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminShowPassword, setAdminShowPassword] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminRememberMe, setAdminRememberMe] = useState(false);
  const [adminErrors, setAdminErrors] = useState({});

  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const REMEMBERED_EMAIL_KEY = 'remembered_email_superadmin';

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) {
      setAdminEmail(savedEmail);
      setAdminRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setAdminLoginError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const [adminIsOtpSent, setAdminIsOtpSent] = useState(false);
  const [adminOtp, setAdminOtp] = useState(new Array(6).fill(''));
  const [adminTimer, setAdminTimer] = useState(300);
  const adminOtpRefs = useRef([]);

  // Notify parent when OTP screen visibility changes
  useEffect(() => {
    if (onOtpStateChange) onOtpStateChange(adminIsOtpSent);
  }, [adminIsOtpSent]);

  useEffect(() => {
    let interval;
    if (adminIsOtpSent && adminTimer > 0) {
      interval = setInterval(() => setAdminTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [adminIsOtpSent, adminTimer]);

  function handleAdminOtpChange(element, index) {
    let val = element.value;
    if (!/^\d*$/.test(val)) return;
    val = val.substring(val.length - 1);
    const newOtp = [...adminOtp];
    newOtp[index] = val;
    setAdminOtp(newOtp);
    if (val && index < 5) adminOtpRefs.current[index + 1].focus();
  }

  function handleAdminOtpKeyDown(e, index) {
    if (e.key === 'Backspace') {
      if (!adminOtp[index] && index > 0) {
        const newOtp = [...adminOtp];
        newOtp[index - 1] = '';
        setAdminOtp(newOtp);
        adminOtpRefs.current[index - 1].focus();
      } else {
        const newOtp = [...adminOtp];
        newOtp[index] = '';
        setAdminOtp(newOtp);
      }
    }
  }

  function handleAdminOtpPaste(e) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().substring(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newOtp = [...adminOtp];
      for (let i = 0; i < 6; i++) newOtp[i] = digits[i] || '';
      setAdminOtp(newOtp);
      const targetFocusIndex = Math.min(digits.length, 5);
      adminOtpRefs.current[targetFocusIndex]?.focus();
    }
  }

  async function handleAdminResendOtp() {
    setAdminLoginError('');


    try {
      const response = await fetch(`${API_BASE_URL}/auth/superadmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.detail && typeof errorData.detail === 'object') {
          setLockoutSeconds(errorData.detail.retry_after_seconds || 0);
          throw new Error(errorData.detail.message || 'Failed to resend code.');
        }
        throw new Error(errorData.detail || 'Failed to resend code.');
      }

      setAdminTimer(300);
      setAdminOtp(new Array(6).fill(''));
      setTimeout(() => adminOtpRefs.current[0]?.focus(), 0);
    } catch (err) {
      setAdminLoginError(err.message);
    }
  }

  function handleAdminBackToLogin() {
    setAdminIsOtpSent(false);
    setAdminOtp(new Array(6).fill(''));
    setAdminLoginError('');
    setLockoutSeconds(0);
  }

  function maskAdminEmail(rawEmail) {
    if (!rawEmail || !rawEmail.includes('@')) return rawEmail;
    const [localPart, domain] = rawEmail.split('@');
    const visibleChars = Math.min(2, localPart.length);
    const maskedLocal = localPart.slice(0, visibleChars) + '*'.repeat(Math.max(localPart.length - visibleChars, 3));
    return `${maskedLocal}@${domain}`;
  }

  function handleAdminEmailChange(e) {
    const val = e.target.value;
    setAdminEmail(val);
    if (!val.trim()) {
      setAdminErrors((prev) => ({ ...prev, email: '' }));
    } else if (!EMAIL_REGEX.test(val.trim())) {
      setAdminErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
    } else {
      setAdminErrors((prev) => ({ ...prev, email: '' }));
    }
  }

  function handleAdminPasswordChange(e) {
    setAdminPassword(e.target.value);
    if (adminErrors.password) setAdminErrors((prev) => ({ ...prev, password: '' }));
  }

  async function handleAdminLoginSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!adminIsOtpSent) {
      const newErrors = {};

      if (!adminEmail.trim()) {
        newErrors.email = 'Email is required.';
      } else if (!EMAIL_REGEX.test(adminEmail.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }

      if (!adminPassword.trim()) {
        newErrors.password = 'Password is required.';
      }

      if (Object.keys(newErrors).length > 0) {
        setAdminErrors(newErrors);
        return;
      }
      setAdminErrors({});

      const cleanEmail = adminEmail.trim().toLowerCase();
     
      // REAL BACKEND SUPERADMIN LOGIN API CALL
      try {
        const response = await fetch(`${API_BASE_URL}/auth/superadmin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.detail && typeof errorData.detail === 'object') {
            setLockoutSeconds(errorData.detail.retry_after_seconds || 0);
            throw new Error(errorData.detail.message || 'Too many failed attempts.');
          }
          setLockoutSeconds(0);
          throw new Error(errorData.detail || 'Invalid email or password.');
        }

        if (adminRememberMe) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, adminEmail.trim());
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }


        setAdminIsOtpSent(true);
        setAdminTimer(300);
        setAdminLoginError('');
        setLockoutSeconds(0);
      } catch (err) {
        setAdminLoginError(err.message || 'Something went wrong. Please try again.');
      }
    } else {
      // OTP VERIFICATION STEP
      const otpCode = adminOtp.join('');
      if (otpCode.length < 6) {
        setAdminLoginError('Please enter the full 6-digit verification code.');
        return;
      }



      // REAL BACKEND OTP VERIFICATION
      try {
        const response = await fetch(`${API_BASE_URL}/auth/superadmin/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: adminEmail.trim(), otp: otpCode }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.detail && typeof errorData.detail === 'object') {
            setLockoutSeconds(errorData.detail.retry_after_seconds || 0);
            throw new Error(errorData.detail.message || 'Too many failed attempts.');
          }
          throw new Error(errorData.detail || 'Invalid verification code. Please try again.');
        }

        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('agency', 'superadmin');
        navigate('/superadminfolder/superadmin-user-management');
      } catch (err) {
        setAdminLoginError(err.message || 'Invalid verification code. Please try again.');
        setAdminOtp(new Array(6).fill(''));
        setTimeout(() => adminOtpRefs.current[0]?.focus(), 0);
        if (/request a new otp/i.test(err.message)) {
          setAdminTimer(0);
        }
      }
    }
  }

  const formatAdminTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const displayedError = lockoutSeconds > 0
    ? `Too many failed attempts. Try again in ${lockoutSeconds} second${lockoutSeconds === 1 ? '' : 's'}.`
    : adminLoginError;

  return (
    <div className="universal-login-admin-form">
      {!adminIsOtpSent ? (
        <form noValidate onSubmit={handleAdminLoginSubmit}>
          <div className="universal-login-card-header">
            <small>AUTHORIZED LOGIN</small>
            <h2>Super Admin Login</h2>
            <p>Enter your administrator credentials to continue.</p>
          </div>

          <div className="universal-login-form-group">
            <label htmlFor="universal-login-admin-email">
              Email <span className="required-star">*</span>
            </label>
            <div className="universal-login-admin-input-wrapper">
              <Mail className="universal-login-admin-input-icon" size={15} />
              <input
                id="universal-login-admin-email"
                type="email"
                placeholder="you@example.com"
                value={adminEmail}
                onChange={handleAdminEmailChange}
                required
              />
            </div>
            {adminErrors.email && (
              <span className="universal-login-field-error">
                <AlertCircle size={11} /> {adminErrors.email}
              </span>
            )}
          </div>

          <div className="universal-login-form-group">
            <label htmlFor="universal-login-admin-password">
              Password <span className="required-star">*</span>
            </label>
            <div className="universal-login-admin-password-wrapper">
              <Lock className="universal-login-input-icon" size={15} />
              <input
                id="universal-login-admin-password"
                type={adminShowPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={adminPassword}
                onChange={handleAdminPasswordChange}
                required
              />
              <button
                type="button"
                className="universal-login-toggle-password-btn"
                onClick={() => setAdminShowPassword(v => !v)}
                aria-label={adminShowPassword ? 'Hide password' : 'Show password'}
              >
                {adminShowPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {adminErrors.password && (
              <span className="universal-login-field-error">
                <AlertCircle size={11} /> {adminErrors.password}
              </span>
            )}
          </div>

          <div className="universal-login-admin-remember-row">
            <label htmlFor="universal-login-admin-remember-me">
              <input
                type="checkbox"
                id="universal-login-admin-remember-me"
                checked={adminRememberMe}
                onChange={(e) => setAdminRememberMe(e.target.checked)}
              />
              Remember my email
            </label>
            <a
              onClick={() => navigate('/forgot-password?from=superadmin')}
              className="universal-login-forgot-password-link"
            >
              Forgot password?
            </a>
          </div>

          {displayedError && (
            <div className="universal-login-admin-error-container">
              <p className="universal-login-admin-error-msg">{displayedError}</p>
            </div>
          )}

          <button
            type="submit"
            className="universal-login-submit-btn"
            disabled={lockoutSeconds > 0}
          >
            Login
          </button>
        </form>
      ) : (
        <form noValidate onSubmit={handleAdminLoginSubmit}>
          <div className="universal-login-otp-header">
            <small>SECURITY VERIFICATION</small>
            <h2>Enter Security Code</h2>
            <p>We've sent a 6-digit verification code to your email.</p>
          </div>

          <div className="universal-login-otp-container">
            <div className="universal-login-otp-instructions">
              Enter the code sent to <span>{maskAdminEmail(adminEmail)}</span>
            </div>

            <div className="universal-login-admin-otp-grid">
              {adminOtp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`universal-login-admin-otp-digit-${idx}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="universal-login-admin-otp-digit-input"
                  value={digit}
                  ref={(el) => (adminOtpRefs.current[idx] = el)}
                  onChange={(e) => handleAdminOtpChange(e.target, idx)}
                  onKeyDown={(e) => handleAdminOtpKeyDown(e, idx)}
                  onPaste={handleAdminOtpPaste}
                  required
                />
              ))}
            </div>

            <div className="universal-login-admin-otp-timer-container">
              {adminTimer > 0 ? (
                <p>Resend code in <strong>{formatAdminTimer(adminTimer)}</strong></p>
              ) : (
                <p>
                  Didn't receive the code?{' '}
                  <button type="button" className="universal-login-admin-resend-button" onClick={handleAdminResendOtp}>
                    Resend OTP
                  </button>
                </p>
              )}
            </div>

            {displayedError && (
              <div className="universal-login-admin-error-container">
                <p className="universal-login-admin-error-msg">{displayedError}</p>
              </div>
            )}

            <button
              type="submit"
              className="universal-login-submit-btn"
              disabled={lockoutSeconds > 0}
            >
              Verify &amp; Login
            </button>
            <button type="button" className="universal-login-admin-back-btn" onClick={handleAdminBackToLogin}>
              ← Back to login credentials
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default UniversalLogin;