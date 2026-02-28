import {
  getAllPatients, getAllAppointments, getAllPrescriptions, getAllUsers, getAllDiagnosisLogs,
  getAppointmentsByDoctor, getPrescriptionsByDoctor
} from './Firebase.js';

// ========== Admin Analytics ==========
export async function renderAdminAnalytics(container) {
  const [patients, appointments, prescriptions, users, diagLogs] = await Promise.all([
    getAllPatients(), getAllAppointments(), getAllPrescriptions(), getAllUsers(), getAllDiagnosisLogs()
  ]);

  const doctors = users.filter(u => u.role === 'doctor');
  const receptionists = users.filter(u => u.role === 'receptionist');
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.date === todayStr);
  const completed = appointments.filter(a => a.status === 'completed');

  // Monthly appointments (last 6 months)
  const monthlyData = getMonthlyData(appointments);

  // Common diagnoses from diagnosis logs
  const allSymptoms = diagLogs.flatMap(d => d.symptoms || []);
  const symptomCounts = {};
  allSymptoms.forEach(s => { symptomCounts[s.toLowerCase()] = (symptomCounts[s.toLowerCase()] || 0) + 1; });
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Revenue simulation (completed appointments * $50)
  const revenue = completed.length * 50;

  // Doctor performance
  const doctorStats = [];
  for (const doc of doctors) {
    const docAppts = appointments.filter(a => a.doctorId === doc.id);
    const docRx = prescriptions.filter(rx => rx.doctorId === doc.id);
    doctorStats.push({ name: doc.name, appointments: docAppts.length, prescriptions: docRx.length });
  }

  container.innerHTML = `
    <div class="page-header"><h1>Analytics Dashboard</h1></div>

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
        <div class="stat-info"><div class="stat-label">Total Appointments</div><div class="stat-value">${appointments.length}</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow">💰</div>
        <div class="stat-info"><div class="stat-label">Revenue (Simulated)</div><div class="stat-value">$${revenue.toLocaleString()}</div></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:1rem;">
      <div class="card">
        <div class="card-header"><h3>Monthly Appointments</h3></div>
        <div class="bar-chart" style="padding-bottom:2rem;">
          ${monthlyData.map(m => {
            const maxVal = Math.max(...monthlyData.map(d => d.count), 1);
            const height = (m.count / maxVal) * 100;
            return `<div class="bar" style="height:${Math.max(height, 5)}%;">
              <span class="bar-value">${m.count}</span>
              <span class="bar-label">${m.label}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Common Symptoms</h3></div>
        ${topSymptoms.length > 0 ? `
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
            ${topSymptoms.map(([symptom, count]) => `
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <div style="flex:1;font-size:0.85rem;text-transform:capitalize;">${symptom}</div>
                <div style="width:60%;background:var(--bg);border-radius:4px;height:20px;overflow:hidden;">
                  <div style="height:100%;background:var(--primary);width:${(count / (topSymptoms[0]?.[1] || 1)) * 100}%;border-radius:4px;"></div>
                </div>
                <span class="text-sm text-muted">${count}</span>
              </div>
            `).join('')}
          </div>
        ` : '<p class="text-muted text-sm">No diagnosis data yet</p>'}
      </div>
    </div>

    <div class="card" style="margin-top:1rem;">
      <div class="card-header"><h3>Doctor Performance</h3></div>
      ${doctorStats.length > 0 ? `
        <div class="table-container">
          <table>
            <thead><tr><th>Doctor</th><th>Appointments</th><th>Prescriptions</th></tr></thead>
            <tbody>
              ${doctorStats.map(d => `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td>${d.appointments}</td>
                  <td>${d.prescriptions}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p class="text-muted text-sm">No doctors registered yet</p>'}
    </div>
  `;
}

// ========== Doctor Analytics ==========
export async function renderDoctorAnalytics(container, userData) {
  const [appointments, prescriptions] = await Promise.all([
    getAppointmentsByDoctor(userData.id),
    getPrescriptionsByDoctor(userData.id)
  ]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.date === todayStr);
  const completed = appointments.filter(a => a.status === 'completed');
  const monthlyData = getMonthlyData(appointments);

  // This month stats
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthAppts = appointments.filter(a => a.date?.startsWith(thisMonth));
  const monthRx = prescriptions.filter(rx => {
    const d = rx.createdAt?.toDate ? rx.createdAt.toDate() : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  container.innerHTML = `
    <div class="page-header"><h1>My Analytics</h1></div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">📅</div>
        <div class="stat-info"><div class="stat-label">Today's Appointments</div><div class="stat-value">${todayAppts.length}</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon teal">📋</div>
        <div class="stat-info"><div class="stat-label">This Month</div><div class="stat-value">${monthAppts.length}</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div class="stat-info"><div class="stat-label">Completed</div><div class="stat-value">${completed.length}</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon yellow">💊</div>
        <div class="stat-info"><div class="stat-label">Prescriptions (Month)</div><div class="stat-value">${monthRx.length}</div></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Monthly Appointments</h3></div>
      <div class="bar-chart" style="padding-bottom:2rem;">
        ${monthlyData.map(m => {
          const maxVal = Math.max(...monthlyData.map(d => d.count), 1);
          const height = (m.count / maxVal) * 100;
          return `<div class="bar" style="height:${Math.max(height, 5)}%;">
            <span class="bar-value">${m.count}</span>
            <span class="bar-label">${m.label}</span>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Total Prescriptions</h3></div>
      <p style="font-size:2rem;font-weight:700;color:var(--primary);">${prescriptions.length}</p>
      <p class="text-sm text-muted">Total prescriptions written</p>
    </div>
  `;
}

// ========== Helper: Monthly Data ==========
function getMonthlyData(appointments) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short' });
    const count = appointments.filter(a => a.date?.startsWith(key)).length;
    months.push({ label, count, key });
  }
  return months;
}
