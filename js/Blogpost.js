import { auth } from "./firebase.js";
import { db } from "./firestore.js";

import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  doc,
  getDoc,
  setDoc,
  runTransaction,
  increment
} from "firebase/firestore";

/* ==========================================================
   This page currently holds a single, hand-written article.
   Its reactions and comments are stored under a fixed slug so
   that if this file is duplicated for a future post, only this
   one constant needs to change — everything else keeps working.

   Firestore shape:
     articles/{ARTICLE_SLUG}.reactions = { heart: 3, haha: 1, ... }
     articles/{ARTICLE_SLUG}/reactedUsers/{uid} = { emoji: "heart" }
     articles/{ARTICLE_SLUG}/comments/{commentId} = { text, userId, userName, userPhoto, createdAt }
========================================================== */
const ARTICLE_SLUG = "welcome-to-aperture-log";

/* ---------------- Scroll progress ---------------- */
const scrollBar = document.getElementById("scroll-bar");

window.addEventListener("scroll", () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
  scrollBar.style.width = scrolled + "%";
});

/* ---------------- Table of contents highlight ---------------- */
const headings = document.querySelectorAll(".post-body h2[id]");
const tocLinks = document.querySelectorAll("#toc-list a");

const tocObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        tocLinks.forEach((l) => l.classList.remove("active"));
        const active = document.querySelector(`#toc-list a[href="#${entry.target.id}"]`);
        if (active) active.classList.add("active");
      }
    });
  },
  { rootMargin: "-20% 0px -70% 0px" }
);

headings.forEach((h) => tocObserver.observe(h));

/* ---------------- Share buttons ---------------- */
const pageUrl = window.location.href;
const pageTitle = document.title;

document.getElementById("share-x")?.addEventListener("click", () => {
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(pageTitle)}&url=${encodeURIComponent(pageUrl)}`,
    "_blank",
    "noopener,noreferrer"
  );
});

document.getElementById("share-linkedin")?.addEventListener("click", () => {
  window.open(
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
    "_blank",
    "noopener,noreferrer"
  );
});

document.getElementById("share-copy")?.addEventListener("click", (e) => {
  navigator.clipboard?.writeText(pageUrl).catch(() => {});
  const btn = e.currentTarget;
  const original = btn.title;
  btn.title = "Copied!";
  setTimeout(() => (btn.title = original), 1500);
});

/* ==========================================================
   Reactions — same model as the photography page.
   One reaction per signed-in user. Clicking the same emoji
   again removes it; clicking a different one switches it.
========================================================== */
const REACTIONS = [
  { key: "heart", emoji: "❤️" },
  { key: "haha", emoji: "😂" },
  { key: "wow", emoji: "😮" },
  { key: "clap", emoji: "👏" },
  { key: "fire", emoji: "🔥" }
];

const reactionsRow = document.getElementById("reactions-row");

let currentReactionCounts = {};
let currentUserReaction = null;

function renderReactions() {
  const signedIn = !!auth.currentUser;

  const buttons = REACTIONS.map((r) => {
    const count = Math.max(0, currentReactionCounts[r.key] || 0);
    const active = currentUserReaction === r.key;

    return `
      <button type="button" class="reaction-btn${active ? " active" : ""}" data-key="${r.key}">
        <span class="r-emoji">${r.emoji}</span><span class="r-count">${count}</span>
      </button>
    `;
  }).join("");

  reactionsRow.innerHTML = signedIn
    ? buttons
    : buttons + `<div class="reaction-signin-hint">Sign in to react</div>`;
}

async function loadReactions() {
  currentReactionCounts = {};
  currentUserReaction = null;

  try {
    const articleSnap = await getDoc(doc(db, "articles", ARTICLE_SLUG));

    if (articleSnap.exists()) {
      currentReactionCounts = articleSnap.data().reactions || {};
    }

    if (auth.currentUser) {
      const userSnap = await getDoc(
        doc(db, "articles", ARTICLE_SLUG, "reactedUsers", auth.currentUser.uid)
      );

      if (userSnap.exists()) {
        currentUserReaction = userSnap.data().emoji;
      }
    }
  } catch (error) {
    console.error("Failed to load reactions:", error);
  }

  renderReactions();
}

async function toggleReaction(emojiKey) {
  const articleRef = doc(db, "articles", ARTICLE_SLUG);
  const userReactionRef = doc(db, "articles", ARTICLE_SLUG, "reactedUsers", auth.currentUser.uid);

  try {
    await runTransaction(db, async (tx) => {
      const articleSnap = await tx.get(articleRef);
      const userSnap = await tx.get(userReactionRef);
      const prevKey = userSnap.exists() ? userSnap.data().emoji : null;

      // The article doc may not exist yet if this is the very first
      // reaction ever recorded — create it if needed.
      if (!articleSnap.exists()) {
        tx.set(articleRef, { reactions: {} });
      }

      const updates = {};

      if (prevKey === emojiKey) {
        updates[`reactions.${emojiKey}`] = increment(-1);
        tx.update(articleRef, updates);
        tx.delete(userReactionRef);
      } else {
        if (prevKey) {
          updates[`reactions.${prevKey}`] = increment(-1);
        }
        updates[`reactions.${emojiKey}`] = increment(1);
        tx.update(articleRef, updates);
        tx.set(userReactionRef, { emoji: emojiKey });
      }
    });

    await loadReactions();
  } catch (error) {
    console.error("Failed to update reaction:", error);
    alert("Couldn't save your reaction. Please try again.");
  }
}

reactionsRow.addEventListener("click", async (e) => {
  const btn = e.target.closest(".reaction-btn");
  if (!btn) return;

  if (!auth.currentUser) {
    alert("Please sign in to react to this article.");
    return;
  }

  await toggleReaction(btn.dataset.key);
});

/* ==========================================================
   Comments — same model as the photography page.
========================================================== */
const commentList = document.getElementById("comment-list");
const commentForm = document.getElementById("comment-form");
const commentInput = document.getElementById("comment-input");

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadComments() {
  commentList.innerHTML = `<p class="comment-empty">Loading comments...</p>`;

  try {
    const q = query(
      collection(db, "articles", ARTICLE_SLUG, "comments"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      commentList.innerHTML = `<p class="comment-empty">No comments yet — be the first to say something.</p>`;
      return;
    }

    commentList.innerHTML = snapshot.docs
      .map((docSnap) => {
        const c = docSnap.data();
        const name = c.userName || "Anonymous";
        const initials = name.charAt(0).toUpperCase();
        const avatarInner = c.userPhoto
          ? `<img src="${c.userPhoto}" alt="${name}">`
          : initials;

        const timeStr = c.createdAt
          ? c.createdAt.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "just now";

        return `
          <div class="comment-item">
            <div class="comment-avatar">${avatarInner}</div>
            <div class="comment-body">
              <span class="comment-name">${escapeHTML(name)}</span><span class="comment-time">${timeStr}</span>
              <p class="comment-text">${escapeHTML(c.text)}</p>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Failed to load comments:", error);
    commentList.innerHTML = `<p class="comment-empty">Couldn't load comments right now.</p>`;
  }
}

commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = commentInput.value.trim();
  if (!text) return;

  if (!auth.currentUser) {
    alert("Please sign in to comment.");
    return;
  }

  try {
    await addDoc(collection(db, "articles", ARTICLE_SLUG, "comments"), {
      text,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || "Anonymous",
      userPhoto: auth.currentUser.photoURL || "",
      createdAt: serverTimestamp()
    });

    commentInput.value = "";
    await loadComments();
  } catch (error) {
    console.error("Failed to post comment:", error);
    alert("Could not post your comment. Please try again.");
  }
});

/* ---------------- Init ---------------- */
loadReactions();
loadComments();
