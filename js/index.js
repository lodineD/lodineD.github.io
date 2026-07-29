// 个人主页交互逻辑
(function () {
  // === Blog entry button — persist music interaction state ===
  var blogBtn = document.querySelector('.blog-entry-btn');
  if (blogBtn) {
    blogBtn.addEventListener('click', function (e) {
      e.preventDefault();
      var href = this.getAttribute('href');
      try { sessionStorage.setItem('mp_user_interacted', '1'); } catch (e) {}
      window.location.href = href;
    });
  }

  // === Mark user interaction for music player ===
  function markInteracted() {
    try { sessionStorage.setItem('mp_user_interacted', '1'); } catch (e) {}
  }
  document.addEventListener('click', markInteracted, { once: true });
  document.addEventListener('touchstart', markInteracted, { once: true });
  document.addEventListener('scroll', markInteracted, { once: true });

  // === Profile social box toggle ===
  var profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.addEventListener('click', function () {
      this.classList.toggle('active');
      document.getElementById('socialBox').classList.toggle('open');
    });
  }

  // === Mobile nav toggle ===
  var navToggle = document.getElementById('navToggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      document.getElementById('navMenu').classList.toggle('open');
    });
  }

  // === Skill bar animation on scroll ===
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) entry.target.classList.add('animate');
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.skill-bar-fill').forEach(function (bar) {
    observer.observe(bar);
  });
})();
