
import {
  apiVerificationHistory,
  apiSubmitComplaint,
  apiUpdateUsername,
  apiDeleteAccount,
  apiSignUp,
  apiLogin,
  apiGoogleLogin,
  apiChangeUsername,
  apiVerifyOtp,
  apiResendOtp,
  apiVerifyResetOtp,
  apiPasswordReset,
  apiConfirmPassReset,
  UnauthorizedError
} from "../utils/api.js";


let _session = null; // null = guest, otherwise { username, email }

// Every page must call this once before rendering anything that depends on login state
export function whenSessionReady(callback) {
  chrome.storage.local.get(['access_token', 'username', 'email'], (data) => {
    _session = data.access_token 
      ? { username: data.username, email: data.email, access_token: data.access_token }
      : null;
    callback();
  });
}

export function isUserLoggedIn() {
  return _session !== null;
}

export function getCurrentUser() {
  return _session || { username: '', email: '' };
}

export function getToken(){
  return _session ? _session.access_token : null;
}

export async function updateUsername(newUsername, callback) {
  if (!_session) {
    throw new Error("No active user");
  }

  await apiUpdateUsername(newUsername, _session.access_token);

  _session.username = newUsername;

  chrome.storage.local.set({
      access_token: _session.access_token,
      username: newUsername,
      email: _session.email
    }, () => callback(true)
  );
}

export async function deleteAccount(password, callback) {
  if (!_session) {
    callback(false);
    return;
  }

  apiDeleteAccount(password, _session.access_token)
    .then(() => logoutUser(() => callback(true)))
    .catch(e => callback(false, e.message));
}

//   getRegisteredUsers((users) => {
//     const remainingUsers = users.filter(u => u.email !== _session.email);
//     chrome.storage.local.set({ registeredUsers: remainingUsers }, () => {
//       chrome.storage.local.remove('session', () => {
//         _session = null;
//         callback(true);
//       });
//     });
//   });
// }

// function getRegisteredUsers(callback) {
//   chrome.storage.local.get(['registeredUsers'], (data) => {
//     callback(data.registeredUsers || []);
//   });
// }

// loginUser, updateUsername, deleteAccount all stay exactly as they are —
// they were already correctly calling getRegisteredUsers, it just didn't exist yet

export function registerUser(user, callback) {
  apiSignUp({ email: user.email, username: user.username, password: user.password })
      .then(() => callback(true))
      .catch(e => callback(false, e.message));
}

export function loginUser(email, password, callback) {
  apiLogin(email, password)
      .then(data => {
          _session = { username: data.username, email, access_token: data.access_token };
          chrome.storage.local.set(
              { access_token: data.access_token, token_type: data.token_type, username: data.username, email },
              () => callback(true)
          );
      }).catch(e => callback(false, e));
}

export function googleLogin(token, callback) {
  apiGoogleLogin(token).then(data => {
      _session = { username: data.username, email: data.email, access_token: data.access_token };
      chrome.storage.local.set(
        { access_token: data.access_token, token_type: data.token_type, username: data.username, email: data.email },
        () => callback(true)
      );
  }).catch(e => callback(false, e.message, e.email, e));
}

export function changePendingUsername(email, newUsername, callback) {
  apiChangeUsername(email, newUsername).then(() => callback(true))
      .catch(e => callback(false, e.message));
}

export function verifyOtp(email, inputCode, callback) {
  apiVerifyOtp(email, inputCode).then(() => callback(true))
      .catch(e => callback(false, e))
}

export function resendOtpSession(email, callback) {
  apiResendOtp(email).then(() => callback(true))
      .catch(e => callback(false, e));
}

export function verifyResetOtp(email, otpCode, callback) {
  apiVerifyResetOtp(email, otpCode).then(data => callback(true, data.reset_token))
      .catch(e => callback(false, null, e));
}

export function requestPasswordReset(email, callback) {
  apiPasswordReset(email).then(() => callback(true))
      .catch(e => callback(false, e));
}

export function confirmPasswordReset(email, resetToken, newPassword, callback) {
  apiConfirmPassReset(email, resetToken, newPassword).then(() => callback(true))
      .catch(e => callback(false, e))
}

export function logoutUser(callback) {
  _session = null;
  chrome.storage.local.remove(['access_token', 'token_type', 'username', 'email'], callback);
}

export function submitComplaint(complaints, callback) {
  const token = _session ? _session.access_token : null;

  apiSubmitComplaint({ 
    product_title: complaints.productName, 
    product_url: complaints.productUrl, 
    store_name: complaints.storeName, 
    consumer_description: complaints.description, 
    platform: complaints.platform,
    verification_result: complaints.verificationResult,
    attachment_data: complaints.attachmentData,    
    attachment_name: complaints.attachmentName  
  }, token)
      .then(() => callback(true))
      .catch(e => {
        if (e instanceof UnauthorizedError) {
          logoutUser(() => {
            window.location.reload();
          });
        }
        callback(false, e.message)
      });
}

export function submitVerification(product, callback) {
  const token = _session ? _session.access_token : null;

  apiVerificationHistory({
    product_title: product.productTitle,
    platform: product.productPlatform,
    verification_result: product.productStatus,
  }, token).then(() => callback(true))
           .catch(e => {
              if (e instanceof UnauthorizedError) {
                logoutUser(() => {
                  window.location.reload();
                });
              }
              callback(false, e.message)
            });
}
