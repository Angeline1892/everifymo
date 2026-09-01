// desktopfrontend/src/pages/login-user.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, AlertCircle  } from 'lucide-react'
import '../App.css'
import FDALogo from '../images/FDA.png'
import PNPLogo from '../images/pnp-cidg.jpg'
import { API_BASE_URL } from '../utils/apiConfig'

function Login(){
    const navigate = useNavigate();

    // tracks which agency button the user selected (fda or cidg)
    const [agency, setAgency] = useState('')
    // form input states
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loginError, setLoginError] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [errors, setErrors] = useState({})

    // Load remembered email on mount
    // on mount
    // builds the per-agency localStorage key so FDA and LEA-CIDG
    // "remember me" emails never overwrite each other
    function rememberedEmailKey(forAgency) {
      return forAgency ? `remembered_email_user_${forAgency}` : null
    }

    // Load remembered email whenever the agency changes
    useEffect(() => {
      const key = rememberedEmailKey(agency)
      if (!key) return
      const savedEmail = localStorage.getItem(key)
      if (savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      } else {
        setEmail('')
        setRememberMe(false)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agency])

    // OTP verification states
    // controls whether to show the OTP screen or the login form
    const [isOtpSent, setIsOtpSent] = useState(false)
    // stores the 6 digits of OTP
    const [otp, setOtp] = useState(new Array(6).fill(''))
    // countdown timer (seconds)
    const [timer, setTimer] = useState(300)

    const otpRefs = useRef([])

    // Countdown Timer for OTP Resending
    useEffect(() => {
      let interval;
      if (isOtpSent && timer > 0) {
        interval = setInterval(() => {
          setTimer((prev) => prev - 1);
        }, 1000);
      }
      return () => clearInterval(interval);
    }, [isOtpSent, timer]);

    // Handle single OTP digit change and only allows numbers then auto-moves to next box
    function handleOtpChange(element, index) {
      let val = element.value;
      if (!/^\d*$/.test(val)) return;
      val = val.substring(val.length - 1);
      const newOtp = [...otp];
      newOtp[index] = val;
      setOtp(newOtp);
      // auto jump to next box after typing
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

    // Resend OTP trigger — calls the login endpoint again to generate a fresh OTP
    async function handleResendOtp() {
      setLoginError('');
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, agency }),
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
        setLoginError(err.message);
      }
    }

    // Switch back to credentials form
    function handleBackToLogin() {
      setIsOtpSent(false);
      setOtp(new Array(6).fill(''));
      setLoginError('');
      setPassword('');
    }

    // Format seconds as M:SS to match the superadmin login OTP timer
    const formatTimer = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    // ADDED — masks an email for display on the OTP screen so the full
    // address isn't shown in plain text (e.g. "juan@gmail.com" -> "ju***@gmail.com")
    function maskEmail(rawEmail) {
      if (!rawEmail || !rawEmail.includes('@')) return rawEmail

      const [localPart, domain] = rawEmail.split('@')

      // Keep the first 2 characters of the local part visible, mask the rest
      const visibleChars = Math.min(2, localPart.length)
      const maskedLocal =
        localPart.slice(0, visibleChars) + '*'.repeat(Math.max(localPart.length - visibleChars, 3))

      return `${maskedLocal}@${domain}`
    }

    // Field change handlers — clear that field's error the moment the user edits it

    // Field change handlers — clear that field's error the moment the user edits it
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

    function handleAgencyChange(value) {
      setAgency(value);
      if (errors.agency) setErrors((prev) => ({ ...prev, agency: '' }));
    }

    // handles both credential check and OTP verification
    async function handleLogin() {
      if (!isOtpSent) {
        // per-field validation
        const newErrors = {};

        if (!agency) {
          newErrors.agency = 'Please select an agency.';
        }

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
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, agency }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Invalid email or password.');
          }

          // after successful OTP verification / login success
          // new
          const key = rememberedEmailKey(agency);
          if (key) {
            if (rememberMe) {
              localStorage.setItem(key, email);
            } else {
              localStorage.removeItem(key);
            }
          }

          setIsOtpSent(true);
          setTimer(300);
          setLoginError('');
        } catch (err) {
          setLoginError(err.message);
        }

      } else {
        const otpCode = otp.join('');
        if (otpCode.length < 6) {
          setLoginError('Please enter the full 6-digit verification code.');
          return;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: otpCode }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Invalid verification code. Please try again.');
          }

          const data = await response.json();
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          localStorage.setItem('agency', agency);

          if (data.force_password_change) {
            navigate('/change-password');
          } else if (agency === 'fda') {
            navigate('/fdafolder/fda-dashboard');
          } else {
            navigate('/leacidgfolder/lea-dashboard');
          }
        } catch (err) {
          setLoginError(err.message);

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

  return (
    <div>
      <div className="LoginPage">
        <div className='LoginGlassContainer'> 
          <div className="LeftPanel">
            <div className="Agency AgencyTop">
              <img src={FDALogo} alt="FDA AGENCY LOGO" className='FdaLogo'/>
              <div>
                <p>REPUBLIC OF THE PHILIPPINES</p>
                <h3>FOOD AND DRUGS ADMINISTRATION</h3>
              </div>
            </div>

            <div className="Hero">
              <h1>WELCOME! <br /> </h1>
                <h4>
                  This is Interagency <span>Complaint Management </span> <br />
                  
                   System Desktop Application (<span>ICMDA</span>)
                </h4>
              
   
            </div>

            <div className="Agency AgencyBottom">
              <img src={PNPLogo} alt="PNP-CIDG AGENCY LOGO" />
              <div>
                <p>REPUBLIC OF THE PHILIPPINES</p>
                <h3>CRIMINAL INVESTIGATION AND DETECTION GROUP</h3>
              </div>
            </div>
          </div>

          <div className ="RightPanel">
            {isOtpSent ? (
              <>
                <small>SECURITY VERIFICATION</small>
                <h2>Enter Security Code</h2>
                <p><i>We've sent a 6-digit verification code to your email.</i></p>
              </>
            ) : (
              <>
                <small>AUTHORIZED LOGIN</small>
                <h2>Please log in to continue</h2>
                <p><i>Select your agency and enter your credentials.</i></p>
              </>
            )}

            <div className="LoginForm">
              {!isOtpSent ? (
                <>
                  <label htmlFor="agency">Agency <span>*</span></label>
                  <div className="AgencyButtons">
                    <input type="radio" id="fda" name="agency" value="fda" onChange={() => handleAgencyChange('fda')} checked={agency === 'fda'} />
                    <label htmlFor="fda" className="InterButtons AgencyButtonFDA">FDA</label>

                    <input type="radio" id="cidg" name="agency" value="lea" onChange={() => handleAgencyChange('lea')} checked={agency === 'lea'} />
                    <label htmlFor="cidg" className="InterButtons AgencyButtonCIDG">LEA-CIDG</label>
                  </div>
                  {errors.agency && <span className="LoginFieldError"><AlertCircle size={12} /> {errors.agency}</span>}

                  <label htmlFor="email">Email <span>*</span></label>
                  <div className="LoginInputWrapper">
                    <Mail className="LoginInputIcon" size={16} />
                    <input type="email" id="email" placeholder="youremail@gmail.com" value={email} onChange={handleEmailChange} required/>
                  </div>
                  {errors.email && <span className="LoginFieldError"><AlertCircle size={12} /> {errors.email}</span>}


                  <label htmlFor="password">Password <span>*</span></label>
                  <div className="PasswordInputWrapper">
                    <Lock className="LoginInputIcon" size={16} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={handlePasswordChange}
                      required
                    />
                    <button
                      type="button"
                      className="TogglePasswordBtn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <span className="LoginFieldError"><AlertCircle size={12} /> {errors.password}</span>}

                  <div className="RememberMe">
                    <label htmlFor="remember-me"> 
                      <input
                        type="checkbox"
                        id="remember-me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      Remember my email
                    </label>
                    <label htmlFor="forgot-password" className="ForgetPass"><a onClick={() => navigate('/forgot-password?from=interagency')} style={{cursor:'pointer'}}>Forgot password?</a></label>
                  </div>
                </>
              ) : (
                <div className="OtpContainer">
                  <div className="OtpInstructions">
                    Enter the code sent to your email <span>{maskEmail(email)}</span>.
                  </div>

                  <div className="LoginOtpInputGrid">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="LoginOtpDigitInput"
                        value={digit}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        onChange={(e) => handleOtpChange(e.target, idx)}
                        onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                        onPaste={handleOtpPaste}
                        required
                      />
                    ))}
                  </div>

                  <div className="LoginOtpTimerContainer">
                    {timer > 0 ? (
                      <p>Resend code in <strong>{formatTimer(timer)}</strong></p>
                    ) : (
                      <p>
                        Didn't receive the code?{' '}
                        <button type="button" className="LoginResendButton" onClick={handleResendOtp}>
                          Resend OTP
                        </button>
                      </p>
                    )}
                  </div>

                  
                </div>
              )}
              
              {loginError && <div className="LoginErrorMsgContainer"><p className="LoginErrorMsg">{loginError}</p></div>}
              
              <button className="LoginButton" onClick={handleLogin}>
                {isOtpSent ? 'Verify & Login' : 'Login'}
              </button>
              {isOtpSent && (
                <button type="button" className="LoginBackToLoginBtn" onClick={handleBackToLogin}>
                  ← Back to login credentials
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Login