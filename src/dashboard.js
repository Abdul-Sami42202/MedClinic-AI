import { onAuth, getUserData, logOut, createUserProfile } from './Firebase.js';
import { $, icons, showToast } from './utils.js';
import { renderPatientList, renderPatientForm, renderPatientProfile } from './patients.js';
import { renderAppointmentList, renderBookAppointment, renderDoctorSchedule } from './appointments.js';
import { renderPrescriptionList, renderPrescriptionForm, renderPrescriptionView } from './prescriptions.js';
import { renderSymptomChecker, renderRiskFlags } from './ai.js';
import { renderAdminAnalytics, renderDoctorAnalytics } from './analytics.js';
import { renderSubscriptionPlans, renderManageUsers } from './subscription.js';

let currentUser = null;
let userData = null;

const mainEl = document.getElementById('main-content');

function showMainLoading(text = 'Loading...') {
  if (mainEl) {
    mainEl.innerHTML = `<div class="loading-inline"><div class="spinner spinner-sm"></div> ${text}</div>`;
  }
}

function showMainMessage(title, msg) {
  if (mainEl) {
    mainEl.innerHTML = `<div class="empty-state"><div class="icon">ℹ️</div><h3>${title}</h3><p>${msg}</p></div>`;
  }
}

function showMainError(msg) {
  if (mainEl) {
    console.log(mainEl, msg)
    mainEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Error</h3><p>${msg}</p><div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap;"><a href="/signin.html" class="btn btn-primary">Go to Sign In</a><button class="btn btn-ghost" id="retry-auth">Retry</button></div></div>`;
    const btn = document.getElementById('retry-auth');
    if (btn) btn.addEventListener('click', () => window.location.reload());
  }
}

showMainLoading('Checking session...');
let authTimeout = setTimeout(() => {
  showMainError('Unable to verify session. Please sign in again.');
}, 10000);
console.log("=====>>>>>")
async function handleAuth(user) {
  clearTimeout(authTimeout);
  if (!user) {
    if (mainEl) showMainMessage('Redirecting', 'No active session found.');
    window.location.href = '/signin.html';
    return;
  }
  currentUser = user;
  if (mainEl) mainEl.innerHTML = `<div class="empty-state"><div class="icon">⏳</div><h3>Loading your dashboard</h3><p>Fetching your profile and role.</p></div>`;
  try {
    userData = await getUserData(user.uid);

    // If no profile exists, create a default one
    if (!userData) {
      console.log('No user profile found. Creating default profile...');
      const defaultProfile = {
        name: 'New User',
        email: user.email || '',
        role: 'patient',
        plan: 'free'
      };
      await createUserProfile(user.uid, defaultProfile);
      userData = { id: user.uid, ...defaultProfile };
    }

    initDashboard();
  } catch (e) {
    console.error('Error fetching userData:', e);
    showMainError('Failed to load your profile. Please try again.');
  }
}

onAuth((user) => {
  handleAuth(user);
});

// ========== Navigation Config ==========
function getNavItems(role) {
  const navs = {
    admin: [
      {
        section: 'Overview', items: [
          { id: 'overview', label: 'Dashboard', icon: icons.home },
        ]
      },
      {
        section: 'Management', items: [
          { id: 'manage-doctors', label: 'Manage Doctors', icon: icons.users },
          { id: 'manage-receptionists', label: 'Manage Receptionists', icon: icons.users },
          { id: 'patients', label: 'Patients', icon: icons.user },
          { id: 'appointments', label: 'Appointments', icon: icons.calendar },
          { id: 'prescriptions', label: 'Prescriptions', icon: icons.fileText },
        ]
      },
      {
        section: 'Analytics & Settings', items: [
          { id: 'analytics', label: 'Analytics', icon: icons.barChart },
          { id: 'subscriptions', label: 'Subscriptions', icon: icons.creditCard },
        ]
      },
    ],
    doctor: [
      {
        section: 'Overview', items: [
          { id: 'overview', label: 'Dashboard', icon: icons.home },
        ]
      },
      {
        section: 'Clinical', items: [
          { id: 'appointments', label: 'My Appointments', icon: icons.calendar },
          { id: 'patients', label: 'Patient Records', icon: icons.user },
          { id: 'prescriptions', label: 'Prescriptions', icon: icons.fileText },
          { id: 'ai-diagnosis', label: 'AI Diagnosis', icon: icons.brain },
          { id: 'risk-flags', label: 'Risk Flagging', icon: icons.alert },
        ]
      },
      {
        section: 'Insights', items: [
          { id: 'analytics', label: 'My Analytics', icon: icons.barChart },
        ]
      },
    ],
    receptionist: [
      {
        section: 'Overview', items: [
          { id: 'overview', label: 'Dashboard', icon: icons.home },
        ]
      },
      {
        section: 'Operations', items: [
          { id: 'patients', label: 'Patients', icon: icons.user },
          { id: 'add-patient', label: 'Register Patient', icon: icons.plus },
          { id: 'appointments', label: 'Appointments', icon: icons.calendar },
          { id: 'book-appointment', label: 'Book Appointment', icon: icons.plus },
          { id: 'schedule', label: 'Daily Schedule', icon: icons.clock },
        ]
      },
    ],
    patient: [
      {
        section: 'Overview', items: [
          { id: 'overview', label: 'Dashboard', icon: icons.home },
        ]
      },
      {
        section: 'My Health', items: [
          { id: 'my-appointments', label: 'My Appointments', icon: icons.calendar },
          { id: 'my-prescriptions', label: 'My Prescriptions', icon: icons.fileText },
          { id: 'my-history', label: 'Medical History', icon: icons.activity },
          { id: 'my-profile', label: 'My Profile', icon: icons.user },
        ]
      },
    ],
  };
  return navs[role] || navs.patient;
}

// ========== Initialize Dashboard ==========
function initDashboard() {
  renderSidebar();
  setupMobileNav();

  // Navigate to hash or default
  const hash = window.location.hash.slice(1) || 'overview';
  navigateTo(hash);

  window.addEventListener('hashchange', () => {
    navigateTo(window.location.hash.slice(1) || 'overview');
  });
}

// ========== Sidebar ==========
function renderSidebar() {
  const nav = $('#sidebar-nav');
  const footer = $('#sidebar-footer');
  const sections = getNavItems(userData.role);

  let html = '';
  for (const section of sections) {
    html += `<div class="sidebar-section">
      <div class="sidebar-section-title">${section.section}</div>`;
    for (const item of section.items) {
      html += `<a class="sidebar-link" data-view="${item.id}" href="#${item.id}">
        <span class="icon">${item.icon}</span>
        ${item.label}
      </a>`;
    }
    html += '</div>';
  }
  nav.innerHTML = html;

  // User footer
  const initials = userData.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??';
  footer.innerHTML = `
    <div class="user-avatar">${initials}</div>
    <div class="user-info">
      <div class="user-name">${userData.name || 'User'}</div>
      <div class="user-role">${userData.role}</div>
    </div>
    <div class="logout-btn" id="logout-btn" title="Sign Out">${icons.logout}</div>
  `;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logOut();
    window.location.href = '/signin.html';
  });

  // Sidebar link clicks
  nav.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      // Close mobile sidebar
      $('#sidebar').classList.remove('open');
      $('#sidebar-overlay').classList.remove('active');
    });
  });
}

function setupMobileNav() {
  const toggle = $('#sidebar-toggle');
  const sidebar = $('#sidebar');
  const overlay = $('#sidebar-overlay');

  toggle.innerHTML = icons.menu;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

// ========== View Router ==========
function navigateTo(view) {
  // Update active sidebar link
  document.querySelectorAll('.sidebar-link').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  const main = $('#main-content');
  main.innerHTML = '<div class="loading-inline"><div class="spinner spinner-sm"></div> Loading...</div>';

  try {
    renderView(view, main);
  } catch (err) {
    console.error('View render error:', err);
    main.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

async function renderView(view, container) {
  const role = userData.role;

  switch (view) {
    case 'overview':
      renderOverview(container);
      break;

    // Patient management
    case 'patients':
      renderPatientList(container, userData);
      break;
    case 'add-patient':
      renderPatientForm(container, userData);
      break;
    case 'patient-profile':
      const patientId = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
      renderPatientProfile(container, patientId, userData);
      break;

    // Appointments
    case 'appointments':
      renderAppointmentList(container, userData);
      break;
    case 'my-appointments':
      renderAppointmentList(container, userData, true);
      break;
    case 'book-appointment':
      renderBookAppointment(container, userData);
      break;
    case 'schedule':
      renderDoctorSchedule(container, userData);
      break;

    // Prescriptions
    case 'prescriptions':
      renderPrescriptionList(container, userData);
      break;
    case 'my-prescriptions':
      renderPrescriptionList(container, userData, true);
      break;
    case 'new-prescription':
      renderPrescriptionForm(container, userData);
      break;
    case 'view-prescription':
      const rxId = new URLSearchParams(window.location.hash.split('?')[1]).get('id');
      renderPrescriptionView(container, rxId, userData);
      break;

    // AI Features
    case 'ai-diagnosis':
      renderSymptomChecker(container, userData);
      break;
    case 'risk-flags':
      renderRiskFlags(container, userData);
      break;

    // Analytics
    case 'analytics':
      if (role === 'admin') renderAdminAnalytics(container);
      else renderDoctorAnalytics(container, userData);
      break;

    // Admin management
    case 'manage-doctors':
      renderManageUsers(container, 'doctor', userData);
      break;
    case 'manage-receptionists':
      renderManageUsers(container, 'receptionist', userData);
      break;
    case 'subscriptions':
      renderSubscriptionPlans(container, userData);
      break;

    // Patient views
    case 'my-profile':
      renderMyProfile(container);
      break;
    case 'my-history':
      renderPatientProfile(container, null, userData, true);
      break;

    default:
      container.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><h3>Page Not Found</h3><p>The page you're looking for doesn't exist.</p></div>`;
  }
}

// ========== Overview (Role-based) ==========
import { getAllPatients, getAllAppointments, getAllPrescriptions, getAppointmentsByDoctor, getPrescriptionsByDoctor, getAppointmentsByPatient, getPrescriptionsByPatient } from './Firebase.js';

async function renderOverview(container) {
  const role = userData.role;

  if (role === 'admin') {
    const [patients, appointments, prescriptions, users] = await Promise.all([
      getAllPatients(), getAllAppointments(), getAllPrescriptions(),
      import('./Firebase.js').then(m => m.getAllUsers())
    ]);
    const doctors = users.filter(u => u.role === 'doctor');
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.date === todayStr);

    container.innerHTML = `
      <div class="page-header"><h1>Admin Dashboard</h1></div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div class="stat-info"><div class="stat-label">Total Patients</div><div class="stat-value">${patients.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal">👨‍⚕️</div>
          <div class="stat-info"><div class="stat-label">Doctors</div><div class="stat-value">${doctors.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">📅</div>
          <div class="stat-info"><div class="stat-label">Today's Appointments</div><div class="stat-value">${todayAppts.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">💊</div>
          <div class="stat-info"><div class="stat-label">Prescriptions</div><div class="stat-value">${prescriptions.length}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Appointments</h3></div>
        <div class="table-container">
          <table>
            <thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              ${appointments.slice(0, 5).map(a => `
                <tr>
                  <td>${a.patientName || '-'}</td>
                  <td>${a.doctorName || '-'}</td>
                  <td>${a.date || '-'}</td>
                  <td><span class="badge badge-${a.status === 'completed' ? 'success' : a.status === 'confirmed' ? 'info' : a.status === 'cancelled' ? 'danger' : 'warning'}">${a.status}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="table-empty">No appointments yet</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (role === 'doctor') {
    const [appointments, prescriptions] = await Promise.all([
      getAppointmentsByDoctor(currentUser.uid),
      getPrescriptionsByDoctor(currentUser.uid)
    ]);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.date === todayStr);
    const pending = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed');

    container.innerHTML = `
      <div class="page-header"><h1>Welcome, Dr. ${userData.name?.split(' ').pop() || ''}</h1></div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info"><div class="stat-label">Today's Appointments</div><div class="stat-value">${todayAppts.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">⏳</div>
          <div class="stat-info"><div class="stat-label">Pending</div><div class="stat-value">${pending.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">💊</div>
          <div class="stat-info"><div class="stat-label">Prescriptions Written</div><div class="stat-value">${prescriptions.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal">📋</div>
          <div class="stat-info"><div class="stat-label">Total Appointments</div><div class="stat-value">${appointments.length}</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Today's Schedule</h3><a href="#book-appointment" class="btn btn-primary btn-sm">${icons.plus} New</a></div>
        <div class="table-container">
          <table>
            <thead><tr><th>Time</th><th>Patient</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              ${todayAppts.map(a => `
                <tr>
                  <td>${a.time || '-'}</td>
                  <td>${a.patientName || '-'}</td>
                  <td><span class="badge badge-${a.status === 'completed' ? 'success' : a.status === 'confirmed' ? 'info' : 'warning'}">${a.status}</span></td>
                  <td><a href="#patient-profile?id=${a.patientId}" class="btn btn-ghost btn-sm">${icons.eye} View</a></td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="table-empty">No appointments today</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (role === 'receptionist') {
    const [patients, appointments] = await Promise.all([
      getAllPatients(), getAllAppointments()
    ]);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppts = appointments.filter(a => a.date === todayStr);

    container.innerHTML = `
      <div class="page-header"><h1>Receptionist Dashboard</h1></div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div class="stat-info"><div class="stat-label">Total Patients</div><div class="stat-value">${patients.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">📅</div>
          <div class="stat-info"><div class="stat-label">Today's Appointments</div><div class="stat-value">${todayAppts.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow">📋</div>
          <div class="stat-info"><div class="stat-label">Total Appointments</div><div class="stat-value">${appointments.length}</div></div>
        </div>
      </div>
      <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;">
        <a href="#add-patient" class="btn btn-primary">${icons.plus} Register Patient</a>
        <a href="#book-appointment" class="btn btn-success">${icons.plus} Book Appointment</a>
      </div>
      <div class="card">
        <div class="card-header"><h3>Today's Appointments</h3></div>
        <div class="table-container">
          <table>
            <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
            <tbody>
              ${todayAppts.map(a => `
                <tr>
                  <td>${a.time || '-'}</td>
                  <td>${a.patientName || '-'}</td>
                  <td>${a.doctorName || '-'}</td>
                  <td><span class="badge badge-${a.status === 'completed' ? 'success' : a.status === 'confirmed' ? 'info' : 'warning'}">${a.status}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="table-empty">No appointments today</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // Patient view
    const patientRecords = await getAllPatients();
    const myRecord = patientRecords.find(p => p.email === userData.email);
    let appointments = [], prescriptions = [];
    if (myRecord) {
      [appointments, prescriptions] = await Promise.all([
        getAppointmentsByPatient(myRecord.id),
        getPrescriptionsByPatient(myRecord.id)
      ]);
    }
    const upcoming = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed');

    container.innerHTML = `
      <div class="page-header"><h1>Welcome, ${userData.name || 'Patient'}</h1></div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📅</div>
          <div class="stat-info"><div class="stat-label">Upcoming Appointments</div><div class="stat-value">${upcoming.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">💊</div>
          <div class="stat-info"><div class="stat-label">Prescriptions</div><div class="stat-value">${prescriptions.length}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal">📋</div>
          <div class="stat-info"><div class="stat-label">Total Visits</div><div class="stat-value">${appointments.length}</div></div>
        </div>
      </div>
      ${upcoming.length > 0 ? `
      <div class="card">
        <div class="card-header"><h3>Upcoming Appointments</h3></div>
        <div class="table-container">
          <table>
            <thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Status</th></tr></thead>
            <tbody>
              ${upcoming.map(a => `
                <tr>
                  <td>${a.date || '-'}</td>
                  <td>${a.time || '-'}</td>
                  <td>${a.doctorName || '-'}</td>
                  <td><span class="badge badge-${a.status === 'confirmed' ? 'info' : 'warning'}">${a.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
      ${prescriptions.length > 0 ? `
      <div class="card">
        <div class="card-header"><h3>Recent Prescriptions</h3></div>
        <div class="table-container">
          <table>
            <thead><tr><th>Date</th><th>Doctor</th><th>Medicines</th><th>Action</th></tr></thead>
            <tbody>
              ${prescriptions.slice(0, 5).map(rx => `
                <tr>
                  <td>${rx.createdAt?.toDate ? rx.createdAt.toDate().toLocaleDateString() : '-'}</td>
                  <td>${rx.doctorName || '-'}</td>
                  <td>${(rx.medicines || []).map(m => m.name).join(', ') || '-'}</td>
                  <td><a href="#view-prescription?id=${rx.id}" class="btn btn-ghost btn-sm">${icons.eye} View</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
    `;
  }
}

// ========== Patient Profile (for patient role) ==========
import { updateUser } from './Firebase.js';

async function renderMyProfile(container) {
  container.innerHTML = `
    <div class="page-header"><h1>My Profile</h1></div>
    <div class="card" style="max-width:500px;">
      <form id="profile-form">
        <div class="form-group">
          <label for="prof-name">Full Name</label>
          <input type="text" id="prof-name" class="form-control" value="${userData.name || ''}" />
        </div>
        <div class="form-group">
          <label for="prof-email">Email</label>
          <input type="email" id="prof-email" class="form-control" value="${userData.email || ''}" disabled />
        </div>
        <div class="form-group">
          <label>Role</label>
          <input type="text" class="form-control" value="${userData.role}" disabled />
        </div>
        <div class="form-group">
          <label>Plan</label>
          <input type="text" class="form-control" value="${(userData.plan || 'free').toUpperCase()}" disabled />
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:1.5rem;">
          <button type="submit" class="btn btn-primary">Update Name</button>
          <button type="button" class="btn btn-danger" id="profile-logout-btn">Sign Out</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prof-name').value.trim();
    if (!name) return showToast('Name is required', 'error');
    try {
      await updateUser(currentUser.uid, { name });
      userData.name = name;
      showToast('Profile updated!', 'success');
      renderSidebar();
    } catch (err) {
      showToast('Failed to update profile', 'error');
    }
  });

  document.getElementById('profile-logout-btn').addEventListener('click', async () => {
    try {
      await logOut();
      window.location.href = '/signin.html';
    } catch (err) {
      showToast('Logout failed', 'error');
    }
  });
}

// Export for use by other modules
export { currentUser, userData };
