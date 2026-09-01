// header.js
import { whenSessionReady, isUserLoggedIn, getCurrentUser, logoutUser, updateUsername, deleteAccount } from "../scripts/session.js";
import { loadPartial } from "./partial-loader.js";

document.addEventListener('DOMContentLoaded', async () => {
  whenSessionReady(async () => {
    const headerSlot = document.getElementById('header-slot');
    if (headerSlot) await loadPartial('partials/header.html', 'header-slot');

    const overlaySlot = document.getElementById('overlay-slot');
    if (overlaySlot) await loadPartial('partials/overlays.html', 'overlay-slot');

    initProfileOverlay();
    initNotifications();
    initExitButton();
    renderProfileContent();
    initProfileActions();
    initPasswordToggles();
    applyGuestHeaderVisibility();
  });
});

function showProfileView(viewId) {
  document.querySelectorAll('.profile-view').forEach(view => {
    view.classList.toggle('hidden', view.id !== viewId);
  });
}

function initProfileOverlay() {
  const dropdownBtn = document.getElementById('profile-dropdown-btn');
  const profileOverlay = document.getElementById('profile-overlay');
  const notifOverlay = document.getElementById('notification-overlay');
  const pageContent = document.getElementById('blur-target');
  const dropdownImg = dropdownBtn ? dropdownBtn.querySelector('img') : null;

  if (!dropdownBtn || !profileOverlay) return;

  dropdownBtn.addEventListener('click', () => {
    if (notifOverlay) notifOverlay.classList.remove('visible');

    const isOpen = profileOverlay.classList.toggle('visible');
    if (pageContent) pageContent.classList.toggle('blurred', isOpen);
    if (dropdownImg) dropdownImg.classList.toggle('open', isOpen); // this flips the arrow image
  });
}

function initNotifications() {
  const notifBtn = document.getElementById('notif-btn');
  const notifOverlay = document.getElementById('notification-overlay');
  const profileOverlay = document.getElementById('profile-overlay');
  const pageContent = document.getElementById('blur-target');
  const badgeDot = document.getElementById('notif-badge');

  if (!notifBtn || !notifOverlay) return;

  notifBtn.addEventListener('click', () => {
    if (profileOverlay) profileOverlay.classList.remove('visible');
    const isOpen = notifOverlay.classList.toggle('visible');
    if (pageContent) pageContent.classList.toggle('blurred', isOpen);
  });

  renderNotifications();

  const markAllBtn = document.getElementById('mark-all-read');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', (e) => {
      e.preventDefault(); // this stops the <a href="#"> from jumping the page to the top
      markAllNotificationsRead();
      renderNotifications(); // this re-render so items visually update to "read" style
      updateNotifBadge();
    });
  }

  updateNotifBadge();
}

function initPasswordToggles() {
  document.querySelectorAll('.toggle-password-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const icon = btn.querySelector('.eye-icon');
      if (!input) return;

      const willShow = input.type === 'password';
      input.type = willShow ? 'text' : 'password';
      if (icon) {
        icon.src = willShow
          ? '../assets/images/eye_close_icon.png'
          : '../assets/images/eye_open_icon.png';
      }
      btn.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
    });
  });
}

function renderNotifications() {
  const listEl = document.getElementById('notification-list');
  if (!listEl || typeof getNotifications !== 'function') return;

  const notifications = getNotifications();

  listEl.innerHTML = notifications.map((n, index) => `
    <div class="notification-item ${n.read ? '' : 'unread'}" data-notif-index="${index}">
      <p class="notification-message">${n.message}</p>
      <span class="notification-time">${n.time}</span>
    </div>
  `).join('');

  document.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = Number(item.dataset.notifIndex);
      const notification = notifications[index];
      if (!notification || !notification.target) return;

      const destination = notification.target.type === 'status'
        ? 'complaint-status.html'
        : 'history.html';

      // this works whether this page is a popup (needs a new tab) or already a full page (can navigate directly)
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL(`pages/${destination}`) });
      } else {
        window.location.href = destination;
      }
    });
  });
}

function updateNotifBadge() {
  const badgeDot = document.getElementById('notif-badge');
  if (!badgeDot || typeof getNotifications !== 'function') return;

  const notifications = getNotifications();
  const hasUnread = notifications.some(n => !n.read);
  badgeDot.classList.toggle('hidden', !hasUnread);
}

function initExitButton() {
  const exitBtn = document.getElementById('exit-btn');
  if (!exitBtn) return;

  exitBtn.addEventListener('click', () => {
    window.close();
  });
}

function renderProfileContent() {
  if (typeof getCurrentUser !== 'function') return;
  const user = getCurrentUser();

  const usernameDisplay = document.getElementById('profile-username-display');
  const usernameDisplay2 = document.getElementById('profile-username-display-2');
  const emailDisplay = document.getElementById('profile-email-display');

  if (usernameDisplay) usernameDisplay.textContent = user.username;
  if (usernameDisplay2) usernameDisplay2.textContent = user.username;
  if (emailDisplay) emailDisplay.textContent = user.email;
}

function initProfileActions() {
  const editBtn = document.getElementById('btn-edit-username');
  const confirmUsernameBtn = document.getElementById('btn-confirm-username');
  const cancelUsernameBtn = document.getElementById('btn-cancel-username');
  const newUsernameInput = document.getElementById('new-username-input');

  const signOutBtn = document.getElementById('btn-sign-out');
  const confirmSignoutBtn = document.getElementById('btn-confirm-signout');
  const cancelSignoutBtn = document.getElementById('btn-cancel-signout');

  const deleteBtn = document.getElementById('btn-delete-account');
  const confirmDeleteBtn = document.getElementById('btn-confirm-delete');
  const cancelDeleteBtn = document.getElementById('btn-cancel-delete');

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if (newUsernameInput) newUsernameInput.value = getCurrentUser().username;
      showProfileView('profile-edit-view');
    });
  }

  // if (confirmUsernameBtn) {
  //   confirmUsernameBtn.addEventListener('click', () => {
  //     const newValue = newUsernameInput ? newUsernameInput.value.trim() : '';
  //     if (!newValue) return;

  //     updateUsername(newValue, (success) => {
  //       if (success) {
  //         renderProfileContent(); // this updates profile overlay text
  //         if (typeof applyAuthView === 'function') applyAuthView(); // this updates popup home welcome text, if on that page
  //         showProfileView('profile-main-view');
  //       }
  //     });
  //   });
  // }

  if (cancelUsernameBtn) {
    cancelUsernameBtn.addEventListener('click', () => {
      showProfileView('profile-main-view');
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      showProfileView('profile-signout-confirm-view');
    });
  }

  if (confirmSignoutBtn) {
    confirmSignoutBtn.addEventListener('click', () => {
      logoutUser(() => {
        window.location.href = 'auth.html';
      });
    });
  }

  if (cancelSignoutBtn) {
    cancelSignoutBtn.addEventListener('click', () => {
      showProfileView('profile-main-view');
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      showProfileView('profile-delete-confirm-view');
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', () => {
      const passwordInput = document.getElementById('delete-password-input');
      const password = passwordInput ? passwordInput.value : '';
      const passwordError = document.getElementById('delete-password-error');

      if (!password) {
        if (passwordError) passwordError.textContent = 'Password is required';
        return;
      }

      deleteAccount(password, (success, error) => {
        if (success) {
          sessionStorage.setItem('authFlashMessage', 'Your account and personal information have been permanently removed.');
          sessionStorage.setItem('authFlashType', 'success');
          sessionStorage.setItem('authFlashTitle', 'Account deleted');
          window.location.href = 'auth.html';
        } else {
          if (passwordError) passwordError.textContent = error || 'Incorrect password';
        }
      });
    });
  }

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      showProfileView('profile-main-view');
    });
  }
  
  if (confirmUsernameBtn) {
    confirmUsernameBtn.addEventListener('click', () => {
      const newValue = newUsernameInput ? newUsernameInput.value.trim() : '';

      if (!newValue) {
        if (newUsernameInput) newUsernameInput.classList.add('is-invalid');
        return;
      }
      if (newUsernameInput) newUsernameInput.classList.remove('is-invalid');

      updateUsername(newValue, (success) => {
        if (success) {
          renderProfileContent();
          if (typeof applyAuthView === 'function') applyAuthView();
          showProfileView('profile-main-view');
        }
      });
    });
  }
}

function applyGuestHeaderVisibility() {
  const loggedIn = typeof isUserLoggedIn === 'function' ? isUserLoggedIn() : false;

  const notifBtn = document.getElementById('notif-btn');
  const dropdownBtn = document.getElementById('profile-dropdown-btn');

  if (notifBtn) notifBtn.classList.toggle('hidden', !loggedIn);
  if (dropdownBtn) dropdownBtn.classList.toggle('hidden', !loggedIn);
}
