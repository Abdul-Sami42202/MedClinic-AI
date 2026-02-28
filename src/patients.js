import {
  getAllPatients, addPatient, updatePatient, deletePatient,
  getAppointmentsByPatient, getPrescriptionsByPatient, getDiagnosisLogsByPatient,
  getCurrentUser
} from './Firebase.js';
import { showToast, validateForm, icons, formatDate, formatDateTime, openModal, closeModal, debounce } from './utils.js';

// ========== Patient List ==========
export async function renderPatientList(container, userData) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Patients</h1>
      <div class="actions">
        ${userData.role !== 'patient' ? `<a href="#add-patient" class="btn btn-primary">${icons.plus} Register Patient</a>` : ''}
      </div>
    </div>
    <div class="search-bar">
      <div class="search-input">
        <span class="search-icon">${icons.search}</span>
        <input type="text" id="patient-search" class="form-control" placeholder="Search patients..." style="padding-left:2.25rem;" />
      </div>
    </div>
    <div class="card">
      <div id="patients-table-area">
        <div class="loading-inline"><div class="spinner spinner-sm"></div> Loading patients...</div>
      </div>
    </div>
  `;

  let patients = await getAllPatients();
  renderPatientsTable(patients, userData);

  document.getElementById('patient-search').addEventListener('input', debounce((e) => {
    const term = e.target.value.toLowerCase();
    const filtered = patients.filter(p =>
      p.name?.toLowerCase().includes(term) ||
      p.email?.toLowerCase().includes(term) ||
      p.contact?.includes(term)
    );
    renderPatientsTable(filtered, userData);
  }));
}

function renderPatientsTable(patients, userData) {
  const area = document.getElementById('patients-table-area');
  if (!area) return;

  if (patients.length === 0) {
    area.innerHTML = '<div class="empty-state"><div class="icon">👥</div><h3>No patients found</h3><p>Register your first patient to get started.</p></div>';
    return;
  }

  area.innerHTML = `
    <div class="table-container">
      <table>
        <thead>
          <tr><th>Name</th><th>Age</th><th>Gender</th><th>Contact</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${patients.map(p => `
            <tr>
              <td><strong>${p.name || '-'}</strong><br><span class="text-muted text-sm">${p.email || ''}</span></td>
              <td>${p.age || '-'}</td>
              <td>${p.gender || '-'}</td>
              <td>${p.contact || '-'}</td>
              <td>
                <a href="#patient-profile?id=${p.id}" class="btn btn-ghost btn-sm">${icons.eye}</a>
                ${userData.role !== 'patient' ? `
                  <button class="btn btn-ghost btn-sm edit-patient-btn" data-id="${p.id}">${icons.edit}</button>
                  <button class="btn btn-ghost btn-sm delete-patient-btn" data-id="${p.id}" style="color:var(--danger)">${icons.trash}</button>
                ` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Edit buttons
  area.querySelectorAll('.edit-patient-btn').forEach(btn => {
    btn.addEventListener('click', () => editPatientModal(btn.dataset.id, patients, userData));
  });

  // Delete buttons
  area.querySelectorAll('.delete-patient-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to delete this patient?')) return;
      try {
        await deletePatient(btn.dataset.id);
        showToast('Patient deleted', 'success');
        renderPatientList(document.getElementById('main-content'), userData);
      } catch (err) {
        showToast('Failed to delete patient', 'error');
      }
    });
  });
}

// ========== Patient Form (Add) ==========
export async function renderPatientForm(container, userData) {
  container.innerHTML = `
    <div class="page-header"><h1>Register Patient</h1></div>
    <div class="card" style="max-width:600px;">
      <form id="patient-form">
        <div class="form-row">
          <div class="form-group">
            <label for="pt-name">Full Name *</label>
            <input type="text" id="pt-name" class="form-control" placeholder="Patient name" />
          </div>
          <div class="form-group">
            <label for="pt-email">Email</label>
            <input type="email" id="pt-email" class="form-control" placeholder="patient@email.com" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="pt-age">Age *</label>
            <input type="number" id="pt-age" class="form-control" placeholder="Age" min="0" max="150" />
          </div>
          <div class="form-group">
            <label for="pt-gender">Gender *</label>
            <select id="pt-gender" class="form-control">
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="pt-contact">Contact Number *</label>
            <input type="text" id="pt-contact" class="form-control" placeholder="Phone number" />
          </div>
          <div class="form-group">
            <label for="pt-address">Address</label>
            <input type="text" id="pt-address" class="form-control" placeholder="Address" />
          </div>
        </div>
        <div class="form-group">
          <label for="pt-history">Medical History</label>
          <textarea id="pt-history" class="form-control" placeholder="Any known conditions, allergies, etc."></textarea>
        </div>
        <div style="display:flex;gap:0.5rem;">
          <button type="submit" class="btn btn-primary">Register Patient</button>
          <a href="#patients" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `;

  document.getElementById('patient-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const valid = validateForm([
      { id: 'pt-name', label: 'Name', required: true },
      { id: 'pt-age', label: 'Age', required: true },
      { id: 'pt-gender', label: 'Gender', required: true },
      { id: 'pt-contact', label: 'Contact', required: true, type: 'phone' },
    ]);
    if (!valid) return;

    try {
      await addPatient({
        name: document.getElementById('pt-name').value.trim(),
        email: document.getElementById('pt-email').value.trim(),
        age: parseInt(document.getElementById('pt-age').value),
        gender: document.getElementById('pt-gender').value,
        contact: document.getElementById('pt-contact').value.trim(),
        address: document.getElementById('pt-address').value.trim(),
        medicalHistory: document.getElementById('pt-history').value.trim(),
        createdBy: getCurrentUser().uid,
      });
      showToast('Patient registered successfully!', 'success');
      window.location.hash = '#patients';
    } catch (err) {
      showToast('Failed to register patient: ' + err.message, 'error');
    }
  });
}

// ========== Edit Patient Modal ==========
async function editPatientModal(patientId, patients, userData) {
  const p = patients.find(pt => pt.id === patientId);
  if (!p) return;

  const body = `
    <form id="edit-patient-form">
      <div class="form-row">
        <div class="form-group">
          <label for="ept-name">Full Name</label>
          <input type="text" id="ept-name" class="form-control" value="${p.name || ''}" />
        </div>
        <div class="form-group">
          <label for="ept-email">Email</label>
          <input type="email" id="ept-email" class="form-control" value="${p.email || ''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="ept-age">Age</label>
          <input type="number" id="ept-age" class="form-control" value="${p.age || ''}" />
        </div>
        <div class="form-group">
          <label for="ept-gender">Gender</label>
          <select id="ept-gender" class="form-control">
            <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
            <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="ept-contact">Contact</label>
        <input type="text" id="ept-contact" class="form-control" value="${p.contact || ''}" />
      </div>
      <div class="form-group">
        <label for="ept-address">Address</label>
        <input type="text" id="ept-address" class="form-control" value="${p.address || ''}" />
      </div>
      <div class="form-group">
        <label for="ept-history">Medical History</label>
        <textarea id="ept-history" class="form-control">${p.medicalHistory || ''}</textarea>
      </div>
    </form>
  `;
  const footer = `
    <button class="btn btn-secondary" id="cancel-edit-btn">Cancel</button>
    <button class="btn btn-primary" id="save-edit-btn">Save Changes</button>
  `;
  openModal('Edit Patient', body, footer);

  document.getElementById('cancel-edit-btn').addEventListener('click', closeModal);
  document.getElementById('save-edit-btn').addEventListener('click', async () => {
    try {
      await updatePatient(patientId, {
        name: document.getElementById('ept-name').value.trim(),
        email: document.getElementById('ept-email').value.trim(),
        age: parseInt(document.getElementById('ept-age').value) || 0,
        gender: document.getElementById('ept-gender').value,
        contact: document.getElementById('ept-contact').value.trim(),
        address: document.getElementById('ept-address').value.trim(),
        medicalHistory: document.getElementById('ept-history').value.trim(),
      });
      closeModal();
      showToast('Patient updated!', 'success');
      renderPatientList(document.getElementById('main-content'), userData);
    } catch (err) {
      showToast('Failed to update: ' + err.message, 'error');
    }
  });
}

// ========== Patient Profile + Timeline ==========
export async function renderPatientProfile(container, patientId, userData, isMyHistory = false) {
  // For patient role viewing their own history
  if (isMyHistory && !patientId) {
    const allPatients = await getAllPatients();
    const myRecord = allPatients.find(p => p.email === userData.email);
    if (!myRecord) {
      container.innerHTML = '<div class="empty-state"><div class="icon">📋</div><h3>No Medical Record</h3><p>No patient record found linked to your account.</p></div>';
      return;
    }
    patientId = myRecord.id;
  }

  if (!patientId) {
    container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Patient not found</h3></div>';
    return;
  }

  const { getPatient } = await import('./Firebase.js');
  const patient = await getPatient(patientId);
  if (!patient) {
    container.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><h3>Patient not found</h3></div>';
    return;
  }

  const [appointments, prescriptions, diagnosisLogs] = await Promise.all([
    getAppointmentsByPatient(patientId),
    getPrescriptionsByPatient(patientId),
    getDiagnosisLogsByPatient(patientId),
  ]);

  // Build timeline
  const timelineItems = [];
  appointments.forEach(a => timelineItems.push({
    type: 'appointment', date: a.createdAt, data: a,
    title: `Appointment with ${a.doctorName || 'Doctor'}`,
    desc: `Status: ${a.status} | Date: ${a.date} ${a.time || ''}`,
  }));
  prescriptions.forEach(rx => timelineItems.push({
    type: 'prescription', date: rx.createdAt, data: rx,
    title: `Prescription by ${rx.doctorName || 'Doctor'}`,
    desc: (rx.medicines || []).map(m => `${m.name} (${m.dosage})`).join(', '),
  }));
  diagnosisLogs.forEach(d => timelineItems.push({
    type: 'diagnosis', date: d.createdAt, data: d,
    title: 'AI Diagnosis',
    desc: `Risk: ${d.riskLevel || 'N/A'} | Conditions: ${(d.possibleConditions || []).join(', ')}`,
  }));

  timelineItems.sort((a, b) => {
    const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    const db = b.date?.toDate ? b.date.toDate() : new Date(b.date);
    return db - da;
  });

  container.innerHTML = `
    <div class="page-header">
      <h1>${patient.name}</h1>
      <div class="actions">
        ${userData.role === 'doctor' ? `
          <a href="#new-prescription?patientId=${patientId}&patientName=${encodeURIComponent(patient.name)}" class="btn btn-success btn-sm">${icons.plus} Prescription</a>
          <a href="#ai-diagnosis?patientId=${patientId}&patientName=${encodeURIComponent(patient.name)}" class="btn btn-primary btn-sm">${icons.brain} AI Diagnosis</a>
        ` : ''}
        <a href="#patients" class="btn btn-secondary btn-sm">Back</a>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:1rem;">
      <div>
        <div class="card">
          <h4 style="margin-bottom:0.75rem;">Patient Info</h4>
          <p class="text-sm"><strong>Age:</strong> ${patient.age || '-'}</p>
          <p class="text-sm"><strong>Gender:</strong> ${patient.gender || '-'}</p>
          <p class="text-sm"><strong>Contact:</strong> ${patient.contact || '-'}</p>
          <p class="text-sm"><strong>Email:</strong> ${patient.email || '-'}</p>
          <p class="text-sm"><strong>Address:</strong> ${patient.address || '-'}</p>
          ${patient.medicalHistory ? `<p class="text-sm" style="margin-top:0.5rem;"><strong>Medical History:</strong><br>${patient.medicalHistory}</p>` : ''}
        </div>

        <div class="card">
          <h4 style="margin-bottom:0.5rem;">Quick Stats</h4>
          <p class="text-sm">Appointments: <strong>${appointments.length}</strong></p>
          <p class="text-sm">Prescriptions: <strong>${prescriptions.length}</strong></p>
          <p class="text-sm">AI Diagnoses: <strong>${diagnosisLogs.length}</strong></p>
        </div>
      </div>

      <div class="card">
        <h4 style="margin-bottom:1rem;">Medical History Timeline</h4>
        ${timelineItems.length > 0 ? `
          <div class="timeline">
            ${timelineItems.map(item => `
              <div class="timeline-item ${item.type}">
                <div class="timeline-date">${item.date?.toDate ? formatDateTime(item.date) : ''}</div>
                <div class="timeline-content">
                  <h4>${item.title}</h4>
                  <p>${item.desc}</p>
                  ${item.type === 'prescription' ? `<a href="#view-prescription?id=${item.data.id}" class="text-sm" style="color:var(--primary)">View Prescription →</a>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div class="empty-state"><div class="icon">📋</div><h3>No history yet</h3></div>'}
      </div>
    </div>
  `;
}
