// history.js
import { whenSessionReady, isUserLoggedIn, getToken } from "../scripts/session.js";
import { apiGetComplaints, apiGetStatus, getVerificationHistory } from "../utils/api.js";

const COMPLAINT_STATUS_LABELS = { completed: 'COMPLETED', dismissed: 'DISMISSED' };
const VERIFICATION_STATUS_LABELS = { registered: 'REGISTERED', suspicious: 'SUSPICIOUS', unregistered: 'UNREGISTERED' };
const COMPLAINT_ICONS = { completed: 'check_green_icon.png', dismissed: 'x_icon.png' };
const VERIFICATION_ICONS = { registered: 'check_green_icon.png', suspicious: 'sus_icon.png', unregistered: 'x_icon.png' };

let currentHistoryTab = 'complaints';

function iconTag(status, iconMap) {
  return `<img src="../assets/images/${iconMap[status]}" alt="${status}" class="history-item-icon-img">`;
}

function timeFormat(submittedTime) {
  let ms = Date.now() - new Date(submittedTime).getTime();
  let mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;

  let hrs = Math.floor(mins/60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;

  let days = Math.floor(hrs/24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

async function renderComplaintsHistoryList() {
  const res = await apiGetComplaints(getToken());
  const items = res.map(c => ({
      id: c.complaint_id,
      status: c.status,
      productName: c.product_title,
      platform: c.platform,
      note: c.change_note || "",
      time: timeFormat(c.changed_at),
      link: c.product_url,
      storeName: c.store_name
  }));

  const counterEl = document.getElementById('resolved-counter');

  if (items.length === 0) {
    if (counterEl) counterEl.textContent = '';
    return `<p class="history-empty-text">Complaints History page is currently empty.</p>`;
  }

  const completedCount = items.filter(i => i.status === 'completed').length;
  if (counterEl) counterEl.textContent = `COMPLETED: ${completedCount}`;
  
  return items.map(item => `
    <div class="history-item status-${item.status}" data-complaint-id="${item.id}">
      <div class="history-item-icon icon-${item.status}">${iconTag(item.status, COMPLAINT_ICONS)}</div>
      <div class="history-item-text">
        <p class="history-item-name">${item.productName}</p>
        <span class="history-item-meta"><a href="#" class="see-details-link" data-toggle-note="${item.id}">See Details</a></span>
        <div class="history-item-detail hidden" id="note-${item.id}">
          <p class="detail-row"><span class="detail-label">Platform:</span> ${item.platform}</p>
          <p class="detail-row"><span class="detail-label">Time:</span> ${item.time}</p>
          <p class="detail-row"><span class="detail-label">Link/URL:</span> ${item.link}</p>
          <p class="detail-row"><span class="detail-label">Store:</span> ${item.storeName}</p>
          ${item.description ? `<p class="detail-row"><span class="detail-label">Description:</span> ${item.description}</p>` : ''}
          ${item.attachment ? `<img src="${item.attachment}" class="attach-preview-img" alt="Attachment">` : ''}
          <p class="history-item-note">${item.note}</p>
        </div>
      </div>
      <span class="history-item-status">${COMPLAINT_STATUS_LABELS[item.status]}</span>
    </div>
  `).join('');
}

async function renderVerificationHistoryList() {
  const response = await getVerificationHistory(getToken());

  const items = response.map(v => ({
      id: v.history_id,
      status: v.verification_result,
      productName: v.product_title,
      platform: v.platform,
      time: timeFormat(v.checked_at)   
  }));

  const counterEl = document.getElementById('resolved-counter');
  if (counterEl) counterEl.textContent = ''; // this verification tab never shows a resolved counter

  if (items.length === 0) {
    return `<p class="history-empty-text">Verification History page is currently empty.</p>`;
  }

  return items.map(item => `
    <div class="history-item status-${item.status}">
      <div class="history-item-icon icon-${item.status}">${iconTag(item.status, VERIFICATION_ICONS)}</div>
      <div class="history-item-text">
        <p class="history-item-name">${item.productName}</p>
        <span class="history-item-meta">${item.platform} • ${item.time}</span>
      </div>
      <span class="history-item-status">${VERIFICATION_STATUS_LABELS[item.status]}</span>
    </div>
  `).join('');
}

async function renderHistoryList() {
  const listEl = document.getElementById('history-list');
  if (!listEl) return;

  listEl.innerHTML = currentHistoryTab === 'complaints'
    ? await renderComplaintsHistoryList()
    : await renderVerificationHistoryList();

  // this wire up "See Details" toggles for complaints (verification tab has no notes)
  document.querySelectorAll('[data-toggle-note]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const noteEl = document.getElementById(`note-${link.dataset.toggleNote}`);
      if (noteEl) noteEl.classList.toggle('hidden');
    });
  });
}

function switchHistoryTab(tab) {
  currentHistoryTab = tab;
  document.querySelectorAll('.history-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderHistoryList();
}

async function renderHistoryPage() {
  const emptyView = document.getElementById('history-empty-view');
  const populatedView = document.getElementById('history-populated-view');
  const emptyText = document.getElementById('history-empty-text-main');

  // guest check takes priority over data — a guest never has tracked history,
  // regardless of what the mock arrays contain
  const isGuest = typeof isUserLoggedIn === 'function' ? !isUserLoggedIn() : false;

  if (isGuest) {
    if (emptyText) emptyText.textContent = 'No contents to show. Sign in/up for tracking.';
    if (emptyView) emptyView.classList.remove('hidden');
    if (populatedView) populatedView.classList.add('hidden');
    return;
  }

  const complaints = await apiGetComplaints(getToken());
  const verification = await getVerificationHistory(getToken());
  const hasNoDataAtAll = complaints.length === 0 && verification.length === 0;

  if (hasNoDataAtAll) {
    if (emptyText) emptyText.textContent = 'History page is currently empty.';
    if (emptyView) emptyView.classList.remove('hidden');
    if (populatedView) populatedView.classList.add('hidden');
    return;
  }

  if (emptyView) emptyView.classList.add('hidden');
  if (populatedView) populatedView.classList.remove('hidden');

  document.querySelectorAll('.history-tab').forEach(btn => {
    btn.addEventListener('click', () => switchHistoryTab(btn.dataset.tab));
  });

  renderHistoryList();
}

document.addEventListener('DOMContentLoaded', () => {
  whenSessionReady(() => {
    renderHistoryPage();
  });
});