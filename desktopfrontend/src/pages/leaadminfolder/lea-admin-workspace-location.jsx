// desktopfrontend/src/pages/leaadminfolder/lea-admin-workspace-location.jsx
import './lea-admin-css.css';
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
  agency: 'CIDG',
  region: 'Region III',
  latitude: 15.0794,
  longitude: 120.6200,
  radius_meters: 500,
  updated_at: '2026-09-12T10:35:00',
  updated_by: 'J. dela Cruz',
};

function formatLeaWorkspaceName(profileRegion) {
  if (!profileRegion) return 'Workspace office';
  const romanOrName = profileRegion.replace(/^region\s+/i, '').trim();
  if (!romanOrName) return 'Workspace office';
  return `CIDG-RFU ${romanOrName} office`;
}

function formatLeaEyebrow(profileRegion) {
  if (!profileRegion) return 'LEA regional admin';
  return `LEA regional admin — ${profileRegion}`;
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

export default function LEAAdminWorkspaceLocation() {
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
  const eyebrowText = formatLeaEyebrow(regionVal);
  const officeName = formatLeaWorkspaceName(regionVal);

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
      agency: locationData?.agency || profile?.agency || 'CIDG',
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
    <div className="LEAAdminMainContainer">
      <Sidebar sidebarType="LEA_ADMIN" />

      <div className="LEAAdminContentContainer">
        <TopBar topbarType="LEA_ADMIN" />

        <div className="LEAAdminMainfeed">
          <div className="LEAAdminPageContainer">
            {/* Header */}
            <div className="LeaWsLoc-PageHeader">
              <span className="LeaWsLoc-Eyebrow">{eyebrowText}</span>
              <h1 className="LeaWsLoc-PageTitle">Workspace location</h1>
            </div>

            {/* Location Card */}
            <div className="LeaWsLoc-Card">
              <div className="LeaWsLoc-CardHeader">
                <div className="LeaWsLoc-OfficeInfo">
                  <div className="LeaWsLoc-OfficeIconBox">
                    <Building2 size={22} />
                  </div>
                  <span className="LeaWsLoc-OfficeName">{officeName}</span>
                </div>
                <span className={`LeaWsLoc-Badge ${isConfigured ? 'is-set' : 'not-set'}`}>
                  {isConfigured ? 'Set' : 'Not set'}
                </span>
              </div>

              <div className="LeaWsLoc-CardRows">
                <div className="LeaWsLoc-Row">
                  <span className="LeaWsLoc-RowLabel">Coordinates</span>
                  <span className="LeaWsLoc-RowValue">
                    {isConfigured
                      ? `${locationData.latitude}, ${locationData.longitude}`
                      : '—'}
                  </span>
                </div>

                <div className="LeaWsLoc-Row">
                  <span className="LeaWsLoc-RowLabel">Geofence radius</span>
                  <span className="LeaWsLoc-RowValue">
                    {isConfigured && locationData.radius_meters != null
                      ? `${locationData.radius_meters} m`
                      : '—'}
                  </span>
                </div>

                <div className="LeaWsLoc-Row">
                  <span className="LeaWsLoc-RowLabel">Last updated at</span>
                  <span className="LeaWsLoc-RowValue">
                    {isConfigured ? formatDateTime(locationData.updated_at) : '—'}
                  </span>
                </div>

                <div className="LeaWsLoc-Row">
                  <span className="LeaWsLoc-RowLabel">Updated by</span>
                  <span className="LeaWsLoc-RowValue">
                    {isConfigured && locationData.updated_by ? locationData.updated_by : '—'}
                  </span>
                </div>
              </div>

              {cardGeoError && (
                <div className="LeaWsLoc-ErrorBanner">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{cardGeoError}</span>
                </div>
              )}

              <div className="LeaWsLoc-CardActions">
                <button
                  id="lea-ws-update-loc-btn"
                  className="LeaWsLoc-LocateBtn"
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
                  id="lea-ws-edit-btn"
                  className="LeaWsLoc-EditBtn"
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
          className="LEAAdminModalOverlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="LEAAdminModal LeaWsLoc-Modal">
            <div className="LEAAdminModalHeader">
              <h3 className="LEAAdminModalTitle">Set workspace location</h3>
              <p className="LEAAdminModalSubtitle">
                Enter coordinates manually, or use the device's current location instead.
              </p>
              <button
                id="lea-ws-modal-close-btn"
                className="LEAAdminModalCloseBtn"
                onClick={handleCloseModal}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div className="LeaWsLoc-ModalBody">
                {modalGeoError && (
                  <div className="LeaWsLoc-ErrorBanner">
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{modalGeoError}</span>
                  </div>
                )}

                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel" htmlFor="lea-ws-latitude">
                    Latitude <span className="LEAAdminRequired">*</span>
                  </label>
                  <input
                    id="lea-ws-latitude"
                    type="number"
                    step="any"
                    className={`LEAAdminInput ${formErrors.latitude ? 'input-error' : ''}`}
                    placeholder="e.g. 15.0794"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, latitude: e.target.value }))
                    }
                  />
                  {formErrors.latitude && (
                    <span className="LEAAdminFieldError">
                      <AlertCircle size={12} /> {formErrors.latitude}
                    </span>
                  )}
                </div>

                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel" htmlFor="lea-ws-longitude">
                    Longitude <span className="LEAAdminRequired">*</span>
                  </label>
                  <input
                    id="lea-ws-longitude"
                    type="number"
                    step="any"
                    className={`LEAAdminInput ${formErrors.longitude ? 'input-error' : ''}`}
                    placeholder="e.g. 120.6200"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, longitude: e.target.value }))
                    }
                  />
                  {formErrors.longitude && (
                    <span className="LEAAdminFieldError">
                      <AlertCircle size={12} /> {formErrors.longitude}
                    </span>
                  )}
                </div>

                <div className="LEAAdminFormGroup">
                  <label className="LEAAdminLabel" htmlFor="lea-ws-radius">
                    Geofence radius (meters) <span className="LEAAdminRequired">*</span>
                  </label>
                  <input
                    id="lea-ws-radius"
                    type="number"
                    step="any"
                    className={`LEAAdminInput ${formErrors.radius_meters ? 'input-error' : ''}`}
                    placeholder="e.g. 500"
                    value={formData.radius_meters}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, radius_meters: e.target.value }))
                    }
                  />
                  <p className="LeaWsLoc-HelperText">
                    Personnel logging in beyond this distance will trigger an alert.
                  </p>
                  {formErrors.radius_meters && (
                    <span className="LEAAdminFieldError">
                      <AlertCircle size={12} /> {formErrors.radius_meters}
                    </span>
                  )}
                </div>

                <div className="LeaWsLoc-Notice">
                  <TriangleAlert size={18} className="LeaWsLoc-NoticeIcon" />
                  <div className="LeaWsLoc-NoticeContent">
                    <h4 className="LeaWsLoc-NoticeTitle">Double-check your coordinates</h4>
                    <p className="LeaWsLoc-NoticeText">
                      Make sure the latitude and longitude are correct before saving.
                      If the workspace location is inaccurate, the geofence check will fail
                      and personnel logins may be flagged incorrectly.
                    </p>
                  </div>
                </div>
              </div>

              <div className="LeaWsLoc-ModalFooter">
                <button
                  id="lea-ws-modal-use-loc-btn"
                  type="button"
                  className="LeaWsLoc-ModalLocateBtn"
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
                  id="lea-ws-modal-save-btn"
                  type="submit"
                  className="LeaWsLoc-ModalSaveBtn"
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
          className="LeaWsLoc-ConfirmOverlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelConfirm();
          }}
        >
          <div className="LeaWsLoc-ConfirmModal">
            <div className="LeaWsLoc-ConfirmIconBox">
              <MapPin size={26} />
            </div>

            <h3 className="LeaWsLoc-ConfirmTitle">
              Are you sure your location is correct?
            </h3>
            <p className="LeaWsLoc-ConfirmBody">
              The geofence check depends on these coordinates. An incorrect location
              will cause personnel logins to be flagged incorrectly.
            </p>

            <div className="LeaWsLoc-ConfirmSummary">
              <div className="LeaWsLoc-ConfirmSummaryRow">
                <span className="LeaWsLoc-ConfirmSummaryLabel">Latitude</span>
                <span className="LeaWsLoc-ConfirmSummaryValue">{confirmData.latitude}</span>
              </div>
              <div className="LeaWsLoc-ConfirmSummaryRow">
                <span className="LeaWsLoc-ConfirmSummaryLabel">Longitude</span>
                <span className="LeaWsLoc-ConfirmSummaryValue">{confirmData.longitude}</span>
              </div>
              <div className="LeaWsLoc-ConfirmSummaryRow">
                <span className="LeaWsLoc-ConfirmSummaryLabel">Geofence radius</span>
                <span className="LeaWsLoc-ConfirmSummaryValue">{confirmData.radius_meters} m</span>
              </div>
            </div>

            <div className="LeaWsLoc-ConfirmFooter">
              <button
                type="button"
                className="LeaWsLoc-ConfirmCancelBtn"
                onClick={handleCancelConfirm}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="LeaWsLoc-ConfirmSaveBtn"
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
        <div className="LEAAdminToast">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
