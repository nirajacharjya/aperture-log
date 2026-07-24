import { db } from "./firestore.js";

import {
    collection,
    getDocs,
    query,
    orderBy,
    limit
} from "firebase/firestore";

// Scroll progress + back to top
const bar = document.getElementById("scroll-bar");
const totop = document.getElementById("totop");

window.addEventListener("scroll", () => {
    const h = document.documentElement;
    const scrolled =
        (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;

    bar.style.width = scrolled + "%";

    if (totop) {
        totop.classList.toggle("show", h.scrollTop > 500);
    }
});

if (totop) {
    totop.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
}

// Duplicate ticker content for seamless loop
const ticker = document.getElementById("ticker");

if (ticker) {
    ticker.innerHTML += ticker.innerHTML;
}

// Inject Cloudinary f_auto,q_auto,w_XXX transform into an existing
// Cloudinary delivery URL. Falls back to the original URL untouched
// if it isn't a Cloudinary URL (so nothing breaks if you ever swap hosts).
function cldTransform(url, width) {
    if (!url || !url.includes("/upload/")) return url;
    return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}

async function loadHomeGallery() {

    const gallery = document.getElementById("home-gallery");

    const q = query(
        collection(db, "photos"),
        orderBy("createdAt", "desc"),
        limit(8)
    );

    const snapshot = await getDocs(q);

    gallery.innerHTML = "";

    let index = 0;

    snapshot.forEach((doc) => {

        const photo = doc.data();

        // First row (above the fold on most viewports) loads eagerly
        // with high priority; the rest lazy-load as the user scrolls.
        const isPriority = index < 4;
        const loadingAttr = isPriority ? "eager" : "lazy";
        const fetchPriorityAttr = isPriority ? ` fetchpriority="high"` : "";

        // 400px is enough for a masonry column tile — Cloudinary resizes
        // and serves WebP/AVIF automatically per-browser via f_auto,q_auto.
        const optimizedSrc = cldTransform(photo.image, 400);

        const tile = document.createElement("div");

        tile.className = "photo-tile";

        tile.innerHTML = `
    <a href="photography.html">
        <img src="${optimizedSrc}" alt="${photo.title}" width="400" height="500"
            loading="${loadingAttr}" decoding="async"${fetchPriorityAttr}>

        <div class="tile-overlay">
            <span class="t-cat">${photo.category
                ? photo.category.charAt(0).toUpperCase() + photo.category.slice(1)
                : ""
            }</span>
        </div>
    </a>
`;

        gallery.appendChild(tile);

        index++;

    });

}

loadHomeGallery();