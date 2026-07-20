import { db, auth } from "./firebase.js";

import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

import emailjs from "@emailjs/browser";

// Initialize EmailJS
emailjs.init("z-aCOye4Wqke6RNY1");

const bar = document.getElementById('scroll-bar');
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
  });

  /* ---------------------------------------------------------
     CONTACT FORM
     Currently: validates client-side and simulates a submit.
     To connect Firebase later:
       1. Add the Firebase SDK + your config (Firestore or
          Realtime Database) at the top of this script block.
       2. In submitToBackend() below, replace the setTimeout
          mock with something like:

            import { getFirestore, collection, addDoc } from "firebase/firestore";
            const db = getFirestore(app);
            await addDoc(collection(db, "messages"), {
              name: data.name, email: data.email,
              subject: data.subject, message: data.message,
              createdAt: new Date().toISOString()
            });

       3. Keep the try/catch so banner-success / banner-fail
          still work the same way.
     --------------------------------------------------------- */

  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const bannerSuccess = document.getElementById('banner-success');
  const bannerFail = document.getElementById('banner-fail');
  const messageEl = document.getElementById('message');
  const charCount = document.getElementById('char-count');

  auth.onAuthStateChanged((user) => {

  if (!user) return;

  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");

  if (user.displayName) {
    nameInput.value = user.displayName;
  }

  if (user.email) {
    emailInput.value = user.email;
  }

});

  messageEl.addEventListener('input', () => {
    charCount.textContent = messageEl.value.length;
  });

  function setFieldError(fieldId, hasError){
    document.getElementById(fieldId).classList.toggle('error', hasError);
  }

  function validate(data){
    let valid = true;
    setFieldError('field-name', !data.name.trim());
    if(!data.name.trim()) valid = false;

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim());
    setFieldError('field-email', !emailOk);
    if(!emailOk) valid = false;

    setFieldError('field-subject', !data.subject.trim());
    if(!data.subject.trim()) valid = false;

    const messageOk = data.message.trim().length >= 10;
    setFieldError('field-message', !messageOk);
    if(!messageOk) valid = false;

    return valid;
  }

  async function submitToBackend(data) {

  // Save message to Firestore
  await addDoc(collection(db, "contactMessages"), {
    name: data.name,
    email: data.email,
    subject: data.subject,
    message: data.message,
    createdAt: serverTimestamp(),
    userId: auth.currentUser?.uid || null
  });

  // Send email
  await emailjs.send(
    "service_6kabi9r",
    "template_krfcymx",
    {
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message
    }
  );
}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    bannerSuccess.classList.remove('show');
    bannerFail.classList.remove('show');

    const data = {
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      subject: document.getElementById('subject').value,
      message: document.getElementById('message').value
    };

    if(!validate(data)) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try{
      await submitToBackend(data);
      bannerSuccess.classList.add('show');
      form.reset();
      charCount.textContent = '0';
      bannerSuccess.scrollIntoView({ behavior:'smooth', block:'start' });
    }catch(err){
      bannerFail.classList.add('show');
      bannerFail.scrollIntoView({ behavior:'smooth', block:'start' });
    }finally{
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });
