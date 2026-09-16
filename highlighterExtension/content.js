console.log("Hello World from content.js")

const verifyBtn = document.createElement("button");
verifyBtn.textContent = "Verify";
verifyBtn.style.position = "fixed";
verifyBtn.style.display = "none";
verifyBtn.style.zIndex = "9999";
verifyBtn.style.padding = "6px 12px";
verifyBtn.style.backgroundColor = "black";
verifyBtn.style.color = "white";
verifyBtn.style.border = "none";
verifyBtn.style.borderRadius = "5px";
verifyBtn.style.cursor = "pointer";
document.body.appendChild(verifyBtn);

let debounceTimer;

document.addEventListener("mouseup", () => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        const selectedText = window.getSelection().toString();
        
        if (selectedText.length > 0) {
            const range = window.getSelection().getRangeAt(0).getBoundingClientRect();
          
            verifyBtn.style.left = range.left + "px";
            verifyBtn.style.top = (range.bottom + 8) + "px";
            verifyBtn.style.display = "block";
        } else {
            verifyBtn.style.display = "none";
        }
    }, 100);
});

verifyBtn.addEventListener("click", () => {
    const selectedText = window.getSelection().toString();
    
    // Remove any existing modal first
    document.getElementById('everifymo-modal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'everifymo-modal';
    modal.style.position = 'fixed';
    modal.style.top = '20px';
    modal.style.right = '20px';
    modal.style.zIndex = '999999';
    modal.style.background = 'white';
    modal.style.padding = '16px';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    modal.innerHTML = `
        <div>✅ FDA REGISTERED</div>
        <div><strong>Product:</strong> ${selectedText}</div>
        <div id="fda-close-btn" style="
            position: absolute;
            top: 8px;
            right: 10px;
            cursor: pointer;
            font-size: 16px;
            opacity: 0.8;
        ">✕</div>
    `;
    
    document.body.appendChild(modal);

    document.getElementById('fda-close-btn').addEventListener('click', () => {
        modal.remove();
    });

    setTimeout(() => {
        if (modal.parentElement) modal.remove();
    }, 8000);

    verifyBtn.style.display = "none";
});



        // "https://*.shopee.ph/*",
        // "https://*.lazada.com.ph/*",
        // "https://*.tiktok.com/*",
        // "https://*.facebook.com/*"

        // "https://shopee.ph/*",
        // "https://www.lazada.com.ph/*",
        // "https://www.tiktok.com/*",
        // "https://www.facebook.com/marketplace/*"