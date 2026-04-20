(function () {
  'use strict';

  const DEFAULTS = {
    enabled: true,
    isAdmin: true,
    officialMark: ['PURPLE', 'BLACK', 'RED', 'ORANGE', 'GREEN', 'YELLOW', 'BLUE', 'GRAY'],
    autoPatchOnNav: true,
  };

  function sendConfig() {
    chrome.storage.sync.get(DEFAULTS, (data) => {
      window.postMessage({
        type: '__karotter_patch_config',
        config: {
          enabled: data.enabled,
          isAdmin: data.isAdmin,
          officialMark: data.officialMark,
          autoPatchOnNav: data.autoPatchOnNav,
        },
      }, '*');
    });
  }

  sendConfig();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') sendConfig();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SETTINGS_UPDATED') sendConfig();
  });
})();
