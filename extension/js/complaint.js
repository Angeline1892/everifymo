// let productName = document.getElementById('complaint-product-name');
// let productUrl = document.getElementById('complaint-product-url');
// let storeName = document.getElementById('store-name');
// let description = document.getElementById('complaint-description');

// // complaints data to backend
// document.getElementById('submitComplaint').addEventListener('submit', async (e) => {
//     e.preventDefault();

//     const complaintData = {
//         product_title: document.getElementById('productName').value.trim(),
//         seller_name: document.getElementById('shop').value.trim(),
//         product_url: sanitizeUrl(document.getElementById('shopUrl').value.trim()),
//     };

//     let info = document.getElementById('info');

//     if(!complaintData.product_title || !complaintData.seller_name){
//         info.textContent = 'Please fill in the required fields.';
//         return;
//     }

//     const { access_token } = await chrome.storage.local.get(['access_token']);
//     if (!access_token) {
//         info.textContent = 'Please log in first.';
//         return
//     }

//     try {
//         const res = await fetch(`${API_BASE}/submitComplaint`, {
//             method: 'POST',
//             headers: { 
//                 'Content-Type': 'application/json', 
//                 'Authorization': `Bearer ${access_token}`
//             },
//             body: JSON.stringify(complaintData)
//         });

//         if (!res.ok) {
//             const errText = await res.text();
//             throw new Error(`Server responded ${res.status}: ${errText}`);
//         }

//         const data = await res.json();
//         console.log('Complaint submitted:', data);
//         info.textContent = 'Complaint submitted succesfully';
//         document.getElementById('submitComplaint').reset();

//     } catch (err) {
//         console.error('Failed to submit complaint:', err);
//         info.textContent = 'Failed to submit complaint. Please try again.';
//     }

// });