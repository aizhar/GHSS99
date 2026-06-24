/* ============================================================
   GHSS99 Class Fellows Portal — frontend logic
   ============================================================ */
(function () {
  'use strict';

  const API = ''; // same origin
  const TOKEN_KEY = 'ghss99_admin_token';

  const state = {
    profiles: [],
    sections: [],
    token: localStorage.getItem(TOKEN_KEY) || null,
    selectedFiles: [],
    editingId: null,
  };

  // --- tiny DOM helpers ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');
  }

  let toastTimer;
  function toast(message, isError) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.toggle('error', !!isError);
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
    if (state.token) {
      opts.headers['Authorization'] = 'Bearer ' + state.token;
    }
    const res = await fetch(API + path, opts);
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      /* no body */
    }
    if (!res.ok) {
      const msg = (data && data.error) || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ============================================================
  //  Loading & rendering
  // ============================================================
  async function loadMeta() {
    try {
      const meta = await api('/api/meta');
      if (meta.title) {
        $('#portal-title').textContent = meta.title.split('—')[0].trim() || meta.title;
        document.title = meta.title;
      }
      state.sections = meta.sections || [];
    } catch (_) {
      state.sections = ['Science', 'Arts', 'General'];
    }
    populateSectionControls();
  }

  function populateSectionControls() {
    const filter = $('#section-filter');
    const formSelect = $('#section');
    filter.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
    formSelect.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
    state.sections.forEach((s) => {
      const o1 = document.createElement('option');
      o1.value = s;
      o1.textContent = s;
      filter.appendChild(o1);
      const o2 = document.createElement('option');
      o2.value = s;
      o2.textContent = s;
      formSelect.appendChild(o2);
    });
  }

  async function loadProfiles() {
    const grid = $('#profiles');
    grid.setAttribute('aria-busy', 'true');
    $('#status-line').textContent = 'Loading class fellows…';

    const params = new URLSearchParams();
    const search = $('#search').value.trim();
    const section = $('#section-filter').value;
    if (search) params.set('search', search);
    if (section) params.set('section', section);

    try {
      state.profiles = await api('/api/profiles?' + params.toString());
      renderProfiles();
    } catch (err) {
      grid.innerHTML = `<p class="empty">Could not load profiles: ${escapeHtml(err.message)}</p>`;
      $('#status-line').textContent = '';
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }

  function renderProfiles() {
    const grid = $('#profiles');
    const list = state.profiles;
    const count = list.length;
    $('#status-line').textContent = count
      ? `${count} class fellow${count === 1 ? '' : 's'}`
      : '';

    if (!count) {
      grid.innerHTML = `<p class="empty">No class fellows found. Be the first to <strong>add your profile</strong>!</p>`;
      return;
    }

    grid.innerHTML = list.map(cardHtml).join('');

    // Wire per-card events.
    $$('[data-view]').forEach((el) =>
      el.addEventListener('click', () => openDetail(el.getAttribute('data-view')))
    );
    $$('[data-edit]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        openEdit(el.getAttribute('data-edit'));
      })
    );
    $$('[data-delete]').forEach((el) =>
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        removeProfile(el.getAttribute('data-delete'));
      })
    );
  }

  function cardHtml(p) {
    const photo = p.photos && p.photos[0];
    const media = photo
      ? `<img class="card-photo" src="${escapeHtml(photo.url)}" alt="Photo of ${escapeHtml(
          p.name
        )}" loading="lazy" />`
      : `<div class="card-photo placeholder" aria-hidden="true">${escapeHtml(initials(p.name))}</div>`;

    const adminActions = state.token
      ? `<div class="card-actions">
           <button class="btn btn-ghost" type="button" data-edit="${p._id}">Edit</button>
           <button class="btn btn-danger" type="button" data-delete="${p._id}">Delete</button>
         </div>`
      : '';

    return `
      <article class="card" data-view="${p._id}" tabindex="0" role="button"
               aria-label="View profile of ${escapeHtml(p.name)}">
        ${media}
        <div class="card-body">
          <span class="badge">${escapeHtml(p.section)}</span>
          <h3 class="card-name">${escapeHtml(p.name)}</h3>
          ${p.description ? `<p class="card-desc">${escapeHtml(p.description)}</p>` : ''}
          ${adminActions}
        </div>
      </article>`;
  }

  // ============================================================
  //  Detail view
  // ============================================================
  function openDetail(id) {
    const p = state.profiles.find((x) => x._id === id);
    if (!p) return;
    $('#detail-name').textContent = p.name;
    const gallery =
      p.photos && p.photos.length
        ? `<div class="detail-gallery">${p.photos
            .map(
              (ph) =>
                `<img src="${escapeHtml(ph.url)}" alt="Photo of ${escapeHtml(p.name)}" loading="lazy" />`
            )
            .join('')}</div>`
        : '';
    $('#detail-body').innerHTML = `
      <span class="badge">${escapeHtml(p.section)}</span>
      ${gallery}
      ${p.description ? `<p class="detail-meta">${escapeHtml(p.description)}</p>` : '<p class="detail-meta">No description provided.</p>'}
    `;
    openModal('#detail-modal');
  }

  // ============================================================
  //  Add / edit profile
  // ============================================================
  function openAdd() {
    state.editingId = null;
    state.selectedFiles = [];
    $('#profile-modal-title').textContent = 'Add your profile';
    $('#profile-form').reset();
    $('#profile-id').value = '';
    $('#photo-previews').innerHTML = '';
    $('#profile-form-error').textContent = '';
    $('#upload-hint').textContent = 'You can add up to 6 photos.';
    openModal('#profile-modal');
  }

  function openEdit(id) {
    const p = state.profiles.find((x) => x._id === id);
    if (!p) return;
    state.editingId = id;
    state.selectedFiles = [];
    state.existingPhotos = p.photos || [];
    $('#profile-modal-title').textContent = 'Edit profile';
    $('#profile-id').value = id;
    $('#name').value = p.name || '';
    $('#section').value = p.section || '';
    $('#description').value = p.description || '';
    $('#profile-form-error').textContent = '';
    $('#photo-previews').innerHTML = (p.photos || [])
      .map((ph) => `<img src="${escapeHtml(ph.url)}" alt="" />`)
      .join('');
    $('#upload-hint').textContent = 'Selecting new photos will replace the existing ones.';
    openModal('#profile-modal');
  }

  function onFilesSelected(e) {
    state.selectedFiles = Array.from(e.target.files).slice(0, 6);
    const previews = $('#photo-previews');
    previews.innerHTML = '';
    state.selectedFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.onload = () => URL.revokeObjectURL(url);
      previews.appendChild(img);
    });
  }

  // Upload one file directly to Cloudinary using a server-signed request.
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
    if (!res.ok) {
      throw new Error((data.error && data.error.message) || 'Image upload failed.');
    }
    return { url: data.secure_url, publicId: data.public_id };
  }

  async function uploadAllPhotos() {
    if (!state.selectedFiles.length) return null; // null = "no change"
    let sig;
    try {
      sig = await api('/api/upload-signature');
    } catch (err) {
      throw new Error(
        err.status === 503
          ? 'Photo uploads are not set up yet. You can save without a photo.'
          : err.message
      );
    }
    const uploaded = [];
    for (const file of state.selectedFiles) {
      uploaded.push(await uploadToCloudinary(file, sig));
    }
    return uploaded;
  }

  async function submitProfile(e) {
    e.preventDefault();
    const submitBtn = $('#profile-submit');
    const errEl = $('#profile-form-error');
    errEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      const payload = {
        name: $('#name').value.trim(),
        section: $('#section').value,
        description: $('#description').value.trim(),
      };

      let photos;
      try {
        photos = await uploadAllPhotos();
      } catch (uploadErr) {
        // Photo failed — let the user decide; surface message but allow saving text-only.
        toast(uploadErr.message, true);
        photos = null;
      }
      if (photos) payload.photos = photos;

      if (state.editingId) {
        // Preserve existing photos when none were newly chosen.
        if (!photos && state.existingPhotos) payload.photos = state.existingPhotos;
        await api('/api/profiles/' + state.editingId, { method: 'PUT', body: payload });
        toast('Profile updated.');
      } else {
        await api('/api/profiles', { method: 'POST', body: payload });
        toast('Profile added — welcome aboard!');
      }

      closeModal('#profile-modal');
      await loadProfiles();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save profile';
    }
  }

  async function removeProfile(id) {
    const p = state.profiles.find((x) => x._id === id);
    if (!p) return;
    if (!confirm(`Delete the profile of "${p.name}"? This cannot be undone.`)) return;
    try {
      await api('/api/profiles/' + id, { method: 'DELETE' });
      toast('Profile deleted.');
      await loadProfiles();
    } catch (err) {
      toast(err.message, true);
    }
  }

  // ============================================================
  //  Admin auth
  // ============================================================
  function refreshAuthUI() {
    const btn = $('#admin-btn');
    if (state.token) {
      btn.textContent = 'Log out';
    } else {
      btn.textContent = 'Admin login';
    }
  }

  function onAdminButton() {
    if (state.token) {
      state.token = null;
      localStorage.removeItem(TOKEN_KEY);
      refreshAuthUI();
      toast('Logged out.');
      renderProfiles();
    } else {
      $('#login-error').textContent = '';
      $('#login-form').reset();
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
        body: {
          username: $('#login-username').value,
          password: $('#login-password').value,
        },
      });
      state.token = data.token;
      localStorage.setItem(TOKEN_KEY, data.token);
      refreshAuthUI();
      closeModal('#login-modal');
      toast('Logged in as admin.');
      renderProfiles();
    } catch (err) {
      errEl.textContent = err.message;
    }
  }

  // ============================================================
  //  Modal plumbing (focus + keyboard)
  // ============================================================
  let lastFocused = null;
  function openModal(sel) {
    lastFocused = document.activeElement;
    const modal = $(sel);
    modal.hidden = false;
    const focusable = modal.querySelector('input, select, textarea, button');
    if (focusable) focusable.focus();
  }
  function closeModal(sel) {
    $(sel).hidden = true;
    if (lastFocused) lastFocused.focus();
  }
  function closeAllModals() {
    $$('.modal').forEach((m) => (m.hidden = true));
    if (lastFocused) lastFocused.focus();
  }

  // ============================================================
  //  Debounce
  // ============================================================
  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ============================================================
  //  Wire up
  // ============================================================
  function init() {
    refreshAuthUI();

    $('#add-btn').addEventListener('click', openAdd);
    $('#admin-btn').addEventListener('click', onAdminButton);
    $('#profile-form').addEventListener('submit', submitProfile);
    $('#login-form').addEventListener('submit', submitLogin);
    $('#photos').addEventListener('change', onFilesSelected);

    $('#search').addEventListener('input', debounce(loadProfiles, 300));
    $('#section-filter').addEventListener('change', loadProfiles);

    // Close buttons / backdrops.
    $$('[data-close]').forEach((el) =>
      el.addEventListener('click', () => {
        const modal = el.closest('.modal');
        if (modal) modal.hidden = true;
        if (lastFocused) lastFocused.focus();
      })
    );

    // Keyboard: Esc closes modals; Enter/Space activates cards.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllModals();
    });
    $('#profiles').addEventListener('keydown', (e) => {
      const card = e.target.closest('[data-view]');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        openDetail(card.getAttribute('data-view'));
      }
    });

    loadMeta().then(loadProfiles);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
