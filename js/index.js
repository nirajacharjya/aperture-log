   import "./auth.js";
   // Theme toggle — dark is default
    const root = document.documentElement;
    const themeBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const sunPath = '<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="3.5" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="20.5" y2="12"/><line x1="5.1" y1="5.1" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="18.9" y2="18.9"/><line x1="5.1" y1="18.9" x2="6.9" y2="17.1"/><line x1="17.1" y1="6.9" x2="18.9" y2="5.1"/>';
    const moonPath = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

    function setTheme(light) {
      root.classList.toggle('light', light);
      themeIcon.innerHTML = light ? sunPath : moonPath;
    }
    themeBtn.addEventListener('click', () => setTheme(!root.classList.contains('light')));

    // Scroll progress + back to top
    const bar = document.getElementById('scroll-bar');
    const totop = document.getElementById('totop');
    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      bar.style.width = scrolled + '%';
      totop.classList.toggle('show', h.scrollTop > 500);
    });
    totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Duplicate ticker content for seamless loop
    const ticker = document.getElementById('ticker');
    ticker.innerHTML += ticker.innerHTML;
