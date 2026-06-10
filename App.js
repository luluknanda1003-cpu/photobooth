/**
 * SnapBooth — app.js  (fixed navigation + full features)
 */
(function () {
  'use strict';

  /* ─── STATE ─────────────────────────────────────────── */
  const state = {
    darkMode: false,
    currentPage: 'home',
    selectedTemplate: null,
    captureMode: 'camera',
    cameraStream: null,
    heroCameraStream: null,
    mirrorMode: true,
    timerSeconds: 3,
    activeFilter: 'normal',
    shots: [],
    currentShotIndex: 0,
    isCountingDown: false,
    editorFilter: 'normal',
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 0,
    blur: 0,
    frameColor: '#ffffff',
    frameWidth: 20,
    textOverlays: [],
    stickerOverlays: [],
    zoomLevel: 1,
    transforms: [],
  };

  /* ─── DATA ───────────────────────────────────────────── */
  const TEMPLATES = [
    { id: 'classic2',    name: 'Classic 2',        slots: 2, bg: 'linear-gradient(135deg,#667eea,#764ba2)', textColor: '#fff' },
    { id: 'classic4',    name: 'Classic 4',         slots: 4, bg: 'linear-gradient(135deg,#f093fb,#f5576c)', textColor: '#fff' },
    { id: 'kpop',        name: 'K-Pop Style',       slots: 4, bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', textColor: '#fff' },
    { id: 'korean',      name: 'Korean Booth',      slots: 3, bg: 'linear-gradient(135deg,#43e97b,#38f9d7)', textColor: '#fff' },
    { id: 'vintage',     name: 'Vintage Film',      slots: 4, bg: 'linear-gradient(135deg,#d4a76a,#8b6914)', textColor: '#fff' },
    { id: 'minimalist',  name: 'Minimalist',        slots: 3, bg: 'linear-gradient(135deg,#f8f9fa,#dee2e6)', textColor: '#333' },
    { id: 'pastel',      name: 'Aesthetic Pastel',  slots: 4, bg: 'linear-gradient(135deg,#ffecd2,#fcb69f)', textColor: '#5c3317' },
    { id: 'birthday',    name: 'Birthday 🎂',        slots: 4, bg: 'linear-gradient(135deg,#f9c22e,#ff6b6b)', textColor: '#fff' },
    { id: 'graduation',  name: 'Graduation 🎓',      slots: 3, bg: 'linear-gradient(135deg,#232526,#414345)', textColor: '#ffd700' },
    { id: 'wedding',     name: 'Wedding 💍',          slots: 4, bg: 'linear-gradient(135deg,#fdfcfb,#e2d9f3)', textColor: '#4a3060' },
  ];

  const FILTERS = [
    { id: 'normal',  name: 'Normal',      css: '' },
    { id: 'bw',      name: 'B&W',         css: 'grayscale(100%)' },
    { id: 'vintage', name: 'Vintage',     css: 'sepia(40%) saturate(80%) brightness(90%)' },
    { id: 'warm',    name: 'Warm',        css: 'sepia(20%) saturate(120%) hue-rotate(-15deg) brightness(105%)' },
    { id: 'cool',    name: 'Cool',        css: 'saturate(80%) hue-rotate(20deg) brightness(105%)' },
    { id: 'sepia',   name: 'Sepia',       css: 'sepia(80%)' },
    { id: 'bright',  name: 'Bright',      css: 'brightness(130%) contrast(105%)' },
    { id: 'soft',    name: 'Soft Beauty', css: 'brightness(108%) contrast(90%) saturate(90%)' },
  ];

  const STICKERS = ['❤️','🌸','⭐','✨','🦋','🌈','🎉','🎀','🍓','🌙','☁️','🔥','💫','🎵','🌺','💎','🪐','🌻','🦄','🍒'];
  const FRAME_COLORS = ['#ffffff','#000000','#7C3AED','#ec4899','#f59e0b','#10b981','#3b82f6','#f97316','#d4a76a','#e2d9f3'];

  /* ─── UTILS ──────────────────────────────────────────── */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function showToast(msg, type = 'info') {
    const tc = $('#toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    tc.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
  }

  /* ─── DARK MODE ──────────────────────────────────────── */
  function initTheme() {
    const saved = localStorage.getItem('snapbooth-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      enableDark();
    }
  }
  function enableDark()  { document.documentElement.classList.add('dark');    $('#theme-toggle').textContent = '☀️'; state.darkMode = true;  localStorage.setItem('snapbooth-theme','dark'); }
  function disableDark() { document.documentElement.classList.remove('dark'); $('#theme-toggle').textContent = '🌙'; state.darkMode = false; localStorage.setItem('snapbooth-theme','light'); }
  $('#theme-toggle').addEventListener('click', () => state.darkMode ? disableDark() : enableDark());

  /* ─── NAVBAR ─────────────────────────────────────────── */
  window.addEventListener('scroll', () => $('#navbar').classList.toggle('scrolled', window.scrollY > 10));
  $('#mobile-menu-btn').addEventListener('click', () => $('#mobile-menu').classList.toggle('hidden'));

  /* ─── PAGE NAVIGATION ────────────────────────────────── */
  // Uses only inline style display so Tailwind "hidden" class never fights us
  function showPage(pageId) {
    ['home','templates','gallery','booth'].forEach(id => {
      const el = $(`#page-${id}`);
      if (el) el.style.display = (id === pageId) ? 'block' : 'none';
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    state.currentPage = pageId;

    // Highlight active nav link
    $$('.nav-link').forEach(l => {
      const active = l.dataset.page === pageId;
      l.classList.toggle('text-violet-600', active);
      if (l.classList.contains('btn-primary')) {
        // keep primary style even when active
        l.classList.add('btn-primary');
      }
    });

    if (pageId === 'gallery')   renderGallery();
    if (pageId === 'booth')     showBoothStep('template');
    if (pageId === 'templates') renderAllTemplates();
    $('#mobile-menu').classList.add('hidden');
  }

  // Single delegated click handler for ALL nav-link elements
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-page]');
    if (el && el.dataset.page) {
      e.preventDefault();
      showPage(el.dataset.page);
    }
  });

  /* ─── BOOTH STEPS ────────────────────────────────────── */
  function showBoothStep(step) {
    ['template','capture','editor'].forEach(s => {
      const el = $(`#booth-step-${s}`);
      if (el) el.style.display = (s === step) ? 'block' : 'none';
    });
    if (step === 'template') stopCamera();
  }

  /* ─── TEMPLATES RENDERING ────────────────────────────── */
  function createTemplateCard(tpl, clickCb) {
    const card = document.createElement('div');
    card.className = 'template-card glass-card overflow-hidden';
    card.dataset.id = tpl.id;

    // Strip preview
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
    label.textContent = tpl.name;

    const btn = document.createElement('button');
    btn.className = 'use-btn';
    btn.style.cssText = `color:${tpl.textColor};background:${tpl.bg};`;
    btn.textContent = 'Use Template';

    card.appendChild(preview);
    card.appendChild(label);
    card.appendChild(btn);
    card.addEventListener('click', () => clickCb(tpl));
    return card;
  }

  function renderHomeTemplates() {
    const grid = $('#home-templates-grid');
    if (!grid) return;
    grid.innerHTML = '';
    TEMPLATES.slice(0, 5).forEach(tpl => grid.appendChild(createTemplateCard(tpl, t => { selectTemplate(t); showPage('booth'); })));
  }

  function renderAllTemplates() {
    const grid = $('#all-templates-grid');
    if (!grid) return;
    grid.innerHTML = '';
    TEMPLATES.forEach(tpl => grid.appendChild(createTemplateCard(tpl, t => { selectTemplate(t); showPage('booth'); })));
  }

  function renderBoothTemplates() {
    const grid = $('#booth-templates-grid');
    if (!grid) return;
    grid.innerHTML = '';
    TEMPLATES.forEach(tpl => grid.appendChild(createTemplateCard(tpl, selectTemplate)));
  }

  function selectTemplate(tpl) {
    state.selectedTemplate = tpl;
    state.shots = new Array(tpl.slots).fill(null);
    state.transforms = Array.from({ length: tpl.slots }, () => ({ rotate: 0, flipH: false, flipV: false }));
    state.textOverlays = [];
    state.stickerOverlays = [];

    $$('.template-card').forEach(c => c.classList.toggle('selected', c.dataset.id === tpl.id));
    $('#capture-template-name').textContent = tpl.name;
    $('#capture-photos-needed').textContent = `Take ${tpl.slots} photo${tpl.slots > 1 ? 's' : ''}`;

    renderShotSlots();
    showBoothStep('capture');
    updateCaptureBtn();
  }

  /* ─── SHOT SLOTS ─────────────────────────────────────── */
  function renderShotSlots() {
    const container = $('#shot-slots');
    if (!container || !state.selectedTemplate) return;
    container.innerHTML = '';
    for (let i = 0; i < state.selectedTemplate.slots; i++) {
      const slot = document.createElement('div');
      slot.className = 'shot-slot';
      slot.dataset.index = i;

      const num = document.createElement('span');
      num.className = 'slot-num';
      num.textContent = `Photo ${i + 1}`;

      const retake = document.createElement('button');
      retake.className = 'retake-btn';
      retake.textContent = '↺';
      retake.title = 'Retake';
      retake.addEventListener('click', e => { e.stopPropagation(); retakeSlot(i); });

      slot.appendChild(num);
      slot.appendChild(retake);
      container.appendChild(slot);
    }
    updateShotSlots();
  }

  function updateShotSlots() {
    $$('#shot-slots .shot-slot').forEach((slot, i) => {
      const img = slot.querySelector('img');
      const num = slot.querySelector('.slot-num');
      if (state.shots[i]) {
        slot.classList.add('filled');
        if (!img) {
          const newImg = new Image();
          newImg.src = state.shots[i];
          newImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:10px;';
          slot.insertBefore(newImg, num);
        } else {
          img.src = state.shots[i];
        }
        if (num) num.style.display = 'none';
      } else {
        slot.classList.remove('filled');
        if (img) img.remove();
        if (num) num.style.display = '';
      }
    });
    const allFilled = state.shots.length > 0 && state.shots.every(s => s !== null);
    const anyFilled = state.shots.some(s => s);
    setVisible('#proceed-to-editor', allFilled);
    setVisible('#retake-all-btn', anyFilled);
  }

  function retakeSlot(i) {
    state.shots[i] = null;
    state.transforms[i] = { rotate: 0, flipH: false, flipV: false };
    state.currentShotIndex = i;
    updateShotSlots();
    updateCaptureBtn();
  }

  /* ─── CAMERA ─────────────────────────────────────────── */
  async function startCamera(videoEl) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      videoEl.srcObject = stream;
      return stream;
    } catch {
      showToast('Camera access denied. Allow camera permissions.', 'error');
      return null;
    }
  }

  function stopCamera() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(t => t.stop());
      state.cameraStream = null;
    }
    const v = $('#main-video');
    if (v) v.srcObject = null;
    setVisible('#camera-off-placeholder', true);
    setVisible('#capture-btn', false);
  }

  function applyMirror() {
    const v = $('#main-video');
    if (v) v.style.transform = state.mirrorMode ? 'scaleX(-1)' : '';
  }

  function updateCaptureBtn() {
    const btn = $('#capture-btn');
    if (!btn) return;
    const hasCam = !!state.cameraStream;
    setVisible('#capture-btn', hasCam);
    if (!hasCam) return;
    const remaining = state.shots.filter(s => s === null).length;
    const allDone = remaining === 0;
    btn.disabled = allDone;
    btn.innerHTML = allDone
      ? '✅ All photos taken!'
      : `📸 Take Photo (<span id="shots-remaining">${remaining}</span> left)`;
    state.currentShotIndex = state.shots.findIndex(s => s === null);
  }

  async function takePhoto() {
    if (state.isCountingDown || !state.cameraStream) return;
    const video = $('#main-video');
    const overlay = $('#countdown-overlay');
    const numEl = $('#countdown-number');

    state.isCountingDown = true;
    overlay.style.display = 'flex';

    for (let i = state.timerSeconds; i >= 1; i--) {
      numEl.textContent = i;
      numEl.style.animation = 'none';
      void numEl.offsetWidth;
      numEl.style.animation = '';
      await sleep(1000);
    }
    numEl.textContent = '📸';
    await sleep(250);
    overlay.style.display = 'none';
    state.isCountingDown = false;

    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (state.mirrorMode) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.filter = getFilterCSS(state.activeFilter);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const idx = state.shots.findIndex(s => s === null);
    if (idx !== -1) {
      state.shots[idx] = canvas.toDataURL('image/png');
      updateShotSlots();
      updateCaptureBtn();
      // flash
      const cont = $('#camera-container');
      if (cont) { cont.style.outline = '4px solid white'; setTimeout(() => cont.style.outline = '', 200); }
      if (state.shots.every(s => s)) showToast('All photos taken! 🎉 Proceed to edit.', 'success');
    }
  }

  /* ─── FILTERS ────────────────────────────────────────── */
  function getFilterCSS(id) { return FILTERS.find(f => f.id === id)?.css || ''; }

  function buildFilterBar(containerId, onSelect, activeId = 'normal') {
    const bar = $(containerId);
    if (!bar) return;
    bar.innerHTML = '';
    FILTERS.forEach(f => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip' + (f.id === activeId ? ' active' : '');
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

  /* ─── EDITOR ─────────────────────────────────────────── */
  function initEditorTabs() {
    $$('.editor-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.editor-tab-btn').forEach(b => b.classList.remove('active'));
        $$('.editor-tab-content').forEach(c => c.style.display = 'none');
        btn.classList.add('active');
        const tab = $(`#editor-tab-${btn.dataset.tab}`);
        if (tab) tab.style.display = 'block';
      });
    });
  }

  function initSliders() {
    [
      { id:'sl-brightness', key:'brightness', valId:'brightness-val' },
      { id:'sl-contrast',   key:'contrast',   valId:'contrast-val'   },
      { id:'sl-saturation', key:'saturation', valId:'saturation-val' },
      { id:'sl-sharpness',  key:'sharpness',  valId:'sharpness-val'  },
      { id:'sl-blur',       key:'blur',        valId:'blur-val'       },
    ].forEach(({ id, key, valId }) => {
      const sl = $(`#${id}`);
      if (!sl) return;
      sl.addEventListener('input', () => {
        state[key] = parseInt(sl.value);
        const ve = $(`#${valId}`); if (ve) ve.textContent = sl.value;
        renderPreview();
      });
    });

    $('#frame-width-slider')?.addEventListener('input', e => {
      state.frameWidth = parseInt(e.target.value);
      renderPreview();
    });

    $('#reset-adjustments')?.addEventListener('click', () => {
      state.brightness = 100; state.contrast = 100; state.saturation = 100;
      state.sharpness = 0; state.blur = 0;
      [['sl-brightness','brightness-val',100],['sl-contrast','contrast-val',100],
       ['sl-saturation','saturation-val',100],['sl-sharpness','sharpness-val',0],
       ['sl-blur','blur-val',0]].forEach(([sid,vid,def]) => {
        const s = $(`#${sid}`); if (s) s.value = def;
        const v = $(`#${vid}`); if (v) v.textContent = def;
      });
      renderPreview();
      showToast('Adjustments reset', 'info');
    });
  }

  function initTransformBtns() {
    $$('.transform-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = state.currentShotIndex >= 0 ? state.currentShotIndex : 0;
        const t = state.transforms[idx];
        if (!t) return;
        const a = btn.dataset.action;
        if (a === 'rotate-left')  t.rotate = (t.rotate - 90 + 360) % 360;
        if (a === 'rotate-right') t.rotate = (t.rotate + 90) % 360;
        if (a === 'flip-h') t.flipH = !t.flipH;
        if (a === 'flip-v') t.flipV = !t.flipV;
        renderPreview();
      });
    });
  }

  function renderStickerPicker() {
    const picker = $('#sticker-picker');
    if (!picker) return;
    picker.innerHTML = '';
    STICKERS.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'sticker-btn';
      btn.textContent = s;
      btn.addEventListener('click', () => {
        state.stickerOverlays.push({ emoji: s, x: 50 + Math.random()*20-10, y: 40 + Math.random()*20-10 });
        renderPreview();
        showToast(`${s} added!`, 'success');
      });
      picker.appendChild(btn);
    });
  }

  function renderFrameColorPicker() {
    const picker = $('#frame-color-picker');
    if (!picker) return;
    picker.innerHTML = '';
    FRAME_COLORS.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'frame-color-btn' + (c === state.frameColor ? ' selected' : '');
      btn.style.cssText = `background:${c};border:2px solid ${c === '#ffffff' ? '#ddd' : 'transparent'};`;
      btn.addEventListener('click', () => {
        $$('.frame-color-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        state.frameColor = c;
        renderPreview();
      });
      picker.appendChild(btn);
    });
  }

  /* ─── PREVIEW CANVAS ─────────────────────────────────── */
  async function renderPreview() {
    const canvas = $('#preview-canvas');
    const tpl = state.selectedTemplate;
    if (!canvas || !tpl) return;

    const SLOT_W = 320, SLOT_H = 240;
    const PAD = state.frameWidth;
    const GAP = Math.max(4, Math.floor(PAD / 3));
    const slots = tpl.slots;

    canvas.width  = SLOT_W + PAD * 2;
    canvas.height = SLOT_H * slots + GAP * (slots - 1) + PAD * 2 + 30;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Frame
    ctx.fillStyle = state.frameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Accent stripe
    const cols = (tpl.bg.match(/#[0-9a-fA-F]{3,6}/g) || ['#7C3AED','#A855F7']);
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, cols[0]); grad.addColorStop(1, cols[1] || cols[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 5, canvas.height);

    for (let i = 0; i < slots; i++) {
      const x = PAD, y = PAD + i * (SLOT_H + GAP);
      const src = state.shots[i];
      const tr  = state.transforms[i] || { rotate: 0, flipH: false, flipV: false };

      if (src) {
        const img = await loadImage(src);
        ctx.save();

        // clip
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, SLOT_W, SLOT_H, 8);
        else ctx.rect(x, y, SLOT_W, SLOT_H);
        ctx.clip();

        // css filters
        const ff = [];
        if (state.brightness !== 100) ff.push(`brightness(${state.brightness}%)`);
        if (state.contrast   !== 100) ff.push(`contrast(${state.contrast}%)`);
        if (state.saturation !== 100) ff.push(`saturate(${state.saturation}%)`);
        if (state.blur > 0)           ff.push(`blur(${state.blur * 0.5}px)`);
        const ef = getFilterCSS(state.editorFilter);
        if (ef) ff.push(ef);
        ctx.filter = ff.join(' ') || 'none';

        // transform
        ctx.translate(x + SLOT_W / 2, y + SLOT_H / 2);
        ctx.rotate((tr.rotate * Math.PI) / 180);
        ctx.scale(tr.flipH ? -1 : 1, tr.flipV ? -1 : 1);

        const sc = Math.max(SLOT_W / img.naturalWidth, SLOT_H / img.naturalHeight);
        ctx.drawImage(img, -img.naturalWidth*sc/2, -img.naturalHeight*sc/2, img.naturalWidth*sc, img.naturalHeight*sc);
        ctx.restore();
      } else {
        ctx.fillStyle = '#e5e7eb';
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, SLOT_W, SLOT_H, 8); ctx.fill(); }
        else ctx.fillRect(x, y, SLOT_W, SLOT_H);
        ctx.fillStyle = '#9ca3af'; ctx.font = '13px Inter,sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`Photo ${i + 1}`, x + SLOT_W / 2, y + SLOT_H / 2 + 5);
      }

      // slot number
      ctx.filter = 'none';
      const lightFrame = ['#ffffff','#e2d9f3','#ffecd2','#f8f9fa','#fdfcfb'].includes(state.frameColor);
      ctx.font = '700 10px Inter,sans-serif'; ctx.fillStyle = lightFrame ? '#6b7280' : 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'left';
      ctx.fillText(String(i + 1).padStart(2,'0'), x, y - 3);
    }

    // Stickers
    state.stickerOverlays.forEach(s => {
      ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.filter = 'none';
      ctx.fillText(s.emoji, (s.x/100)*canvas.width, (s.y/100)*canvas.height);
    });

    // Text
    state.textOverlays.forEach(t => {
      ctx.filter = 'none'; ctx.font = `700 22px Syne,Inter,sans-serif`;
      ctx.fillStyle = t.color || '#7C3AED'; ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 5;
      ctx.fillText(t.text, (t.x/100)*canvas.width, (t.y/100)*canvas.height);
      ctx.shadowBlur = 0;
    });

    // Footer branding
    ctx.filter = 'none'; ctx.font = '700 10px Syne,sans-serif'; ctx.textAlign = 'center';
    const lightFrame2 = ['#ffffff','#e2d9f3','#ffecd2','#f8f9fa','#fdfcfb'].includes(state.frameColor);
    ctx.fillStyle = lightFrame2 ? '#9ca3af' : 'rgba(255,255,255,0.4)';
    ctx.fillText('SnapBooth', canvas.width / 2, canvas.height - 8);

    canvas.style.transform = `scale(${state.zoomLevel})`;
  }

  function loadImage(src) {
    return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  }

  /* ─── DOWNLOAD / PRINT / SAVE ────────────────────────── */
  async function downloadAs(fmt) {
    await renderPreview();
    const canvas = $('#preview-canvas');
    if (fmt === 'pdf') {
      const w = window.open('','_blank');
      w.document.write(`<html><body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${canvas.toDataURL('image/png')}" style="max-width:100%;max-height:100vh;"/></body></html>`);
      w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 600);
    } else {
      const link = document.createElement('a');
      link.download = `snapbooth-${Date.now()}.${fmt}`;
      link.href = canvas.toDataURL(fmt === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
      link.click();
      showToast(`Downloaded as ${fmt.toUpperCase()} ✅`, 'success');
    }
  }

  async function printStrip() {
    await renderPreview();
    const dataUrl = $('#preview-canvas').toDataURL('image/png');
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>SnapBooth Print</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff;}img{max-width:100%;max-height:100vh;}@media print{body{display:block;}}</style></head><body><img src="${dataUrl}"/></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 600);
  }

  async function saveProject() {
    await renderPreview();
    const dataUrl = $('#preview-canvas').toDataURL('image/png');
    const saved = JSON.parse(localStorage.getItem('snapbooth-gallery') || '[]');
    saved.unshift({ id: Date.now(), dataUrl, template: state.selectedTemplate?.name || 'Custom', date: new Date().toLocaleDateString() });
    localStorage.setItem('snapbooth-gallery', JSON.stringify(saved.slice(0, 50)));
    showToast('Saved to Gallery! 💾', 'success');
  }

  /* ─── GALLERY ────────────────────────────────────────── */
  function renderGallery() {
    const saved = JSON.parse(localStorage.getItem('snapbooth-gallery') || '[]');
    const grid  = $('#gallery-grid');
    const empty = $('#gallery-empty');
    const count = $('#gallery-count');
    const clearBtn = $('#clear-gallery-btn');
    if (!grid) return;

    count.textContent = `${saved.length} photo${saved.length !== 1 ? 's' : ''} saved`;
    clearBtn.style.display = saved.length ? 'inline-flex' : 'none';
    empty.style.display = saved.length ? 'none' : 'block';
    grid.innerHTML = '';

    saved.forEach(item => {
      const div = document.createElement('div');
      div.className = 'gallery-item';
      div.style.cssText = 'aspect-ratio:1/1.5;cursor:pointer;';

      const img = document.createElement('img');
      img.src = item.dataUrl; img.alt = item.template; img.loading = 'lazy';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';

      const actions = document.createElement('div');
      actions.className = 'gallery-actions';

      const dlBtn = document.createElement('button'); dlBtn.className = 'g-btn'; dlBtn.textContent = '⬇ Download';
      dlBtn.addEventListener('click', e => { e.stopPropagation(); const a = document.createElement('a'); a.download = `snapbooth-${item.id}.png`; a.href = item.dataUrl; a.click(); showToast('Downloaded!','success'); });

      const delBtn = document.createElement('button'); delBtn.className = 'g-btn del-btn'; delBtn.textContent = '🗑 Delete';
      delBtn.addEventListener('click', e => { e.stopPropagation(); deleteGalleryItem(item.id); });

      actions.appendChild(dlBtn); actions.appendChild(delBtn);
      div.appendChild(img); div.appendChild(actions);
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
    if (confirm('Delete all saved photos?')) { localStorage.removeItem('snapbooth-gallery'); renderGallery(); showToast('Gallery cleared.','info'); }
  });

  /* ─── HERO CAMERA ────────────────────────────────────── */
  function initHeroCamera() {
    const btn = $('#hero-try-camera');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const video = $('#hero-video');
      if (state.heroCameraStream) {
        state.heroCameraStream.getTracks().forEach(t => t.stop());
        state.heroCameraStream = null;
        video.style.display = 'none'; video.srcObject = null;
        $('#hero-camera-placeholder').style.display = 'flex';
        btn.textContent = '📷 Try Camera'; return;
      }
      const stream = await startCamera(video);
      if (stream) {
        state.heroCameraStream = stream;
        video.style.display = 'block';
        $('#hero-camera-placeholder').style.display = 'none';
        btn.textContent = '⏹ Stop Camera';
      }
    });
  }

  /* ─── UPLOAD ─────────────────────────────────────────── */
  function initUpload() {
    const dz = $('#drop-zone'), fi = $('#file-input');
    const handle = files => {
      const needed = state.shots.filter(s => s === null).length;
      let used = 0;
      Array.from(files).forEach(file => {
        if (used >= needed) return;
        if (!file.type.match(/image\/(jpeg|png|webp)/)) { showToast(`${file.name}: unsupported format`,'error'); return; }
        const reader = new FileReader();
        reader.onload = e => {
          const idx = state.shots.findIndex(s => s === null);
          if (idx !== -1) { state.shots[idx] = e.target.result; updateShotSlots(); updateCaptureBtn(); }
        };
        reader.readAsDataURL(file); used++;
      });
      if (used) showToast(`${used} photo(s) uploaded!`, 'success');
    };
    dz?.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz?.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
    dz?.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag-over'); handle(e.dataTransfer.files); });
    dz?.addEventListener('click', () => fi?.click());
    fi?.addEventListener('change', e => { if (e.target.files.length) handle(e.target.files); fi.value = ''; });
  }

  /* ─── CAMERA CONTROLS INIT ───────────────────────────── */
  function initCameraControls() {
    $('#start-camera-btn')?.addEventListener('click', async () => {
      const stream = await startCamera($('#main-video'));
      if (stream) {
        state.cameraStream = stream;
        setVisible('#camera-off-placeholder', false);
        applyMirror();
        updateCaptureBtn();
      }
    });

    $('#mirror-btn')?.addEventListener('click', () => {
      state.mirrorMode = !state.mirrorMode;
      const b = $('#mirror-btn');
      b.textContent = state.mirrorMode ? 'ON' : 'OFF';
      b.classList.toggle('active', state.mirrorMode);
      applyMirror();
    });

    $$('#timer-select .timer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('#timer-select .timer-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.timerSeconds = parseInt(btn.dataset.val);
      });
    });

    $('#capture-btn')?.addEventListener('click', takePhoto);

    $('#tab-camera')?.addEventListener('click', () => {
      state.captureMode = 'camera';
      $('#tab-camera').classList.add('active'); $('#tab-upload').classList.remove('active');
      setVisible('#camera-panel', true); setVisible('#upload-panel', false);
    });
    $('#tab-upload')?.addEventListener('click', () => {
      state.captureMode = 'upload';
      $('#tab-upload').classList.add('active'); $('#tab-camera').classList.remove('active');
      setVisible('#upload-panel', true); setVisible('#camera-panel', false);
      stopCamera();
    });

    buildFilterBar('#filter-bar', fid => {
      state.activeFilter = fid;
      const v = $('#main-video'); if (v) v.style.filter = getFilterCSS(fid);
    });

    $('#back-to-templates')?.addEventListener('click', () => { stopCamera(); showBoothStep('template'); });
    $('#back-to-capture')?.addEventListener('click', () => showBoothStep('capture'));

    $('#proceed-to-editor')?.addEventListener('click', () => {
      stopCamera(); showBoothStep('editor');
      // reset adjustments display
      state.brightness=100; state.contrast=100; state.saturation=100; state.sharpness=0; state.blur=0;
      ['sl-brightness','sl-contrast','sl-saturation','sl-sharpness','sl-blur'].forEach(id => { const s=$(`#${id}`); if(s) s.value = id.includes('sharpness')||id.includes('blur') ? 0 : 100; });
      ['brightness-val','contrast-val','saturation-val','sharpness-val','blur-val'].forEach(id => { const e=$(`#${id}`); if(e) e.textContent = id.includes('sharpness')||id.includes('blur') ? 0 : 100; });
      renderPreview();
    });

    $('#retake-all-btn')?.addEventListener('click', () => {
      state.shots = new Array(state.selectedTemplate.slots).fill(null);
      state.transforms = Array.from({length: state.selectedTemplate.slots}, () => ({rotate:0,flipH:false,flipV:false}));
      updateShotSlots(); updateCaptureBtn();
    });

    $('#add-text-btn')?.addEventListener('click', () => {
      const txt = $('#text-input')?.value.trim();
      if (!txt) { showToast('Type something first!','error'); return; }
      const col = $('#text-color')?.value || '#7C3AED';
      state.textOverlays.push({ text: txt, color: col, x: 50, y: 45 });
      $('#text-input').value = '';
      renderPreview(); showToast('Text added!', 'success');
    });

    $('#download-btn')?.addEventListener('click', () => {
      const opts = $('#download-options');
      opts.style.display = opts.style.display === 'flex' ? 'none' : 'flex';
    });
    $$('.dl-btn').forEach(btn => btn.addEventListener('click', () => {
      $('#download-options').style.display = 'none';
      downloadAs(btn.dataset.fmt);
    }));
    $('#print-btn')?.addEventListener('click', printStrip);
    $('#save-project-btn')?.addEventListener('click', saveProject);

    $('#zoom-in-btn')?.addEventListener('click',  () => { state.zoomLevel = Math.min(2,   state.zoomLevel + 0.15); renderPreview(); });
    $('#zoom-out-btn')?.addEventListener('click', () => { state.zoomLevel = Math.max(0.4, state.zoomLevel - 0.15); renderPreview(); });
  }

  /* ─── HELPER: show/hide without Tailwind conflict ────── */
  function setVisible(selector, visible) {
    const el = $(selector);
    if (!el) return;
    el.style.display = visible ? '' : 'none';
  }

  /* ─── INIT ───────────────────────────────────────────── */
  function init() {
    // Brief loading splash
    const overlay = $('#loading-overlay');
    overlay.style.display = 'flex';
    setTimeout(() => overlay.style.display = 'none', 1000);

    initTheme();

    // ── Set all pages/steps to hidden via inline style (bypasses Tailwind) ──
    ['home','templates','gallery','booth'].forEach(id => {
      const el = $(`#page-${id}`);
      if (el) { el.classList.remove('hidden'); el.style.display = 'none'; }
    });
    ['template','capture','editor'].forEach(s => {
      const el = $(`#booth-step-${s}`);
      if (el) { el.classList.remove('hidden'); el.style.display = 'none'; }
    });

    // ── Sidebar initial state ──
    setVisible('#camera-off-placeholder', true);
    setVisible('#capture-btn', false);
    setVisible('#proceed-to-editor', false);
    setVisible('#retake-all-btn', false);
    setVisible('#download-options', false);
    setVisible('#clear-gallery-btn', false);
    setVisible('#gallery-empty', true);

    // ── Editor tabs init ──
    $$('.editor-tab-content').forEach(c => c.style.display = 'none');
    const firstTab = $('#editor-tab-adjust');
    if (firstTab) { firstTab.style.display = 'block'; }
    $$('.editor-tab-btn').forEach((b, i) => b.classList.toggle('active', i === 0));

    // Camera panel visible, upload hidden
    setVisible('#camera-panel', true);
    setVisible('#upload-panel', false);

    // Countdown overlay hidden
    const co = $('#countdown-overlay');
    if (co) co.style.display = 'none';

    renderHomeTemplates();
    renderBoothTemplates();
    initCameraControls();
    initUpload();
    initEditorTabs();
    initSliders();
    initTransformBtns();
    renderStickerPicker();
    renderFrameColorPicker();
    initHeroCamera();
    buildFilterBar('#editor-filter-bar', fid => { state.editorFilter = fid; renderPreview(); });

    // Start on home
    showPage('home');
  }

  init();
})();