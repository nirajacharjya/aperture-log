
  const bar = document.getElementById('scroll-bar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
  });

  // Highlight active TOC item on scroll
  const sections = document.querySelectorAll('.legal-content section[id]');
  const tocLinks = document.querySelectorAll('#toc-list a');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        tocLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`#toc-list a[href="#${entry.target.id}"]`);
        if(active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  sections.forEach(s => observer.observe(s));
