/**
 * Popup script for Swagger Preview for Notion
 */

(function () {
  'use strict';

  const statusDot = document.querySelector('.status-dot');
  const statusText = document.getElementById('status-text');
  const scanBtn = document.getElementById('scan-btn');
  const closeBtn = document.getElementById('close-btn');

  function updateStatus(active, text) {
    statusDot.className = 'status-dot ' + (active ? 'active' : 'inactive');
    statusText.textContent = text;
  }

  // Check if we're on a Notion page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url && tab.url.includes('notion.so')) {
      updateStatus(true, 'Active on this Notion page');
    } else {
      updateStatus(false, 'Not a Notion page');
      scanBtn.disabled = true;
      closeBtn.disabled = true;
    }
  });

  // Rescan button
  scanBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: 'SCAN_CODE_BLOCKS' }, () => {
          scanBtn.textContent = 'Scanned!';
          setTimeout(() => {
            scanBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Rescan Page
            `;
          }, 1500);
        });
      }
    });
  });

  // Close panel button
  closeBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: 'CLOSE_PANEL' });
      }
    });
  });
})();
