// desktopfrontend/src/pages/fdaadminfolder/fda-admin-workspace-location.jsx
import './fda-admin-css.css';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/apiFetch';
import Sidebar from '../component/sidebar';
import TopBar from '../component/top-bar';
import {
  Building2,
  Locate,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  TriangleAlert,
  MapPin,
  Loader2,
} from 'lucide-react';

// ⚠️ REMOVE THIS — mock data
// Set INITIAL_WORKSPACE_LOCATION = null to preview the "Not set" (empty) state.
const INITIAL_WORKSPACE_LOCATION = {
  agency: 'FDA',
  region: 'Region III',
  latitude: 15.0794,
  longitude: 120.6200,
  radius_meters: 500,
  updated_at: '2026-09-12T10:35:00',
  updated_by: 'J. dela Cruz',
};

function formatFdaWorkspaceName(profileRegion) {
  if (!profileRegion) return 'Workspace office';
  const romanOrName = profileRegion.replace(/^region\s+/i, '').trim();
  if (!romanOrName) return 'Workspace office';
  return `FDA-RFO ${romanOrName} office`;
}

function formatFdaEyebrow(profileRegion) {
  if (!profileRegion) return 'FDA regional admin';
  return `FDA regional admin — ${profileRegion}`;
}

function formatAdminDisplayName(p) {
  if (p?.first_name && p?.last_name) {
    return `${p.first_name[0]}. ${p.last_name}`;
  }
  const cachedName = localStorage.getItem('user_name');
  if (cachedName) {
    const parts = cachedName.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
    }
    return cachedName;
  }
  return 'J. dela Cruz';
}

function formatDateTime(dateVal) {
  if (!dateVal) return '—';
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return '—';
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dateStr} at ${timeStr}`;
}

export default function FDAAdminWorkspaceLocation() {
  // 🔌 BACKEND: GET /workspace-location on page load
  // Initialize locationData from backend API once implemented.
  const [locationData, setLocationData] = useState(INITIAL_WORKSPACE_LOCATION);

  // Profile data for dynamic agency/region/admin name
  const [profile, setProfile] = useState(null);

  // Modal visibility & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ latitude: '', longitude: '', radius_meters: '' });
  const [formErrors, setFormErrors] = useState({});
  const [modalGeoError, setModalGeoError] = useState('');
  const [modalGeoLoading, setModalGeoLoading] = useState(false);

  // Confirmation dialog state
  const [confirmData, setConfirmData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Card geolocation state
  const [cardGeoLoading, setCardGeoLoading] = useState(false);
  const [cardGeoError, setCardGeoError] = useState('');

  // Toast message
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Fetch logged-in admin profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiFetch('/profile');
      if (!res.ok) return;
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.warn('Could not fetch admin profile:', err);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const isConfigured = Boolean(
    locationData &&
    locationData.latitude != null &&
    locationData.longitude != null
  );

  const regionVal = profile?.region || locationData?.region || null;
  const eyebrowText = formatFdaEyebrow(regionVal);
  const officeName = formatFdaWorkspaceName(regionVal);

  // Update card to current device location
  const handleCardUpdateLocation = () => {
    if (!navigator.geolocation) {
      setCardGeoError('Location access denied or unavailable. Please enter coordinates manually.');
      return;
    }

    setCardGeoLoading(true);
    setCardGeoError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCardGeoLoading(false);
        const { latitude, longitude } = position.coords;

        // Open confirmation dialog with pending coordinates
        setConfirmData({
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
          radius_meters: locationData?.radius_meters != null ? locationData.radius_meters : 500,
          source: 'card',
        });
      },
      (error) => {
        console.warn('Card geolocation error:', error);
        setCardGeoLoading(false);
        setCardGeoError('Location access denied or unavailable. Please enter coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Open modal & pre-fill inputs
  const handleOpenModal = () => {
    setFormData({
      latitude: locationData?.latitude != null ? String(locationData.latitude) : '',
      longitude: locationData?.longitude != null ? String(locationData.longitude) : '',
      radius_meters: locationData?.radius_meters != null ? String(locationData.radius_meters) : '',
    });
    setFormErrors({});
    setModalGeoError('');
    setIsModalOpen(true);
  };

  // Close modal & reset inputs/errors
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ latitude: '', longitude: '', radius_meters: '' });
    setFormErrors({});
    setModalGeoError('');
  };

  // Escape key closes confirmation modal first, or edit modal if confirmation is not open
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmData) {
          setConfirmData(null);
        } else if (isModalOpen) {
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmData, isModalOpen]);

  // Modal "Use current location" button (fills inputs only)
  const handleModalUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setModalGeoError('Location access denied or unavailable. Please enter coordinates manually.');
      return;
    }

    setModalGeoLoading(true);
    setModalGeoError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setModalGeoLoading(false);
        const { latitude, longitude } = position.coords;
        setFormData((prev) => ({
          ...prev,
          latitude: String(parseFloat(latitude.toFixed(6))),
          longitude: String(parseFloat(longitude.toFixed(6))),
        }));
        setFormErrors((prev) => ({ ...prev, latitude: '', longitude: '' }));
      },
      (error) => {
        console.warn('Modal geolocation error:', error);
        setModalGeoLoading(false);
        setModalGeoError('Location access denied or unavailable. Please enter coordinates manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Modal validation & save
  const handleSaveModal = (e) => {
    e.preventDefault();
    const errs = {};

    const latNum = Number(formData.latitude);
    const lngNum = Number(formData.longitude);
    const radNum = Number(formData.radius_meters);

    if (formData.latitude === '' || formData.latitude == null || isNaN(latNum)) {
      errs.latitude = 'Latitude is required and must be a valid number.';
    } else if (latNum < -90 || latNum > 90) {
      errs.latitude = 'Latitude must be between -90 and 90.';
    }

    if (formData.longitude === '' || formData.longitude == null || isNaN(lngNum)) {
      errs.longitude = 'Longitude is required and must be a valid number.';
    } else if (lngNum < -180 || lngNum > 180) {
      errs.longitude = 'Longitude must be between -180 and 180.';
    }

    if (formData.radius_meters === '' || formData.radius_meters == null || isNaN(radNum)) {
      errs.radius_meters = 'Geofence radius is required and must be a valid number.';
    } else if (radNum <= 0) {
      errs.radius_meters = 'Geofence radius must be greater than 0 meters.';
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    // Open confirmation dialog on top of the edit modal with validated values
    setConfirmData({
      latitude: parseFloat(latNum.toFixed(6)),
      longitude: parseFloat(lngNum.toFixed(6)),
      radius_meters: Math.round(radNum),
      source: 'modal',
    });
  };

  const handleCancelConfirm = () => {
    setConfirmData(null);
  };

  const handleConfirmSave = () => {
    if (!confirmData || isSaving) return;
    setIsSaving(true);

    // 🔌 BACKEND: PUT/POST /workspace-location
    // The backend must set updated_at and updated_by from the authenticated admin and server time.
    setLocationData({
      agency: locationData?.agency || profile?.agency || 'FDA',
      region: locationData?.region || profile?.region || 'Region III',
      latitude: confirmData.latitude,
      longitude: confirmData.longitude,
      radius_meters: confirmData.radius_meters,
      updated_at: new Date().toISOString(),
      updated_by: formatAdminDisplayName(profile),
    });

    const source = confirmData.source;
    setConfirmData(null);
    setIsSaving(false);

    if (source === 'modal') {
      handleCloseModal();
    }
    showToast('Workspace location saved successfully.');
  };

  return (
    <div className="FDAAdminMainContainer">
      <Sidebar sidebarType="FDA_ADMIN" />

      <div className="FDAAdminContentContainer">
        <TopBar topbarType="FDA_ADMIN" />

        <div className="FDAAdminMainfeed">
          <div className="FDAAdminPageContainer">
            {/* Header */}
            <div className="FdaWsLoc-PageHeader">
              <span className="FdaWsLoc-Eyebrow">{eyebrowText}</span>
              <h1 className="FdaWsLoc-PageTitle">Workspace location</h1>
            </div>

            {/* Location Card */}
            <div className="FdaWsLoc-Card">
              <div className="FdaWsLoc-CardHeader">
                <div className="FdaWsLoc-OfficeInfo">
                  <div className="FdaWsLoc-OfficeIconBox">
                    <Building2 size={22} />
                  </div>
                  <span className="FdaWsLoc-OfficeName">{officeName}</span>
                </div>
                <span className={`FdaWsLoc-Badge ${isConfigured ? 'is-set' : 'not-set'}`}>
                  {isConfigured ? 'Set' : 'Not set'}
                </span>
              </div>

              <div className="FdaWsLoc-CardRows">
                <div className="FdaWsLoc-Row">
                  <span className="FdaWsLoc-RowLabel">Coordinates</span>
                  <span className="FdaWsLoc-RowValue">
                    {isConfigured
                      ? `${locationData.latitude}, ${locationData.longitude}`
                      : '—'}
                  </span>
                </div>

                <div className="FdaWsLoc-Row">
                  <span className="FdaWsLoc-RowLabel">Geofence radius</span>
                  <span className="FdaWsLoc-RowValue">
                    {isConfigured && locationData.radius_meters != null
                      ? `${locationData.radius_meters} m`
                      : '—'}
                  </span>
                </div>

                <div className="FdaWsLoc-Row">
                  <span className="FdaWsLoc-RowLabel">Last updated at</span>
                  <span className="FdaWsLoc-RowValue">
                    {isConfigured ? formatDateTime(locationData.updated_at) : '—'}
                  </span>
                </div>

                <div className="FdaWsLoc-Row">
                  <span className="FdaWsLoc-RowLabel">Updated by</span>
                  <span className="FdaWsLoc-RowValue">
                    {isConfigured && locationData.updated_by ? locationData.updated_by : '—'}
                  </span>
                </div>
              </div>

              {cardGeoError && (
                <div className="FdaWsLoc-ErrorBanner">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{cardGeoError}</span>
                </div>
              )}

              <div className="FdaWsLoc-CardActions">
                <button
                  id="fda-ws-update-loc-btn"
                  className="FdaWsLoc-LocateBtn"
                  onClick={handleCardUpdateLocation}
                  disabled={cardGeoLoading}
                >
                  {cardGeoLoading ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Locating...</span>
                    </>
                  ) : (
                    <>
                      <Locate size={16} />
                      <span>Update to my current location</span>
                    </>
                  )}
                </button>

                <button
                  id="fda-ws-edit-btn"
                  className="FdaWsLoc-EditBtn"
                  onClick={handleOpenModal}
                  title="Edit workspace location"
                  aria-label="Edit workspace location"
                >
                  <Pencil size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Set Workspace Location Modal */}
      {isModalOpen && (
        <div
          className="FDAAdminModalOverlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="FDAAdminModal FdaWsLoc-Modal">
            <div className="FDAAdminModalHeader">
              <h3 className="FDAAdminModalTitle">Set workspace location</h3>
              <p className="FDAAdminModalSubtitle">
                Enter coordinates manually, or use the device's current location instead.
              </p>
              <button
                id="fda-ws-modal-close-btn"
                className="FDAAdminModalCloseBtn"
                onClick={handleCloseModal}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="FdaWsLoc-ModalBody">
                {modalGeoError && (
                  <div className="FdaWsLoc-ErrorBanner">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{modalGeoError}</span>
                  </div>
                )}

                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel" htmlFor="fda-ws-latitude">
                    Latitude <span className="FDAAdminRequired">*</span>
                  </label>
                  <input
                    id="fda-ws-latitude"
                    type="number"
                    step="any"
                    className={`FDAAdminInput ${formErrors.latitude ? 'input-error' : ''}`}
                    placeholder="e.g. 15.0794"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, latitude: e.target.value }))
                    }
                  />
                  {formErrors.latitude && (
                    <span className="FDAAdminFieldError">
                      <AlertCircle size={12} /> {formErrors.latitude}
                    </span>
                  )}
                </div>

                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel" htmlFor="fda-ws-longitude">
                    Longitude <span className="FDAAdminRequired">*</span>
                  </label>
                  <input
                    id="fda-ws-longitude"
                    type="number"
                    step="any"
                    className={`FDAAdminInput ${formErrors.longitude ? 'input-error' : ''}`}
                    placeholder="e.g. 120.6200"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, longitude: e.target.value }))
                    }
                  />
                  {formErrors.longitude && (
                    <span className="FDAAdminFieldError">
                      <AlertCircle size={12} /> {formErrors.longitude}
                    </span>
                  )}
                </div>

                <div className="FDAAdminFormGroup">
                  <label className="FDAAdminLabel" htmlFor="fda-ws-radius">
                    Geofence radius (meters) <span className="FDAAdminRequired">*</span>
                  </label>
                  <input
                    id="fda-ws-radius"
                    type="number"
                    step="any"
                    className={`FDAAdminInput ${formErrors.radius_meters ? 'input-error' : ''}`}
                    placeholder="e.g. 500"
                    value={formData.radius_meters}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, radius_meters: e.target.value }))
                    }
                  />
                  <p className="FdaWsLoc-HelperText">
                    Personnel logging in beyond this distance will trigger an alert.
                  </p>
                  {formErrors.radius_meters && (
                    <span className="FDAAdminFieldError">
                      <AlertCircle size={12} /> {formErrors.radius_meters}
                    </span>
                  )}
                </div>

                <div className="FdaWsLoc-Notice">
                  <TriangleAlert size={18} className="FdaWsLoc-NoticeIcon" />
                  <div className="FdaWsLoc-NoticeContent">
                    <h4 className="FdaWsLoc-NoticeTitle">Double-check your coordinates</h4>
                    <p className="FdaWsLoc-NoticeText">
                      Make sure the latitude and longitude are correct before saving.
                      If the workspace location is inaccurate, the geofence check will fail
                      and personnel logins may be flagged incorrectly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="FdaWsLoc-ModalFooter">
                <button
                  id="fda-ws-modal-use-loc-btn"
                  type="button"
                  className="FdaWsLoc-ModalLocateBtn"
                  onClick={handleModalUseCurrentLocation}
                  disabled={modalGeoLoading}
                >
                  {modalGeoLoading ? (
                    <>
                      <Loader2 size={16} className="spin-icon" />
                      <span>Locating...</span>
                    </>
                  ) : (
                    <>
                      <Locate size={16} />
                      <span>Use current location</span>
                    </>
                  )}
                </button>

                <button
                  id="fda-ws-modal-save-btn"
                  type="submit"
                  className="FdaWsLoc-ModalSaveBtn"
                >
                  Save location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmData && (
        <div
          className="FdaWsLoc-ConfirmOverlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelConfirm();
          }}
        >
          <div className="FdaWsLoc-ConfirmModal">
            <div className="FdaWsLoc-ConfirmIconBox">
              <MapPin size={26} />
            </div>

            <h3 className="FdaWsLoc-ConfirmTitle">
              Are you sure your location is correct?
            </h3>
            <p className="FdaWsLoc-ConfirmBody">
              The geofence check depends on these coordinates. An incorrect location
              will cause personnel logins to be flagged incorrectly.
            </p>

            <div className="FdaWsLoc-ConfirmSummary">
              <div className="FdaWsLoc-ConfirmSummaryRow">
                <span className="FdaWsLoc-ConfirmSummaryLabel">Latitude</span>
                <span className="FdaWsLoc-ConfirmSummaryValue">{confirmData.latitude}</span>
              </div>
              <div className="FdaWsLoc-ConfirmSummaryRow">
                <span className="FdaWsLoc-ConfirmSummaryLabel">Longitude</span>
                <span className="FdaWsLoc-ConfirmSummaryValue">{confirmData.longitude}</span>
              </div>
              <div className="FdaWsLoc-ConfirmSummaryRow">
                <span className="FdaWsLoc-ConfirmSummaryLabel">Geofence radius</span>
                <span className="FdaWsLoc-ConfirmSummaryValue">{confirmData.radius_meters} m</span>
              </div>
            </div>

            <div className="FdaWsLoc-ConfirmFooter">
              <button
                type="button"
                className="FdaWsLoc-ConfirmCancelBtn"
                onClick={handleCancelConfirm}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="FdaWsLoc-ConfirmSaveBtn"
                onClick={handleConfirmSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Yes, save location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="FDAAdminToast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
