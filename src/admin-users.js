import { supabase } from '/supabaseClient.js';
import { AuthService } from '/AuthService.js';

const ADMIN_EMAIL = 'paulagrueso@gmail.com';
const tbody = document.getElementById('usersBody');

async function requireAdmin() {
  const user = await AuthService.getCurrentUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    alert('Sección exclusiva de administración');
    window.location.href = '/';
    return null;
  }
  return user;
}

async function loadUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

function render(users) {
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.full_name || '(sin nombre)'}</td>
      <td>${u.email || ''}</td>
      <td>${u.avatar_url ? `${u.avatar_url}" target="_blank">ver</a>` : ''}</td>
      <td>${u.updated_at ? new Date(u.updated_at).toLocaleString() : ''}</td>
    </tr>
  `).join('');
}

(async () => {
  const admin = await requireAdmin();
  if (!admin) return;
  try {
    const users = await loadUsers();
    render(users);
  } catch (e) {
    console.error('[ADMIN USERS] load error:', e);
    alert('No se pudieron cargar los usuarios. Revisa las políticas RLS de profiles.');
  }
})();