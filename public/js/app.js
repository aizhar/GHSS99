/* ============================================================
   Class Fellows page logic (depends on common.js / window.Portal)
   ============================================================ */
(function () {
  'use strict';

  const { $, $$, escapeHtml, toast, api, openModal, closeModal, isAdmin } = window.Portal;

  const state = {
    profiles: [],
    sections: [],
    selectedFiles: [],
    editingId: null,
    existingPhotos: [],
  };

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');
  }

  // ---------- meta / sections ----------
  async function loadMeta() {
    try {
      const meta = await api('/api/meta');
      state.sections = meta.sections || [];
    } catch (_) {
      state.sections = ['Science', 'Arts', 'General'];
    }
    $('#stat-sections').textContent = state.sections.length;
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

  // ---------- load + render ----------
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

    // Hero stat reflects the unfiltered-ish current count.
    if (!$('#search').value && !$('#section-filter').value) {
      $('#stat-fellows').textContent = count;
    }

    $('#status-line').textContent = count
      ? `${count} class fellow${count === 1 ? '' : 's'}`
      : '';

    if (!count) {
      grid.innerHTML = `<div class="empty"><span class="empty-emoji">🎓</span>No class fellows found yet. Be the first to <strong>add your profile</strong>!</div>`;
      return;
    }

    grid.innerHTML = list.map(cardHtml).join('');

    // Click anywhere on a card (except the admin buttons) opens the profile page.
    $$('.card').forEach((card) =>
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-actions') || e.target.closest('a')) return;
        window.location.href = '/profile.html?id=' + card.getAttribute('data-id');
      })
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
      ? `<img class="card-photo" src="${escapeHtml(photo.url)}" alt="Photo of ${escapeHtml(p.name)}" loading="lazy" />`
      : `<div class="card-photo placeholder" aria-hidden="true">${escapeHtml(initials(p.name))}</div>`;

    const adminActions = isAdmin()
      ? `<div class="card-actions">
           <button class="btn btn-ghost btn-sm" type="button" data-edit="${p._id}">Edit</button>
           <button class="btn btn-danger btn-sm" type="button" data-delete="${p._id}">Delete</button>
         </div>`
      : '';

    const photoCount = (p.photos && p.photos.length) || 0;
    const photoNote = photoCount ? `<span class="card-photos-note">${photoCount} photo${photoCount === 1 ? '' : 's'}</span>` : '';

    return `
      <article class="card" data-id="${p._id}">
        ${media}
        <div class="card-body">
          <span class="card-section">${escapeHtml(p.section)}</span>
          <h3 class="card-name"><a href="/profile.html?id=${p._id}">${escapeHtml(p.name)}</a></h3>
          ${p.description ? `<p class="card-desc">${escapeHtml(p.description)}</p>` : ''}
          ${photoNote}
          ${adminActions}
        </div>
      </article>`;
  }

  // ---------- add / edit ----------
  function openAdd() {
    state.editingId = null;
    state.selectedFiles = [];
    state.existingPhotos = [];
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

  async function uploadAllPhotos() {
    if (!state.selectedFiles.length) return null;
    let sig;
    try {
      sig = await window.Portal.getUploadSignature();
    } catch (err) {
      throw new Error(
        err.status === 503
          ? 'Photo uploads are not set up yet. You can save without a photo.'
          : err.message
      );
    }
    const uploaded = [];
    for (const file of state.selectedFiles) {
      uploaded.push(await window.Portal.uploadToCloudinary(file, sig));
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
        toast(uploadErr.message, 'error');
        photos = null;
      }
      if (photos) payload.photos = photos;

      if (state.editingId) {
        if (!photos && state.existingPhotos) payload.photos = state.existingPhotos;
        await api('/api/profiles/' + state.editingId, { method: 'PUT', body: payload });
        toast('Profile updated.', 'success');
      } else {
        await api('/api/profiles', { method: 'POST', body: payload });
        toast('Profile added — welcome aboard!', 'success');
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
      toast(err.message, 'error');
    }
  }

  // ---------- debounce ----------
  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ---------- init ----------
  function init() {
    $('#add-btn').addEventListener('click', openAdd);
    $('#profile-form').addEventListener('submit', submitProfile);
    $('#photos').addEventListener('change', onFilesSelected);
    $('#search').addEventListener('input', debounce(loadProfiles, 300));
    $('#section-filter').addEventListener('change', loadProfiles);

    // Re-render cards when admin logs in/out so Edit/Delete appear or vanish.
    window.Portal.onAuthChange(renderProfiles);

    loadMeta().then(loadProfiles);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
