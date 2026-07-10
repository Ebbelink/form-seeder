/**
 * Background service worker (Manifest V3).
 * Minimal – the extension's core logic lives in the content script and popup.
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    console.log('[Form Seeder] Extension installed.');
  }
});
