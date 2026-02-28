import { onAuth, logOut } from './Firebase.js';
import { icons } from './utils.js';

const navLinks = document.querySelector('.nav-links');

if (navLinks) {
    onAuth((user) => {
        if (user) {
            navLinks.innerHTML = `
        <a href="/dashboard.html" class="btn btn-ghost">Dashboard</a>
        <button id="logout-btn" class="btn btn-primary">
          <span class="icon" style="width:18px;height:18px;display:inline-flex;align-items:center;margin-right:0.5rem;">${icons.logout}</span>
          Logout
        </button>
      `;

            document.getElementById('logout-btn').addEventListener('click', async () => {
                try {
                    await logOut();
                    window.location.reload();
                } catch (err) {
                    console.error('Logout failed:', err);
                }
            });
        } else {
            navLinks.innerHTML = `
        <a href="/signin.html" class="btn btn-ghost">Sign In</a>
        <a href="/signup.html" class="btn btn-primary">Get Started</a>
      `;
        }
    });
}
