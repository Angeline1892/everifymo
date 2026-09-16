import { useState, useEffect, useRef } from "react";
import './superadmin-css.css';
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import FDALogo from '../../images/FDA.png'
import PNPLogo from '../../images/pnp-cidg.jpg'
import { API_BASE_URL } from '../../utils/apiConfig'

//LOGIN PAGE EXCLUSIVELY FOR SUPERADMIN




function SuperAdminLogin() {
    const navigate = useNavigate();

    //FORM INPUT STATES
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    //toggle password visibility states
    const [showPassword, setShowPassword] = useState(false);
    const [adminLoginError, setAdminLoginError] = useState('');
    // ADDED — "remember my email" state, same pattern as login-user.jsx
    const [rememberMe, setRememberMe] = useState(false);
    // ADDED — per-field validation errors, same pattern as login-user.jsx
    const [errors, setErrors] = useState({});
    const REMEMBERED_EMAIL_KEY = 'remembered_email_superadmin';
    const [lockoutSeconds, setLockoutSeconds] = useState(0);   // ← ADD THIS LINE

    // ADDED — Load remembered email on mount
    // on mount
    // builds the per-agency localStorage key so FDA and LEA-CIDG
    // "remember me" emails never overwrite each other
    // new
    useEffect(() => {
        const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    // ADD THIS NEW useEffect right after it:
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


    // OTP verification states
    //controls if show ba otp screen or credentials form
    const [isOtpSent, setIsOtpSent] = useState(false);
    //stores each digit ng otp
    const [otp, setOtp] = useState(new Array(6).fill(''));
    //timer for resending otp
    const [timer, setTimer] = useState(300);

    //for input box focus to each digit
    const otpRefs = useRef([]);

    // Countdown timer for OTP Resending
    useEffect(() => {
        let interval;
        if (isOtpSent && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isOtpSent, timer]);

    // Handle OTP digit change
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

    // Handle backspacing or empty box deletes
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

    // Auto split pasted 6-digit text across inputs
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

    // Resend OTP trigger
    async function handleResendOtp() {
    setAdminLoginError('');
    try {
        const response = await fetch(`${API_BASE_URL}/auth/superadmin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        // NEW
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.detail && typeof errorData.detail === 'object') {
                setLockoutSeconds(errorData.detail.retry_after_seconds || 0);
                throw new Error(errorData.detail.message || 'Failed to resend code.');
            }
            throw new Error(errorData.detail || 'Failed to resend code.');
        }

        setTimer(300);
        setOtp(new Array(6).fill(''));
        setTimeout(() => { otpRefs.current[0]?.focus(); }, 0);
    } catch (err) {
        setAdminLoginError(err.message);
    }
    }

    // Switch back to credentials form
    function handleBackToLogin() {
        setIsOtpSent(false);
        setOtp(new Array(6).fill(''));
        setAdminLoginError('');
        setPassword('');
        setLockoutSeconds(0);   // ← ADD THIS LINE
    }

    // ADDED — masks an email for display on the OTP screen so the full
    // address isn't shown in plain text (e.g. "admin@gmail.com" -> "ad***@gmail.com")
    function maskEmail(rawEmail) {
        if (!rawEmail || !rawEmail.includes('@')) return rawEmail

        const [localPart, domain] = rawEmail.split('@')

        // Keep the first 2 characters of the local part visible, mask the rest
        const visibleChars = Math.min(2, localPart.length)
        const maskedLocal =
            localPart.slice(0, visibleChars) + '*'.repeat(Math.max(localPart.length - visibleChars, 3))

        return `${maskedLocal}@${domain}`
    }

    // ADDED — field change handlers, clear that field's error the moment the user edits it
    function handleEmailChange(e) {
        const val = e.target.value;
        setEmail(val);
        if (!val.trim()) {
            setErrors((prev) => ({ ...prev, email: '' }));
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val.trim())) {
                setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
            } else {
                setErrors((prev) => ({ ...prev, email: '' }));
            }
        }
    }

    function handlePasswordChange(e) {
        setPassword(e.target.value);
        if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
    }

    async function handleLogin() {
    if (!isOtpSent) {

        // CHANGED — per-field validation (same pattern as login-user.jsx)
        // instead of a single generic "please input your credentials" message
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = 'Email is required.';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                newErrors.email = 'Please enter a valid email address.';
            }
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

            try {
                const response = await fetch(`${API_BASE_URL}/auth/superadmin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
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

            // ADDED — remember/forget email in localStorage, frontend-only
            // after successful login
            // new
            if (rememberMe) {
                localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
            } else {
                localStorage.removeItem(REMEMBERED_EMAIL_KEY);
            }

            setIsOtpSent(true);
            setTimer(300);
            setAdminLoginError('');
            setLockoutSeconds(0); 
        } catch (err) {
            setAdminLoginError(err.message);
        }

    } else {

        const otpCode = otp.join('');

        if (otpCode.length < 6) {
            setAdminLoginError('Please enter the full 6-digit verification code.');
            return;
        }

                try {
            const response = await fetch(`${API_BASE_URL}/auth/superadmin/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpCode }),
            });

            // ADDED — same structured-429 handling as the password-login branch,
            // since a throttled last-active-superadmin can now also come back
            // from verify-otp (failed OTP attempts), not just from /login.
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
            setAdminLoginError(err.message);

             // Always clear the OTP boxes and refocus box 1 on any invalid code
            setOtp(new Array(6).fill(''));
            setTimeout(() => {
                otpRefs.current[0]?.focus();
            }, 0);

            // OTP exhausted its per-code attempts (backend's 3-try cap) —
            // surface Resend immediately instead of waiting for the timer,
            // and refocus box 1 so the user can jump straight to Resend/retry.
            if (/request a new otp/i.test(err.message)) {
                setTimer(0);
            }
        }
    }
}
    const formatTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const displayedError = lockoutSeconds > 0
        ? `Too many failed attempts. Try again in ${lockoutSeconds} second${lockoutSeconds === 1 ? '' : 's'}.`
        : adminLoginError;

    return (
        <div className="AdminLoginContainer">
            <div className="AdminLoginWrapper">
                 {/* LEFT PANEL */}
                 <div className="AdminLoginLeftPanel">
                    <div className="Agency AgencyTop">
                        <img src={FDALogo} alt="FDA AGENCY LOGO" className='FdaLogo'/>
                    <div>
                        <p>REPUBLIC OF THE PHILIPPINES</p>
                        <h3>FOOD AND DRUGS ADMINISTRATION</h3>
                    </div>
                    </div>
                 
                    <div className="Hero">
                        <h1>WELCOME to ICMDA!    <br /> </h1>
                        <h4>This is Super Admin <span>Complaint Management System</span> </h4>
                    </div>
                 
                    <div className="Agency AgencyBottom">
                        <img src={PNPLogo} alt="PNP-CIDG AGENCY LOGO" />
                        <div>
                            <p>REPUBLIC OF THE PHILIPPINES</p>
                            <h3>CRIMINAL INVESTIGATION AND DETECTION GROUP</h3>
                        </div>
                    </div>
                </div>
                 

                {/* RIGHT PANEL */}
                <div className={`AdminLoginRightPanel ${isOtpSent ? 'OtpPanelActive' : ''}`}>
                    <form 
                        noValidate
                        className={isOtpSent ? 'OtpFormActive' : ''}
                        onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>

                        {!isOtpSent ? (
                            <>
                                <div className="AdminLoginHeader">
                                    <small>AUTHORIZED LOGIN</small>
                                    <h2>Please log in to continue</h2>
                                </div>
                            <div className="AdminLoginform">
                                <div>
                                    <label htmlFor="email">Email <span>*</span></label>
                                    <div className="AdminLoginInputWrapper">
                                        <Mail className="AdminLoginInputIcon" size={16} />
                                        <input
                                            id="email"
                                            type="email" 
                                            placeholder="youremail@gmail.com"
                                            value={email}
                                            onChange={handleEmailChange}
                                            required
                                        />
                                    </div>
                                    {errors.email && <span className="AdminLoginFieldError"><AlertCircle size={12} /> {errors.email}</span>}
                                </div>

                                <div style={{ marginTop: '15px' }}>
                                    <div className="PasswordLabelRow">
                                        <label htmlFor="password">Password <span>*</span></label>
                                    </div>

                                    <div className="AdminPasswordInputWrapper">
                                        <Lock className="LoginInputIcon" size={16} />
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={handlePasswordChange}
                                            required
                                        />
                                        
                                        <button
                                            type="button"
                                            className="TogglePasswordBtn"
                                            onClick={() => setShowPassword(v => !v)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {errors.password && <span className="AdminLoginFieldError"><AlertCircle size={12} /> {errors.password}</span>}

                                    <div className="AdminRememberMeRow">
                                        <label htmlFor="admin-remember-me">
                                            <input
                                                type="checkbox"
                                                id="admin-remember-me"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            Remember my email
                                        </label>
                                        <a
                                            onClick={() => navigate('/forgot-password?from=superadmin')}
                                            className="ForgotPasswordLink"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            Forgot Password?
                                        </a>
                                    </div>
                                </div>
                                </div>
                                

                                <button type="submit" disabled={lockoutSeconds > 0}>Login</button>
                            </>
                        ) : (
                            <>
                                <div className="AdminLoginHeader_otp">
                                    <h3>Security Verification</h3>
                                    <p>We've sent a 6-digit verification code to your email.</p>
                                </div>

                                <div className="OtpContainer">
                                    <div className="OtpInstructions">
                                        Enter the code sent to <span>{maskEmail(email)}</span>.
                                    </div>

                                    <div className="OtpInputGrid">
                                        {otp.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                id={`otp-digit-${idx}`}
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

                                    

                                     {/* ADDED — disable verify button while a throttle from too many
                                        failed OTP attempts is active, same pattern as the login button */}
                                    <button type="submit" style={{ marginTop: '20px' }} disabled={lockoutSeconds > 0}>
                                        Verify &amp; Login
                                    </button>
                                    <button type="button" className="BackToLoginBtn" onClick={handleBackToLogin}>
                                        ← Back to login
                                    </button>
                                </div>

                                
                            </>
                        )}

                        {displayedError && (
                            <div className="AdminLoginErrorMsgContainer" style={{ marginTop: '15px' }}>
                                <p className="AdminLoginErrorMsg">{displayedError}</p>
                            </div>
                        )}


                    </form>
                </div>
                
            </div>
        </div>
    );
}

export default SuperAdminLogin;