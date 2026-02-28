import { addDiagnosisLog, getAllPatients, getDiagnosisLogsByPatient, getCurrentUser } from './Firebase.js';
import { showToast, icons, validateForm } from './utils.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function callGroq(prompt) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error('Groq API key not configured. Add VITE_GROQ_API_KEY to your .env file.');
  }

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a medical AI assistant. Provide helpful medical analysis. Always include disclaimers that this is AI-generated and should not replace professional medical advice. Respond in HTML format with proper tags (h5, p, ul, li).' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Groq API error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || 'No response generated.';
}

// ========== AI Feature 1: Smart Symptom Checker ==========
export async function renderSymptomChecker(container, userData) {
  const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const prePatientId = hashParams.get('patientId') || '';
  const prePatientName = hashParams.get('patientName') ? decodeURIComponent(hashParams.get('patientName')) : '';

  const patients = await getAllPatients();

  container.innerHTML = `
    <div class="page-header"><h1>AI Smart Symptom Checker</h1></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      <div class="card">
        <h4 style="margin-bottom:1rem;">Patient & Symptoms</h4>
        <form id="symptom-form">
          <div class="form-group">
            <label for="sc-patient">Patient</label>
            <select id="sc-patient" class="form-control">
              <option value="">Select patient (optional)</option>
              ${patients.map(p => `<option value="${p.id}" data-name="${p.name}" data-age="${p.age || ''}" data-gender="${p.gender || ''}" data-history="${p.medicalHistory || ''}" ${p.id === prePatientId ? 'selected' : ''}>${p.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="sc-age">Age *</label>
              <input type="number" id="sc-age" class="form-control" placeholder="Age" />
            </div>
            <div class="form-group">
              <label for="sc-gender">Gender *</label>
              <select id="sc-gender" class="form-control">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="sc-symptoms">Symptoms * (comma-separated)</label>
            <textarea id="sc-symptoms" class="form-control" placeholder="e.g. headache, fever, nausea, body aches"></textarea>
          </div>
          <div class="form-group">
            <label for="sc-history">Medical History</label>
            <textarea id="sc-history" class="form-control" placeholder="Any known conditions, current medications, allergies..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary btn-block">${icons.brain} Analyze Symptoms</button>
        </form>
      </div>
      <div id="ai-result-area">
        <div class="card">
          <div class="empty-state">
            <div class="icon">🧠</div>
            <h3>AI Diagnosis Results</h3>
            <p>Fill in patient symptoms and click "Analyze" to get AI-powered insights.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Auto-fill from patient selection
  document.getElementById('sc-patient').addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt.value) {
      document.getElementById('sc-age').value = opt.dataset.age || '';
      document.getElementById('sc-gender').value = opt.dataset.gender || '';
      document.getElementById('sc-history').value = opt.dataset.history || '';
    }
  });

  // Trigger auto-fill if patient pre-selected
  if (prePatientId) {
    document.getElementById('sc-patient').dispatchEvent(new Event('change'));
  }

  document.getElementById('symptom-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const valid = validateForm([
      { id: 'sc-age', label: 'Age', required: true },
      { id: 'sc-gender', label: 'Gender', required: true },
      { id: 'sc-symptoms', label: 'Symptoms', required: true },
    ]);
    if (!valid) return;

    const symptoms = document.getElementById('sc-symptoms').value.trim();
    const age = document.getElementById('sc-age').value;
    const gender = document.getElementById('sc-gender').value;
    const history = document.getElementById('sc-history').value.trim();
    const patientSelect = document.getElementById('sc-patient');

    const resultArea = document.getElementById('ai-result-area');
    resultArea.innerHTML = '<div class="card"><div class="loading-inline"><div class="spinner spinner-sm"></div> AI is analyzing symptoms...</div></div>';

    try {
      const prompt = `Analyze the following patient case:
- Age: ${age}
- Gender: ${gender}
- Symptoms: ${symptoms}
- Medical History: ${history || 'None provided'}

Please provide:
1. Possible conditions (list 3-5 most likely)
2. Risk level (Low, Medium, or High)
3. Suggested diagnostic tests
4. Immediate recommendations
5. Lifestyle suggestions

Format as HTML sections with h5 headings.`;

      const response = await callGroq(prompt);

      // Parse risk level from response
      let riskLevel = 'low';
      if (response.toLowerCase().includes('high risk') || response.toLowerCase().includes('risk level: high') || response.toLowerCase().includes('risk: high')) {
        riskLevel = 'high';
      } else if (response.toLowerCase().includes('medium risk') || response.toLowerCase().includes('moderate risk') || response.toLowerCase().includes('risk level: medium')) {
        riskLevel = 'medium';
      }

      resultArea.innerHTML = `
        <div class="ai-result">
          <h4>🧠 AI Diagnosis Results <span class="risk-badge risk-${riskLevel}">${riskLevel.toUpperCase()} RISK</span></h4>
          ${response}
          <p class="text-xs text-muted" style="margin-top:1rem;">⚠️ This is AI-generated analysis and should not replace professional medical advice.</p>
        </div>
      `;

      // Save diagnosis log
      if (patientSelect.value) {
        try {
          await addDiagnosisLog({
            patientId: patientSelect.value,
            doctorId: getCurrentUser().uid,
            symptoms: symptoms.split(',').map(s => s.trim()),
            age: parseInt(age),
            gender,
            history,
            aiResponse: response,
            riskLevel,
            possibleConditions: [],
            suggestedTests: [],
          });
        } catch (logErr) {
          console.warn('Failed to save diagnosis log:', logErr);
        }
      }
    } catch (err) {
      resultArea.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <div class="icon">⚠️</div>
            <h3>AI Unavailable</h3>
            <p>${err.message}</p>
          </div>
        </div>
      `;
    }
  });
}

// ========== AI Feature 2: Prescription Explanation ==========
export async function explainPrescription(rx) {
  const medicines = (rx.medicines || []).map(m => `${m.name} (${m.dosage}, ${m.frequency}, ${m.duration})`).join('\n- ');
  const prompt = `Explain this prescription in simple terms for a patient:

Medicines:
- ${medicines}

Instructions: ${rx.instructions || 'None'}

Please provide:
1. What each medicine does (in simple language)
2. How to take them properly
3. Common side effects to watch for
4. Lifestyle recommendations
5. Preventive advice

Format as HTML with h5 headings and bullet points. Keep language simple and patient-friendly.`;

  return await callGroq(prompt);
}

// ========== AI Feature 3: Risk Flagging ==========
export async function renderRiskFlags(container, userData) {
  container.innerHTML = `
    <div class="page-header"><h1>AI Risk Flagging</h1></div>
    <div class="card">
      <div class="loading-inline"><div class="spinner spinner-sm"></div> Analyzing patient data for risk patterns...</div>
    </div>
  `;

  try {
    const patients = await getAllPatients();
    const riskResults = [];

    // Check each patient's diagnosis history for risk patterns
    for (const patient of patients.slice(0, 20)) { // Limit to 20 for performance
      const logs = await getDiagnosisLogsByPatient(patient.id);
      if (logs.length >= 2) {
        const highRisk = logs.filter(l => l.riskLevel === 'high');
        const allSymptoms = logs.flatMap(l => l.symptoms || []);
        const symptomCounts = {};
        allSymptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
        const repeated = Object.entries(symptomCounts).filter(([_, c]) => c >= 2).map(([s]) => s);

        if (highRisk.length > 0 || repeated.length > 0) {
          riskResults.push({
            patient,
            highRiskCount: highRisk.length,
            repeatedSymptoms: repeated,
            totalDiagnoses: logs.length,
          });
        }
      }
    }

    if (riskResults.length === 0) {
      container.innerHTML = `
        <div class="page-header"><h1>AI Risk Flagging</h1></div>
        <div class="card">
          <div class="empty-state">
            <div class="icon">✅</div>
            <h3>No Risk Flags Detected</h3>
            <p>No patients have repeated infection patterns or high-risk indicators in their diagnosis history.</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="page-header"><h1>AI Risk Flagging</h1></div>
      <p class="text-muted" style="margin-bottom:1rem;">Patients with repeated symptoms or high-risk diagnoses are flagged below.</p>
      ${riskResults.map(r => `
        <div class="card" style="border-left:4px solid var(--danger);">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <h4>${r.patient.name} <span class="badge badge-danger">FLAGGED</span></h4>
              <p class="text-sm text-muted">Age: ${r.patient.age || '-'} | Gender: ${r.patient.gender || '-'} | Diagnoses: ${r.totalDiagnoses}</p>
            </div>
            <a href="#patient-profile?id=${r.patient.id}" class="btn btn-outline btn-sm">View Profile</a>
          </div>
          ${r.highRiskCount > 0 ? `<p class="text-sm" style="margin-top:0.5rem;color:var(--danger);">⚠️ ${r.highRiskCount} high-risk diagnosis${r.highRiskCount > 1 ? 'es' : ''}</p>` : ''}
          ${r.repeatedSymptoms.length > 0 ? `<p class="text-sm" style="margin-top:0.25rem;">🔄 Repeated symptoms: <strong>${r.repeatedSymptoms.join(', ')}</strong></p>` : ''}
        </div>
      `).join('')}
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="page-header"><h1>AI Risk Flagging</h1></div>
      <div class="card"><p style="color:var(--danger);">Error analyzing risk data: ${err.message}</p></div>
    `;
  }
}
