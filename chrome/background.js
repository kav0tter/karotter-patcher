chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({ enabled: true }, (data) => {
    updateBadge(data.enabled);
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.enabled) {
    updateBadge(changes.enabled.newValue);
  }
});

function updateBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? '' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
}
