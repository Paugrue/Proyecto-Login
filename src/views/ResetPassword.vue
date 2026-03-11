<template>
  <main class="container">
    <h1>Restablecer contraseña</h1>
    <p class="hint">
      Si has llegado aquí desde el correo de recuperación, introduce tu nueva contraseña.
    </p>

    <div v-if="statusMsg" :class="['alert', statusType]">
      {{ statusMsg }}
    </div>

    <form v-if="showForm" class="form" @submit.prevent="onSubmit" autocomplete="off">
      <div class="field">
        <label for="password">Nueva contraseña</label>
        <input
          id="password"
          v-model.trim="password"
          type="password"
          minlength="8"
          required
          placeholder="••••••••"
        />
      </div>

      <div class="field">
        <label for="confirm">Confirmar contraseña</label>
        <input
          id="confirm"
          v-model.trim="confirm"
          type="password"
          minlength="8"
          required
          placeholder="••••••••"
        />
      </div>

      <button :disabled="loading" type="submit">
        {{ loading ? 'Cambiando...' : 'Cambiar contraseña' }}
      </button>
    </form>

    <p v-else class="hint">
      ¿No ves el formulario? Abre el enlace directamente desde el correo de recuperación
      y asegúrate de que la URL coincide con esta página.
    </p>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { supabase } from '@/supabaseClient' // ⬅️ IMPORTA desde src/supabaseClient.js

const showForm = ref(false)
const loading = ref(false)
const statusMsg = ref(null)
const statusType = ref(null) // 'ok' | 'err'
const password = ref('')
const confirm = ref('')

function setOk(msg) { statusMsg.value = msg; statusType.value = 'ok' }
function setErr(msg) { statusMsg.value = msg; statusType.value = 'err' }

// 1) Escuchar el evento PASSWORD_RECOVERY cuando vienes del email
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    showForm.value = true
  }
})

// 2) Si ya hay sesión activa de recuperación, muestra el formulario
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    showForm.value = true
  }
})

async function onSubmit() {
  statusMsg.value = null

  if (password.value.length < 8) { setErr('La contraseña debe tener al menos 8 caracteres.'); return }
  if (password.value !== confirm.value) { setErr('Las contraseñas no coinciden.'); return }

  loading.value = true
  const { error } = await supabase.auth.updateUser({ password: password.value }) // ← cambio definitivo

  if (error) {
    setErr('Error al actualizar la contraseña: ' + (error.message || 'desconocido'))
  } else {
    setOk('¡Contraseña actualizada correctamente! Ya puedes iniciar sesión con tu nueva contraseña.')
    password.value = ''
    confirm.value = ''
    showForm.value = false
  }

  loading.value = false
}
</script>

<style scoped>
:root { color-scheme: light dark; }
.container { max-width: 460px; margin: 0 auto; padding: 24px; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
h1 { font-size: 1.25rem; margin-bottom: 8px; }
.hint { opacity: .85; }
.form { margin-top: 16px; display: grid; gap: 12px; }
.field label { font-weight: 600; display: block; margin-bottom: 4px; }
input[type="password"] {
  width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #9993;
}
button { padding: 10px 14px; border-radius: 8px; border: none; background: #4f46e5; color: white; font-weight: 600; cursor: pointer; }
button:disabled { opacity: .6; cursor: not-allowed; }
.alert { margin-top: 12px; padding: 10px 12px; border-radius: 8px; }
.ok { background: #10b98122; border: 1px solid #10b98166; }
.err { background: #ef444422; border: 1px solid #ef444466; }
</style>