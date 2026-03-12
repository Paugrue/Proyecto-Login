<script setup>
import { ref } from "vue"
import { useRouter } from "vue-router"
import { supabase } from "../supabaseClient.js"

const router = useRouter()

// Estado
const user = ref(null)
const fullName = ref("")
const email = ref("")
const avatarUrl = ref("")
const selectedFile = ref(null)
const previewUrl = ref("")

const loading = ref(false)
const okMsg = ref("")
const errMsg = ref("")

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

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, updated_at, avatar_url")
    .eq("id", user.value.id)
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

  if (file.size > 3 * 1024 * 1024) {
    errMsg.value = "La imagen no puede superar 3MB."
    return
  }

  selectedFile.value = file

  if (previewUrl.value && previewUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = URL.createObjectURL(file)
}

function removePreview() {
  selectedFile.value = null
  if (previewUrl.value && previewUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = avatarUrl.value || ""
}

// --- Subir avatar AL BUCKET REAL ("files") ---
async function uploadAvatarIfNeeded() {
  if (!selectedFile.value || !user.value) return null

  // Asegurar sesión válida
  const { data: sessionData, error: sErr } = await supabase.auth.getSession()
  if (sErr || !sessionData?.session?.user?.id) {
    throw new Error("Sesión no válida. Cierra sesión y vuelve a entrar.")
  }

  const uid = sessionData.session.user.id
  const file = selectedFile.value
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_")

  // RUTA CORRECTA: bucket "files" → carpeta "avatars"
  const filePath = `avatars/${uid}/${Date.now()}-${safeName}`

  const { error: upErr } = await supabase.storage
    .from("files")              // ← TU BUCKET REAL
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600"
    })

  if (upErr) {
    console.error("Error storage upload:", upErr)
    throw new Error(`Error subiendo avatar: ${upErr.message}`)
  }

  const { data: pub } = supabase.storage
    .from("files")
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
    let newAvatarUrl = avatarUrl.value

    if (selectedFile.value) {
      newAvatarUrl = await uploadAvatarIfNeeded()
      if (!newAvatarUrl) {
        throw new Error("No se pudo obtener URL pública del avatar.")
      }
      avatarUrl.value = newAvatarUrl
    }

    // Actualizar metadata
    const { error: authErr } = await supabase.auth.updateUser({
      data: {
        avatar_url: avatarUrl.value,
        full_name: fullName.value
      }
    })
    if (authErr) console.warn("Error actualizando auth:", authErr.message)

    // Actualizar tabla profiles
    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.value,
        avatar_url: avatarUrl.value,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.value.id)
      .select()
      .single()

    if (updErr) throw new Error(updErr.message)

    okMsg.value = "Perfil actualizado correctamente ✅"
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
        <input :value="email" disabled class="readonly-input" />
      </div>

      <div>
        <label>Avatar</label>

        <div class="avatar-preview" v-if="previewUrl">
          <img :src="previewUrl" alt="Previsualización avatar" />
          <button class="small" @click="removePreview">Quitar</button>
        </div>

        <input type="file" accept="image/*" @change="onFileChange" />
        <p class="muted">Formatos: JPG/PNG/WebP • Máx: 3MB</p>
      </div>
    </div>

    <button :disabled="loading" @click="updateProfile">
      {{ loading ? "Guardando..." : "Guardar cambios" }}
    </button>

    <p v-if="okMsg" class="ok">{{ okMsg }}</p>
    <p v-if="errMsg" class="err">{{ errMsg }}</p>
  </div>
</template>


<style scoped>
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

.readonly-input {
  background: #0d0d0d;
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: 1;
}

.ok { color: #3ecf8e; margin-top: 8px; }
.err { color: #fa4d4d; margin-top: 8px; white-space: pre-line; }
.muted { color: var(--text-muted); font-size: .85rem; }
</style>