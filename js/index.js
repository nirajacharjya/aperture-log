import { auth } from "./firebase.js";
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

async function loadHomeGallery() {

    const gallery = document.getElementById("home-gallery");

    const q = query(
        collection(db, "photos"),
        orderBy("createdAt", "desc"),
        limit(8)
    );

    const snapshot = await getDocs(q);

    gallery.innerHTML = "";

    snapshot.forEach((doc) => {

        const photo = doc.data();

        const tile = document.createElement("div");

        tile.className = "photo-tile";

        tile.innerHTML = `
    <a href="photography.html">
        <img src="${photo.image}" alt="${photo.title}" loading="lazy">

        <div class="tile-overlay">
            <span class="t-cat">${photo.category
                ? photo.category.charAt(0).toUpperCase() + photo.category.slice(1)
                : ""
            }</span>
        </div>
    </a>
`;

        gallery.appendChild(tile);

    });

}

loadHomeGallery();