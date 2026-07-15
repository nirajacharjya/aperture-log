/* ===========================================================
   Aperture Log — Stories page logic
   Handles: theme toggle, story data + rendering, category
   filtering, pagination, the "read story" overlay, and the
   rich-text "Share your story" editor + submission form.
   =========================================================== */

/* ---------------- Theme toggle ---------------- */
const root = document.documentElement;
const themeBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const SUN_PATH = '<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="3.5" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="20.5" y2="12"/><line x1="5.1" y1="5.1" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="18.9" y2="18.9"/><line x1="5.1" y1="18.9" x2="6.9" y2="17.1"/><line x1="17.1" y1="6.9" x2="18.9" y2="5.1"/>';
const MOON_PATH = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

function setTheme(light){
  root.classList.toggle('light', light);
  themeIcon.innerHTML = light ? SUN_PATH : MOON_PATH;
}
themeBtn.addEventListener('click', () => setTheme(!root.classList.contains('light')));

const scrollBar = document.getElementById('scroll-bar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  scrollBar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
});

/* ---------------------------------------------------------
   STORY DATA — swap for a Firestore query later. Each story
   already carries an "author" field, so newly submitted
   stories (once uploads/publishing are connected) can be
   appended to this same array shape.
   --------------------------------------------------------- */
const CAT_LABELS = { personal:'Personal', learning:'Learning', travel:'Travel', career:'Career', other:'Other' };
const AUTHORS = ['Niraj', 'Priya', 'Arjun', 'Suvam', 'Meher', 'Rhea', 'Dev', 'Ananya'];

const STORY_SEEDS = [
  { title: 'The Semester I Almost Quit Computer Science', cat: 'personal', excerpt: 'A rough second year, a professor who noticed, and the one conversation that changed how I saw the whole degree.' },
  { title: 'What Three Months of Rejections Taught Me About Applying', cat: 'career', excerpt: 'Eleven "no"s before the first "yes" — and what I changed in my application after each one.' },
  { title: 'Getting Lost in Cherrapunji Was the Best Part of the Trip', cat: 'travel', excerpt: 'The itinerary fell apart on day one. What happened instead is the part I actually remember.' },
  { title: 'Teaching My Grandmother to Video Call', cat: 'personal', excerpt: 'Six attempts, a lot of patience on both sides, and a relationship that got closer because of a shared frustration.' },
  { title: 'The Course I Almost Dropped Turned Out to Matter Most', cat: 'learning', excerpt: 'I signed up for the easy elective. I got the hardest, most useful class of my degree instead.' },
  { title: 'My First Freelance Client Almost Didn\'t Pay Me', cat: 'career', excerpt: 'What I learned about contracts, boundaries, and asking for money upfront the hard way.' },
  { title: 'A Power Cut, a Candle, and the Best Conversation With My Dad', cat: 'personal', excerpt: 'No phones, no distractions — just two hours we wouldn\'t have had otherwise.' },
  { title: 'Learning to Read Research Papers Without Panicking', cat: 'learning', excerpt: 'The three-pass method that turned dense academic papers from a wall of text into something I could actually use.' },
  { title: 'Missing My Train in Kolkata Taught Me to Slow Down', cat: 'travel', excerpt: 'An unplanned extra day in a city I thought I already understood.' },
  { title: 'The Internship Interview Where I Froze Completely', cat: 'career', excerpt: 'What actually happened after the silence, and why it wasn\'t the disaster I thought it was.' },
  { title: 'Why I Started Waking Up an Hour Earlier', cat: 'personal', excerpt: 'It wasn\'t about productivity — it was about getting one quiet hour that was actually mine.' },
  { title: 'The Group Project That Fell Apart (and What I\'d Do Differently)', cat: 'learning', excerpt: 'Four people, one deadline, and the communication breakdown that taught me more than the assignment itself.' },
  { title: 'A Week Without My Phone in the Hills', cat: 'travel', excerpt: 'What I noticed once there was nothing left to scroll through.' },
  { title: 'Asking for Help Was Harder Than the Actual Problem', cat: 'other', excerpt: 'Stuck for six hours on a bug I could have solved in ten minutes, if I\'d just asked sooner.' }
];

const TOTAL_STORIES = 34;
const STORIES = Array.from({ length: TOTAL_STORIES }, (_, i) => {
  const seed = STORY_SEEDS[i % STORY_SEEDS.length];
  const cat = seed.cat;
  return {
    id: i + 1,
    seedImg: `aplog-story-${i + 1}`,
    title: i < STORY_SEEDS.length ? seed.title : `${seed.title} — Part ${Math.floor(i / STORY_SEEDS.length) + 1}`,
    cat,
    excerpt: seed.excerpt,
    author: AUTHORS[i % AUTHORS.length],
    date: `2026-${String(((i % 12) + 1)).padStart(2,'0')}-${String(((i * 5) % 27) + 1).padStart(2,'0')}`,
    readTime: 3 + (i % 6),
    content: `
      <p>${seed.excerpt}</p>
      <p>It didn't feel like a big deal in the moment. Looking back, it's one of those small turning points that only makes sense once you've got some distance from it — the kind of thing you'd skip over in a summary but that actually changed how I approached everything that came after.</p>
      <blockquote>The part that stuck with me wasn't the outcome. It was how differently I thought about the next decision because of it.</blockquote>
      <p>If you're in the middle of something similar right now, I don't have a tidy lesson to hand you — just that it usually looks messier while it's happening than it does afterward. That part, at least, seems to be true every time.</p>
    `
  };
});

/* ---------------- Grid rendering + filters + pagination ---------------- */
const PER_PAGE = 9;
let currentPage = 1;
let activeCat = 'all';

const grid = document.getElementById('story-grid');
const resultCount = document.getElementById('result-count');
const noResults = document.getElementById('no-results');
const paginationEl = document.getElementById('pagination');
const filterPills = document.querySelectorAll('.filter-pill');

function getFiltered(){
  return activeCat === 'all' ? STORIES : STORIES.filter(s => s.cat === activeCat);
}

let currentPageItems = [];

function renderGrid(){
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if(currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PER_PAGE;
  currentPageItems = filtered.slice(start, start + PER_PAGE);

  grid.innerHTML = '';
  currentPageItems.forEach((story, idx) => {
    const card = document.createElement('div');
    card.className = 'story-card';
    card.innerHTML = `
      <div class="sc-media">
        <img src="https://picsum.photos/seed/${story.seedImg}/700/440" alt="Thumbnail for ${story.title}" loading="lazy">
        <span class="sc-cat">${CAT_LABELS[story.cat]}</span>
      </div>
      <div class="sc-body">
        <div class="sc-meta"><div class="sc-avatar"></div><span>${story.author}</span><span>·</span><span>${story.readTime} min read</span></div>
        <h3 class="sc-title">${story.title}</h3>
        <p class="sc-excerpt">${story.excerpt}</p>
        <span class="sc-read">Read story →</span>
      </div>
    `;
    card.addEventListener('click', () => openReadOverlay(idx));
    grid.appendChild(card);
  });

  resultCount.textContent = filtered.length;
  noResults.classList.toggle('show', filtered.length === 0);
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
    btn.addEventListener('click', () => { currentPage = page; renderGrid(); grid.scrollIntoView({behavior:'smooth', block:'start'}); });
    return btn;
  }

  paginationEl.appendChild(makeBtn('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg> Prev', currentPage - 1, { disabled: currentPage === 1 }));

  const pageNumbers = [];
  for(let p = 1; p <= totalPages; p++){
    if(p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) pageNumbers.push(p);
    else if(pageNumbers[pageNumbers.length - 1] !== '...') pageNumbers.push('...');
  }
  pageNumbers.forEach(p => {
    if(p === '...'){
      const span = document.createElement('span');
      span.className = 'page-ellipsis';
      span.textContent = '···';
      paginationEl.appendChild(span);
    } else {
      paginationEl.appendChild(makeBtn(p, p, { active: p === currentPage }));
    }
  });

  paginationEl.appendChild(makeBtn('Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>', currentPage + 1, { disabled: currentPage === totalPages }));
}

filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    filterPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeCat = pill.dataset.cat;
    currentPage = 1;
    renderGrid();
  });
});

/* ---------------- Read story overlay ---------------- */
const readOverlay = document.getElementById('read-overlay');
const readClose = document.getElementById('read-close');
const readImg = document.getElementById('read-img');
const readCat = document.getElementById('read-cat');
const readTitle = document.getElementById('read-title');
const readByline = document.getElementById('read-byline');
const readContent = document.getElementById('read-content');

function openReadOverlay(idx){
  const story = currentPageItems[idx];
  if(!story) return;
  readImg.src = `https://picsum.photos/seed/${story.seedImg}/1200/650`;
  readImg.alt = story.title;
  readCat.textContent = CAT_LABELS[story.cat];
  readTitle.textContent = story.title;
  const dateStr = new Date(story.date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  readByline.textContent = `${story.author} · ${dateStr} · ${story.readTime} min read`;
  readContent.innerHTML = story.content;
  readOverlay.classList.add('open');
  readOverlay.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeReadOverlay(){
  readOverlay.classList.remove('open');
  document.body.style.overflow = '';
}
readClose.addEventListener('click', closeReadOverlay);
readOverlay.addEventListener('click', (e) => { if(e.target === readOverlay) closeReadOverlay(); });
document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && readOverlay.classList.contains('open')) closeReadOverlay(); });

/* ---------------------------------------------------------
   SHARE STORY EDITOR
   A contentEditable rich-text box using document.execCommand
   for formatting (bold, italic, headings, lists, color,
   highlight, links, alignment, undo/redo). Works without any
   external library — good enough for a lightweight story
   composer, though execCommand is a legacy API; if this needs
   to get more advanced later, swapping in a small library like
   Quill or TipTap would be the natural upgrade path.
   --------------------------------------------------------- */
const openEditorBtn = document.getElementById('open-editor');
const editorOverlay = document.getElementById('editor-overlay');
const editorClose = document.getElementById('editor-close');
const storyForm = document.getElementById('story-form');
const editorFormView = document.getElementById('editor-form-view');
const editorSuccess = document.getElementById('editor-success');

function openEditor(){ editorOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeEditor(){
  editorOverlay.classList.remove('open'); document.body.style.overflow = '';
  setTimeout(resetEditorForm, 250);
}
function resetEditorForm(){
  storyForm.reset();
  document.getElementById('rt-editor').innerHTML = '';
  thumbPreview.classList.remove('show');
  thumbPreview.src = '';
  thumbLabel.textContent = 'Tap to choose a cover image for your story';
  thumbDrop.classList.remove('error');
  editorFormView.style.display = '';
  editorSuccess.classList.remove('show');
}
openEditorBtn.addEventListener('click', openEditor);
editorClose.addEventListener('click', closeEditor);
editorOverlay.addEventListener('click', (e) => { if(e.target === editorOverlay) closeEditor(); });
document.addEventListener('keydown', (e) => { if(e.key === 'Escape' && editorOverlay.classList.contains('open')) closeEditor(); });

/* Thumbnail upload preview */
const thumbDrop = document.getElementById('thumb-drop');
const thumbInput = document.getElementById('st-thumb');
const thumbPreview = document.getElementById('thumb-preview');
const thumbLabel = document.getElementById('thumb-label');

thumbInput.addEventListener('change', () => {
  const file = thumbInput.files[0];
  thumbDrop.classList.remove('error');
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    thumbPreview.src = e.target.result;
    thumbPreview.classList.add('show');
    thumbLabel.textContent = file.name;
  };
  reader.readAsDataURL(file);
});

/* Rich text toolbar */
const rtEditor = document.getElementById('rt-editor');
const rtToolbar = document.getElementById('rt-toolbar');
const rtFont = document.getElementById('rt-font');
const rtSize = document.getElementById('rt-size');
const rtColor = document.getElementById('rt-color');
const rtHighlight = document.getElementById('rt-highlight');

rtToolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('.rt-btn');
  if(!btn) return;
  rtEditor.focus();

  if(btn.dataset.cmd){
    document.execCommand(btn.dataset.cmd, false, null);
  } else if(btn.dataset.block){
    document.execCommand('formatBlock', false, btn.dataset.block);
  } else if(btn.dataset.action === 'link'){
    const url = prompt('Paste a URL:');
    if(url) document.execCommand('createLink', false, url);
  }
  updateToolbarState();
});

rtFont.addEventListener('change', () => { rtEditor.focus(); document.execCommand('fontName', false, rtFont.value); });
rtSize.addEventListener('change', () => { rtEditor.focus(); document.execCommand('fontSize', false, rtSize.value); });
rtColor.addEventListener('input', () => { rtEditor.focus(); document.execCommand('foreColor', false, rtColor.value); });
rtHighlight.addEventListener('input', () => {
  rtEditor.focus();
  document.execCommand('hiliteColor', false, rtHighlight.value);
});

function updateToolbarState(){
  ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList','justifyLeft','justifyCenter'].forEach(cmd => {
    const btn = rtToolbar.querySelector(`[data-cmd="${cmd}"]`);
    if(!btn) return;
    try{ btn.classList.toggle('active', document.queryCommandState(cmd)); }catch(err){}
  });
}
rtEditor.addEventListener('keyup', updateToolbarState);
rtEditor.addEventListener('mouseup', updateToolbarState);

/* ---------------------------------------------------------
   SUBMIT — currently validates + previews only.
   To connect Firebase later:
     1. Add the Firebase SDK + config, plus Storage and Firestore.
     2. In publishStory() below, upload the thumbnail File to
        Cloud Storage, then addDoc() a new story document to
        Firestore with title, author, category, the editor's
        innerHTML (already-formatted content), and the thumbnail URL.
     3. Once that resolves, either refetch STORIES from Firestore
        or push the new entry into the array and call renderGrid()
        so it appears immediately.
   --------------------------------------------------------- */
function publishStory(data){
  return new Promise(resolve => setTimeout(resolve, 900));
}

storyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('st-title').value.trim();
  const author = document.getElementById('st-author').value.trim() || 'Anonymous';
  const category = document.getElementById('st-cat').value;
  const thumbFile = thumbInput.files[0] || null;
  const contentHTML = rtEditor.innerHTML.trim();

  let hasError = false;
  if(!thumbFile){ thumbDrop.classList.add('error'); hasError = true; }
  if(!title || !contentHTML || contentHTML === '<br>'){
    if(!contentHTML || contentHTML === '<br>') rtEditor.style.borderColor = 'var(--danger)';
    hasError = true;
  } else {
    rtEditor.style.borderColor = '';
  }
  if(hasError) return;

  await publishStory({ title, author, category, thumbFile, contentHTML });
  editorFormView.style.display = 'none';
  editorSuccess.classList.add('show');
});

/* ---------------- Init ---------------- */
renderGrid();