import {
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

import { auth, provider } from "./firebase.js";

const loginBtn = document.getElementById("loginBtn");
const profileMenu = document.getElementById("profileMenu");
const profileImage = document.getElementById("profileImage");
const profileName = document.getElementById("profileName");

loginBtn.addEventListener("click", async () => {

    try {

        await signInWithPopup(auth, provider);

    } catch (error) {

        console.error(error);

    }

});

onAuthStateChanged(auth, (user) => {

    if (user) {

        loginBtn.style.display = "none";

        profileMenu.style.display = "flex";

        console.log(user.photoURL);

        console.log(user.photoURL);

        const photo = user.photoURL.replace("=s96-c", "=s256-c");

        console.log(photo);

        profileImage.src = photo;

        profileName.textContent = user.displayName.split(" ")[0];

    } else {

        loginBtn.style.display = "flex";

        profileMenu.style.display = "none";

    }

});
