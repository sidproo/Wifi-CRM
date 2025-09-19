import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const toast = (m)=>{ const el = document.getElementById('authToast'); if (el) el.textContent = m; };
const setLoading = (form, isLoading)=>{
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Please wait…' : btn.dataset.label || btn.textContent;
};

tabLogin?.addEventListener('click', ()=>{
  loginForm.style.display = '';
  signupForm.style.display = 'none';
});
tabSignup?.addEventListener('click', ()=>{
  loginForm.style.display = 'none';
  signupForm.style.display = '';
});

loginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm).entries());
  try {
    toast(''); setLoading(loginForm, true);
    await signInWithEmailAndPassword(auth, data.email, data.password);
    window.location.href = 'index.html';
  } catch (err) {
    console.error(err);
    toast(err.message || 'Login failed');
  }
  finally { setLoading(loginForm, false); }
});

signupForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(signupForm).entries());
  try {
    toast(''); setLoading(signupForm, true);
    if (!data.password || data.password.length < 6) throw new Error('Password must be at least 6 characters');
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    await updateProfile(cred.user, { displayName: data.shopName });
    const shopId = cred.user.uid;
    await setDoc(doc(db, 'shops', shopId), { name: data.shopName, ownerUid: cred.user.uid, createdAt: serverTimestamp() });
    localStorage.setItem('shopId', shopId);
    window.location.href = 'index.html';
  } catch (err) {
    console.error(err);
    // Common helpful hints
    if (err.code === 'auth/email-already-in-use') toast('Email already in use');
    else if (err.code === 'auth/invalid-email') toast('Invalid email address');
    else if (err.code === 'permission-denied') toast('Database write blocked. Check Firestore rules for shops collection.');
    else toast(err.message || 'Signup failed');
  }
  finally { setLoading(signupForm, false); }
});


