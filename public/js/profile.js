/* ============================================================
   Single profile page (depends on common.js / window.Portal)
   Publicly viewable; admin can edit or delete.
   ============================================================ */
(function () {
  'use strict';

  const { $, $$, escapeHtml, toast, api, openModal, closeModal, isAdmin } = window.Portal;

  const id = new URLSearchParams(location.search).get('id');

  const state = {
    profile: null,
    sections: [],
    selectedFiles: [],
    existingPhotos: [],
    lbIndex: -1,
  };

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');
  }

  // ---------- load ----------
  async function loadSections() {
    try {
      const meta = await api('/api/meta');
      state.sections = meta.sections || [];
    } catch (_) {
      state.sections = ['A', 'B', 'C', 'D'];
    }
    const sel = $('#section');
    sel.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
    state.sections.forEach((s) => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      sel.appendChild(o);
    });
  }

  async function loadProfile() {
    const view = $('#profile-view');
    if (!id) {
      view.innerHTML = stateMsg('No profile selected.');
      return;
    }
    try {
      state.profile = await api('/api/profiles/' + id);
      render();
    } catch (err) {
      view.innerHTML = stateMsg(
        err.status === 404 ? 'This profile could not be found.' : 'Error: ' + escapeHtml(err.message)
      );
    }
  }

  function stateMsg(msg) {
    return `<p class="profile-state">${msg}<br /><a class="back-link" href="/">&larr; Back to directory</a></p>`;
  }

  // ---------- render ----------
  function render() {
    const p = state.profile;
    document.title = `${p.name} — GHSS Farooq Abad Class of 1999`;

    const avatar =
      p.photos && p.photos[0]
        ? `<img class="profile-avatar" src="${escapeHtml(p.photos[0].url)}" alt="Photo of ${escapeHtml(p.name)}" />`
        : `<div class="profile-avatar placeholder" aria-hidden="true">${escapeHtml(initials(p.name))}</div>`;

    const photosSection =
      p.photos && p.photos.length
        ? `<h2 class="profile-section-title">Photos</h2>
           <div class="profile-photos" id="profile-photos">${p.photos
             .map(
               (ph, i) =>
                 `<img src="${escapeHtml(ph.url)}" data-i="${i}" alt="Photo of ${escapeHtml(p.name)}" loading="lazy" />`
             )
             .join('')}</div>`
        : '';

    const bio = p.description
      ? `<p class="profile-bio">${escapeHtml(p.description)}</p>`
      : `<p class="profile-bio empty-bio">No description provided yet.</p>`;

    const adminActions = isAdmin()
      ? `<div class="profile-actions">
           <button id="edit-btn" class="btn btn-ghost" type="button">Edit profile</button>
           <button id="del-btn" class="btn btn-danger" type="button">Delete</button>
         </div>`
      : '';

    $('#profile-view').innerHTML = `
      <div class="profile-banner"></div>
      <div class="profile-head">
        ${avatar}
        <div class="profile-head-text">
          <span class="card-section">${escapeHtml(p.section)}</span>
          <h1 class="profile-name">${escapeHtml(p.name)}</h1>
        </div>
      </div>
      <div class="profile-body">
        ${bio}
        ${photosSection}
        ${adminActions}
      </div>`;

    $$('#profile-photos img').forEach((img) =>
      img.addEventListener('click', () => openLightbox(Number(img.dataset.i)))
    );
    if (isAdmin()) {
      $('#edit-btn').addEventListener('click', openEdit);
      $('#del-btn').addEventListener('click', removeProfile);
    }
  }

  // ---------- lightbox ----------
  function photos() {
    return (state.profile && state.profile.photos) || [];
  }
  function openLightbox(i) {
    state.lbIndex = i;
    renderLightbox();
    $('#lightbox').hidden = false;
  }
  function renderLightbox() {
    const ph = photos()[state.lbIndex];
    if (!ph) return;
    $('#lb-img').src = ph.url;
    $('#lb-img').alt = 'Photo of ' + state.profile.name;
    $('#lb-cap').textContent = state.profile.name;
    const multi = photos().length > 1;
    $('#lb-prev').style.display = multi ? '' : 'none';
    $('#lb-next').style.display = multi ? '' : 'none';
  }
  function step(delta) {
    const n = photos().length;
    if (!n) return;
    state.lbIndex = (state.lbIndex + delta + n) % n;
    renderLightbox();
  }

  // ---------- edit ----------
  function openEdit() {
    const p = state.profile;
    state.selectedFiles = [];
    state.existingPhotos = p.photos || [];
    $('#name').value = p.name || '';
    $('#section').value = p.section || '';
    $('#description').value = p.description || '';
    $('#profile-form-error').textContent = '';
    $('#photo-previews').innerHTML = (p.photos || [])
      .map((ph) => `<img src="${escapeHtml(ph.url)}" alt="" />`)
      .join('');
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

  async function uploadAllPhotos() {
    if (!state.selectedFiles.length) return null;
    const sig = await window.Portal.getUploadSignature();
    const uploaded = [];
    for (const file of state.selectedFiles) {
      uploaded.push(await window.Portal.uploadToCloudinary(file, sig));
    }
    return uploaded;
  }

  async function submitEdit(e) {
    e.preventDefault();
    const btn = $('#profile-submit');
    const errEl = $('#profile-form-error');
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const payload = {
        name: $('#name').value.trim(),
        section: $('#section').value,
        description: $('#description').value.trim(),
      };
      let photosUploaded = null;
      try {
        photosUploaded = await uploadAllPhotos();
      } catch (uErr) {
        toast(uErr.message, 'error');
      }
      payload.photos = photosUploaded || state.existingPhotos;

      state.profile = await api('/api/profiles/' + id, { method: 'PUT', body: payload });
      closeModal('#profile-modal');
      toast('Profile updated.', 'success');
      render();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save changes';
    }
  }

  async function removeProfile() {
    if (!confirm(`Delete the profile of "${state.profile.name}"? This cannot be undone.`)) return;
    try {
      await api('/api/profiles/' + id, { method: 'DELETE' });
      toast('Profile deleted.');
      setTimeout(() => (window.location.href = '/'), 600);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ---------- init ----------
  function init() {
    $('#profile-form').addEventListener('submit', submitEdit);
    $('#photos').addEventListener('change', onFilesSelected);

    $('#lb-prev').addEventListener('click', () => step(-1));
    $('#lb-next').addEventListener('click', () => step(1));
    $('#lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') $('#lightbox').hidden = true;
    });
    document.addEventListener('keydown', (e) => {
      if ($('#lightbox').hidden) return;
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });

    // Re-render when admin logs in/out so Edit/Delete appear or vanish.
    window.Portal.onAuthChange(() => {
      if (state.profile) render();
    });

    loadSections();
    loadProfile();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
