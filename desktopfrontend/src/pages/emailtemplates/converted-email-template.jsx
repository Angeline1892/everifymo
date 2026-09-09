import React, { useState } from 'react';

/**
 * FDA Product Database Conversion Email Template
 * Sent/generated when an officer converts a product classification:
 *  - Registered -> Unregistered/Advisory
 *  - Unregistered/Advisory -> Registered
 *
 * Props:
 *  - product: Optional product object containing product properties
 *  - productName: Name of the converted product
 *  - registrationNumber: FDA Registration Number (e.g. FDA-NN-100011223344)
 *  - manufacturer: Brand or manufacturer name
 *  - brandName: Alias for manufacturer
 *  - category: Product category (e.g. Cosmetics)
 *  - previousClassification: 'Registered' | 'Unregistered/Advisory'
 *  - newClassification: 'Unregistered/Advisory' | 'Registered'
 *  - conversionDirection: 'to_unregistered' | 'to_registered'
 *  - officerName: Name of the officer who performed the conversion
 *  - convertedBy: Alias for officerName
 *  - officerPosition: Position/title of the officer (e.g. Inspection Officer)
 *  - officerAgency: Agency or department (e.g. Food and Drug Administration)
 *  - officerDepartment: Department name
 *  - officerEmployeeId: Employee ID of the officer
 *  - conversionDate: Timestamp or date string of the conversion
 *  - advisoryDetails: Remarks or advisory details entered during conversion
 *    (Only applicable/collected when converting Registered -> Unregistered.
 *     The Unregistered -> Registered conversion form does not collect this
 *     field, so it is intentionally never shown/fabricated for that direction.)
 *  - sourceUrl: Reference or advisory URL if available
 *  - showPreviewToolbar: Optional boolean to display interactive preview toggle
 */
const ConvertedEmailTemplate = (props) => {
  // Extract data from props or embedded product object
  const rawProduct = props.product || {};

  // Interactive toggle for preview/testing both scenarios if no fixed direction is forced
  const initialDirection = props.conversionDirection || (
    (props.newClassification && props.newClassification.toLowerCase().includes('reg') && !props.newClassification.toLowerCase().includes('unreg'))
      ? 'to_registered'
      : 'to_unregistered'
  );

  const [activeDirection, setActiveDirection] = useState(initialDirection);

  // Determine if props explicitly override or if we use preview defaults
  const isRegisteredToUnregistered = props.conversionDirection
    ? props.conversionDirection === 'to_unregistered'
    : props.newClassification
    ? props.newClassification.toLowerCase().includes('unreg') || props.newClassification.toLowerCase().includes('advis')
    : activeDirection === 'to_unregistered';

  // Safe display helper: never display undefined, null, NaN, or broken placeholders
  const displayValue = (val) => {
    if (val === undefined || val === null) return '-';
    const str = String(val).trim();
    if (str === '' || str === 'undefined' || str === 'null' || str === 'NaN') return '-';
    return str;
  };

  // Safe date formatter
  const formatConversionDate = (dateVal) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return displayValue(dateVal);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }) + ' ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return displayValue(dateVal);
    }
  };

  // Determine classifications dynamically
  const prevClassification = props.previousClassification || (
    isRegisteredToUnregistered ? 'Registered' : 'Unregistered/Advisory'
  );
  const nextClassification = props.newClassification || (
    isRegisteredToUnregistered ? 'Unregistered/Advisory' : 'Registered'
  );

  // Resolve Product Information (props -> rawProduct -> realistic default)
  const resolvedProductName = props.productName || rawProduct.productName || rawProduct.product_name || (
    isRegisteredToUnregistered ? 'Glow Radiance Whitening Cream' : 'Active Whitening Night Gel'
  );

  const resolvedRegNumber = props.registrationNumber !== undefined
    ? props.registrationNumber
    : (rawProduct.registrationNumber || rawProduct.registration_number || (
        isRegisteredToUnregistered ? 'NN-100000123456' : '-'
      ));

  const resolvedManufacturer = props.manufacturer || props.brandName || rawProduct.manufacturer || rawProduct.brand_name || rawProduct.brandName || (
    isRegisteredToUnregistered ? 'Aura Glow Cosmetics Laboratories Inc.' : 'DermaCare Health Products'
  );

  const resolvedCategory = props.category || props.productCategory || rawProduct.category || rawProduct.product_category || 'Cosmetics';

  // Resolve Officer Information (props -> rawProduct -> default)
  const resolvedOfficerName = props.officerName || props.convertedBy || rawProduct.updatedBy || rawProduct.addedBy || 'Maria Santos Cruz';
  const resolvedOfficerPosition = props.officerPosition || props.position || 'Inspection Officer';
  const resolvedOfficerAgency = props.officerAgency || props.agency || props.officerDepartment || props.department || 'Food and Drug Administration';
  const resolvedOfficerEmployeeId = props.officerEmployeeId || props.employeeId || 'FDA-2026-091';

  // Conversion Metadata
  const resolvedDate = props.conversionDate || rawProduct.updatedAt || rawProduct.createdAt || new Date().toISOString();

  // ⚠️ FIXED: Advisory Details / Remarks are only ever collected in the UI when
  // converting Registered -> Unregistered (see "Convert to Unregistered Advisory?"
  // modal, which has a required "Advisory Details" textarea). The reverse flow
  // ("Convert to Registered Product?" modal) never collects this field, so we
  // must NOT fabricate placeholder remarks text for that direction anymore.
  const resolvedAdvisoryDetails = isRegisteredToUnregistered
    ? (
        props.advisoryDetails ||
        props.reason ||
        rawProduct.advisoryDetails ||
        rawProduct.advisory_details ||
        'Product flagged during market inspection due to post-market chemical composition concerns. Reclassified as unregistered advisory pending complete regulatory compliance submission.'
      )
    : null;

  const resolvedSourceUrl = props.sourceUrl || rawProduct.sourceUrl || rawProduct.source_url || '';

  // Whether preview controls should be displayed (can be disabled via prop)
  const showControls = props.showPreviewToolbar ?? (!props.product && !props.productName);

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
            padding-top: 32px;
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

          /* Classification Status Box */
          .EmailConversionBox {
            background-color: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 12px;
            padding: 22px 20px;
            margin-bottom: 24px;
          }
          .EmailConversionBoxTitle {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #64748b;
            text-align: center;
            margin: 0 0 14px;
            font-family: 'Poppins', sans-serif;
          }

          .EmailFlowTable {
            width: 100%;
            border-collapse: collapse;
          }
          .EmailFlowCell {
            text-align: center;
            vertical-align: middle;
            padding: 6px 4px;
          }
          .EmailFlowCellLabel {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #64748b;
            margin: 0 0 6px;
          }
          .EmailFlowArrowCell {
            text-align: center;
            vertical-align: middle;
            width: 40px;
            padding: 0 4px;
          }
          .EmailFlowArrow {
            font-size: 20px;
            line-height: 1;
            color: #0D9488;
            font-weight: 700;
          }

          /* Status Badges */
          .EmailBadge {
            display: inline-block;
            padding: 6px 14px;
            font-size: 11.5px;
            font-weight: 700;
            border-radius: 20px;
            font-family: 'Poppins', sans-serif;
            letter-spacing: 0.3px;
            white-space: nowrap;
          }
          .BadgeRegistered {
            background-color: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
          }
          .BadgeAdvisory {
            background-color: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
          }

          /* Product Information Table */
          .EmailInfoBox {
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 24px;
          }
          .EmailInfoBoxHeader {
            background-color: #f1f5f9;
            padding: 12px 18px;
            border-bottom: 1px solid #e2e8f0;
          }
          .EmailInfoBoxTitle {
            margin: 0;
            font-size: 12px;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-family: 'Poppins', sans-serif;
          }
          .EmailInfoTable {
            width: 100%;
            border-collapse: collapse;
          }
          .EmailInfoRow td {
            padding: 11px 18px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
            line-height: 1.5;
          }
          .EmailInfoRow:last-child td {
            border-bottom: none;
          }
          .EmailInfoLabel {
            width: 38%;
            color: #64748b;
            font-weight: 600;
            vertical-align: top;
          }
          .EmailInfoValue {
            width: 62%;
            color: #1e293b;
            font-weight: 500;
            vertical-align: top;
            text-align: right;
            word-break: break-word;
          }
          .EmailInfoValueHighlight {
            color: #0f172a;
            font-weight: 700;
          }
          .EmailOfficerMeta {
            display: block;
            font-size: 11px;
            color: #64748b;
            margin-top: 3px;
            font-weight: 400;
          }

          .EmailDivider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 24px 0;
          }

          /* Regulatory Notice */
          .EmailNotice {
            font-size: 12.5px;
            line-height: 1.6;
            color: #64748b;
          }
          .EmailNoticeTitle {
            font-weight: 600;
            color: #334155;
            margin-bottom: 6px;
          }
          .EmailNotice ul {
            padding: 0 0 0 18px;
            margin: 6px 0 0;
          }
          .EmailNotice li {
            margin-bottom: 6px;
          }

          /* Footer */
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

          /* Preview Toolbar */
          .PreviewToolbar {
            max-width: 520px;
            margin: 0 auto 16px auto;
            padding: 10px 14px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          }
          .PreviewToolbarLabel {
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            font-family: 'Poppins', sans-serif;
          }
          .PreviewButtonGroup {
            display: flex;
            gap: 8px;
          }
          .PreviewBtn {
            padding: 6px 12px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            color: #334155;
            transition: all 0.15s ease;
          }
          .PreviewBtn.active {
            background: #0D9488;
            color: #ffffff;
            border-color: #0D9488;
            box-shadow: 0 2px 6px rgba(13, 148, 136, 0.25);
          }
        `}
      </style>

      <div className="EmailBody">
        <center className="EmailWrapper">
          {/* Interactive Scenario Switcher for Email Preview Testing */}
          {showControls && (
            <div className="PreviewToolbar">
              <span className="PreviewToolbarLabel">Test Conversion Direction:</span>
              <div className="PreviewButtonGroup">
                <button
                  type="button"
                  className={`PreviewBtn ${isRegisteredToUnregistered ? 'active' : ''}`}
                  onClick={() => setActiveDirection('to_unregistered')}
                >
                  Registered → Unregistered
                </button>
                <button
                  type="button"
                  className={`PreviewBtn ${!isRegisteredToUnregistered ? 'active' : ''}`}
                  onClick={() => setActiveDirection('to_registered')}
                >
                  Unregistered → Registered
                </button>
              </div>
            </div>
          )}

          <table className="EmailMainCard EmailTable" role="presentation" border="0" cellPadding="0" cellSpacing="0">
            {/* ── HEADER ── */}
            <tbody>
              <tr>
                <td className="EmailHeader">
                  <p className="EmailSystemName">ICMDA</p>
                  <h2 className="EmailHeaderTitle">
                    Interagency Complaint Management Desktop Application
                  </h2>
                  <p className="EmailHeaderSub">Product Classification Update</p>
                </td>
              </tr>

              {/* ── CONTENT ── */}
              <tr>
                <td className="EmailContent">
                  <h3 className="EmailGreeting">Product Classification Notice</h3>

                  <p className="EmailInstructions">
                    A product classification has been updated in the Interagency Complaint Management Desktop Application.
                    The regulatory classification for <strong>{displayValue(resolvedProductName)}</strong> has been officially changed from{' '}
                    <strong>{displayValue(prevClassification)}</strong> to <strong>{displayValue(nextClassification)}</strong>.
                  </p>

                  {/* ── CLASSIFICATION STATUS TRANSITION BOX ── */}
                  <div className="EmailConversionBox">
                    <p className="EmailConversionBoxTitle">Classification Status Transition</p>
                    <table className="EmailFlowTable" role="presentation" border="0" cellPadding="0" cellSpacing="0">
                      <tbody>
                        <tr>
                          {/* PREVIOUS */}
                          <td className="EmailFlowCell">
                            <p className="EmailFlowCellLabel">Previous Status</p>
                            <span
                              className={`EmailBadge ${
                                prevClassification.toLowerCase().includes('unreg') || prevClassification.toLowerCase().includes('advis')
                                  ? 'BadgeAdvisory'
                                  : 'BadgeRegistered'
                              }`}
                            >
                              {displayValue(prevClassification)}
                            </span>
                          </td>

                          {/* ARROW */}
                          <td className="EmailFlowArrowCell">
                            <span className="EmailFlowArrow">➔</span>
                          </td>

                          {/* NEW */}
                          <td className="EmailFlowCell">
                            <p className="EmailFlowCellLabel">New Status</p>
                            <span
                              className={`EmailBadge ${
                                nextClassification.toLowerCase().includes('unreg') || nextClassification.toLowerCase().includes('advis')
                                  ? 'BadgeAdvisory'
                                  : 'BadgeRegistered'
                              }`}
                            >
                              {displayValue(nextClassification)}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* ── PRODUCT INFORMATION TABLE ── */}
                  <div className="EmailInfoBox">
                    <div className="EmailInfoBoxHeader">
                      <h4 className="EmailInfoBoxTitle">Product & Conversion Details</h4>
                    </div>

                    <table className="EmailInfoTable" role="presentation" border="0" cellPadding="0" cellSpacing="0">
                      <tbody>
                        <tr className="EmailInfoRow">
                          <td className="EmailInfoLabel">Product Name</td>
                          <td className="EmailInfoValue EmailInfoValueHighlight">{displayValue(resolvedProductName)}</td>
                        </tr>

                        <tr className="EmailInfoRow">
                          <td className="EmailInfoLabel">Registration No.</td>
                          <td className="EmailInfoValue">{displayValue(resolvedRegNumber)}</td>
                        </tr>

                        <tr className="EmailInfoRow">
                          <td className="EmailInfoLabel">Manufacturer / Brand</td>
                          <td className="EmailInfoValue">{displayValue(resolvedManufacturer)}</td>
                        </tr>

                        <tr className="EmailInfoRow">
                          <td className="EmailInfoLabel">Product Category</td>
                          <td className="EmailInfoValue">{displayValue(resolvedCategory)}</td>
                        </tr>

                        <tr className="EmailInfoRow">
                          <td className="EmailInfoLabel">Previous Classification</td>
                          <td className="EmailInfoValue">{displayValue(prevClassification)}</td>
                        </tr>

                        <tr className="EmailInfoRow">
                          <td className="EmailInfoLabel">New Classification</td>
                          <td className="EmailInfoValue EmailInfoValueHighlight">{displayValue(nextClassification)}</td>
                        </tr>

                        <tr className="EmailInfoRow">
                          <td className="EmailInfoLabel">Converted By</td>
                          <td className="EmailInfoValue">
                            <span className="EmailInfoValueHighlight">{displayValue(resolvedOfficerName)}</span>
                            {(resolvedOfficerPosition || resolvedOfficerAgency || resolvedOfficerEmployeeId) && (
                              <span className="EmailOfficerMeta">
                                {[
                                  resolvedOfficerPosition !== '-' ? resolvedOfficerPosition : null,
                                  resolvedOfficerAgency !== '-' ? resolvedOfficerAgency : null,
                                  resolvedOfficerEmployeeId !== '-' ? `ID: ${resolvedOfficerEmployeeId}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            )}
                          </td>
                        </tr>

                        <tr className="EmailInfoRow">
                          <td className="EmailInfoLabel">Conversion Date</td>
                          <td className="EmailInfoValue">{formatConversionDate(resolvedDate)}</td>
                        </tr>

                        {/* Details / Remarks — ONLY shown for Registered -> Unregistered conversions,
                            since that is the only direction whose form actually collects this field. */}
                        {isRegisteredToUnregistered && resolvedAdvisoryDetails && resolvedAdvisoryDetails !== '-' && (
                          <tr className="EmailInfoRow">
                            <td className="EmailInfoLabel">Details / Remarks</td>
                            <td className="EmailInfoValue" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                              {displayValue(resolvedAdvisoryDetails)}
                            </td>
                          </tr>
                        )}

                        {resolvedSourceUrl && resolvedSourceUrl !== '-' && (
                          <tr className="EmailInfoRow">
                            <td className="EmailInfoLabel">Source Reference</td>
                            <td className="EmailInfoValue" style={{ fontSize: '12px' }}>
                              <a
                                href={resolvedSourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#0D9488', textDecoration: 'underline', wordBreak: 'break-all' }}
                              >
                                {displayValue(resolvedSourceUrl)}
                              </a>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="EmailInstructions" style={{ marginBottom: 0 }}>
                    This notification has been automatically recorded in the system audit logs. The product database
                    and public advisory registries have been synchronized with these updated details.
                  </p>

                  <div className="EmailDivider"></div>

                  {/* ── REGULATORY NOTICE ── */}
                  <div className="EmailNotice">
                    <div className="EmailNoticeTitle">Regulatory Information:</div>
                    <ul>
                      <li>This classification change was authorized by the designated regulatory officer identified above.</li>
                      <li>Updated product classifications are synchronized immediately with the verification engine and e-marketplace monitoring feeds.</li>
                      <li>For questions or administrative revisions regarding this record, coordinate with the FDA Database Administrator.</li>
                    </ul>
                  </div>
                </td>
              </tr>

              {/* ── FOOTER ── */}
              <tr>
                <td className="EmailFooter">
                  <p>ICMDA — Interagency Complaint Management Desktop Application</p>
                  <p>For authorized personnel use only. This is an automated email. Please do not reply.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </center>
      </div>
    </>
  );
};

export default ConvertedEmailTemplate;