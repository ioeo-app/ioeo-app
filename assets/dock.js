// Bottom search dock, modelled on Tide Launcher's SearchDock:
// the bar stays put and the panel grows upward out of it (only the visible height animates).
// Open 420ms (0.16,1,0.3,1) · close 320ms (0.32,0,0.15,1) — set in site.css.
(function () {
  var LAUNCHER_ICON =
    '<svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" fill="#0E1A24"/>' +
    '<g fill="none" stroke="#F2EEE6" stroke-width="18">' +
    '<rect x="146" y="146" width="96" height="96" rx="22"/><rect x="270" y="146" width="96" height="96" rx="22"/>' +
    '<rect x="146" y="270" width="96" height="96" rx="22"/></g>' +
    '<clipPath id="ic-l-clip"><rect x="270" y="270" width="96" height="96" rx="22"/></clipPath>' +
    '<path clip-path="url(#ic-l-clip)" d="M258 328 C278 310 298 310 318 328 S358 346 378 328" fill="none" stroke="#6FC2C0" stroke-width="16" stroke-linecap="round"/>' +
    '<rect x="270" y="270" width="96" height="96" rx="22" fill="none" stroke="#F2EEE6" stroke-width="18"/></svg>';
  var BROWSER_ICON =
    '<svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" fill="#0E1A24"/>' +
    '<clipPath id="ic-b-clip"><circle cx="256" cy="256" r="118"/></clipPath>' +
    '<path clip-path="url(#ic-b-clip)" d="M112 280 C160 236 208 236 256 280 S352 324 400 280" fill="none" stroke="#6FC2C0" stroke-width="28" stroke-linecap="round"/>' +
    '<circle cx="256" cy="256" r="118" fill="none" stroke="#F2EEE6" stroke-width="26"/></svg>';

  var APPS = [
    { group: 'tide', name: 'Tide Launcher', icon: LAUNCHER_ICON,
      en: 'A fast, tidy home screen', ko: '빠르고 단정한 홈 화면 런처' },
    { group: 'tide', name: 'Tide Browser', icon: BROWSER_ICON,
      en: 'A light browser with translation and ad blocking', ko: '번역과 광고 차단을 갖춘 가벼운 브라우저' }
  ];

  var root = document.documentElement;
  var dock = document.getElementById('dock');
  var inner = dock.querySelector('.dock-inner');
  var panel = dock.querySelector('.panel');
  var head = dock.querySelector('.panel-head');
  var title = dock.querySelector('.panel-title');
  var list = dock.querySelector('.app-list');
  var intros = dock.querySelectorAll('.panel-intro');
  var form = dock.querySelector('.bar');
  var input = form.querySelector('input');
  var btn = form.querySelector('.bar-btn');
  var scrim = document.querySelector('.scrim');
  var groupBtns = document.querySelectorAll('[data-open]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var isOpen = false, mode = null; // mode: 'all' | 'search' | group id
  var closeTimer = null;

  function lang() { return root.getAttribute('data-lang') === 'ko' ? 'ko' : 'en'; }
  function both(en, ko) { return '<span data-l="en">' + en + '</span><span data-l="ko">' + ko + '</span>'; }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function setPlaceholder() {
    input.placeholder = lang() === 'ko' ? '앱 검색' : 'Search apps';
    btn.setAttribute('aria-label', isOpen ? (lang() === 'ko' ? '닫기' : 'Close') : (lang() === 'ko' ? '검색' : 'Search'));
  }

  function render() {
    var q = input.value.trim().toLowerCase();
    var items = APPS.filter(function (a) {
      if (mode === 'search') return !q || (a.name + ' ' + a.en + ' ' + a.ko).toLowerCase().indexOf(q) !== -1;
      if (mode === 'all') return true;
      return a.group === mode;
    });
    for (var i = 0; i < intros.length; i++) intros[i].hidden = intros[i].getAttribute('data-for') !== mode;
    if (mode === 'search' && q && !items.length) title.innerHTML = both('No matching apps', '일치하는 앱이 없어요');
    else if (mode === 'search' && q) title.innerHTML = both(items.length + ' result' + (items.length > 1 ? 's' : ''), '검색 결과 ' + items.length + '개');
    else if (mode === 'all' || mode === 'search') title.innerHTML = both('All apps · ' + items.length, '모든 앱 ' + items.length + '개');
    else title.innerHTML = both('Tide · ' + items.length + ' apps', 'Tide · 앱 ' + items.length + '개');
    list.innerHTML = items.map(function (a) {
      return '<li class="app-row"><span class="app-icon">' + a.icon + '</span>' +
        '<span class="app-text"><span class="app-name">' + esc(a.name) + '</span>' +
        '<span class="app-desc">' + both(esc(a.en), esc(a.ko)) + '</span></span>' +
        '<span class="badge">' + both('Coming soon', '출시 예정') + '</span></li>';
    }).join('');
  }

  // Heights: closed = the bar alone; open = panel content, capped to most of the screen.
  // (+20 = dock padding 10 top and bottom, +2 = border)
  function closedH() { return form.offsetHeight + 22; }
  function openH() { return panel.offsetHeight + form.offsetHeight + 22; } // panel height is capped in CSS
  function setH(px, animate) {
    dock.classList.toggle('no-anim', !animate || reduce.matches);
    dock.style.height = px + 'px';
  }

  function open(next, focusInput) {
    clearTimeout(closeTimer);
    dock.classList.remove('closing');
    mode = next;
    render();
    if (!isOpen) {
      isOpen = true;
      try { history.pushState({ ioeoDock: true }, ''); } catch (e) {}
      dock.classList.add('open');
      scrim.hidden = false;
      requestAnimationFrame(function () { scrim.classList.add('on'); });
      setH(closedH(), false);
      void dock.offsetHeight; // start from the closed height
    }
    panel.scrollTop = 0;
    setH(openH(), true);
    syncAria();
    if (focusInput) input.focus({ preventScroll: true });
  }

  function close(fromHistory) {
    if (!isOpen) return;
    if (!fromHistory && history.state && history.state.ioeoDock) { history.back(); return; } // popstate closes
    isOpen = false;
    input.blur();
    dock.classList.add('closing');
    scrim.classList.remove('on');
    setH(closedH(), true);
    syncAria();
    closeTimer = setTimeout(function () {
      if (isOpen) return;
      dock.classList.remove('open', 'closing');
      scrim.hidden = true;
      dock.style.height = '';
      input.value = '';
      mode = null;
    }, reduce.matches ? 0 : 340);
  }

  function syncAria() {
    input.setAttribute('aria-expanded', String(isOpen));
    for (var i = 0; i < groupBtns.length; i++)
      groupBtns[i].setAttribute('aria-expanded', String(isOpen && mode === groupBtns[i].getAttribute('data-open')));
    setPlaceholder();
  }

  // Page buttons (e.g. "Tide") open their group
  for (var i = 0; i < groupBtns.length; i++) {
    groupBtns[i].addEventListener('click', function (e) { open(e.currentTarget.getAttribute('data-open'), false); });
  }
  // Search field: tapping opens all apps; typing filters
  input.addEventListener('focus', function () { if (!isOpen) open('all', false); });
  input.addEventListener('input', function () { open('search', false); });
  form.addEventListener('submit', function (e) { e.preventDefault(); input.blur(); });
  // Round button: search when closed, close (↓) when open
  btn.addEventListener('click', function () { isOpen ? close(false) : open('all', true); });
  scrim.addEventListener('click', function () { close(false); });
  document.addEventListener('keydown', function (e) { if (isOpen && e.key === 'Escape') close(false); });
  window.addEventListener('popstate', function () { close(true); });
  window.addEventListener('resize', function () { if (isOpen) setH(openH(), false); });
  document.querySelector('.lang').addEventListener('click', function () { setTimeout(setPlaceholder, 0); });

  // Drag the handle down to close (follows the finger, like the launcher)
  var startY = null, startH = 0;
  head.addEventListener('pointerdown', function (e) {
    if (!isOpen) return;
    startY = e.clientY; startH = dock.offsetHeight;
    head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove', function (e) {
    if (startY === null) return;
    var dy = Math.max(0, e.clientY - startY);
    setH(Math.max(closedH(), startH - dy), false);
  });
  function endDrag(e) {
    if (startY === null) return;
    var dy = e.clientY - startY; startY = null;
    if (dy > 60) close(false); else setH(openH(), true);
  }
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);

  setPlaceholder();
})();
