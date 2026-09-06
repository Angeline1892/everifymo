console.log("Background service worker started");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
console.log('Background received message:', message);
  if (message.action === 'extractedTitle') {
    //
    (async () => {
      try {
        const { access_token } = await chrome.storage.local.get(['access_token']);

        const response = await fetch('http://localhost:8001/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title: message.title, top_k: 5 })
        });

        const data = await response.json().catch(() => null);
        console.log('Backend response:', data);
        
        const status = data?.verdict === 'no_match' ? 'suspicious' : data?.verdict || 'unregistered';

        // Store the extracted product info in chrome.storage
        chrome.storage.local.set({
          productTitle: message.title,
          productPlatform: message.platform,
          productUrl: message.url,
          productStatus: status
        }, () => {
          console.log('Product info stored:', message.title);
        });

        if (sender.tab && sender.tab.id) {
          updateBadge(status, sender.tab.id);
        }
        
        sendResponse({ status: 'success', data: data });

        const res = await fetch('http://localhost:8001/submitVerification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(access_token ? { 'Authorization': `Bearer ${access_token}` } : {})
          },
          body: JSON.stringify({
            product_title: message.title,
            platform: message.platform,
            verification_result: status
          })
        });

        const resData = await res.json().catch(() => null);
        if (!res.ok) {
          console.error('submitVerification failed:', resData);
        }

      } catch (error) {
        //
        console.error('Error sending title to backend:', error);
        const status = 'unregistered';
        chrome.storage.local.set({
          productTitle: message.title,
          productPlatform: message.platform,
          productUrl: message.url,
          productStatus: status
        }, () => {
          console.log('Product info stored with error fallback:', message.title);
        });

        if (sender.tab && sender.tab.id) {
          updateBadge(status, sender.tab.id);
        }
        
        sendResponse({ status: 'error', data: null });
      }
    })();
    return true;
  }

  if (message.action === 'submitComplaint') {
    (async () => {
      try {
        const { access_token } = await chrome.storage.local.get(['access_token']);

        const res = await fetch('http://localhost:8001/submitComplaint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(access_token ? { 'Authorization': `Bearer ${access_token}` } : {})
          },
          body: JSON.stringify({
            product_title: message.data.productName,
            product_url: message.data.productUrl,
            store_name: message.data.storeName,
            consumer_description: message.data.description,
            platform: message.data.platform,
            verification_result: message.data.verificationResult,
            attachment_data: message.data.attachmentData,
            attachment_name: message.data.attachmentName
          })
        });

        const resData = await res.json().catch(() => null);

        if (!res.ok) {
          console.error('submitComplaint failed:', resData);
          sendResponse({ success: false, error: resData?.detail || 'Submission failed' });
          return;
        }

        sendResponse({ success: true, data: resData });

      } catch (error) {
        console.error('Error submitting complaint:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

});

function updateBadge(status, tabId) {
  const badgeConfig = {
    registered:   { text: '✓', color: '#16A34A' }, // green
    unregistered: { text: '!', color: '#DC2626' }, // red
    unverified:   { text: '?', color: '#D97706' }, // amber
    idle:         { text: '',  color: '#000000' }  // clears badge
  };

  const config = badgeConfig[status] || badgeConfig.idle;

  chrome.action.setBadgeText({ text: config.text, tabId: tabId });
  chrome.action.setBadgeBackgroundColor({ color: config.color, tabId: tabId });
}

// Clear the badge when the user navigates away or closes the tab,
// so it doesn't show a stale result on a page with no product
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.action.setBadgeText({ text: '', tabId: tabId });
});

