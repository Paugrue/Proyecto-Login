// src/admin-profile.js
// src/admin-profile.js
import { supabase } from '/supabaseClient.js';   
import { AuthService } from '/AuthService.js';
import { TaskService } from '/TaskService.js'; 
import { StorageService } from '/StorageService.js';


const ADMIN_EMAIL = 'paulagrueso@gmail.com';

const fullNameInput   = document.getElementById('fullName');
const emailInput      = document.getElementById('emailInput');
const avatarInput     = document.getElementById('avatarInput');
const avatarPreview   = document.getElementById('avatarPreview');
const saveBtn         = document.getElementById('saveBtn');

let currentUser   = null;
let currentProfile = null;
let selectedFile   = null;

// --- 1) Solo admin accede a esta página
async function requireAdmin() {
  const user = await AuthService.getCurrentUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    alert('Sección exclusiva de administración');
    window.location.href = '/';
    return null;
  }
  return user;
}

// --- 2) Cargar perfil
async function loadProfile(uid) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, updated_at')
    .eq('id', uid)
    .single();
  if (error) throw error;
  return data;
}

// --- 3) Subir avatar si se cambió
async function uploadAvatarIfNeeded(uid) {
  if (!selectedFile) return currentProfile?.avatar_url || null;

  const ext      = (selectedFile.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `avatar.${ext}`;
  const path     = `avatars/${uid}/${fileName}`;

  const { error: upErr } = await supabase.storage
    .from('files')
    .upload(path, selectedFile, { upsert: true });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from('files').getPublicUrl(path);
  return pub?.publicUrl || null;
}

// --- 4) Guardar cambios: nombre + avatar_url + (opcional) email
async function saveChanges() {
  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Guardando...';

    const newFullName = fullNameInput.value.trim();
    const newEmail    = emailInput.value.trim();
    const avatarUrl   = await uploadAvatarIfNeeded(currentUser.id);

    // 4.1) Cambiar email en AUTH si ha cambiado
    let emailChangedPending = false;
    if (newEmail && newEmail !== currentUser.email) {
      const { error: emailErr } = await supabase.auth.updateUser({ email: newEmail });
      if (emailErr) {
        // este error suele ser “need confirmation” o el detalle de por qué no se pudo
        alert('No se pudo iniciar el cambio de email: ' + (emailErr.message || 'desconocido'));
      } else {
        emailChangedPending = true; // habrá que confirmar el nuevo email
      }
    }

    // 4.2) Actualizar perfil (nombre / avatar / email en profiles)
    const updates = {
      full_name: newFullName,
      updated_at: new Date().toISOString(),
    };
    if (avatarUrl) updates.avatar_url = avatarUrl;
    if (newEmail)  updates.email      = newEmail;

    const { error: profErr } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentUser.id);
    if (profErr) throw profErr;

    // 4.3) Mensaje y redirección
    if (emailChangedPending) {
      alert('Nombre/Avatar actualizado. Revisa el nuevo email para confirmar el cambio de email.');
    } else {
      alert('Perfil actualizado.');
    }

    // Elige el destino que prefieras:
    window.location.href = '/mis-tareas.html';
    // o, si creas la página de usuarios: window.location.href = '/admin/users.html';

  } catch (e) {
    console.error('[PROFILE] save error:', e);
    alert('No se pudo actualizar el perfil: ' + (e.message || 'desconocido'));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar cambios';
  }
}

// --- 5) UI
avatarInput.addEventListener('change', (e) => {
  selectedFile = e.target.files?.[0] || null;
  if (selectedFile) {
    const reader = new FileReader();
    reader.onload = () => { avatarPreview.src = reader.result; };
    reader.readAsDataURL(selectedFile);
  }
});

saveBtn.addEventListener('click', saveChanges);

// --- 6) Init
(async () => {
  const user = await requireAdmin();
  if (!user) return;
  currentUser = user;

  try {
    currentProfile = await loadProfile(user.id);
    fullNameInput.value = currentProfile?.full_name || '';
    // Cargamos email (de profiles si lo tienes guardado, si no del auth user actual)
    emailInput.value = currentProfile?.email || user.email || '';
    if (currentProfile?.avatar_url) {
      avatarPreview.src = currentProfile.avatar_url;
    } else {
      avatarPreview.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
           <rect width="100%" height="100%" fill="#0d0d0d"/>
           <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                 fill="#777" font-size="16" font-family="Arial">Sin avatar</text>
         </svg>`
      );
    }
  } catch (e) {
    console.error('[PROFILE] load error:', e);
    alert('No se pudo cargar tu perfil (revisa RLS en tabla profiles).');
  }
})();