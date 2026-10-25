import { firebaseConfigured, auth, toast } from './core.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

const form = document.querySelector('#signin-form');
const createBtn = document.querySelector('#create-account');
const demoBtn = document.querySelector('#demo-btn');
const errorBox = document.querySelector('#auth-error');
let creating = false;

if (!firebaseConfigured) {
  document.querySelector('#email').disabled = true;
  document.querySelector('#password').disabled = true;
  form.querySelector('button[type="submit"]').disabled = true;
  errorBox.textContent = 'Firebase is not configured yet. Explore the demo first, then follow README.md to connect a Firebase project.';
  createBtn.disabled = true;
}

createBtn.addEventListener('click', () => {
  if (!firebaseConfigured) return;
  creating = !creating;
  let name = document.querySelector('#display-name');
  if (creating && !name) {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = '<label for="display-name">Your name</label><input class="input" id="display-name" autocomplete="name" placeholder="How your group knows you" maxlength="60" required>';
    form.insertBefore(field, form.firstChild);
  } else if (!creating && name) name.parentElement.remove();
  form.querySelector('button[type="submit"]').innerHTML = creating ? 'Create account →' : 'Sign in →';
  createBtn.textContent = creating ? 'Back to sign in' : 'Create an account';
  document.querySelector('.auth-card .eyebrow').textContent = creating ? 'Create your account' : 'Welcome back';
  document.querySelector('.auth-card h1').textContent = creating ? 'Make your space.' : 'Sign in to your space.';
  errorBox.textContent = '';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  errorBox.textContent = '';
  if (!firebaseConfigured) return;
  const email = document.querySelector('#email').value.trim().toLowerCase();
  const password = document.querySelector('#password').value;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = creating ? 'Creating account…' : 'Signing in…';
  try {
    if (creating) {
      const name = document.querySelector('#display-name').value.trim();
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    location.href = 'dashboard.html';
  } catch (error) {
    errorBox.textContent = prettyAuthError(error);
  } finally {
    submit.disabled = false;
    submit.textContent = creating ? 'Create account →' : 'Sign in →';
  }
});

demoBtn.addEventListener('click', () => {
  localStorage.setItem('exw_demo_mode', 'true');
  location.href = 'dashboard.html';
});

function prettyAuthError(error) {
  const messages = {
    'auth/invalid-credential': 'Email or password did not match.',
    'auth/email-already-in-use': 'An account already exists for that email. Try signing in.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Try again a little later.',
    'auth/network-request-failed': 'Network issue. Check your connection and try again.'
  };
  return messages[error.code] || error.message || 'Something went wrong. Check your Firebase setup.';
}
