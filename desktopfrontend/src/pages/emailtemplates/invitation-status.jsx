//desktopfrontend/src/pages/emailtemplates/invitation-status.jsx
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ClockAlert, Link, CircleCheckBig } from 'lucide-react'
import { API_BASE_URL } from '../../utils/apiConfig'

function DeepLinkStatus() {
    const location = useLocation()
    const navigate = useNavigate()

    const { status: linkStatus, invite_token } = location.state || {}

    const [requested, setRequested] = useState(false)
    const [resendNotice, setResendNotice] = useState('')
    const [resendSending, setResendSending] = useState(false)

    function handleRequestResend() {
        setResendSending(true)
        fetch(`${API_BASE_URL}/registration/request-resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invite_token }),
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}))
                setResendSending(false)

                if (res.status === 409) {
                    // Already requested (or otherwise already handled) — still show as "sent" so
                    // the user isn't stuck clicking a button that will never succeed.
                    setRequested(true)
                    setResendNotice(data.detail || 'A resend has already been requested for this invitation.')
                    return
                }

                if (!res.ok) {
                    throw new Error(data.detail || 'Request failed')
                }

                setRequested(true)
                setResendNotice('Your request has been sent. Please wait for your administrator.')
            })
            .catch(() => {
                setResendSending(false)
                alert('Something went wrong. Please contact your administrator directly.')
            })
    }

    const statusContent = {
        expired: {
            icon: <ClockAlert size={32} color="#D97706" />,
            iconBg: '#FEF3C7',
            title: 'Invitation Link Expired',
            message: 'Your registration link has expired. Invitation links are only valid for a limited time. Please request a new invitation from your administrator.',
            showButton: !requested,
            buttonLabel: resendSending ? 'Sending Request…' : 'Request New Invitation',
            buttonAction: handleRequestResend,
            accentColor: '#D97706',
        },
        invalid: {
            icon: <Link size={32} color="#DC2626" />,
            iconBg: '#FEE2E2',
            title: 'Invalid Invitation Link',
            message: 'This invitation link is not recognized or may have already been used. If you believe this is an error, please contact your administrator.',
            showButton: false,
            accentColor: '#DC2626',
        },
        used: {
            icon: <CircleCheckBig size={32} color="#0D9488" />,
            iconBg: '#CCFBF1',
            title: 'Registration Already Complete',
            message: 'Your registration has already been completed. You do not need to register again. Please wait for your administrator to activate your account, or login if your account is already active.',
            showButton: true,
            buttonLabel: 'Go to Login',
            buttonAction: () => navigate('/login'),
            accentColor: '#0D9488',
        },
    }

    const content = statusContent[linkStatus]

    if (!content) return <p>Something went wrong.</p>

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap');

                .DeepLinkPage {
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

                .DeepLinkCard {
                    background: #ffffff;
                    border-radius: 16px;
                    padding: 44px 36px;
                    max-width: 480px;
                    width: 100%;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
                    text-align: center;
                    border-top: 4px solid;
                    box-sizing: border-box;
                    animation: DeepLinkSlideUp 0.35s ease;
                }

                @keyframes DeepLinkSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .DeepLinkIconBox {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px auto;
                }

                .DeepLinkTitle {
                    font-family: 'Poppins', sans-serif;
                    font-size: 22px;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 12px;
                    letter-spacing: -0.3px;
                }

                .DeepLinkMessage {
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    color: #4B5563;
                    line-height: 1.7;
                    margin: 0 0 24px;
                }

                .DeepLinkBtn {
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
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
                }

                .DeepLinkBtn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
                }

                .DeepLinkBtn:active {
                    transform: translateY(0);
                }

                .DeepLinkBtn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .DeepLinkSystemName {
                    margin-top: 32px;
                    font-size: 11px;
                    color: #9CA3AF;
                    letter-spacing: 1.2px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .DeepLinkDivider {
                    width: 40px;
                    height: 2px;
                    background: #E5E7EB;
                    margin: 20px auto;
                    border-radius: 2px;
                }

                .DeepLinkAlertBox {
                    background: #F0FDF4;
                    border: 1.5px solid #99F6E4;
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 20px;
                    text-align: left;
                }

                .DeepLinkAlertBox p {
                    font-size: 13px;
                    color: #0D9488;
                    font-weight: 600;
                    margin: 0;
                }
            `}</style>

            <div className='DeepLinkPage'>
                <div
                    className='DeepLinkCard'
                    style={{ borderTopColor: content.accentColor }}
                >
                    <div
                        className='DeepLinkIconBox'
                        style={{ backgroundColor: content.iconBg }}
                    >
                        {content.icon}
                    </div>

                    <h2 className='DeepLinkTitle'>{content.title}</h2>

                    {linkStatus === 'used' && (
                        <div className='DeepLinkAlertBox'>
                            <p>✓ Your registration details have been received.</p>
                        </div>
                    )}

                    <p className='DeepLinkMessage'>{content.message}</p>

                    <div className='DeepLinkDivider' />

                    {content.showButton && (
                        <button
                            className='DeepLinkBtn'
                            style={{ backgroundColor: content.accentColor }}
                            onClick={content.buttonAction}
                            disabled={resendSending}
                        >
                            {content.buttonLabel}
                        </button>
                    )}

                    {linkStatus === 'expired' && requested && (
                        <p className='DeepLinkMessage' style={{ color: '#0D9488', fontWeight: 600, marginTop: 16, marginBottom: 0 }}>
                            ✓ {resendNotice}
                        </p>
                    )}

                    <p className='DeepLinkSystemName'>
                        ICMDA · Interagency Complaint Management
                    </p>
                </div>
            </div>
        </>
    )
}

export default DeepLinkStatus