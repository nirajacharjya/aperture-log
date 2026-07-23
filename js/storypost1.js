import { auth } from "./firebase.js";
import { db } from "./firestore.js";
  import {
    collection, addDoc, getDocs, query, orderBy, serverTimestamp,
    doc, getDoc, runTransaction, increment
  } from "firebase/firestore";

  const bar = document.getElementById('scroll-bar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
  });

  // Fixed Firestore doc ID for this hand-picked story — must match a doc
  // you create in the Firestore Console under the "stories" collection.
  const STORY_ID = '217-dinner-saga';

  const REACTIONS = [
    { key: 'heart', emoji: '❤️' },
    { key: 'haha', emoji: '😂' },
    { key: 'wow', emoji: '😮' },
    { key: 'clap', emoji: '👏' },
    { key: 'fire', emoji: '🔥' }
  ];

  const reactionsEl = document.getElementById('story-reactions');
  const commentForm = document.getElementById('story-comment-form');
  const commentInput = document.getElementById('story-comment-input');
  const commentList = document.getElementById('story-comment-list');

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

  loadReactions();
  loadComments();