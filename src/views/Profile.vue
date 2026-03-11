<script setup>
import { ref } from "vue";
import { supabase } from "../supabaseClient.js";

const user = ref(null);
const username = ref("");
const email = ref("");
const avatarUrl = ref(null);

async function loadProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  user.value = sessionData.session.user;
  username.value = user.value.user_metadata?.username || "";
  email.value = user.value.email;

  if (user.value.user_metadata?.avatar_url) {
    avatarUrl.value = user.value.user_metadata.avatar_url;
  }
}

async function updateProfile() {
  if (!user.value) return;

  const updates = {
    id: user.value.id,
    username: username.value,
    email: email.value,
    updated_at: new Date(),
  };

  const { error } = await supabase.from("profiles").upsert(updates);
  if (error) alert("Error al actualizar perfil: " + error.message);
  else alert("Perfil actualizado!");
}

loadProfile();
</script>

<template>
  <div class="section">
    <h2>Editar Perfil</h2>
    <input v-model="username" placeholder="Nombre" />
    <input v-model="email" placeholder="Email" />
    <button @click="updateProfile">Guardar cambios</button>
  </div>
</template>