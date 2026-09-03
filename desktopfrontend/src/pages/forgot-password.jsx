import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircleCheckBig, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../utils/apiConfig';

function ForgotPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const from = searchParams.get('from');
    const isSuperAdmin = from === 'superadmin';
    const themeClass = isSuperAdmin ? 'superadmin' : 'interagency';

    const [step, setStep] = useState('email'); 
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(new Array(6).fill(''));
    const [timer, setTimer] = useState(300);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [forgotError, setForgotError] = useState('');

    const checks = {
        length:    newPassword.length >= 8,
        uppercase: /[A-Z]/.test(newPassword),
        number:    /[0-9]/.test(newPassword),
        special:   /[^A-Za-z0-9]/.test(newPassword),
    };
    const allChecksPassed = Object.values(checks).every(Boolean);

    const otpRefs = useRef([]);

    // Countdown Timer for OTP Resending
    useEffect(() => {
        let interval;
        if (step === 'code' && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const handleBackToLogin = () => {
        if (from === 'superadmin') {
            navigate('/universal-login?tab=superadmin');
        } else {
            navigate('/universal-login');
        }
    };

    const handleEmailChange = (e) => {
        const val = e.target.value;
        setEmail(val);
        if (!val.trim()) {
            setForgotError('');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val.trim())) {
                setForgotError('Please enter a valid email address.');
            } else {
                setForgotError('');
            }
        }
    };

    const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) return;
    setForgotError('');

      try {
          const response = await fetch(`${API_BASE_URL}/auth/password/forgot`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email,
                  portal: isSuperAdmin ? 'superadmin' : 'personnel',
              }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'Failed to send code.');
          }

          setStep('code');
          setTimer(300);
          setOtp(new Array(6).fill(''));
          setTimeout(() => {
              otpRefs.current[0]?.focus();
          }, 0);
      } catch (err) {
          setForgotError(err.message);
      }
  };

    const handleResendOtp = async () => {
        setForgotError('');
        try {
            const response = await fetch(`${API_BASE_URL}/auth/password/forgot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    portal: isSuperAdmin ? 'superadmin' : 'personnel',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to resend code.');
            }

            setTimer(300);
            setOtp(new Array(6).fill(''));
            setTimeout(() => {
                otpRefs.current[0]?.focus();
            }, 0);
        } catch (err) {
            setForgotError(err.message);
        }
    };

    const handleVerifyCode = async (e) => {
      e.preventDefault();
      const otpCode = otp.join('');
      if (otpCode.length < 6) {
          setForgotError('Please enter the full 6-digit verification code.');
          return;
      }
      setForgotError('');

      try {
          const response = await fetch(`${API_BASE_URL}/auth/password/verify-otp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email,
                  otp: otpCode,
                  portal: isSuperAdmin ? 'superadmin' : 'personnel',
              }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'Invalid verification code.');
          }

          setStep('reset');
      } catch (err) {
          setForgotError(err.message);

          // Always clear the OTP boxes and refocus box 1 on any invalid code
          setOtp(new Array(6).fill(''));
          setTimeout(() => {
              otpRefs.current[0]?.focus();
          }, 0);

          // OTP exhausted its per-code attempts (backend's 3-try cap) —
          // surface Resend immediately instead of waiting for the timer.
          if (/request a new otp/i.test(err.message)) {
              setTimer(0);
          }
      }
  };

    const handleResetPassword = async (e) => {
      e.preventDefault();
      if (!newPassword) {
          setForgotError('New password is required.');
          return;
      } else if (!allChecksPassed) {
          setForgotError('Password does not meet all requirements.');
          return;
      }
      if (!confirmPassword) {
          setForgotError('Please confirm your new password.');
          return;
      } else if (newPassword !== confirmPassword) {
          setForgotError('Passwords do not match.');
          return;
      }
      setForgotError('');

      try {
          const response = await fetch(`${API_BASE_URL}/auth/password/reset`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  email,
                  otp: otp.join(''),
                  new_password: newPassword,
                  portal: isSuperAdmin ? 'superadmin' : 'personnel',
              }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.detail || 'Failed to reset password.');
          }

          setStep('success');
      } catch (err) {
          setForgotError(err.message);
          setStep('code');

          // Same as verify: clear + refocus, and force Resend if attempts are exhausted
          setOtp(new Array(6).fill(''));
          setTimeout(() => {
              otpRefs.current[0]?.focus();
          }, 0);

          if (/request a new otp/i.test(err.message)) {
              setTimer(0);
          }
      }
  };

    function handleOtpChange(element, index) {
        let val = element.value;
        if (!/^\d*$/.test(val)) return;
        val = val.substring(val.length - 1);
        const newOtp = [...otp];
        newOtp[index] = val;
        setOtp(newOtp);
        if (val && index < 5) {
            otpRefs.current[index + 1].focus();
        }
    }

    function handleOtpKeyDown(e, index) {
        if (e.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                otpRefs.current[index - 1].focus();
            } else {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            }
        }
    }

    function handleOtpPaste(e) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim().substring(0, 6);
        if (/^\d+$/.test(pastedData)) {
            const digits = pastedData.split('');
            const newOtp = [...otp];
            for (let i = 0; i < 6; i++) {
                newOtp[i] = digits[i] || '';
            }
            setOtp(newOtp);
            const targetFocusIndex = Math.min(digits.length, 5);
            otpRefs.current[targetFocusIndex]?.focus();
        }
    }

    function maskEmail(rawEmail) {
        if (!rawEmail || !rawEmail.includes('@')) return rawEmail;
        const [localPart, domain] = rawEmail.split('@');
        const visibleChars = Math.min(2, localPart.length);
        const maskedLocal =
            localPart.slice(0, visibleChars) + '*'.repeat(Math.max(localPart.length - visibleChars, 3));
        return `${maskedLocal}@${domain}`;
    }

    const formatTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <>
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap');

                .ForgotPasswordContainer {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  width: 100vw;
                  min-height: 100vh;
                  background: #1E293B;
                  padding: 24px 16px;
                  box-sizing: border-box;
                  overflow-y: auto;
                  font-family: 'Inter', sans-serif;
                }

                .ForgotPasswordWrapper {
                  width: 100%;
                  max-width: 460px;
                  background: #ffffff;
                  padding: 38px 34px;
                  border-radius: 16px;
                  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
                  box-sizing: border-box;
                  animation: ForgotFadeIn 0.35s ease-out forwards;
                }

                @keyframes ForgotFadeIn {
                  from { opacity: 0; transform: translateY(16px); }
                  to   { opacity: 1; transform: translateY(0); }
                }

                .ForgotPasswordHeader {
                  text-align: center;
                  margin-bottom: 24px;
                }

                .ForgotPasswordHeader h3 {
                  font-family: 'Poppins', sans-serif;
                  font-size: 22px;
                  font-weight: 700;
                  color: #0f172a;
                  margin: 0 0 8px;
                  letter-spacing: -0.3px;
                }

                .ForgotPasswordHeader p {
                  font-family: 'Inter', sans-serif;
                  font-size: 13px;
                  color: #64748b;
                  line-height: 1.5;
                  margin: 0;
                }

                .ForgotForm {
                  display: flex;
                  flex-direction: column;
                  gap: 16px;
                }

                .ForgotForm label {
                  display: block;
                  font-size: 13px;
                  font-weight: 600;
                  color: #334155;
                  margin-bottom: 6px;
                }

                .ForgotForm label span {
                  color: #ef4444;
                }

                .LoginInputWrapper, .PasswordInputWrapper {
                  position: relative;
                  display: flex;
                  align-items: center;
                  width: 100%;
                }

                .LoginInputWrapper input, .PasswordInputWrapper input {
                  width: 100%;
                  height: 44px;
                  padding: 11px 12px 11px 40px !important;
                  border: 1.5px solid #e2e8f0;
                  border-radius: 8px;
                  font-size: 14px;
                  background: #ffffff;
                  color: #111827;
                  outline: none;
                  transition: all 0.2s ease;
                  box-sizing: border-box;
                  font-family: 'Inter', sans-serif;
                }

                .LoginInputWrapper input:focus, .PasswordInputWrapper input:focus {
                  border-color: #0D9488;
                  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
                }

                .LoginInputWrapper input.login-input-error, .PasswordInputWrapper input.login-input-error {
                  border-color: #ef4444;
                  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }

                .LoginInputIcon {
                  position: absolute;
                  left: 14px;
                  color: #94a3b8;
                  pointer-events: none;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }

                .universal-login-field-error {
                  font-size: 11.5px;
                  color: #ef4444 !important;
                  margin-top: 5px !important;
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  line-height: 1.2;
                  font-weight: 500;
                }

                .SubmitBtn {
                  width: 100%;
                  margin-top: 6px;
                  padding: 12px;
                  background: linear-gradient(135deg, #0D9488 0%, #0f766e 100%);
                  color: #ffffff;
                  font-family: 'Poppins', sans-serif;
                  font-size: 14px;
                  font-weight: 700;
                  border: none;
                  border-radius: 10px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
                  letter-spacing: 0.3px;
                }

                .SubmitBtn:hover {
                  background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
                  transform: translateY(-1px);
                  box-shadow: 0 6px 18px rgba(13, 148, 136, 0.4);
                }

                .SubmitBtn:active {
                  transform: translateY(0);
                }

                .BackBtn {
                  background: none;
                  border: none;
                  color: #64748b;
                  font-family: 'Inter', sans-serif;
                  font-size: 13px;
                  font-weight: 500;
                  cursor: pointer;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                  margin-top: 4px;
                  transition: color 0.2s ease;
                  text-decoration: none;
                }

                .BackBtn:hover {
                  color: #0f172a;
                  text-decoration: underline;
                }

                /* OTP Digit inputs */
                .OtpContainer {
                  display: flex;
                  flex-direction: column;
                }

                .OtpGridContainer {
                  display: flex;
                  gap: 8px;
                  justify-content: space-between;
                  margin-bottom: 16px;
                }

                .OtpDigitInput {
                  width: 44px;
                  height: 48px;
                  text-align: center;
                  font-size: 20px;
                  font-weight: 600;
                  border-radius: 8px;
                  border: 1.5px solid #e2e8f0;
                  background-color: #ffffff;
                  color: #0f172a;
                  transition: all 0.2s ease;
                  box-sizing: border-box;
                  outline: none;
                }

                .OtpDigitInput:focus {
                  border-color: #0D9488 !important;
                  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.2);
                }

                .OtpTimerContainer {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 6px;
                  margin-bottom: 12px;
                  font-size: 13px;
                  color: #64748b;
                }

                .ResendButton {
                  background: none;
                  border: none;
                  color: #0D9488;
                  font-size: 13px;
                  font-weight: 600;
                  cursor: pointer;
                  padding: 0;
                  text-decoration: underline;
                  transition: color 0.2s ease;
                }

                .ResendButton:hover {
                  color: #0f766e;
                }

                .ErrorContainer {
                  background-color: #fef2f2;
                  border: 1px solid #fca5a5;
                  padding: 10px 14px;
                  border-radius: 8px;
                  margin-bottom: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }

                .ErrorMsg {
                  color: #dc2626 !important;
                  font-size: 13px;
                  font-weight: 500;
                  text-align: center;
                  margin: 0 !important;
                }

                /* Password Reset Form Styles */
                .CPForm {
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

                .CPMatchIndicator {
                  font-size: 12px;
                  font-weight: 600;
                  margin-top: 4px;
                }
                .match-ok { color: #16a34a; }
                .match-fail { color: #ef4444; }

                .CPRequirements {
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 10px;
                  padding: 12px 14px;
                  box-sizing: border-box;
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
                .CPReqItem.req-met {
                  color: #16a34a;
                }
                .CPReqItem.req-unmet {
                  color: #9ca3af;
                }

                .CPErrorMsgContainer {
                  background-color: #fef2f2;
                  border: 1px solid #fca5a5;
                  padding: 10px 14px;
                  border-radius: 8px;
                  margin-top: 2px;
                }

                .CPErrorMsg {
                  color: #dc2626 !important;
                  margin: 0;
                  font-size: 13px;
                  font-weight: 500;
                  text-align: center;
                }

                .CPSubmitBtn {
                  width: 100%;
                  margin-top: 6px;
                  padding: 12px;
                  background: linear-gradient(135deg, #0D9488 0%, #0f766e 100%);
                  color: #ffffff;
                  font-family: 'Poppins', sans-serif;
                  font-size: 14px;
                  font-weight: 700;
                  border: none;
                  border-radius: 10px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
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

                .SuccessIcon {
                  color: #0D9488;
                  width: 56px;
                  height: 56px;
                  margin: 0 auto 12px;
                }
                `}
            </style>
            <div className="ForgotPasswordContainer">
                <div className="ForgotPasswordWrapper">
                    <div className="ForgotPasswordHeader">
                        <h3>
                            {step === 'success' ? 'Password Reset Complete!' : 'Forgot Password'}
                        </h3>
                        <p>
                            {step === 'email' && "Please enter your account email address. We will send you a verification code."}
                            {step === 'code' && (
                                <>
                                    We sent a code to <span style={{ color: '#0D9488', fontWeight: 600 }}>{maskEmail(email)}</span>. Please enter it below.
                                </>
                            )}
                            {step === 'reset' && "Verification successful! Create your new account password below."}
                            {step === 'success' && "Your password has been successfully updated. You can now securely log back in."}
                        </p>
                    </div>

                    {/* FOR INPUT EMAIL */}
                    {step === 'email' && (
                        <form onSubmit={handleSendCode} className="ForgotForm">
                            <div>
                                <label>Email <span>*</span></label>
                                <div className="LoginInputWrapper">
                                    <Mail className="LoginInputIcon" size={16} />
                                    <input 
                                        type="email" 
                                        placeholder="youremail@gmail.com" 
                                        value={email}
                                        onChange={handleEmailChange}
                                        className={forgotError ? 'login-input-error' : ''}
                                        required
                                    />
                                </div>
                                {forgotError && (
                                    <span className="universal-login-field-error">
                                        <AlertCircle size={11} /> {forgotError}
                                    </span>
                                )}
                            </div>
                            <button type="submit" className="SubmitBtn">Send Code</button>
                            <button type="button" className="BackBtn" onClick={handleBackToLogin}>Back to Login</button>
                        </form>
                    )}

                    {/* FOR INPUT VERIFICATION CODE (6-digit grid layout) */}
                    {step === 'code' && (
                        <form onSubmit={handleVerifyCode} className="ForgotForm">
                            <div className="OtpContainer">
                                <div className="OtpGridContainer">
                                    {otp.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            className="OtpDigitInput"
                                            value={digit}
                                            ref={(el) => (otpRefs.current[idx] = el)}
                                            onChange={(e) => handleOtpChange(e.target, idx)}
                                            onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                                            onPaste={handleOtpPaste}
                                            required
                                        />
                                    ))}
                                </div>

                                <div className="OtpTimerContainer">
                                    {timer > 0 ? (
                                        <p>Resend code in <strong>{formatTimer(timer)}</strong></p>
                                    ) : (
                                        <p>
                                            Didn't receive the code?{' '}
                                            <button type="button" className="ResendButton" onClick={handleResendOtp}>
                                                Resend OTP
                                            </button>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {forgotError && (
                                <div className="ErrorContainer">
                                    <p className="ErrorMsg">{forgotError}</p>
                                </div>
                            )}

                            <button type="submit" className="SubmitBtn">Verify Code</button>
                            <button type="button" className="BackBtn" onClick={() => setStep('email')}>
                                Back to Email
                            </button>
                        </form>
                    )}

                    {/* FOR CREATE NEW PASSWORD */}
                    {step === 'reset' && (
                        <form onSubmit={handleResetPassword} className="CPForm" noValidate>
                            {/* New Password */}
                            <div className="CPFormGroup">
                                <label className="CPLabel">
                                    New Password <span className="CPRequired">*</span>
                                </label>
                                <div className="CPInputWrapper">
                                    <input
                                        className={`CPInput ${forgotError && !newPassword ? 'cp-input-error' : ''}`}
                                        type={showNew ? 'text' : 'password'}
                                        placeholder="Enter new password"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            setForgotError('');
                                        }}
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
                                        className={`CPInput ${forgotError && (!confirmPassword || newPassword !== confirmPassword) ? 'cp-input-error' : ''}`}
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setForgotError('');
                                        }}
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

                                {confirmPassword && (
                                    <span
                                        className={`CPMatchIndicator ${
                                            newPassword === confirmPassword ? 'match-ok' : 'match-fail'
                                        }`}
                                    >
                                        {newPassword === confirmPassword
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

                            {forgotError && (
                                <div className="CPErrorMsgContainer">
                                    <p className="CPErrorMsg">{forgotError}</p>
                                </div>
                            )}

                            <button type="submit" className="CPSubmitBtn">
                                Update Password
                            </button>
                        </form>
                    )}

                    {/* FOR SUCCESS PASSWORD RESET */}
                    {step === 'success' && (
                        <div className="SuccessContainer" style={{ textAlign: 'center', marginTop: '12px' }}>
                            <CircleCheckBig className="SuccessIcon" />
                            <button 
                                type="button" 
                                className="SubmitBtn"
                                style={{ marginTop: '16px' }}
                                onClick={handleBackToLogin}
                            >
                                Back to Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default ForgotPassword;