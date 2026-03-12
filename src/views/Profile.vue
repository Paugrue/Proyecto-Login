<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import { supabase } from "../supabaseClient.js"

const router = useRouter()

// Estado
const user = ref(null)
const fullName = ref("")        // columna: full_name (en public.profiles)
const email = ref("")
const avatarUrl = ref("")       // URL pública del avatar (Storage)
const selectedFile = ref(null)  // archivo seleccionado
const previewUrl = ref("")      // URL de previsualización local

const loading = ref(false)
const okMsg = ref("")
const errMsg = ref("")

// --- Navegación del menú ---
function goHome() {
  router.push({ name: "Home" })
}
function goTasks() {
  router.push({ path: "/", hash: "#tasks" })
}

// --- Cargar perfil ---
async function loadProfile() {
  okMsg.value = ""
  errMsg.value = ""

  const { data: sessionData, error: sErr } = await supabase.auth.getSession()
  if (sErr) {
    errMsg.value = sErr.message
    return
  }
  if (!sessionData.session) return

  user.value = sessionData.session.user
  email.value = user.value.email || ""

  // FILTRO POR ID en SELECT (correcto)
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, updated_at, avatar_url")
    .eq("id", user.value.id)      // ← filtro por id del usuario
    .maybeSingle()

  if (error) {
    console.warn("No se pudo leer profiles:", error.message)
  } else {
    fullName.value = data?.full_name || ""
    avatarUrl.value = data?.avatar_url || user.value.user_metadata?.avatar_url || ""
    previewUrl.value = avatarUrl.value || ""
  }
}

// --- Manejadores de archivo ---
function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith("image/")) {
    errMsg.value = "El archivo debe ser una imagen."
    return
  }
  if (file.size > 3 * 1024 * 1024) { // 3MB
    errMsg.value = "La imagen no puede superar 3MB."
    return
  }
  selectedFile.value = file
  // Previsualización local
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
}

function removePreview() {
  selectedFile.value = null
  if (previewUrl.value && previewUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = avatarUrl.value || ""
}

// --- Subir avatar a Supabase Storage ---
async function uploadAvatarIfNeeded() {
  if (!selectedFile.value || !user.value) return null

  const file = selectedFile.value
  const filePath = `${user.value.id}/${Date.now()}-${file.name}`

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600"
    })

  if (upErr) {
    throw new Error(`Error subiendo avatar: ${upErr.message}`)
  }

  const { data: pub } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath)

  return pub?.publicUrl || null
}

// --- Guardar cambios ---
async function updateProfile() {
  okMsg.value = ""
  errMsg.value = ""
  if (!user.value) {
    errMsg.value = "No hay usuario autenticado."
    return
  }

  loading.value = true
  try {
    // 1) Si hay imagen nueva, súbela
    let newAvatarUrl = avatarUrl.value
    if (selectedFile.value) {
      newAvatarUrl = await uploadAvatarIfNeeded()
      if (!newAvatarUrl) {
        throw new Error("No se pudo obtener URL pública del avatar.")
      }
      avatarUrl.value = newAvatarUrl
    }

    // 2) (Opcional) Actualiza email y metadata en auth
    const { error: authErr } = await supabase.auth.updateUser({
      email: email.value,  // quítalo si no quieres permitir cambiar email aquí
      data: {
        avatar_url: avatarUrl.value,
        full_name: fullName.value
      }
    })
    if (authErr) {
      console.warn("Error actualizando auth:", authErr.message)
      // seguimos con profiles igualmente
    }

    // 3) UPDATE en profiles con FILTRO POR ID (RLS-friendly)
    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.value,
        avatar_url: avatarUrl.value,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.value.id)   // ← FILTRO POR ID
      .select()
      .single()

    if (updErr) {
      throw new Error(updErr.message)
    }

    okMsg.value = "Perfil guardado correctamente ✅"
    selectedFile.value = null
  } catch (e) {
    errMsg.value = `Error al guardar perfil: ${e?.message || e}`
  } finally {
    loading.value = false
  }
}

loadProfile()
</script>

<template>
  <div class="section">

    <h2>Editar Perfil</h2>

    <div class="grid">

      <div>
        <label>Nombre</label>
        <input v-model="fullName" placeholder="Nombre visible" />
      </div>

      <div>
        <label>Email</label>
        <input v-model="email" placeholder="Email" />
      </div>

      <div>
        <label>Avatar</label>

        <!-- Previsualización -->
        <div class="avatar-preview" v-if="previewUrl">
          <img :src="previewUrl" alt="Previsualización avatar" />
          <button class="small" @click="removePreview">Quitar</button>
        </div>

        <!-- Subida de imagen -->
        <input type="file" accept="image/*" @change="onFileChange" />
        <p class="muted">Formatos: JPG/PNG/WebP • Máx: 3MB</p>
      </div>

    </div>

    <button :disabled="loading" @click="updateProfile">
      {{ loading ? 'Guardando...' : 'Guardar cambios' }}
    </button>

    <p v-if="okMsg" class="ok">{{ okMsg }}</p>
    <p v-if="errMsg" class="err">{{ errMsg }}</p>

  </div>
</template>

<style scoped>
.profile-menu {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.profile-menu button {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  margin-bottom: 16px;
}

.avatar-preview {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 10px;
}
.avatar-preview img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
}

.small {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 8px;
}

.ok { color: #3ecf8e; margin-top: 8px; }
.err { color: #fa4d4d; margin-top: 8px; white-space: pre-line; }
.muted { color: var(--text-muted); font-size: .85rem; }
</style>