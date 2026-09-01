// desktopfrontend/src/pages/fdafolder/fda-status.jsx   
import { useState, useEffect } from "react";
import Sidebar from "../component/sidebar";
import TopBar from "../component/top-bar";
import './fda-css.css';
import {
  Search,
  Filter,
  Mail,
  Send,
  BellRing,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  XCircle,
  X
} from 'lucide-react';
import { apiFetch } from "../../utils/apiFetch";

// Options for the "New status" dropdown on the right panel — what FDA
// personnel can manually set a complaint TO.
const STATUS_OPTIONS = [
  { value: "under_review", label: "Under Review" },
  { value: "takedown_requested", label: "Takedown Requested" },
  { value: "completed", label: "Completed" },
  { value: "dismissed", label: "Dismissed" },
];

// Options for the left-panel filter — what a complaint can currently BE,
// including "open" and "All" since those are things you'd want to filter by.
const CASE_FILTER_OPTIONS = [
  { value: "All", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under Review" },
  { value: "takedown_requested", label: "Takedown Requested" },
  { value: "completed", label: "Completed" },
  { value: "dismissed", label: "Dismissed" },
];

const STATUS_LABELS = {
  open: "Open",
  under_review: "Under Review",
  takedown_requested: "Takedown Requested",
  completed: "Completed",
  dismissed: "Dismissed",
};

const COMPLETED_MESSAGE =
  "This complaint has been completed. The seller listing was taken down following FDA enforcement action.";

const DISMISS_PRESETS = [
  "Product found to be registered under a different FDA record.",
  "Registration currently in process.",
  "Insufficient evidence to proceed.",
];

const CASES_PER_PAGE = 10;
const HISTORY_PER_PAGE = 25;

function getStatusBadgeStyle(status) {
  switch (status) {
    case "completed":
      return { backgroundColor: "rgba(27, 67, 50, 0.1)", color: "#1B4332" };
    case "takedown_requested":
      return { backgroundColor: "rgba(185, 28, 28, 0.1)", color: "#B91C1C" };
    case "under_review":
      return { backgroundColor: "rgba(19, 33, 60, 0.1)", color: "#13213c" };
    case "dismissed":
      return { backgroundColor: "rgba(31, 41, 55, 0.08)", color: "rgba(31, 41, 55, 0.6)" };
    default: // "open"
      return { backgroundColor: "rgba(217, 119, 6, 0.1)", color: "#D97706" };
  }
}

function FdaStatus() {
  const [complaints, setComplaints] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Left panel: search + filter + pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [isCaseFilterOpen, setIsCaseFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [casePage, setCasePage] = useState(1);

  const [selectedComplaintId, setSelectedComplaintId] = useState(null);

  // Draft form state (right panel)
  const [newStatus, setNewStatus] = useState("");
  const [dismissPreset, setDismissPreset] = useState("");
  const [dismissNote, setDismissNote] = useState("");

  const [historyPage, setHistoryPage] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastError, setToastError] = useState(null);

  useEffect(() => {
    if (!toastError) return;
    const timer = setTimeout(() => {
      setToastError(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastError]);

  const selectedComplaint =
    complaints.find((c) => c.complaintId === selectedComplaintId) || null;

  // Fetch complaints from the backend 
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await apiFetch("/complaints-status-update");
        if (!res.ok) throw new Error("Failed to load complaints");
        const data = await res.json();
        setComplaints(data);
        if (data.length > 0) setSelectedComplaintId(data[0].complaintId);
      } catch (err) {
        alert("Could not load complaints. Please refresh.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  useEffect(() => {
    if (!selectedComplaint) return;
    setNewStatus(
      selectedComplaint.status === "open" ? "under_review" : selectedComplaint.status
    );
    setDismissPreset("");
    setDismissNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComplaintId]);

  // Search + status filter combined
  const filteredComplaints = complaints.filter((c) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      c.caseReference.toLowerCase().includes(query) ||
      c.productTitle.toLowerCase().includes(query) ||
      c.manufacturer.toLowerCase().includes(query);
    const matchesStatus = filterStatus === "All" || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Case list pagination
  const totalCasePages = Math.ceil(filteredComplaints.length / CASES_PER_PAGE) || 1;
  const safeCasePage = Math.min(Math.max(1, casePage), totalCasePages);
  const caseStart = (safeCasePage - 1) * CASES_PER_PAGE;
  const pagedComplaints = filteredComplaints.slice(caseStart, caseStart + CASES_PER_PAGE);

  const getOutgoingMessage = () => {
    if (newStatus === "completed") return COMPLETED_MESSAGE;
    if (newStatus === "dismissed") return dismissNote || dismissPreset;
    return null;
  };

  const handlePushUpdate = async () => {
    if (!selectedComplaint) return;

    const outgoingMessage = getOutgoingMessage();
    if (newStatus === "dismissed" && !outgoingMessage) {
      setToastError("Please choose or write a reason for dismissing this complaint.");
      return;
    }

    // const previousStatus = selectedComplaint.status;

    // setComplaints((prev) =>
    //   prev.map((c) =>
    //     c.complaintId === selectedComplaint.complaintId
    //       ? { ...c, status: newStatus }
    //       : c
    //   )
    // );

    // const entry = {
    //   historyId: `h${Date.now()}`,
    //   caseReference: selectedComplaint.caseReference,
    //   productTitle: selectedComplaint.productTitle,
    //   previousStatus,
    //   newStatus,
    //   changeNote: outgoingMessage || "",
    //   changedBy: "fda.admin", // TODO: replace once auth is wired up
    //   changedAt: new Date().toLocaleString(),
    // };
    // setStatusHistory((prev) => [entry, ...prev]);
    // setHistoryPage(1);

      // send update status to the backend
    try {
        const res = await apiFetch(`/complaints/${selectedComplaint.complaintId}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus, change_note: outgoingMessage }),
        });
  
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.detail || "Failed to update status. Please try again.");
          return;
        }
  
        const updatedComplaint = await res.json();
        const previousStatus = selectedComplaint.status;
  
        setComplaints((prev) =>
          prev.map((c) =>
            c.complaintId === selectedComplaint.complaintId
              ? { ...c, status: updatedComplaint.status }
              : c
          )
        );
  
        const entry = {
          historyId: `h${Date.now()}`,
          caseReference: selectedComplaint.caseReference,
          productTitle: selectedComplaint.productTitle,
          previousStatus,
          newStatus,
          changeNote: outgoingMessage || "",
          changedBy: "current desktop user", 
          changedAt: new Date().toLocaleString(),
        };
        setStatusHistory((prev) => [entry, ...prev]);
        setHistoryPage(1);
      } catch (err) {
        alert("Network error — please check your connection and try again.");
      }
    };

  const totalHistoryPages = Math.ceil(statusHistory.length / HISTORY_PER_PAGE) || 1;
  const safeHistoryPage = Math.min(Math.max(1, historyPage), totalHistoryPages);
  const historyStart = (safeHistoryPage - 1) * HISTORY_PER_PAGE;
  const pagedHistory = statusHistory.slice(historyStart, historyStart + HISTORY_PER_PAGE);
 
  if (isLoading) {
    return (
      <div className="FdaDashboardMain">
        <Sidebar sidebarType="FDA" />
        <div className="FdaContentContainer">
          <TopBar topbarType="FDA" />
          <div className="FdaMainFeed">Loading complaints...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="FdaDashboardMain">
      <Sidebar sidebarType="FDA" />
      <div className="FdaContentContainer">
        <TopBar topbarType="FDA" />
        <div className="FdaMainFeed">

          <div className="FdaHeader">
            <div className="FdaHeaderLeft">
              <p className="FdaEyebrow">FDA · Consumer Communications</p>
              <h1 className="FdaHeaderTitle">Status updates & notifications</h1>
              <p className="FdaSubtitle">
                Update a complaint's progress, push it to the consumer's browser extension, and notify the original reporter.
              </p>
            </div>
          </div>

          <div className="FdaStatusGrid">

            {/* LEFT: complaint list */}
            <div className="FdaCaseListPanel">
              <div className="FdaCaseListSearch">
                <div className="FdaCaseListControls">
                  <div className="FdaSearchWrapper">
                    <Search size={16} className="FdaSearchIcon" />
                    <input
                      type="text"
                      placeholder="Search case ID or product..."
                      className="FdaSearchInput"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCasePage(1);
                      }}
                    />
                  </div>
                  <button
                    className={`BtnFilters ${isCaseFilterOpen ? "active" : ""}`}
                    onClick={() => setIsCaseFilterOpen(!isCaseFilterOpen)}
                    title="Filter by status"
                  >
                    <Filter size={16} />
                  </button>
                </div>

                {isCaseFilterOpen && (
                  <div className="FdaFilterGroup FdaCaseListFilterPanel">
                    <label>Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setCasePage(1);
                      }}
                    >
                      {CASE_FILTER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="FdaCaseList">
                {pagedComplaints.length === 0 ? (
                  <div className="FdaCaseListEmpty">No complaints match your search or filter.</div>
                ) : (
                  pagedComplaints.map((c) => (
                    <button
                      key={c.complaintId}
                      className={`FdaCaseCard ${c.complaintId === selectedComplaintId ? "active" : ""}`}
                      onClick={() => setSelectedComplaintId(c.complaintId)}
                    >
                      <div className="FdaCaseCardTop">
                        <span className="FdaCaseCardId">{c.caseReference}</span>
                        <span className="FdaBadge" style={getStatusBadgeStyle(c.status)}>
                          {STATUS_LABELS[c.status]}
                        </span>
                      </div>
                      <div className="FdaCaseCardTitle">{c.productTitle}</div>
                      <div className="FdaCaseCardSub">{c.manufacturer} · {c.region}</div>
                    </button>
                  ))
                )}
              </div>

              {filteredComplaints.length > 0 && (
                <div className="FdaCaseListFooter">
                  <span className="FdaFooterInfo">
                    Showing {caseStart + 1}–{Math.min(caseStart + CASES_PER_PAGE, filteredComplaints.length)} of {filteredComplaints.length}
                  </span>
                  <div className="FdaPagination">
                    <button
                      className="BtnPageNav"
                      disabled={safeCasePage === 1}
                      onClick={() => setCasePage(safeCasePage - 1)}
                    >
                      <ChevronLeft size={14} />
                      Prev
                    </button>
                    {Array.from({ length: totalCasePages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        className={`FdaPageNumber ${safeCasePage === page ? "active" : ""}`}
                        onClick={() => setCasePage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="BtnPageNav"
                      disabled={safeCasePage === totalCasePages}
                      onClick={() => setCasePage(safeCasePage + 1)}
                    >
                      Next
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: selected complaint detail + form */}
            {selectedComplaint && (
              <div className="FdaDetailPanel">
                <div className="FdaDetailPanelHeader">
                  <div>
                    <small>{selectedComplaint.caseReference}</small>
                    <h2>{selectedComplaint.productTitle}</h2>
                    <p>{selectedComplaint.manufacturer} · {selectedComplaint.region}</p>
                  </div>
                  <div>
                    <small style={{ display: "block", marginBottom: 6, textAlign: "right" }}>Current</small>
                    <span className="FdaBadge" style={getStatusBadgeStyle(selectedComplaint.status)}>
                      {STATUS_LABELS[selectedComplaint.status]}
                    </span>
                  </div>
                </div>

                <div className="FdaFormRow">
                  <div className="FdaFormGroup">
                    <label>New status</label>
                    <select
                      className="FdaStatusSelect"
                      style={{ width: "100%" }}
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="FdaFormGroup">
                    <label>Reporter on record</label>
                    <div className="FdaReporterField">
                      <Mail size={14} />
                      {selectedComplaint.reporterUsername} · {selectedComplaint.reporterEmail}
                    </div>
                  </div>
                </div>

                {newStatus === "completed" && (
                  <div className="FdaCompletedNotice">{COMPLETED_MESSAGE}</div>
                )}

                {newStatus === "dismissed" && (
                  <div className="FdaMessageBox">
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(31,41,55,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                      Reason for dismissal
                    </label>
                    <select
                      value={dismissPreset}
                      onChange={(e) => {
                        setDismissPreset(e.target.value);
                        setDismissNote(e.target.value);
                      }}
                    >
                      <option value="">Choose a common reason (optional)...</option>
                      {DISMISS_PRESETS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    <textarea
                      placeholder="Write or edit the reason the consumer will see..."
                      value={dismissNote}
                      onChange={(e) => setDismissNote(e.target.value)}
                    />
                  </div>
                )}

                <div className="FdaNoticeBanner">
                  <BellRing size={18} />
                  <div className="FdaNoticeBannerText">
                    Pushing this update automatically syncs it to the consumer's browser extension
                    and sends them an in-app + email notification. This isn't optional per update.
                  </div>
                </div>

                <div className="FdaNotificationPreview">
                  <label>Notification preview</label>
                  <div className="FdaNotifPreviewCard">
                    <div className="FdaNotifPreviewIcon"><ShieldCheck size={16} /></div>
                    <div>
                      <div className="FdaNotifPreviewTop">
                        <strong>FDA Complaint Update</strong>
                        <span className="FdaBadge" style={getStatusBadgeStyle(newStatus)}>
                          {STATUS_LABELS[newStatus]}
                        </span>
                      </div>
                      <div className="FdaNotifPreviewMeta">
                        {selectedComplaint.productTitle} · {selectedComplaint.caseReference}
                      </div>
                      <div className="FdaNotifPreviewMsg">
                        {getOutgoingMessage() ||
                          `Your report has been received and is now marked as "${STATUS_LABELS[newStatus]}".`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="FdaPushRow">
                  <button
                    className="BtnPushUpdate"
                    onClick={() => {
                      if (!selectedComplaint) return;
                      const outgoingMessage = getOutgoingMessage();
                      if (newStatus === "dismissed" && !outgoingMessage) {
                        setToastError("Please choose or write a reason for dismissing this complaint.");
                        return;
                      }
                      setToastError(null);
                      setShowConfirmModal(true);
                    }}
                  >
                    <Send size={15} />
                    Push update
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RECENT STATUS PUSHES */}
          <div className="FdaHistorySection">
            <div className="FdaHistoryTitle">Recent status pushes</div>

            {pagedHistory.map((entry) => (
              <div className="FdaHistoryItem" key={entry.historyId}>
                <div className="FdaHistoryIcon"><ShieldCheck size={14} /></div>
                <div>
                  <div className="FdaHistoryTop">
                    <strong>{entry.productTitle}</strong>
                    <span className="FdaBadge" style={getStatusBadgeStyle(entry.newStatus)}>
                      {STATUS_LABELS[entry.newStatus]}
                    </span>
                  </div>
                  {entry.changeNote && <div className="FdaHistoryNote">{entry.changeNote}</div>}
                  <div className="FdaHistoryMeta">
                    <span>{entry.caseReference}</span>
                    <span>by {entry.changedBy}</span>
                    <span>{entry.changedAt}</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="FdaTableFooter">
              <span className="FdaFooterInfo">
                Showing {statusHistory.length === 0 ? 0 : historyStart + 1}-
                {Math.min(historyStart + HISTORY_PER_PAGE, statusHistory.length)} of {statusHistory.length}
              </span>
              <div className="FdaPagination">
                <button
                  className="BtnPageNav"
                  disabled={safeHistoryPage === 1}
                  onClick={() => setHistoryPage(safeHistoryPage - 1)}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`FdaPageNumber ${safeHistoryPage === page ? "active" : ""}`}
                    onClick={() => setHistoryPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="BtnPageNav"
                  disabled={safeHistoryPage === totalHistoryPages}
                  onClick={() => setHistoryPage(safeHistoryPage + 1)}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* CONFIRMATION MODAL */}
          {showConfirmModal && selectedComplaint && (
            <div className="FdaVerifModalOverlay" role="dialog" aria-modal="true">
              <div className="FdaVerifModalContainer" style={{ maxWidth: "480px" }}>
                <div className="FdaVerifModalHeader">
                  <div className="FdaVerifModalIconWrap FdaVerifModalIcon_submit">
                    <Send size={20} />
                  </div>
                  <div>
                    <h3 className="FdaVerifModalTitle">Confirm Status Update</h3>
                    <p className="FdaVerifModalDesc">
                      Please review the details before pushing this update.
                    </p>
                  </div>
                </div>

                <div style={{ margin: "16px 0", display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EDEDED", paddingBottom: "8px" }}>
                    <span style={{ color: "#6B7280", fontWeight: 500 }}>Case ID</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{selectedComplaint.caseReference}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EDEDED", paddingBottom: "8px" }}>
                    <span style={{ color: "#6B7280", fontWeight: 500 }}>Product Name</span>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{selectedComplaint.productTitle}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #EDEDED", paddingBottom: "8px" }}>
                    <span style={{ color: "#6B7280", fontWeight: 500 }}>New Status</span>
                    <span className="FdaBadge" style={getStatusBadgeStyle(newStatus)}>
                      {STATUS_LABELS[newStatus] || newStatus}
                    </span>
                  </div>
                </div>

                <div className="FdaNoticeBanner" style={{ marginBottom: "16px" }}>
                  <BellRing size={16} />
                  <div className="FdaNoticeBannerText" style={{ fontSize: "12px" }}>
                    Pushing this update will sync it to the consumer's email notification.
                  </div>
                </div>

                <div className="FdaVerifModalFooter">
                  <button
                    type="button"
                    className="FdaVerifBtnModalCancel"
                    onClick={() => setShowConfirmModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="FdaVerifBtnModalConfirm FdaVerifBtnModal_primary"
                    onClick={() => {
                      setShowConfirmModal(false);
                      handlePushUpdate();
                    }}
                  >
                    Confirm / Push Update
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FLOATING TOAST ALERT NOTIFICATION */}
          {toastError && (
            <div className="FdaVerifToastAlert FdaVerifToast_danger" role="alert">
              <div className="FdaVerifToastIconWrap">
                <XCircle size={18} />
              </div>
              <div className="FdaVerifToastBody">
                <p className="FdaVerifToastMessage">{toastError}</p>
              </div>
              <button
                className="FdaVerifToastCloseBtn"
                onClick={() => setToastError(null)}
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default FdaStatus;