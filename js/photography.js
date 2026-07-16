import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET
} from "./cloudinary.js";

import { db, auth } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy
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
    tile.innerHTML = `
    <img src="${photo.image}" alt="${photo.title}" loading="lazy">

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
let lightboxIdx = 0;

function openLightbox(idx) {
  lightboxIdx = idx;
  showPhoto();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}
function showPhoto() {
  const photo = currentPageItems[lightboxIdx];

  if (!photo) return;

  lbImg.src = photo.image;
  lbImg.alt = photo.title;

  lbCat.textContent = CAT_LABELS[photo.cat] ?? photo.cat;
  lbTitle.textContent = photo.title;
  lbStory.textContent = photo.story;
  lbLocation.textContent = photo.location;

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
}

document.getElementById('lb-close').addEventListener('click', closeLightbox);
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

  if (photoStory.value.trim() === "") {

    storyError.textContent = "Please tell the story behind the shot.";
    storyError.classList.add("show");

    photoStory.classList.add("input-error");

    valid = false;

  }

  if (!valid) return;

  startFakeUpload();

});
async function startFakeUpload() {

  const uploadBtn = document.querySelector(".submit-upload");
  const uploadSuccess = document.getElementById("uploadSuccess");

  uploadBtn.disabled = true;

  uploadBtn.innerHTML = `
        <span class="spinner"></span>
        Uploading...
    `;

  const file = photoInput.files[0];

  const formData = new FormData();

  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  try {

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const data = await response.json();

    console.log(data);

    console.log("Image URL:", data.secure_url);

    await addDoc(collection(db, "photos"), {

      title: photoTitle.value,

      category: photoCategory.value,

      location: photoLocation.value,

      story: photoStory.value,

      image: data.secure_url,

      userId: auth.currentUser.uid,

      userName: auth.currentUser.displayName,

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

    alert("Upload Failed");

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
