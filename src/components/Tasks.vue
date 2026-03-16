<template>
  <div class="tasks-container">
    <h3 v-if="title" class="tasks-header">{{ title }}</h3>

    <form v-if="allowAdd" @submit.prevent="addTask" class="task-form-box">
      <input v-model="newTask" type="text" placeholder="Título de la tarea" class="form-input" />
      <textarea v-model="newDesc" placeholder="Descripción (opcional)" rows="2" class="form-textarea"></textarea>
      <input type="file" ref="fileInput" class="form-file" accept="image/*,application/pdf" />
      <button type="submit" class="btn-add-task">Añadir tarea</button>
    </form>

    <div class="task-list-wrapper">
      <div v-for="task in tasks" :key="task.id" class="task-row-item">
        
        <div class="task-check-area">
          <input
            type="checkbox"
            :checked="task.completed"
            :disabled="!canEdit(task)"
            @change="toggleCompleted(task, $event.target.checked)"
            class="custom-checkbox"
          />
        </div>

        <div class="task-info-area">
          <div class="title-container">
            <span v-if="editingId !== task.id" class="text-title" :class="{ is_done: task.completed }">
              {{ task.title }}
            </span>
            <input v-else v-model="editTitle" class="edit-input-field" />
          </div>

          <div class="desc-container">
            <p v-if="editingId !== task.id" class="text-desc" :class="{ is_done: task.completed }">
              {{ task.description || 'Sin descripción' }}
            </p>
            <textarea v-else v-model="editDesc" class="edit-area-field" rows="2"></textarea>
          </div>

          <div v-if="task.file_url" class="file-preview-zone">
            <img v-if="isImage(task.file_url)" :src="task.file_url" class="mini-thumb" />
            <a :href="task.file_url" target="_blank" class="file-link">📎 Ver adjunto</a>
          </div>

          <div v-if="editingId === task.id" class="edit-file-zone">
            <input type="file" :ref="el => editFileInputs[task.id] = el" class="form-file" accept="image/*,application/pdf" />
          </div>

          <div v-if="showCreator" class="creator-tag">Por: {{ task.creator_name || 'Usuario' }}</div>
        </div>

        <div class="task-btns-area">
          <button v-if="canEdit(task) && editingId !== task.id" @click="startEdit(task)" class="btn-icon edit-bg">✏</button>
          <button v-if="canEdit(task) && editingId === task.id" @click="saveEdit(task)" class="btn-icon save-bg">💾</button>
          <button v-if="canEdit(task)" @click="deleteTask(task.id)" class="btn-icon delete-bg">🗑</button>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
// ... (Toda tu lógica de Script queda igual, no hace falta cambiarla)
import { ref } from "vue"
import { supabase } from "@/supabaseClient"

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  user: { type: Object, required: true },
  allowAdd: { type: Boolean, default: true },
  showCreator: { type: Boolean, default: false },
  title: { type: String, default: "" }
})

const emit = defineEmits(["reload"])

const newTask = ref("")
const newDesc = ref("")
const fileInput = ref(null)
const editFileInputs = ref({})
const editingId = ref(null)
const editTitle = ref("")
const editDesc = ref("")
const oldFileUrl = ref(null)

function canEdit(task) { return props.user && task.user_id === props.user.id }
function isImage(url) { return /\.(jpg|jpeg|png|webp|gif)$/i.test(url) }

async function uploadTaskFile(uid, file) {
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_")
  const filePath = `tasks/${uid}/${Date.now()}-${safeName}`
  const { error } = await supabase.storage.from("files").upload(filePath, file, { upsert: true, contentType: file.type })
  if (error) throw new Error(error.message)
  return supabase.storage.from("files").getPublicUrl(filePath).data.publicUrl
}

async function addTask() {
  const title = newTask.value.trim()
  if (!title) return
  const file = fileInput.value?.files?.[0]
  let fileUrl = null
  if (file) fileUrl = await uploadTaskFile(props.user.id, file)
  const creatorName = props.user.user_metadata?.full_name || props.user.email || "Usuario"
  const { error } = await supabase.from("tasks").insert({ title, description: newDesc.value.trim(), completed: false, user_id: props.user.id, file_url: fileUrl, creator_name: creatorName })
  if (error) return alert(error.message)
  newTask.value = ""; newDesc.value = ""; fileInput.value.value = "";
  emit("reload")
}

function startEdit(task) {
  editingId.value = task.id; editTitle.value = task.title; editDesc.value = task.description; oldFileUrl.value = task.file_url
}

async function saveEdit(task) {
  let newFileUrl = oldFileUrl.value
  const newFile = editFileInputs.value[task.id]?.files?.[0]
  if (newFile) {
    const newUrl = await uploadTaskFile(props.user.id, newFile)
    newFileUrl = newUrl
    if (oldFileUrl.value) {
      const path = oldFileUrl.value.split("/storage/v1/object/public/files/")[1]
      if (path) await supabase.storage.from("files").remove([path])
    }
  }
  const { error } = await supabase.from("tasks").update({ title: editTitle.value.trim(), description: editDesc.value.trim(), file_url: newFileUrl }).eq("id", task.id)
  if (error) return alert(error.message)
  editingId.value = null; oldFileUrl.value = null;
  emit("reload")
}

async function deleteTask(id) {
  if (!confirm("¿Eliminar tarea?")) return;
  try {
    const { data: taskData } = await supabase.from("tasks").select("*").eq("id", String(id)).single();
    if (taskData?.file_url) {
      const path = taskData.file_url.split("/files/v1/object/public/files/")[1];
      if (path) await supabase.storage.from("files").remove([path]);
    }
    await supabase.from("tasks").delete().eq("id", String(id));
    emit("reload");
  } catch (err) { alert("Error al borrar"); }
}

async function toggleCompleted(task, checked) {
  await supabase.from("tasks").update({ completed: checked }).eq("id", task.id)
  emit("reload")
}
</script>

<style scoped>
/* Contenedor principal con ancho controlado */
.tasks-container {
  max-width: 100%;
  margin: 0;
}

/* Formulario de añadir */
.task-form-box {
  background: #121212;
  padding: 15px;
  border-radius: 12px;
  border: 1px solid #333;
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-input, .form-textarea, .form-file {
  background: #1e1e1e;
  border: 1px solid #444;
  color: white;
  padding: 10px;
  border-radius: 8px;
}

.btn-add-task {
  background: var(--primary);
  color: black;
  font-weight: bold;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
}

/* LA LISTA: DISEÑO RECTANGULAR PROTEGIDO */
.task-list-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-row-item {
  display: grid;
  grid-template-columns: 40px 1fr auto; /* Checkbox | Contenido | Botones */
  align-items: center;
  background: #1b1b1b;
  padding: 12px 18px;
  border-radius: 12px;
  border: 1px solid #2d2d2d;
}

.task-check-area {
  display: flex;
  justify-content: center;
}

.custom-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.task-info-area {
  padding: 0 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.text-title {
  font-weight: 600;
  font-size: 1rem;
}

.text-desc {
  font-size: 0.85rem;
  color: #a0a0a0;
  margin: 0;
}

.is_done {
  text-decoration: line-through;
  opacity: 0.5;
}

/* Área de archivos dentro del rectángulo */
.file-preview-zone {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.mini-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #444;
}

.file-link {
  font-size: 0.75rem;
  color: var(--primary);
  text-decoration: none;
}

/* Botones de acción */
.task-btns-area {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-bg { background: var(--primary); }
.save-bg { background: #4cc9f0; }
.delete-bg { background: var(--danger); }

.edit-input-field, .edit-area-field {
  width: 100%;
  background: #000;
  color: white;
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 5px;
}

.creator-tag {
  font-size: 0.7rem;
  color: #666;
  margin-top: 4px;
}
</style>