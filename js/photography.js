import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET
} from "./cloudinary.js";

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
  runTransaction,
  increment
} from "firebase/firestore";


const bar = document.getElementById('scroll-bar');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
});

/* ---------------------------------------------------------
   PHOTO DATA
   Generated here for demo purposes — swap PHOTOS for a
   fetch() from Firebase/Firestore or Cloud Storage later.
   Each photo intentionally uses a different aspect ratio
   so the masonry layout stays natural instead of uniform.
   --------------------------------------------------------- */
const CATEGORIES = ['nature', 'landscape', 'travel', 'street', 'sky', 'macro', 'portrait'];
const CAT_LABELS = { nature: 'Nature', landscape: 'Landscape', travel: 'Travel', street: 'Street', sky: 'Skies', macro: 'Macro', portrait: 'Portrait' };
const RATIOS = [
  [800, 1000], [900, 600], [800, 800], [700, 1050], [1000, 650],
  [750, 930], [950, 560], [820, 820], [680, 980], [1100, 650]
];
const LOCATIONS = ['Guwahati, Assam', 'Shillong, Meghalaya', 'Kaziranga, Assam', 'Cherrapunji, Meghalaya', 'Majuli Island, Assam', 'Tawang, Arunachal Pradesh', 'Kolkata, West Bengal', 'Darjeeling, West Bengal', 'Dibrugarh, Assam', 'Along a highway, Assam'];
const CAMERAS = ['Sony A6400', 'Canon EOS M50', 'Nikon Z50', 'Fujifilm X-T30', 'Smartphone (Pixel)'];
const LENSES = ['16-50mm f/3.5-5.6', '35mm f/1.8', '18-55mm f/4-5.6', '50mm f/1.8', 'Native wide (smartphone)'];
const STORIES = [
  'Shot right before the light disappeared — one of those moments where waiting five more minutes made all the difference.',
  'Took a dozen frames before the composition finally felt balanced.',
  'This one almost didn\'t happen — the weather turned just long enough for a clear shot.',
  'A quiet, unplanned moment that ended up being one of my favorites from the trip.',
  'Revisited this spot three times across different seasons before getting the light right.'
];

const PHOTOS = [];

const PER_PAGE = 50;
let currentPage = 1;
let activeCat = 'all';

const grid = document.getElementById('masonry-grid');
const resultCount = document.getElementById('result-count');
const noResults = document.getElementById('no-results');
const paginationEl = document.getElementById('pagination');
const filterPills = document.querySelectorAll('.filter-pill');

/**
 * Inserts a Cloudinary transformation string into a delivery URL
 * so the browser downloads an appropriately-sized image instead
 * of the full original file.
 *
 * This is the actual fix for the "photos take 5 seconds to load"
 * problem: uploaded photos are compressed to up to 1920px before
 * upload, but the grid tiles only display at ~300-400px. Without
 * a transform, every tile was downloading the FULL 1920px image
 * just to shrink it down with CSS — massively oversized payloads.
 *
 * f_auto  → serves WebP/AVIF automatically when the browser supports it
 * q_auto  → Cloudinary picks the smallest quality that still looks good
 * c_limit → resizes down to fit within the given width, never upscales
 */
function cldTransform(url, transform) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/${transform}/`);
}

function getFiltered() {
  return activeCat === 'all' ? PHOTOS : PHOTOS.filter(p => p.cat === activeCat);
}

let currentPageItems = [];
function renderGrid() {
  const filtered = getFiltered();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PER_PAGE;
  currentPageItems = filtered.slice(start, start + PER_PAGE);

  grid.innerHTML = '';
  currentPageItems.forEach((photo, idx) => {
    const tile = document.createElement('div');
    tile.className = 'photo-tile';
    tile.dataset.idx = idx;

    // The first handful of tiles are visible without scrolling —
    // load those immediately at higher priority. Everything below
    // the fold stays lazy so it doesn't compete for bandwidth.
    const isAboveFold = idx < 8;
    const thumbUrl = cldTransform(photo.image, 'w_600,q_auto,f_auto,c_limit');

    // Real dimensions captured at upload time (see compressImage /
    // startFakeUpload below). Older photos uploaded before this change
    // won't have width/height saved — the attribute is just omitted
    // for those, same as before, no breakage either way.
    const dimAttrs = (photo.width && photo.height)
      ? `width="${photo.width}" height="${photo.height}"`
      : '';

    tile.innerHTML = `
    <img
      src="${thumbUrl}"
      alt="${photo.title}"
      ${dimAttrs}
      ${isAboveFold ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'}
    >

    <div class="tile-overlay">
        <span class="t-cat">${CAT_LABELS[photo.cat] ?? photo.cat}</span>
    </div>
`;
    tile.addEventListener('click', () => openLightbox(idx));
    grid.appendChild(tile);
  });

  resultCount.textContent = filtered.length;
  noResults.classList.toggle('show', filtered.length === 0);
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  paginationEl.innerHTML = '';
  paginationEl.classList.toggle('show', totalPages > 1);
  if (totalPages <= 1) return;

  function makeBtn(label, page, opts = {}) {
    const btn = document.createElement('button');
    btn.className = 'page-btn' + (opts.active ? ' active' : '');
    btn.innerHTML = label;
    btn.disabled = !!opts.disabled;
    btn.addEventListener('click', () => { currentPage = page; renderGrid(); grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    return btn;
  }

  paginationEl.appendChild(makeBtn('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg> Prev', currentPage - 1, { disabled: currentPage === 1 }));

  const pageNumbers = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) pageNumbers.push(p);
    else if (pageNumbers[pageNumbers.length - 1] !== '...') pageNumbers.push('...');
  }
  pageNumbers.forEach(p => {
    if (p === '...') {
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

/* ---------------- Lightbox ---------------- */
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbCat = document.getElementById('lb-cat');
const lbTitle = document.getElementById('lb-title');
const lbStory = document.getElementById('lb-story');
const lbLocation = document.getElementById('lb-location');
const lbDate = document.getElementById('lb-date');
const lbCamera = document.getElementById('lb-camera');
const lbLens = document.getElementById('lb-lens');
const lbSettings = document.getElementById('lb-settings');
const lbAuthor = document.getElementById('lb-author');
let lightboxIdx = 0;
let lightboxHistoryPushed = false;

function openLightbox(idx) {
  lightboxIdx = idx;
  showPhoto();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Push a dummy history entry so the phone/browser back button
  // closes the lightbox instead of navigating away from the page.
  if (!lightboxHistoryPushed) {
    history.pushState({ lightboxOpen: true }, '');
    lightboxHistoryPushed = true;
  }
}
function closeLightbox(fromPopstate = false) {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';

  if (lightboxHistoryPushed) {
    lightboxHistoryPushed = false;
    // If we're closing via the X/outside-click/Escape (not because the
    // user already pressed back), consume the pushed history entry so
    // it doesn't leave a stale extra "back" step sitting in history.
    if (!fromPopstate) history.back();
  }
}

// Phone/browser back button while the lightbox is open → close it,
// stay on the page, instead of navigating to whatever came before.
window.addEventListener('popstate', () => {
  if (lightbox.classList.contains('open')) {
    closeLightbox(true);
  }
});
function showPhoto() {
  const photo = currentPageItems[lightboxIdx];

  if (!photo) return;

  // The lightbox is much bigger than a grid tile, so it gets a
  // larger transform — still far smaller than the raw upload,
  // and still auto-optimized for format/quality.
  lbImg.src = cldTransform(photo.image, 'w_1600,q_auto,f_auto,c_limit');
  lbImg.alt = photo.title;

  lbCat.textContent = CAT_LABELS[photo.cat] ?? photo.cat;
  lbTitle.textContent = photo.title;
  lbStory.textContent = photo.story || "No story shared for this one.";
  lbLocation.textContent = photo.location;
  lbAuthor.textContent = photo.userName || "Anonymous";

  lbDate.textContent = new Date(photo.date).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );

  // Until we add EXIF data later
  lbCamera.textContent = "Unknown";
  lbLens.textContent = "Unknown";
  lbSettings.textContent = "Not provided";

  commentInput.value = "";
  loadReactions(photo.id);
  loadComments(photo.id);
}

document.getElementById('lb-close').addEventListener('click', () => closeLightbox());
document.getElementById('lb-prev').addEventListener('click', () => { lightboxIdx = (lightboxIdx - 1 + currentPageItems.length) % currentPageItems.length; showPhoto(); });
document.getElementById('lb-next').addEventListener('click', () => { lightboxIdx = (lightboxIdx + 1) % currentPageItems.length; showPhoto(); });
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') document.getElementById('lb-prev').click();
  if (e.key === 'ArrowRight') document.getElementById('lb-next').click();
});

// Disable right-click / drag on images to discourage casual saving
grid.addEventListener('contextmenu', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });
document.getElementById('lb-img').addEventListener('contextmenu', e => e.preventDefault());

/* ---------------- Upload Modal ---------------- */

/* ==========================================================
Upload Modal
========================================================== */

// Modal
const uploadModal = document.getElementById("uploadModal");
const openUpload = document.getElementById("open-upload");
const closeUpload = document.getElementById("closeUpload");

// Form
const uploadForm = document.getElementById("uploadForm");

// Upload Elements
const uploadArea = document.getElementById("uploadArea");
const photoInput = document.getElementById("photoInput");
const previewImage = document.getElementById("previewImage");
const previewWrapper = document.getElementById("previewWrapper");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const changePhotoBtn = document.getElementById("changePhotoBtn");

// Inputs
const photoTitle = document.getElementById("photoTitle");
const photoCredit = document.getElementById("photoCredit");
const photoCategory = document.getElementById("photoCategory");
const photoLocation = document.getElementById("photoLocation");
const photoStory = document.getElementById("photoStory");

// Error Messages
const imageError = document.getElementById("imageError");
const titleError = document.getElementById("titleError");
const locationError = document.getElementById("locationError");
const storyError = document.getElementById("storyError");


/* ==========================================================
   Open / Close Modal
========================================================== */

openUpload.addEventListener("click", () => {

  uploadModal.classList.add("show");
  document.body.style.overflow = "hidden";

});

closeUpload.addEventListener("click", closeModal);

uploadModal.addEventListener("click", (e) => {

  if (e.target === uploadModal) {

    closeModal();

  }

});

document.addEventListener("keydown", (e) => {

  if (e.key === "Escape") {

    closeModal();

  }

});

function closeModal() {

  uploadModal.classList.remove("show");
  document.body.style.overflow = "";

}


/* ==========================================================
   Image Preview
========================================================== */

uploadArea.addEventListener("click", () => {

  photoInput.click();

});

changePhotoBtn.addEventListener("click", (e) => {

  e.stopPropagation();

  photoInput.click();

});

photoInput.addEventListener("change", () => {

  const file = photoInput.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {

    previewImage.style.opacity = "0";

    previewImage.src = e.target.result;

    previewImage.onload = () => {

      previewWrapper.style.display = "block";

      uploadPlaceholder.style.display = "none";

      previewImage.style.transition = "opacity .35s ease";

      previewImage.style.opacity = "1";

    };

  };

  reader.readAsDataURL(file);

});


/* ==========================================================
   Validation
========================================================== */

function clearErrors() {

  uploadArea.style.borderColor = "";

  document.querySelectorAll(".form-error").forEach(error => {

    error.textContent = "";
    error.classList.remove("show");

  });

  document.querySelectorAll(".input-error").forEach(input => {

    input.classList.remove("input-error");

  });

}

uploadForm.addEventListener("submit", (e) => {

  e.preventDefault();

  clearErrors();

  let valid = true;

  if (photoInput.files.length === 0) {

    imageError.textContent = "Please choose an image.";
    imageError.classList.add("show");

    uploadArea.style.borderColor = "#ff7272";

    valid = false;

  }

  if (photoTitle.value.trim() === "") {

    titleError.textContent = "Please enter a title.";
    titleError.classList.add("show");

    photoTitle.classList.add("input-error");

    valid = false;

  }

  if (photoLocation.value.trim() === "") {

    locationError.textContent = "Please enter a location.";
    locationError.classList.add("show");

    photoLocation.classList.add("input-error");

    valid = false;

  }

  // Story Behind The Shot is now optional — no validation here.

  if (!valid) return;

  startFakeUpload();

});
/**
 * Resizes and compresses an image file in the browser before upload.
 * This matters a lot on mobile: phone camera photos are often
 * 5-20MB, which can exceed Cloudinary's unsigned upload size limit
 * and is much more likely to time out on a slow mobile connection.
 * Shrinking to a sane max dimension + JPEG quality fixes both.
 *
 * Also resolves the final { width, height } of the resized image
 * alongside the file, so the caller can save real dimensions to
 * Firestore — used later to render <img width height> attributes
 * on the gallery grid without guessing, which fixes layout shift
 * and the "missing width/height" PageSpeed flag.
 */
function compressImage(file, maxDimension = 1920, quality = 0.82) {
  return new Promise((resolve, reject) => {

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {

      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not process this image."));
            return;
          }
          resolve({
            file: new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }),
            width,
            height
          });
        },
        "image/webp",
        quality
      );

    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This file couldn't be read as an image."));
    };

    img.src = objectUrl;

  });
}

async function startFakeUpload() {

  const uploadBtn = document.querySelector(".submit-upload");
  const uploadSuccess = document.getElementById("uploadSuccess");

  uploadBtn.disabled = true;

  uploadBtn.innerHTML = `
        <span class="spinner"></span>
        Uploading...
    `;

  const rawFile = photoInput.files[0];

  try {

    // Reject absurdly large files outright (e.g. 50MB+ RAW-ish exports)
    // before even attempting to compress/upload them.
    if (rawFile.size > 25 * 1024 * 1024) {
      throw new Error("That image is too large (over 25MB). Please choose a smaller photo.");
    }

    uploadBtn.innerHTML = `<span class="spinner"></span> Preparing image...`;
    const { file, width, height } = await compressImage(rawFile);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    uploadBtn.innerHTML = `<span class="spinner"></span> Uploading...`;

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const data = await response.json();

    console.log(data);

    if (!response.ok || data.error || !data.secure_url) {
      throw new Error(data.error?.message || "Cloudinary rejected the upload.");
    }

    console.log("Image URL:", data.secure_url);

    // Credit box left blank → falls back to the signed-in account's
    // display name, same as before this change → "Anonymous" as a
    // last resort if neither is available.
    const creditName = photoCredit.value.trim() || auth.currentUser.displayName || "Anonymous";

    await addDoc(collection(db, "photos"), {

      title: photoTitle.value,

      category: photoCategory.value,

      location: photoLocation.value,

      story: photoStory.value,

      image: data.secure_url,

      // Real dimensions of the compressed image — used to render
      // width/height on the <img> tag and prevent layout shift.
      width,
      height,

      userId: auth.currentUser.uid,

      userName: creditName,

      userPhoto: auth.currentUser.photoURL,

      createdAt: serverTimestamp(),

      likes: []

    });

    console.log("Photo saved to Firestore!");

    await loadPhotos();

    document.getElementById("uploadHeader").style.display = "none";
    uploadForm.style.display = "none";

    uploadSuccess.classList.add("show");

  } catch (error) {

    console.error(error);

    alert(`Upload failed: ${error.message || "Please check your connection and try again."}`);

  } finally {

    uploadBtn.disabled = false;
    uploadBtn.innerHTML = "Upload Photo";

  }

}

const continueBtn = document.getElementById("continueBtn");

continueBtn.addEventListener("click", () => {

  document.getElementById("uploadSuccess").classList.remove("show");

  document.getElementById("uploadHeader").style.display = "block";

  uploadForm.style.display = "block";

  const uploadBtn = document.querySelector(".submit-upload");

  uploadBtn.disabled = false;

  uploadBtn.innerHTML = "Upload Photo";
  uploadForm.reset();

  previewWrapper.style.display = "none";
  uploadPlaceholder.style.display = "flex";
  previewImage.src = "";



});
/* ==========================================================
   Live Validation
========================================================== */

photoTitle.addEventListener("input", () => {

  photoTitle.classList.remove("input-error");

  titleError.textContent = "";
  titleError.classList.remove("show");

});

photoLocation.addEventListener("input", () => {

  photoLocation.classList.remove("input-error");

  locationError.textContent = "";
  locationError.classList.remove("show");

});

photoStory.addEventListener("input", () => {

  photoStory.classList.remove("input-error");

  storyError.textContent = "";
  storyError.classList.remove("show");

});

photoInput.addEventListener("change", () => {

  uploadArea.style.borderColor = "";

  imageError.textContent = "";
  imageError.classList.remove("show");

});

async function loadPhotos() {

  // Show loading state immediately
  resultCount.textContent = "Loading...";
  grid.innerHTML = `
    <div class="loading">
      Loading photos...
    </div>
  `;

  const q = query(
    collection(db, "photos"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  PHOTOS.length = 0;

  snapshot.forEach((doc) => {

    const photo = doc.data();

    PHOTOS.push({

      id: doc.id,

      image: photo.image,

      cat: (photo.category || "nature").toLowerCase(),

      title: photo.title,

      location: photo.location,

      story: photo.story,

      // Real dimensions if this photo was uploaded after the fix —
      // undefined for older photos, which is fine, renderGrid()
      // just omits the width/height attributes for those.
      width: photo.width,
      height: photo.height,

      date: photo.createdAt
        ? photo.createdAt.toDate().toISOString()
        : new Date().toISOString(),

      userName: photo.userName,

      userPhoto: photo.userPhoto,

      likes: photo.likes ?? []

    });

  });

  renderGrid();

}

loadPhotos();

/* ==========================================================
   Reactions
   ----------------------------------------------------------
   Data model:
     photos/{photoId}.reactions = { heart: 3, haha: 1, wow: 0, clap: 2, fire: 5 }
     photos/{photoId}/reactedUsers/{uid} = { emoji: "heart" }

   One reaction per signed-in user per photo. Clicking the same
   emoji again removes it; clicking a different emoji switches
   it. Counts are updated atomically with a transaction so two
   people reacting at the same moment can't corrupt the count.
========================================================== */

const REACTIONS = [
  { key: "heart", emoji: "❤️" },
  { key: "haha", emoji: "😂" },
  { key: "wow", emoji: "😮" },
  { key: "clap", emoji: "👏" },
  { key: "fire", emoji: "🔥" }
];

const lbReactions = document.getElementById("lb-reactions");

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

  lbReactions.innerHTML = signedIn
    ? buttons
    : buttons + `<div class="reaction-signin-hint">Sign in to react</div>`;

}

async function loadReactions(photoId) {

  currentReactionCounts = {};
  currentUserReaction = null;

  try {

    const photoSnap = await getDoc(doc(db, "photos", photoId));

    if (photoSnap.exists()) {
      currentReactionCounts = photoSnap.data().reactions || {};
    }

    if (auth.currentUser) {

      const userSnap = await getDoc(
        doc(db, "photos", photoId, "reactedUsers", auth.currentUser.uid)
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

async function toggleReaction(photoId, emojiKey) {

  const photoRef = doc(db, "photos", photoId);
  const userReactionRef = doc(db, "photos", photoId, "reactedUsers", auth.currentUser.uid);

  try {

    await runTransaction(db, async (tx) => {

      const userSnap = await tx.get(userReactionRef);
      const prevKey = userSnap.exists() ? userSnap.data().emoji : null;
      const updates = {};

      if (prevKey === emojiKey) {

        // Same emoji clicked again — remove the reaction
        updates[`reactions.${emojiKey}`] = increment(-1);
        tx.update(photoRef, updates);
        tx.delete(userReactionRef);

      } else {

        // New reaction, or switching from a different emoji
        if (prevKey) {
          updates[`reactions.${prevKey}`] = increment(-1);
        }

        updates[`reactions.${emojiKey}`] = increment(1);
        tx.update(photoRef, updates);
        tx.set(userReactionRef, { emoji: emojiKey });

      }

    });

    await loadReactions(photoId);

  } catch (error) {

    console.error("Failed to update reaction:", error);
    alert("Couldn't save your reaction. Please try again.");

  }

}

lbReactions.addEventListener("click", async (e) => {

  const btn = e.target.closest(".reaction-btn");
  if (!btn) return;

  const photo = currentPageItems[lightboxIdx];
  if (!photo) return;

  if (!auth.currentUser) {
    alert("Please sign in to react to a photo.");
    return;
  }

  await toggleReaction(photo.id, btn.dataset.key);

});

/* ==========================================================
   Comments
   ----------------------------------------------------------
   Stored as a subcollection: photos/{photoId}/comments
   Each comment: { text, userId, userName, userPhoto, createdAt }
========================================================== */

const commentList = document.getElementById("comment-list");
const commentForm = document.getElementById("comment-form");
const commentInput = document.getElementById("comment-input");

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function loadComments(photoId) {

  commentList.innerHTML = `<p class="comment-empty">Loading comments...</p>`;

  try {

    const q = query(
      collection(db, "photos", photoId, "comments"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      commentList.innerHTML = `<p class="comment-empty">No comments yet — be the first to say something.</p>`;
      return;
    }

    commentList.innerHTML = snapshot.docs.map((docSnap) => {

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

    }).join("");

  } catch (error) {

    console.error("Failed to load comments:", error);
    commentList.innerHTML = `<p class="comment-empty">Couldn't load comments right now.</p>`;

  }

}

commentForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const photo = currentPageItems[lightboxIdx];
  if (!photo) return;

  const text = commentInput.value.trim();
  if (!text) return;

  if (!auth.currentUser) {
    alert("Please sign in to comment.");
    return;
  }

  try {

    await addDoc(collection(db, "photos", photo.id, "comments"), {
      text,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.displayName || "Anonymous",
      userPhoto: auth.currentUser.photoURL || "",
      createdAt: serverTimestamp()
    });

    commentInput.value = "";
    await loadComments(photo.id);

  } catch (error) {

    console.error("Failed to post comment:", error);
    alert("Could not post your comment. Please try again.");

  }

});