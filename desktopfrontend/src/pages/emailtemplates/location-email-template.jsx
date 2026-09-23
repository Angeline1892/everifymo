// desktopfrontend/src/pages/emailtemplates/location-email-template.jsx
import React, { useState } from 'react';
import FDALogo from '../../images/FDA.png';
import CIDGLogo from '../../images/pnp-cidg.jpg';

// ⚠️ REMOVE THIS — mock data
// Default sample mock data for FDA and LEA administrative previews.
const FDA_MOCK_DATA = {
  agency: 'FDA',
  personnel_name: 'Juan Dela Cruz',
  personnel_email: 'jdelacruz@fda.gov.ph',
  login_at: 'Sep 20, 2026, 7:48 AM',
  distance: '61.8 km',
  workspace_name: 'FDA Region III office',
  radius_meters: 500,
  detection_source: 'device GPS',
  footer_agency_region: 'Regional Office III',
};

const LEA_MOCK_DATA = {
  agency: 'LEA',
  personnel_name: 'Juan Dela Cruz',
  personnel_email: 'jdelacruz@cidg.gov.ph',
  login_at: 'Sep 20, 2026, 7:48 AM',
  distance: '61.8 km',
  workspace_name: 'CIDG Region III office',
  radius_meters: 500,
  detection_source: 'device GPS',
  footer_agency_region: 'Regional Field Unit III',
};

// 🔌 BACKEND: Note on Logos in Production Emails:
// Local module imports (FDALogo, CIDGLogo) resolve inside the Vite bundler for preview.
// In production SMTP email dispatch, the backend must replace local images with absolute
// hosted HTTPS image URLs (e.g. https://your-domain.gov.ph/images/fda.png).
const THEMES = {
  FDA: {
    agencyKey: 'FDA',
    displayName: 'Food and Drug Administration',
    systemName: 'ICMDA · FDA Admin',
    headerBg: 'linear-gradient(135deg, #1f2937 0%, #1B4332 100%)',
    headerBorder: '#065f46',
    accentColor: '#065f46',
    badgeBg: '#ecfdf5',
    badgeText: '#065f46',
    badgeBorder: '#a7f3d0',
    logoSrc: FDALogo,
    logoAlt: 'FDA Logo',
  },
  LEA: {
    agencyKey: 'LEA',
    displayName: 'PNP Criminal Investigation and Detection Group',
    systemName: 'ICMDA · LEA Admin',
    headerBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    headerBorder: '#1d4ed8',
    accentColor: '#1d4ed8',
    badgeBg: '#eff6ff',
    badgeText: '#1e40af',
    badgeBorder: '#bfdbfe',
    logoSrc: CIDGLogo,
    logoAlt: 'PNP-CIDG Logo',
  },
};

// Distance formatting helper:
// Number < 1000 is displayed in meters ("850 m");
// 1000 or more is displayed in km with one decimal ("61.8 km").
// String values are displayed as given.
function formatDistance(dist) {
  if (typeof dist === 'number') {
    if (dist < 1000) return `${Math.round(dist)} m`;
    return `${(dist / 1000).toFixed(1)} km`;
  }
  if (typeof dist === 'string') {
    const trimmed = dist.trim();
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') {
      if (num < 1000) return `${Math.round(num)} m`;
      return `${(num / 1000).toFixed(1)} km`;
    }
    return trimmed;
  }
  return '—';
}

const LocationEmailTemplate = ({
  agency: propAgency,
  personnelName: propPersonnelName,
  personnelEmail: propPersonnelEmail,
  loginAt: propLoginAt,
  distance: propDistance,
  workspaceName: propWorkspaceName,
  radiusMeters: propRadiusMeters,
  detectionSource: propDetectionSource,
  footerAgencyRegion: propFooterAgencyRegion,
  showPreviewToolbar = true,
}) => {
  // Interactive preview state (used when viewing via preview route)
  const [selectedAgency, setSelectedAgency] = useState('FDA');
  const [selectedSource, setSelectedSource] = useState('device GPS');

  // Resolve active agency and theme
  const activeAgency = propAgency || selectedAgency;
  const theme = THEMES[activeAgency === 'LEA' ? 'LEA' : 'FDA'];
  const mockDefaults = activeAgency === 'LEA' ? LEA_MOCK_DATA : FDA_MOCK_DATA;

  // 🔌 BACKEND: Template Variables
  // In production, these values are populated from the security geofence detection event.
  const personnel_name = propPersonnelName ?? mockDefaults.personnel_name;
  const personnel_email = propPersonnelEmail ?? mockDefaults.personnel_email;
  const login_at = propLoginAt ?? mockDefaults.login_at;
  const raw_distance = propDistance ?? mockDefaults.distance;
  const formatted_distance = formatDistance(raw_distance);
  const workspace_name = propWorkspaceName ?? mockDefaults.workspace_name;
  const radius_meters = propRadiusMeters ?? mockDefaults.radius_meters;
  const detection_source = propDetectionSource ?? (propAgency ? mockDefaults.detection_source : selectedSource);
  const footer_agency_region = propFooterAgencyRegion ?? mockDefaults.footer_agency_region;

  const isIpBased = String(detection_source).toLowerCase().includes('ip');

  return (
    <div
      style={{
        margin: 0,
        padding: '32px 16px',
        backgroundColor: '#f0f4f8',
        minHeight: '100vh',
        fontFamily: "'Inter', Arial, sans-serif",
        color: '#333333',
        boxSizing: 'border-box',
      }}
    >
      <center style={{ width: '100%', tableLayout: 'fixed' }}>
    
        {showPreviewToolbar && (
          <div
            style={{
              maxWidth: '520px',
              margin: '0 auto 16px auto',
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              textAlign: 'left',
              boxSizing: 'border-box',
            }}
          >
            {/* Interactive Preview Controls */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Agency:</span>
                <button
                  type="button"
                  onClick={() => setSelectedAgency('FDA')}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedAgency === 'FDA' ? '#1B4332' : '#cbd5e1',
                    backgroundColor: selectedAgency === 'FDA' ? '#1B4332' : '#f8fafc',
                    color: selectedAgency === 'FDA' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  FDA Admin
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAgency('LEA')}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedAgency === 'LEA' ? '#1e293b' : '#cbd5e1',
                    backgroundColor: selectedAgency === 'LEA' ? '#1e293b' : '#f8fafc',
                    color: selectedAgency === 'LEA' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  LEA Admin
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>Source:</span>
                <button
                  type="button"
                  onClick={() => setSelectedSource('device GPS')}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedSource === 'device GPS' ? '#475569' : '#cbd5e1',
                    backgroundColor: selectedSource === 'device GPS' ? '#475569' : '#f8fafc',
                    color: selectedSource === 'device GPS' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Device GPS
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSource('IP address (approximate)')}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedSource === 'IP address (approximate)' ? '#475569' : '#cbd5e1',
                    backgroundColor: selectedSource === 'IP address (approximate)' ? '#475569' : '#f8fafc',
                    color: selectedSource === 'IP address (approximate)' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease',
                  }}
                >
                  IP (Approximate)
                </button>
              </div>
            </div>
          </div>
        )}

      
        <table
          role="presentation"
          border="0"
          cellPadding="0"
          cellSpacing="0"
          style={{
            width: '100%',
            maxWidth: '520px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.08)',
            borderCollapse: 'collapse',
            textAlign: 'left',
          }}
        >
          <tbody>
            {/* ── HEADER ── */}
            <tr>
              <td
                style={{
                  background: theme.headerBg,
                  padding: '24px 28px',
                  borderBottom: `4px solid ${theme.headerBorder}`,
                }}
              >
                <table
                  role="presentation"
                  border="0"
                  cellPadding="0"
                  cellSpacing="0"
                  style={{ width: '100%', borderCollapse: 'collapse' }}
                >
                  <tbody>
                    <tr>
                      {/* Logo cell on the left, vertically centered */}
                      <td
                        style={{
                          width: '64px',
                          verticalAlign: 'middle',
                          paddingRight: '16px',
                        }}
                      >
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: '#ffffff',
                            border: '2px solid rgba(255, 255, 255, 0.25)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                            textAlign: 'center',
                            lineHeight: '60px',
                          }}
                        >
                          <img
                            src={theme.logoSrc}
                            alt={theme.logoAlt}
                            style={{
                              width: '46px',
                              height: '46px',
                              objectFit: 'contain',
                              display: 'inline-block',
                              verticalAlign: 'middle',
                            }}
                          />
                        </div>
                      </td>

                      {/* Header text cell, left-aligned, vertically centered */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'left' }}>
                        <p
                          style={{
                            color: '#ffffff',
                            opacity: 0.9,
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '2.5px',
                            textTransform: 'uppercase',
                            margin: '0 0 4px 0',
                            fontFamily: "'Poppins', Arial, sans-serif",
                          }}
                        >
                          {theme.systemName}
                        </p>

                        <h2
                          style={{
                            color: '#ffffff',
                            fontSize: '18px',
                            fontWeight: 700,
                            margin: '0',
                            letterSpacing: '0.3px',
                            fontFamily: "'Poppins', Arial, sans-serif",
                            lineHeight: '1.3',
                          }}
                        >
                          Location Anomaly Detected
                        </h2>

                        <p
                          style={{
                            color: '#cbd5e1',
                            fontSize: '11.5px',
                            margin: '4px 0 0 0',
                            letterSpacing: '0.4px',
                          }}
                        >
                          Automated Security Geofence Alert
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* ── EMAIL BODY CONTENT ── */}
            <tr>
              <td style={{ padding: '24px 28px 32px 28px' }}>
                {/* ── SUBJECT LINE INSIDE EMAIL CARD ── */}
                <div
                  style={{
                    paddingBottom: '16px',
                    marginBottom: '20px',
                    borderBottom: '1px solid #e5e7eb',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: '#1e293b',
                  }}
                >
                  <span style={{ color: '#64748b', fontWeight: 500, marginRight: '6px' }}>
                    Subject:
                  </span>
                  <strong>Location anomaly detected — {personnel_name}</strong>
                </div>

                {/* ── ALERT PARAGRAPH (Agency-tinted card with subtle amber warning accent) ── */}
                <div
                  style={{
                    backgroundColor: theme.badgeBg,
                    border: `1px solid ${theme.badgeBorder}`,
                    borderLeft: '4px solid #d97706',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    marginBottom: '24px',
                    boxSizing: 'border-box',
                  }}
                >
                  <table role="presentation" border="0" cellPadding="0" cellSpacing="0" style={{ width: '100%' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '24px', verticalAlign: 'top', paddingRight: '12px', paddingTop: '2px' }}>
                          {/* Amber warning symbol */}
                          <span style={{ color: '#d97706', fontSize: '18px', lineHeight: 1, fontWeight: 700 }}>
                            ⚠
                          </span>
                        </td>
                        <td style={{ verticalAlign: 'top' }}>
                          <p
                            style={{
                              margin: '0 0 10px 0',
                              fontSize: '13.5px',
                              lineHeight: '1.65',
                              color: theme.badgeText,
                            }}
                          >
                            Personnel <strong>{personnel_name}</strong> ({personnel_email}) logged in on{' '}
                            <strong>{login_at}</strong> from a location approximately{' '}
                            <strong>{formatted_distance}</strong> from the <strong>{workspace_name}</strong> — outside
                            the configured <strong>{radius_meters} m</strong> radius.
                          </p>

                          <p
                            style={{
                              margin: '0',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              color: theme.badgeText,
                            }}
                          >
                            Detected via {detection_source}.
                          </p>

                          {isIpBased && (
                            <p
                              style={{
                                margin: '6px 0 0 0',
                                fontSize: '11.5px',
                                fontStyle: 'italic',
                                color: theme.badgeText,
                                opacity: 0.85,
                              }}
                            >
                              Note: Location is approximate when determined via IP address.
                            </p>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ── INCIDENT SUMMARY TABLE (Compact Key-Value Rows) ── */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    marginBottom: '8px',
                  }}
                >
                  <table
                    role="presentation"
                    border="0"
                    cellPadding="0"
                    cellSpacing="0"
                    style={{ width: '100%', borderCollapse: 'collapse' }}
                  >
                    <tbody>
                      <tr>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#64748b',
                            fontWeight: 500,
                            width: '40%',
                          }}
                        >
                          Personnel
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#0f172a',
                            fontWeight: 600,
                            textAlign: 'right',
                          }}
                        >
                          {personnel_name}
                        </td>
                      </tr>

                      <tr>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#64748b',
                            fontWeight: 500,
                          }}
                        >
                          Email
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#0f172a',
                            fontWeight: 600,
                            textAlign: 'right',
                          }}
                        >
                          {personnel_email}
                        </td>
                      </tr>

                      <tr>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#64748b',
                            fontWeight: 500,
                          }}
                        >
                          Login time
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#0f172a',
                            fontWeight: 600,
                            textAlign: 'right',
                          }}
                        >
                          {login_at}
                        </td>
                      </tr>

                      <tr>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#64748b',
                            fontWeight: 500,
                          }}
                        >
                          Workspace office
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#0f172a',
                            fontWeight: 600,
                            textAlign: 'right',
                          }}
                        >
                          {workspace_name}
                        </td>
                      </tr>

                      <tr>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#64748b',
                            fontWeight: 500,
                          }}
                        >
                          Geofence radius
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#0f172a',
                            fontWeight: 600,
                            textAlign: 'right',
                          }}
                        >
                          {radius_meters} m
                        </td>
                      </tr>

                      <tr>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#64748b',
                            fontWeight: 500,
                          }}
                        >
                          Distance
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            fontSize: '12.5px',
                            color: '#b91c1c',
                            fontWeight: 700,
                            textAlign: 'right',
                          }}
                        >
                          {formatted_distance}
                        </td>
                      </tr>

                      <tr>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontSize: '12.5px',
                            color: '#64748b',
                            fontWeight: 500,
                          }}
                        >
                          Detection method
                        </td>
                        <td
                          style={{
                            padding: '10px 14px',
                            fontSize: '12.5px',
                            color: '#0f172a',
                            fontWeight: 600,
                            textAlign: 'right',
                          }}
                        >
                          {detection_source}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>

            {/* ── FOOTER ── */}
            <tr>
              <td
                style={{
                  backgroundColor: '#f8fafc',
                  borderTop: '1px solid #e5e7eb',
                  padding: '18px 24px',
                  textAlign: 'center',
                  fontSize: '11.5px',
                  color: '#94a3b8',
                  lineHeight: '1.5',
                }}
              >
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#64748b' }}>
                  {theme.displayName} · {footer_agency_region}
                </p>
                <p style={{ margin: 0, color: '#94a3b8' }}>
                  This is an automated security transmission. Please do not reply directly to this email.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </center>
    </div>
  );
};

export default LocationEmailTemplate;
