// desktopfrontend/src/pages/user-registration-form.jsx
import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import ImgSuccess from '../images/success_img.png'
import ImgTime from '../images/time_img.png'
import { API_BASE_URL } from '../utils/apiConfig'
import {
  User,
  Mail,
  Building2,
  MapPin,
  Phone,
  Briefcase,
  Fingerprint,
  Shield,
  AlertCircle
} from 'lucide-react';


// Maps raw role values from the database to human-friendly labels
const ROLE_LABELS = {
  fda_personnel: 'FDA Personnel',
  lea_personnel: 'LEA Personnel',
  superadmin: 'SuperAdmin',
}


// REGISTRATION PAGE FOR ADDED PERSONNEL
function UserRegistration() {
  const navigate = useNavigate();
  const location = useLocation()
  const officerData = location.state || {}   // fallback in case someone visits this page directly
  // add this to the top-level of the component, right after officerData is defined:
  const hasValidInviteData = Boolean(officerData.invite_token && officerData.email);


  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    employeeId: '',
    contactNumber: '',
    department: '',
    position: '',
  });


  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // NEW


  const REQUIRED_FIELDS = [
    'firstName',
    'lastName',
    'employeeId',
    'contactNumber',
    'department',
    'position',
  ];


  function validate() {
    const newErrors = {};
    REQUIRED_FIELDS.forEach((field) => {
      if (!form[field].trim()) {
        const label = {
          firstName: 'First Name',
          lastName: 'Last Name',
          employeeId: 'Employee ID',
          contactNumber: 'Contact Number',
          department: 'Department',
          position: 'Position',
        }[field];
        newErrors[field] = `${label} is required.`;
      }
    });


    if (form.contactNumber && form.contactNumber.length !== 11) {
    newErrors.contactNumber = 'Contact number must be exactly 11 digits.';
  }


    return newErrors;
  }


  function handleChange(e) { // added to handle contact number input to only allow digits and limit to 11 characters
  const { name, value } = e.target;


  if (name === 'contactNumber') {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 11);
    setForm((prev) => ({ ...prev, [name]: digitsOnly }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    return;
  }


  setForm((prev) => ({ ...prev, [name]: value }));
  if (errors[name]) {
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }
}


  function handleSubmit(e) {
    e.preventDefault();
   
    if (isSubmitting) return; // NEW — ignore extra clicks/double-fires while a request is in flight


    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }


    setIsSubmitting(true); // NEW


    // Submit the form data to the backend
  fetch(`${API_BASE_URL}/registration/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invite_token: officerData.invite_token,
      first_name: form.firstName,
      middle_name: form.middleName || null,
      last_name: form.lastName,
      employee_id: form.employeeId,
      contact_number: form.contactNumber,
      department: form.department,
      position: form.position,
    }),
  })
    .then((res) => {
    if (!res.ok) {
      throw new Error('Submission failed')
    }
    return res.json()
  })
  .then(() => setSubmitted(true))
  .catch((error) => {
    console.error(error)
    // For now, at minimum, avoid silently pretending success
    alert('Something went wrong submitting your registration. Please try again.')
  })


  .finally(() => setIsSubmitting(false)); // NEW — re-enable on both success and failure
 
}




// add this block BEFORE the `if (submitted)` block:
if (!hasValidInviteData) {
  return (
    <>
      <style>{styles}</style>
      <div className="RegPageContainer">
        <div className="RegCard">
          <div className="RegSuccessScreen">
            <h2 className="RegSuccessTitle">Link Not Recognized</h2>
            <p className="RegSuccessDesc">
              We couldn't find your registration details. Please use the invitation link from your email, or contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}


  /*Success Screen*/
  if (submitted) {
    return (
      <>
        <style>{styles}</style>
        <div className="RegPageContainer">
          <div className="RegCard">
            <div className="RegSuccessScreen">
              <div className="RegSuccessIconLarge"><img src={ImgSuccess} alt="Success Icon" /></div>
              <h2 className="RegSuccessTitle">Registration Submitted!</h2>
              <p className="RegSuccessDesc">
                Your registration has been submitted. Please wait for the administrator to activate
                your account. You will receive an email once your account is ready.
              </p>
              <div className="RegSuccessTag">
                <span className='RegTimeIcon'><img src={ImgTime} alt="Hour glass icon" /></span> Pending Administrator Approval
              </div>


              {/* in the success screen, add the Back to Login button after RegSuccessTag: */}


              <button
                className="RegSubmitBtn"
                style={{ marginTop: 20, maxWidth: 220 }}
                onClick={() => navigate('/login')}
              >
                Back to Login
              </button>
             
            </div>
          </div>
        </div>
      </>
    );
  }


  /* Registration Form for user side */
  return (
    <>
      <style>{styles}</style>
      <div className="RegPageContainer">
        <div className="RegCard">
          {/* Card Header */}
          <div className="RegCardHeader">
            <div className="RegSystemBadge">ICMDA</div>
            <h1 className="RegCardTitle">Complete Your Registration</h1>
            <p className="RegCardSubtitle">
              Please fill in your details to complete your personnel registration.
            </p>
          </div>


          <form className="RegForm" onSubmit={handleSubmit} noValidate>
            {/* Name Row */}
            <div className="RegFieldRow">
              <div className="RegFormGroup">
                <label className="RegLabel">
                  First Name <span className="RegRequired">*</span>
                </label>
                <div className="RegInputWrapper">
                  <User className="RegInputIcon" size={16} />
                  <input
                    className={`RegInput ${errors.firstName ? 'reg-input-error' : ''}`}
                    type="text"
                    name="firstName"
                    placeholder="Juan"
                    value={form.firstName}
                    onChange={handleChange}
                  />
                </div>
                {errors.firstName && <span className="RegError"><AlertCircle size={12} /> {errors.firstName}</span>}
              </div>


              <div className="RegFormGroup">
                <label className="RegLabel">Middle Name</label>
                <div className="RegInputWrapper">
                  <User className="RegInputIcon" size={16} />
                  <input
                    className="RegInput"
                    type="text"
                    name="middleName"
                    placeholder="Optional"
                    value={form.middleName}
                    onChange={handleChange}
                  />
                </div>
              </div>


              <div className="RegFormGroup">
                <label className="RegLabel">
                  Last Name <span className="RegRequired">*</span>
                </label>
                <div className="RegInputWrapper">
                  <User className="RegInputIcon" size={16} />
                  <input
                    className={`RegInput ${errors.lastName ? 'reg-input-error' : ''}`}
                    type="text"
                    name="lastName"
                    placeholder="Dela Cruz"
                    value={form.lastName}
                    onChange={handleChange}
                  />
                </div>
                {errors.lastName && <span className="RegError"><AlertCircle size={12} /> {errors.lastName}</span>}
              </div>
            </div>


            {/* Employee ID & Contact */}
            <div className="RegFieldRow">
              <div className="RegFormGroup">
                <label className="RegLabel">
                  Employee ID <span className="RegRequired">*</span>
                </label>
                <div className="RegInputWrapper">
                  <Fingerprint className="RegInputIcon" size={16} />
                  <input
                    className={`RegInput ${errors.employeeId ? 'reg-input-error' : ''}`}
                    type="text"
                    name="employeeId"
                    placeholder="EMP-00123"
                    value={form.employeeId}
                    onChange={handleChange}
                  />
                </div>
                {errors.employeeId && <span className="RegError"><AlertCircle size={12} /> {errors.employeeId}</span>}
              </div>


              <div className="RegFormGroup">
                <label className="RegLabel">
                  Contact Number <span className="RegRequired">*</span>
                </label>
                <div className="RegInputWrapper">
                  <Phone className="RegInputIcon" size={16} />
                  <input
                    className={`RegInput ${errors.contactNumber ? 'reg-input-error' : ''}`}
                    type="text"
                    name="contactNumber"
                    placeholder="09XX XXX XXXX"
                    maxLength={11}
                    value={form.contactNumber}
                    onChange={handleChange}
                  />
                </div>
                {errors.contactNumber && <span className="RegError"><AlertCircle size={12} /> {errors.contactNumber}</span>}
              </div>
            </div>


            {/* Account Info (read-only) kase pre-filled na based sa superadmin entry */}
            <div className="RegFormGroup">
              <label className="RegLabel">
                Email Address{' '}
                <span className="RegReadonlyTag">pre-filled</span>
              </label>
              <div className="RegInputWrapper">
                <Mail className="RegInputIcon" size={16} />
                <input
                  className="RegInput reg-input-readonly"
                  type="email"
                  name="email"
                  value={officerData.email || ''} //changed to officerData.email to pre-fill from deep link token
                  readOnly
                />
              </div>
            </div>


            <div className="RegFieldRow">
              <div className="RegFormGroup">
                <label className="RegLabel">
                  Agency{' '}
                  <span className="RegReadonlyTag">pre-filled</span>
                </label>
                <div className="RegInputWrapper">
                  <Building2 className="RegInputIcon" size={16} />
                  <input
                    className="RegInput reg-input-readonly"
                    type="text"
                    name="agency"
                    value={ROLE_LABELS[officerData.role] || officerData.role || ''} // changed too, with the role labels
                    readOnly
                  />
                </div>
              </div>


              <div className="RegFormGroup">
                <label className="RegLabel">
                  Region{' '}
                  <span className="RegReadonlyTag">pre-filled</span>
                </label>
                <div className="RegInputWrapper">
                  <MapPin className="RegInputIcon" size={16} />
                  <input
                    className="RegInput reg-input-readonly"
                    type="text"
                    name="region"
                    value={officerData.region_name || ''} //changed as well
                    readOnly
                  />
                </div>
              </div>
            </div>


            {/* Department & Position */}
            <div className="RegFieldRow">
              <div className="RegFormGroup">
                <label className="RegLabel">
                  Department <span className="RegRequired">*</span>
                </label>
                <div className="RegInputWrapper">
                  <Building2 className="RegInputIcon" size={16} />
                  <input
                    className={`RegInput ${errors.department ? 'reg-input-error' : ''}`}
                    type="text"
                    name="department"
                    placeholder="e.g. Operations Division"
                    value={form.department}
                    onChange={handleChange}
                  />
                </div>
                {errors.department && <span className="RegError"><AlertCircle size={12} /> {errors.department}</span>}
              </div>


              <div className="RegFormGroup">
                <label className="RegLabel">
                  Position <span className="RegRequired">*</span>
                </label>
                <div className="RegInputWrapper">
                  <Briefcase className="RegInputIcon" size={16} />
                  <input
                    className={`RegInput ${errors.position ? 'reg-input-error' : ''}`}
                    type="text"
                    name="position"
                    placeholder="e.g. Senior Analyst"
                    value={form.position}
                    onChange={handleChange}
                  />
                </div>
                {errors.position && <span className="RegError"><AlertCircle size={12} /> {errors.position}</span>}
              </div>
            </div>


            <button type="submit" className="RegSubmitBtn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}






const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap');


  .RegPageContainer {
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F1F5F9;
    padding: 32px 16px;
    box-sizing: border-box;
    font-family: 'Inter', sans-serif;
  }


  .RegCard {
    width: 100%;
    max-width: 700px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    animation: RegSlideUp 0.35s ease;
  }


  @keyframes RegSlideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Card Header */
  .RegCardHeader {
    background: linear-gradient(135deg, #1E293B 0%, #0f172a 100%);
    padding: 28px 36px 24px;
    border-bottom: 4px solid #0D9488;
    text-align: center;
  }


  .RegSystemBadge {
    display: inline-block;
    background: rgba(13, 148, 136, 0.15);
    border: 1px solid rgba(13, 148, 136, 0.4);
    color: #0D9488;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 3px 12px;
    border-radius: 20px;
    margin-bottom: 10px;
    font-family: 'Poppins', sans-serif;
  }


  .RegCardTitle {
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 6px;
    font-family: 'Poppins', sans-serif;
    letter-spacing: -0.3px;
  }


  .RegCardSubtitle {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
    line-height: 1.5;
  }

  /* Form */
  .RegForm {
    padding: 28px 36px 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }


  .RegFieldRow {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
  }


  .RegFormGroup {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }


  .RegLabel {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    display: flex;
    align-items: center;
    gap: 6px;
  }


  .RegRequired { color: #ef4444; }


  .RegReadonlyTag {
    font-size: 10.5px;
    font-weight: 600;
    color: #0D9488;
    background: rgba(13, 148, 136, 0.1);
    border: 1px solid rgba(13, 148, 136, 0.3);
    padding: 1px 8px;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }


  .RegInputWrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }


  .RegInputIcon {
    position: absolute;
    left: 12px;
    color: #94a3b8;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }


  .RegInput {
    width: 100%;
    height: 44px;
    padding: 11px 12px 11px 38px;
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


  .RegInput:focus {
    border-color: #0D9488;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
  }


  .reg-input-error {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
  }


  .reg-input-readonly {
    background: #f8fafc !important;
    color: #64748b !important;
    border-color: #e2e8f0 !important;
    cursor: default;
  }


  .RegError {
    font-size: 11.5px;
    color: #ef4444;
    margin-top: 2px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
  }

  /* Submit Button */
  .RegSubmitBtn {
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


  .RegSubmitBtn:hover {
    background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(13, 148, 136, 0.4);
  }


  .RegSubmitBtn:active {
    transform: translateY(0);
  }

  /* Success Screen */
  .RegSuccessScreen {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 48px 36px;
    gap: 16px;
  }

  .RegSuccessIconLarge img {
    width: 80px !important;
    animation: RegPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }


  @keyframes RegPop {
    from { transform: scale(0); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }


  .RegSuccessTitle {
    font-size: 22px;
    font-weight: 700;
    color: #111827;
    margin: 0;
    font-family: 'Poppins', sans-serif;
  }


  .RegSuccessDesc {
    font-size: 14px;
    color: #64748b;
    line-height: 1.7;
    margin: 0;
    max-width: 420px;
  }


  .RegSuccessTag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 18px;
    background: #fef3c7;
    border: 1px solid #fde68a;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    color: #92400e;
    margin-top: 4px;
  }

  .RegTimeIcon img {
    width: 16px;
    height: auto;
    display: block;
  }
`;

export default UserRegistration;
