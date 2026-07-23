import { getFirestore } from "firebase/firestore";
import { app } from "./firebase.js";

const db = getFirestore(app);

export { db };