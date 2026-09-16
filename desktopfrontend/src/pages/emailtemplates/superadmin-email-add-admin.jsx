import React from 'react';

/**
 * Superadmin Personnel Invitation Email Template
 * Sent to invited Superadmin personnel with an invitation deep link/button.
 * Props:
 *  - recipientEmail  Email of the invited superadmin
 *  - acceptLink      Invitation link to accept and set up password
 */
const SuperadminEmailAddAdmin = ({
  recipientEmail = 'superadmin.invitee@icmda.gov.ph',
  acceptLink = '/superadmin-invite-status',
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

        .SuperadminEmailBody {
          margin: 0;
          padding: 0;
          font-family: 'Inter', Arial, sans-serif;
          background-color: #f0f4f8;
          color: #333333;
        }

        .SuperadminEmailWrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #f0f4f8;
          padding-top: 40px;
          padding-bottom: 40px;
        }

        .SuperadminEmailCard {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
        }

        /* ── Header ── */
        .SuperadminEmailHeader {
          background: linear-gradient(135deg, #1E293B 0%, #0f172a 100%);
          padding: 32px 24px;
          text-align: center;
          border-bottom: 4px solid #0D9488;
        }

        .SuperadminEmailSystemName {
          color: #0D9488;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin: 0 0 6px;
        }

        .SuperadminEmailHeaderTitle {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.3px;
        }

        .SuperadminEmailHeaderSub {
          color: #94a3b8;
          font-size: 11.5px;
          margin: 6px 0 0;
          letter-spacing: 0.5px;
        }

        /* ── Content ── */
        .SuperadminEmailContent {
          padding: 36px 32px;
        }

        .SuperadminEmailGreeting {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 14px;
          font-family: 'Poppins', sans-serif;
        }

        .SuperadminEmailContent p {
          font-size: 14px;
          line-height: 1.7;
          color: #4b5563;
          margin: 0 0 20px;
        }

        /* ── Expiry Alert Box ── */
        .SuperadminEmailExpiryAlert {
          background: #FFFBEB;
          border: 1px dashed #F59E0B;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 24px;
          text-align: center;
        }

        .SuperadminEmailExpiryAlert p {
          margin: 0 !important;
          font-size: 13px !important;
          color: #B45309 !important;
          font-weight: 600;
        }

        /* ── CTA Button ── */
        .SuperadminEmailCTAWrapper {
          text-align: center;
          margin: 28px 0;
        }

        .SuperadminEmailCTA {
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
        .SuperadminEmailDivider {
          height: 1px;
          background: #e5e7eb;
          margin: 24px 0;
        }

        /* ── Note ── */
        .SuperadminEmailNote {
          font-size: 12.5px !important;
          color: #9ca3af !important;
          font-style: italic;
          text-align: center;
          line-height: 1.6;
        }

        /* ── Footer ── */
        .SuperadminEmailFooter {
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
          padding: 18px 24px;
          text-align: center;
          font-size: 11.5px;
          color: #9ca3af;
        }

        .SuperadminEmailFooter p {
          margin: 4px 0 !important;
          color: #9ca3af !important;
          font-size: 11.5px !important;
        }
      `}</style>

      <div className="SuperadminEmailBody">
        <center className="SuperadminEmailWrapper">
          <table
            className="SuperadminEmailCard"
            role="presentation"
            border="0"
            cellPadding="0"
            cellSpacing="0"
            style={{ borderCollapse: 'collapse' }}
          >
            <tbody>
              {/* HEADER */}
              <tr>
                <td className="SuperadminEmailHeader">
                  <p className="SuperadminEmailSystemName">ICMDA</p>
                  <h2 className="SuperadminEmailHeaderTitle">
                    Interagency Complaint Management Desktop Application
                  </h2>
                  <p className="SuperadminEmailHeaderSub">Super Administrator Invitation</p>
                </td>
              </tr>

              {/* CONTENT */}
              <tr>
                <td className="SuperadminEmailContent">
                  <h3 className="SuperadminEmailGreeting">Hello,</h3>
                  <p>
                    You have been invited to join the <strong style={{ color: '#111827' }}>ICMDA System</strong> as a{' '}
                    <strong style={{ color: '#0D9488' }}>Super Administrator</strong> ({recipientEmail}).
                  </p>
                  <p>
                    As a Super Administrator, you will have access to manage system accounts, audit logs, and overall system administrative privileges.
                  </p>

                  <div className="SuperadminEmailExpiryAlert">
                    <p>⏳ Note: This invitation link expires after 2 days.</p>
                  </div>

                  {/* CTA */}
                  <div className="SuperadminEmailCTAWrapper">
                    <a href={acceptLink} className="SuperadminEmailCTA">
                      Accept Invitation
                    </a>
                  </div>

                  <div className="SuperadminEmailDivider" />

                  <p className="SuperadminEmailNote">
                    If you did not expect this invitation email, please contact the lead system administrator immediately or ignore this message.
                  </p>
                </td>
              </tr>

              {/* FOOTER */}
              <tr>
                <td className="SuperadminEmailFooter">
                  <p>ICMDA — Interagency Complaint Management Desktop Application</p>
                  <p>For authorized Super Administrator use only. This is an automated email. Please do not reply.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </center>
      </div>
    </>
  );
};

export default SuperadminEmailAddAdmin;
