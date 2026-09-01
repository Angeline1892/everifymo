// report.js
import { whenSessionReady, isUserLoggedIn, getCurrentUser, submitComplaint } from "../scripts/session.js";

let currentVerificationResult = 'unregistered';

function showReportView(viewId) {
  const views = document.querySelectorAll('.report-view, .report-view-guest');
  views.forEach(view => {
    view.classList.toggle('hidden', view.id !== viewId);
  });
}

function populateDetectedProduct(title, url) {
  const suffix = isUserLoggedIn() ? '-user' : '-guest';
  const nameEl = document.getElementById('complaint-product-name' + suffix);
  const urlEl = document.getElementById('complaint-product-url' + suffix);

  if (nameEl) nameEl.value = title || '';
  if (urlEl) urlEl.value = url || '';
}

function initAttachBoxes() {
  document.querySelectorAll('.report-attach-box').forEach(attachBox => {
    const attachInput = attachBox.querySelector('.report-attach-input');
    const attachText = attachBox.querySelector('.report-attach-text');
    const uploadIcon = attachBox.querySelector('.report-upload-icon');

    if (!attachInput) return;

    attachBox.addEventListener('click', () => attachInput.click());

    attachInput.addEventListener('change', () => {
      if (attachInput.files.length > 0) {
        const file = attachInput.files[0];
        const reader = new FileReader();

        reader.onload = () => {
          let previewImg = attachBox.querySelector('.attach-preview-img');
          if (!previewImg) {
            previewImg = document.createElement('img');
            previewImg.className = 'attach-preview-img';
            attachBox.appendChild(previewImg);
          }
          previewImg.src = reader.result; // data URL — portable across chrome.storage.local and other pages

          if (attachText) attachText.classList.add('hidden');
          if (uploadIcon) uploadIcon.classList.add('hidden');
        };

        reader.readAsDataURL(file);
      }
    });
  });
}

function getActiveAttachment() {
  const isGuest = !isUserLoggedIn();
  const containerId = isGuest ? 'report-form-view-guest' : 'report-form-view';
  const container = document.getElementById(containerId);
  if (!container) return { data: null, name: null };

  const previewImg = container.querySelector('.attach-preview-img');
  const attachInput = container.querySelector('.report-attach-input');
  const file = attachInput?.files?.[0];

  return {
    data: previewImg ? previewImg.src : null,
    name: file ? file.name : null
  };
}

// function collectReportFormData(containerId) {
//   const container = document.getElementById(containerId);
//   if (!container) return null;

//   const productName = container.querySelector('#complaint-product-name')?.value.trim() || '';
//   const link = container.querySelector('#complaint-product-url')?.value.trim() || '';
//   const storeName = container.querySelector('#store-name')?.value.trim() || '';
//   const description = container.querySelector('#complaint-description')?.value.trim() || '';
//   const previewImg = container.querySelector('.attach-preview-img');
//   const attachment = previewImg ? previewImg.src : null; // demo-only object URL; not persisted past this session

//   return { productName, link, storeName, description, attachment };
// }

function clearReportForm(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const suffix = containerId.endsWith('-guest') ? '-guest' : '-user';
  const nameEl = document.getElementById('complaint-product-name' + suffix);
  const urlEl = document.getElementById('complaint-product-url' + suffix);
  const storeEl = document.getElementById('store-name' + suffix);
  const descEl = document.getElementById('complaint-description' + suffix);
  if (nameEl) nameEl.value = '';
  if (urlEl) urlEl.value = '';
  if (storeEl) storeEl.value = '';
  if (descEl) descEl.value = '';

  const attachBox = container.querySelector('.report-attach-box');
  if (attachBox) {
    const previewImg = attachBox.querySelector('.attach-preview-img');
    if (previewImg) previewImg.remove();

    const attachInput = attachBox.querySelector('.report-attach-input');
    if (attachInput) attachInput.value = '';

    const attachText = attachBox.querySelector('.report-attach-text');
    const uploadIcon = attachBox.querySelector('.report-upload-icon');
    if (attachText) attachText.classList.remove('hidden');
    if (uploadIcon) uploadIcon.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {

  whenSessionReady(() => {
     initAttachBoxes();

    document.querySelectorAll('.report-cancel-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const isGuest = !isUserLoggedIn();
        showReportView(isGuest ? 'report-cancelled-view-guest' : 'report-cancelled-view');
      });
    });

    document.querySelectorAll('.report-submit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const isGuest = !isUserLoggedIn();
        showReportView(isGuest ? 'report-success-view-guest' : 'report-success-view');

        let productNameInput = isActive('complaint-product-name');
        let productUrlInput = isActive('complaint-product-url');
        let storeNameInput = isActive('store-name');
        let descriptionInput = isActive('complaint-description');

        let url = sanitizeUrl(productUrlInput.value);
        const attachment = getActiveAttachment();

        submitComplaint({ 
            productName: productNameInput.value, 
            productUrl: url, 
            storeName: storeNameInput.value, 
            platform: platform(url),
            description: descriptionInput.value, 
            verificationResult: currentVerificationResult,
            attachmentData: attachment.data,      
            attachmentName: attachment.name
          }, (success, e) => {
            if (!success) {
              console.error("Complaint submission failed:", e);
            }
          });
      });
    });

    document.querySelectorAll('.submit-another-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const isGuest = !isUserLoggedIn();
        const formViewId = isGuest ? 'report-form-view-guest' : 'report-form-view';

        clearReportForm(formViewId);
        showReportView(formViewId);
      });
    });

    document.querySelectorAll('.back-to-report-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const isGuest = !isUserLoggedIn();
        const formViewId = isGuest ? 'report-form-view-guest' : 'report-form-view';

        clearReportForm(formViewId);
        showReportView(formViewId);
      });
    });
    
    applyAuthView();

    //babalikan 2
    chrome.storage.local.get(
      ['productTitle', 'productStatus', 'productUrl'],
      (data) => {
        const isGuest = !isUserLoggedIn();
        const status = data.productStatus;
        currentVerificationResult = status || 'unregistered';

        if (status === 'unregistered' || status === 'registered' || status === 'suspicious') {
          populateDetectedProduct(data.productTitle, data.productUrl);
          showReportView(isGuest ? 'report-form-view-guest' : 'report-form-view');
        } else {
          showReportView(isGuest ? 'report-default-view-guest' : 'report-default-view');
        }
      }
    );
  });

  // autoFillUrl();
});

//babalikan 1
function applyAuthView() {
  const loggedIn = typeof isUserLoggedIn === 'function' ? isUserLoggedIn() : false;

  if (loggedIn && typeof getCurrentUser === 'function') {
    const usernameEl = document.getElementById('home-username');
    if (usernameEl) usernameEl.textContent = getCurrentUser().username;
  }
}

// who's logged/active
function isActive(id){
  let type = isUserLoggedIn() ? '-user' : '-guest';
  return document.getElementById(id + type);
}

function platform(url) {
  if (url.includes("shopee")) return "shopee";
  if (url.includes("lazada")) return "lazada";
  if (url.includes("facebook")) return "facebook";
  if (url.includes("tiktok")) return "tiktok";
  return "no platform detected";
}

// auto-fill url
function autoFillUrl() {
  let params = new URLSearchParams(window.location.search);
  let productUrl = params.get('productUrl');
  if (productUrl) {
    let input = isActive('complaint-product-url');
    if (input) input.value = decodeURIComponent(productUrl);
  }
}

function sanitizeUrl(rawUrl) {
  try {
    let url = new URL(rawUrl);
    let suspiciousPatterns = /token|session|auth|sp_atk|spm/i;
    [...url.searchParams.keys()].forEach(key => {
        if (suspiciousPatterns.test(key)) {
            url.searchParams.delete(key);
        }
    });
    return url.toString();
  } catch {
    return rawUrl;
  }
}