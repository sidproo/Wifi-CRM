// Firebase initialization (ES module)
// Provided config
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAL9eAlMcP6d_1BIgoHXM9kJbhgXJpFtrc",
  authDomain: "omninet-7b97e.firebaseapp.com",
  projectId: "omninet-7b97e",
  storageBucket: "omninet-7b97e.firebasestorage.app",
  messagingSenderId: "38906483823",
  appId: "1:38906483823:web:b7cf828dfd49f0974d299a",
  measurementId: "G-F0TSHQ7J6J"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
// Use default Firestore database. If you configured a named database, change here accordingly.
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);


