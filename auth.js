import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const toast = (m)=>{ const el = document.getElementById('authToast'); if (el) el.textContent = m; };
const provider = new GoogleAuthProvider();
const setLoading = (form, isLoading)=>{
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Please wait…' : btn.dataset.label || btn.textContent;
};

tabLogin?.addEventListener('click', ()=>{
  loginForm.style.display = '';
  signupForm.style.display = 'none';
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
});
tabSignup?.addEventListener('click', ()=>{
  loginForm.style.display = 'none';
  signupForm.style.display = '';
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
});

// Plan selection
const planCards = document.querySelectorAll('.plan-card');
planCards.forEach(card => {
  card.addEventListener('click', () => {
    planCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    document.querySelector('input[name="selectedPlan"]').value = card.dataset.plan;
  });
});

// Payment method selection
const paymentMethods = document.querySelectorAll('.payment-method');
paymentMethods.forEach(method => {
  method.addEventListener('click', () => {
    paymentMethods.forEach(m => m.classList.remove('selected'));
    method.classList.add('selected');
    document.querySelector('input[name="paymentMethod"]').value = method.dataset.method;
  });
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
    if (!data.firstName || !data.surname) throw new Error('Please provide your first and last name');
    if (!data.shopName) throw new Error('Please provide your shop/company name');
    if (!data.address) throw new Error('Please provide your complete address');
    
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    await updateProfile(cred.user, { 
      displayName: `${data.firstName} ${data.surname}`,
      photoURL: null
    });
    
    const shopId = cred.user.uid;
    const planDetails = getPlanDetails(data.selectedPlan);
    
    await setDoc(doc(db, 'shops', shopId), { 
      name: data.shopName,
      ownerUid: cred.user.uid,
      ownerName: `${data.firstName} ${data.surname}`,
      address: data.address,
      selectedPlan: data.selectedPlan,
      planDetails: planDetails,
      paymentMethod: data.paymentMethod,
      createdAt: serverTimestamp(),
      status: 'active'
    });
    
    localStorage.setItem('shopId', shopId);
    localStorage.setItem('userName', `${data.firstName} ${data.surname}`);
    localStorage.setItem('shopName', data.shopName);
    
    toast('Account created successfully! Redirecting...');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
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

// Get plan details based on selected plan
function getPlanDetails(planType) {
  const plans = {
    'free': {
      name: 'Free Trial',
      price: 0,
      customers: 50,
      features: ['Basic features', 'Email support'],
      duration: '14 days',
      includesMessaging: false
    },
    'basic': {
      name: 'Basic Plan',
      price: 199,
      customers: 250,
      features: ['All features', 'Email support'],
      duration: 'monthly',
      includesMessaging: false
    },
    'standard': {
      name: 'Standard Plan',
      price: 399,
      customers: 500,
      features: ['All features', 'Omni Messaging', 'Priority support'],
      duration: 'monthly',
      includesMessaging: true
    },
    'premium': {
      name: 'Premium Plan',
      price: 599,
      customers: 1000,
      features: ['All features', 'Omni Messaging', 'Advanced analytics'],
      duration: 'monthly',
      includesMessaging: true
    },
    'enterprise': {
      name: 'Enterprise Plan',
      price: 999,
      customers: -1, // unlimited
      features: ['All features', 'Omni Messaging', '24/7 support'],
      duration: 'monthly',
      includesMessaging: true
    }
  };
  
  return plans[planType] || plans['standard'];
}

async function handleGoogleAuth() {
  try {
    toast(''); 
    const googleBtn = document.querySelector('#googleLogin, #googleSignup');
    if (googleBtn) {
      googleBtn.disabled = true;
      googleBtn.textContent = 'Please wait…';
    }
    
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const shopId = user.uid;
    
    // Ensure shop doc exists (works for both new and existing users)
    await setDoc(doc(db, 'shops', shopId), { 
      name: user.displayName || 'Google Shop', 
      ownerUid: user.uid,
      ownerName: user.displayName || 'Google User',
      address: 'Address not provided',
      selectedPlan: 'standard',
      planDetails: getPlanDetails('standard'),
      paymentMethod: 'upi',
      createdAt: serverTimestamp(),
      status: 'active'
    }, { merge: true });
    
    localStorage.setItem('shopId', shopId);
    window.location.href = 'index.html';
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/popup-closed-by-user') toast('Sign-in cancelled');
    else if (err.code === 'auth/popup-blocked') toast('Popup blocked. Please allow popups for this site.');
    else if (err.code === 'auth/account-exists-with-different-credential') toast('Account exists with different sign-in method');
    else toast(err.message || 'Google sign-in failed');
  } finally {
    const googleBtn = document.querySelector('#googleLogin, #googleSignup');
    if (googleBtn) {
      googleBtn.disabled = false;
      googleBtn.textContent = googleBtn.id === 'googleLogin' ? 'Sign in with Google' : 'Sign up with Google';
    }
  }
}

document.getElementById('googleLogin')?.addEventListener('click', handleGoogleAuth);
document.getElementById('googleSignup')?.addEventListener('click', handleGoogleAuth);


