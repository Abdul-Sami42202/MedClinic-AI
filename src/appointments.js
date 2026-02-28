import {
  getAllAppointments, getAppointmentsByDoctor, getAppointmentsByPatient,
  addAppointment, updateAppointment, deleteAppointment,
  getAllPatients, getUsersByRole, getCurrentUser
} from './Firebase.js';
import { showToast, icons, formatDate, formatTime, getTodayStr, getStatusBadge } from './utils.js';

// ========== Appointment List ==========
export async function renderAppointmentList(container, userData, myOnly = false) {
  const role = userData.role;
  let appointments = [];

  if (myOnly && role === 'patient') {
    const patients = await getAllPatients();
    const myRecord = patients.find(p => p.email === userData.email);
    appointments = myRecord ? await getAppointmentsByPatient(myRecord.id) : [];
  } else if (role === 'doctor') {
    appointments = await getAppointmentsByDoctor(getCurrentUser().uid);
  } else {
    appointments = await getAllAppointments();
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>${myOnly ? 'My Appointments' : 'Appointments'}</h1>
      <div class="actions">
        ${role !== 'patient' ? `<a href="#book-appointment" class="btn btn-primary">${icons.plus} Book Appointment</a>` : ''}
      </div>
    </div>
    <div class="search-bar">
      <div class="filter-group">
        <select id="status-filter" class="form-control" style="width:auto;">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input type="date" id="date-filter" class="form-control" style="width:auto;" />
      </div>
    </div>
    <div class="card">
      <div id="appointments-table-area"></div>
    </div>
  `;

  let filtered = [...appointments];
  renderAppointmentsTable(filtered, userData);

  document.getElementById('status-filter').addEventListener('change', () => applyFilters(appointments, userData));
  document.getElementById('date-filter').addEventListener('change', () => applyFilters(appointments, userData));
}

function applyFilters(appointments, userData) {
  const status = document.getElementById('status-filter')?.value;
  const date = document.getElementById('date-filter')?.value;
  let filtered = [...appointments];
  if (status) filtered = filtered.filter(a => a.status === status);
  if (date) filtered = filtered.filter(a => a.date === date);
  renderAppointmentsTable(filtered, userData);
}

function renderAppointmentsTable(appointments, userData) {
  const area = document.getElementById('appointments-table-area');
  if (!area) return;

  if (appointments.length === 0) {
    area.innerHTML = '<div class="empty-state"><div class="icon">📅</div><h3>No appointments found</h3></div>';
    return;
  }

  const canManage = userData.role !== 'patient';

  area.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th>${canManage ? '<th>Actions</th>' : ''}</tr>
        </thead>
        <tbody>
          ${appointments.map(a => `
            <tr>
              <td>${a.date || '-'}</td>
              <td>${formatTime(a.time)}</td>
              <td>${a.patientName || '-'}</td>
              <td>${a.doctorName || '-'}</td>
              <td>${getStatusBadge(a.status)}</td>
              ${canManage ? `
                <td>
                  ${a.status === 'pending' ? `
                    <button class="btn btn-success btn-sm confirm-appt" data-id="${a.id}">Confirm</button>
                    <button class="btn btn-danger btn-sm cancel-appt" data-id="${a.id}">Cancel</button>
                  ` : ''}
                  ${a.status === 'confirmed' ? `
                    <button class="btn btn-primary btn-sm complete-appt" data-id="${a.id}">Complete</button>
                    <button class="btn btn-danger btn-sm cancel-appt" data-id="${a.id}">Cancel</button>
                  ` : ''}
                  ${userData.role === 'doctor' && a.status === 'confirmed' ? `
                    <a href="#new-prescription?patientId=${a.patientId}&patientName=${encodeURIComponent(a.patientName || '')}" class="btn btn-ghost btn-sm">${icons.fileText}</a>
                  ` : ''}
                </td>
              ` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Status change buttons
  area.querySelectorAll('.confirm-appt').forEach(btn => {
    btn.addEventListener('click', () => changeStatus(btn.dataset.id, 'confirmed', appointments, userData));
  });
  area.querySelectorAll('.complete-appt').forEach(btn => {
    btn.addEventListener('click', () => changeStatus(btn.dataset.id, 'completed', appointments, userData));
  });
  area.querySelectorAll('.cancel-appt').forEach(btn => {
    btn.addEventListener('click', () => changeStatus(btn.dataset.id, 'cancelled', appointments, userData));
  });
}

async function changeStatus(id, status, appointments, userData) {
  try {
    await updateAppointment(id, { status });
    const appt = appointments.find(a => a.id === id);
    if (appt) appt.status = status;
    showToast(`Appointment ${status}`, 'success');
    renderAppointmentsTable(appointments, userData);
  } catch (err) {
    showToast('Failed to update status', 'error');
  }
}

// ========== Book Appointment ==========
export async function renderBookAppointment(container, userData) {
  const [patients, doctors] = await Promise.all([
    getAllPatients(),
    getUsersByRole('doctor')
  ]);

  container.innerHTML = `
    <div class="page-header"><h1>Book Appointment</h1></div>
    <div class="card" style="max-width:600px;">
      <form id="appointment-form">
        <div class="form-group">
          <label for="appt-patient">Patient *</label>
          <select id="appt-patient" class="form-control">
            <option value="">Select patient</option>
            ${patients.map(p => `<option value="${p.id}" data-name="${p.name}">${p.name} (${p.contact || p.email || ''})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="appt-doctor">Doctor *</label>
          <select id="appt-doctor" class="form-control">
            <option value="">Select doctor</option>
            ${doctors.map(d => `<option value="${d.id}" data-name="${d.name}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="appt-date">Date *</label>
            <input type="date" id="appt-date" class="form-control" min="${getTodayStr()}" />
          </div>
          <div class="form-group">
            <label for="appt-time">Time *</label>
            <input type="time" id="appt-time" class="form-control" />
          </div>
        </div>
        <div class="form-group">
          <label for="appt-notes">Notes</label>
          <textarea id="appt-notes" class="form-control" placeholder="Reason for visit, symptoms, etc."></textarea>
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button type="submit" class="btn btn-primary">Book Appointment</button>
          <a href="#appointments" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `;

  // Pre-select doctor if user is a doctor
  if (userData.role === 'doctor') {
    const doctorSelect = document.getElementById('appt-doctor');
    doctorSelect.value = getCurrentUser().uid;
  }

  document.getElementById('appointment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientSelect = document.getElementById('appt-patient');
    const doctorSelect = document.getElementById('appt-doctor');
    const date = document.getElementById('appt-date').value;
    const time = document.getElementById('appt-time').value;

    if (!patientSelect.value || !doctorSelect.value || !date || !time) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    try {
      await addAppointment({
        patientId: patientSelect.value,
        patientName: patientSelect.selectedOptions[0].dataset.name,
        doctorId: doctorSelect.value,
        doctorName: doctorSelect.selectedOptions[0].dataset.name,
        date,
        time,
        status: 'pending',
        notes: document.getElementById('appt-notes').value.trim(),
      });
      showToast('Appointment booked!', 'success');
      window.location.hash = '#appointments';
    } catch (err) {
      showToast('Failed to book appointment: ' + err.message, 'error');
    }
  });
}

// ========== Doctor/Daily Schedule ==========
export async function renderDoctorSchedule(container, userData) {
  const todayStr = getTodayStr();
  const allAppts = await getAllAppointments();
  const todayAppts = allAppts.filter(a => a.date === todayStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  container.innerHTML = `
    <div class="page-header">
      <h1>Daily Schedule</h1>
      <div class="actions">
        <input type="date" id="schedule-date" class="form-control" value="${todayStr}" style="width:auto;" />
      </div>
    </div>
    <div class="card" id="schedule-area"></div>
  `;

  renderScheduleTable(todayAppts);

  document.getElementById('schedule-date').addEventListener('change', (e) => {
    const dateVal = e.target.value;
    const filtered = allAppts.filter(a => a.date === dateVal).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    renderScheduleTable(filtered);
  });
}

function renderScheduleTable(appointments) {
  const area = document.getElementById('schedule-area');
  if (!area) return;

  if (appointments.length === 0) {
    area.innerHTML = '<div class="empty-state"><div class="icon">📅</div><h3>No appointments for this date</h3></div>';
    return;
  }

  area.innerHTML = `
    <div class="table-container">
      <table>
        <thead><tr><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          ${appointments.map(a => `
            <tr>
              <td><strong>${formatTime(a.time)}</strong></td>
              <td>${a.patientName || '-'}</td>
              <td>${a.doctorName || '-'}</td>
              <td>${getStatusBadge(a.status)}</td>
              <td class="text-sm text-muted">${a.notes || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
