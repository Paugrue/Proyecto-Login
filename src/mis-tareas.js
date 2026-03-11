import { supabase } from './supabaseClient'
import { TaskService } from '../TaskService'
import { AuthService } from '../AuthService'

const list = document.getElementById('my-list')
const btnNew = document.getElementById('btn-new')

let currentUser = null

async function requireAuth() {
  const user = await AuthService.getCurrentUser()
  if (!user) {
    location.href = '/'
    return null
  }
  currentUser = user
  return user
}

function render(tasks) {
  list.innerHTML = tasks.map(t => {
    const checked = t.done ? 'checked' : ''
    return `
      <li>
        <div class="grow">
          <div class="title">${t.title}</div>
          <div class="meta">${new Date(t.created_at).toLocaleString()}</div>
          <div class="meta">Descripción:</div>
          <textarea data-id="${t.id}" class="desc">${t.description || ''}</textarea>
        </div>
        <div class="controls">
          <label title="Marcar realizada">
            <input type="checkbox" data-id="${t.id}" class="chk" ${checked} />
            Hecho
          </label>
          <button data-id="${t.id}" class="btn-save">Guardar</button>
          <button data-id="${t.id}" class="btn-del" style="background:#fa4d4d;color:#fff;">Borrar</button>
        </div>
      </li>
    `
  }).join('')

  // listeners
  list.querySelectorAll('.btn-save').forEach(b => b.addEventListener('click', async (e) => {
    const id = e.currentTarget.getAttribute('data-id')
    const li = e.currentTarget.closest('li')
    const desc = li.querySelector('.desc').value.trim()
    const titleEl = li.querySelector('.title')
    const newTitle = prompt('Editar título:', titleEl.textContent)
    try {
      if (newTitle && newTitle.trim() && newTitle.trim() !== titleEl.textContent) {
        await TaskService.updateTitle(id, newTitle.trim())
        titleEl.textContent = newTitle.trim()
      }
      await TaskService.updateDescription(id, desc)
      alert('Guardado')
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }))

  list.querySelectorAll('.btn-del').forEach(b => b.addEventListener('click', async (e) => {
    const id = e.currentTarget.getAttribute('data-id')
    if (confirm('¿Borrar tarea?')) {
      await TaskService.delete(id)
      load()
    }
  }))

  list.querySelectorAll('.chk').forEach(c => c.addEventListener('change', async (e) => {
    const id = e.currentTarget.getAttribute('data-id')
    await TaskService.toggleDone(id, e.currentTarget.checked)
  }))
}

async function load() {
  const tasks = await TaskService.getMine(currentUser.id)
  render(tasks)
}

// crear nueva
btnNew.addEventListener('click', async () => {
  const title = document.getElementById('new-title').value.trim()
  const description = document.getElementById('new-desc').value.trim()
  const file = document.getElementById('new-file').files[0] || null

  if (!title) { alert('Escribe un título'); return }

  let file_url = null
  if (file) {
    // Si ya usas StorageService, puedes reutilizarlo. Aquí, como ejemplo rápido:
    const { data, error } = await supabase.storage.from('files').upload(`attachments/${currentUser.id}/${Date.now()}_${file.name}`, file)
    if (error) { alert(error.message); return }
    file_url = supabase.storage.from('files').getPublicUrl(data.path).data.publicUrl
  }

  await TaskService.createV2({ title, description, user_id: currentUser.id, file_url })
  document.getElementById('new-title').value = ''
  document.getElementById('new-desc').value = ''
  document.getElementById('new-file').value = ''
  load()
})

;(async () => {
  if (await requireAuth()) load()
})()