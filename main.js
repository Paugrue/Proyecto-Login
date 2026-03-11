// main.js
import { supabase } from './src/supabaseClient';
import { AuthService } from './AuthService';
import { TaskService } from './TaskService';
import { StorageService } from './StorageService';

const app = {
  user: null,
  isAdmin: false,
  adminEmail: 'paulagrueso@gmail.com',

  /* ------------------------
     LOGIN
  ------------------------- */
  handleLogin: async () => {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const btn = document.getElementById('login-btn');
    if (!email || !password) return alert('Rellena los campos');

    btn.innerText = 'Verificando...';
    btn.disabled = true;

    try {
      const user = await AuthService.login(email, password);
      app.user = user;
      app.showApp();

      // Redirigir si el login es OK
      window.location.href = '/Proyecto-Login/mis-tareas.html';
    } catch (err) {
      // Si no existe, registramos y pedimos que vuelva a pulsar entrar
      try {
        await AuthService.signUp(email, password);
        alert('Usuario registrado. Pulsa entrar de nuevo.');
      } catch (sErr) {
        alert('Error: ' + sErr.message);
      }
    } finally {
      btn.innerText = 'Entrar / Registrarse';
      btn.disabled = false;
    }
  },

  /* ------------------------
     RESET PASSWORD (enviar email)
  ------------------------- */
  handleResetPassword: async () => {
    const email = document.getElementById('email')?.value?.trim();
    if (!email) {
      alert('Escribe tu email en el campo de email antes de pedir la recuperación.');
      return;
    }

    // Asegúrate de tener /reset-password.html y registrar la URL en Supabase → Redirect URLs
    const redirectUrl = window.location.origin + '/reset-password.html';

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      alert('Te hemos enviado un email con el enlace para restablecer la contraseña. Revisa tu bandeja (y SPAM).');
    } catch (err) {
      alert('No se pudo enviar el email de recuperación: ' + (err.message || 'error desconocido'));
    }
  },

  /* ------------------------
     MOSTRAR INFO USUARIO EN HEADER
  ------------------------- */
  showUserInfo: () => {
    const container = document.getElementById('userInfo');
    if (!container || !app.user) return;

    const name = app.user.user_metadata?.full_name || app.user.user_metadata?.name || 'Usuario';
    const email = app.user.email;

    container.innerHTML = `
      👤 <strong>${name}</strong><br>
      📧 ${email}
    `;
  },

  /* ------------------------
     TAREAS (vista principal)
  ------------------------- */
  addTask: async () => {
    const titleInput = document.getElementById('task-title');
    const fileInput = document.getElementById('task-file');
    const btn = document.getElementById('add-btn');
    if (!titleInput?.value) return alert('Escribe un título');

    btn.innerText = 'Guardando...';
    btn.disabled = true;

    try {
      let fileUrl = null;
      if (fileInput?.files?.[0]) {
        // Sube a /attachments/<uid>/...
        fileUrl = await StorageService.uploadFile('attachments', fileInput.files[0], app.user.id);
      }
      await TaskService.create(titleInput.value, app.user.id, fileUrl);
      titleInput.value = '';
      if (fileInput) fileInput.value = '';
      app.loadTasks();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      btn.innerText = 'Añadir Tarea';
      btn.disabled = false;
    }
  },

  loadTasks: async () => {
    try {
      const tasks = await TaskService.getAll();
      app.renderTaskList(tasks, false);
    } catch (err) {
      console.error('Error cargando tareas:', err);
    }
  },

  loadAllTasksAdmin: async () => {
    try {
      const tasks = await TaskService.getAllAdmin();
      app.renderTaskList(tasks, true);
    } catch (err) {
      alert('Error de permisos: Revisa el SQL de RLS en Supabase.');
    }
  },

  renderTaskList: (tasks, isAdminView) => {
    const list = document.getElementById('task-list');
    if (!list) return;

    list.innerHTML = (tasks || [])
      .map(
        (t) => `
        <li style="${isAdminView ? 'border-left: 4px solid #7209b7;' : ''}">
          <div style="overflow: hidden;">
            <span class="task-title">${t.title}</span>
            ${
              isAdminView
                ? `<span class="task-user">Usuario: ${String(t.user_id).substring(0, 8)}...</span>`
                : ''
            }
          </div>
          <div class="task-actions">
            ${t.file_url ? `<a href="${t.file_url}" target="_blank" class="file-link">📎</a>` : ''}
            <button class="btn-icon" onclick="app.editTask('${t.id}','${String(t.title).replace(/'/g, "\\'")}')" style="background:#f39c12;">✏️</button>
            <button class="btn-icon" onclick="app.deleteTask('${t.id}')" style="background:var(--danger);">✕</button>
          </div>
        </li>
      `
      )
      .join('');
  },

/* ------------------------
   ADMIN
------------------------- */
checkAdmin: function () {
  if (this.user && this.user.email === this.adminEmail) {
    this.isAdmin = true;

    const container = document.getElementById('admin-container');
    if (container) {
      // 🔁 Limpieza: si existe un botón previo, lo elimino para garantizar el handler nuevo
      const oldAll = document.getElementById('admin-btn-all');
      if (oldAll) oldAll.remove();

      // 1) Botón: Ver todas las tareas → NAVEGAR A RUTA
      const btnAll = document.createElement('button');
      btnAll.id = 'admin-btn-all';
      btnAll.textContent = '📋 Ver todas las tareas';
      btnAll.style.marginRight = '8px';
      btnAll.onclick = () => {
        console.log('[ADMIN] navegando a /todas-las-tareas.html desde', window.location.pathname);
        window.location.href = '/Proyecto-Login/todas-las-tareas.html';
      };
      container.appendChild(btnAll);

      // 2) Botón: Editar perfil (IMPORTANTE: usar .html en local)
      if (!document.getElementById('admin-btn-profile')) {
        const btnProfile = document.createElement('button');
        btnProfile.id = 'admin-btn-profile';
        btnProfile.textContent = '👤 Editar perfil';
        btnProfile.onclick = () => { window.location.href = '/Proyecto-Login/admin/profile.html'; };
        container.appendChild(btnProfile);
      }

      
    }

    // Mostrar sección galería admin si existe
    const adminGallerySection = document.getElementById('admin-gallery-section');
    if (adminGallerySection) adminGallerySection.style.display = 'block';
  }
},


  /* ------------------------
     EDITAR / BORRAR TAREA
  ------------------------- */
  editTask: async (id, currentTitle) => {
    const newTitle = prompt('Edita el título de la tarea:', currentTitle);
    if (newTitle !== null && newTitle.trim() !== '' && newTitle !== currentTitle) {
      try {
        await TaskService.updateTitle(id, newTitle.trim());
        app.loadTasks();
      } catch (err) {
        alert('Error al editar: ' + err.message);
      }
    }
  },

  deleteTask: async (id) => {
    if (confirm('¿Seguro que quieres borrar esta tarea?')) {
      await TaskService.delete(id);
      app.loadTasks();
    }
  },

  /* ------------------------
     GALERÍA DE IMÁGENES
  ------------------------- */
  // Pública
  loadPublicGallery: async () => {
    const gallery = document.getElementById('public-gallery');
    if (!gallery) return;

    try {
      const { data, error } = await supabase.storage
        .from('files')
        .list('public', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) {
        console.error('[PUBLIC GALLERY] list error:', error);
        gallery.innerHTML = '<p>No se pudo listar la carpeta pública.</p>';
        return;
      }

      const files = Array.isArray(data) ? data : [];
      const itemsHtml = files
        .map((f) => {
          const path = `public/${f.name}`;
          const { data: pub } = supabase.storage.from('files').getPublicUrl(path);
          const url = pub?.publicUrl || '#';
          return `<img src="${url}" alt="${f.name}" style="width:120px; margin:5px; border-radius:8px;">`;
        })
        .join('');

      gallery.innerHTML = itemsHtml || '<p>No hay imágenes públicas todavía.</p>';
    } catch (err) {
      console.error('[PUBLIC GALLERY] exception:', err);
      gallery.innerHTML = '<p>Error cargando galería pública</p>';
    }
  },

  // Admin
  loadAdminGallery: async () => {
    if (!app.isAdmin) return; // seguridad básica en cliente
    const gallery = document.getElementById('admin-gallery');
    if (!gallery) return;

    try {
      const { data, error } = await supabase.storage
        .from('files')
        .list('admin', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) {
        console.error('[ADMIN GALLERY] list error:', error);
        gallery.innerHTML = '<p>No se pudo listar la carpeta admin.</p>';
        return;
      }

      const files = Array.isArray(data) ? data : [];
      const itemsHtml = files
        .map((f) => {
          const path = `admin/${f.name}`;
          const { data: pub } = supabase.storage.from('files').getPublicUrl(path);
          const url = pub?.publicUrl || '#';
          return `<img src="${url}" alt="${f.name}" style="width:120px; margin:5px; border-radius:8px;">`;
        })
        .join('');

      gallery.innerHTML = itemsHtml || '<p>No hay imágenes en la galería admin aún.</p>';
    } catch (err) {
      console.error('[ADMIN GALLERY] exception:', err);
      gallery.innerHTML = '<p>Error cargando galería admin</p>';
    }
  },

  // Subida a admin (usa tu StorageService)
  uploadGalleryImage: async (inputElement) => {
    if (!app.isAdmin) return alert('Solo admin puede subir imágenes');
    const file = inputElement?.files?.[0];
    if (!file) return alert('Selecciona un archivo');

    try {
      const url = await StorageService.uploadFile('files', file, 'admin');
      alert('Imagen subida correctamente');
      app.loadAdminGallery();
    } catch (err) {
      alert('Error subiendo imagen: ' + err.message);
    }
  },

  // Subida a pública (directo por supabase.storage)
  uploadPublicImage: async (btnEl) => {
    const input = document.getElementById('uploadPublic');
    const file = input?.files?.[0];
    if (!file) {
      alert('Selecciona una imagen');
      return;
    }

    try {
      btnEl.disabled = true;
      btnEl.textContent = 'Subiendo...';

      const path = `public/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('files').upload(path, file);
      if (error) throw error;

      alert('Imagen subida a galería pública');
      input.value = '';
      await app.loadPublicGallery();
    } catch (err) {
      console.error('[PUBLIC UPLOAD] error:', err);
      alert('Error subiendo imagen pública: ' + (err.message || 'desconocido'));
    } finally {
      btnEl.disabled = false;
      btnEl.textContent = 'Subir a pública';
    }
  },

  /* ------------------------
     MOSTRAR APP
  ------------------------- */
  showApp: () => {
    const auth = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');
    if (auth) auth.style.display = 'none';
    if (appSection) appSection.style.display = 'block';

    app.showUserInfo();
    app.checkAdmin();
    app.loadTasks();
    app.loadPublicGallery();

    if (app.isAdmin) app.loadAdminGallery();

    // (Opcional) Muestra barra de subida pública solo si hay sesión
    const pubBar = document.getElementById('public-upload-bar');
    if (pubBar) pubBar.style.display = app.user ? 'block' : 'none';
  },

  /* ------------------------
     LOGOUT
  ------------------------- */
  handleLogout: async () => {
    await AuthService.logout();
    location.reload();
  },
};

window.app = app;

/* ------------------------
   PERFIL DE USUARIO (admin)
------------------------- */
async function loadProfilePage(user) {
  const nameInput = document.getElementById('nameInput');
  if (!nameInput) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  nameInput.value = profile?.full_name || '';

  const saveBtn = document.getElementById('saveProfile');
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const newName = nameInput.value;
      await supabase.from('profiles').update({ full_name: newName }).eq('id', user.id);
      alert('Perfil actualizado');
      app.showUserInfo();
    };
  }
}

/* ------------------------
   INIT APP
------------------------- */
async function initApp() {
  const user = await AuthService.getCurrentUser();

  if (user) {
    app.user = user;
    app.showApp();

    // Si es admin, asegurar flag e inicializar su galería
    if (app.user.email === app.adminEmail) {
      app.isAdmin = true;
      const adminGallerySection = document.getElementById('admin-gallery-section');
      if (adminGallerySection) adminGallerySection.style.display = 'block';
      app.loadAdminGallery();
    }
  }

  // Ruta opcional de perfil admin
  const path = window.location.pathname;
  if (path === '/admin/profile') {
    if (!user || user.email !== app.adminEmail) {
      window.location.href = '/';
      return;
    }
    loadProfilePage(user);
  }
}

initApp();