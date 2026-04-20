(function () {
  let CONFIG = {
    enabled: true,
    isAdmin: true,
    officialMark: ['PURPLE', 'BLACK', 'RED', 'ORANGE', 'GREEN', 'YELLOW', 'BLUE', 'GRAY'],
    autoPatchOnNav: true,
  };

  let myUsername = null;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === '__karotter_patch_config') {
      const prev = CONFIG.enabled;
      CONFIG = { ...CONFIG, ...event.data.config };
      if (!prev && CONFIG.enabled) {
        let attempts = 0;
        const timer = setInterval(() => {
          if (patch() || ++attempts > 10) clearInterval(timer);
        }, 300);
      }
      if (CONFIG.enabled) patch();
    }
  });

  function buildPatchData() {
    const patchData = {};
    if (CONFIG.isAdmin) patchData.isAdmin = true;
    if (Array.isArray(CONFIG.officialMark) && CONFIG.officialMark.length > 0) {
      patchData.officialMark = CONFIG.officialMark;
    }
    return patchData;
  }

  function patchUserInObj(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) patchUserInObj(obj[i]);
      return;
    }
    if (obj.username === myUsername) {
      Object.assign(obj, buildPatchData());
    }
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        patchUserInObj(obj[key]);
      }
    }
  }

  function patchResponse(json) {
    if (!myUsername) {
      // First /api/auth/me — capture username
      const me = json.user || json;
      if (me && me.username) {
        myUsername = me.username;
      }
    }
    if (myUsername) {
      patchUserInObj(json);
    }
  }

  // --- fetch interception ---
  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const resp = await origFetch.apply(this, args);
    if (!CONFIG.enabled) return resp;
    const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
    if (!url.includes('/api/')) return resp;
    try {
      const json = await resp.clone().json();
      patchResponse(json);
      return new Response(JSON.stringify(json), {
        status: resp.status,
        statusText: resp.statusText,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e) {}
    return resp;
  };

  // --- XHR interception ---
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this._patchUrl = url;
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    if (CONFIG.enabled) {
      this.addEventListener('readystatechange', function () {
        if (this.readyState === 4 && this.status === 200) {
          try {
            const json = JSON.parse(this.responseText);
            patchResponse(json);
            Object.defineProperty(this, 'responseText', { value: JSON.stringify(json) });
            Object.defineProperty(this, 'response', { value: JSON.stringify(json) });
          } catch (e) {}
        }
      });
    }
    return origSend.apply(this, arguments);
  };

  // --- React state patch ---
  function findDispatch(node, depth) {
    if (!node || depth > 60) return null;
    try {
      let s = node.memoizedState;
      while (s) {
        const v = s.memoizedState;
        if (v && typeof v === 'object' && !Array.isArray(v) && 'isAdmin' in v && 'username' in v) {
          const d = s.queue && s.queue.dispatch;
          if (d) return { dispatch: d, state: v };
        }
        s = s.next;
      }
    } catch (e) {}
    return findDispatch(node.child, depth + 1) || findDispatch(node.sibling, depth + 1);
  }

  function patch() {
    if (!CONFIG.enabled) return false;
    const root = document.querySelector('#root');
    if (!root) return false;
    const fk = Object.keys(root).find(k => k.startsWith('__reactContainer'));
    if (!fk) return false;
    const found = findDispatch(root[fk], 0);
    if (!found) return false;
    found.dispatch(Object.assign({}, found.state, buildPatchData()));
    console.log('[Karotter Patcher] patched!');
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    if (patch() || ++attempts > 30) clearInterval(timer);
  }, 300);

  let lastPath = location.pathname;
  new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      if (!CONFIG.autoPatchOnNav || !CONFIG.enabled) return;
      let t = 0;
      const r = setInterval(() => { if (patch() || ++t > 15) clearInterval(r); }, 300);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
