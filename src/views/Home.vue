<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

import { supabase } from "../supabaseClient";
import Login from "../components/Login.vue";
import Tasks from "../components/Tasks.vue";
import PublicGallery from "../components/PublicGallery.vue";
import AdminGallery from "../components/AdminGallery.vue";
import MyImages from "../components/MyImages.vue"; 

const router = useRouter();

// Estado del usuario
const user = ref(null);
const userEmail = ref("");
const username = ref("");
const isAdmin = ref(false);

// Datos
const tasks = ref([]);
const publicImages = ref([]);
const adminImages = ref([]);

// Pestaña actual
const currentTab = ref("tasks");

// --- Funciones --- //

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    await handleUserLogin(data.session.user);
  }
}

async function handleUserLogin(loggedUser) {
  if (!loggedUser) return;

  user.value = loggedUser;
  userEmail.value = loggedUser.email;
  username.value = loggedUser.user_metadata?.username || "Usuario";
  isAdmin.value = ["paulagrueso@gmail.com"].includes(userEmail.value);

  await loadTasks();
  await loadPublicImages();

  if (isAdmin.value) {
    await loadAdminImages();
  }
}

async function logout() {
  await supabase.auth.signOut();

  user.value = null;
  userEmail.value = "";
  username.value = "";
  isAdmin.value = false;

  tasks.value = [];
  publicImages.value = [];
  adminImages.value = [];
}

async function loadTasks() {
  if (!user.value) return;

  const { data } = await supabase
    .from("tasks")
    .select("*")
    .order("id", { ascending: false })
    .eq("user_id", user.value.id);

  if (data) tasks.value = data;
}

async function loadPublicImages() {
  const { data, error } = await supabase.storage.from("files").list("public");
  if (error) return console.error(error);

  publicImages.value = data.map((file) => {
    const { data: urlData } = supabase
      .storage
      .from("files")
      .getPublicUrl(`public/${file.name}`);
    return urlData.publicUrl;
  });
}

async function loadAdminImages() {
  const { data, error } = await supabase.storage.from("files").list("admin");
  if (error) return console.error(error);

  adminImages.value = data.map((file) => {
    const { data: urlData } = supabase
      .storage
      .from("files")
      .getPublicUrl(`admin/${file.name}`);
    return urlData.publicUrl;
  });
}

// Redirige al perfil directamente
function goToProfile() {
  router.push("/admin/profile");
}

onMounted(() => {
  checkSession();
});
</script>

<template>
  <div>
    <h2>Supabase BaaS</h2>

    <Login v-if="!user" @login-success="handleUserLogin" />

    <div v-if="user" class="section">

      <!-- Menú de pestañas -->
      <div class="main-menu">
        <button
          class="menu-link"
          :class="{ 'router-link-active': currentTab === 'tasks' }"
          @click="currentTab = 'tasks'"
        >Tareas</button>

        <button
          class="menu-link"
          :class="{ 'router-link-active': currentTab === 'myImages' }"
          @click="currentTab = 'myImages'"
        >Mis Imágenes</button>

        <button
          class="menu-link"
          :class="{ 'router-link-active': currentTab === 'publicGallery' }"
          @click="currentTab = 'publicGallery'"
        >Galería Pública</button>

        <button
          v-if="isAdmin"
          class="menu-link"
          :class="{ 'router-link-active': currentTab === 'adminGallery' }"
          @click="currentTab = 'adminGallery'"
        >Galería Admin</button>
      </div>

      <!-- Contenido según pestaña -->
      <div v-if="currentTab === 'tasks'" class="tasks-grid">

  <div
    v-for="task in tasks"
    :key="task.id"
    class="task-card"
    @click="router.push(`/tasks/${task.id}`)"
  >

    <img
    v-if="task.file_url"
    :src="task.file_url"
    class="task-thumb"
    />

    <div class="task-title">
      {{ task.title }}
    </div>

  </div>

</div>

      <div v-if="currentTab === 'myImages'">
        <MyImages />
      </div>

      <div v-if="currentTab === 'publicGallery'">
        <PublicGallery :images="publicImages" @reload="loadPublicImages" />
      </div>

      <div v-if="currentTab === 'adminGallery' && isAdmin">
        <AdminGallery :images="adminImages" @reload="loadAdminImages" />
      </div>

      
    </div>
  </div>
</template>

<style>
/* Tu CSS se mantiene igual que antes */
:root {
  --primary: #3ecf8e;
  --primary-hover: #34b27b;
  --bg: #121212;
  --card-bg: #1e1e1e;
  --text: #ffffff;
  --text-muted: #a0a0a0;
  --danger: #fa4d4d;
  --admin: #7209b7;
  --border: #333333;
}

body {
  font-family: "Inter", sans-serif;
  background: var(--bg);
  color: var(--text);
}

h2 {
  color: var(--primary);
  text-align: center;
  margin-bottom: 30px;
}

.section {
  background: var(--card-bg);
  padding: 30px;
  border-radius: 12px;
  border: 1px solid var(--border);
  margin-bottom: 30px;
}

input {
  display: block;
  width: 100%;
  margin: 12px 0;
  padding: 12px;
  background: #0d0d0d;
  border: 1px solid var(--border);
  color: white;
  border-radius: 8px;
}

button {
  background: var(--primary);
  color: #000;
  font-weight: 600;
  border: none;
  padding: 10px 14px;
  cursor: pointer;
  border-radius: 8px;
}

button:hover {
  background: var(--primary-hover);
}

.logout {
  background: transparent;
  border: 1px solid var(--danger);
  color: var(--danger);
  margin-top: 30px;
  width: 100%;
}

.profileBtn {
  margin-left: 15px;
}

#appHeader {
  padding: 10px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

#userInfo {
  display: flex;
  align-items: center;
}

.userRow {
  display: flex;
  align-items: center;
  margin-right: 10px;
}

.userIcon {
  font-size: 20px;
  margin-right: 8px;
}

.username {
  font-weight: 600;
}

.email {
  font-size: 0.8rem;
  color: var(--text-muted);
}

#public-gallery,
#admin-gallery {
  display: flex;
  flex-wrap: wrap;
}

#public-gallery img,
#admin-gallery img {
  width: 120px;
  margin: 5px;
  border-radius: 8px;
}

#app {
  max-width: 900px;
  margin: 40px auto;
  padding: 20px;
}

.main-menu {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.menu-link {
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  text-decoration: none;
}
.menu-link.router-link-active {
  background: var(--primary);
  color: #000;
  border-color: var(--primary);
}

.tasks-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(160px,1fr));
  gap:15px;
}

.task-card{
  background:#1e1e1e;
  border-radius:10px;
  overflow:hidden;
  cursor:pointer;
  transition:0.2s;
  border:1px solid var(--border);
}

.task-card:hover{
  transform:scale(1.05);
}

.task-thumb{
  width:100%;
  height:120px;
  object-fit:cover;
}

.task-title{
  padding:8px;
  font-weight:600;
  font-size:0.9rem;
}
</style>