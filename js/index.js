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