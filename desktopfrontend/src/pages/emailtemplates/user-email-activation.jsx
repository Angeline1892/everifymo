import React from 'react';

/**

 * HTML email template sent after a superadmin activates a user account.
 * Props:
 *  - fullName            User's full name
 *  - email               User's registered email
 *  - temporaryPassword   System-generated temporary password
 */
const UserEmailActivation = ({
  fullName = 'Juan Dela Cruz',
  email = 'juan.delacruz@email.com',
  temporaryPassword = 'TempP@ss2024!',
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

        .ActEmailBody {
          margin: 0;
          padding: 0;
          font-family: 'Inter', Arial, sans-serif;
          background-color: #f0f4f8;
          color: #333333;
        }
        .ActEmailWrapper {
          width: 100%;
          table-layout: fixed;
          background-color: #f0f4f8;
          padding-top: 40px;
          padding-bottom: 40px;
        }
        .ActEmailCard {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
        }

        /* ── Header ── */
        .ActEmailHeader {
          background: linear-gradient(135deg, #1E293B 0%, #0f172a 100%);
          padding: 32px 24px;
          text-align: center;
          border-bottom: 4px solid #0D9488;
        }
        .ActEmailSystemName {
          color: #0D9488;
          font-family: 'Poppins', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin: 0 0 6px;
        }
        .ActEmailHeaderTitle {
          color: #ffffff;
          font-family: 'Poppins', sans-serif;
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 0.3px;
        }
        .ActEmailHeaderSub {
          color: #94a3b8;
          font-size: 11.5px;
          margin: 6px 0 0;
          letter-spacing: 0.5px;
        }

        /* ── Activated Banner ── */
        .ActEmailBanner {
         
          padding: 16px 24px;
          text-align: center;
        }
        .ActEmailBannerIcon {
          font-size: 28px;
          margin-bottom: 4px;
          display: block;
        }
        .ActEmailBannerText {
          font-family: 'Poppins', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #166534;
          margin: 0;
        }

        /* ── Content ── */
        .ActEmailContent {
          padding: 36px 32px;
        }
        .ActEmailGreeting {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 14px;
          font-family: 'Poppins', sans-serif;
        }
        .ActEmailBody p {
          font-size: 14px;
          line-height: 1.7;
          color: #4b5563;
          margin: 0 0 20px;
        }

        /* ── Credentials Box ── */
        .ActEmailCredentials {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px 20px;
          margin: 20px 0 24px;
        }
        .ActEmailCredTitle {
          font-family: 'Poppins', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: #1E293B;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .ActEmailCredRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px dashed #e2e8f0;
        }
        .ActEmailCredRow:last-child {
          border-bottom: none;
        }
        .ActEmailCredLabel {
          font-size: 12.5px;
          color: #64748b;
          font-weight: 500;
        }
        .ActEmailCredValue {
          font-size: 13.5px;
          color: #111827;
          font-weight: 700;
          font-family: 'Courier New', Courier, monospace;
          background: #e2e8f0;
          padding: 3px 10px;
          border-radius: 6px;
          letter-spacing: 0.5px;
          max-width: 260px;
          word-break: break-all;
          text-align: right;
        }

        /* ── Divider ── */
        .ActEmailDivider {
          height: 1px;
          background: #e5e7eb;
          margin: 24px 0;
        }

        /* ── Security Note ── */
        .ActEmailSecurityBox {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }
        .ActEmailSecurityTitle {
          font-size: 12.5px;
          font-weight: 700;
          color: #b45309;
          margin: 0 0 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ActEmailSecurityText {
          font-size: 12.5px !important;
          color: #92400e !important;
          margin: 0 !important;
          line-height: 1.6 !important;
        }

        /* ── Footer ── */
        .ActEmailFooter {
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
          padding: 18px 24px;
          text-align: center;
          font-size: 11.5px;
          color: #9ca3af;
        }
        .ActEmailFooter p {
          margin: 4px 0 !important;
          color: #9ca3af !important;
          font-size: 11.5px !important;
        }
      `}</style>

      <div className="ActEmailBody">
        <center className="ActEmailWrapper">
          <table
            className="ActEmailCard"
            role="presentation"
            border="0"
            cellPadding="0"
            cellSpacing="0"
            style={{ borderCollapse: 'collapse' }}
          >
            <tbody>
              {/* HEADER */}
              <tr>
                <td className="ActEmailHeader">
                  <p className="ActEmailSystemName">ICMDA</p>
                  <h2 className="ActEmailHeaderTitle">
                    Interagency Complaint Management Desktop Application
                  </h2>
                  <p className="ActEmailHeaderSub">Account Activation Notice</p>
                </td>
              </tr>

              {/* ACTIVATED BANNER */}
              <tr>
                <td className="ActEmailBanner">
                  <span className="ActEmailBannerIcon">✅</span>
                  <p className="ActEmailBannerText">Your account has been activated!</p>
                </td>
              </tr>

              {/* CONTENT */}
              <tr>
                <td className="ActEmailContent">
                  <h3 className="ActEmailGreeting">Hello, {fullName}!</h3>
                  <p>
                    Your ICMDA personnel account has been reviewed and successfully activated by the
                    system administrator. You may now log in to the ICMDA desktop application using
                    the credentials below.
                  </p>

                  {/* Credentials Box */}
                  <div className="ActEmailCredentials">
                    <p className="ActEmailCredTitle">🔐 Login Credentials</p>
                    <div className="ActEmailCredRow">
                      <span className="ActEmailCredLabel">Email</span>
                      <span className="ActEmailCredValue">{email}</span>
                    </div>
                    <div className="ActEmailCredRow">
                      <span className="ActEmailCredLabel">Temporary Password</span>
                      <span className="ActEmailCredValue">{temporaryPassword}</span>
                    </div>
                  </div>

                  <p>
                    Please login to the ICMDA desktop application using the credentials above.{' '}
                    <strong style={{ color: '#111827' }}>
                      You will be required to change your password upon first login.
                    </strong>
                  </p>

                  <div className="ActEmailDivider" />

                  {/* Security Note */}
                  <div className="ActEmailSecurityBox">
                    <p className="ActEmailSecurityTitle">⚠️ Security Notice</p>
                    <p className="ActEmailSecurityText">
                      Do not share your credentials with anyone, including system administrators.
                      The ICMDA system will never ask for your password.
                    </p>
                  </div>
                </td>
              </tr>

              {/* FOOTER */}
              <tr>
                <td className="ActEmailFooter">
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

export default UserEmailActivation;