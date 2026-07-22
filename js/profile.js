import { db, auth } from "./firebase.js";
import {
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

/* ==========================================================
   Auth gate
   ----------------------------------------------------------
   This page is signed-in-only. While Firebase is figuring out
   whether there's a session, we show a small loading screen;
   once we know, we either show the profile or a "please sign
   in" message (no photos/stories are ever fetched for a
   signed-out visitor).
========================================================== */

const checkingGate = document.getElementById("checkingGate");
const signedOutGate = document.getElementById("signedOutGate");
const profileContent = document.getElementById("profileContent");

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  checkingGate.style.display = "none";

  if (!user) {
    signedOutGate.style.display = "flex";
    profileContent.style.display = "none";
    return;
  }

  currentUser = user;
  signedOutGate.style.display = "none";
  profileContent.style.display = "block";

  renderUserHeader(user);
  loadMyPhotos();
  loadMyStories();
});

function renderUserHeader(user) {
  document.getElementById("pAvatar").src = user.photoURL || "";
  document.getElementById("pName").textContent = user.displayName || "Your Profile";
  document.getElementById("pEmail").textContent = user.email || "";
}

/* ==========================================================
   Tabs
========================================================== */

const tabButtons = document.querySelectorAll(".tab-pill");
const panels = {
  photos: document.getElementById("panel-photos"),
  stories: document.getElementById("panel-stories")
};

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    Object.values(panels).forEach((p) => p.classList.remove("active"));
    panels[btn.dataset.tab].classList.add("active");
  });
});

/* ==========================================================
   Category label helpers (photos store the category exactly
   as chosen from the upload dropdown, e.g. "Nature")
========================================================== */

const STORY_CAT_LABELS = {
  personal: "Personal",
  learning: "Learning",
  travel: "Travel",
  career: "Career",
  other: "Other"
};

/* ==========================================================
   Load + render photos
   ----------------------------------------------------------
   NOTE: this query filters by userId and sorts by createdAt,
   which needs a Firestore composite index. The first time
   this page runs, check the browser console — Firestore will
   print a direct link to auto-create that index if it's
   missing. One-time setup, nothing to build manually.
========================================================== */

let myPhotos = [];

async function loadMyPhotos() {
  const loadingEl = document.getElementById("photosLoading");
  const gridEl = document.getElementById("photosGrid");
  const emptyEl = document.getElementById("photosEmpty");

  loadingEl.style.display = "block";
  gridEl.innerHTML = "";
  emptyEl.style.display = "none";

  try {
    const q = query(
      collection(db, "photos"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);

    myPhotos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Failed to load your photos:", error);
    myPhotos = [];
  }

  loadingEl.style.display = "none";
  document.getElementById("pPhotoCount").textContent = myPhotos.length;
  renderPhotos();
}

function cldTransform(url, transform) {
  if (!url || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/${transform}/`);
}

function renderPhotos() {
  const gridEl = document.getElementById("photosGrid");
  const emptyEl = document.getElementById("photosEmpty");

  if (myPhotos.length === 0) {
    gridEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  gridEl.innerHTML = myPhotos.map((photo) => `
    <div class="p-card" data-id="${photo.id}">
      <div class="p-media">
        <img src="${cldTransform(photo.image, "w_500,q_auto,f_auto,c_limit")}" alt="${escapeHTML(photo.title || "")}" loading="lazy">
        <span class="p-cat-badge">${escapeHTML(photo.category || "")}</span>
      </div>
      <div class="p-body">
        <div class="title-row">
          <h4>${escapeHTML(photo.title || "Untitled")}</h4>
          <div class="card-menu">
            <button class="kebab-btn" data-menu-toggle title="Options">⋮</button>
            <div class="card-menu-dropdown">
              <button data-action="edit-photo" data-id="${photo.id}">Edit</button>
              <button class="delete-option" data-action="delete-photo" data-id="${photo.id}">Delete</button>
            </div>
          </div>
        </div>
        <span class="p-loc">${escapeHTML(photo.location || "")}</span>
      </div>
    </div>
  `).join("");
}

document.getElementById("photosGrid").addEventListener("click", (e) => {
  if (handleCardMenuToggle(e)) return;

  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const photo = myPhotos.find((p) => p.id === btn.dataset.id);
  if (!photo) return;

  closeAllCardMenus();
  if (btn.dataset.action === "edit-photo") openEditPhotoModal(photo);
  if (btn.dataset.action === "delete-photo") openDeleteModal("photo", photo);
});

/* ==========================================================
   Load + render stories
========================================================== */

let myStories = [];

async function loadMyStories() {
  const loadingEl = document.getElementById("storiesLoading");
  const gridEl = document.getElementById("storiesGrid");
  const emptyEl = document.getElementById("storiesEmpty");

  loadingEl.style.display = "block";
  gridEl.innerHTML = "";
  emptyEl.style.display = "none";

  try {
    const q = query(
      collection(db, "stories"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);

    myStories = snap.docs.map((d) => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      return {
        id: d.id,
        image: data.image,
        title: data.title,
        category: data.category,
        author: data.author,
        contentHTML: data.contentHTML,
        date: createdAt.toISOString().slice(0, 10)
      };
    });
  } catch (error) {
    console.error("Failed to load your stories:", error);
    myStories = [];
  }

  loadingEl.style.display = "none";
  document.getElementById("pStoryCount").textContent = myStories.length;
  renderStories();
}

function excerptFromHTML(html, max = 140) {
  const text = (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max).trim() + "…" : text;
}

function renderStories() {
  const gridEl = document.getElementById("storiesGrid");
  const emptyEl = document.getElementById("storiesEmpty");

  if (myStories.length === 0) {
    gridEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  gridEl.innerHTML = myStories.map((story) => `
    <div class="story-card" data-id="${story.id}">
      <div class="sc-media">
        <img src="${cldTransform(story.image, "w_500,q_auto,f_auto,c_limit")}" alt="${escapeHTML(story.title || "")}" loading="lazy">
        <span class="sc-cat">${escapeHTML(STORY_CAT_LABELS[story.category] || story.category || "")}</span>
      </div>
      <div class="sc-body">
        <div class="title-row">
          <h4>${escapeHTML(story.title || "Untitled")}</h4>
          <div class="card-menu">
            <button class="kebab-btn" data-menu-toggle title="Options">⋮</button>
            <div class="card-menu-dropdown">
              <button data-action="edit-story" data-id="${story.id}">Edit</button>
              <button class="delete-option" data-action="delete-story" data-id="${story.id}">Delete</button>
            </div>
          </div>
        </div>
        <p class="sc-excerpt">${escapeHTML(excerptFromHTML(story.contentHTML))}</p>
        <span class="sc-meta">${story.date}</span>
      </div>
    </div>
  `).join("");
}

document.getElementById("storiesGrid").addEventListener("click", (e) => {
  if (handleCardMenuToggle(e)) return;

  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const story = myStories.find((s) => s.id === btn.dataset.id);
  if (!story) return;

  closeAllCardMenus();
  if (btn.dataset.action === "edit-story") openEditStoryModal(story);
  if (btn.dataset.action === "delete-story") openDeleteModal("story", story);
});

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

/* ==========================================================
   Card kebab (⋮) menus
   ----------------------------------------------------------
   Each card has its own hidden dropdown with Edit/Delete.
   Only one is ever open at a time; clicking anywhere outside
   a card menu closes whatever's open.
========================================================== */

function closeAllCardMenus() {
  document.querySelectorAll(".card-menu-dropdown.show").forEach((el) => el.classList.remove("show"));
}

// Returns true if the click was on a kebab button (so callers
// can bail out early instead of also treating it as a card click).
function handleCardMenuToggle(e) {
  const toggleBtn = e.target.closest("[data-menu-toggle]");
  if (!toggleBtn) return false;

  const dropdown = toggleBtn.nextElementSibling;
  const alreadyOpen = dropdown.classList.contains("show");
  closeAllCardMenus();
  if (!alreadyOpen) dropdown.classList.add("show");
  return true;
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".card-menu")) closeAllCardMenus();
});

/* ==========================================================
   Edit Photo modal
========================================================== */

const editPhotoModal = document.getElementById("editPhotoModal");
const editPhotoForm = document.getElementById("editPhotoForm");
const epTitle = document.getElementById("epTitle");
const epCategory = document.getElementById("epCategory");
const epLocation = document.getElementById("epLocation");
const epStory = document.getElementById("epStory");
const epTitleError = document.getElementById("epTitleError");
const epLocationError = document.getElementById("epLocationError");
const epSubmitBtn = document.getElementById("epSubmitBtn");

let editingPhotoId = null;

function openEditPhotoModal(photo) {
  editingPhotoId = photo.id;
  epTitle.value = photo.title || "";
  epCategory.value = photo.category || "Nature";
  epLocation.value = photo.location || "";
  epStory.value = photo.story || "";
  clearFieldError(epTitle, epTitleError);
  clearFieldError(epLocation, epLocationError);
  editPhotoModal.classList.add("show");
}

function closeEditPhotoModal() {
  editPhotoModal.classList.remove("show");
  editingPhotoId = null;
}

document.getElementById("closeEditPhoto").addEventListener("click", closeEditPhotoModal);
editPhotoModal.addEventListener("click", (e) => { if (e.target === editPhotoModal) closeEditPhotoModal(); });

epTitle.addEventListener("input", () => clearFieldError(epTitle, epTitleError));
epLocation.addEventListener("input", () => clearFieldError(epLocation, epLocationError));

editPhotoForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  let hasError = false;
  if (epTitle.value.trim() === "") { setFieldError(epTitle, epTitleError, "Title is required."); hasError = true; }
  if (epLocation.value.trim() === "") { setFieldError(epLocation, epLocationError, "Location is required."); hasError = true; }
  if (hasError) return;

  epSubmitBtn.disabled = true;
  epSubmitBtn.textContent = "Saving…";

  try {
    await updateDoc(doc(db, "photos", editingPhotoId), {
      title: epTitle.value.trim(),
      category: epCategory.value,
      location: epLocation.value.trim(),
      story: epStory.value.trim()
    });

    const idx = myPhotos.findIndex((p) => p.id === editingPhotoId);
    if (idx !== -1) {
      myPhotos[idx] = {
        ...myPhotos[idx],
        title: epTitle.value.trim(),
        category: epCategory.value,
        location: epLocation.value.trim(),
        story: epStory.value.trim()
      };
    }
    renderPhotos();
    closeEditPhotoModal();
  } catch (error) {
    console.error("Failed to update photo:", error);
    alert("Couldn't save your changes. Please try again.");
  } finally {
    epSubmitBtn.disabled = false;
    epSubmitBtn.textContent = "Save Changes";
  }
});

/* ==========================================================
   Edit Story modal (lightweight rich-text editor)
========================================================== */

const editStoryModal = document.getElementById("editStoryModal");
const editStoryForm = document.getElementById("editStoryForm");
const esTitle = document.getElementById("esTitle");
const esCategory = document.getElementById("esCategory");
const esEditor = document.getElementById("esEditor");
const esToolbar = document.getElementById("esToolbar");
const esTitleError = document.getElementById("esTitleError");
const esContentError = document.getElementById("esContentError");
const esSubmitBtn = document.getElementById("esSubmitBtn");

let editingStoryId = null;

esToolbar.querySelectorAll(".rt-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    esEditor.focus();
    if (btn.dataset.cmd) document.execCommand(btn.dataset.cmd, false, null);
    if (btn.dataset.block) document.execCommand("formatBlock", false, btn.dataset.block);
  });
});

function openEditStoryModal(story) {
  editingStoryId = story.id;
  esTitle.value = story.title || "";
  esCategory.value = story.category || "personal";
  esEditor.innerHTML = story.contentHTML || "";
  clearFieldError(esTitle, esTitleError);
  esContentError.textContent = "";
  esContentError.classList.remove("show");
  esEditor.style.borderColor = "";
  editStoryModal.classList.add("show");
}

function closeEditStoryModal() {
  editStoryModal.classList.remove("show");
  editingStoryId = null;
}

document.getElementById("closeEditStory").addEventListener("click", closeEditStoryModal);
editStoryModal.addEventListener("click", (e) => { if (e.target === editStoryModal) closeEditStoryModal(); });

esTitle.addEventListener("input", () => clearFieldError(esTitle, esTitleError));

editStoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = esTitle.value.trim();
  const contentHTML = esEditor.innerHTML.trim();

  let hasError = false;
  if (title === "") { setFieldError(esTitle, esTitleError, "Title is required."); hasError = true; }
  if (!contentHTML || contentHTML === "<br>") {
    esEditor.style.borderColor = "var(--danger)";
    esContentError.textContent = "Story text can't be empty.";
    esContentError.classList.add("show");
    hasError = true;
  } else {
    esEditor.style.borderColor = "";
    esContentError.textContent = "";
    esContentError.classList.remove("show");
  }
  if (hasError) return;

  esSubmitBtn.disabled = true;
  esSubmitBtn.textContent = "Saving…";

  try {
    await updateDoc(doc(db, "stories", editingStoryId), {
      title,
      category: esCategory.value,
      contentHTML
    });

    const idx = myStories.findIndex((s) => s.id === editingStoryId);
    if (idx !== -1) {
      myStories[idx] = { ...myStories[idx], title, category: esCategory.value, contentHTML };
    }
    renderStories();
    closeEditStoryModal();
  } catch (error) {
    console.error("Failed to update story:", error);
    alert("Couldn't save your changes. Please try again.");
  } finally {
    esSubmitBtn.disabled = false;
    esSubmitBtn.textContent = "Save Changes";
  }
});

/* ==========================================================
   Delete confirm modal (shared by photos + stories)
========================================================== */

const deleteModal = document.getElementById("deleteModal");
const deleteModalTitle = document.getElementById("deleteModalTitle");
const deleteModalText = document.getElementById("deleteModalText");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

let pendingDelete = null; // { type: 'photo' | 'story', id }

function openDeleteModal(type, item) {
  pendingDelete = { type, id: item.id };
  deleteModalTitle.textContent = type === "photo" ? "Delete this photo?" : "Delete this story?";
  deleteModalText.textContent = type === "photo"
    ? "This can't be undone. The photo, its comments, and reactions will be permanently removed."
    : "This can't be undone. The story, its comments, and reactions will be permanently removed.";
  deleteModal.classList.add("show");
}

function closeDeleteModal() {
  deleteModal.classList.remove("show");
  pendingDelete = null;
}

document.getElementById("closeDeleteModal").addEventListener("click", closeDeleteModal);
document.getElementById("cancelDeleteBtn").addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (e) => { if (e.target === deleteModal) closeDeleteModal(); });

confirmDeleteBtn.addEventListener("click", async () => {
  if (!pendingDelete) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = "Deleting…";

  try {
    const { type, id } = pendingDelete;
    await deleteDoc(doc(db, type === "photo" ? "photos" : "stories", id));

    if (type === "photo") {
      myPhotos = myPhotos.filter((p) => p.id !== id);
      document.getElementById("pPhotoCount").textContent = myPhotos.length;
      renderPhotos();
    } else {
      myStories = myStories.filter((s) => s.id !== id);
      document.getElementById("pStoryCount").textContent = myStories.length;
      renderStories();
    }
    closeDeleteModal();
  } catch (error) {
    console.error("Failed to delete:", error);
    alert("Couldn't delete this post. Please try again.");
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Delete";
  }
});

/* ==========================================================
   Small field-error helpers
========================================================== */

function setFieldError(input, errorEl, message) {
  input.classList.add("input-error");
  errorEl.textContent = message;
  errorEl.classList.add("show");
}

function clearFieldError(input, errorEl) {
  input.classList.remove("input-error");
  errorEl.textContent = "";
  errorEl.classList.remove("show");
}
