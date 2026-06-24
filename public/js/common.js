/* ============================================================
   Shared shell used by every page: API, auth, toast, modals,
   navigation, and Cloudinary uploads. Exposes window.Portal.
   ============================================================ */
(function () {
  'use strict';

  const TOKEN_KEY = 'ghss99_admin_token';
  let token = localStorage.getItem(TOKEN_KEY) || null;
  const authListeners = [];

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- toast ---
  let toastTimer;
  function toast(message, type) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.className = 'toast' + (type ? ' ' + type : '');
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 3500);
  }

  // --- API wrapper ---
  async function api(path, options = {}) {
    const opts = { headers: {}, ...options };
    if (opts.body && !(opts.body instanceof FormData)) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(path, opts);
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      /* no body */
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // --- Cloudinary direct upload ---
  function getUploadSignature() {
    return api('/api/upload-signature');
  }
  async function uploadToCloudinary(file, sig) {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', sig.timestamp);
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data.error && data.error.message) || 'Image upload failed.');
    return { url: data.secure_url, publicId: data.public_id };
  }

  // --- modals ---
  let lastFocused = null;
  function openModal(sel) {
    lastFocused = document.activeElement;
    const m = $(sel);
    if (!m) return;
    m.hidden = false;
    const f = m.querySelector('input, select, textarea, button');
    if (f) f.focus();
  }
  function closeModal(sel) {
    const m = $(sel);
    if (m) m.hidden = true;
    if (lastFocused) lastFocused.focus();
  }
  function closeOverlays() {
    $$('.modal, .lightbox').forEach((m) => (m.hidden = true));
  }

  // --- auth ---
  function isAdmin() {
    return !!token;
  }
  function onAuthChange(fn) {
    authListeners.push(fn);
  }
  function setToken(t) {
    token = t || null;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    document.body.classList.toggle('is-admin', !!token);
    refreshAuthButton();
    authListeners.forEach((fn) => fn(!!token));
  }
  function refreshAuthButton() {
    const b = $('#auth-btn');
    if (b) b.textContent = token ? 'Log out' : 'Admin login';
  }
  function onAuthButton() {
    if (token) {
      setToken(null);
      toast('Logged out.');
    } else {
      const err = $('#login-error');
      if (err) err.textContent = '';
      const form = $('#login-form');
      if (form) form.reset();
      openModal('#login-modal');
    }
  }
  async function submitLogin(e) {
    e.preventDefault();
    const errEl = $('#login-error');
    errEl.textContent = '';
    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: { username: $('#login-username').value, password: $('#login-password').value },
      });
      setToken(data.token);
      closeModal('#login-modal');
      toast('Logged in as admin.', 'success');
    } catch (err) {
      errEl.textContent = err.message;
    }
  }

  function initShell() {
    document.body.classList.toggle('is-admin', !!token);
    refreshAuthButton();

    const page = document.body.getAttribute('data-page');
    $$('.nav-links a').forEach((a) => {
      if (a.getAttribute('data-nav') === page) a.classList.add('active');
    });

    const authBtn = $('#auth-btn');
    if (authBtn) authBtn.addEventListener('click', onAuthButton);
    const loginForm = $('#login-form');
    if (loginForm) loginForm.addEventListener('submit', submitLogin);

    $$('[data-close]').forEach((el) =>
      el.addEventListener('click', () => {
        const m = el.closest('.modal, .lightbox');
        if (m) m.hidden = true;
        if (lastFocused) lastFocused.focus();
      })
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeOverlays();
    });
  }

  window.Portal = {
    $,
    $$,
    escapeHtml,
    toast,
    api,
    getUploadSignature,
    uploadToCloudinary,
    openModal,
    closeModal,
    closeOverlays,
    isAdmin,
    onAuthChange,
  };

  document.addEventListener('DOMContentLoaded', initShell);
})();
