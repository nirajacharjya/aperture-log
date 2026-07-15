import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

import { auth, provider } from "./firebase.js";

export function initializeAuth() {

    const loginBtn = document.getElementById("loginBtn");
    const profileMenu = document.getElementById("profileMenu");
    const profileImage = document.getElementById("profileImage");
    const profileName = document.getElementById("profileName");
    const profileDropdown = document.getElementById("profileDropdown");

    const dropdownProfileImage = document.getElementById("dropdownProfileImage");
    const dropdownName = document.getElementById("dropdownName");
    const dropdownEmail = document.getElementById("dropdownEmail");

    const logoutBtn = document.getElementById("logoutBtn");

    if (!loginBtn || !profileMenu || !profileImage || !profileName) {
        console.warn("Navbar auth elements not found.");
        return;
    }

    // Login
    loginBtn.onclick = async () => {

        try {

            await signInWithPopup(auth, provider);

        } catch (error) {

            console.error("Login Error:", error);

        }

    };

    // Listen for authentication changes
    onAuthStateChanged(auth, (user) => {

        if (user) {

            loginBtn.style.display = "none";
            profileMenu.style.display = "flex";

            const photo = user.photoURL
                ? user.photoURL.replace("=s96-c", "=s256-c")
                : "";
            profileImage.src = photo;
            profileName.textContent = user.displayName.split(" ")[0];
            dropdownProfileImage.src = photo;
            dropdownName.textContent = user.displayName;
            dropdownEmail.textContent = user.email;

        } else {
            loginBtn.style.display = "flex";
            profileMenu.style.display = "none";
            profileDropdown.classList.remove("show");
        }
    });

    // Logout
    profileMenu.onclick = (e) => {

    e.stopPropagation();

    profileDropdown.classList.toggle("show");

};
    logoutBtn.onclick = async (e) => {

    e.stopPropagation();
        try {
            await signOut(auth);
            profileDropdown.classList.remove("show");
        } catch (error) {
            console.error(error);
        }
    };
    document.addEventListener("click", (e) => {

    if (!profileDropdown.contains(e.target)) {

        profileDropdown.classList.remove("show");

    }

});
}