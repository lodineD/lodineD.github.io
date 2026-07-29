/*
 * Floating Music Player for logic's blog
 * Supports: PC + Mobile, auto-play on interaction, song switching
 */
(function () {
  var playlist = [
    { src: '/music/Terran 1.mp3', title: 'Terran 1', artist: 'StarCraft' },
    { src: '/music/汪峰-春天里.mp3', title: '春天里', artist: '汪峰' }, 
    { src: '/music/灰色轨迹-Beyond.mp3', title: '灰色轨迹', artist: 'Beyond' },
    { src: '/music/Da Da Da-王心凌.mp3', title: 'Da Da Da', artist: '王心凌' },
  ];

  var currentIndex = 0;
  var isPlaying = false;
  var audio = new Audio();
  audio.preload = 'metadata';

  // (AudioContext removed - pure HTML5 Audio for reliable seek)

  // ---------- Inject Styles ----------
  var style = document.createElement('style');
  style.textContent = [
    '/* Floating Music Player */',
    '#music-player{position:fixed;top:70px;right:20px;z-index:999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans SC",sans-serif;transition:all .3s ease;}',
    '#music-player *{box-sizing:border-box;margin:0;padding:0;}',
    '#music-player .mp-song-item{padding:8px 10px;}',

    /* Mini toggle button */
    '#mp-toggle{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#a29bfe,#fd79a8);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(162,155,254,.4);transition:all .3s;color:#fff;font-size:18px;-webkit-tap-highlight-color:transparent;}',
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
    '#mp-progress{height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin-bottom:12px;cursor:pointer;position:relative;}',
    '#mp-progress-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,#a29bfe,#fd79a8);width:0;position:relative;}',
    '#mp-progress-bar::after{content:"";position:absolute;right:-6px;top:50%;transform:translateY(-50%);width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(162,155,254,.6);opacity:0;transition:opacity .2s;}',
    '#mp-progress:hover #mp-progress-bar::after,#mp-progress.dragging #mp-progress-bar::after{opacity:1;}',

    /* Time */
    '#mp-time{display:flex;justify-content:space-between;font-size:10px;color:#a0a0b0;margin-bottom:10px;}',

    /* Controls */
    '#mp-controls{display:flex;align-items:center;justify-content:center;gap:18px;}',
    '.mp-btn{background:none;border:none;color:#e0e0e0;cursor:pointer;font-size:16px;padding:4px;transition:color .2s,transform .2s;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;}',
    '.mp-btn:hover{color:#a29bfe;transform:scale(1.15);}',
    '.mp-btn-play{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#a29bfe,#fd79a8);color:#fff!important;font-size:14px;box-shadow:0 2px 10px rgba(162,155,254,.3);-webkit-tap-highlight-color:transparent;}',
    '.mp-btn-play:hover{box-shadow:0 4px 16px rgba(162,155,254,.5);}',

    /* Loop mode button */
    '#mp-loop{position:relative;}',
    '#mp-loop.list{color:#a29bfe!important;}',

    '#mp-bottom-row{display:flex;align-items:center;gap:10px;margin-top:10px;}',

    '#mp-list-btn{background:none;border:none;color:#a0a0b0;cursor:pointer;font-size:12px;padding:2px 6px;transition:color .2s;display:flex;align-items:center;gap:4px;-webkit-tap-highlight-color:transparent;}',
    '#mp-list-btn:hover{color:#a29bfe;}',

    '#mp-playlist{max-height:0;overflow:hidden;transition:max-height .3s ease;border-top:1px solid rgba(255,255,255,.06);margin-top:10px;}',
    '#mp-playlist.open{max-height:200px;overflow-y:auto;}',
    '#mp-playlist::-webkit-scrollbar{width:4px;}',
    '#mp-playlist::-webkit-scrollbar-thumb{background:rgba(162,155,254,.3);border-radius:2px;}',
    '.mp-song-item{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:pointer;border-radius:6px;transition:background .2s;color:#c0c0d0;font-size:12px;}',
    '.mp-song-item:hover{background:rgba(162,155,254,.12);}',
    '.mp-song-item.active{background:rgba(162,155,254,.18);color:#fff;}',
    '.mp-song-item .mp-song-num{width:18px;text-align:center;color:#666;font-size:10px;flex-shrink:0;}',
    '.mp-song-item.active .mp-song-num{color:#a29bfe;}',
    '.mp-song-item .mp-song-info{overflow:hidden;flex:1;}',
    '.mp-song-item .mp-song-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500;}',
    '.mp-song-item .mp-song-artist{font-size:10px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',

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
    '  <div id="mp-bottom-row">',
    '    <button class="mp-btn" id="mp-loop" title="循环模式"><i class="fa fa-retweet"></i></button>',
    '    <button id="mp-list-btn"><i class="fa fa-list" style="font-size:11px;"></i> 播放列表</button>',
    '  </div>',
    '  <div id="mp-playlist"></div>',
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
  var loopBtn = document.getElementById('mp-loop');
  var listBtn = document.getElementById('mp-list-btn');
  var playlistEl = document.getElementById('mp-playlist');

  // Build playlist items
  function buildPlaylistUI() {
    playlistEl.innerHTML = '';
    for (var i = 0; i < playlist.length; i++) {
      var item = document.createElement('div');
      item.className = 'mp-song-item' + (i === currentIndex ? ' active' : '');
      item.setAttribute('data-index', i);
      item.innerHTML = '<span class="mp-song-num">' + (i + 1) + '</span>' +
        '<div class="mp-song-info">' +
        '<div class="mp-song-name">' + playlist[i].title + '</div>' +
        '<div class="mp-song-artist">' + playlist[i].artist + '</div>' +
        '</div>';
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(this.getAttribute('data-index'));
        loadSong(idx);
        play();
        buildPlaylistUI();
      });
      playlistEl.appendChild(item);
    }
  }

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
    progressBar.style.width = '0';
    curTimeEl.textContent = '0:00';
    durTimeEl.textContent = '0:00';
    // Update page title hint
    if (isPlaying) {
      discEl.classList.add('spinning');
    }
  }

  function play() {
    doPlay();
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

  listBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    playlistEl.classList.toggle('open');
  });

  // Update playlist highlight on song change
  function updatePlaylistHighlight() {
    var items = playlistEl.querySelectorAll('.mp-song-item');
    for (var i = 0; i < items.length; i++) {
      if (parseInt(items[i].getAttribute('data-index')) === currentIndex) {
        items[i].classList.add('active');
      } else {
        items[i].classList.remove('active');
      }
    }
  }

  playBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    togglePlay();
  });

  prevBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    loadSong(currentIndex - 1);
    if (isPlaying) play();
    updatePlaylistHighlight();
  });

  nextBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    loadSong(currentIndex + 1);
    if (isPlaying) play();
    updatePlaylistHighlight();
  });

  // Progress seek + drag
  var isDragging = false;

  function seekFromEvent(e) {
    var dur = audio.duration;
    if (!dur || !isFinite(dur)) return;
    var rect = progressWrap.getBoundingClientRect();
    var x = e.touches ? e.touches[0].clientX : e.clientX;
    var ratio = (x - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    audio.currentTime = ratio * dur;
    progressBar.style.width = (ratio * 100) + '%';
  }

  progressWrap.addEventListener('mousedown', function (e) {
    e.stopPropagation();
    e.preventDefault();
    isDragging = true;
    progressWrap.classList.add('dragging');
    seekFromEvent(e);
  });
  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    seekFromEvent(e);
  });
  document.addEventListener('mouseup', function () {
    if (isDragging) {
      isDragging = false;
      progressWrap.classList.remove('dragging');
    }
  });

  // Touch seek support
  progressWrap.addEventListener('touchstart', function (e) {
    e.stopPropagation();
    seekFromEvent(e);
  }, { passive: true });
  progressWrap.addEventListener('touchmove', function (e) {
    seekFromEvent(e);
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
    if (audio.loop) {
      // single loop: browser handles it, but just in case
      audio.currentTime = 0;
      play();
    } else {
      loadSong(currentIndex + 1);
      play();
      updatePlaylistHighlight();
    }
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
  // Check if current page has a specific song (from front-matter)
  var pageMusic = window.__pageMusic;
  var startIndex = 0; // default: Terran 1
  var isSongPage = false;
  if (pageMusic && pageMusic.src) {
    isSongPage = true;
    for (var i = 0; i < playlist.length; i++) {
      if (playlist[i].src === pageMusic.src) {
        startIndex = i;
        break;
      }
    }
  }
  loadSong(startIndex);
  updatePlayUI();
  buildPlaylistUI();

  // Loop mode: always default to single
  var loopMode = 'single';

  function applyLoopMode() {
    var icon = loopBtn.querySelector('i');
    if (loopMode === 'single') {
      audio.loop = true;
      icon.className = 'fa fa-retweet';
      loopBtn.classList.remove('list');
      loopBtn.title = '单曲循环';
    } else {
      audio.loop = false;
      icon.className = 'fa fa-redo';
      loopBtn.classList.add('list');
      loopBtn.title = '列表循环';
    }
  }
  applyLoopMode();

  loopBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    loopMode = loopMode === 'single' ? 'list' : 'single';
    applyLoopMode();
  });

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
