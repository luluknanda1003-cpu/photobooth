/**
 * SnapBooth — app.js
 * Full photobooth application logic
 * ES6 Modules-style, IIFE wrapped for safety
 */
(function () {
  'use strict';

  // =====================================================
  // STATE
  // =====================================================
  const state = {
    darkMode: false,
    currentPage: 'home',
    selectedTemplate: null,
    captureMode: 'camera', // 'camera' | 'upload'
    cameraStream: null,
    heroCameraStream: null,
    mirrorMode: true,
    timerSeconds: 3,
    activeFilter: 'normal',
    shots: [], // Array of base64 strings
    currentShotIndex: 0,
    isCountingDown: false,
    editorFilter: 'normal',
    // Adjustments
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 0,
    blur: 0,
    // Frame
    frameColor: '#ffffff',
    frameWidth: 20,
    // Overlays
    textOverlays: [],
    stickerOverlays: [],
    // Zoom
    zoomLevel: 1,
    // Transform per slot
    transforms: [], // [{rotate, flipH, flipV}]
  };

  // =====================================================
  // TEMPLATES DATA
  // =====================================================
  const TEMPLATES = [
    { id: 'classic2', name: 'Classic 2', slots: 2, bg: 'linear-gradient(135deg,#667eea,#764ba2)', textColor: '#fff' },
    { id: 'classic4', name: 'Classic 4', slots: 4, bg: 'linear-gradient(135deg,#f093fb,#f5576c)', textColor: '#fff' },
    { id: 'kpop', name: 'K-Pop Style', slots: 4, bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', textColor: '#fff' },
    { id: 'korean', name: 'Korean Booth', slots: 3, bg: 'linear-gradient(135deg,#43e97b,#38f9d7)', textColor: '#fff' },
    { id: 'vintage', name: 'Vintage Film', slots: 4, bg: 'linear-gradient(135deg,#d4a76a,#8b6914)', textColor: '#fff' },
    { id: 'minimalist', name: 'Minimalist', slots: 3, bg: 'linear-gradient(135deg,#f8f9fa,#dee2e6)', textColor: '#333' },
    { id: 'pastel', name: 'Aesthetic Pastel', slots: 4, bg: 'linear-gradient(135deg,#ffecd2,#fcb69f)', textColor: '#5c3317' },
    { id: 'birthday', name: 'Birthday 🎂', slots: 4, bg: 'linear-gradient(135deg,#f9c22e,#ff6b6b)', textColor: '#fff' },
    { id: 'graduation', name: 'Graduation 🎓', slots: 3, bg: 'linear-gradient(135deg,#232526,#414345)', textColor: '#ffd700' },
    { id: 'wedding', name: 'Wedding 💍', slots: 4, bg: 'linear-gradient(135deg,#fdfcfb,#e2d9f3)', textColor: '#4a3060' },
  ];

  // =====================================================
  // FILTERS DATA
  // =====================================================
  const FILTERS = [
    { id: 'normal', name: 'Normal', css: '' },
    { id: 'bw', name: 'B&W', css: 'grayscale(100%)' },
    { id: 'vintage', name: 'Vintage', css: 'sepia(40%) saturate(80%) brightness(90%)' },
    { id: 'warm', name: 'Warm', css: 'sepia(20%) saturate(120%) hue-rotate(-15deg) brightness(105%)' },
    { id: 'cool', name: 'Cool', css: 'saturate(80%) hue-rotate(20deg) brightness(105%)' },
    { id: 'sepia', name: 'Sepia', css: 'sepia(80%)' },
    { id: 'bright', name: 'Bright', css: 'brightness(130%) contrast(105%)' },
    { id: 'soft', name: 'Soft Beauty', css: 'brightness(108%) contrast(90%) saturate(90%) blur(0.4px)' },
  ];

  // =====================================================
  // STICKERS DATA
  // =====================================================
  const STICKERS = ['❤️','🌸','⭐','✨','🦋','🌈','🎉','🎀','🍓','🌙','☁️','🔥','💫','🎵','🌺','💎','🪐','🌻','🦄','🍒'];

  // =====================================================
  // FRAME COLORS
  // =====================================================
  const FRAME_COLORS = ['#ffffff','#000000','#7C3AED','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316','#d4a76a','#e2d9f3'];

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================
  function $(sel, ctx = document) { return ctx.querySelector(sel); }
  function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

  function showToast(msg, type = 'info') {
    const tc = $('#toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    tc.appendChild(t);
    requestAnimationFrame(() => { requestAnimationFrame(() => t.classList.add('show')); });
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 3000);
  }

  function showLoading() { $('#loading-overlay').classList.remove('hidden'); }
  function hideLoading() { $('#loading-overlay').classList.add('hidden'); }

  // =====================================================
  // DARK MODE
  // =====================================================
  function initTheme() {
    const saved = localStorage.getItem('snapbooth-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      enableDark();
    }
  }

  function enableDark() {
    document.documentElement.classList.add('dark');
    $('#theme-toggle').textContent = '☀️';
    state.darkMode = true;
    localStorage.setItem('snapbooth-theme', 'dark');
  }

  function disableDark() {
    document.documentElement.classList.remove('dark');
    $('#theme-toggle').textContent = '🌙';
    state.darkMode = false;
    localStorage.setItem('snapbooth-theme', 'light');
  }

  $('#theme-toggle').addEventListener('click', () => {
    state.darkMode ? disableDark() : enableDark();
  });

  // =====================================================
  // NAVBAR
  // =====================================================
  window.addEventListener('scroll', () => {
    $('#navbar').classList.toggle('scrolled', window.scrollY > 10);
  });

  $('#mobile-menu-btn').addEventListener('click', () => {
    $('#mobile-menu').classList.toggle('hidden');
  });

  // =====================================================
  // PAGE NAVIGATION
  // =====================================================
  function navigateTo(page) {
    // Hide all pages
    $$('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
    const target = $(`#page-${page}`);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
      window.scrollTo(0, 0);
    }
    state.currentPage = page;
    // Update nav active states
    $$('.nav-link').forEach(l => {
      l.classList.toggle('text-violet-600', l.dataset.page === page);
    });
    if (page === 'gallery') renderGallery();
    if (page === 'booth') showBoothStep('template');
    if (page === 'templates') renderAllTemplates();
    $('#mobile-menu').classList.add('hidden');
  }

  // Wire all nav links
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.nav-link');
    if (el && el.dataset.page) {
      e.preventDefault();
      navigateTo(el.dataset.page);
    }
  });

  // =====================================================
  // BOOTH STEPS
  // =====================================================
  function showBoothStep(step) {
    $$('.booth-step').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
    const target = $(`#booth-step-${step}`);
    if (target) { target.classList.remove('hidden'); target.classList.add('active'); }
    // Stop camera if going back to template step
    if (step === 'template') stopCamera();
  }

  // =====================================================
  // TEMPLATE RENDERING
  // =====================================================
  function createTemplateCard(tpl, clickCb) {
    const card = document.createElement('div');
    card.className = 'template-card glass-card overflow-hidden';
    card.dataset.id = tpl.id;

    // Preview strip
    const preview = document.createElement('div');
    preview.className = 'card-preview';
    preview.style.background = tpl.bg;
    for (let i = 0; i < tpl.slots; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      preview.appendChild(slot);
    }

    const label = document.createElement('div');
    label.className = 'card-label';
    label.style.color = 'var(--text)';
    label.textContent = tpl.name;

    const btn = document.createElement('button');
    btn.className = 'use-btn';
    btn.style.color = tpl.textColor;
    btn.style.background = tpl.bg;
    btn.textContent = 'Use Template';

    card.appendChild(preview);
    card.appendChild(label);
    card.appendChild(btn);

    card.addEventListener('click', () => clickCb(tpl));
    return card;
  }

  function renderHomeTemplates() {
    const grid = $('#home-templates-grid');
    grid.innerHTML = '';
    TEMPLATES.slice(0, 5).forEach(tpl => {
      grid.appendChild(createTemplateCard(tpl, (t) => {
        selectTemplate(t);
        navigateTo('booth');
      }));
    });
  }

  function renderAllTemplates() {
    const grid = $('#all-templates-grid');
    grid.innerHTML = '';
    TEMPLATES.forEach(tpl => {
      grid.appendChild(createTemplateCard(tpl, (t) => {
        selectTemplate(t);
        navigateTo('booth');
      }));
    });
  }

  function renderBoothTemplates() {
    const grid = $('#booth-templates-grid');
    grid.innerHTML = '';
    TEMPLATES.forEach(tpl => {
      grid.appendChild(createTemplateCard(tpl, selectTemplate));
    });
  }

  function selectTemplate(tpl) {
    state.selectedTemplate = tpl;
    state.shots = new Array(tpl.slots).fill(null);
    state.transforms = tpl.slots > 0 ? Array.from({ length: tpl.slots }, () => ({ rotate: 0, flipH: false, flipV: false })) : [];

    // Update UI
    $$('.template-card').forEach(c => c.classList.toggle('selected', c.dataset.id === tpl.id));
    $('#capture-template-name').textContent = tpl.name;
    $('#capture-photos-needed').textContent = `Take ${tpl.slots} photo${tpl.slots > 1 ? 's' : ''}`;

    renderShotSlots();
    showBoothStep('capture');
    updateCaptureBtn();
  }

  // =====================================================
  // SHOT SLOTS
  // =====================================================
  function renderShotSlots() {
    const container = $('#shot-slots');
    container.innerHTML = '';
    const tpl = state.selectedTemplate;
    if (!tpl) return;

    tpl.slots > 0 && Array.from({ length: tpl.slots }, (_, i) => {
      const slot = document.createElement('div');
      slot.className = 'shot-slot';
      slot.dataset.index = i;

      const num = document.createElement('span');
      num.className = 'slot-num';
      num.textContent = `Photo ${i + 1}`;

      const retakeBtn = document.createElement('button');
      retakeBtn.className = 'retake-btn';
      retakeBtn.textContent = '↺';
      retakeBtn.title = 'Retake this photo';
      retakeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        retakeSlot(i);
      });

      slot.appendChild(num);
      slot.appendChild(retakeBtn);
      container.appendChild(slot);
    });

    updateShotSlots();
  }

  function updateShotSlots() {
    const tpl = state.selectedTemplate;
    if (!tpl) return;
    const slots = $$('#shot-slots .shot-slot');
    slots.forEach((slot, i) => {
      if (state.shots[i]) {
        slot.classList.add('filled');
        // Clear and add image
        const existing = slot.querySelector('img');
        if (existing) existing.remove();
        const img = new Image();
        img.src = state.shots[i];
        img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:10px;';
        slot.insertBefore(img, slot.querySelector('.slot-num'));
        slot.querySelector('.slot-num').style.display = 'none';
      } else {
        slot.classList.remove('filled');
        const img = slot.querySelector('img');
        if (img) img.remove();
        slot.querySelector('.slot-num').style.display = '';
      }
    });

    const allFilled = state.shots.every(s => s !== null);
    $('#proceed-to-editor').classList.toggle('hidden', !allFilled);
    $('#retake-all-btn').classList.toggle('hidden', !state.shots.some(s => s));
  }

  function retakeSlot(index) {
    state.shots[index] = null;
    state.transforms[index] = { rotate: 0, flipH: false, flipV: false };
    state.currentShotIndex = index;
    updateShotSlots();
    updateCaptureBtn();
  }

  // =====================================================
  // CAMERA
  // =====================================================
  async function startCamera(videoEl) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      videoEl.srcObject = stream;
      return stream;
    } catch (err) {
      showToast('Camera access denied. Please allow camera permissions.', 'error');
      return null;
    }
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(t => t.stop());
      state.cameraStream = null;
    }
    const video = $('#main-video');
    if (video) video.srcObject = null;
    $('#camera-off-placeholder')?.classList.remove('hidden');
    $('#capture-btn')?.classList.add('hidden');
  }

  function applyMirror() {
    const video = $('#main-video');
    if (video) video.style.transform = state.mirrorMode ? 'scaleX(-1)' : '';
  }

  function updateCaptureBtn() {
    const btn = $('#capture-btn');
    if (!btn) return;
    const nextEmpty = state.shots.findIndex(s => s === null);
    if (nextEmpty === -1) {
      btn.textContent = '✅ All photos taken!';
      btn.disabled = true;
    } else {
      state.currentShotIndex = nextEmpty;
      const remaining = state.shots.filter(s => s === null).length;
      btn.innerHTML = `📸 Take Photo (<span id="shots-remaining">${remaining}</span> left)`;
      btn.disabled = false;
    }
    const hasCam = !!state.cameraStream;
    btn.classList.toggle('hidden', !hasCam);
  }

  async function takePhoto() {
    if (state.isCountingDown) return;
    const secs = state.timerSeconds;
    const video = $('#main-video');
    const overlay = $('#countdown-overlay');
    const numEl = $('#countdown-number');

    state.isCountingDown = true;
    overlay.classList.remove('hidden');

    for (let i = secs; i >= 1; i--) {
      numEl.textContent = i;
      // re-trigger animation
      numEl.classList.remove('countdown-num');
      void numEl.offsetWidth;
      numEl.classList.add('countdown-num');
      await sleep(1000);
    }
    numEl.textContent = '📸';
    await sleep(300);
    overlay.classList.add('hidden');
    state.isCountingDown = false;

    // Capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');

    // Apply mirror
    if (state.mirrorMode) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.filter = getFilterCSS(state.activeFilter);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const idx = state.shots.findIndex(s => s === null);
    if (idx !== -1) {
      state.shots[idx] = dataUrl;
      updateShotSlots();
      updateCaptureBtn();

      // Flash effect
      const cont = $('#camera-container');
      cont.style.outline = '4px solid white';
      setTimeout(() => cont.style.outline = '', 200);

      const allFilled = state.shots.every(s => s !== null);
      if (allFilled) showToast('All photos taken! Proceed to edit. ✨', 'success');
    }
  }

  // =====================================================
  // FILTER HELPERS
  // =====================================================
  function getFilterCSS(filterId) {
    return FILTERS.find(f => f.id === filterId)?.css || '';
  }

  function buildFilterBar(containerId, onSelect) {
    const bar = $(containerId);
    if (!bar) return;
    bar.innerHTML = '';
    FILTERS.forEach(f => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip' + (f.id === 'normal' ? ' active' : '');
      chip.dataset.filter = f.id;
      chip.textContent = f.name;
      chip.addEventListener('click', () => {
        bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        onSelect(f.id);
      });
      bar.appendChild(chip);
    });
  }

  // =====================================================
  // EDITOR
  // =====================================================
  function renderEditorFilterBar() {
    buildFilterBar('#editor-filter-bar', (fid) => {
      state.editorFilter = fid;
      renderPreview();
    });
  }

  function renderStickerPicker() {
    const picker = $('#sticker-picker');
    picker.innerHTML = '';
    STICKERS.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'sticker-btn';
      btn.textContent = s;
      btn.addEventListener('click', () => addSticker(s));
      picker.appendChild(btn);
    });
  }

  function renderFrameColorPicker() {
    const picker = $('#frame-color-picker');
    picker.innerHTML = '';
    FRAME_COLORS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'frame-color-btn' + (c === state.frameColor ? ' selected' : '');
      btn.style.background = c;
      btn.style.border = c === '#ffffff' ? '2px solid #ddd' : '2px solid transparent';
      btn.addEventListener('click', () => {
        $$('.frame-color-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.frameColor = c;
        renderPreview();
      });
      picker.appendChild(btn);
    });
  }

  function addSticker(emoji) {
    state.stickerOverlays.push({ emoji, x: 50, y: 50 });
    renderPreview();
    showToast(`${emoji} sticker added!`, 'success');
  }

  function addText() {
    const input = $('#text-input');
    const text = input.value.trim();
    if (!text) { showToast('Type something first!', 'error'); return; }
    const color = $('#text-color').value;
    state.textOverlays.push({ text, color, x: 50, y: 50, size: 24 });
    input.value = '';
    renderPreview();
    showToast('Text added!', 'success');
  }

  // =====================================================
  // PREVIEW CANVAS RENDERING
  // =====================================================
  async function renderPreview() {
    const canvas = $('#preview-canvas');
    const tpl = state.selectedTemplate;
    if (!canvas || !tpl) return;

    const SLOT_W = 320;
    const SLOT_H = 240;
    const PAD = state.frameWidth;
    const GAP = Math.floor(PAD / 2);
    const slots = tpl.slots;

    canvas.width = SLOT_W + PAD * 2;
    canvas.height = SLOT_H * slots + GAP * (slots - 1) + PAD * 2 + 40; // 40 for label

    const ctx = canvas.getContext('2d');

    // Frame background
    ctx.fillStyle = state.frameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Template gradient border effect
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (tpl.bg.includes('#')) {
      const colors = tpl.bg.match(/#[0-9a-fA-F]{3,6}/g) || ['#7C3AED', '#A855F7'];
      grad.addColorStop(0, colors[0] || '#7C3AED');
      grad.addColorStop(1, colors[1] || '#A855F7');
    } else {
      grad.addColorStop(0, '#7C3AED');
      grad.addColorStop(1, '#A855F7');
    }
    // thin accent line on left
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, canvas.height);

    // Draw each photo slot
    for (let i = 0; i < slots; i++) {
      const x = PAD;
      const y = PAD + i * (SLOT_H + GAP);
      const img = state.shots[i];
      const transform = state.transforms[i] || { rotate: 0, flipH: false, flipV: false };

      if (img) {
        const image = await loadImage(img);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, SLOT_W, SLOT_H, 8);
        ctx.clip();

        // Apply adjustments
        const f = [];
        if (state.brightness !== 100) f.push(`brightness(${state.brightness}%)`);
        if (state.contrast !== 100) f.push(`contrast(${state.contrast}%)`);
        if (state.saturation !== 100) f.push(`saturate(${state.saturation}%)`);
        if (state.blur > 0) f.push(`blur(${state.blur * 0.5}px)`);
        const editorFilterCSS = getFilterCSS(state.editorFilter);
        if (editorFilterCSS) f.push(editorFilterCSS);
        ctx.filter = f.join(' ') || 'none';

        // Transform
        ctx.translate(x + SLOT_W / 2, y + SLOT_H / 2);
        ctx.rotate((transform.rotate * Math.PI) / 180);
        ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);

        // Draw image covering slot
        const iw = image.naturalWidth, ih = image.naturalHeight;
        const scale = Math.max(SLOT_W / iw, SLOT_H / ih);
        const dw = iw * scale, dh = ih * scale;
        ctx.drawImage(image, -dw / 2, -dh / 2, dw, dh);

        ctx.restore();
      } else {
        // Empty slot placeholder
        ctx.fillStyle = '#f3f4f6';
        ctx.beginPath();
        ctx.roundRect(x, y, SLOT_W, SLOT_H, 8);
        ctx.fill();
        ctx.fillStyle = '#d1d5db';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Photo ${i + 1}`, x + SLOT_W / 2, y + SLOT_H / 2 + 5);
      }

      // Slot number label
      ctx.font = '700 11px Inter, sans-serif';
      ctx.fillStyle = state.frameColor === '#000000' ? '#ffffff' : '#6B7280';
      ctx.textAlign = 'left';
      ctx.fillText(String(i + 1).padStart(2, '0'), x, y - 4);
    }

    // Stickers
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    state.stickerOverlays.forEach(s => {
      const sx = (s.x / 100) * canvas.width;
      const sy = (s.y / 100) * canvas.height;
      ctx.fillText(s.emoji, sx, sy);
    });

    // Text overlays
    state.textOverlays.forEach(t => {
      const tx = (t.x / 100) * canvas.width;
      const ty = (t.y / 100) * canvas.height;
      ctx.font = `700 ${t.size || 22}px Syne, Inter, sans-serif`;
      ctx.fillStyle = t.color || '#7C3AED';
      ctx.textAlign = 'center';
      // shadow
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 4;
      ctx.fillText(t.text, tx, ty);
      ctx.shadowBlur = 0;
    });

    // Footer label
    ctx.font = '700 11px Syne, sans-serif';
    ctx.fillStyle = state.frameColor === '#ffffff' || state.frameColor === '#e2d9f3' ? '#9ca3af' : 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('SnapBooth', canvas.width / 2, canvas.height - 12);

    // Apply zoom
    canvas.style.transform = `scale(${state.zoomLevel})`;
    canvas.style.transformOrigin = 'top center';
  }

  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }

  // =====================================================
  // DOWNLOAD
  // =====================================================
  function downloadAs(fmt) {
    renderPreview().then(() => {
      const canvas = $('#preview-canvas');
      if (fmt === 'pdf') {
        // Simple PDF via print
        const w = window.open('', '_blank');
        w.document.write(`<html><body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;">
          <img src="${canvas.toDataURL('image/png')}" style="max-width:100%;max-height:100vh;" />
          </body></html>`);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); w.close(); }, 500);
      } else {
        const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
        const link = document.createElement('a');
        link.download = `snapbooth-${Date.now()}.${fmt}`;
        link.href = canvas.toDataURL(mime, 0.95);
        link.click();
        showToast(`Downloaded as ${fmt.toUpperCase()} ✅`, 'success');
      }
    });
  }

  function printStrip() {
    renderPreview().then(() => {
      const canvas = $('#preview-canvas');
      const dataUrl = canvas.toDataURL('image/png');
      const w = window.open('', '_blank');
      w.document.write(`<html><head><title>SnapBooth Print</title><style>
        body{margin:0;background:white;display:flex;align-items:center;justify-content:center;min-height:100vh;}
        img{max-width:100%;max-height:100vh;}
        @media print{body{display:block;}}
      </style></head><body>
        <img src="${dataUrl}" />
      </body></html>`);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); }, 600);
    });
  }

  // =====================================================
  // SAVE & GALLERY
  // =====================================================
  function saveProject() {
    const canvas = $('#preview-canvas');
    const dataUrl = canvas.toDataURL('image/png');
    const saved = JSON.parse(localStorage.getItem('snapbooth-gallery') || '[]');
    const entry = {
      id: Date.now(),
      dataUrl,
      template: state.selectedTemplate?.name || 'Custom',
      date: new Date().toLocaleDateString(),
    };
    saved.unshift(entry);
    localStorage.setItem('snapbooth-gallery', JSON.stringify(saved.slice(0, 50)));
    showToast('Saved to Gallery! 💾', 'success');
  }

  function renderGallery() {
    const saved = JSON.parse(localStorage.getItem('snapbooth-gallery') || '[]');
    const grid = $('#gallery-grid');
    const empty = $('#gallery-empty');
    const count = $('#gallery-count');
    const clearBtn = $('#clear-gallery-btn');

    count.textContent = `${saved.length} photo${saved.length !== 1 ? 's' : ''} saved`;
    clearBtn.classList.toggle('hidden', saved.length === 0);
    empty.classList.toggle('hidden', saved.length > 0);
    grid.innerHTML = '';

    saved.forEach(item => {
      const div = document.createElement('div');
      div.className = 'gallery-item aspect-square cursor-pointer';

      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.alt = item.template;
      img.loading = 'lazy';

      const actions = document.createElement('div');
      actions.className = 'gallery-actions';

      const dlBtn = document.createElement('button');
      dlBtn.className = 'g-btn';
      dlBtn.textContent = '⬇ Download';
      dlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.download = `snapbooth-${item.id}.png`;
        link.href = item.dataUrl;
        link.click();
        showToast('Downloaded!', 'success');
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'g-btn del-btn';
      delBtn.textContent = '🗑 Delete';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteGalleryItem(item.id);
      });

      actions.appendChild(dlBtn);
      actions.appendChild(delBtn);
      div.appendChild(img);
      div.appendChild(actions);
      grid.appendChild(div);
    });
  }

  function deleteGalleryItem(id) {
    let saved = JSON.parse(localStorage.getItem('snapbooth-gallery') || '[]');
    saved = saved.filter(s => s.id !== id);
    localStorage.setItem('snapbooth-gallery', JSON.stringify(saved));
    renderGallery();
    showToast('Photo deleted.', 'info');
  }

  $('#clear-gallery-btn')?.addEventListener('click', () => {
    if (confirm('Delete all saved photos?')) {
      localStorage.removeItem('snapbooth-gallery');
      renderGallery();
      showToast('Gallery cleared.', 'info');
    }
  });

  // =====================================================
  // EDITOR TAB SYSTEM
  // =====================================================
  function initEditorTabs() {
    $$('.editor-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.editor-tab-btn').forEach(b => b.classList.remove('active'));
        $$('.editor-tab-content').forEach(c => { c.classList.remove('active'); c.classList.add('hidden'); });
        btn.classList.add('active');
        const tab = $(`#editor-tab-${btn.dataset.tab}`);
        if (tab) { tab.classList.remove('hidden'); tab.classList.add('active'); }
      });
    });
  }

  // =====================================================
  // SLIDERS
  // =====================================================
  function initSliders() {
    const sliders = [
      { id: 'sl-brightness', stateKey: 'brightness', valId: 'brightness-val' },
      { id: 'sl-contrast', stateKey: 'contrast', valId: 'contrast-val' },
      { id: 'sl-saturation', stateKey: 'saturation', valId: 'saturation-val' },
      { id: 'sl-sharpness', stateKey: 'sharpness', valId: 'sharpness-val' },
      { id: 'sl-blur', stateKey: 'blur', valId: 'blur-val' },
    ];
    sliders.forEach(({ id, stateKey, valId }) => {
      const slider = $(`#${id}`);
      const val = $(`#${valId}`);
      if (!slider) return;
      slider.addEventListener('input', () => {
        state[stateKey] = parseInt(slider.value);
        if (val) val.textContent = slider.value;
        renderPreview();
      });
    });

    $('#frame-width-slider')?.addEventListener('input', (e) => {
      state.frameWidth = parseInt(e.target.value);
      renderPreview();
    });

    $('#reset-adjustments')?.addEventListener('click', () => {
      state.brightness = 100; state.contrast = 100;
      state.saturation = 100; state.sharpness = 0; state.blur = 0;
      $('#sl-brightness').value = 100;
      $('#sl-contrast').value = 100;
      $('#sl-saturation').value = 100;
      $('#sl-sharpness').value = 0;
      $('#sl-blur').value = 0;
      $$('#editor-tab-adjust .editor-slider').forEach(s => {
        const valEl = $(`#${s.id.replace('sl-', '')}-val`);
        if (valEl) valEl.textContent = s.value;
      });
      renderPreview();
      showToast('Adjustments reset', 'info');
    });
  }

  // =====================================================
  // TRANSFORM BUTTONS
  // =====================================================
  function initTransformBtns() {
    $$('.transform-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = state.currentShotIndex;
        if (!state.transforms[idx]) return;
        const t = state.transforms[idx];
        const action = btn.dataset.action;
        if (action === 'rotate-left') t.rotate = (t.rotate - 90 + 360) % 360;
        if (action === 'rotate-right') t.rotate = (t.rotate + 90) % 360;
        if (action === 'flip-h') t.flipH = !t.flipH;
        if (action === 'flip-v') t.flipV = !t.flipV;
        renderPreview();
      });
    });
  }

  // =====================================================
  // CAMERA CONTROLS
  // =====================================================
  function initCameraControls() {
    // Start camera button
    $('#start-camera-btn')?.addEventListener('click', async () => {
      const stream = await startCamera($('#main-video'));
      if (stream) {
        state.cameraStream = stream;
        $('#camera-off-placeholder').classList.add('hidden');
        applyMirror();
        updateCaptureBtn();
      }
    });

    // Mirror toggle
    $('#mirror-btn')?.addEventListener('click', () => {
      state.mirrorMode = !state.mirrorMode;
      const btn = $('#mirror-btn');
      btn.textContent = state.mirrorMode ? 'ON' : 'OFF';
      btn.classList.toggle('active', state.mirrorMode);
      applyMirror();
    });

    // Timer select
    $$('#timer-select .timer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#timer-select .timer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.timerSeconds = parseInt(btn.dataset.val);
      });
    });

    // Capture button
    $('#capture-btn')?.addEventListener('click', takePhoto);

    // Camera/Upload tabs
    $('#tab-camera')?.addEventListener('click', () => {
      state.captureMode = 'camera';
      $('#tab-camera').classList.add('active');
      $('#tab-upload').classList.remove('active');
      $('#camera-panel').classList.remove('hidden');
      $('#upload-panel').classList.add('hidden');
    });

    $('#tab-upload')?.addEventListener('click', () => {
      state.captureMode = 'upload';
      $('#tab-upload').classList.add('active');
      $('#tab-camera').classList.remove('active');
      $('#upload-panel').classList.remove('hidden');
      $('#camera-panel').classList.add('hidden');
      stopCamera();
    });

    // Filter bar for camera
    buildFilterBar('#filter-bar', (fid) => {
      state.activeFilter = fid;
      const video = $('#main-video');
      if (video) video.style.filter = getFilterCSS(fid);
    });

    // Back buttons
    $('#back-to-templates')?.addEventListener('click', () => {
      stopCamera();
      showBoothStep('template');
    });
    $('#back-to-capture')?.addEventListener('click', () => showBoothStep('capture'));

    // Proceed to editor
    $('#proceed-to-editor')?.addEventListener('click', () => {
      stopCamera();
      showBoothStep('editor');
      renderPreview();
    });

    // Retake all
    $('#retake-all-btn')?.addEventListener('click', () => {
      state.shots = new Array(state.selectedTemplate.slots).fill(null);
      state.transforms = Array.from({ length: state.selectedTemplate.slots }, () => ({ rotate: 0, flipH: false, flipV: false }));
      updateShotSlots();
      updateCaptureBtn();
    });
  }

  // =====================================================
  // FILE UPLOAD
  // =====================================================
  function initUpload() {
    const dropZone = $('#drop-zone');
    const fileInput = $('#file-input');

    const handleFiles = (files) => {
      const tpl = state.selectedTemplate;
      if (!tpl) return;
      const needed = state.shots.filter(s => s === null).length;
      const toProcess = Math.min(files.length, needed);

      Array.from(files).slice(0, toProcess).forEach((file, i) => {
        if (!file.type.match(/image\/(jpeg|png|webp)/)) {
          showToast(`${file.name} is not a supported format`, 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const idx = state.shots.findIndex(s => s === null);
          if (idx !== -1) {
            state.shots[idx] = e.target.result;
            updateShotSlots();
            updateCaptureBtn();
          }
        };
        reader.readAsDataURL(file);
      });
      showToast(`${toProcess} photo(s) uploaded!`, 'success');
    };

    dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      handleFiles(e.dataTransfer.files);
    });
    dropZone?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length) handleFiles(e.target.files);
      fileInput.value = '';
    });
  }

  // =====================================================
  // DOWNLOAD / PRINT / SAVE BUTTONS
  // =====================================================
  function initDownloadButtons() {
    $('#download-btn')?.addEventListener('click', () => {
      const opts = $('#download-options');
      opts.classList.toggle('hidden');
    });

    $$('.dl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $('#download-options').classList.add('hidden');
        downloadAs(btn.dataset.fmt);
      });
    });

    $('#print-btn')?.addEventListener('click', printStrip);
    $('#save-project-btn')?.addEventListener('click', () => {
      renderPreview().then(saveProject);
    });
  }

  // =====================================================
  // ZOOM
  // =====================================================
  function initZoom() {
    $('#zoom-in-btn')?.addEventListener('click', () => {
      state.zoomLevel = Math.min(2, state.zoomLevel + 0.15);
      renderPreview();
    });
    $('#zoom-out-btn')?.addEventListener('click', () => {
      state.zoomLevel = Math.max(0.4, state.zoomLevel - 0.15);
      renderPreview();
    });
  }

  // =====================================================
  // HERO CAMERA
  // =====================================================
  function initHeroCamera() {
    const btn = $('#hero-try-camera');
    btn?.addEventListener('click', async () => {
      const video = $('#hero-video');
      if (state.heroCameraStream) {
        state.heroCameraStream.getTracks().forEach(t => t.stop());
        state.heroCameraStream = null;
        video.classList.add('hidden');
        video.srcObject = null;
        $('#hero-camera-placeholder').classList.remove('hidden');
        btn.textContent = '📷 Try Camera';
        return;
      }
      const stream = await startCamera(video);
      if (stream) {
        state.heroCameraStream = stream;
        video.classList.remove('hidden');
        $('#hero-camera-placeholder').classList.add('hidden');
        btn.textContent = '⏹ Stop Camera';
      }
    });
  }

  // =====================================================
  // ADD TEXT BUTTON
  // =====================================================
  function initDecorControls() {
    $('#add-text-btn')?.addEventListener('click', addText);
  }

  // =====================================================
  // SLEEP UTIL
  // =====================================================
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // =====================================================
  // INIT
  // =====================================================
  function init() {
    // Show loading briefly
    showLoading();
    setTimeout(hideLoading, 1200);

    initTheme();
    renderHomeTemplates();
    renderBoothTemplates();
    initCameraControls();
    initUpload();
    initEditorTabs();
    initSliders();
    initTransformBtns();
    initDownloadButtons();
    initZoom();
    initHeroCamera();
    initDecorControls();
    renderEditorFilterBar();
    renderStickerPicker();
    renderFrameColorPicker();

    // Show first editor tab
    const firstTab = $('#editor-tab-adjust');
    if (firstTab) { firstTab.classList.remove('hidden'); firstTab.classList.add('active'); }

    navigateTo('home');
  }

  init();

})();