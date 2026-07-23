import { initializeAuth } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
    initializeNavbar();
});

function initializeNavbar() {

    // Hamburger
    const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobileMenu");

    if (menuToggle && mobileMenu) {

        menuToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            mobileMenu.classList.toggle("show");
        });

        mobileMenu.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        document.addEventListener("click", () => {
            mobileMenu.classList.remove("show");
        });

        mobileMenu.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mobileMenu.classList.remove("show");
            });
        });

    }

    initializeTheme();
    initializeAuth();

}

function initializeTheme() {

    const root = document.documentElement;
    const themeBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");

    if (!themeBtn || !themeIcon) return;

    const sunPath =
        '<circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="3.5" y1="12" x2="1" y2="12"/><line x1="23" y1="12" x2="20.5" y2="12"/><line x1="5.1" y1="5.1" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="18.9" y2="18.9"/><line x1="5.1" y1="18.9" x2="6.9" y2="17.1"/><line x1="17.1" y1="6.9" x2="18.9" y2="5.1"/>';

    const moonPath =
        '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

    function setTheme(light) {
        root.classList.toggle("light", light);
        themeIcon.innerHTML = light ? sunPath : moonPath;
    }
    setTheme(root.classList.contains("light"));

    themeBtn.onclick = () => {
        setTheme(!root.classList.contains("light"));
    };

}