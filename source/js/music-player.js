/*
 * Floating Music Player for logic's blog
 * Supports: PC + Mobile, auto-play on interaction, song switching
 */
(function () {
  var playlist = [
    { src: '/music/灰色轨迹-Beyond.mp3', title: '灰色轨迹', artist: 'Beyond' },
    { src: '/music/汪峰-春天里.mp3', title: '春天里', artist: '汪峰' }
  ];

  var currentIndex = 0;
  var isPlaying = false;
  var audio = new Audio();
  audio.preload = 'metadata';

  // AudioContext for mobile cross-page autoplay
  var audioCtx = null;
  var audioSource = null;
  function ensureAudioContext() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        audioCtx = new AC();
        audioSource = audioCtx.createMediaElementSource(audio);
        audioSource.connect(audioCtx.destination);
      }
    }
    return audioCtx;
  }

  // ---------- Inject Styles ----------
  var style = document.createElement('style');
  style.textContent = [
    '/* Floating Music Player */',
    '#music-player{position:fixed;top:70px;right:20px;z-index:999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans SC",sans-serif;transition:all .3s ease;}',
    '#music-player *{box-sizing:border-box;margin:0;padding:0;}',

    /* Mini toggle button */
    '#mp-toggle{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#a29bfe,#fd79a8);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(162,155,254,.4);transition:all .3s;color:#fff;font-size:18px;}',
    '#mp-toggle:hover{box-shadow:0 6px 20px rgba(162,155,254,.6);transform:scale(1.05);}',

    /* Expanded panel */
    '#mp-panel{position:absolute;top:0;right:0;width:260px;background:rgba(25,25,35,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px;opacity:0;pointer-events:none;transform:translateX(20px);transition:all .3s ease;box-shadow:0 8px 32px rgba(0,0,0,.5);}',
    '#mp-panel.open{opacity:1;pointer-events:auto;transform:translateX(0);}',

    /* Song info */
    '#mp-info{display:flex;align-items:center;gap:10px;margin-bottom:10px;}',
    '#mp-disc{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2d2d3d,#1a1a2a);border:2px solid rgba(162,155,254,.3);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:transform 2s linear;}',
    '#mp-disc.spinning{animation:mp-spin 3s linear infinite;}',
    '@keyframes mp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
    '#mp-meta{overflow:hidden;flex:1;}',
    '#mp-title{font-size:13px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '#mp-artist{font-size:11px;color:#a0a0b0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',

    /* Progress bar */
    '#mp-progress{height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-bottom:8px;cursor:pointer;position:relative;}',
    '#mp-progress-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,#a29bfe,#fd79a8);width:0;transition:width .1s linear;position:relative;}',
    '#mp-progress-bar::after{content:"";position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(162,155,254,.6);opacity:0;transition:opacity .2s;}',
    '#mp-progress:hover #mp-progress-bar::after{opacity:1;}',

    /* Time */
    '#mp-time{display:flex;justify-content:space-between;font-size:10px;color:#a0a0b0;margin-bottom:10px;}',

    /* Controls */
    '#mp-controls{display:flex;align-items:center;justify-content:center;gap:18px;}',
    '.mp-btn{background:none;border:none;color:#e0e0e0;cursor:pointer;font-size:16px;padding:4px;transition:color .2s,transform .2s;display:flex;align-items:center;justify-content:center;}',
    '.mp-btn:hover{color:#a29bfe;transform:scale(1.15);}',
    '.mp-btn-play{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#a29bfe,#fd79a8);color:#fff!important;font-size:14px;box-shadow:0 2px 10px rgba(162,155,254,.3);}',
    '.mp-btn-play:hover{box-shadow:0 4px 16px rgba(162,155,254,.5);}',

    /* Playlist indicator */
    '#mp-index{font-size:10px;color:#a0a0b0;text-align:center;margin-top:8px;}',

    /* Mobile responsive */
    '@media(max-width:768px){',
    '  #music-player{top:auto;bottom:20px;right:16px;}',
    '  #mp-panel{width:240px;right:-6px;bottom:52px;top:auto;}',
    '  #mp-panel.open{transform:translateY(0);}',
    '  #mp-panel{transform:translateY(20px);}',
    '}',

    /* Very small screens */
    '@media(max-width:360px){',
    '  #mp-panel{width:220px;right:-10px;}',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // ---------- Build HTML ----------
  var player = document.createElement('div');
  player.id = 'music-player';
  player.innerHTML = [
    '<button id="mp-toggle" aria-label="音乐播放器">',
    '  <i class="fa fa-music"></i>',
    '</button>',
    '<div id="mp-panel">',
    '  <div id="mp-info">',
    '    <div id="mp-disc"><i class="fa fa-music" style="font-size:14px;color:#a29bfe;"></i></div>',
    '    <div id="mp-meta">',
    '      <div id="mp-title"></div>',
    '      <div id="mp-artist"></div>',
    '    </div>',
    '  </div>',
    '  <div id="mp-progress"><div id="mp-progress-bar"></div></div>',
    '  <div id="mp-time"><span id="mp-cur">0:00</span><span id="mp-dur">0:00</span></div>',
    '  <div id="mp-controls">',
    '    <button class="mp-btn" id="mp-prev"><i class="fa fa-step-backward"></i></button>',
    '    <button class="mp-btn mp-btn-play" id="mp-play"><i class="fa fa-play"></i></button>',
    '    <button class="mp-btn" id="mp-next"><i class="fa fa-step-forward"></i></button>',
    '  </div>',
    '  <div id="mp-index"></div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(player);

  // ---------- DOM References ----------
  var toggle = document.getElementById('mp-toggle');
  var panel = document.getElementById('mp-panel');
  var playBtn = document.getElementById('mp-play');
  var prevBtn = document.getElementById('mp-prev');
  var nextBtn = document.getElementById('mp-next');
  var titleEl = document.getElementById('mp-title');
  var artistEl = document.getElementById('mp-artist');
  var discEl = document.getElementById('mp-disc');
  var progressBar = document.getElementById('mp-progress-bar');
  var progressWrap = document.getElementById('mp-progress');
  var curTimeEl = document.getElementById('mp-cur');
  var durTimeEl = document.getElementById('mp-dur');
  var indexEl = document.getElementById('mp-index');

  // ---------- Helper ----------
  function fmt(s) {
    if (!s || !isFinite(s)) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  // ---------- Load Song ----------
  function loadSong(idx) {
    currentIndex = ((idx % playlist.length) + playlist.length) % playlist.length;
    var song = playlist[currentIndex];
    audio.src = song.src;
    titleEl.textContent = song.title;
    artistEl.textContent = song.artist;
    indexEl.textContent = (currentIndex + 1) + ' / ' + playlist.length;
    progressBar.style.width = '0';
    curTimeEl.textContent = '0:00';
    durTimeEl.textContent = '0:00';
    // Update page title hint
    if (isPlaying) {
      discEl.classList.add('spinning');
    }
  }

  function play() {
    var ctx = ensureAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(function() {
        doPlay();
      }).catch(function() {
        doPlay();
      });
    } else {
      doPlay();
    }
  }

  function doPlay() {
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () {
        // Autoplay blocked — user must interact
        isPlaying = false;
        updatePlayUI();
      });
    }
  }

  function pause() {
    audio.pause();
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function updatePlayUI() {
    var icon = playBtn.querySelector('i');
    if (isPlaying) {
      icon.className = 'fa fa-pause';
      discEl.classList.add('spinning');
    } else {
      icon.className = 'fa fa-play';
      discEl.classList.remove('spinning');
    }
  }

  // ---------- Events ----------
  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    panel.classList.toggle('open');
  });

  // Close panel when clicking outside
  document.addEventListener('click', function (e) {
    if (!player.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  playBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    togglePlay();
  });

  prevBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    loadSong(currentIndex - 1);
    if (isPlaying) play();
  });

  nextBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    loadSong(currentIndex + 1);
    if (isPlaying) play();
  });

  // Progress seek
  progressWrap.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!audio.duration) return;
    var rect = progressWrap.getBoundingClientRect();
    var ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    audio.currentTime = ratio * audio.duration;
  });

  // Touch seek support
  progressWrap.addEventListener('touchstart', function (e) {
    if (!audio.duration) return;
    var rect = progressWrap.getBoundingClientRect();
    var touch = e.touches[0];
    var ratio = (touch.clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    audio.currentTime = ratio * audio.duration;
  }, { passive: true });

  // Audio events
  audio.addEventListener('play', function () {
    isPlaying = true;
    updatePlayUI();
    try { localStorage.setItem('mp_playing', '1'); } catch (e) {}
  });

  audio.addEventListener('pause', function () {
    isPlaying = false;
    updatePlayUI();
    try { localStorage.setItem('mp_playing', '0'); } catch (e) {}
  });

  audio.addEventListener('timeupdate', function () {
    if (!audio.duration) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = pct + '%';
    curTimeEl.textContent = fmt(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', function () {
    durTimeEl.textContent = fmt(audio.duration);
  });

  audio.addEventListener('ended', function () {
    loadSong(currentIndex + 1);
    play();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    // Only when not typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' && e.altKey) {
      loadSong(currentIndex + 1);
      if (isPlaying) play();
    } else if (e.key === 'ArrowLeft' && e.altKey) {
      loadSong(currentIndex - 1);
      if (isPlaying) play();
    } else if (e.key === ' ' && e.altKey) {
      e.preventDefault();
      togglePlay();
    }
  });

  // ---------- Init ----------
  loadSong(0);
  updatePlayUI();

  // Auto-play on page load
  play();

  // Check if user interacted on a previous page (e.g. homepage -> blog)
  var userInteracted = false;
  try { userInteracted = sessionStorage.getItem('mp_user_interacted') === '1'; } catch(e) {}
  if (userInteracted) {
    // AudioContext was pre-activated on homepage — aggressively retry
    play();
    setTimeout(function() { if (!isPlaying) play(); }, 50);
    setTimeout(function() { if (!isPlaying) play(); }, 200);
    setTimeout(function() { if (!isPlaying) play(); }, 600);
  }

  // Mark this page as interacted too
  function markInteracted() {
    try { sessionStorage.setItem('mp_user_interacted', '1'); } catch(e) {}
  }
  document.addEventListener('click', markInteracted, { once: true });
  document.addEventListener('touchstart', markInteracted, { once: true });
  document.addEventListener('scroll', markInteracted, { once: true });

  // Retry autoplay on first user interaction (fallback for strict browsers)
  var autoplayDone = false;
  function retryAutoplay() {
    if (autoplayDone || isPlaying) return;
    autoplayDone = true;
    markInteracted();
    play();
  }
  document.addEventListener('click', retryAutoplay, { once: true });
  document.addEventListener('touchstart', retryAutoplay, { once: true });
  document.addEventListener('scroll', retryAutoplay, { once: true });
  document.addEventListener('keydown', retryAutoplay, { once: true });

})();
