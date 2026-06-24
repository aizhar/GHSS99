/* ============================================================
   Photo Gallery page logic (depends on common.js / window.Portal)
   ============================================================ */
(function () {
  'use strict';

  const { $, $$, escapeHtml, toast, api, openModal, closeModal, isAdmin } = window.Portal;

  const state = {
    all: [], // every photo
    filtered: [], // currently displayed (after year filter)
    selectedFiles: [],
    lbIndex: -1,
  };

  // ---------- load + render ----------
  async function loadPhotos() {
    const gallery = $('#gallery');
    gallery.setAttribute('aria-busy', 'true');
    $('#status-line').textContent = 'Loading photos…';
    try {
      state.all = await api('/api/photos');
      $('#stat-photos').textContent = state.all.length;
      populateYearFilter();
      applyFilter();
    } catch (err) {
      gallery.innerHTML = `<p class="empty">Could not load photos: ${escapeHtml(err.message)}</p>`;
      $('#status-line').textContent = '';
    } finally {
      gallery.setAttribute('aria-busy', 'false');
    }
  }

  function populateYearFilter() {
    const sel = $('#year-filter');
    const current = sel.value;
    const years = [...new Set(state.all.map((p) => p.year).filter((y) => y != null))].sort(
      (a, b) => b - a
    );
    sel.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());
    years.forEach((y) => {
      const o = document.createElement('option');
      o.value = String(y);
      o.textContent = y;
      sel.appendChild(o);
    });
    if (years.map(String).includes(current)) sel.value = current;
  }

  function applyFilter() {
    const year = $('#year-filter').value;
    state.filtered = year ? state.all.filter((p) => String(p.year) === year) : state.all.slice();
    renderGallery();
  }

  function renderGallery() {
    const gallery = $('#gallery');
    const list = state.filtered;
    $('#status-line').textContent = list.length
      ? `${list.length} photo${list.length === 1 ? '' : 's'}`
      : '';

    if (!list.length) {
      gallery.innerHTML = `<div class="empty"><span class="empty-emoji">📷</span>${
        state.all.length ? 'No photos for this year.' : 'No photos yet. Memories will appear here soon!'
      }</div>`;
      return;
    }

    gallery.innerHTML = list
      .map((p, i) => {
        const cap = [
          p.year ? `<span class="gallery-year">${escapeHtml(p.year)}</span>` : '',
          p.caption ? `<div>${escapeHtml(p.caption)}</div>` : '',
        ].join('');
        return `
          <figure class="gallery-item" data-index="${i}" tabindex="0" role="button"
                  aria-label="${escapeHtml(p.caption || 'Photo')}${p.year ? ', ' + p.year : ''}">
            <img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.caption || 'Old class photo')}" loading="lazy" />
            ${cap ? `<figcaption class="gallery-cap">${cap}</figcaption>` : ''}
          </figure>`;
      })
      .join('');

    $$('.gallery-item').forEach((el) => {
      const open = () => openLightbox(Number(el.getAttribute('data-index')));
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  }

  // ---------- lightbox ----------
  function openLightbox(index) {
    state.lbIndex = index;
    renderLightbox();
    $('#lightbox').hidden = false;
  }
  function renderLightbox() {
    const p = state.filtered[state.lbIndex];
    if (!p) return;
    $('#lb-img').src = p.url;
    $('#lb-img').alt = p.caption || 'Old class photo';
    $('#lb-cap').innerHTML = [
      p.year ? `<span class="gallery-year">${escapeHtml(p.year)}</span> ` : '',
      p.caption ? escapeHtml(p.caption) : '',
    ].join('');
    const multi = state.filtered.length > 1;
    $('#lb-prev').style.display = multi ? '' : 'none';
    $('#lb-next').style.display = multi ? '' : 'none';
  }
  function step(delta) {
    const n = state.filtered.length;
    if (!n) return;
    state.lbIndex = (state.lbIndex + delta + n) % n;
    renderLightbox();
  }
  async function deleteCurrent() {
    const p = state.filtered[state.lbIndex];
    if (!p) return;
    if (!confirm('Delete this photo from the gallery? This cannot be undone.')) return;
    try {
      await api('/api/photos/' + p._id, { method: 'DELETE' });
      $('#lightbox').hidden = true;
      toast('Photo deleted.');
      await loadPhotos();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ---------- admin upload ----------
  function openAdd() {
    state.selectedFiles = [];
    $('#photo-form').reset();
    $('#g-previews').innerHTML = '';
    $('#g-error').textContent = '';
    openModal('#photo-modal');
  }

  function onFilesSelected(e) {
    state.selectedFiles = Array.from(e.target.files).slice(0, 20);
    const previews = $('#g-previews');
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

  async function submitPhotos(e) {
    e.preventDefault();
    const btn = $('#g-submit');
    const errEl = $('#g-error');
    errEl.textContent = '';

    if (!state.selectedFiles.length) {
      errEl.textContent = 'Please choose at least one photo.';
      return;
    }

    const caption = $('#g-caption').value.trim();
    const yearVal = $('#g-year').value;
    const year = yearVal ? Number(yearVal) : null;

    btn.disabled = true;
    btn.textContent = 'Uploading…';

    try {
      let sig;
      try {
        sig = await window.Portal.getUploadSignature();
      } catch (err) {
        throw new Error(
          err.status === 503 ? 'Image uploads are not configured on the server.' : err.message
        );
      }

      let done = 0;
      for (const file of state.selectedFiles) {
        const { url, publicId } = await window.Portal.uploadToCloudinary(file, sig);
        await api('/api/photos', { method: 'POST', body: { url, publicId, caption, year } });
        done++;
        btn.textContent = `Uploading… (${done}/${state.selectedFiles.length})`;
      }

      closeModal('#photo-modal');
      toast(`${done} photo${done === 1 ? '' : 's'} added.`, 'success');
      await loadPhotos();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload';
    }
  }

  // ---------- init ----------
  function init() {
    $('#year-filter').addEventListener('change', applyFilter);
    $('#add-photo-btn').addEventListener('click', openAdd);
    $('#photo-form').addEventListener('submit', submitPhotos);
    $('#g-photos').addEventListener('change', onFilesSelected);

    $('#lb-prev').addEventListener('click', () => step(-1));
    $('#lb-next').addEventListener('click', () => step(1));
    $('#lb-del').addEventListener('click', deleteCurrent);

    // Click on lightbox background (not image/buttons) closes it.
    $('#lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') $('#lightbox').hidden = true;
    });
    document.addEventListener('keydown', (e) => {
      if ($('#lightbox').hidden) return;
      if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
    });

    // Re-render so admin delete button reflects login state.
    window.Portal.onAuthChange(() => {
      if (!$('#lightbox').hidden) renderLightbox();
    });

    loadPhotos();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
