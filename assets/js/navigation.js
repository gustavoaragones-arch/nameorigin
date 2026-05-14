document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.querySelector('.mobile-menu-toggle');
  const nav = document.querySelector('.nav-inner');

  if (!toggle || !nav) return;

  function closeMenu() {
    nav.classList.remove('open');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();

    nav.classList.toggle('open');
    document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
  });

  // ✅ Close on link click
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // ✅ Close on outside click
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      closeMenu();
    }
  });

  // ✅ Close on ESC key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });
});
