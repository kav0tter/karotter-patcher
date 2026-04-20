var KEYS = ['enabled', 'isAdmin', 'officialMark', 'autoPatchOnNav'];
var DEFAULTS = {
  enabled: true,
  isAdmin: true,
  officialMark: ['PURPLE', 'BLACK', 'RED', 'ORANGE', 'GREEN', 'YELLOW', 'BLUE', 'GRAY'],
  autoPatchOnNav: true,
};

var $ = function (id) { return document.getElementById(id); };
var consoleEl = $('console');

function log(msg, type) {
  type = type || 'ok';
  var line = document.createElement('div');
  line.className = 'console-line';
  var ts = new Date().toLocaleTimeString('en', { hour12: false });
  line.innerHTML = '<span class="console-ts">[' + ts + ']</span><span class="console-' + type + '">' + msg + '</span>';
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function updateMasterState(enabled) {
  document.body.classList.toggle('disabled', !enabled);
  $('statusDot').classList.toggle('off', !enabled);
  $('statusText').innerHTML = enabled
    ? '<span class="highlight">ACTIVE</span> — intercepting /api/auth/me'
    : 'DISABLED — patch engine offline';
}

function getOfficialMark() {
  var checks = document.querySelectorAll('.badge-check');
  var marks = [];
  checks.forEach(function (c) { if (c.checked) marks.push(c.value); });
  return marks;
}

function setOfficialMark(marks) {
  var checks = document.querySelectorAll('.badge-check');
  checks.forEach(function (c) {
    c.checked = marks.indexOf(c.value) !== -1;
  });
}

function saveAll() {
  var settings = {
    enabled: $('enabled').checked,
    isAdmin: $('isAdmin').checked,
    officialMark: getOfficialMark(),
    autoPatchOnNav: $('autoPatchOnNav').checked,
  };
  chrome.storage.sync.set(settings, function () {
    updateMasterState(settings.enabled);
    log('config saved — admin:' + settings.isAdmin + ' marks:[' + settings.officialMark.join(',') + ']', 'ok');
    notifyContentScript();
  });
}

function notifyContentScript() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0] && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED' }, function () {
        if (chrome.runtime.lastError) {
          log('no content script on this tab', 'warn');
        }
      });
    }
  });
}

chrome.storage.sync.get(KEYS, function (data) {
  $('enabled').checked = data.enabled != null ? data.enabled : DEFAULTS.enabled;
  $('isAdmin').checked = data.isAdmin != null ? data.isAdmin : DEFAULTS.isAdmin;
  setOfficialMark(data.officialMark || DEFAULTS.officialMark);
  $('autoPatchOnNav').checked = data.autoPatchOnNav != null ? data.autoPatchOnNav : DEFAULTS.autoPatchOnNav;
  updateMasterState(data.enabled != null ? data.enabled : DEFAULTS.enabled);
  log('settings loaded from sync', 'ok');
});

$('enabled').addEventListener('change', saveAll);
$('isAdmin').addEventListener('change', saveAll);
$('autoPatchOnNav').addEventListener('change', saveAll);
document.querySelectorAll('.badge-check').forEach(function (c) {
  c.addEventListener('change', saveAll);
});
