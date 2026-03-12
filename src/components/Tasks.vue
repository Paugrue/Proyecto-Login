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
      <li
        v-for="task in tasks"
        :key="task.id"
        class="task-card"
      >
        <!-- Columna izquierda: checkbox -->
        <div class="task-check">
          <input
            type="checkbox"
            :checked="task.completed"
            :disabled="!canEdit(task)"
            @change="toggleCompleted(task, $event.target.checked)"
            class="check-input"
          />
        </div>

        <!-- Zona central -->
        <div class="task-middle">
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

          <div
            v-if="showCreator"
            class="task-meta"
          >
            Creado por: {{ task.creator_name || task.user_id }}
          </div>
        </div>

        <!-- Acciones -->
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

// Props
const props = defineProps({
  tasks: { type: Array, default: () => [] },
  user: { type: Object, required: true },
  allowAdd: { type: Boolean, default: true },   // en "Todas" lo pondremos a false
  showCreator: { type: Boolean, default: false },// en "Todas" lo pondremos a true
  title: { type: String, default: "" }
})

const emit = defineEmits(["reload"])

const newTask = ref("")
const newDesc = ref("")
const fileInput = ref(null)

const editingId = ref(null)
const editTitle = ref("")
const editDesc = ref("")

function canEdit(task) {
  return props.user && task.user_id === props.user.id
}

async function addTask() {
  const title = newTask.value.trim()
  const description = newDesc.value.trim()
  if (!title) return

  let fileUrl = null
  const file = fileInput.value?.files?.[0]

  if (file) {
    const { data, error } = await supabase.storage
      .from("files")
      .upload(`tasks/${props.user.id}/${Date.now()}-${file.name}`, file, {
        upsert: true
      })
    if (error) { alert(error.message); return }

    const { data: urlData } = supabase.storage
      .from("files")
      .getPublicUrl(data.path)
    fileUrl = urlData.publicUrl
  }

  // Nombre/identificador del creador (metadata full_name si existe, si no email)
  const creatorName =
    props.user.user_metadata?.full_name ||
    props.user.email ||
    "Usuario"

  const { error: insertErr } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      completed: false,
      user_id: props.user.id,
      file_url: fileUrl,
      creator_name: creatorName
    })

  if (insertErr) { alert(insertErr.message); return }

  newTask.value = ""
  newDesc.value = ""
  if (fileInput.value) fileInput.value.value = ""
  emit("reload")
}

function startEdit(task) {
  if (!canEdit(task)) return
  editingId.value = task.id
  editTitle.value = task.title
  editDesc.value = task.description || ""
}

async function saveEdit(task) {
  if (!canEdit(task)) return
  const title = editTitle.value.trim()
  const description = editDesc.value.trim()

  const { error } = await supabase
    .from("tasks")
    .update({ title, description })
    .eq("id", task.id)
    // .eq("user_id", props.user.id) // extra (opcional)
  if (error) { alert(error.message); return }

  editingId.value = null
  emit("reload")
}

async function deleteTask(id) {
  if (!confirm("¿Eliminar tarea?")) return
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    // .eq("user_id", props.user.id) // extra (opcional)
  if (error) { alert(error.message); return }
  emit("reload")
}

async function toggleCompleted(task, checked) {
  if (!canEdit(task)) return
  const { error } = await supabase
    .from("tasks")
    .update({ completed: !!checked })
    .eq("id", task.id)
  if (error) { alert(error.message); return }
  emit("reload")
}
</script>
<style scoped>
/* Contenedor general */
.tasks-container {
  max-width: 780px;
  margin: 0 auto;
}

.tasks-header {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 14px;
}

/* ---------- Formulario ---------- */
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

/* ---------- Lista de tareas ---------- */
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
  transition: 0.15s ease;
}

.task-card:hover {
  background: #212121;
  border-color: #3c3c3c;
}

/* Checkbox */
.task-check {
  display: flex;
  justify-content: center;
  align-items: center;
}

.check-input {
  width: 20px;
  height: 20px;
  accent-color: var(--primary);
  cursor: pointer;
}

/* Contenido central */
.task-middle {
  display: grid;
  gap: 5px;
}

.task-title-row {
  display: flex;
  align-items: center;
  font-weight: 600;
}

.task-title {
  font-size: 1rem;
}

.task-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.done {
  text-decoration: line-through;
  color: var(--text-muted);
}

/* Edición */
.task-edit-input,
.task-edit-area {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  background: #0e0e0e;
  border: 1px solid var(--border);
  color: var(--text);
}

/* Creador */
.task-meta {
  margin-top: 4px;
  font-size: .85rem;
  color: var(--text-muted);
}

/* Botones */
.task-actions {
  display: flex;
  gap: 6px;
}

.btn-action {
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.edit {
  background: var(--primary);
  color: #000;
}

.save {
  background: #4cc9f0;
  color: #000;
}

.delete {
  background: var(--danger);
  color: #fff;
}
</style>