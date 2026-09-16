// desktopfrontend/src/pages/fdafolder/fda-verification.jsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from "../component/sidebar";
import TopBar from "../component/top-bar";
import './fda-css.css';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Send,
  Save,
  Paperclip,
  Calendar,
  Info,
  X,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// ============================================================================
// BACKEND NOTIFICATION ARCHITECTURE SPECIFICATION
// ============================================================================
// NOTE: Global notifications occur through the TopBar component (top-bar.jsx).
// Inter-Agency Notification triggers between LEA-CIDG and FDA are handled via:
// 1. LEA Submits Request -> // BACKEND: Trigger notification to FDA TopBar notification panel ("New verification request received from LEA. CASE ID: XXXXX")
// 2. LEA Recalls Request -> // BACKEND: Trigger notification to FDA TopBar notification panel ("Verification request recalled by LEA. CASE ID: XXXXX")
// 3. LEA Sends Reminder -> // BACKEND: Trigger notification to FDA TopBar notification panel ("Reminder received from LEA for CASE ID XXXXX.")
// 4. FDA Submits Verification -> // BACKEND: Trigger notification to LEA TopBar notification panel ("FDA has completed verification for CASE ID XXXXX.")
// 5. FDA Rejects Verification -> // BACKEND: Trigger notification to LEA TopBar notification panel ("FDA rejected verification request for CASE ID XXXXX.")
// 6. LEA Acknowledges Rejection -> // BACKEND: Trigger notification to FDA TopBar notification panel ("LEA acknowledged rejection for CASE ID XXXXX.")
// 7. LEA Initiates Takedown -> // BACKEND: Trigger notification to FDA TopBar notification panel ("LEA initiated enforcement operation for CASE ID XXXXX.")
// 8. LEA Closes Case -> // BACKEND: Trigger notification to FDA TopBar notification panel ("LEA has closed CASE ID XXXXX.")
//
// WORKFLOW TRANSITIONS:
// Verification Queue (Pending) -> FDA reviews -> Registered or Unregistered -> Completed
// or
// Verification Queue (Pending) -> Rejected -> Rejected Requests
// ============================================================================

// ============================================================================
// DUMMY DATASETS - FDA VERIFICATION WORKFLOW (LEA REQUESTS ONLY)
// ============================================================================

// BACKEND: GET /api/fda/verification-requests?status=pending
// Returns newly received verification requests submitted by LEA-CIDG requiring FDA review.
const dummyQueueRequests = [
  {
    // BACKEND: maps to verification_requests.id & case_id
    id: 'VR-2026-00501',
    caseId: 'ICM-2026-00501',
    productName: 'PureGlow Whitening Soap',
    manufacturer: 'Lumina Beauty Philippines Inc.',
    complainant: 'PO3 R. Dela Cruz (LEA-CIDG)',
    category: 'Cosmetics',
    dateLogged: '2026-07-28 08:30 AM',
    dateReceived: '2026-07-28 08:35 AM',
    source: 'LEA Verification Request',
    productCode: 'PRD-COS-2026-9081',
    priority: 'Urgent',
    leaNotes: 'Seized 500 units during enforcement operation at Divisoria market. Packaging displays suspicious FDA registration mark. Immediate validation requested prior to legal filing.',
    documents: [
      { id: 'doc-101', name: 'Product_Label_Front_Back.jpg', size: '2.4 MB', type: 'image/jpeg', category: 'Evidence Photo' },
      { id: 'doc-102', name: 'LEA_Seizure_Intake_Report_00501.pdf', size: '1.2 MB', type: 'application/pdf', category: 'Official Report' },
      { id: 'doc-103', name: 'LEA_Chain_of_Custody_Form.pdf', size: '480 KB', type: 'application/pdf', category: 'Chain of Custody' }
    ]
  },
  {
    // BACKEND: maps to verification_requests.id & case_id
    id: 'VR-2026-00498',
    caseId: 'ICM-2026-00498',
    productName: 'VigorMax Male Energy Capsules',
    manufacturer: 'BioHealth Apex Labs Co.',
    complainant: 'Agent G. Tan (LEA-CIDG)',
    category: 'Food',
    dateLogged: '2026-07-27 03:45 PM',
    dateReceived: '2026-07-27 04:10 PM',
    source: 'LEA Verification Request',
    productCode: 'PRD-SUP-2026-4412',
    priority: 'High',
    leaNotes: 'Product identified during field operations without CPR badge. LEA field team flagged potential counterfeit packaging. Request urgent verification of CPR and LTO status.',
    documents: [
      { id: 'doc-104', name: 'Blister_Pack_HighRes.png', size: '3.1 MB', type: 'image/png', category: 'Evidence Photo' },
      { id: 'doc-105', name: 'Field_Seizure_Photos.pdf', size: '1.8 MB', type: 'application/pdf', category: 'Seizure Evidence' }
    ]
  },
  {
    // BACKEND: maps to verification_requests.id & case_id
    id: 'VR-2026-00492',
    caseId: 'ICM-2026-00492',
    productName: 'KetoFast Slimming Tea Bags',
    manufacturer: 'GreenHerb Organics Mfg.',
    complainant: 'Insp. A. Mercado (LEA-CIDG)',
    category: 'Food',
    dateLogged: '2026-07-26 11:20 AM',
    dateReceived: '2026-07-26 11:45 AM',
    source: 'LEA Verification Request',
    productCode: 'PRD-SUP-2026-1290',
    priority: 'Standard',
    leaNotes: 'LEA intelligence unit flagged batch samples. Request verification if GreenHerb Organics holds a valid License to Operate (LTO).',
    documents: [
      { id: 'doc-106', name: 'Box_Packaging_Photo.jpg', size: '1.5 MB', type: 'image/jpeg', category: 'Evidence Photo' },
      { id: 'doc-107', name: 'LEA_Request_Statement.pdf', size: '890 KB', type: 'application/pdf', category: 'Official Statement' }
    ]
  }
];



// BACKEND: GET /api/fda/verification-requests?status=completed
// Returns historical verifications completed by FDA and transmitted back to LEA-CIDG.
const dummyCompletedRequests = [
  {
    // BACKEND: maps to verification_requests.id & case_id
    id: 'VR-2026-00412',
    caseId: 'ICM-2026-00412',
    productName: 'GlowSkin Moisturizing Cream',
    manufacturer: 'Radiant Beauty Co.',
    complainant: 'Insp. A. Santos (LEA-CIDG)',
    category: 'Cosmetics',
    dateLogged: '2026-06-01 09:15 AM',
    dateReceived: '2026-06-01 09:30 AM',
    dateCompleted: '2026-06-03 02:20 PM',
    source: 'LEA Verification Request',
    productCode: 'PRD-COS-2026-1109',
    priority: 'Standard',
    verificationResult: 'Registered',
    cprNumber: 'FDA-NN-1000003819',
    cprExpiry: '2029-04-30',
    ltoNumber: 'FDA-LTO-30000019283',
    verifierName: 'Dr. Maria Santos',
    verifierTitle: 'FDA Senior Regulatory Officer',
    remarks: 'Valid CPR and LTO found. Product is fully registered, active, and compliant with national cosmetic safety standards.',
    documents: [
      { id: 'doc-301', name: 'FDA_Official_CPR_Certificate.pdf', size: '1.1 MB', type: 'application/pdf', category: 'Official Certificate' },
      { id: 'doc-302', name: 'GlowSkin_Lab_Analysis_Report.pdf', size: '2.5 MB', type: 'application/pdf', category: 'Lab Report' }
    ]
  },
  {
    // BACKEND: maps to verification_requests.id & case_id
    id: 'VR-2025-00185',
    caseId: 'ICM-2025-00185',
    productName: 'HerbalSlim Weight Loss Capsules',
    manufacturer: 'NatureFit Labs Inc.',
    complainant: 'Insp. M. Reyes (LEA-CIDG)',
    category: 'Food',
    dateLogged: '2026-05-17 10:42 AM',
    dateReceived: '2026-05-17 10:50 AM',
    dateCompleted: '2026-05-17 04:02 PM',
    source: 'LEA Verification Request',
    productCode: 'PRD-SUP-2025-8812',
    priority: 'Urgent',
    verificationResult: 'Unregistered',
    verifierName: 'Inspector J. Bautista',
    verifierTitle: 'FDA Enforcement Officer',
    unregisteredReason: 'No CPR or LTO found for manufacturer NatureFit Labs Inc. in the official FDA database. Product presents potential public health risks.',
    remarks: 'Product is UNREGISTERED. Immediate enforcement, public health advisory, and online marketplace takedown coordination strongly recommended.',
    documents: [
      { id: 'doc-303', name: 'HerbalSlim_Packaging_Evidence.pdf', size: '3.4 MB', type: 'application/pdf', category: 'Evidence File' },
      { id: 'doc-304', name: 'FDA_Verification_Response_Form.pdf', size: '920 KB', type: 'application/pdf', category: 'Official Response' }
    ]
  },
  {
    // BACKEND: maps to verification_requests.id & case_id
    id: 'VR-2026-00330',
    caseId: 'ICM-2026-00330',
    productName: 'AstraMed Pain Relief Patch 5s',
    manufacturer: 'Astra Therapeutics Inc.',
    complainant: 'Agent E. Gomez (LEA-CIDG)',
    category: 'Medical Devices',
    dateLogged: '2026-05-08 01:10 PM',
    dateReceived: '2026-05-08 01:25 PM',
    dateCompleted: '2026-05-10 11:00 AM',
    source: 'LEA Verification Request',
    productCode: 'PRD-DEV-2026-0044',
    priority: 'High',
    verificationResult: 'Registered',
    cprNumber: 'FDA-DVR-2025-01928',
    cprExpiry: '2027-12-31',
    ltoNumber: 'FDA-LTO-30000055192',
    verifierName: 'Dr. E. Gomez',
    verifierTitle: 'FDA Medical Device Officer',
    remarks: 'Verified active registration under Medical Device Regulation Office. License to Operate valid.',
    documents: [
      { id: 'doc-305', name: 'AstraMed_Device_License.pdf', size: '1.4 MB', type: 'application/pdf', category: 'Official License' }
    ]
  }
];

// BACKEND: GET /api/fda/verification-requests?status=rejected
// Returns verification requests rejected by FDA due to missing information, invalid inputs, or duplication.
const dummyRejectedRequests = [
  {
    // BACKEND: maps to verification_requests.id & case_id
    id: 'VR-2026-00188',
    caseId: 'ICM-2026-00188',
    productName: 'PureVita Daily Multivitamin',
    manufacturer: 'Vita Manufacturing Inc.',
    complainant: 'Insp. J. Cruz (LEA-CIDG)',
    category: 'Food',
    dateLogged: '2026-05-16 11:21 AM',
    dateReceived: '2026-05-16 11:35 AM',
    dateRejected: '2026-05-17 09:00 AM',
    source: 'LEA Verification Request',
    productCode: 'PRD-SUP-2026-0019',
    priority: 'Standard',
    rejectedBy: 'Dr. M. Dela Cruz',
    verifierTitle: 'FDA Verifier',
    rejectionReason: 'Incomplete product information. The submission lacks clear high-resolution photos of the product back-label lot number and complete manufacturer street address. Please obtain complete packaging photos from LEA field office before re-submitting.',
    leaNotes: 'Initial request submitted by LEA intake desk.',
    documents: [
      { id: 'doc-401', name: 'Blurry_Packaging_Photo.jpg', size: '520 KB', type: 'image/jpeg', category: 'Incomplete Evidence' }
    ]
  },
  {
    // BACKEND: maps to verification_requests.id & case_id
    id: 'VR-2026-00120',
    caseId: 'ICM-2026-00120',
    productName: 'YouthElixir Anti-Aging Gel',
    manufacturer: 'Unknown Distributor / Unmarked Pack',
    complainant: 'Insp. R. Solis (LEA-CIDG)',
    category: 'Cosmetics',
    dateLogged: '2026-04-10 03:15 PM',
    dateReceived: '2026-04-10 03:30 PM',
    dateRejected: '2026-04-12 04:30 PM',
    source: 'LEA Verification Request',
    productCode: 'PRD-COS-2026-0002',
    priority: 'High',
    rejectedBy: 'Officer K. Ramos',
    verifierTitle: 'FDA Senior Inspector',
    rejectionReason: 'Duplicate verification request. Case ID ICM-2026-00105 was already processed and verified for this exact product batch on April 05, 2026.',
    leaNotes: 'Re-submitted by regional field office.',
    documents: [
      { id: 'doc-402', name: 'Field_Referral_Notice.pdf', size: '780 KB', type: 'application/pdf', category: 'Referral Document' }
    ]
  }
];

// ADDED — base URL for all FDA backend API calls; mirrors the same constant
// used in the LEA pages (e.g. lea-saved-draft.jsx) so the host is easy to
// update from one place.
const API_BASE = 'http://localhost:8000';

function FDAVerification() {




  // BACKEND: active tab filter state ('queue' | 'completed' | 'rejected')
  const [fdaActiveTab, setFdaActiveTab] = useState('queue');

  // CHANGED — starts empty; real data is loaded by the fetch useEffect below.
  const [fdaQueueList, setFdaQueueList] = useState([]);
  // CHANGED — starts empty; replaced by real fetch from GET /verification-requests/completed.
  const [fdaCompletedList, setFdaCompletedList] = useState([]);
  // CHANGED — starts empty; replaced by real fetch from GET /verification-requests/rejected.
  const [fdaRejectedList, setFdaRejectedList] = useState([]);

  // ADDED — tracks whether the completed list fetch is in progress.
  const [completedLoading, setCompletedLoading] = useState(false);
  // ADDED — total record count from the server response; drives server-side pagination.
  const [completedTotal, setCompletedTotal] = useState(0);
  // ADDED — tracks whether the rejected list fetch is in progress.
  const [rejectedLoading, setRejectedLoading] = useState(false);
  // ADDED — total rejected record count from the server response; drives server-side pagination.
  const [rejectedTotal, setRejectedTotal] = useState(0);

  // ADDED — holds the three badge counts fetched from GET /verification-requests/counts.
  // Starts as null (not 0) so the UI shows "-" while the request is in-flight
  // instead of flashing a misleading "0" on first render.
  const [queueCounts, setQueueCounts] = useState(null);

  // ADDED — tracks whether the queue list fetch is in progress so the UI can
  // show a loading state instead of an empty list while waiting.
  const [queueLoading, setQueueLoading] = useState(true);

  // ADDED — holds the full detail object fetched from GET /verification-requests/{request_id}
  // when a card is selected. Separate from selectedQueueItem (which is the list-item
  // shape used only for the card highlight). Null while no card has been selected.
  const [selectedQueueDetail, setSelectedQueueDetail] = useState(null);

  // ADDED — true while the per-item detail fetch is in flight, so the detail
  // panel can show a loading indicator instead of stale or blank fields.
  const [detailLoading, setDetailLoading] = useState(false);

  // BACKEND: selected item pointer for Verification Queue
  // CHANGED — starts as null; real first selection is made after the fetch resolves.
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);

  // BACKEND: Queue search query & priority filter states
  const [fdaSearchQuery, setFdaSearchQuery] = useState('');
  const [fdaPriorityFilter, setFdaPriorityFilter] = useState('all');

  // BACKEND: Completed Records Table Filters
  const [completedSearch, setCompletedSearch] = useState('');
  const [completedDateFrom, setCompletedDateFrom] = useState('');
  const [completedDateTo, setCompletedDateTo] = useState('');
  const [completedCategory, setCompletedCategory] = useState('');
  // ADDED — new Verification Result filter dropdown; maps to verification_result query param.
  // Empty string = All Results (param is omitted); 'registered' or 'unregistered' = filter.
  const [completedResultFilter, setCompletedResultFilter] = useState('');

  // BACKEND: Rejected Records Table Filters
  const [rejectedSearch, setRejectedSearch] = useState('');
  const [rejectedDateFrom, setRejectedDateFrom] = useState('');
  const [rejectedDateTo, setRejectedDateTo] = useState('');
  const [rejectedCategory, setRejectedCategory] = useState('');

  // Pagination for Completed & Rejected tables (25 rows per page)
  const FDA_VERIF_TABLE_PAGE_SIZE = 25;
  const [completedPage, setCompletedPage] = useState(1);
  const [rejectedPage, setRejectedPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);


  // BACKEND: Form inputs for FDA Verification Result section
  // Maps to: verification_requests.fda_verification_status ('Registered' | 'Unregistered')
  const [fdaVerificationStatus, setFdaVerificationStatus] = useState('');
  // Maps to: verification_requests.fda_cpr_number
  const [fdaCprNumber, setFdaCprNumber] = useState('');
  // Maps to: verification_requests.fda_cpr_expiry
  const [fdaCprExpiry, setFdaCprExpiry] = useState('');
  // Maps to: verification_requests.fda_official_remarks (Registered path)
  const [fdaOfficialRemarks, setFdaOfficialRemarks] = useState('');
  // Maps to: verification_requests.fda_official_remarks (Unregistered advisory path)
  const [fdaAdvisoryRemarks, setFdaAdvisoryRemarks] = useState('');
  // Maps to: verification_requests.fda_unregistered_reason
  const [fdaUnregisteredReason, setFdaUnregisteredReason] = useState('');
  // Maps to: verification_requests.fda_rejection_reason
  const [fdaRejectionReason, setFdaRejectionReason] = useState('');

  // ADDED — trigger used to refresh Completed and Rejected list fetches after a successful submit or reject.
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  // ADDED — refs for scrolling table containers back to top when table page changes (FIX 5)
  const completedTableWrapperRef = useRef(null);
  const rejectedTableWrapperRef = useRef(null);

  useEffect(() => {
    if (completedTableWrapperRef.current) {
      completedTableWrapperRef.current.scrollTop = 0;
    }
  }, [completedPage]);

  useEffect(() => {
    if (rejectedTableWrapperRef.current) {
      rejectedTableWrapperRef.current.scrollTop = 0;
    }
  }, [rejectedPage]);

  // BACKEND: UI view toggles & modal states
  const [fdaIsRejecting, setFdaIsRejecting] = useState(false);
  const [fdaModalConfig, setFdaModalConfig] = useState(null); // { type: 'submit' | 'reject' | 'save_draft', title, description }
  const [fdaSuccessAlert, setFdaSuccessAlert] = useState(null); // { message, type }
  const [fdaDocPreviewModal, setFdaDocPreviewModal] = useState(null); // document object
  const [fdaRecordModalData, setFdaRecordModalData] = useState(null); // Completed or Rejected record for View modal

  // ADDED — preview fetch state for the intake document preview modal.
  // fdaDocPreviewUrl holds a blob object URL (revoked on close); Loading and Error
  // track the in-flight fetch so the modal can show a spinner or fallback.
  const [fdaDocPreviewUrl, setFdaDocPreviewUrl] = useState(null);
  const [fdaDocPreviewLoading, setFdaDocPreviewLoading] = useState(false);
  const [fdaDocPreviewError, setFdaDocPreviewError] = useState(false);

  // ADDED — fetches a preview blob from GET /shared-files/{file_id}/preview whenever
  // fdaDocPreviewModal changes. Supports images and PDFs; other types are left to
  // the download-only fallback. Object URL is revoked on cleanup to avoid memory leaks.
  useEffect(() => {
    if (!fdaDocPreviewModal) {
      setFdaDocPreviewUrl(null);
      setFdaDocPreviewError(false);
      return;
    }

    const isImage = fdaDocPreviewModal.mime_type?.startsWith('image/');
    const isPdf = fdaDocPreviewModal.mime_type === 'application/pdf';
    if (!isImage && !isPdf) return; // unsupported types keep the placeholder

    let objectUrl = null;
    setFdaDocPreviewLoading(true);
    setFdaDocPreviewError(false);

    const token = localStorage.getItem('access_token');
    fetch(`${API_BASE}/shared-files/${fdaDocPreviewModal.file_id}/preview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setFdaDocPreviewUrl(objectUrl);
      })
      .catch(() => setFdaDocPreviewError(true))
      .finally(() => setFdaDocPreviewLoading(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fdaDocPreviewModal]);

  // Receives navigation state from the FDA Saved Drafts page — either
  // { openVerificationRequestId, draftId, mode } from "View"/"Continue
  // Editing", or nothing at all if the officer navigated here some other
  // way. Auto-opens the right request in the Verification Queue tab, and
  // — if a draftId was included — fetches the actual saved draft values
  // and pre-fills the determination form, so "Continue Editing" genuinely
  // continues rather than reopening a blank form.
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const incoming = location.state;
    if (!incoming?.openVerificationRequestId) return;

    const requestId = incoming.openVerificationRequestId;
    const draftId = incoming.draftId;
    const token = localStorage.getItem('access_token');

    // If this request is already sitting in the currently loaded queue
    // list, select it directly. Otherwise, set just the ID — the existing
    // detail-fetch useEffect (watching selectedQueueItem?.request_id)
    // picks this up automatically and fetches the full case detail.
    const existing = fdaQueueList.find((q) => q.request_id === requestId);
    setFdaActiveTab('queue');

    if (existing) {
      handleSelectItem(existing);
    } else {
      setSelectedQueueItem({ request_id: requestId });
    }

    if (draftId) {
      // Arrived from a saved draft — fetch its actual values and restore
      // them into the determination form.
      fetch(`${API_BASE}/drafts/fda-verification/${draftId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (data.draft_verification_status === 'registered' || data.draft_verification_status?.toLowerCase() === 'registered') {
            setFdaOfficialRemarks(data.draft_response_notes ?? '');
            setFdaAdvisoryRemarks('');
          } else if (data.draft_verification_status === 'unregistered' || data.draft_verification_status?.toLowerCase() === 'unregistered') {
            setFdaAdvisoryRemarks(data.draft_response_notes ?? '');
            setFdaOfficialRemarks('');
          } else {
            setFdaOfficialRemarks('');
            setFdaAdvisoryRemarks('');
          }
          setFdaCprNumber(data.draft_cpr_number ?? '');
          setFdaCprExpiry(data.draft_cpr_expiry ?? '');
          setFdaUnregisteredReason(data.draft_unregistered_reason ?? '');
          const rawStatus = data.draft_verification_status ?? '';
          const formattedStatus = rawStatus ? (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase()) : '';
          setFdaVerificationStatus(formattedStatus);
        })
        .catch(() => {
          triggerAlert('Could not load the saved draft values. Starting with a blank form.', 'danger');
          setFdaVerificationStatus('');
          setFdaCprNumber('');
          setFdaCprExpiry('');
          setFdaOfficialRemarks('');
          setFdaAdvisoryRemarks('');
          setFdaUnregisteredReason('');
        });
    } else {
      // No draft to restore — arrived from clicking a live queue card
      // directly, so just clear any stale form values from before.
      setFdaVerificationStatus('');
      setFdaCprNumber('');
      setFdaCprExpiry('');
      setFdaOfficialRemarks('');
      setFdaAdvisoryRemarks('');
      setFdaUnregisteredReason('');
    }

    // Clear navigation state so refreshing/back doesn't re-trigger this.
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // TAB SELECTION & VIEW TRANSITIONS

  const handleTabChange = (tabKey) => {
    if (fdaActiveTab === tabKey) return;
    setFdaIsRejecting(false);
    setFdaActiveTab(tabKey);
  };


  // FILTERING LOGIC FOR VERIFICATION QUEUE & FULL-WIDTH TABLES

  // CHANGED — queue filtering is now done server-side via query params, so
  // filteredQueue is just the raw fetched list. The old client-side useMemo
  // that filtered by fdaSearchQuery and fdaPriorityFilter has been removed;
  // those states now drive the debounced fetch useEffect below instead.
  const filteredQueue = fdaQueueList;

  // In case we'd need a client-side filtering, uncomment this and remove the server-side code
  /* const filteredCompleted = useMemo(() => {
    return fdaCompletedList.filter((item) => {
      const q = completedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.caseId.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.manufacturer.toLowerCase().includes(q) ||
        (item.productCode && item.productCode.toLowerCase().includes(q));

      const matchesCategory =
        !completedCategory || item.category === completedCategory;

      let matchesDateFrom = true;
      if (completedDateFrom) {
        matchesDateFrom = new Date(item.dateCompleted) >= new Date(completedDateFrom);
      }

      let matchesDateTo = true;
      if (completedDateTo) {
        matchesDateTo = new Date(item.dateCompleted) <= new Date(completedDateTo + 'T23:59:59');
      }

      return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
    });
  }, [fdaCompletedList, completedSearch, completedCategory, completedDateFrom, completedDateTo]); */

  // CHANGED — filtering is now done server-side via query params sent in the
  // fetchCompletedList useEffect below. fdaCompletedList already holds the
  // pre-filtered page of results returned by the backend.
  const filteredCompleted = fdaCompletedList;

  // CHANGED — filtering is now done server-side via query params sent in the
  // fetchRejectedList useEffect below. fdaRejectedList already holds the
  // pre-filtered page of results returned by the backend.
  // In case we'd need a client-side filtering, uncomment this and remove the server-side code:
  /* const filteredRejected = useMemo(() => {
    return fdaRejectedList.filter((item) => {
      const q = rejectedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.caseId.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.manufacturer.toLowerCase().includes(q) ||
        (item.productCode && item.productCode.toLowerCase().includes(q));

      const matchesCategory =
        !rejectedCategory || item.category === rejectedCategory;

      let matchesDateFrom = true;
      if (rejectedDateFrom) {
        matchesDateFrom = new Date(item.dateRejected) >= new Date(rejectedDateFrom);
      }

      let matchesDateTo = true;
      if (rejectedDateTo) {
        matchesDateTo = new Date(item.dateRejected) <= new Date(rejectedDateTo + 'T23:59:59');
      }

      return matchesSearch && matchesCategory && matchesDateFrom && matchesDateTo;
    });
  }, [fdaRejectedList, rejectedSearch, rejectedCategory, rejectedDateFrom, rejectedDateTo]); */
  const filteredRejected = fdaRejectedList;

  // Active item in Verification Queue
  const currentItem = selectedQueueItem;

  // CHANGED — sets selectedQueueItem on card click; fetchDetail is triggered
  // automatically by the useEffect that watches selectedQueueItem.request_id,
  // so it also fires on the initial auto-select after the list loads.
  const handleSelectItem = (item) => {
    setFdaIsRejecting(false);
    if (fdaActiveTab === 'queue') {
      setSelectedQueueItem(item);
      setFdaVerificationStatus('');
      setFdaCprNumber('');
      setFdaCprExpiry('');
      setFdaOfficialRemarks('');
      setFdaAdvisoryRemarks('');
      setFdaUnregisteredReason('');
      // fetchDetail is called below (defined after triggerAlert to avoid TDZ).
      // The call is deferred to the useEffect that watches selectedQueueItem.
    }
  };

  // Helper for success alerts
  const triggerAlert = (message, type = 'success') => {
    setFdaSuccessAlert({ message, type });
    setTimeout(() => {
      setFdaSuccessAlert(null);
    }, 4500);
  };

  // ADDED — fetches the full detail for a queue item by its request_id.
  // Defined here (after triggerAlert) so the .catch() can call triggerAlert
  // without hitting a temporal dead zone. Called from handleSelectItem on
  // card click, and from a useEffect that watches selectedQueueItem so the
  // detail panel is also populated on the initial auto-select after page load.
  const fetchDetail = (requestId) => {
    const token = localStorage.getItem('access_token');
    setDetailLoading(true);
    fetch(`${API_BASE}/verification-requests/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSelectedQueueDetail(data);
        // FIX 1 — keep selectedQueueItem in sync so currentItem (used in toasts & dialogs)
        // is enriched with case_reference and other fields when arriving via Continue Editing.
        setSelectedQueueItem((prev) => (prev ? { ...prev, ...data } : data));
      })
      .catch(() => {
        triggerAlert('Could not load the verification request details.', 'danger');
      })
      .finally(() => setDetailLoading(false));
  };

  // ADDED — helper function to fetch badge counts from the backend endpoint.
  // Called on component mount and after successful submit or reject actions.
  const fetchCounts = () => {
    const token = localStorage.getItem('access_token');
    fetch(`${API_BASE}/verification-requests/counts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setQueueCounts({
          verification_queue_count: data.verification_queue_count,
          completed_count: data.completed_count,
          rejected_count: data.rejected_count,
        });
      })
      .catch(() => {
        triggerAlert('Could not load verification queue counts from the server.', 'danger');
      });
  };

  useEffect(() => {
    fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ADDED — fetches the real Verification Queue list from the backend.
  // Runs on mount and re-runs (with 300 ms debounce) whenever fdaSearchQuery
  // or fdaPriorityFilter changes. Both filters are sent as a single combined
  // request; if priority is 'all' the parameter is omitted entirely.
  // SMOOTH LOADING — only triggers full loading state if list is currently empty.
  useEffect(() => {
    const token = localStorage.getItem('access_token');

    const timer = setTimeout(() => {
      if (fdaQueueList.length === 0) {
        setQueueLoading(true);
      }

      const params = new URLSearchParams();
      if (fdaSearchQuery.trim()) params.set('search', fdaSearchQuery.trim());
      if (fdaPriorityFilter !== 'all') params.set('priority', fdaPriorityFilter);
      const qs = params.toString() ? `?${params.toString()}` : '';

      fetch(`${API_BASE}/verification-requests/awaiting-fda${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setFdaQueueList(data);
          // Preserve currently selected card if it still exists in the new result
          setSelectedQueueItem((prev) => {
            if (prev && data.some((item) => item.request_id === prev.request_id)) {
              return prev;
            }
            return data[0] ?? null;
          });
        })
        .catch(() => {
          triggerAlert('Could not load the verification queue from the server.', 'danger');
        })
        .finally(() => setQueueLoading(false));
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fdaSearchQuery, fdaPriorityFilter]);


  // ADDED — whenever selectedQueueItem changes (either from a manual card click
  // via handleSelectItem, or from the auto-select after the list fetch resolves),
  // fetch the full detail for that item. This single useEffect covers both paths
  // cleanly and avoids calling fetchDetail from two separate places.
  // FIX 3 — removed the setSelectedQueueDetail(null) call that was here.
  // Keeping stale data visible while the next fetch is in-flight prevents the
  // panel from blanking/flickering every time the user clicks a different card.
  useEffect(() => {
    if (selectedQueueItem?.request_id) {
      fetchDetail(selectedQueueItem.request_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueueItem?.request_id]);


  // ADDED — fetches the Completed list from the backend whenever any filter or
  // page changes. completedSearch is debounced (300 ms); all other dependencies
  // trigger immediately since they come from dropdowns/date pickers, not typing.
  // SMOOTH LOADING — only triggers full loading state if list is currently empty.
  useEffect(() => {
    const token = localStorage.getItem('access_token');

    const doFetch = () => {
      if (fdaCompletedList.length === 0) {
        setCompletedLoading(true);
      }
      const params = new URLSearchParams();
      if (completedSearch.trim()) params.set('search', completedSearch.trim());
      if (completedCategory) params.set('category', completedCategory);
      if (completedDateFrom) params.set('date_from', completedDateFrom);
      if (completedDateTo) params.set('date_to', completedDateTo);
      // ADDED — sends verification_result only when a specific result is selected;
      // omitted entirely when empty ('All Results') to let the backend return both.
      if (completedResultFilter) params.set('verification_result', completedResultFilter);
      params.set('page', String(completedPage));
      params.set('page_size', '25');

      fetch(`${API_BASE}/verification-requests/completed?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setFdaCompletedList(data.items);
          setCompletedTotal(data.total);
        })
        .catch(() => {
          triggerAlert('Could not load completed verification records from the server.', 'danger');
        })
        .finally(() => setCompletedLoading(false));
    };

    // Debounce only the text search; other filters fire immediately.
    const timer = setTimeout(doFetch, completedSearch ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // CHANGED — added completedResultFilter and dataRefreshTrigger to the dependency array.
  }, [completedSearch, completedCategory, completedDateFrom, completedDateTo, completedPage, completedResultFilter, dataRefreshTrigger]);

  // ADDED — fetches the Rejected list from the backend whenever any filter or
  // page changes. rejectedSearch is debounced (300 ms); all other dependencies
  // trigger immediately since they come from dropdowns/date pickers, not typing.
  // SMOOTH LOADING — only triggers full loading state if list is currently empty.
  useEffect(() => {
    const token = localStorage.getItem('access_token');

    const doFetch = () => {
      if (fdaRejectedList.length === 0) {
        setRejectedLoading(true);
      }
      const params = new URLSearchParams();
      if (rejectedSearch.trim()) params.set('search', rejectedSearch.trim());
      if (rejectedCategory) params.set('category', rejectedCategory);
      if (rejectedDateFrom) params.set('date_from', rejectedDateFrom);
      if (rejectedDateTo) params.set('date_to', rejectedDateTo);
      params.set('page', String(rejectedPage));
      params.set('page_size', '25');

      fetch(`${API_BASE}/verification-requests/rejected?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setFdaRejectedList(data.items);
          setRejectedTotal(data.total);
        })
        .catch(() => {
          triggerAlert('Could not load rejected verification records from the server.', 'danger');
        })
        .finally(() => setRejectedLoading(false));
    };

    // Debounce only the text search; other filters fire immediately.
    const timer = setTimeout(doFetch, rejectedSearch ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rejectedSearch, rejectedCategory, rejectedDateFrom, rejectedDateTo, rejectedPage, dataRefreshTrigger]);

  // CONFIRMATION MODAL HANDLERS

  // Open modal for Save Draft
  const handleOpenSaveDraftModal = () => {
    if (!currentItem) return;
    setFdaModalConfig({
      type: 'save_draft',
      title: 'Save Verification as Draft?',
      // CHANGED — uses case_reference (real field name) instead of the old caseId.
      description: `Save current verification draft for Case ID ${currentItem.case_reference}? You can return to continue working on this request anytime from the Verification Queue.`,
      confirmText: 'Save Draft',
      confirmVariant: 'secondary'
    });
  };

  // Open modal for Submit Verification
  // CHANGED — Added client-side validation per backend specifications before opening modal.
  const handleOpenSubmitModal = () => {
    if (!currentItem) return;
    if (!fdaVerificationStatus) {
      triggerAlert('Please select a Verification Status (Registered or Unregistered) before submitting.', 'danger');
      return;
    }

    const statusLower = fdaVerificationStatus.toLowerCase();
    if (statusLower === 'registered') {
      if (!fdaCprNumber.trim() || !fdaOfficialRemarks.trim()) {
        triggerAlert('CPR Registration Number and Official FDA Verification Remarks are required for a Registered determination.', 'danger');
        return;
      }
    } else if (statusLower === 'unregistered') {
      if (!fdaUnregisteredReason.trim()) {
        triggerAlert('Reason Product is Not Registered is required for an Unregistered determination.', 'danger');
        return;
      }
    }

    setFdaModalConfig({
      type: 'submit',
      title: 'Submit Verification Result back to LEA?',
      // CHANGED — uses case_reference (real field name) instead of the old caseId.
      description: `Transmit official FDA verification result (${fdaVerificationStatus.toUpperCase()}) for Case ID ${currentItem.case_reference} back to LEA-CIDG? This will finalize the verification and notify the LEA investigation team.`,
      confirmText: 'Submit Verification',
      confirmVariant: 'primary'
    });
  };

  // Open modal for Reject Request
  // CHANGED — Added client-side validation for non-empty rejection reason before opening modal.
  const handleOpenRejectModal = () => {
    if (!currentItem) return;
    if (!fdaRejectionReason.trim()) {
      triggerAlert('Please provide a rejection reason before rejecting this request.', 'danger');
      return;
    }

    setFdaModalConfig({
      type: 'reject',
      title: 'Reject Verification Request?',
      // CHANGED — uses case_reference (real field name) instead of the old caseId.
      description: `Reject verification request for Case ID ${currentItem.case_reference} back to LEA-CIDG? The request will be recorded as Rejected and LEA officers will be notified with your rejection reason.`,
      confirmText: 'Confirm Rejection',
      confirmVariant: 'danger'
    });
  };

  // Modal execution handler
  // CHANGED — Wired Submit and Reject modal confirmations to real backend API endpoints:
  // POST /verification-requests/{request_id}/fda-response and POST /verification-requests/{request_id}/fda-reject.
  // Performs error handling, item removal, form reset, and counts re-fetch.
  const handleExecuteModalAction = async () => {
    if (!fdaModalConfig || !currentItem) return;

    const token = localStorage.getItem('access_token');

    if (fdaModalConfig.type === 'save_draft') {
      // ADDED — calls the real upsert endpoint.
      // POST /drafts/fda-verification/{verification_request_id}
      // No required-field validation — saving a draft is always allowed with any
      // combination of empty/filled fields, since the whole point is saving
      // incomplete work. This intentionally has no validation guard, unlike Submit/Reject.
      try {
        const payload = {
          // ADDED — each field maps from the corresponding form state variable.
          // Empty strings are coerced to null so the backend never receives "".
          draft_verification_status: fdaVerificationStatus.toLowerCase() || null,
          draft_cpr_number: fdaCprNumber.trim() || null,
          draft_cpr_expiry: fdaCprExpiry.trim() || null,
          draft_response_notes: fdaVerificationStatus.toLowerCase() === 'registered'
            ? (fdaOfficialRemarks.trim() || null)
            : (fdaAdvisoryRemarks.trim() || null),
          draft_unregistered_reason: fdaUnregisteredReason.trim() || null,
        };

        const res = await fetch(`${API_BASE}/drafts/fda-verification/${currentItem.request_id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          // ADDED — reads the detail field from the error response body and surfaces
          // it via triggerAlert, matching the same pattern used in the submit/reject
          // handlers above. Modal is intentionally NOT closed on error so the user
          // can see the message and decide whether to retry or cancel.
          const errData = await res.json().catch(() => null);
          const errMsg = errData?.detail || 'Failed to save draft.';
          triggerAlert(errMsg, 'danger');
          return;
        }

        // ADDED — on success: show toast, close modal.
        // The card stays selected (selectedQueueItem / selectedQueueDetail are NOT cleared)
        // and form fields are NOT reset — unlike Submit/Reject, saving a draft does not
        // change the request's verification_request_status; the officer is still actively
        // working on this request and expects their entered values to remain.
        // CHANGED — uses case_reference (real field name) instead of the old caseId.
        triggerAlert(`Draft saved successfully for Case ID ${currentItem.case_reference}.`, 'success');
        setFdaModalConfig(null);

      } catch (err) {
        // ADDED — network-level failure (fetch throws entirely, e.g. server unreachable),
        // matching the try/catch pattern used in the submit/reject handlers.
        triggerAlert('Network error occurred while saving the draft.', 'danger');
      }
    }
    else if (fdaModalConfig.type === 'submit') {
      try {
        const payload = {
          verification_status: fdaVerificationStatus.toLowerCase(),
          cpr_number: fdaCprNumber.trim() || null,
          cpr_expiry: fdaCprExpiry.trim() || null,
          response_notes: fdaVerificationStatus.toLowerCase() === 'registered'
            ? (fdaOfficialRemarks.trim() || null)
            : (fdaAdvisoryRemarks.trim() || null),
          unregistered_reason: fdaUnregisteredReason.trim() || null
        };

        const res = await fetch(`${API_BASE}/verification-requests/${currentItem.request_id}/fda-response`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const errMsg = errData?.detail || 'Failed to submit verification response.';
          triggerAlert(errMsg, 'danger');
          setFdaModalConfig(null);
          return;
        }

        const caseRef = currentItem.case_reference || selectedQueueDetail?.case_reference || '';
        triggerAlert(`Verification submitted successfully for Case ID ${caseRef}.`, 'success');

        // Remove from current list and select next item if available
        if (fdaActiveTab === 'queue') {
          const remaining = fdaQueueList.filter((q) => q.request_id !== currentItem.request_id);
          setFdaQueueList(remaining);
          const nextItem = remaining[0] || null;
          setSelectedQueueItem(nextItem);
          if (!nextItem) {
            setSelectedQueueDetail(null);
          }
        }

        // Reset form states
        setFdaVerificationStatus('');
        setFdaCprNumber('');
        setFdaCprExpiry('');
        setFdaOfficialRemarks('');
        setFdaAdvisoryRemarks('');
        setFdaUnregisteredReason('');

        // Re-fetch badge counts and trigger Completed/Rejected table refresh (FIX 4)
        fetchCounts();
        setDataRefreshTrigger((prev) => prev + 1);

      } catch (err) {
        triggerAlert('Network error occurred while submitting verification.', 'danger');
      } finally {
        setFdaModalConfig(null);
      }
    }
    else if (fdaModalConfig.type === 'reject') {
      try {
        const payload = {
          rejection_reason: fdaRejectionReason.trim()
        };

        const res = await fetch(`${API_BASE}/verification-requests/${currentItem.request_id}/fda-reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const errMsg = errData?.detail || 'Failed to reject verification request.';
          triggerAlert(errMsg, 'danger');
          setFdaModalConfig(null);
          return;
        }

        const caseRef = currentItem.case_reference || selectedQueueDetail?.case_reference || '';
        triggerAlert(`Verification request rejected for Case ID ${caseRef}.`, 'success');

        // Remove from current list and select next item if available
        if (fdaActiveTab === 'queue') {
          const remaining = fdaQueueList.filter((q) => q.request_id !== currentItem.request_id);
          setFdaQueueList(remaining);
          const nextItem = remaining[0] || null;
          setSelectedQueueItem(nextItem);
          if (!nextItem) {
            setSelectedQueueDetail(null);
          }
        }

        // Reset form states
        setFdaRejectionReason('');
        setFdaIsRejecting(false);
        setFdaVerificationStatus('');
        setFdaCprNumber('');
        setFdaCprExpiry('');
        setFdaOfficialRemarks('');
        setFdaAdvisoryRemarks('');
        setFdaUnregisteredReason('');

        // Re-fetch badge counts and trigger Completed/Rejected table refresh (FIX 4)
        fetchCounts();
        setDataRefreshTrigger((prev) => prev + 1);

      } catch (err) {
        triggerAlert('Network error occurred while rejecting verification request.', 'danger');
      } finally {
        setFdaModalConfig(null);
      }
    }
  };

  // ADDED — fetches the full completed detail for a given request_id and opens
  // the existing Verification Record modal with real API field names.
  // Endpoint: GET /verification-requests/completed/{request_id}
  const handleViewCompletedRecord = (requestId) => {
    const token = localStorage.getItem('access_token');
    fetch(`${API_BASE}/verification-requests/completed/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setFdaRecordModalData({ ...data, _type: 'completed' });
      })
      .catch(() => {
        triggerAlert('Could not load the verification record details.', 'danger');
      });
  };

  // ADDED — fetches the full rejected detail for a given request_id and opens
  // the existing Record modal with _type: 'rejected'.
  // Endpoint: GET /verification-requests/rejected/{request_id}
  const handleViewRejectedRecord = (requestId) => {
    const token = localStorage.getItem('access_token');
    fetch(`${API_BASE}/verification-requests/rejected/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setFdaRecordModalData({ ...data, _type: 'rejected' });
      })
      .catch(() => {
        triggerAlert('Could not load the rejected request record details.', 'danger');
      });
  };

  // CHANGED — switch cases updated to lowercase to match the backend's priority
  // values ('urgent', 'high', 'standard', 'critical'). Also adds 'critical'.
  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'FdaVerifBadgeUrgent';
      case 'high':
        return 'FdaVerifBadgeHigh';
      case 'critical':
        return 'FdaVerifBadgeUrgent'; // same red styling as urgent
      case 'standard':
      default:
        return 'FdaVerifBadgeStandard';
    }
  };

  return (
    <div className="FdaDashboardMain">
      <Sidebar sidebarType="FDA" />
      <div className="FdaContentContainer">
        <TopBar topbarType="FDA" />

        <div className="FdaMainFeed FdaVerifFeedContainer">

          {/* HEADER SECTION */}

          <div className="FdaVerifHeader">
            <div className="FdaVerifHeaderLeft">
              <p className="FdaVerifEyebrow">FDA · VERIFICATION MANAGEMENT SYSTEM</p>
              <h1 className="FdaVerifTitle">FDA Verification Queue</h1>
              <p className="FdaVerifSubtitle">
                Inspect verification requests submitted by LEA, review attached evidence, verify product CPR / LTO registrations, and submit official FDA findings.
              </p>
            </div>
          </div>


          {/* FLOATING SUCCESS / WARNING TOAST ALERT */}

          {fdaSuccessAlert && (
            <div className={`FdaVerifToastAlert FdaVerifToast_${fdaSuccessAlert.type}`} role="alert">
              <div className="FdaVerifToastIconWrap">
                {fdaSuccessAlert.type === 'success' && <CheckCircle size={18} />}
                {fdaSuccessAlert.type === 'info' && <Info size={18} />}
                {fdaSuccessAlert.type === 'warning' && <AlertTriangle size={18} />}
                {fdaSuccessAlert.type === 'danger' && <XCircle size={18} />}
              </div>
              <div className="FdaVerifToastBody">
                <p className="FdaVerifToastMessage">{fdaSuccessAlert.message}</p>
              </div>
              <button
                className="FdaVerifToastCloseBtn"
                onClick={() => setFdaSuccessAlert(null)}
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* STATS METRIC SUMMARY BAR - INFORMATIONAL ONLY (NON-CLICKABLE) */}

          <div className="FdaVerifStatsBar">

            <div className="FdaVerifStatCard">
              <div className="FdaVerifStatCardTop">
                <span className="FdaVerifStatBadge FdaVerifStatBadgeQueue">
                  <Clock size={14} />
                </span>
              </div>
              {/* CHANGED — was fdaQueueList.length (dummy count); now reads from
                  queueCounts.verification_queue_count fetched from the backend.
                  Shows "-" while the fetch is pending. */}
              <span className="FdaVerifStatValue">{queueCounts !== null ? queueCounts.verification_queue_count : '-'}</span>
              <span className="FdaVerifStatLabel">Verification Queue</span>
            </div>

            <div className="FdaVerifStatCard">
              <div className="FdaVerifStatCardTop">
                <span className="FdaVerifStatBadge FdaVerifStatBadgeCompleted">
                  <CheckCircle2 size={14} />
                </span>
              </div>
              {/* CHANGED — was fdaCompletedList.length (dummy count); now reads
                  from queueCounts.completed_count fetched from the backend. */}
              <span className="FdaVerifStatValue">{queueCounts !== null ? queueCounts.completed_count : '-'}</span>
              <span className="FdaVerifStatLabel">Completed</span>
            </div>

            <div className="FdaVerifStatCard">
              <div className="FdaVerifStatCardTop">
                <span className="FdaVerifStatBadge FdaVerifStatBadgeRejected">
                  <XCircle size={14} />
                </span>
              </div>
              {/* CHANGED — was fdaRejectedList.length (dummy count); now reads
                  from queueCounts.rejected_count fetched from the backend. */}
              <span className="FdaVerifStatValue">{queueCounts !== null ? queueCounts.rejected_count : '-'}</span>
              <span className="FdaVerifStatLabel">Rejected Requests</span>
            </div>

          </div>

          {/* WORKFLOW NAVIGATION TABS - VISUALLY IDENTICAL TO VIEW REPORTS PILL TABS */}
          {/* BACKEND: Tab switching triggers state filter & loads corresponding API dataset */}
          <div className="FdaFilterRow FdaVerifTabsRow">
            <div className="FdaPillContainer">
              <button
                className={`FdaPill ${fdaActiveTab === 'queue' ? 'active' : ''}`}
                onClick={() => handleTabChange('queue')}
                id="fda-tab-verification-queue"
              >
                Verification Queue
              </button>

              <button
                className={`FdaPill ${fdaActiveTab === 'completed' ? 'active' : ''}`}
                onClick={() => handleTabChange('completed')}
                id="fda-tab-completed"
              >
                Completed
              </button>

              <button
                className={`FdaPill ${fdaActiveTab === 'rejected' ? 'active' : ''}`}
                onClick={() => handleTabChange('rejected')}
                id="fda-tab-rejected"
              >
                Rejected Requests
              </button>
            </div>
          </div>


          {/* VERIFICATION QUEUE — SPLIT LAYOUT (ONLY FOR QUEUE TAB) */}

          {fdaActiveTab === 'queue' && (
            <div className="FdaVerifSplitLayout">

              {/* LEFT COLUMN: QUEUE LIST PANEL */}

              <div className="FdaVerifQueueColumn">

                {/* Search & Priority Filter Header */}
                <div className="FdaVerifFilterHeader">
                  <div className="FdaVerifSearchBox">
                    <Search size={16} className="FdaVerifSearchIcon" />
                    <input
                      type="text"
                      className="FdaVerifSearchInput"
                      placeholder="Search Case ID, Product, or Manufacturer..."
                      value={fdaSearchQuery}
                      onChange={(e) => { setFdaSearchQuery(e.target.value); setQueuePage(1); }}
                      id="fda-verification-search-input"
                    />
                    {fdaSearchQuery && (
                      <button className="FdaVerifClearSearchBtn" onClick={() => { setFdaSearchQuery(''); setQueuePage(1); }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="FdaVerifPriorityFilterWrap">
                    <Filter size={14} className="FdaVerifFilterIcon" />
                    <select
                      className="FdaVerifPrioritySelect"
                      value={fdaPriorityFilter}
                      onChange={(e) => { setFdaPriorityFilter(e.target.value); setQueuePage(1); }}
                      id="fda-verification-priority-filter"
                    >
                      <option value="all">All Priorities</option>
                      {/* CHANGED — option values are now lowercase to match the backend.
                          'critical' added to align with the real API priority enum. */}
                      <option value="urgent">Urgent</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="standard">Standard</option>
                    </select>
                  </div>
                </div>

                {/* Request Cards List */}
                <div className="FdaVerifCardsScrollList">
                  {/* ADDED — shows a loading skeleton row only on initial load when queue is empty */}
                  {queueLoading && filteredQueue.length === 0 ? (
                    <div className="FdaVerifEmptyList">
                      <Clock size={32} className="FdaVerifEmptyIcon" />
                      <p className="FdaVerifEmptyTitle">Loading Queue…</p>
                      <p className="FdaVerifEmptyText">Fetching verification requests from the server.</p>
                    </div>
                  ) : filteredQueue.length === 0 ? (
                    <div className="FdaVerifEmptyList">
                      <Clock size={32} className="FdaVerifEmptyIcon" />
                      <p className="FdaVerifEmptyTitle">No Queue Requests</p>
                      <p className="FdaVerifEmptyText">There are currently no new verification requests matching your filter.</p>
                    </div>
                  ) : (() => {
                    const QUEUE_PAGE_SIZE = 10;
                    const totalQueuePages = Math.ceil(filteredQueue.length / QUEUE_PAGE_SIZE) || 1;
                    const safeQueuePage = Math.min(Math.max(1, queuePage), totalQueuePages);
                    const queueStartIdx = (safeQueuePage - 1) * QUEUE_PAGE_SIZE;
                    const queueEndIdx = Math.min(queueStartIdx + QUEUE_PAGE_SIZE, filteredQueue.length);
                    const paginatedQueue = filteredQueue.slice(queueStartIdx, queueEndIdx);
                    return (
                      <>
                        {paginatedQueue.map((item) => {
                          const isSelected = selectedQueueItem?.request_id === item.request_id;
                          return (
                            <div
                              key={item.request_id}
                              className={`FdaVerifCard ${isSelected ? 'FdaVerifCardSelected' : ''}`}
                              onClick={() => handleSelectItem(item)}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="FdaVerifCardTop">
                                <span className="FdaVerifCaseId">{item.case_reference}</span>
                                <span className={`FdaVerifPriorityBadge ${getPriorityBadgeClass(item.priority)}`}>
                                  {item.priority
                                    ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1)
                                    : ''}
                                </span>
                              </div>

                              <h3 className="FdaVerifProductName">{item.product_name}</h3>

                              <div className="FdaVerifCardMetaRow">
                                <span>{item.manufacturer}</span>
                              </div>

                              <div className="FdaVerifCardFooter">
                                <span className="FdaVerifCategoryTag">{item.product_category}</span>
                                <span className="FdaVerifDateReceived">
                                  <Calendar size={12} />
                                  {item.requested_at
                                    ? new Date(item.requested_at).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true,
                                    })
                                    : '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {filteredQueue.length > 0 && (
                          <div className="FdaCaseListFooter">
                            <span className="FdaFooterInfo">
                              Showing {queueStartIdx + 1}–{queueEndIdx} of {filteredQueue.length}
                            </span>
                            <div className="FdaPagination">
                              <button
                                className="BtnPageNav"
                                disabled={safeQueuePage === 1}
                                onClick={() => setQueuePage(safeQueuePage - 1)}
                              >
                                <ChevronLeft size={14} />
                                Prev
                              </button>
                              {Array.from({ length: totalQueuePages }, (_, i) => i + 1).map(page => (
                                <button
                                  key={page}
                                  className={`FdaPageNumber ${safeQueuePage === page ? 'active' : ''}`}
                                  onClick={() => setQueuePage(page)}
                                >
                                  {page}
                                </button>
                              ))}
                              <button
                                className="BtnPageNav"
                                disabled={safeQueuePage === totalQueuePages}
                                onClick={() => setQueuePage(safeQueuePage + 1)}
                              >
                                Next
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>


              {/* RIGHT COLUMN: SELECTED REQUEST DETAILS PANEL */}
              <div className="FdaVerifDetailsColumn">
                {!currentItem ? (
                  <div className="FdaVerifEmptyDetails">
                    <FileText size={44} className="FdaVerifEmptyDetailsIcon" />
                    <h3>No Request Selected</h3>
                    <p>Select a verification request from the left queue list to review details and perform FDA verification actions.</p>
                  </div>
                ) : (
                  <div className="FdaVerifDetailsScrollBody">

                    {/* DETAILS HEADER BAR */}
                    {/* CHANGED — uses real field names from selectedQueueDetail (full
                        detail response) instead of the old dummy currentItem fields.
                        Falls back to currentItem (list-item shape) while the detail
                        fetch is still loading so the breadcrumb is never blank. */}
                    <div className="FdaVerifDetailsHeader">
                      <div>
                        <div className="FdaVerifDetailsBreadcrumb">
                          <span className="FdaVerifBreadcrumbActive">
                            {selectedQueueDetail?.case_reference ?? currentItem.case_reference}
                          </span>
                          {/* ADDED — subtle inline indicator when refetching details in background */}
                          {detailLoading && selectedQueueDetail && (
                            <span style={{ marginLeft: '8px', fontSize: '11px', color: '#1B4332', opacity: 0.8, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Updating…
                            </span>
                          )}
                        </div>
                        <h2 className="FdaVerifDetailsTitle">
                          {selectedQueueDetail?.product_name ?? currentItem.product_name}
                        </h2>
                        <p className="FdaVerifDetailsSubTitle">Manufacturer: <strong>
                          {selectedQueueDetail?.manufacturer ?? currentItem.manufacturer}
                        </strong></p>
                      </div>
                    </div>

                    {/* MERGED CARD: Case Information + Verification Request Information + Auto-Attached Evidence */}
                    <div className="FdaVerifMergedInfoCard">

                      {/* CHANGED — full loading skeleton only displays on initial load (when selectedQueueDetail is null AND detailLoading is true).
                          When switching cards, existing detail data stays visible while the new request resolves in background without flickering. */}
                      {detailLoading && !selectedQueueDetail ? (
                        <div className="FdaVerifEmptyDetails" style={{ minHeight: '180px' }}>
                          <FileText size={32} className="FdaVerifEmptyDetailsIcon" />
                          <p style={{ marginTop: '0.5rem', color: 'var(--fda-text-muted, #888)' }}>Loading request details…</p>
                        </div>
                      ) : (
                        <>
                          {/* SECTION 1: CASE INFORMATION */}
                          <div className="FdaVerifMergedSection">
                            <div className="FdaVerifSectionHeader">
                              <FileText size={16} className="FdaVerifGreenIcon" />
                              <h3>Case Information</h3>
                            </div>

                            <div className="FdaVerifGrid2">
                              <div className="FdaVerifInfoGroup">
                                <span className="FdaVerifInfoLabel">Case ID (LEA Reference):</span>
                                {/* CHANGED — was currentItem.caseId (dummy); now reads from
                                    selectedQueueDetail.case_reference (real field name). */}
                                <span className="FdaVerifInfoValueHighlight">{selectedQueueDetail?.case_reference ?? '—'}</span>
                              </div>

                              <div className="FdaVerifInfoGroup">
                                <span className="FdaVerifInfoLabel">Product Name:</span>
                                {/* CHANGED — was currentItem.productName; now product_name. */}
                                <span className="FdaVerifInfoValue">{selectedQueueDetail?.product_name ?? '—'}</span>
                              </div>

                              <div className="FdaVerifInfoGroup">
                                <span className="FdaVerifInfoLabel">Manufacturer:</span>
                                {/* CHANGED — field name unchanged (manufacturer), now from selectedQueueDetail. */}
                                <span className="FdaVerifInfoValue">{selectedQueueDetail?.manufacturer ?? '—'}</span>
                              </div>

                              <div className="FdaVerifInfoGroup">
                                <span className="FdaVerifInfoLabel">Requesting LEA Officer / Unit:</span>
                                {/* CHANGED — was currentItem.complainant (dummy); real field is
                                    requested_by_name. Show 'N/A' when null so 'null' never
                                    appears as literal text. */}
                                <span className="FdaVerifInfoValue">
                                  {selectedQueueDetail?.requested_by_name ?? 'N/A'}
                                </span>
                              </div>

                              <div className="FdaVerifInfoGroup">
                                <span className="FdaVerifInfoLabel">Product Category:</span>
                                {/* CHANGED — was currentItem.category; now product_category. */}
                                <span className="FdaVerifInfoValue">{selectedQueueDetail?.product_category ?? '—'}</span>
                              </div>

                              <div className="FdaVerifInfoGroup">
                                <span className="FdaVerifInfoLabel">Date Logged &amp; Received:</span>
                                {/* CHANGED — was currentItem.dateLogged (dummy string); now
                                    formats selectedQueueDetail.requested_at (ISO 8601) using
                                    the same toLocaleString pattern used elsewhere in this file. */}
                                <span className="FdaVerifInfoValue">
                                  {selectedQueueDetail?.requested_at
                                    ? new Date(selectedQueueDetail.requested_at).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true,
                                    })
                                    : '—'}
                                </span>
                              </div>

                              <div className="FdaVerifInfoGroup FdaVerifGridFull">
                                <span className="FdaVerifInfoLabel">Verification Request Source:</span>
                                {/* CHANGED — was currentItem.source which showed the raw backend
                                    value e.g. "walk_in". Every request in this queue is
                                    LEA-originated by definition, so we always display the
                                    human-readable static label instead of transforming a field. */}
                                <span className="FdaVerifInfoValue">LEA Verification Request</span>
                              </div>
                            </div>
                          </div>

                          <hr className="FdaVerifSectionDivider" />

                          {/* SECTION 2: VERIFICATION REQUEST INFORMATION FROM LEA */}

                          <div className="FdaVerifMergedSection">
                            <div className="FdaVerifSectionHeader">
                              <FileText size={16} className="FdaVerifGreenIcon" />
                              <h3>Verification Request Information (LEA-CIDG)</h3>
                            </div>

                            <div className="FdaVerifGrid2">
                              <div className="FdaVerifInfoGroup">
                                <span className="FdaVerifInfoLabel">Product Code / Barcode:</span>
                                {/* CHANGED — was currentItem.productCode; now product_code
                                    from selectedQueueDetail. Null-safe fallback to 'N/A'. */}
                                <span className="FdaVerifCodeBadge">
                                  {selectedQueueDetail?.product_code || 'N/A'}
                                </span>
                              </div>

                              <div className="FdaVerifInfoGroup">
                                <span className="FdaVerifInfoLabel">Priority Level:</span>
                                {/* CHANGED — was currentItem.priority (dummy capitalized);
                                    now from selectedQueueDetail.priority (lowercase from
                                    backend). Capitalize for display, same as card badge. */}
                                <span className={`FdaVerifPriorityBadge ${getPriorityBadgeClass(selectedQueueDetail?.priority)}`}>
                                  {selectedQueueDetail?.priority
                                    ? selectedQueueDetail.priority.charAt(0).toUpperCase() + selectedQueueDetail.priority.slice(1)
                                    : '—'}
                                </span>
                              </div>

                              <div className="FdaVerifInfoGroup FdaVerifGridFull">
                                <span className="FdaVerifInfoLabel">Notes &amp; Statement from LEA Officers:</span>
                                {/* CHANGED — was currentItem.leaNotes (dummy); now
                                    complaint_statement from selectedQueueDetail. */}
                                <div className="FdaVerifNotesBox">
                                  <p>{selectedQueueDetail?.complaint_statement ?? 'No statement provided.'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <hr className="FdaVerifSectionDivider" />

                          {/* SECTION 3: AUTO-ATTACHED EVIDENCE & REQUEST DOCUMENTS */}

                          <div className="FdaVerifMergedSection">
                            <div className="FdaVerifSectionHeader">
                              <Paperclip size={16} className="FdaVerifGreenIcon" />
                              <h3>Auto-Attached Evidence &amp; Request Documents</h3>
                            </div>

                            {/* CHANGED — was currentItem.documents (dummy array); now
                                selectedQueueDetail.attached_files (real field name).
                                Each file uses file_id as the React key and for the
                                download endpoint. Download action calls
                                GET /shared-files/{file_id}/download with Bearer auth
                                and triggers a browser download via a temporary anchor. */}
                            <div className="FdaVerifDocsGrid">
                              {selectedQueueDetail?.attached_files && selectedQueueDetail.attached_files.length > 0 ? (
                                selectedQueueDetail.attached_files.map((file) => (
                                  <div key={file.file_id} className="FdaVerifDocCard">
                                    <div className="FdaVerifDocIcon">
                                      <FileText size={18} />
                                    </div>
                                    <div className="FdaVerifDocInfo">
                                      {/* CHANGED — was doc.name; now file.file_name. */}
                                      <p className="FdaVerifDocName">{file.file_name}</p>
                                      {/* CHANGED — was doc.size; now file.file_size_display
                                          (human-readable string e.g. "334.2 KB" already
                                          formatted by the backend). */}
                                      <span className="FdaVerifDocMeta">{file.file_size_display}</span>
                                    </div>
                                    <div className="FdaVerifDocActions">
                                      {/* FIX 1 — restored original eye-icon pattern: clicking
                                          opens the preview modal (fdaDocPreviewModal). The
                                          actual download fetch has been MOVED to the
                                          "Download Attachment" button inside that modal.
                                          The eye icon's only job is to populate the modal. */}
                                      <button
                                        className="FdaVerifDocActionBtn"
                                        title="Inspect Attachment"
                                        onClick={() => setFdaDocPreviewModal(file)}
                                      >
                                        <Eye size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="FdaVerifNoDocsText">No evidence documents attached to this request.</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                    </div>

                    {/* SECTION 4: FDA VERIFICATION RESULT INTERACTIVE CONTROL PANEL — REMAINS A SEPARATE STANDALONE CARD */}
                    {/* (For Verification Queue Tab) */}

                    <div className="FdaVerifSectionCard FdaVerifControlPanelCard">

                      {!fdaIsRejecting ? (
                        <>
                          <div className="FdaVerifSectionHeader">
                            <ShieldCheck size={18} className="FdaVerifGreenIcon" />
                            <div>
                              <h3 className="FdaVerifControlTitle">FDA Verification Result Section</h3>
                              <p className="FdaVerifControlSub">Select verification determination and enter official FDA database findings.</p>
                            </div>
                          </div>

                          <div className="FdaVerifControlForm">

                            {/* Verification Status Radio Selection */}
                            <div className="FdaVerifFormGroup">
                              <label className="FdaVerifFormLabel">
                                Verification Status <span className="FdaVerifRequired">*</span>
                              </label>

                              {/* BACKEND: maps to verification_requests.fda_verification_status */}
                              <div className="FdaVerifRadioOptionsGroup">
                                <label
                                  className={`FdaVerifRadioCard ${fdaVerificationStatus === 'Registered' ? 'FdaVerifRadioRegisteredActive' : ''}`}
                                  id="fda-radio-status-registered"
                                >
                                  <input
                                    type="radio"
                                    name="fdaVerificationStatus"
                                    value="Registered"
                                    checked={fdaVerificationStatus === 'Registered'}
                                    onChange={(e) => setFdaVerificationStatus(e.target.value)}
                                  />
                                  <div className="FdaVerifRadioContent">
                                    <div className="FdaVerifRadioHeader">
                                      <CheckCircle size={16} className="FdaVerifGreenIcon" />
                                      <span className="FdaVerifRadioTitle">Registered Product</span>
                                    </div>
                                    <p className="FdaVerifRadioDesc">Product holds valid, active FDA Certificate of Product Registration (CPR).</p>
                                  </div>
                                </label>

                                <label
                                  className={`FdaVerifRadioCard ${fdaVerificationStatus === 'Unregistered' ? 'FdaVerifRadioUnregisteredActive' : ''}`}
                                  id="fda-radio-status-unregistered"
                                >
                                  <input
                                    type="radio"
                                    name="fdaVerificationStatus"
                                    value="Unregistered"
                                    checked={fdaVerificationStatus === 'Unregistered'}
                                    onChange={(e) => setFdaVerificationStatus(e.target.value)}
                                  />
                                  <div className="FdaVerifRadioContent">
                                    <div className="FdaVerifRadioHeader">
                                      <AlertTriangle size={16} className="FdaVerifRedIcon" />
                                      <span className="FdaVerifRadioTitle">Unregistered Product</span>
                                    </div>
                                    <p className="FdaVerifRadioDesc">No valid CPR found, expired license, or counterfeit registration mark.</p>
                                  </div>
                                </label>
                              </div>
                            </div>

                            {/* DYNAMIC PANEL 1: REGISTERED CONFIRMATION PANEL */}
                            {fdaVerificationStatus === 'Registered' && (
                              <div className="FdaVerifRegisteredPanel">
                                <div className="FdaVerifPanelHeaderGreen">
                                  <CheckCircle size={18} />
                                  <div>
                                    <h4>CONFIRMED REGISTERED PRODUCT</h4>
                                    <p>Provide verified CPR details and official regulatory remarks.</p>
                                  </div>
                                </div>

                                <div className="FdaVerifGrid2" style={{ marginBottom: '12px' }}>
                                  <div className="FdaVerifFormGroup">
                                    <label className="FdaVerifFormLabel">
                                      FDA CPR Registration Number <span className="FdaVerifRequired">*</span>
                                    </label>
                                    {/* BACKEND: maps to verification_requests.fda_cpr_number */}
                                    <input
                                      type="text"
                                      className="FdaVerifTextInput"
                                      placeholder="e.g. FDA-CPR-2024-99812"
                                      value={fdaCprNumber}
                                      onChange={(e) => setFdaCprNumber(e.target.value)}
                                      id="fda-input-cpr-number"
                                    />
                                  </div>

                                  <div className="FdaVerifFormGroup">
                                    <label className="FdaVerifFormLabel">CPR Validity / Expiry Date</label>
                                    {/* BACKEND: maps to verification_requests.fda_cpr_expiry */}
                                    <input
                                      type="date"
                                      className="FdaVerifTextInput"
                                      value={fdaCprExpiry}
                                      onChange={(e) => setFdaCprExpiry(e.target.value)}
                                      id="fda-input-cpr-expiry"
                                    />
                                  </div>
                                </div>

                                <div className="FdaVerifFormGroup">
                                  <label className="FdaVerifFormLabel">
                                    Official FDA Verification Remarks <span className="FdaVerifRequired">*</span>
                                  </label>
                                  {/* BACKEND: maps to verification_requests.fda_official_remarks */}
                                  <textarea
                                    className="FdaVerifTextarea"
                                    rows={3}
                                    placeholder="Enter official remarks confirming registration status, CPR validity, manufacturer License to Operate (LTO) details, and compliance notes..."
                                    value={fdaOfficialRemarks}
                                    onChange={(e) => setFdaOfficialRemarks(e.target.value)}
                                    id="fda-textarea-registered-remarks"
                                  ></textarea>
                                </div>
                              </div>
                            )}

                            {/* DYNAMIC PANEL 2: UNREGISTERED WARNING PANEL */}
                            {fdaVerificationStatus === 'Unregistered' && (
                              <div className="FdaVerifUnregisteredPanel">
                                <div className="FdaVerifPanelHeaderOrange">
                                  <AlertTriangle size={18} className="FdaVerifRedIcon" />
                                  <div>
                                    <h4>UNREGISTERED PRODUCT WARNING</h4>
                                    <p>Specify exact reasons why product is not registered and regulatory advisories.</p>
                                  </div>
                                </div>

                                <div className="FdaVerifFormGroup" style={{ marginBottom: '12px' }}>
                                  <label className="FdaVerifFormLabel">
                                    Reason Product is Not Registered <span className="FdaVerifRequired">*</span>
                                  </label>
                                  {/* BACKEND: maps to verification_requests.fda_unregistered_reason */}
                                  <textarea
                                    className="FdaVerifTextarea"
                                    rows={3}
                                    placeholder="Provide detailed rationale (e.g., No CPR or LTO found in FDA database, counterfeit CPR code on label, revoked registration, prohibited ingredients)..."
                                    value={fdaUnregisteredReason}
                                    onChange={(e) => setFdaUnregisteredReason(e.target.value)}
                                    id="fda-textarea-unregistered-reason"
                                  ></textarea>
                                </div>

                                <div className="FdaVerifFormGroup">
                                  <label className="FdaVerifFormLabel">
                                    Advisory & Enforcement Recommendations for LEA
                                  </label>
                                  {/* FIX 3 — bound to fdaAdvisoryRemarks (separate state from fdaOfficialRemarks) */}
                                  <textarea
                                    className="FdaVerifTextarea"
                                    rows={2}
                                    placeholder="Recommended enforcement steps for LEA-CIDG (e.g. Initiate market seizure, request online domain takedown, issue public health warning)..."
                                    value={fdaAdvisoryRemarks}
                                    onChange={(e) => setFdaAdvisoryRemarks(e.target.value)}
                                    id="fda-textarea-unregistered-remarks"
                                  ></textarea>
                                </div>
                              </div>
                            )}

                          </div>
                        </>
                      ) : (
                        /* REJECTION INLINE MODE PANEL */
                        <div className="FdaVerifInlineRejectPanel">
                          <div className="FdaVerifInlineRejectHeader">
                            <XCircle size={18} className="FdaVerifRedIcon" />
                            <div>
                              <h4>REJECT VERIFICATION REQUEST TO LEA</h4>
                              <p>Provide reason for rejecting this verification request back to LEA-CIDG officers.</p>
                            </div>
                          </div>

                          <div className="FdaVerifFormGroup">
                            <label className="FdaVerifFormLabel">
                              Rejection Rationale & Required Field Corrections <span className="FdaVerifRequired">*</span>
                            </label>
                            {/* BACKEND: maps to verification_requests.fda_rejection_reason */}
                            <textarea
                              className="FdaVerifTextarea FdaVerifTextareaReject"
                              rows={4}
                              placeholder="Explain clearly why the request is rejected (e.g. Incomplete product photos, missing lot number, duplicate case submission, unreadable label images)..."
                              value={fdaRejectionReason}
                              onChange={(e) => setFdaRejectionReason(e.target.value)}
                              id="fda-textarea-rejection-reason"
                            ></textarea>
                          </div>

                          <div className="FdaVerifRejectActionRow">
                            <button
                              className="FdaVerifBtnOutline"
                              onClick={() => setFdaIsRejecting(false)}
                            >
                              Cancel Rejection
                            </button>

                            {/* BACKEND: POST /api/fda/verification-requests/:id/reject */}
                            {/* BACKEND: Trigger notification to LEA TopBar notification panel */}
                            <button
                              className="FdaVerifBtnDanger"
                              onClick={handleOpenRejectModal}
                              id="fda-btn-confirm-reject-trigger"
                            >
                              <XCircle size={15} />
                              <span>Reject Request & Send to LEA</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ACTION BUTTONS BAR */}
                      {!fdaIsRejecting && (
                        <div className="FdaVerifActionBar">
                          <div className="FdaVerifActionBarLeft">
                            <button
                              className="FdaVerifBtnRejectMode"
                              onClick={() => setFdaIsRejecting(true)}
                              title="Reject request back to LEA"
                              id="fda-btn-open-reject-mode"
                            >
                              <XCircle size={15} />
                              <span>Reject Request</span>
                            </button>
                          </div>

                          <div className="FdaVerifActionBarRight">
                            {/* BACKEND: PATCH /api/fda/verification-requests/:id/draft */}
                            {/* BACKEND: Trigger notification to FDA TopBar notification panel */}
                            <button
                              className="FdaVerifBtnOutline"
                              onClick={handleOpenSaveDraftModal}
                              id="fda-btn-save-draft"
                            >
                              <Save size={15} />
                              <span>Save Draft</span>
                            </button>

                            {/* BACKEND: POST /api/fda/verification-requests/:id/submit */}
                            {/* BACKEND: Trigger notification to LEA TopBar notification panel */}
                            <button
                              className="FdaVerifBtnPrimary"
                              onClick={handleOpenSubmitModal}
                              id="fda-btn-submit-verification"
                            >
                              <Send size={15} />
                              <span>Submit Verification</span>
                            </button>
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                )}
              </div>

            </div>
          )}

          {/* COMPLETED VERIFICATIONS — FULL-WIDTH TABLE */}


          {/* CHANGED — Completed tab is now fully server-driven. filteredCompleted holds
              the page returned by the backend; pagination uses completedTotal (server)
              instead of client-side slice calculations. */}
          {fdaActiveTab === 'completed' && (() => {
            // CHANGED — server-side pagination: total comes from the API response.
            const COMPLETED_PAGE_SIZE = 25;
            const totalCompletedPages = Math.ceil(completedTotal / COMPLETED_PAGE_SIZE) || 1;
            const safeCompletedPage = Math.min(Math.max(1, completedPage), totalCompletedPages);
            const cStartIdx = (safeCompletedPage - 1) * COMPLETED_PAGE_SIZE;
            const cEndIdx = Math.min(cStartIdx + COMPLETED_PAGE_SIZE, completedTotal);
            return (
              <div className="FdaVerifTableSection">

                {/* Filter Panel — search fixed-width left, dropdowns grouped right */}
                <div className="FdaVerifFilterPanel">
                  <div className="FdaSearchWrapper FdaSearchFixed">
                    <Search size={16} className="FdaSearchIcon" />
                    {/* CHANGED — triggers debounced server-side search via completedSearch state */}
                    <input
                      type="text"
                      placeholder="Search Case ID, Product or Manufacturer..."
                      className="FdaSearchInput"
                      value={completedSearch}
                      onChange={(e) => { setCompletedSearch(e.target.value); setCompletedPage(1); }}
                      id="fda-completed-search-input"
                    />
                  </div>

                  <div className="FdaFilterGroupsRight">
                    <div className="FdaFilterGroup">
                      {/* CHANGED — sends date_from query param to GET /verification-requests/completed */}
                      <label>From</label>
                      <input
                        type="date"
                        className="FdaVerifDateInput"
                        value={completedDateFrom}
                        onChange={(e) => { setCompletedDateFrom(e.target.value); setCompletedPage(1); }}
                        title="Date Verified From"
                      />
                    </div>

                    <div className="FdaFilterGroup">
                      {/* CHANGED — sends date_to query param to GET /verification-requests/completed */}
                      <label>To</label>
                      <input
                        type="date"
                        className="FdaVerifDateInput"
                        value={completedDateTo}
                        onChange={(e) => { setCompletedDateTo(e.target.value); setCompletedPage(1); }}
                        title="Date Verified To"
                      />
                    </div>

                    <div className="FdaFilterGroup">
                      {/* CHANGED — sends category query param to GET /verification-requests/completed */}
                      <label>Category</label>
                      <select
                        value={completedCategory}
                        onChange={(e) => { setCompletedCategory(e.target.value); setCompletedPage(1); }}
                        id="fda-completed-category-filter"
                      >
                        <option value="">All Categories</option>
                        <option value="Cosmetics">Cosmetics</option>
                        <option value="Food">Food</option>
                        <option value="Devices">Medical Devices</option>
                        <option value="Drugs">Drugs</option>
                      </select>
                    </div>

                    {/* ADDED — Verification Result dropdown; sends verification_result query param.
                        Mirrors the exact structure/classes of the Category dropdown above. */}
                    <div className="FdaFilterGroup">
                      <label>Verification Result</label>
                      <select
                        value={completedResultFilter}
                        onChange={(e) => { setCompletedResultFilter(e.target.value); setCompletedPage(1); }}
                        id="fda-completed-result-filter"
                      >
                        <option value="">All Results</option>
                        <option value="registered">Registered</option>
                        <option value="unregistered">Unregistered</option>
                      </select>
                    </div>

                    {/* FIX 2 — always mounted (visibility:hidden vs conditional render) so
                        the flex row never shifts when the button appears/disappears.
                        disabled prevents clicks when hidden. */}
                    {/* Fix 2 — display:none when inactive so button takes 0px width and controls sit flush right */}
                    <button
                      className="BtnClearFiltersIcon"
                      onClick={() => { setCompletedSearch(''); setCompletedDateFrom(''); setCompletedDateTo(''); setCompletedCategory(''); setCompletedResultFilter(''); setCompletedPage(1); }}
                      disabled={!(completedSearch || completedDateFrom || completedDateTo || completedCategory || completedResultFilter)}
                      aria-label="Clear Filters"
                      title="Clear Filters"
                      style={{
                        display: (completedSearch || completedDateFrom || completedDateTo || completedCategory || completedResultFilter) ? 'inline-flex' : 'none'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* CHANGED — table now maps real API field names from GET /verification-requests/completed */}
                <div className="FdaTableCard FdaVerifTableCard">
                  <div className="FdaTableWrapper" ref={completedTableWrapperRef}>
                    <table className="FdaTable">
                      <thead>
                        <tr>
                          <th>CASE ID</th>
                          <th>PRODUCT NAME</th>
                          <th>MANUFACTURER</th>
                          <th>CATEGORY</th>
                          <th>DATE RECEIVED</th>
                          <th>DATE VERIFIED</th>
                          <th>VERIFICATION RESULT</th>
                          <th>VERIFIED BY</th>
                          <th style={{ width: '60px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* ADDED — loading row only when initial fetch is in flight and table is empty */}
                        {completedLoading && filteredCompleted.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="FdaEmptyState">
                              <Clock size={28} style={{ opacity: 0.4 }} />
                              <p>Loading completed records…</p>
                            </td>
                          </tr>
                        ) : filteredCompleted.length > 0 ? (
                          filteredCompleted.map((item) => (
                            // CHANGED — key and all cells now use real API field names.
                            <tr key={item.request_id}>
                              {/* CHANGED — was item.caseId; now case_reference */}
                              <td className="CaseIdCell">{item.case_reference}</td>
                              <td>
                                <div className="ProductCell">
                                  {/* CHANGED — was item.productName; now product_name */}
                                  <span className="ProductCellTitle">{item.product_name}</span>
                                </div>
                              </td>
                              {/* manufacturer field name is the same */}
                              <td style={{ fontSize: '12px', color: '#1F2937', opacity: 0.8 }}>{item.manufacturer}</td>
                              {/* CHANGED — was item.category; now product_category */}
                              <td>{item.product_category}</td>
                              {/* CHANGED — was item.dateReceived (pre-formatted); now requested_at (ISO) formatted here */}
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {item.requested_at
                                  ? new Date(item.requested_at).toLocaleString('en-US', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', hour12: true,
                                  })
                                  : '—'}
                              </td>
                              {/* CHANGED — was item.dateCompleted; now responded_at (ISO) formatted here */}
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {item.responded_at
                                  ? new Date(item.responded_at).toLocaleString('en-US', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', hour12: true,
                                  })
                                  : '—'}
                              </td>
                              {/* CHANGED — was item.verificationResult (capitalized dummy);
                                  now verification_result (lowercase from backend) — capitalize for display. */}
                              <td>
                                <span className={`FdaVerifResultTag ${item.verification_result === 'registered' ? 'FdaVerifTagReg' : 'FdaVerifTagUnreg'
                                  }`}>
                                  {item.verification_result
                                    ? item.verification_result.charAt(0).toUpperCase() + item.verification_result.slice(1)
                                    : '—'}
                                </span>
                              </td>
                              {/* CHANGED — was item.verifierName; now verified_by_name (null → 'N/A') */}
                              <td style={{ fontSize: '12px' }}>{item.verified_by_name ?? 'N/A'}</td>
                              <td style={{ textAlign: 'center' }}>
                                {/* CHANGED — was inline setFdaRecordModalData; now calls
                                    handleViewCompletedRecord which fetches the full detail
                                    from GET /verification-requests/completed/{request_id}. */}
                                <button
                                  className="BtnActionView"
                                  onClick={() => handleViewCompletedRecord(item.request_id)}
                                  title="View record details"
                                  id={`fda-btn-view-completed-${item.request_id}`}
                                >
                                  <Eye size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" className="FdaEmptyState">
                              <Search size={32} />
                              <p>No completed verification records match your current filters.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* CHANGED — pagination now driven by completedTotal (server) not client array length */}
                  <div className="FdaTableFooter">
                    <span className="FdaFooterInfo">
                      Showing {completedTotal === 0 ? 0 : cStartIdx + 1}–{cEndIdx} of {completedTotal} entries
                    </span>
                    <div className="FdaPagination">
                      <button
                        className="BtnPageNav"
                        disabled={safeCompletedPage === 1}
                        onClick={() => setCompletedPage(safeCompletedPage - 1)}
                      >
                        <ChevronLeft size={14} />
                        Prev
                      </button>
                      {Array.from({ length: totalCompletedPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          className={`FdaPageNumber ${safeCompletedPage === page ? 'active' : ''}`}
                          onClick={() => setCompletedPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        className="BtnPageNav"
                        disabled={safeCompletedPage === totalCompletedPages}
                        onClick={() => setCompletedPage(safeCompletedPage + 1)}
                      >
                        Next
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ============================================================================ */}
          {/* REJECTED REQUESTS — FULL-WIDTH TABLE */}
          {/* ============================================================================ */}

          {/* CHANGED — Rejected tab is now fully server-driven. filteredRejected holds
              the page returned by the backend; pagination uses rejectedTotal (server)
              instead of client-side slice calculations. */}
          {fdaActiveTab === 'rejected' && (() => {
            // CHANGED — server-side pagination: total comes from the API response.
            const REJECTED_PAGE_SIZE = 25;
            const totalRejectedPages = Math.ceil(rejectedTotal / REJECTED_PAGE_SIZE) || 1;
            const safeRejectedPage = Math.min(Math.max(1, rejectedPage), totalRejectedPages);
            const rStartIdx = (safeRejectedPage - 1) * REJECTED_PAGE_SIZE;
            const rEndIdx = Math.min(rStartIdx + REJECTED_PAGE_SIZE, rejectedTotal);
            return (
              <div className="FdaVerifTableSection">

                {/* Filter Panel — search fixed-width left, dropdowns grouped right */}
                <div className="FdaVerifFilterPanel">
                  <div className="FdaSearchWrapper FdaSearchFixed">
                    <Search size={16} className="FdaSearchIcon" />
                    {/* CHANGED — triggers debounced server-side search via rejectedSearch state */}
                    <input
                      type="text"
                      placeholder="Search Case ID, Product or Manufacturer..."
                      className="FdaSearchInput"
                      value={rejectedSearch}
                      onChange={(e) => { setRejectedSearch(e.target.value); setRejectedPage(1); }}
                      id="fda-rejected-search-input"
                    />
                  </div>

                  <div className="FdaFilterGroupsRight">
                    <div className="FdaFilterGroup">
                      {/* CHANGED — sends date_from query param to GET /verification-requests/rejected */}
                      <label>From</label>
                      <input
                        type="date"
                        className="FdaVerifDateInput"
                        value={rejectedDateFrom}
                        onChange={(e) => { setRejectedDateFrom(e.target.value); setRejectedPage(1); }}
                        title="Date Rejected From"
                      />
                    </div>

                    <div className="FdaFilterGroup">
                      {/* CHANGED — sends date_to query param to GET /verification-requests/rejected */}
                      <label>To</label>
                      <input
                        type="date"
                        className="FdaVerifDateInput"
                        value={rejectedDateTo}
                        onChange={(e) => { setRejectedDateTo(e.target.value); setRejectedPage(1); }}
                        title="Date Rejected To"
                      />
                    </div>

                    <div className="FdaFilterGroup">
                      {/* CHANGED — sends category query param to GET /verification-requests/rejected.
                          FIXED: 'Foods' corrected to 'Food' to match real backend category strings. */}
                      <label>Category</label>
                      <select
                        value={rejectedCategory}
                        onChange={(e) => { setRejectedCategory(e.target.value); setRejectedPage(1); }}
                        id="fda-rejected-category-filter"
                      >
                        <option value="All">All Categories</option>
                        <option value="Cosmetics">Cosmetics</option>
                        <option value="Food">Food</option>
                        <option value="Devices">Medical Devices</option>
                        <option value="Drugs">Drugs</option>
                      </select>
                    </div>

                    {/* FIX 2 — always mounted (visibility:hidden vs conditional render) so
                        the flex row never shifts when the button appears/disappears.
                        disabled prevents clicks when hidden. */}
                    {/* Fix 2 — display:none when inactive so button takes 0px width and controls sit flush right */}
                    <button
                      className="BtnClearFiltersIcon"
                      onClick={() => { setRejectedSearch(''); setRejectedDateFrom(''); setRejectedDateTo(''); setRejectedCategory(''); setFdaActiveTab(fdaActiveTab); setQueuePage(1); setCompletedPage(1); setRejectedPage(1); }}
                      disabled={!(rejectedSearch || rejectedDateFrom || rejectedDateTo || rejectedCategory)}
                      aria-label="Clear Filters"
                      title="Clear Filters"
                      style={{
                        display: (rejectedSearch || rejectedDateFrom || rejectedDateTo || rejectedCategory) ? 'inline-flex' : 'none'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* CHANGED — table now maps real API field names from GET /verification-requests/rejected */}
                <div className="FdaTableCard FdaVerifTableCard">
                  <div className="FdaTableWrapper" ref={rejectedTableWrapperRef}>
                    <table className="FdaTable">
                      <thead>
                        <tr>
                          <th>CASE ID</th>
                          <th>PRODUCT NAME</th>
                          <th>MANUFACTURER</th>
                          <th>CATEGORY</th>
                          <th>DATE RECEIVED</th>
                          <th>DATE REJECTED</th>
                          <th>REJECTED BY</th>
                          <th style={{ width: '60px', textAlign: 'center' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* ADDED — loading row only when initial fetch is in flight and table is empty */}
                        {rejectedLoading && filteredRejected.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="FdaEmptyState">
                              <Clock size={28} style={{ opacity: 0.4 }} />
                              <p>Loading rejected records…</p>
                            </td>
                          </tr>
                        ) : filteredRejected.length > 0 ? (
                          filteredRejected.map((item) => (
                            // CHANGED — key and all cells now use real API field names.
                            <tr key={item.request_id}>
                              {/* CHANGED — was item.caseId; now case_reference */}
                              <td className="CaseIdCell">{item.case_reference}</td>
                              <td>
                                <div className="ProductCell">
                                  {/* CHANGED — was item.productName; now product_name */}
                                  <span className="ProductCellTitle">{item.product_name}</span>
                                </div>
                              </td>
                              {/* manufacturer field name is the same */}
                              <td style={{ fontSize: '12px', color: '#1F2937', opacity: 0.8 }}>{item.manufacturer}</td>
                              {/* CHANGED — was item.category; now product_category */}
                              <td>{item.product_category}</td>
                              {/* CHANGED — was item.dateReceived (pre-formatted); now requested_at (ISO) formatted here */}
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {item.requested_at
                                  ? new Date(item.requested_at).toLocaleString('en-US', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', hour12: true,
                                  })
                                  : '—'}
                              </td>
                              {/* CHANGED — was item.dateRejected (pre-formatted); now responded_at (ISO) formatted here */}
                              <td style={{ whiteSpace: 'nowrap' }}>
                                {item.responded_at
                                  ? new Date(item.responded_at).toLocaleString('en-US', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', hour12: true,
                                  })
                                  : '—'}
                              </td>
                              {/* CHANGED — was item.rejectedBy; now rejected_by_name (null → 'N/A') */}
                              <td style={{ fontSize: '12px' }}>{item.rejected_by_name ?? 'N/A'}</td>
                              <td style={{ textAlign: 'center' }}>
                                {/* CHANGED — was inline setFdaRecordModalData; now calls
                                    handleViewRejectedRecord which fetches the full detail
                                    from GET /verification-requests/rejected/{request_id}. */}
                                <button
                                  className="BtnActionView"
                                  onClick={() => handleViewRejectedRecord(item.request_id)}
                                  title="View rejection details"
                                  id={`fda-btn-view-rejected-${item.request_id}`}
                                >
                                  <Eye size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="FdaEmptyState">
                              <Search size={32} />
                              <p>No rejected requests match your current filters.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* CHANGED — pagination now driven by rejectedTotal (server) not client array length */}
                  <div className="FdaTableFooter">
                    <span className="FdaFooterInfo">
                      Showing {rejectedTotal === 0 ? 0 : rStartIdx + 1}–{rEndIdx} of {rejectedTotal} entries
                    </span>
                    <div className="FdaPagination">
                      <button
                        className="BtnPageNav"
                        disabled={safeRejectedPage === 1}
                        onClick={() => setRejectedPage(safeRejectedPage - 1)}
                      >
                        <ChevronLeft size={14} />
                        Prev
                      </button>
                      {Array.from({ length: totalRejectedPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          className={`FdaPageNumber ${safeRejectedPage === page ? 'active' : ''}`}
                          onClick={() => setRejectedPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        className="BtnPageNav"
                        disabled={safeRejectedPage === totalRejectedPages}
                        onClick={() => setRejectedPage(safeRejectedPage + 1)}
                      >
                        Next
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ============================================================================ */}
          {/* CONFIRMATION MODAL OVERLAY */}
          {/* ============================================================================ */}
          {fdaModalConfig && (
            <div className="FdaVerifModalOverlay" role="dialog" aria-modal="true">
              <div className="FdaVerifModalContainer">
                <div className="FdaVerifModalHeader">
                  <div className={`FdaVerifModalIconWrap FdaVerifModalIcon_${fdaModalConfig.type}`}>
                    {fdaModalConfig.type === 'submit' && <ShieldCheck size={22} />}
                    {fdaModalConfig.type === 'save_draft' && <Save size={22} />}
                    {fdaModalConfig.type === 'reject' && <AlertTriangle size={22} />}
                  </div>
                  <div>
                    <h3 className="FdaVerifModalTitle">{fdaModalConfig.title}</h3>
                    <p className="FdaVerifModalDesc">{fdaModalConfig.description}</p>
                  </div>
                </div>

                <div className="FdaVerifModalFooter">
                  <button
                    className="FdaVerifBtnModalCancel"
                    onClick={() => setFdaModalConfig(null)}
                  >
                    Cancel
                  </button>

                  <button
                    className={`FdaVerifBtnModalConfirm FdaVerifBtnModal_${fdaModalConfig.confirmVariant}`}
                    onClick={handleExecuteModalAction}
                    id="fda-modal-confirm-action-btn"
                  >
                    {fdaModalConfig.confirmText}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================================ */}
          {/* RECORD VIEW MODAL (COMPLETED & REJECTED) */}
          {/* ============================================================================ */}
          {/* CHANGED — Record View Modal now maps real API field names from the completed
              detail endpoint (GET /verification-requests/completed/{request_id}).
              Dummy field names replaced. LTO field removed entirely (not in real API).
              verification_result is lowercase from the backend; capitalised for display.
              requested_by_name shown as 'N/A' when null.
              Both registered and unregistered paths use response_notes for remarks.
              Fallback to old camelCase names so the Rejected tab's existing dummy data
              still renders without changes. */}
          {fdaRecordModalData && (
            <div className="FdaVerifModalOverlay" role="dialog" aria-modal="true">
              <div className="FdaRecordModalContainer">

                {/* Modal Header */}
                <div className="FdaRecordModalHeader">
                  <div className="FdaRecordModalTitleGroup">
                    {fdaRecordModalData._type === 'completed' ? (
                      <>
                        <ShieldCheck size={20} className="FdaVerifGreenIcon" />
                        <div>
                          <h3>Verification Record</h3>
                          {/* CHANGED — was .caseId / .dateCompleted (dummy);
                              now case_reference / responded_at (real API fields). */}
                          <p className="FdaRecordModalSubtitle">
                            {fdaRecordModalData.case_reference} &bull; Completed on
                            {fdaRecordModalData.responded_at
                              ? ` ${new Date(fdaRecordModalData.responded_at).toLocaleString('en-US', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit', hour12: true,
                              })}`
                              : ''}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle size={20} className="FdaVerifRedIcon" />
                        <div>
                          <h3>Rejected Request Record</h3>
                          {/* CHANGED — was .caseId / .dateRejected (dummy);
                              now case_reference / responded_at (real API fields). */}
                          <p className="FdaRecordModalSubtitle">
                            {fdaRecordModalData.case_reference ?? fdaRecordModalData.caseId} &bull; Rejected on
                            {fdaRecordModalData.responded_at
                              ? ` ${new Date(fdaRecordModalData.responded_at).toLocaleString('en-US', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit', hour12: true,
                              })}`
                              : (fdaRecordModalData.dateRejected ? ` ${fdaRecordModalData.dateRejected}` : '')}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Modal Body */}
                <div className="FdaRecordModalBody">
                  {/* Core Details Grid */}
                  <div className="FdaRecordInfoGrid">
                    <div className="FdaRecordInfoItem">
                      <span className="FdaVerifInfoLabel">CASE ID</span>
                      {/* CHANGED — was .caseId; now case_reference (fallback for rejected dummy) */}
                      <span className="FdaVerifInfoValueHighlight">{fdaRecordModalData.case_reference ?? fdaRecordModalData.caseId}</span>
                    </div>
                    <div className="FdaRecordInfoItem">
                      <span className="FdaVerifInfoLabel">PRODUCT NAME</span>
                      {/* CHANGED — was .productName; now product_name */}
                      <span className="FdaVerifInfoValue">{fdaRecordModalData.product_name ?? fdaRecordModalData.productName}</span>
                    </div>
                    <div className="FdaRecordInfoItem">
                      <span className="FdaVerifInfoLabel">MANUFACTURER</span>
                      <span className="FdaVerifInfoValue">{fdaRecordModalData.manufacturer}</span>
                    </div>
                    <div className="FdaRecordInfoItem">
                      <span className="FdaVerifInfoLabel">PRODUCT CATEGORY</span>
                      {/* CHANGED — was .category; now product_category */}
                      <span className="FdaVerifInfoValue">{fdaRecordModalData.product_category ?? fdaRecordModalData.category}</span>
                    </div>
                    <div className="FdaRecordInfoItem">
                      <span className="FdaVerifInfoLabel">DATE RECEIVED</span>
                      {/* CHANGED — was .dateReceived (pre-formatted string);
                          now requested_at (ISO) formatted inline. */}
                      <span className="FdaVerifInfoValue">
                        {fdaRecordModalData.requested_at
                          ? new Date(fdaRecordModalData.requested_at).toLocaleString('en-US', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', hour12: true,
                          })
                          : (fdaRecordModalData.dateReceived ?? '—')}
                      </span>
                    </div>
                    <div className="FdaRecordInfoItem">
                      <span className="FdaVerifInfoLabel">REQUESTING LEA OFFICER</span>
                      {/* CHANGED — was .complainant; now requested_by_name (null → 'N/A') */}
                      <span className="FdaVerifInfoValue">
                        {fdaRecordModalData.requested_by_name ?? fdaRecordModalData.complainant ?? 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* COMPLETED RECORD DETAILS */}
                  {fdaRecordModalData._type === 'completed' && (
                    <div className={`FdaRecordResultSection${fdaRecordModalData.verification_result === 'unregistered' ? ' FdaRecordUnregisteredResultSection' : ''}`}>
                      <div className="FdaRecordSectionTitle">
                        <ShieldCheck size={15} className="FdaVerifGreenIcon" />
                        <span>Official FDA Verification Result</span>
                      </div>

                      <div className="FdaRecordResultRow">
                        <span className="FdaVerifInfoLabel">Verification Determination:</span>
                        {/* CHANGED — was .verificationResult (capitalized dummy);
                            now verification_result (lowercase from API) — capitalised here. */}
                        <span className={`FdaVerifResultTag ${fdaRecordModalData.verification_result === 'registered' ? 'FdaVerifTagReg' : 'FdaVerifTagUnreg'
                          }`}>
                          {fdaRecordModalData.verification_result
                            ? fdaRecordModalData.verification_result.charAt(0).toUpperCase() + fdaRecordModalData.verification_result.slice(1)
                            : '—'}
                        </span>
                      </div>

                      {/* CHANGED — condition now uses lowercase 'registered' to match real API value */}
                      {fdaRecordModalData.verification_result === 'registered' ? (
                        <div className="FdaRecordInfoGrid">
                          <div className="FdaRecordInfoItem">
                            <span className="FdaVerifInfoLabel">FDA CPR Number</span>
                            {/* CHANGED — was .cprNumber; now cpr_number */}
                            <span className="FdaVerifInfoValueHighlight">{fdaRecordModalData.cpr_number ?? '—'}</span>
                          </div>
                          <div className="FdaRecordInfoItem">
                            <span className="FdaVerifInfoLabel">CPR Expiry Date</span>
                            {/* CHANGED — was .cprExpiry; now cpr_expiry */}
                            <span className="FdaVerifInfoValue">{fdaRecordModalData.cpr_expiry ?? '—'}</span>
                          </div>
                          {/* REMOVED — License to Operate (LTO) field deleted;
                              not present in the real API response. */}
                          <div className="FdaRecordInfoItem">
                            <span className="FdaVerifInfoLabel">Verified By</span>
                            {/* CHANGED — was .verifierName / .verifierTitle; now verified_by_name (null → 'N/A') */}
                            <span className="FdaVerifInfoValue">{fdaRecordModalData.verified_by_name ?? 'N/A'}</span>
                          </div>
                          <div className="FdaRecordInfoItem FdaRecordInfoItemFull">
                            <span className="FdaVerifInfoLabel">Official FDA Remarks</span>
                            {/* CHANGED — was .remarks; now response_notes */}
                            <p className="FdaRecordRemarksText">{fdaRecordModalData.response_notes ?? '—'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="FdaRecordInfoGrid">
                          <div className="FdaRecordInfoItem">
                            <span className="FdaVerifInfoLabel">Verified By</span>
                            {/* CHANGED — was .verifierName / .verifierTitle; now verified_by_name (null → 'N/A') */}
                            <span className="FdaVerifInfoValue">{fdaRecordModalData.verified_by_name ?? 'N/A'}</span>
                          </div>
                          <div className="FdaRecordInfoItem FdaRecordInfoItemFull">
                            <span className="FdaVerifInfoLabel">Reason Product is Unregistered</span>
                            {/* CHANGED — was .unregisteredReason; now unregistered_reason */}
                            <p className="FdaRecordRemarksText">{fdaRecordModalData.unregistered_reason ?? '—'}</p>
                          </div>
                          <div className="FdaRecordInfoItem FdaRecordInfoItemFull">
                            <span className="FdaVerifInfoLabel">FDA Advisory Remarks</span>
                            {/* CHANGED — was .remarks; now response_notes */}
                            <p className="FdaRecordRemarksText">{fdaRecordModalData.response_notes ?? '—'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* REJECTED RECORD DETAILS */}
                  {fdaRecordModalData._type === 'rejected' && (
                    <div className="FdaRecordResultSection FdaRecordRejectedSection">
                      <div className="FdaRecordSectionTitle">
                        <XCircle size={15} className="FdaVerifRedIcon" />
                        <span>Rejection Details</span>
                      </div>

                      <div className="FdaRecordInfoGrid">
                        <div className="FdaRecordInfoItem">
                          <span className="FdaVerifInfoLabel">Rejected By</span>
                          {/* CHANGED — was .rejectedBy (dummy); now rejected_by_name (null → 'N/A') */}
                          <span className="FdaVerifInfoValue">{fdaRecordModalData.rejected_by_name ?? 'N/A'}</span>
                        </div>
                        <div className="FdaRecordInfoItem">
                          <span className="FdaVerifInfoLabel">Date Rejected</span>
                          {/* CHANGED — was .dateRejected (pre-formatted string);
                              now responded_at (ISO) formatted inline. */}
                          <span className="FdaVerifInfoValue">
                            {fdaRecordModalData.responded_at
                              ? new Date(fdaRecordModalData.responded_at).toLocaleString('en-US', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit', hour12: true,
                              })
                              : (fdaRecordModalData.dateRejected ?? '—')}
                          </span>
                        </div>
                        <div className="FdaRecordInfoItem FdaRecordInfoItemFull">
                          <span className="FdaVerifInfoLabel">Rejection Rationale (Sent to LEA)</span>
                          {/* CHANGED — was .rejectionReason (dummy); now rejection_reason */}
                          <div className="FdaRecordRejectionReasonBox">
                            <p>{fdaRecordModalData.rejection_reason ?? '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Modal Footer */}
                <div className="FdaRecordModalFooter">
                  {/* BACKEND: GET /api/fda/verification-requests/:id/export-pdf */}
                  {/* CHANGED — wired to real export endpoints (CHANGE 3).
                      Routes to completed or rejected export based on _type tag.
                      Also fixed fdaRecordModalData.caseId → case_reference. */}
                  <button
                    className="FdaVerifBtnOutline"
                    onClick={() => {
                      const token = localStorage.getItem('access_token');
                      const endpoint = fdaRecordModalData._type === 'completed'
                        ? `${API_BASE}/verification-requests/completed/${fdaRecordModalData.request_id}/export-pdf`
                        : `${API_BASE}/verification-requests/rejected/${fdaRecordModalData.request_id}/export-pdf`;

                      fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } })
                        .then((res) => {
                          if (!res.ok) throw new Error(`HTTP ${res.status}`);
                          return res.blob();
                        })
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${fdaRecordModalData.case_reference}-${fdaRecordModalData._type}-record.pdf`;
                          a.click();
                          URL.revokeObjectURL(url);
                          triggerAlert(`Exported record for ${fdaRecordModalData.case_reference} as PDF.`, 'info');
                          setFdaRecordModalData(null);
                        })
                        .catch(() => {
                          triggerAlert('Could not export the PDF. Please try again.', 'danger');
                        });
                    }}
                  >
                    <Download size={14} />
                    <span>Export Record as PDF</span>
                  </button>
                  <button
                    className="FdaVerifBtnModalCancel"
                    onClick={() => setFdaRecordModalData(null)}
                  >
                    Close
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ============================================================================ */}
          {/* INTAKE DOCUMENT PREVIEW MODAL */}
          {/* ============================================================================ */}
          {/* FIX 1 — updated to use real API field names from selectedQueueDetail.attached_files:
              fdaDocPreviewModal is now set to the file object itself (not a dummy doc object),
              so .file_name replaces old .name, .file_size_display replaces old .size,
              .mime_type is now available for display. The actual download fetch (Bearer auth
              → blob → anchor click) lives here in the "Download Attachment" button,
              moved from the inline card button. */}
          {fdaDocPreviewModal && (
            <div className="FdaVerifModalOverlay" role="dialog" aria-modal="true">
              <div className="FdaVerifDocModalContainer">
                <div className="FdaVerifDocModalHeader">
                  <div className="FdaVerifDocModalTitleGroup">
                    <Paperclip size={18} className="FdaVerifGreenIcon" />
                    <div>
                      {/* FIX 1 — was fdaDocPreviewModal.name (dummy); now file_name. */}
                      <h3>{fdaDocPreviewModal.file_name}</h3>
                      {/* FIX 1 — was .category • .size (dummy); now mime_type • file_size_display. */}
                      <p className="FdaVerifDocModalMeta">
                        {fdaDocPreviewModal.mime_type} &bull; {fdaDocPreviewModal.file_size_display}
                      </p>
                    </div>
                  </div>
                  <button
                    className="FdaVerifIconButton"
                    onClick={() => setFdaDocPreviewModal(null)}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* CHANGED — replaced static placeholder with live image/PDF preview.
                    Fetched from GET /shared-files/{file_id}/preview (CHANGE 2). */}
                <div className="FdaVerifDocModalBody">
                  {(fdaDocPreviewModal.mime_type?.startsWith('image/') || fdaDocPreviewModal.mime_type === 'application/pdf') ? (
                    fdaDocPreviewLoading ? (
                      <div className="FdaVerifDocPlaceholderPreview">
                        <p className="FdaVerifPreviewText">Loading preview&hellip;</p>
                      </div>
                    ) : fdaDocPreviewError ? (
                      <div className="FdaVerifDocPlaceholderPreview">
                        <FileText size={48} className="FdaVerifDocPreviewIcon" />
                        <p className="FdaVerifPreviewTitle">Preview unavailable</p>
                        <p className="FdaVerifPreviewText">Try downloading the file instead.</p>
                      </div>
                    ) : fdaDocPreviewModal.mime_type.startsWith('image/') ? (
                      <img
                        src={fdaDocPreviewUrl}
                        alt={fdaDocPreviewModal.file_name}
                        className="FdaVerifDocImagePreview"
                      />
                    ) : (
                      <iframe
                        src={fdaDocPreviewUrl}
                        title={fdaDocPreviewModal.file_name}
                        className="FdaVerifDocPdfPreview"
                      />
                    )
                  ) : (
                    <div className="FdaVerifDocPlaceholderPreview">
                      <FileText size={48} className="FdaVerifDocPreviewIcon" />
                      <p className="FdaVerifPreviewTitle">Preview not supported</p>
                      <p className="FdaVerifPreviewText">
                        <strong>{fdaDocPreviewModal.file_name}</strong> can't be previewed inline &mdash; use download instead.
                      </p>
                    </div>
                  )}
                </div>

                <div className="FdaVerifModalFooter">
                  <button
                    className="FdaVerifBtnOutline"
                    onClick={() => setFdaDocPreviewModal(null)}
                  >
                    Close Preview
                  </button>
                  {/* FIX 1 — "Download Attachment" button now performs the actual
                      download fetch (moved here from the inline card button).
                      Calls GET /shared-files/{file_id}/download with Bearer auth,
                      converts the blob to an object URL, and triggers a browser
                      download via a temporary anchor element. */}
                  <button
                    className="FdaVerifBtnDownloadAttachment"
                    onClick={() => {
                      const token = localStorage.getItem('access_token');
                      fetch(`${API_BASE}/shared-files/${fdaDocPreviewModal.file_id}/download`, {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                        .then((res) => {
                          if (!res.ok) throw new Error(`HTTP ${res.status}`);
                          return res.blob();
                        })
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = fdaDocPreviewModal.file_name;
                          a.click();
                          URL.revokeObjectURL(url);
                          setFdaDocPreviewModal(null);
                        })
                        .catch(() => {
                          triggerAlert('Could not download the file. Please try again.', 'danger');
                        });
                    }}
                  >
                    <Download size={14} />
                    <span>Download Attachment</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default FDAVerification;