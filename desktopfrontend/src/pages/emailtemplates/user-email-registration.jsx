import React from 'react';

/** 
 * HTML email template sent to invited personnel with a registration deep link.
 * Props:
 *  - agencyName    Name of the agency
 *  - deepLink      Deep link URL to open the registration page inside the desktop app
 */
const UserEmailRegistration = ({
  agencyName = 'Your Agency',
  deepLink = 'icmda://register?token=SAMPLE_TOKEN',
}) => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap');

        :root {
          --font-headings: 'Poppins', sans-serif;
          --font-body: 'Inter', sans-serif;
        }

        h1, h2, h3, h4, h5, h6 {
          font-family: var(--font-headings);
          font-weight: 600;
        }

        .RegEmailBody {
          margin: 0;
          padding: 0;
          font-family: 'Inter', Arial, sans-serif;
          background-color: #f0f4f8;
          color: #333333;
        }
        .RegEmailWrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #f0f4f8;
          padding-top: 40px;
          padding-bottom: 40px;
        }
        .RegEmailCard {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
        }

        /* ── Header ── */
        .RegEmailHeader {
          background: linear-gradient(135deg, #1E293B 0%, #0f172a 100%);
          padding: 32px 24px;
          text-align: center;
          border-bottom: 4px solid #0D9488;
        }
        .RegEmailSystemName {
          color: #0D9488;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin: 0 0 6px;
        }
        .RegEmailHeaderTitle {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.3px;
        }
        .RegEmailHeaderSub {
          color: #94a3b8;
          font-size: 11.5px;
          margin: 6px 0 0;
          letter-spacing: 0.5px;
        }

        /* ── Content ── */
        .RegEmailContent {
          padding: 36px 32px;
        }
        .RegEmailGreeting {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 14px;
          font-family: 'Poppins', sans-serif;
        }
        .RegEmailBody p {
          font-size: 14px;
          line-height: 1.7;
          color: #4b5563;
          margin: 0 0 20px;
        }

        /* ── CTA Button ── */
        .RegEmailCTAWrapper {
          text-align: center;
          margin: 28px 0;
        }
        .RegEmailCTA {
          display: inline-block;
          padding: 13px 32px;
          background: linear-gradient(135deg, #0D9488 0%, #0f766e 100%);
          color: #ffffff !important;
          text-decoration: none;
          font-family: 'Poppins', sans-serif;
          font-size: 14px;
          font-weight: 700;
          border-radius: 10px;
          letter-spacing: 0.3px;
          box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
        }

        /* ── Divider ── */
        .RegEmailDivider {
          height: 1px;
          background: #e5e7eb;
          margin: 24px 0;
        }

        /* ── Note ── */
        .RegEmailNote {
          font-size: 12.5px !important;
          color: #9ca3af !important;
          font-style: italic;
          text-align: center;
          line-height: 1.6;
        }

        /* ── Footer ── */
        .RegEmailFooter {
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
          padding: 18px 24px;
          text-align: center;
          font-size: 11.5px;
          color: #9ca3af;
        }
        .RegEmailFooter p {
          margin: 4px 0 !important;
          color: #9ca3af !important;
          font-size: 11.5px !important;
        }
      `}</style>

      <div className="RegEmailBody">
        <center className="RegEmailWrapper">
          <table
            className="RegEmailCard"
            role="presentation"
            border="0"
            cellPadding="0"
            cellSpacing="0"
            style={{ borderCollapse: 'collapse' }}
          >
            <tbody>
              {/* HEADER */}
              <tr>
                <td className="RegEmailHeader">
                  <p className="RegEmailSystemName">ICMDA</p>
                  <h2 className="RegEmailHeaderTitle">
                    Interagency Complaint Management Desktop Application
                  </h2>
                  <p className="RegEmailHeaderSub">Personnel Registration Invitation</p>
                </td>
              </tr>

              {/* CONTENT */}
              <tr>
                <td className="RegEmailContent">
                  <h3 className="RegEmailGreeting">Hello,</h3>
                  <p>
                    You have been invited to register as a personnel of{' '}
                    <strong style={{ color: '#111827' }}>{agencyName}</strong>. Your account has
                    been created and is awaiting your registration to be completed.
                  </p>
                  <p>
                    Click the button below to complete your registration. This link will open the{' '}
                    <strong style={{ color: '#111827' }}>ICMDA desktop application</strong> and
                    guide you through filling in your personnel details.
                  </p>

                  {/* CTA */}
                  <div className="RegEmailCTAWrapper">
                    <a href={deepLink} className="RegEmailCTA">
                      Complete Registration
                    </a>
                  </div>

                  <div className="RegEmailDivider" />

                  <p className="RegEmailNote">
                    If you did not expect this email, you may safely ignore it. No action will be
                    taken unless you click the link above.
                  </p>
                </td>
              </tr>

              {/* FOOTER */}
              <tr>
                <td className="RegEmailFooter">
                  <p>ICMDA — Interagency Complaint Management Desktop Application</p>
                  <p>This is an automated message. Please do not reply.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </center>
      </div>
    </>
  );
};

export default UserEmailRegistration;