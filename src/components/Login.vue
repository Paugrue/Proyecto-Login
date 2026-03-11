<template>
  <div id="auth-section" class="section">
    <h3>Bienvenido</h3>
    <input v-model="email" type="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Contraseña" />

    <button @click="handleLogin">Entrar / Registrarse</button>
    <button @click="handleResetPassword">Recuperar contraseña</button>
  </div>
</template>

<script setup>
import { ref } from "vue"
import { supabase } from "../supabaseClient"

const emit = defineEmits(["login-success"])

const email = ref("")
const password = ref("")

async function handleLogin() {
  if (!email.value || !password.value) return alert("Escribe email y contraseña")

  // Intentar login
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (loginError) {
    // Si no existe, crear cuenta
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value
    })
    if (signupError) return alert("Error al registrarse: " + signupError.message)
    alert("Cuenta creada. Ahora inicia sesión nuevamente.")
    return
  }

  // Login exitoso
  emit("login-success", loginData.user)
  email.value = ""
  password.value = ""
}

async function handleResetPassword() {
  if (!email.value) return alert("Escribe tu email para recuperar contraseña")

  const { error } = await supabase.auth.resetPasswordForEmail(email.value)
  if (error) alert("Error al enviar correo: " + error.message)
  else alert("Correo de recuperación enviado")
}
</script>

<style scoped>
#auth-section {
  margin-bottom: 24px;
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
</style>