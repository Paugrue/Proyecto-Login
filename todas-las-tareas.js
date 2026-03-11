// /src/todas-las-tareas.js
import { TaskService } from '/TaskService.js';
import { AuthService } from '/AuthService.js';

const list = document.getElementById('all-list');
let currentUser = null;

// Requiere sesión
async function requireAuth() {
  const user = await AuthService.getCurrentUser();
  if (!user) {
    alert('Inicia sesión para ver esta página');
    window.location.href = '/';
    return null;
  }
  currentUser = user;
  return user;
}

function liTemplate(t, mine) {
  const checked = t.done ? 'checked' : '';
  const ownerLabel = `Creador: ${t.owner_name}`;
  return `
    <li>
      <div class="grow">
        <div class="title">${t.title}</div>
        <div class="meta">${ownerLabel} · ${new Date(t.created_at).toLocaleString()}</div>
        <div class="meta">Descripción:</div>
        <textarea data-id="${t.id}" class="desc" ${mine ? '' : 'disabled'}>${t.description ?? ''}</textarea>
      </div>
      <div class="controls">
        <label title="${mine ? 'Marcar realizada' : 'Sólo el creador puede marcar'}">
          <input type="checkbox" data-id="${t.id}" class="chk" ${checked} ${mine ? '' : 'disabled'}>
          Hecho
        </label>
        ${mine ? `
          <button data-id="${t.id}" class="btn-save">Guardar</button>
          <button data-id="${t.id}" class="btn-del" style="background:#fa4d4d;color:#fff;">Borrar</button>
        ` : ''}
      </div>
    </li>
  `;
}

function attachListeners() {
  // Guardar (título + descripción) — sólo dueño
  list.querySelectorAll('.btn-save').forEach((b) => {
    b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const li = e.currentTarget.closest('li');
      const desc = li.querySelector('.desc').value.trim();
      const titleEl = li.querySelector('.title');
      const newTitle = prompt('Editar título:', titleEl.textContent);

      try {
        if (newTitle && newTitle.trim() && newTitle.trim() !== titleEl.textContent) {
          await TaskService.updateTitle(id, newTitle.trim());
          titleEl.textContent = newTitle.trim();
        }
        await TaskService.updateDescription(id, desc);
        alert('Guardado');
      } catch (err) {
        alert('Error al guardar: ' + (err?.message || 'RLS (sólo el creador puede editar)'));
      }
    });
  });

  // Borrar — sólo dueño
  list.querySelectorAll('.btn-del').forEach((b) => {
    b.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (!confirm('¿Borrar tarea?')) return;
      try {
        await TaskService.delete(id);
        await load();
      } catch (err) {
        alert('No se pudo borrar: ' + (err?.message || 'RLS (sólo el creador puede borrar)'));
      }
    });
  });

  // Checkbox Hecho — sólo dueño (revertir si falla)
  list.querySelectorAll('.chk').forEach((c) => {
    c.addEventListener('change', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const checked = e.currentTarget.checked;
      try {
        await TaskService.toggleDone(id, checked);
      } catch (err) {
        e.currentTarget.checked = !checked; // revert
        alert('No se pudo cambiar el estado: ' + (err?.message || 'RLS (sólo el creador puede marcar)'));
      }
    });
  });
}

function render(tasks) {
  list.innerHTML = tasks.map((t) => liTemplate(t, t.user_id === currentUser.id)).join('');
  attachListeners();
}

async function load() {
  const tasks = await TaskService.getAllWithOwner();
  render(tasks);
}

// Init
(async () => {
  if (await requireAuth()) load();
})();