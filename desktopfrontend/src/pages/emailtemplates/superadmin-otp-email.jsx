

import React from 'react';

/**
 * Superadmin OTP Email Template
 * Sent to Superadmin personnel during login verification.
 * Props:
 *  - otpCode  6-digit verification code
 */
const SuperadminOtpEmail = ({ otpCode = "123456" }) => {
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700;800&display=swap');

          :root {
            --font-headings: 'Poppins', sans-serif;
            --font-body: 'Inter', sans-serif;
          }

          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-headings);
            font-weight: 600;
          }

          .EmailBody {
            margin: 0;
            padding: 0;
            font-family: 'Inter', Arial, sans-serif;
            background-color: #f0f4f8;
            color: #333333;
          }
          .EmailTable {
            border-collapse: collapse;
          }
          .EmailWrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f0f4f8;
            padding-top: 40px;
            padding-bottom: 40px;
          }
          .EmailMainCard {
            width: 100%;
            max-width: 520px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
          }

          /* Header */
          .EmailHeader {
            background: linear-gradient(135deg, #1E293B 0%, #0f172a 100%);
            padding: 32px 24px;
            text-align: center;
            border-bottom: 4px solid #0D9488;
          }
          .EmailSystemName {
            color: #0D9488;
            font-family: 'Poppins', sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin: 0 0 6px;
          }
          .EmailHeaderTitle {
            color: #ffffff;
            font-family: 'Poppins', sans-serif;
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 0.3px;
          }
          .EmailHeaderSub {
            color: #94a3b8;
            font-size: 11.5px;
            margin: 6px 0 0;
            letter-spacing: 0.5px;
          }

          /* Content */
          .EmailContent {
            padding: 36px 32px;
          }
          .EmailGreeting {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 14px;
            color: #111827;
            font-family: 'Poppins', sans-serif;
          }
          .EmailInstructions {
            font-size: 14px;
            line-height: 1.7;
            color: #4b5563;
            margin: 0 0 24px;
          }
          .EmailOtpBox {
            background-color: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin-bottom: 24px;
          }
          .EmailOtpCode {
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 6px;
            color: #0D9488;
            margin: 0;
            font-family: 'Courier New', Courier, monospace;
          }
          .EmailExpiryAlert {
            font-size: 13px;
            color: #dc2626;
            margin: 8px 0 0 0;
            font-weight: 500;
          }
          .EmailDivider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 24px 0;
          }
          .EmailSecurityNotice {
            font-size: 12.5px;
            line-height: 1.6;
            color: #64748b;
          }
          .EmailSecurityNoticeTitle {
            font-weight: 600;
            color: #334155;
            margin-bottom: 6px;
          }
          .EmailFooter {
            background-color: #f8fafc;
            border-top: 1px solid #e5e7eb;
            padding: 18px 24px;
            text-align: center;
            font-size: 11.5px;
            color: #94a3b8;
          }
          .EmailFooter p {
            margin: 4px 0 !important;
            color: #9ca3af !important;
            font-size: 11.5px !important;
          }
          ul {
            padding: 0 0 0 18px;
            margin: 6px 0 0;
          }
          li {
            margin-bottom: 6px;
          }
        `}
      </style>
      <div className="EmailBody">
        <center className="EmailWrapper">
          <table className="EmailMainCard EmailTable" role="presentation" border="0" cellPadding="0" cellSpacing="0">
            {/* HEADER */}
            <tbody>
              <tr>
                <td className="EmailHeader">
                  <p className="EmailSystemName">ICMDA</p>
                  <h2 className="EmailHeaderTitle">
                    Interagency Complaint Management Desktop Application
                  </h2>
                  <p className="EmailHeaderSub">Super Administrator Security Verification</p>
                </td>
              </tr>
              
              {/* CONTENT */}
              <tr>
                <td className="EmailContent">
                  <h3 className="EmailGreeting">Security Verification Code</h3>
                  <p className="EmailInstructions">
                    We received a request to access your Interagency Complaint Management System account with Super Administrator privileges. Please use the following One-Time Password (OTP) to complete your login. This code is valid for single use only.
                  </p>
                  
                  <div className="EmailOtpBox">
                    <h1 className="EmailOtpCode">{otpCode}</h1>
                    <p className="EmailExpiryAlert">This code will expire in 5 minutes.</p>
                  </div>
                  
                  <p className="EmailInstructions" style={{ marginBottom: 0 }}>
                    If you did not request this verification code, do not proceed with the login. Immediately review your account security, change your password if necessary, and investigate any suspicious activity.
                  </p>
                  
                  <div className="EmailDivider"></div>
                  
                  <div className="EmailSecurityNotice">
                    <div className="EmailSecurityNoticeTitle">Security Information:</div>
                    <ul>
                      <li>Never share this verification code with anyone.</li>
                      <li>This Super Administrator account has full system privileges. Always ensure you are signing in to the official administrator portal.</li>
                      <li>If you did not request this verification code, immediately secure your account and inform the system owner.</li>
                    </ul>
                  </div>
                </td>
              </tr>
              
              {/* FOOTER */}
              <tr>
                <td className="EmailFooter">
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

export default SuperadminOtpEmail;
