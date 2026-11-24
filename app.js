(() => {
  'use strict';
  const requestedView = new URLSearchParams(location.search).get('view');
  const selection = Object.hasOwn(window.PORTFOLIO_SELECTIONS || {}, requestedView) ? window.PORTFOLIO_SELECTIONS[requestedView] : null;
  const data = selection ? { ...window.PORTFOLIO, projects: selection.projects, categories: selection.categories, sourcePages: null, interactiveOriginal: false } : window.PORTFOLIO;
  const projects = data.projects;
  const $ = id => document.getElementById(id);
  const cover = $('cover'), viewer = $('viewer'), stage = $('artStage');
  const controls = $('controls'), catalog = $('catalogDialog'), lightbox = $('lightbox');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 960px)');
  let index = -1, revealed = -1, sequenceTimer, autoTimer, autoplay = false, zoomIndex = 0, zoomProjectIndex = 0;
  const pad = n => String(n).padStart(2, '0');
  const current = () => projects[index];
  if (selection) {
    document.body.classList.add('selection-view');
    document.querySelector('.cover h1').replaceChildren(document.createTextNode(selection.title), document.createElement('br'), Object.assign(document.createElement('span'),{textContent:'作品精选'}));
    document.querySelector('.cover-categories').textContent=selection.subtitle;
    document.querySelector('.cover-action p').textContent=selection.description;
    document.querySelector('.cover-bottom span').textContent=`SELECTED WORKS / ${selection.label}`;
    document.querySelector('.cover-visual').style.backgroundImage=`url('${selection.hero}')`;
    $('completePortfolio').hidden=false;
    $('totalNumber').textContent=pad(projects.length);
  }
  const entries = () => current().pieces || current().images;
  const maxStep = () => 2 + entries().length;
  function clearTimers() { clearTimeout(sequenceTimer); clearTimeout(autoTimer); }
  function announce(message) { $('announcement').textContent = message; }
  function updateAutoButton() {
    $('autoButton').setAttribute('aria-pressed', String(autoplay));
    $('autoButton').setAttribute('aria-label',autoplay?'暂停播放':'自动播放');
    $('autoLabel').textContent = autoplay ? '暂停播放' : '自动播放';
  }
  function stopAuto() { autoplay = false; clearTimeout(autoTimer); updateAutoButton(); }
  function updateProgress() {
    const count = Math.max(0, revealed - 2), total = entries().length;
    [...$('revealProgress').children].forEach((dot, i) => dot.classList.toggle('complete', i < count));
    $('stepStatus').textContent = `${count} / ${total}`;
    $('revealProgress').setAttribute('aria-label', `已呈现 ${count} 件，共 ${total} 件作品`);
    $('nextButton').textContent = revealed < maxStep() ? '继续呈现' : index === projects.length - 1 ? '回到封面' : '下一页';
    $('prevButton').disabled = index === 0;
  }
  function scheduleAuto() {
    clearTimeout(autoTimer);
    if (!autoplay || revealed < maxStep() || document.hidden || document.querySelector('dialog[open]')) return;
    autoTimer = setTimeout(() => {
      if (index === projects.length - 1) { stopAuto(); announce('已浏览全部作品。'); return; }
      showProject(index + 1, { replace: true });
    }, 5500);
  }
  function revealTo(step, scroll = false) {
    revealed = Math.min(step, maxStep());
    viewer.querySelectorAll('.reveal-part').forEach(el => {
      const shown = Number(el.dataset.step) <= revealed;
      el.classList.toggle('is-visible', shown);
      if (el.matches('.artwork')) el.inert = !shown;
    });
    updateProgress();
    window.OriginalScene?.complete(revealed===maxStep());
    if (scroll && mobile.matches && revealed >= 3 && !data.interactiveOriginal) {
      const target = stage.children[revealed - 3];
      if (target) stage.scrollTo({ left: target.offsetLeft - (stage.clientWidth - target.clientWidth) / 2, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    if (revealed === maxStep()) scheduleAuto();
  }
  function runSequence() {
    clearTimers();
    const stopAt = mobile.matches && !autoplay ? Math.min(maxStep(), 3) : maxStep();
    if (reducedMotion.matches) { revealTo(maxStep()); return; }
    function tick() {
      revealTo(revealed + 1, mobile.matches && autoplay);
      if (revealed < stopAt) sequenceTimer = setTimeout(tick, revealed < 2 ? 180 : mobile.matches && autoplay ? 1100 : 600);
    }
    sequenceTimer = setTimeout(tick, 70);
  }
  function makeArtwork(image, i) {
    if(data.interactiveOriginal)return window.OriginalScene.create(current(),()=>openLightbox(0));
    const figure = document.createElement('figure');
    figure.className = 'artwork reveal-part'; figure.dataset.step = String(i + 3); figure.inert = true;
    const button = document.createElement('button'); button.className = 'art-open'; button.setAttribute('aria-label', `放大查看：${image.label}`);
    const img = document.createElement('img'); img.src = image.src; img.alt = `${current().name} · ${image.label}`;
    img.width = image.width; img.height = image.height; img.decoding = 'async';
    const hint = document.createElement('span'); hint.className = 'zoom-hint'; hint.textContent = '放大查看'; hint.setAttribute('aria-hidden', 'true');
    const caption = document.createElement('figcaption'); caption.textContent = image.label;
    button.append(img, hint); button.addEventListener('click', () => openLightbox(i)); figure.append(button, caption);
    return figure;
  }
  function writeHash(id, replace = false) {
    if (location.hash === `#${id}`) return;
    history[replace ? 'replaceState' : 'pushState'](null, '', `#${id}`);
  }
  function showProject(nextIndex, options = {}) {
    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= projects.length) return;
    clearTimers(); index = nextIndex; revealed = -1;
    cover.hidden = true; viewer.hidden = false; controls.hidden = false; document.body.classList.add('viewing');
    const project = current();
    window.OriginalScene?.setTheme(project);
    window.OriginalScene?.clear();
    $('category').textContent = project.category;
    $('projectTitle').textContent = project.name;
    if (project.id === 'hifinance') $('projectTitle').replaceChildren(document.createTextNode('HiFinance'), document.createElement('br'), document.createTextNode('会员活动'));
    $('projectSubtitle').textContent = project.subtitle;
    $('projectDescription').textContent = project.description;
    $('projectNote').textContent = project.note || '';
    $('projectNote').hidden = !project.note;
    $('currentNumber').textContent = pad(index + 1); $('totalNumber').textContent = pad(projects.length);
    stage.className = `art-stage layout-${project.layout}`;
    stage.replaceChildren(...project.images.map(makeArtwork)); stage.scrollLeft = 0;
    window.OriginalScene?.resize();
    $('revealProgress').replaceChildren(...entries().map(() => document.createElement('span')));
    viewer.querySelectorAll('.reveal-part').forEach(el => el.classList.remove('is-visible'));
    document.querySelectorAll('.catalog-item').forEach((item, i) => { item.classList.toggle('active', i === index); item.setAttribute('aria-current', i === index ? 'true' : 'false'); });
    document.title = `${project.name} · 闫天御作品集`;
    if (options.hash !== false) writeHash(project.id, options.replace);
    if (options.focus) $('projectTitle').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
    updateProgress(); runSequence(); announce(`${index + 1} / ${projects.length}，${project.name}，${project.subtitle}`);
    const next = projects[index + 1];
    if (next) { const preload = new Image(); preload.src = next.images[0].src; }
  }
  function showHome(options = {}) {
    clearTimers(); stopAuto(); index = -1;
    window.OriginalScene?.setTheme();
    window.OriginalScene?.clear();
    cover.hidden = false; viewer.hidden = true; controls.hidden = true; document.body.classList.remove('viewing');
    document.title = selection ? `${selection.label} · 闫天御作品精选` : '闫天御 · 视觉作品集';
    if (options.hash !== false) writeHash('home', options.replace);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function advance() {
    if (index < 0) { showProject(0, { focus: true }); return; }
    clearTimers();
    if (revealed < maxStep()) {
      const next = Math.max(3, revealed + 1); revealTo(next, true);
      announce(entries()[next - 3].label);
    } else if (index === projects.length - 1) { showHome(); $('startButton').focus(); }
    else showProject(index + 1, { focus: true });
  }
  function replay() {
    clearTimers(); revealed = -1;
    window.OriginalScene?.complete(false);
    viewer.querySelectorAll('.reveal-part').forEach(el => { el.classList.remove('is-visible'); if (el.matches('.artwork')) el.inert = true; });
    stage.scrollTo({ left: 0, behavior: 'instant' }); updateProgress(); runSequence();
  }
  function makeCatalog() {
    data.categories.forEach(category => {
      const section = document.createElement('section'); section.className = 'catalog-section';
      const title = document.createElement('h3'); title.textContent = category;
      const grid = document.createElement('div'); grid.className = 'catalog-grid';
      projects.forEach((project, i) => {
        if (project.category !== category) return;
        const button = document.createElement('button'); button.className = 'catalog-item'; button.dataset.index = String(i);
        const thumb = document.createElement('span'); thumb.className = 'catalog-thumbnail';
        const img = document.createElement('img'); img.src = project.images[0].thumbnail || project.images[0].src; img.alt = ''; img.loading = 'lazy'; img.width = project.images[0].width; img.height = project.images[0].height; thumb.append(img);
        const name = document.createElement('span'); name.className = 'catalog-name'; name.textContent = project.name;
        const subtitle = document.createElement('span'); subtitle.className = 'catalog-subtitle'; subtitle.textContent = project.subtitle;
        button.append(thumb, name, subtitle);
        button.addEventListener('click', () => { catalog.close(); showProject(i, { focus: true }); });
        grid.append(button);
      });
      section.append(title, grid); $('catalogContent').append(section);
    });
  }
  function showModal(dialog) { clearTimeout(autoTimer); dialog.showModal(); }
  function resetZoom() { $('lightboxCanvas').classList.remove('is-actual'); $('zoomButton').setAttribute('aria-pressed', 'false'); $('zoomButton').textContent = '查看原尺寸'; }
  function setLightboxImage(i) {
    const original = !!data.sourcePages;
    const total = original ? projects.length : current().images.length;
    zoomIndex = (i + total) % total;
    zoomProjectIndex = original ? zoomIndex : index;
    const project = projects[zoomProjectIndex];
    const image = project.images[original ? 0 : zoomIndex]; resetZoom();
    $('lightboxImage').src = image.full || image.src; $('lightboxImage').alt = `${project.name} · ${image.label}`;
    $('lightboxTitle').textContent = image.label; $('lightboxCount').textContent = `${zoomIndex + 1} / ${total}`;
    $('lightboxCanvas').scrollTo(0, 0);
  }
  function openLightbox(i) { setLightboxImage(data.sourcePages ? index : i); showModal(lightbox); }
  function route() {
    const target = location.hash.slice(1);
    const found = projects.findIndex(p => p.id === target);
    if (found >= 0) showProject(found, { hash: false }); else showHome({ hash: false });
  }
  $('startButton').addEventListener('click', () => showProject(0, { focus: true }));
  $('homeButton').addEventListener('click', () => showHome());
  $('nextButton').addEventListener('click', advance);
  $('prevButton').addEventListener('click', () => { if (index > 0) showProject(index - 1, { focus: true }); });
  $('replayButton').addEventListener('click', replay);
  $('showAllButton').addEventListener('click',()=>{clearTimers();revealTo(maxStep());announce('本页作品已完整显示。');});
  $('catalogButton').addEventListener('click', () => showModal(catalog));
  $('contactButton').addEventListener('click', () => showModal($('contactDialog')));
  $('catalogContact').addEventListener('click', () => { catalog.close(); showModal($('contactDialog')); });
  $('autoButton').addEventListener('click', () => {
    autoplay = !autoplay; updateAutoButton();
    if (autoplay) { if (revealed < maxStep()) runSequence(); else scheduleAuto(); } else clearTimers();
  });
  $('zoomButton').addEventListener('click', () => {
    const active = $('lightboxCanvas').classList.toggle('is-actual');
    $('zoomButton').setAttribute('aria-pressed', String(active)); $('zoomButton').textContent = active ? '适应屏幕' : '查看原尺寸';
  });
  $('lightboxPrev').addEventListener('click', () => setLightboxImage(zoomIndex - 1));
  $('lightboxNext').addEventListener('click', () => setLightboxImage(zoomIndex + 1));
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => {
      if (dialog === lightbox && data.sourcePages) {
        if (zoomProjectIndex !== index) showProject(zoomProjectIndex, { replace: true });
        $('lightboxImage').removeAttribute('src');
      }
      scheduleAuto();
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  });
  document.addEventListener('keydown', event => {
    if (lightbox.open) {
      if (event.key === 'ArrowRight') { event.preventDefault(); setLightboxImage(zoomIndex + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); setLightboxImage(zoomIndex - 1); }
      return;
    }
    if (document.querySelector('dialog[open]') || index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); advance(); }
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); showProject(index - 1); }
    if (event.key === ' ' && !event.target.closest('button,a,input,textarea,select')) { event.preventDefault(); advance(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAuto(); });
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  reducedMotion.addEventListener('change', () => { if (index >= 0 && reducedMotion.matches) { clearTimers(); revealTo(maxStep()); } });
  makeCatalog(); route();
  projects.slice(0, 2).map(project => project.images[0]).filter(Boolean).forEach(image => { const preload = new Image(); preload.src = image.src; });
})();
