/**
 * Background service worker for Swagger Preview for Notion
 */

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Swagger Preview for Notion installed');
  }
});
