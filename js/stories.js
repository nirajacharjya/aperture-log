/* ===========================================================
   Aperture Log — Stories page logic
   Handles: theme toggle, story data + rendering, category
   filtering, pagination, the "read story" overlay, and the
   rich-text "Share your story" editor + submission form.

   Backend: Firebase Firestore + Cloudinary (same pattern as
   photography.js) — real uploads, published instantly, no
   pending-review gate. Sharing a story requires being signed in.
   =========================================================== */
import { db, auth } from "./firebase.js";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "./cloudinary.js";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";

/* Theme toggle now lives in the shared navbar.js component */

const scrollBar = document.getElementById('scroll-bar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  scrollBar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
});

/* ---------------------------------------------------------
   STORY DATA — live from Firestore. Populated by loadStories()
   on init, and prepended-to locally the moment a new story is
   published so it shows up instantly without waiting on a refetch.
   --------------------------------------------------------- */
const CAT_LABELS = { personal:'Personal', learning:'Learning', travel:'Travel', career:'Career', other:'Other' };

let STORIES = [];

function excerptFromHTML(html, max = 160){
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max).trim() + '…' : text;
}
function readTimeFromHTML(html){
  const words = html.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 200));
}

async function loadStories(){
  try{
    const q = query(collection(db, 'stories'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    STORIES = snap.docs.map(docSnap => {
      const d = docSnap.data();
      const createdAt = d.createdAt?.toDate ? d.createdAt.toDate() : new Date();
      return {
        id: docSnap.id,
        image: d.image,
        title: d.title,
        cat: d.category,
        excerpt: excerptFromHTML(d.contentHTML || ''),
        author: d.author,
        userId: d.userId,
        date: createdAt.toISOString().slice(0, 10),
        readTime: readTimeFromHTML(d.contentHTML || ''),
        content: d.contentHTML
      };
    });
  } catch(err){
    console.error('Failed to load stories:', err);
    STORIES = [];
  }
  renderGrid();
}

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
        <img src="${story.image}" alt="Thumbnail for ${story.title}" loading="lazy">
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
  readImg.src = story.image;
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

function openEditor(){
  if(!auth.currentUser){
    alert('Please sign in to share your story.');
    return;
  }
  editorOverlay.classList.add('open'); document.body.style.overflow = 'hidden';
}
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
   SUBMIT — real Firebase/Cloudinary integration, same pattern
   as photography.js: compress the thumbnail in-browser before
   upload (max 1920px, JPEG 82%, 25MB hard cap), push it to
   Cloudinary, then addDoc() the story straight to Firestore.
   No pending-review gate — a successful write is live immediately.
   --------------------------------------------------------- */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB hard cap

function compressImage(file, maxDim = 1920, quality = 0.82){
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    img.onload = () => {
      let { width, height } = img;
      if(width > maxDim || height > maxDim){
        if(width > height){ height = Math.round(height * (maxDim / width)); width = maxDim; }
        else { width = Math.round(width * (maxDim / height)); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Image compression failed.')),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Could not load the image file.'));
    reader.readAsDataURL(file);
  });
}

async function uploadToCloudinary(blob){
  const form = new FormData();
  form.append('file', blob);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form
  });
  const data = await res.json();
  if(!res.ok || !data.secure_url){
    throw new Error(data?.error?.message || 'Cloudinary upload failed.');
  }
  return data.secure_url;
}

async function publishStory({ title, author, category, thumbFile, contentHTML }){
  if(!auth.currentUser) throw new Error('Please sign in to share your story.');
  if(thumbFile.size > MAX_UPLOAD_BYTES) throw new Error('That image is too large — please use a file under 25MB.');

  const compressed = await compressImage(thumbFile);
  const imageUrl = await uploadToCloudinary(compressed);

  await addDoc(collection(db, 'stories'), {
    title,
    author,
    category,
    contentHTML,
    image: imageUrl,
    userId: auth.currentUser.uid,
    createdAt: serverTimestamp()
  });

  // Show it immediately without waiting on a refetch
  STORIES.unshift({
    id: `local-${Date.now()}`,
    image: imageUrl,
    title, cat: category, author,
    userId: auth.currentUser.uid,
    excerpt: excerptFromHTML(contentHTML),
    date: new Date().toISOString().slice(0, 10),
    readTime: readTimeFromHTML(contentHTML),
    content: contentHTML
  });
  currentPage = 1;
  renderGrid();
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

  const submitBtn = storyForm.querySelector('.editor-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Publishing…';

  try{
    await publishStory({ title, author, category, thumbFile, contentHTML });
    editorFormView.style.display = 'none';
    editorSuccess.classList.add('show');
  } catch(err){
    console.error(err);
    alert(err.message || 'Something went wrong publishing your story. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publish story';
  }
});

/* ---------------- Init ---------------- */
loadStories();