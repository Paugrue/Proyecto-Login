<!-- src/components/NavBar.vue -->
<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { RouterLink, useRouter } from "vue-router"
import { supabase } from "@/supabaseClient"

const router = useRouter()
const user = ref(null)
const email = ref("")
const displayName = ref("")

async function loadSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.warn("Error obteniendo sesión:", error.message)
    return
  }
  const u = data.session?.user || null
  user.value = u
  email.value = u?.email || ""
  displayName.value = u?.user_metadata?.username || u?.user_metadata?.full_name || "Usuario"
}

async function logout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.warn("Error cerrando sesión:", error.message)
    return
  }

  router.replace({ name: "Login" })
}

let sub
onMounted(async () => {
  await loadSession()
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    user.value = session?.user || null
    email.value = session?.user?.email || ""
    displayName.value =
      session?.user?.user_metadata?.username ||
      session?.user?.user_metadata?.full_name ||
      (session?.user?.email ?? "")
  })
  sub = listener?.subscription
})

onUnmounted(() => {
  sub?.unsubscribe?.()
})
</script>

<template>
  <nav class="nav">
    <div class="left">
      <RouterLink class="brand" :to="{ name: 'Home' }">
        <strong>Proyecto Supabase</strong>
      </RouterLink>

      <RouterLink class="link" :to="{ name: 'Home' }">🏠 Inicio</RouterLink>
      <RouterLink v-if="user" class="link" :to="{ name: 'MyTasks' }">🗒 Mis tareas</RouterLink>
      <RouterLink v-if="user" class="link" :to="{ name: 'AllTasks' }">📋 Todas</RouterLink>
      <RouterLink v-if="user" class="link" :to="{ name: 'Profile' }">👤 Perfil</RouterLink>
    </div>

    <div class="right">
      <div v-if="user" class="userInfo">
        <span class="userIcon">👤</span>
        <div class="userBlock">
          <div class="username">{{ displayName }}</div>
          <div class="email">{{ email }}</div>
        </div>
        <button class="btn" @click="logout">Cerrar sesión</button>
      </div>
      <div v-else class="userInfo">
        <span class="muted">No has iniciado sesión</span>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--card-bg);
  position: sticky;
  top: 0;
  z-index: 50;
}

.left {
  display: flex;
  gap: 10px;
  align-items: center;
}
.brand {
  color: var(--text);
  text-decoration: none;
  margin-right: 8px;
}
.link {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  text-decoration: none;
}
.link.router-link-active {
  background: var(--primary);
  color: #000;
  border-color: var(--primary);
}

.right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.userInfo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.userIcon {
  font-size: 18px;
}
.userBlock .username {
  font-weight: 600;
}
.userBlock .email {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.btn {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.muted {
  color: var(--text-muted);
  font-size: .9rem;
}
</style>