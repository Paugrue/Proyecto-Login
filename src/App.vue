<script setup>
import { ref, onMounted } from "vue"
import { supabase } from "./supabaseClient"  

import Login from "./components/Login.vue"
import Tasks from "./components/Tasks.vue"
import PublicGallery from "./components/PublicGallery.vue"
import AdminGallery from "./components/AdminGallery.vue"

// Estado del usuario
const user = ref(null)
const userEmail = ref("")
const username = ref("")
const isAdmin = ref(false)

// Datos
const tasks = ref([])
const publicImages = ref([])
const adminImages = ref([])

// --- Funciones --- //

async function checkSession(){
  const { data } = await supabase.auth.getSession()
  if(data.session){
    handleUserLogin(data.session.user)
  }
}

async function handleUserLogin(loggedUser) {

  user.value = loggedUser
  userEmail.value = loggedUser.email

  // obtiene el username guardado en Supabase
  username.value = loggedUser.user_metadata?.username || "Usuario"

  // admin
  isAdmin.value = ["paulagrueso@gmail.com"].includes(userEmail.value)

  await loadTasks()
  await loadPublicImages()

  if(isAdmin.value){
    await loadAdminImages()
  }

}

async function logout(){
  await supabase.auth.signOut()

  user.value = null
  userEmail.value = ""
  username.value = ""
  isAdmin.value = false

  tasks.value = []
  publicImages.value = []
  adminImages.value = []
}

async function loadTasks(){
  if(!user.value) return

  const { data } = await supabase
    .from("tasks")
    .select("*")
    .order("id",{ ascending:false })
    .eq("user_id", user.value.id)

  if(data) tasks.value = data
}

async function loadPublicImages(){

  const { data, error } = await supabase.storage
    .from("files")
    .list("public")

  if(error){
    console.error(error)
    return
  }

  publicImages.value = data.map(file => {

    const { data: urlData } = supabase
      .storage
      .from("files")
      .getPublicUrl(`public/${file.name}`)

    return urlData.publicUrl
  })

}

async function loadAdminImages(){

  const { data, error } = await supabase.storage
    .from("files")
    .list("admin")

  if(error){
    console.error(error)
    return
  }

  adminImages.value = data.map(file => {

    const { data: urlData } = supabase
      .storage
      .from("files")
      .getPublicUrl(`admin/${file.name}`)

    return urlData.publicUrl
  })
}

onMounted(() => {
  checkSession()
})
</script>


<template>

<header id="appHeader">

<div>
<strong>Proyecto Supabase</strong>
</div>

<div id="userInfo">

<div class="userRow">

<span class="userIcon">👤</span>

<div>

<div class="username">
{{ username }}
</div>

<div class="email">
{{ userEmail }}
</div>

</div>

</div>

</div>

</header>


<h2>Supabase BaaS</h2>

<Login
v-if="!user"
@login-success="handleUserLogin"
/>


<div v-if="user" class="section">

<Tasks
:tasks="tasks"
:user="user"
@reload="loadTasks"
/>

<PublicGallery
:images="publicImages"
@reload="loadPublicImages"
/>

<AdminGallery
v-if="isAdmin"
:images="adminImages"
@reload="loadAdminImages"
/>

<button
class="logout"
@click="logout"
>
Cerrar sesión
</button>

</div>

</template>


<style>

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

body{
  font-family:'Inter',sans-serif;
  background:var(--bg);
  color:var(--text);
}

h2{
  color:var(--primary);
  text-align:center;
  margin-bottom:30px;
}

.section{
  background:var(--card-bg);
  padding:30px;
  border-radius:12px;
  border:1px solid var(--border);
  margin-bottom:30px;
}

input{
  display:block;
  width:100%;
  margin:12px 0;
  padding:12px;
  background:#0d0d0d;
  border:1px solid var(--border);
  color:white;
  border-radius:8px;
}

button{
  background:var(--primary);
  color:#000;
  font-weight:600;
  border:none;
  padding:12px;
  cursor:pointer;
  border-radius:8px;
  width:100%;
}

button:hover{
  background:var(--primary-hover);
}

.logout{
  background:transparent;
  border:1px solid var(--danger);
  color:var(--danger);
  margin-top:30px;
}

#appHeader{
  padding:10px;
  border-bottom:1px solid var(--border);
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-bottom:20px;
}

#userInfo{
  text-align:right;
}

.username{
  font-weight:600;
}

.email{
  font-size:0.8rem;
  color:var(--text-muted);
}

#public-gallery,
#admin-gallery{
  display:flex;
  flex-wrap:wrap;
}

#public-gallery img,
#admin-gallery img{
  width:120px;
  margin:5px;
  border-radius:8px;
}

#app {
  max-width: 900px;
  margin: 40px auto;
  padding: 20px;
}

</style>