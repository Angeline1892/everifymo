// desktopfrontend/src/pages/emailtemplates/superadmin-invite-status.jsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClockAlert, Link, CircleCheckBig, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../../utils/apiConfig';

function SuperadminInviteStatus() {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const initialStatus = location.state?.status || queryParams.get('status') || 'invalid';
  const inviteToken = location.state?.token || queryParams.get('token') || '';

  const [linkStatus] = useState(initialStatus);
  const [requested, setRequested] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [resendSending, setResendSending] = useState(false);

  const handleRequestNewInvite = async () => {
    setResendSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/registration/request-resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_token: inviteToken }),
      });

      const data = await response.json().catch(() => ({}));
      setResendSending(false);

      if (response.status === 409) {
        setRequested(true);
        setResendNotice(data.detail || 'A resend has already been requested for this invitation.');
        return;
      }

      if (!response.ok) {
        console.error('Failed to request new invite:', data.detail);
        alert('Something went wrong. Please contact your lead system administrator directly.');
        return;
      }

      setRequested(true);
      setResendNotice('Your request has been sent. Please wait for your administrator.');
    } catch (err) {
      setResendSending(false);
      console.error('Error requesting new invite:', err);
      alert('Something went wrong. Please contact your lead system administrator directly.');
    }
  };

  const statusContent = {
    valid: {
      icon: <CircleCheckBig size={32} color="#0D9488" />,
      iconBg: '#CCFBF1',
      title: 'Valid Invitation Link',
      message: 'Your invitation link is valid. You can proceed to set up your Superadmin password.',
      showButton: true,
      buttonLabel: 'Proceed to Create Password',
      buttonAction: () => navigate('/create-new-password', { state: { token: inviteToken } }),
      accentColor: '#0D9488',
    },
    expired: {
      icon: <ClockAlert size={32} color="#D97706" />,
      iconBg: '#FEF3C7',
      title: 'Invitation Expired',
      message: 'Your Superadmin invitation link has expired. Invitation links are only valid for 2 days. Please request a new invitation from your administrator.',
      showButton: !requested,
      buttonLabel: resendSending ? 'Sending Request…' : 'Request New Invitation',
      buttonAction: handleRequestNewInvite,
      accentColor: '#D97706',
    },
    used: {
      icon: <CircleCheckBig size={32} color="#0D9488" />,
      iconBg: '#CCFBF1',
      title: 'Invitation Already Accepted',
      message: 'This invitation has already been accepted and used to set up a Superadmin account. You can proceed to log in to the Superadmin portal.',
      showButton: true,
      buttonLabel: 'Go to Superadmin Login',
      buttonAction: () => navigate('/superadmin-login'),
      accentColor: '#0D9488',
    },
    invalid: {
      icon: <Link size={32} color="#DC2626" />,
      iconBg: '#FEE2E2',
      title: 'Invalid Invitation Link',
      message: 'This Superadmin invitation link is invalid or unrecognized. If you believe this is an error, please contact your lead system administrator.',
      showButton: false,
      accentColor: '#DC2626',
    },
  };

  const content = statusContent[linkStatus] || statusContent.invalid;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap');

        .SuperadminInvitePage {
          min-height: 100vh;
          background-color: #F1F5F9;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          font-family: 'Inter', sans-serif;
          box-sizing: border-box;
        }

        .SuperadminInviteCard {
          background: #ffffff;
          border-radius: 16px;
          padding: 44px 36px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
          text-align: center;
          border-top: 4px solid;
          animation: InviteSlideUp 0.35s ease;
          box-sizing: border-box;
        }

        @keyframes InviteSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .SuperadminInviteIconBox {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px auto;
        }

        .SuperadminInviteTitle {
          font-family: 'Poppins', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 12px;
          letter-spacing: -0.3px;
        }

        .SuperadminInviteMessage {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #4B5563;
          line-height: 1.7;
          margin: 0 0 24px;
        }

        .SuperadminInviteBtn {
          width: 100%;
          padding: 12px 24px;
          border: none;
          border-radius: 10px;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.3px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }

        .SuperadminInviteBtn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
        }

        .SuperadminInviteBtn:active {
          transform: translateY(0);
        }

        .SuperadminInviteBtn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .SuperadminInviteSystemName {
          margin-top: 32px;
          font-size: 11px;
          color: #9CA3AF;
          letter-spacing: 1.2px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .SuperadminInviteDivider {
          width: 40px;
          height: 2px;
          background: #E5E7EB;
          margin: 20px auto;
          border-radius: 2px;
        }
      `}</style>

      <div className="SuperadminInvitePage">
        <div
          className="SuperadminInviteCard"
          style={{ borderTopColor: content.accentColor }}
        >
          <div
            className="SuperadminInviteIconBox"
            style={{ backgroundColor: content.iconBg }}
          >
            {content.icon}
          </div>

          <h2 className="SuperadminInviteTitle">{content.title}</h2>

          <p className="SuperadminInviteMessage">{content.message}</p>

          <div className="SuperadminInviteDivider" />

          {content.showButton && (
            <button
              className="SuperadminInviteBtn"
              style={{ backgroundColor: content.accentColor }}
              onClick={content.buttonAction}
              disabled={resendSending}
            >
              {content.buttonLabel} <ArrowRight size={16} />
            </button>
          )}

          {linkStatus === 'expired' && requested && (
            <p className="SuperadminInviteMessage" style={{ color: '#0D9488', fontWeight: 600, marginTop: 16, marginBottom: 0 }}>
              ✓ {resendNotice}
            </p>
          )}

          <p className="SuperadminInviteSystemName">
            ICMDA · Superadmin Management
          </p>
        </div>
      </div>
    </>
  );
}

export default SuperadminInviteStatus;