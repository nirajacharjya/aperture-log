 const bar = document.getElementById('scroll-bar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
  });

  /* ---------------------------------------------------------
     PROJECT DATA — swap this array for a Firestore query later.
     --------------------------------------------------------- */
  const PROJECTS = [
    // { title:'Trailmark', status:'live', desc:'A hiking-log app that pins your photos to the exact trail coordinates where you shot them, then builds a map of your year outdoors.', tags:['React','Node.js','MongoDB'], github:'#', demo:'#' },
    // { title:'Recon Buddy', status:'progress', desc:'A CLI tool that automates the boring first steps of a security assessment — subdomain sweep, port scan, and a clean summary report.', tags:['Python','Bash','Nmap'], github:'#' },
    { title:'Aperture Log', status:'live', desc:'This very site — a growing personal blog and portfolio built to hold every interest without forcing a single niche.', tags:['React','Tailwind','Firebase'], github:'#', demo:'#' }
    // { title:'FocusStack', status:'live', desc:'A minimal Pomodoro and task tracker built to replace the four different productivity apps I kept abandoning.', tags:['JavaScript','IndexedDB'], github:'#', demo:'#' },
    // { title:'SkyLog', status:'progress', desc:'A small weather-triggered notifier that pings me when conditions look promising for a sunrise shoot near home.', tags:['Python','OpenWeather API'], github:'#' },
    // { title:'CampusBoard', status:'live', desc:'A lightweight noticeboard for classmates to share deadlines and notes, built after one too many missed submission dates.', tags:['Next.js','Firebase'], github:'#', demo:'#' },
    // { title:'PixelSort CLI', status:'live', desc:'A command-line tool that recreates the pixel-sorting glitch effect, built as a weekend excuse to learn image buffers.', tags:['Python','Pillow'], github:'#', demo:'#' },
    // { title:'Nightwatch', status:'progress', desc:'A log-parsing script that flags unusual SSH login attempts on a home server and sends a daily summary.', tags:['Python','Regex','Cron'], github:'#' },
    // { title:'StudyStack', status:'live', desc:'Flashcard app with spaced repetition, built because the existing options felt heavier than what I actually needed.', tags:['React','LocalStorage'], github:'#', demo:'#' },
    // { title:'QuietRoute', status:'progress', desc:'A route-planning experiment that scores walking paths by estimated noise and greenery instead of just distance.', tags:['JavaScript','Leaflet','Maps API'], github:'#' },
    // { title:'GitDigest', status:'live', desc:'A small script that emails me a weekly summary of commits across my repos so nothing quietly goes stale.', tags:['Node.js','GitHub API'], github:'#', demo:'#' },
    // { title:'Monsoon Tracker', status:'live', desc:'A personal dashboard plotting rainfall and cloud cover near home during monsoon season, built for photo planning.', tags:['Python','Flask','Chart.js'], github:'#', demo:'#' },
    // { title:'Typeset', status:'progress', desc:'A tiny Markdown-to-PDF tool tuned specifically for formatting my own article drafts before publishing.', tags:['Node.js','Puppeteer'], github:'#' },
    // { title:'ShelfNote', status:'live', desc:'A book-log app for tracking what I\'m reading and pulling quotes into short reviews without the social-network noise.', tags:['React','Firebase'], github:'#', demo:'#' }
  ];

  const PER_PAGE = 6;
  let currentPage = 1;
  const listEl = document.getElementById('project-list');
  const resultCount = document.getElementById('result-count');
  const paginationEl = document.getElementById('pagination');

  const STATUS_LABEL = { live:'Live', progress:'In progress' };
  const STATUS_CLASS = { live:'status-live', progress:'status-progress' };

  function renderList(){
    const totalPages = Math.max(1, Math.ceil(PROJECTS.length / PER_PAGE));
    if(currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PER_PAGE;
    const pageItems = PROJECTS.slice(start, start + PER_PAGE);

    listEl.innerHTML = '';
    pageItems.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'proj-row';
      row.innerHTML = `
        <div class="proj-index">${String(start + i + 1).padStart(2,'0')}</div>
        <div class="proj-main">
          <div class="proj-top-row">
            <h3 class="proj-title">${p.title}</h3>
            <span class="status-pill ${STATUS_CLASS[p.status]}">${STATUS_LABEL[p.status]}</span>
          </div>
          <p class="proj-desc">${p.desc}</p>
          <div class="tag-row">${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
        </div>
        <div class="proj-links">
          ${p.github ? `<a href="${p.github}" class="proj-link-btn">GitHub →</a>` : ''}
          ${p.demo ? `<a href="${p.demo}" class="proj-link-btn">Live demo →</a>` : ''}
        </div>
      `;
      listEl.appendChild(row);
    });

    resultCount.textContent = PROJECTS.length;
    renderPagination(totalPages);
  }

  function renderPagination(totalPages){
    paginationEl.innerHTML = '';
    paginationEl.classList.toggle('show', totalPages > 1);
    if(totalPages <= 1) return;

    function makeBtn(label, page, opts = {}){
      const btn = document.createElement('button');
      btn.className = 'page-btn' + (opts.active ? ' active' : '');
      btn.innerHTML = label;
      btn.disabled = !!opts.disabled;
      btn.addEventListener('click', () => { currentPage = page; renderList(); listEl.scrollIntoView({behavior:'smooth', block:'start'}); });
      return btn;
    }

    paginationEl.appendChild(makeBtn('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg> Prev', currentPage - 1, { disabled: currentPage === 1 }));

    for(let p = 1; p <= totalPages; p++){
      paginationEl.appendChild(makeBtn(p, p, { active: p === currentPage }));
    }

    paginationEl.appendChild(makeBtn('Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>', currentPage + 1, { disabled: currentPage === totalPages }));
  }

  renderList();
