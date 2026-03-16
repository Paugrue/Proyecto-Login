<template>
  <div class="tasks-container">
    <h3 v-if="title" class="tasks-header">{{ title }}</h3>

    <!-- Formulario -->
    <form v-if="allowAdd" @submit.prevent="addTask" class="task-form">
      <input
        v-model="newTask"
        type="text"
        placeholder="Título de la tarea"
        class="task-input"
      />

      <textarea
        v-model="newDesc"
        placeholder="Descripción (opcional)"
        rows="2"
        class="task-textarea"
      ></textarea>

      <input
        type="file"
        ref="fileInput"
        class="task-file"
        accept="image/*,application/pdf"
      />

      <button type="submit" class="btn-add">Añadir tarea</button>
    </form>

    <!-- Lista -->
    <ul class="task-list">
      <li v-for="task in tasks" :key="task.id" class="task-card">

        <div class="task-check">
          <input
            type="checkbox"
            :checked="task.completed"
            :disabled="!canEdit(task)"
            @change="toggleCompleted(task, $event.target.checked)"
            class="check-input"
          />
        </div>

        <div class="task-middle">

          <!-- Título -->
          <div class="task-title-row">
            <span
              v-if="editingId !== task.id"
              class="task-title"
              :class="{ done: task.completed }"
            >
              {{ task.title }}
            </span>

            <input
              v-else
              v-model="editTitle"
              class="task-edit-input"
            />
          </div>

          <!-- Descripción -->
          <div class="task-desc-row">
            <span
              v-if="editingId !== task.id"
              class="task-desc"
              :class="{ done: task.completed }"
            >
              {{ task.description || 'Sin descripción' }}
            </span>

            <textarea
              v-else
              v-model="editDesc"
              class="task-edit-area"
              rows="2"
            ></textarea>
          </div>

          <!-- Archivo -->
          <div v-if="task.file_url" class="task-file-preview">

            <!-- Imagen preview -->
            <img
              v-if="isImage(task.file_url)"
              :src="task.file_url"
              class="task-image-preview"
            />

            <!-- Enlace -->
            <a
              :href="task.file_url"
              target="_blank"
              rel="noopener noreferrer"
            >
              📎 Ver archivo completo
            </a>

          </div>

          <!-- Nuevo archivo -->
          <div v-if="editingId === task.id">
            <input
              type="file"
              :ref="el => editFileInputs[task.id] = el"
              class="task-file"
              accept="image/*,application/pdf"
            />
          </div>

          <div v-if="showCreator" class="task-meta">
            Creado por: {{ task.creator_name || task.user_id }}
          </div>

        </div>

        <div class="task-actions">
          <button
            v-if="canEdit(task) && editingId !== task.id"
            @click="startEdit(task)"
            class="btn-action edit"
          >
            ✏
          </button>

          <button
            v-if="canEdit(task) && editingId === task.id"
            @click="saveEdit(task)"
            class="btn-action save"
          >
            💾
          </button>

          <button
            v-if="canEdit(task)"
            @click="deleteTask(task.id)"
            class="btn-action delete"
          >
            🗑
          </button>
        </div>

      </li>
    </ul>
  </div>
</template>

<script setup>
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

function canEdit(task) {
  return props.user && task.user_id === props.user.id
}

function isImage(url) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
}

/* SUBIR ARCHIVO */
async function uploadTaskFile(uid, file) {

  const safeName = file.name.replace(/[^\w.\- ]+/g, "_")
  const filePath = `tasks/${uid}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from("files")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type
    })

  if (error) throw new Error(error.message)

  return supabase.storage
    .from("files")
    .getPublicUrl(filePath).data.publicUrl
}

/* AÑADIR */
async function addTask() {

  const title = newTask.value.trim()
  const description = newDesc.value.trim()
  if (!title) return

  const file = fileInput.value?.files?.[0]
  let fileUrl = null

  if (file) fileUrl = await uploadTaskFile(props.user.id, file)

  const creatorName =
    props.user.user_metadata?.full_name ||
    props.user.email ||
    "Usuario"

  const { error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      completed: false,
      user_id: props.user.id,
      file_url: fileUrl,
      creator_name: creatorName
    })

  if (error) return alert(error.message)

  newTask.value = ""
  newDesc.value = ""
  fileInput.value.value = ""

  emit("reload")
}

/* INICIAR EDICIÓN */
function startEdit(task) {
  editingId.value = task.id
  editTitle.value = task.title
  editDesc.value = task.description
  oldFileUrl.value = task.file_url
}

/* GUARDAR EDICIÓN */
async function saveEdit(task) {

  let newFileUrl = oldFileUrl.value
  const newFile = editFileInputs.value[task.id]?.files?.[0]

  if (newFile) {

    const newUrl = await uploadTaskFile(props.user.id, newFile)
    newFileUrl = newUrl

    if (oldFileUrl.value) {
      const path = oldFileUrl.value
        .split("/storage/v1/object/public/files/")[1]

      if (path)
        await supabase.storage.from("files").remove([path])
    }
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title: editTitle.value.trim(),
      description: editDesc.value.trim(),
      file_url: newFileUrl
    })
    .eq("id", task.id)

  if (error) return alert(error.message)

  editingId.value = null
  oldFileUrl.value = null

  emit("reload")
}

/* BORRAR */

async function deleteTask(id) {
  if (!confirm("¿Eliminar tarea?")) return;

  try {
    // --- 1. Traer la tarea directamente de Supabase ---
    const { data: taskData, error: selectError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", String(id))  // <-- forzamos a string para UUID
      .single(); // devuelve solo 1 fila

    if (selectError) {
      console.error("Error buscando tarea:", selectError.message);
      return alert("No se pudo encontrar la tarea en la base de datos.");
    }

    if (!taskData) {
      console.warn("No se encontró tarea con id:", id);
      return alert("Tarea no encontrada");
    }

    // --- 2. Borrar imagen asociada si existe ---
    if (taskData.file_url) {
      const path = taskData.file_url.split("/files/v1/object/public/files/")[1];
      if (path) {
        const { error: storageError } = await supabase.storage.from("files").remove([path]);
        if (storageError) console.error("Error borrando imagen de Storage:", storageError.message);
      }
    }

    // --- 3. Borrar la tarea ---
    const { error: deleteError, data: deletedData } = await supabase
      .from("tasks")
      .delete()
      .eq("id", String(id))  // <-- UUID string
      .select();

    if (deleteError) {
      console.error("Error borrando tarea de DB:", deleteError.message);
      return alert("No se pudo borrar la tarea.");
    }

    console.log("Tarea borrada correctamente:", deletedData);

    // --- 4. Recargar lista de tareas ---
    emit("reload");

  } catch (err) {
    console.error("Error en deleteTask:", err);
    alert("Ocurrió un error al borrar la tarea.");
  }
}

/* COMPLETAR */
async function toggleCompleted(task, checked) {

  await supabase
    .from("tasks")
    .update({ completed: checked })
    .eq("id", task.id)

  emit("reload")
}
</script>

<style scoped>
.tasks-container {
  max-width: 780px;
  margin: 0 auto;
}

.tasks-header {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 14px;
}

.task-form {
  display: grid;
  gap: 12px;
  margin-bottom: 22px;
}

.task-input,
.task-textarea,
.task-file {
  width: 100%;
  padding: 12px;
  background: #0f0f0f;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text);
}

.btn-add {
  padding: 10px 14px;
  background: var(--primary);
  border-radius: 10px;
  border: none;
  font-weight: 600;
  cursor: pointer;
}

.task-list {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 14px;
}

.task-card {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  background: #1b1b1b;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid #2d2d2d;
  box-shadow: 0 0 12px #00000020;
}

.task-middle {
  display: grid;
  gap: 6px;
}

.task-title {
  font-weight: 600;
}

.task-desc {
  font-size: .9rem;
  color: var(--text-muted);
}

.done {
  text-decoration: line-through;
  color: var(--text-muted);
}

.task-file-preview {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-image-preview {
  width: 120px;
  border-radius: 8px;
  border: 1px solid #333;
}

.task-meta {
  font-size: .85rem;
  color: var(--text-muted);
}

.task-actions {
  display: flex;
  gap: 6px;
}

.btn-action {
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}

.edit { background: var(--primary); }
.save { background: #4cc9f0; }
.delete { background: var(--danger); }
</style>