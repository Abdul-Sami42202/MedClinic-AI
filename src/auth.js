import { signUp, signIn, onAuth } from './Firebase.js';
import { showToast, validateForm, showLoading, hideLoading } from './utils.js';

// Redirect if already logged in
onAuth((user) => {
  if (user) {
    window.location.href = '/dashboard.html';
  }
});

// Detect which page we're on
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const authError = document.getElementById('auth-error');

function showError(msg) {
  if (authError) {
    authError.textContent = msg;
    authError.style.display = 'block';
  }
}

function hideError() {
  if (authError) authError.style.display = 'none';
}

// ========== Sign In ==========
if (signinForm) {
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const valid = validateForm([
      { id: 'email', label: 'Email', required: true, type: 'email' },
      { id: 'password', label: 'Password', required: true, minLength: 6 },
    ]);
    if (!valid) return;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      showLoading();
      await signIn(email, password);
      window.location.href = '/dashboard.html';
    } catch (err) {
      hideLoading();
      const msg = getAuthErrorMessage(err.code);
      showError(msg);
    }
  });
}

// ========== Sign Up ==========
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const valid = validateForm([
      { id: 'name', label: 'Full Name', required: true },
      { id: 'email', label: 'Email', required: true, type: 'email' },
      { id: 'password', label: 'Password', required: true, minLength: 6 },
    ]);
    if (!valid) return;

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    try {
      showLoading();
      await signUp(name, email, password, role);
      window.location.href = '/dashboard.html';
    } catch (err) {
      hideLoading();
      const msg = getAuthErrorMessage(err.code);
      showError(msg);
    }
  });
}

function getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password.';
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/invalid-credential': return 'Invalid email or password.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    default: return 'An error occurred. Please try again.';
  }
}
