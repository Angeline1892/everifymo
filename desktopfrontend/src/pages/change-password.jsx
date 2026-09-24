// desktopfrontend/src/pages/change-password.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checks = {
    length:    form.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(form.newPassword),
    number:    /[0-9]/.test(form.newPassword),
    special:   /[^A-Za-z0-9]/.test(form.newPassword),
  };
  const allChecksPassed = Object.values(checks).every(Boolean);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setChangePasswordError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setChangePasswordError('');
    const newErrors = {};

    if (!form.currentPassword) {
      newErrors.currentPassword = 'Current password is required.';
    }
    if (!form.newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else if (!allChecksPassed) {
      newErrors.newPassword = 'Password does not meet all requirements.';
    }
    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password.';
    } else if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setChangePasswordError(Object.values(newErrors)[0]);
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch('/auth/password/change', {
        method: 'POST',
        body: JSON.stringify({
          current_password: form.currentPassword,
          new_password: form.newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to change password.');
      }

      setSubmitting(false);
      setSaved(true);
    } catch (err) {
      setSubmitting(false);
      setChangePasswordError(err.message);
    }
  }

  function handleContinue() {
    const agency = localStorage.getItem('agency');
    if (agency === 'fda') {
      navigate('/fdafolder/fda-dashboard');
    } else if (agency === 'lea') {
      navigate('/leacidgfolder/lea-dashboard');
    } else {
      navigate('/superadminfolder/superadmin-user-management');
    }
  }

  if (saved) {
    return (
      <>
        <style>{styles}</style>
        <div className="CPPageContainer">
          <div className="CPCard">
            <div className="CPSuccessScreen">
              <div className="CPSuccessIcon">🔐</div>
              <h2 className="CPSuccessTitle">Password Updated!</h2>
              <p className="CPSuccessDesc">
                Your new password has been saved successfully. You can now continue using the ICMDA
                desktop application.
              </p>
              <button className="CPSuccessBtn" onClick={handleContinue}>
                Continue to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="CPPageContainer">
        <div className="CPCard">
          <div className="CPCardHeader">
            <h1 className="CPCardTitle">Set Your New Password</h1>
            <p className="CPCardSubtitle">
              You are required to set a new password before continuing.
            </p>
          </div>

          <form className="CPForm" onSubmit={handleSubmit} noValidate>
            {/* Current Password */}
            <div className="CPFormGroup">
              <label className="CPLabel">
                Current (Temporary) Password <span className="CPRequired">*</span>
              </label>
              <div className="CPInputWrapper">
                <input
                  className={`CPInput ${errors.currentPassword ? 'cp-input-error' : ''}`}
                  type={showCurrent ? 'text' : 'password'}
                  name="currentPassword"
                  placeholder="Enter your current password"
                  value={form.currentPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="CPToggleBtn"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="CPFormGroup">
              <label className="CPLabel">
                New Password <span className="CPRequired">*</span>
              </label>
              <div className="CPInputWrapper">
                <input
                  className={`CPInput ${errors.newPassword ? 'cp-input-error' : ''}`}
                  type={showNew ? 'text' : 'password'}
                  name="newPassword"
                  placeholder="Enter new password"
                  value={form.newPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="CPToggleBtn"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="CPFormGroup">
              <label className="CPLabel">
                Confirm New Password <span className="CPRequired">*</span>
              </label>
              <div className="CPInputWrapper">
                <input
                  className={`CPInput ${errors.confirmPassword ? 'cp-input-error' : ''}`}
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="CPToggleBtn"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>

              {form.confirmPassword && (
                <span
                  className={`CPMatchIndicator ${
                    form.newPassword === form.confirmPassword ? 'match-ok' : 'match-fail'
                  }`}
                >
                  {form.newPassword === form.confirmPassword
                    ? '✅ Passwords match'
                    : '❌ Passwords do not match'}
                </span>
              )}
            </div>

            <div className="CPRequirements">
              <p className="CPReqTitle">Password requirements:</p>
              <ul className="CPReqList">
                <li className={`CPReqItem ${checks.length ? 'req-met' : 'req-unmet'}`}>
                  {checks.length ? '✅' : '❌'} At least 8 characters
                </li>
                <li className={`CPReqItem ${checks.uppercase ? 'req-met' : 'req-unmet'}`}>
                  {checks.uppercase ? '✅' : '❌'} At least one uppercase letter
                </li>
                <li className={`CPReqItem ${checks.number ? 'req-met' : 'req-unmet'}`}>
                  {checks.number ? '✅' : '❌'} At least one number
                </li>
                <li className={`CPReqItem ${checks.special ? 'req-met' : 'req-unmet'}`}>
                  {checks.special ? '✅' : '❌'} At least one special character
                </li>
              </ul>
            </div>

            {changePasswordError && (
              <div className="CPErrorMsgContainer">
                <p className="CPErrorMsg">{changePasswordError}</p>
              </div>
            )}

            <button type="submit" className="CPSubmitBtn" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save New Password'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap');

  .CPPageContainer {
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F1F5F9;
    padding: 32px 16px;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
    overflow-y: auto;
  }

  .CPCard {
    width: 100%;
    max-width: 460px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    animation: CPSlideUp 0.35s ease;
  }

  @keyframes CPSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .CPCardHeader {
    background: linear-gradient(135deg, #1E293B 0%, #0f172a 100%);
    padding: 28px 28px 24px;
    border-bottom: 4px solid #0D9488;
    text-align: center;
  }

  .CPCardTitle {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 6px;
    font-family: 'Poppins', sans-serif;
    letter-spacing: -0.2px;
  }

  .CPCardSubtitle {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
    line-height: 1.5;
  }

  /* Form */
  .CPForm {
    padding: 28px 30px 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .CPFormGroup {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .CPLabel {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
  }

  .CPRequired {
    color: #ef4444;
  }

  /* Input with toggle */
  .CPInputWrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .CPInput {
    width: 100%;
    height: 44px;
    padding: 11px 44px 11px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #111827;
    background: #ffffff;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
  }

  .CPInput:focus {
    border-color: #0D9488;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
  }

  .cp-input-error {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
  }

  .CPToggleBtn {
    position: absolute;
    right: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    transition: color 0.15s ease;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .CPToggleBtn:hover {
    color: #0D9488;
  }

  .CPError {
    font-size: 12px;
    color: #ef4444;
    margin-top: 2px;
  }

  .CPMatchIndicator {
    font-size: 12px;
    font-weight: 600;
    margin-top: 4px;
  }

  .match-ok  { color: #16a34a; }
  .match-fail { color: #ef4444; }

  /* ── Password Requirements ── */
  .CPRequirements {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }

  .CPReqTitle {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
    margin: 0 0 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .CPReqList {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .CPReqItem {
    font-size: 12.5px;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .req-met   { color: #16a34a; }
  .req-unmet { color: #94a3b8; }

  .CPSubmitBtn {
    margin-top: 6px;
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #0D9488 0%, #0f766e 100%);
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
    font-family: 'Poppins', sans-serif;
    letter-spacing: 0.3px;
  }

  .CPSubmitBtn:hover {
    background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.4);
  }

  .CPSubmitBtn:active {
    transform: translateY(0);
  }

  /* Success Screen */
  .CPSuccessScreen {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 48px 32px;
    gap: 16px;
  }

  .CPSuccessIcon {
    font-size: 56px;
    animation: CPPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes CPPop {
    from { transform: scale(0); opacity: 0; }
    to   { opacity: 1; transform: translateY(0); }
  }

  .CPSuccessTitle {
    font-size: 22px;
    font-weight: 700;
    color: #111827;
    margin: 0;
    font-family: 'Poppins', sans-serif;
  }

  .CPSuccessDesc {
    font-size: 14px;
    color: #64748b;
    line-height: 1.7;
    margin: 0;
    max-width: 360px;
  }

  .CPSuccessBtn {
    margin-top: 8px;
    padding: 12px 28px;
    background: linear-gradient(135deg, #0D9488 0%, #0f766e 100%);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
    font-family: 'Poppins', sans-serif;
  }

  .CPSuccessBtn:hover {
    background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.4);
  }

  .CPErrorMsgContainer {
    background-color: #fef2f2;
    border: 1px solid #fca5a5;
    padding: 10px 14px;
    border-radius: 8px;
    margin-top: 4px;
    text-align: center;
  }

  .CPErrorMsg {
    color: #dc2626 !important;
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    line-height: 1.5;
  }
`;

export default ChangePassword;