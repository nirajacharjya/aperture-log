/* ===========================================================
   Aperture Log — Dynamic story page
   Reads ?id=<firestoreDocId> from the URL, fetches that story
   from Firestore, and fills in the storypost1.html-style layout.
   Reactions + comments use the same data model as stories.js:
     stories/{storyId}.reactions = { heart, haha, wow, clap, fire }
     stories/{storyId}/reactedUsers/{uid} = { emoji }
     stories/{storyId}/comments/{commentId} = { text, userId, userName, userPhoto, createdAt }
   =========================================================== */
import { auth } from "./firebase.js";
import { db } from "./firestore.js";
import {
  doc, getDoc, collection, addDoc, getDocs, query, orderBy,
  serverTimestamp, runTransaction, increment
} from "firebase/firestore";

const bar = document.getElementById('scroll-bar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
});

const CAT_LABELS = { personal:'Personal', learning:'Learning', travel:'Travel', career:'Career', other:'Other' };

/** Same Cloudinary size/format fix used in stories.js and photography.js. */
function cldTransform(url, transform) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transform}/`);
}

const STORY_ID = new URLSearchParams(window.location.search).get('id');

const articleEl = document.getElementById('story-article');
const notFoundEl = document.getElementById('story-not-found');

const bcTitle = document.getElementById('bc-title');
const eyebrowEl = document.getElementById('story-eyebrow');
const titleEl = document.getElementById('story-title');
const bylineNameEl = document.getElementById('story-byline');
const bylineMetaEl = document.getElementById('story-byline-meta');
const imgEl = document.getElementById('story-img');
const contentEl = document.getElementById('story-content');
const bioNameEl = document.getElementById('bio-name');
const bioTextEl = document.getElementById('bio-text');

const reactionsEl = document.getElementById('story-reactions');
const commentForm = document.getElementById('story-comment-form');
const commentInput = document.getElementById('story-comment-input');
const commentList = document.getElementById('story-comment-list');

function excerptFromHTML(html, max = 160){
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max).trim() + '…' : text;
}
function readTimeFromHTML(html){
  const words = html.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 200));
}
function setMeta(id, content){
  if(!content) return;
  const el = document.getElementById(id);
  if(el) el.setAttribute('content', content);
}
function showNotFound(){
  articleEl.style.display = 'none';
  notFoundEl.style.display = 'flex';
}

async function loadStory(){
  if(!STORY_ID){ showNotFound(); return; }

  try{
    const snap = await getDoc(doc(db, 'stories', STORY_ID));
    if(!snap.exists()){ showNotFound(); return; }

    const d = snap.data();
    const createdAt = d.createdAt?.toDate ? d.createdAt.toDate() : new Date();
    const readTime = readTimeFromHTML(d.contentHTML || '');
    const dateStr = createdAt.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    const excerpt = excerptFromHTML(d.contentHTML || '');
    const pageUrl = window.location.href;

    document.getElementById('doc-title').textContent = `${d.title} | Aperture Log`;
    setMeta('meta-description', excerpt);
    setMeta('og-title', d.title);
    setMeta('og-description', excerpt);
    setMeta('og-image', cldTransform(d.image, 'w_1200,q_auto,f_auto,c_limit'));
    setMeta('og-url', pageUrl);
    setMeta('twitter-title', d.title);
    setMeta('twitter-description', excerpt);
    setMeta('twitter-image', cldTransform(d.image, 'w_1200,q_auto,f_auto,c_limit'));
    document.getElementById('canonical-link').setAttribute('href', pageUrl);

    bcTitle.textContent = d.title;
    eyebrowEl.textContent = CAT_LABELS[d.category] || 'Story';
    titleEl.textContent = d.title;
    bylineNameEl.textContent = d.author || 'Anonymous';
    bylineMetaEl.textContent = `${dateStr} · ${readTime} min read`;
    imgEl.src = cldTransform(d.image, 'w_1400,q_auto,f_auto,c_limit');
    imgEl.alt = d.title;
    contentEl.innerHTML = d.contentHTML || '';
    bioNameEl.textContent = `Written by ${d.author || 'Anonymous'}`;
    bioTextEl.textContent = 'Shared as part of the Aperture Log stories community.';

    wireShareButtons(d.title, pageUrl);
    loadReactions();
    loadComments();
  } catch(err){
    console.error('Failed to load story:', err);
    showNotFound();
  }
}

function wireShareButtons(title, url){
  document.getElementById('share-x').addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
  });
  document.getElementById('share-linkedin').addEventListener('click', () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  });
  document.getElementById('share-copy').addEventListener('click', async (e) => {
    await navigator.clipboard.writeText(url);
    const btn = e.currentTarget;
    const original = btn.innerHTML;
    btn.innerHTML = '✓';
    setTimeout(() => { btn.innerHTML = original; }, 1500);
  });
}

/* ---------------- Reactions ---------------- */
const REACTIONS = [
  { key: 'heart', emoji: '❤️' },
  { key: 'haha', emoji: '😂' },
  { key: 'wow', emoji: '😮' },
  { key: 'clap', emoji: '👏' },
  { key: 'fire', emoji: '🔥' }
];

let reactionCounts = {};
let userReaction = null;

function renderReactions(){
  const signedIn = !!auth.currentUser;
  const buttons = REACTIONS.map(r => {
    const count = Math.max(0, reactionCounts[r.key] || 0);
    const active = userReaction === r.key;
    return `
      <button type="button" class="reaction-btn${active ? ' active' : ''}" data-key="${r.key}">
        <span class="r-emoji">${r.emoji}</span><span class="r-count">${count}</span>
      </button>
    `;
  }).join('');
  reactionsEl.innerHTML = signedIn ? buttons : buttons + `<span class="reaction-signin-hint">Sign in to react</span>`;
}

async function loadReactions(){
  reactionCounts = {};
  userReaction = null;
  try{
    const snap = await getDoc(doc(db, 'stories', STORY_ID));
    if(snap.exists()) reactionCounts = snap.data().reactions || {};
    if(auth.currentUser){
      const userSnap = await getDoc(doc(db, 'stories', STORY_ID, 'reactedUsers', auth.currentUser.uid));
      if(userSnap.exists()) userReaction = userSnap.data().emoji;
    }
  } catch(err){
    console.error('Failed to load reactions:', err);
  }
  renderReactions();
}

async function toggleReaction(emojiKey){
  const storyRef = doc(db, 'stories', STORY_ID);
  const userReactionRef = doc(db, 'stories', STORY_ID, 'reactedUsers', auth.currentUser.uid);
  try{
    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userReactionRef);
      const prevKey = userSnap.exists() ? userSnap.data().emoji : null;
      const updates = {};
      if(prevKey === emojiKey){
        updates[`reactions.${emojiKey}`] = increment(-1);
        tx.update(storyRef, updates);
        tx.delete(userReactionRef);
      } else {
        if(prevKey) updates[`reactions.${prevKey}`] = increment(-1);
        updates[`reactions.${emojiKey}`] = increment(1);
        tx.update(storyRef, updates);
        tx.set(userReactionRef, { emoji: emojiKey });
      }
    });
    await loadReactions();
  } catch(err){
    console.error('Failed to update reaction:', err);
    alert("Couldn't save your reaction. Please try again.");
  }
}

reactionsEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('.reaction-btn');
  if(!btn) return;
  if(!auth.currentUser){ alert('Please sign in to react to this story.'); return; }
  await toggleReaction(btn.dataset.key);
});

/* ---------------- Comments ---------------- */
function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadComments(){
  commentList.innerHTML = `<p class="comment-empty">Loading comments...</p>`;
  try{
    const q = query(collection(db, 'stories', STORY_ID, 'comments'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if(snap.empty){
      commentList.innerHTML = `<p class="comment-empty">No comments yet — be the first to say something.</p>`;
      return;
    }
    commentList.innerHTML = snap.docs.map(docSnap => {
      const c = docSnap.data();
      const name = c.userName || 'Anonymous';
      const initials = name.charAt(0).toUpperCase();
      const avatarInner = c.userPhoto ? `<img src="${c.userPhoto}" alt="${name}">` : initials;
      const timeStr = c.createdAt ? c.createdAt.toDate().toLocaleDateString('en-US', { month:'short', day:'numeric' }) : 'just now';
      return `
        <div class="comment-item">
          <div class="comment-avatar">${avatarInner}</div>
          <div class="comment-body">
            <span class="comment-name">${escapeHTML(name)}</span><span class="comment-time">${timeStr}</span>
            <p class="comment-text">${escapeHTML(c.text)}</p>
          </div>
        </div>
      `;
    }).join('');
  } catch(err){
    console.error('Failed to load comments:', err);
    commentList.innerHTML = `<p class="comment-empty">Couldn't load comments right now.</p>`;
  }
}

commentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = commentInput.value.trim();
  if(!text) return;
  if(!auth.currentUser){ alert('Please sign in to comment.'); return; }
  try{
    await addDoc(collection(db, 'stories', STORY_ID, 'comments'), {
      text,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || 'Anonymous',
      userPhoto: auth.currentUser.photoURL || '',
      createdAt: serverTimestamp()
    });
    commentInput.value = '';
    await loadComments();
  } catch(err){
    console.error('Failed to post comment:', err);
    alert('Could not post your comment. Please try again.');
  }
});

loadStory();
