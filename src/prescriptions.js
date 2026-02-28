import {
  getAllPrescriptions, getPrescriptionsByDoctor, getPrescriptionsByPatient,
  addPrescription, getPrescription, getAllPatients, getCurrentUser,
  getUserData
} from './Firebase.js';
import { showToast, icons, formatDate, formatDateTime } from './utils.js';
import { explainPrescription } from './ai.js';

// ========== Prescription List ==========
export async function renderPrescriptionList(container, userData, myOnly = false) {
  let prescriptions = [];

  if (myOnly && userData.role === 'patient') {
    const patients = await getAllPatients();
    const myRecord = patients.find(p => p.email === userData.email);
    prescriptions = myRecord ? await getPrescriptionsByPatient(myRecord.id) : [];
  } else if (userData.role === 'doctor') {
    prescriptions = await getPrescriptionsByDoctor(getCurrentUser().uid);
  } else {
    prescriptions = await getAllPrescriptions();
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>${myOnly ? 'My Prescriptions' : 'Prescriptions'}</h1>
      <div class="actions">
        ${userData.role === 'doctor' ? `<a href="#new-prescription" class="btn btn-primary">${icons.plus} New Prescription</a>` : ''}
      </div>
    </div>
    <div class="card">
      ${prescriptions.length > 0 ? `
        <div class="table-container">
          <table>
            <thead><tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Medicines</th><th>Actions</th></tr></thead>
            <tbody>
              ${prescriptions.map(rx => `
                <tr>
                  <td>${rx.createdAt?.toDate ? formatDate(rx.createdAt) : '-'}</td>
                  <td>${rx.patientName || '-'}</td>
                  <td>${rx.doctorName || '-'}</td>
                  <td>${(rx.medicines || []).map(m => m.name).join(', ') || '-'}</td>
                  <td>
                    <a href="#view-prescription?id=${rx.id}" class="btn btn-ghost btn-sm">${icons.eye} View</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div class="empty-state"><div class="icon">💊</div><h3>No prescriptions yet</h3></div>'}
    </div>
  `;
}

// ========== Prescription Form ==========
export async function renderPrescriptionForm(container, userData) {
  // Get patient info from URL params if available
  const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const prePatientId = hashParams.get('patientId') || '';
  const prePatientName = hashParams.get('patientName') ? decodeURIComponent(hashParams.get('patientName')) : '';

  const patients = await getAllPatients();

  container.innerHTML = `
    <div class="page-header"><h1>New Prescription</h1></div>
    <div class="card" style="max-width:700px;">
      <form id="prescription-form">
        <div class="form-group">
          <label for="rx-patient">Patient *</label>
          <select id="rx-patient" class="form-control">
            <option value="">Select patient</option>
            ${patients.map(p => `<option value="${p.id}" data-name="${p.name}" ${p.id === prePatientId ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>

        <h4 style="margin:1rem 0 0.5rem;">Medicines</h4>
        <div id="medicines-list"></div>
        <button type="button" class="btn btn-outline btn-sm" id="add-medicine-btn" style="margin-bottom:1rem;">${icons.plus} Add Medicine</button>

        <div class="form-group">
          <label for="rx-instructions">Instructions / Notes</label>
          <textarea id="rx-instructions" class="form-control" placeholder="Take before meals, avoid dairy, etc."></textarea>
        </div>

        <div style="display:flex;gap:0.5rem;">
          <button type="submit" class="btn btn-primary">Save Prescription</button>
          <a href="#prescriptions" class="btn btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `;

  // Medicine list management
  let medicineCount = 0;
  const medicinesList = document.getElementById('medicines-list');

  function addMedicineRow(name = '', dosage = '', frequency = '', duration = '') {
    medicineCount++;
    const idx = medicineCount;
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.marginBottom = '0.5rem';
    row.id = `med-row-${idx}`;
    row.innerHTML = `
      <div class="form-group" style="margin-bottom:0;">
        <input type="text" class="form-control med-name" placeholder="Medicine name" value="${name}" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <input type="text" class="form-control med-dosage" placeholder="Dosage (e.g. 500mg)" value="${dosage}" />
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <input type="text" class="form-control med-frequency" placeholder="Frequency (e.g. 2x daily)" value="${frequency}" />
      </div>
      <div class="form-group" style="margin-bottom:0;display:flex;gap:0.25rem;">
        <input type="text" class="form-control med-duration" placeholder="Duration (e.g. 7 days)" value="${duration}" />
        <button type="button" class="btn btn-ghost btn-sm remove-med" style="color:var(--danger);flex-shrink:0;">&times;</button>
      </div>
    `;
    row.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
    medicinesList.appendChild(row);

    row.querySelector('.remove-med').addEventListener('click', () => row.remove());
  }

  addMedicineRow(); // Start with one row
  document.getElementById('add-medicine-btn').addEventListener('click', () => addMedicineRow());

  // Submit
  document.getElementById('prescription-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const patientSelect = document.getElementById('rx-patient');
    if (!patientSelect.value) {
      showToast('Please select a patient', 'error');
      return;
    }

    const medRows = medicinesList.querySelectorAll('[id^="med-row-"]');
    const medicines = [];
    medRows.forEach(row => {
      const name = row.querySelector('.med-name').value.trim();
      if (name) {
        medicines.push({
          name,
          dosage: row.querySelector('.med-dosage').value.trim(),
          frequency: row.querySelector('.med-frequency').value.trim(),
          duration: row.querySelector('.med-duration').value.trim(),
        });
      }
    });

    if (medicines.length === 0) {
      showToast('Add at least one medicine', 'error');
      return;
    }

    try {
      await addPrescription({
        patientId: patientSelect.value,
        patientName: patientSelect.selectedOptions[0].dataset.name,
        doctorId: getCurrentUser().uid,
        doctorName: userData.name,
        medicines,
        instructions: document.getElementById('rx-instructions').value.trim(),
        aiExplanation: '',
      });
      showToast('Prescription saved!', 'success');
      window.location.hash = '#prescriptions';
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    }
  });
}

// ========== Prescription View + PDF ==========
export async function renderPrescriptionView(container, rxId, userData) {
  if (!rxId) {
    container.innerHTML = '<div class="empty-state"><h3>Prescription not found</h3></div>';
    return;
  }

  const rx = await getPrescription(rxId);
  if (!rx) {
    container.innerHTML = '<div class="empty-state"><h3>Prescription not found</h3></div>';
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>Prescription</h1>
      <div class="actions">
        <button class="btn btn-primary btn-sm" id="download-pdf-btn">${icons.download} Download PDF</button>
        <button class="btn btn-outline btn-sm" id="ai-explain-btn">${icons.brain} AI Explanation</button>
        <a href="#prescriptions" class="btn btn-secondary btn-sm">Back</a>
      </div>
    </div>

    <div class="rx-preview card">
      <div class="rx-header">
        <h3>MedClinic AI</h3>
        <p class="text-sm text-muted">Digital Prescription</p>
      </div>
      <div class="rx-patient-info">
        <p><strong>Patient:</strong> ${rx.patientName || '-'}</p>
        <p><strong>Doctor:</strong> ${rx.doctorName || '-'}</p>
        <p><strong>Date:</strong> ${rx.createdAt?.toDate ? formatDate(rx.createdAt) : '-'}</p>
        <p><strong>Rx ID:</strong> ${rx.id.slice(0, 8).toUpperCase()}</p>
      </div>
      <div class="rx-medicines">
        <h4 style="margin-bottom:0.5rem;">Medicines</h4>
        <table>
          <thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
          <tbody>
            ${(rx.medicines || []).map((m, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${m.name}</td>
                <td>${m.dosage || '-'}</td>
                <td>${m.frequency || '-'}</td>
                <td>${m.duration || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${rx.instructions ? `<div class="rx-instructions"><strong>Instructions:</strong> ${rx.instructions}</div>` : ''}
    </div>

    <div id="ai-explanation-area"></div>
  `;

  // PDF Download
  document.getElementById('download-pdf-btn').addEventListener('click', () => generatePDF(rx));

  // AI Explanation
  document.getElementById('ai-explain-btn').addEventListener('click', async () => {
    const area = document.getElementById('ai-explanation-area');
    area.innerHTML = '<div class="loading-inline"><div class="spinner spinner-sm"></div> Generating AI explanation...</div>';

    try {
      const explanation = await explainPrescription(rx);
      area.innerHTML = `
        <div class="ai-result" style="margin-top:1rem;">
          <h4>🧠 AI Prescription Explanation</h4>
          <div class="ai-section">${explanation}</div>
        </div>
      `;
    } catch (err) {
      area.innerHTML = `<div class="card" style="margin-top:1rem;color:var(--danger);">AI explanation unavailable: ${err.message}</div>`;
    }
  });
}

// ========== PDF Generation ==========
async function generatePDF(rx) {
  try {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(8, 145, 178);
    doc.text('MedClinic AI', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Digital Prescription', pageWidth / 2, 27, { align: 'center' });

    // Line
    doc.setDrawColor(8, 145, 178);
    doc.setLineWidth(0.5);
    doc.line(20, 30, pageWidth - 20, 30);

    // Patient info
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    const dateStr = rx.createdAt?.toDate ? rx.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();
    doc.text(`Patient: ${rx.patientName || '-'}`, 20, 40);
    doc.text(`Doctor: ${rx.doctorName || '-'}`, 20, 47);
    doc.text(`Date: ${dateStr}`, pageWidth - 20, 40, { align: 'right' });
    doc.text(`Rx ID: ${rx.id.slice(0, 8).toUpperCase()}`, pageWidth - 20, 47, { align: 'right' });

    // Medicines table
    const tableData = (rx.medicines || []).map((m, i) => [
      i + 1, m.name, m.dosage || '-', m.frequency || '-', m.duration || '-'
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['#', 'Medicine', 'Dosage', 'Frequency', 'Duration']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [8, 145, 178], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 10 },
      margin: { left: 20, right: 20 },
    });

    // Instructions
    const finalY = doc.lastAutoTable.finalY + 10;
    if (rx.instructions) {
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Instructions:', 20, finalY);
      doc.setFontSize(10);
      doc.setTextColor(100);
      const lines = doc.splitTextToSize(rx.instructions, pageWidth - 40);
      doc.text(lines, 20, finalY + 7);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Generated by MedClinic AI — This is a computer-generated prescription', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save(`prescription-${rx.id.slice(0, 8)}.pdf`);
    showToast('PDF downloaded!', 'success');
  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('Failed to generate PDF: ' + err.message, 'error');
  }
}
