<template>
  <div id="auth-section" class="section">
    <h3>Bienvenido</h3>

    <!-- Botones para alternar modo -->
    <div class="auth-switch">
      <button
        class="btn ghost"
        :class="{ active: mode === 'login' }"
        @click="mode = 'login'; clearMsgs()"
      >
        Entrar
      </button>
      <button
        class="btn ghost"
        :class="{ active: mode === 'register' }"
        @click="mode = 'register'; clearMsgs()"
      >
        Registrar
      </button>
    </div>

    <!-- Formulario -->
    <input
      v-model="email"
      type="email"
      placeholder="Email"
      autocomplete="email"
    />

    <div class="password-row">
      <input
        :type="showPassword ? 'text' : 'password'"
        v-model="password"
        placeholder="Contraseña"
        autocomplete="current-password"
      />
      <button class="tiny-btn" @click="showPassword = !showPassword" type="button">
        {{ showPassword ? '🙈' : '👁️' }}
      </button>
    </div>

    <!-- Solo en registro: confirmar contraseña (opcional pero útil) -->
    <input
      v-if="mode === 'register'"
      :type="showPassword ? 'text' : 'password'"
      v-model="password2"
      placeholder="Repite la contraseña"
      autocomplete="new-password"
    />

    <!-- Botón primario según modo -->
    <button :disabled="loading" @click="mode === 'login' ? handleLogin() : handleRegister()">
      {{ loading ? 'Procesando…' : (mode === 'login' ? 'Entrar' : 'Crear cuenta') }}
    </button>

    <!-- Recuperar contraseña -->
    <button class="secondary" :disabled="loading" @click="handleResetPassword">
      Recuperar contraseña
    </button>

    <!-- Mensajes -->
    <p v-if="okMsg" class="ok">{{ okMsg }}</p>
    <p v-if="errMsg" class="err">{{ errMsg }}</p>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { supabase } from "../supabaseClient"

const emit = defineEmits(["login-success"])

import { useRouter } from "vue-router"

const router = useRouter()

const mode = ref("login") // 'login' | 'register'
const email = ref("")
const password = ref("")
const password2 = ref("")
const showPassword = ref(false)

const loading = ref(false)
const okMsg = ref("")
const errMsg = ref("")

function clearMsgs() {
  okMsg.value = ""
  errMsg.value = ""
}

function validateEmailPass() {
  if (!email.value?.trim() || !password.value) {
    errMsg.value = "Escribe email y contraseña"
    return false
  }
  return true
}

async function handleLogin() {
  if (!email.value || !password.value) return alert("Escribe email y contraseña")

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (loginError) {
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value
    })
    if (signupError) return alert("Error al registrarse: " + signupError.message)
    alert("Cuenta creada. Ahora inicia sesión nuevamente.")
    return
  }

  if (loginData.user) {
    // Guardamos el token de acceso en localStorage
    localStorage.setItem("token", loginData.session?.access_token || "logged-in")
  }

  emit("login-success", loginData.user)
  router.push("/")

  email.value = ""
  password.value = ""
}


async function handleRegister() {
  clearMsgs()
  if (!validateEmailPass()) return

  // (opcional) validar confirmación de contraseña
  if (password2.value && password.value !== password2.value) {
    errMsg.value = "Las contraseñas no coinciden"
    return
  }

  loading.value = true
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.value.trim(),
      password: password.value,
      // Puedes enviar metadata inicial si lo deseas
      // options: { data: { full_name: '...', avatar_url: '' } }
    })
    if (error) {
      errMsg.value = "Error al registrarse: " + error.message
      return
    }

    // Si tienes "Email confirmations" activado en Supabase → se requiere verificar el correo
    okMsg.value = "Registro correcto. Revisa tu correo para confirmar la cuenta ✉️"

    // Si NO usas confirmación por correo y quieres loguear directamente:
    // if (data?.user) {
    //   emit("login-success", data.user)
    // }

    // Limpiar campos
    password2.value = ""
  } catch (e) {
    errMsg.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

async function handleResetPassword() {
  clearMsgs()
  if (!email.value?.trim()) {
    errMsg.value = "Escribe tu email para recuperar contraseña"
    return
  }

  loading.value = true
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value.trim())
    if (error) {
      errMsg.value = "Error al enviar correo: " + error.message
    } else {
      okMsg.value = "Correo de recuperación enviado ✉️"
    }
  } catch (e) {
    errMsg.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
#auth-section {
  margin-bottom: 24px;
}

.auth-switch {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.btn.ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
}
.btn.ghost.active {
  background: var(--primary);
  color: #000;
  border-color: var(--primary);
}

.password-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.tiny-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}

input {
  display:block;
  width:100%;
  margin:12px 0;
  padding:12px;
  background:#0d0d0d;
  border:1px solid var(--border);
  color:white;
  border-radius:8px;
}

button {
  background:var(--primary);
  color:#000;
  font-weight:600;
  border:none;
  padding:12px;
  cursor:pointer;
  border-radius:8px;
  width:100%;
}

button:hover {
  background:var(--primary-hover);
}

button + button {
  margin-top:12px;
}

button.secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
}

.ok { color: #3ecf8e; margin-top: 8px; text-align:center; }
.err { color: #fa4d4d; margin-top: 8px; text-align:center; }
</style>