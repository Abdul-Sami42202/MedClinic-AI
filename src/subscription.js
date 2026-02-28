import { getAllUsers, getUsersByRole, updateUser, deleteUserDoc } from './Firebase.js';
import { showToast, icons, getRoleBadge, getPlanBadge, openModal, closeModal } from './utils.js';

// ========== Feature Gating ==========
export function canUseAI(userData) {
  return userData.plan === 'pro';
}

export function getPatientLimit(userData) {
  return userData.plan === 'pro' ? Infinity : 50;
}

// ========== Subscription Plans Page ==========
export async function renderSubscriptionPlans(container, userData) {
  const users = await getAllUsers();

  container.innerHTML = `
    <div class="page-header"><h1>Subscription Plans</h1></div>

    <div class="plans-grid" style="margin-bottom:2rem;">
      <div class="plan-card">
        <h3>Free Plan</h3>
        <div class="price">$0 <span>/month</span></div>
        <ul class="features-list">
          <li><span class="check">✓</span> Up to 50 patients</li>
          <li><span class="check">✓</span> Appointment management</li>
          <li><span class="check">✓</span> Digital prescriptions</li>
          <li><span class="check">✓</span> PDF generation</li>
          <li><span class="cross">✗</span> AI Diagnosis</li>
          <li><span class="cross">✗</span> AI Prescription Explanation</li>
          <li><span class="cross">✗</span> Risk Flagging</li>
          <li><span class="cross">✗</span> Advanced Analytics</li>
        </ul>
      </div>
      <div class="plan-card featured">
        <span class="badge badge-primary" style="margin-bottom:0.5rem;">RECOMMENDED</span>
        <h3>Pro Plan</h3>
        <div class="price">$49 <span>/month</span></div>
        <ul class="features-list">
          <li><span class="check">✓</span> Unlimited patients</li>
          <li><span class="check">✓</span> Appointment management</li>
          <li><span class="check">✓</span> Digital prescriptions</li>
          <li><span class="check">✓</span> PDF generation</li>
          <li><span class="check">✓</span> AI Smart Diagnosis</li>
          <li><span class="check">✓</span> AI Prescription Explanation</li>
          <li><span class="check">✓</span> AI Risk Flagging</li>
          <li><span class="check">✓</span> Advanced Analytics</li>
        </ul>
      </div>
    </div>

    ${userData.role === 'admin' ? `
      <div class="card">
        <div class="card-header"><h3>User Subscription Management</h3></div>
        <div class="table-container">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Plan</th><th>Actions</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>${u.name || '-'}</td>
                  <td class="text-sm">${u.email || '-'}</td>
                  <td>${getRoleBadge(u.role)}</td>
                  <td>${getPlanBadge(u.plan)}</td>
                  <td>
                    <button class="btn btn-sm ${u.plan === 'pro' ? 'btn-warning' : 'btn-success'} toggle-plan-btn"
                      data-id="${u.id}" data-plan="${u.plan || 'free'}">
                      ${u.plan === 'pro' ? 'Downgrade' : 'Upgrade'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}
  `;

  // Plan toggle buttons
  container.querySelectorAll('.toggle-plan-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.id;
      const currentPlan = btn.dataset.plan;
      const newPlan = currentPlan === 'pro' ? 'free' : 'pro';

      try {
        await updateUser(userId, { plan: newPlan });
        showToast(`User ${newPlan === 'pro' ? 'upgraded to Pro' : 'downgraded to Free'}`, 'success');
        renderSubscriptionPlans(container, userData);
      } catch (err) {
        showToast('Failed to update plan', 'error');
      }
    });
  });
}

// ========== Manage Users (Doctors/Receptionists) ==========
export async function renderManageUsers(container, role, userData) {
  const roleLabel = role === 'doctor' ? 'Doctors' : 'Receptionists';
  const users = await getUsersByRole(role);

  container.innerHTML = `
    <div class="page-header">
      <h1>Manage ${roleLabel}</h1>
    </div>
    <div class="card">
      ${users.length > 0 ? `
        <div class="table-container">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Plan</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><strong>${u.name || '-'}</strong></td>
                  <td>${u.email || '-'}</td>
                  <td>${getPlanBadge(u.plan)}</td>
                  <td class="text-sm">${u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '-'}</td>
                  <td>
                    <button class="btn btn-ghost btn-sm edit-role-btn" data-id="${u.id}" data-name="${u.name}" data-role="${u.role}">${icons.edit}</button>
                    <button class="btn btn-ghost btn-sm delete-user-btn" data-id="${u.id}" style="color:var(--danger);">${icons.trash}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="empty-state">
          <div class="icon">👥</div>
          <h3>No ${roleLabel} Found</h3>
          <p>${roleLabel} will appear here once they sign up with the "${role}" role.</p>
        </div>
      `}
    </div>
  `;

  // Edit role
  container.querySelectorAll('.edit-role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const userId = btn.dataset.id;
      const userName = btn.dataset.name;
      const body = `
        <div class="form-group">
          <label for="edit-user-role">Change Role for ${userName}</label>
          <select id="edit-user-role" class="form-control">
            <option value="doctor" ${btn.dataset.role === 'doctor' ? 'selected' : ''}>Doctor</option>
            <option value="receptionist" ${btn.dataset.role === 'receptionist' ? 'selected' : ''}>Receptionist</option>
            <option value="patient" ${btn.dataset.role === 'patient' ? 'selected' : ''}>Patient</option>
            <option value="admin" ${btn.dataset.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" id="cancel-role-btn">Cancel</button>
        <button class="btn btn-primary" id="save-role-btn">Save</button>
      `;
      openModal('Edit User Role', body, footer);

      document.getElementById('cancel-role-btn').addEventListener('click', closeModal);
      document.getElementById('save-role-btn').addEventListener('click', async () => {
        const newRole = document.getElementById('edit-user-role').value;
        try {
          await updateUser(userId, { role: newRole });
          closeModal();
          showToast('User role updated!', 'success');
          renderManageUsers(container, role, userData);
        } catch (err) {
          showToast('Failed to update role', 'error');
        }
      });
    });
  });

  // Delete user
  container.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to remove this user?')) return;
      try {
        await deleteUserDoc(btn.dataset.id);
        showToast('User removed from system', 'success');
        renderManageUsers(container, role, userData);
      } catch (err) {
        showToast('Failed to delete user', 'error');
      }
    });
  });
}
