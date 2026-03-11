<template>
  <div id="admin-gallery-section">

    <h3>Galería Admin</h3>

    <!-- Subida -->
    <div style="margin:10px 0;">
      <input type="file" ref="fileInput" accept="image/*" />
      <button @click="upload">Subir imagen</button>
    </div>

    <!-- Galería -->
    <div id="admin-gallery">
      <img v-for="img in images" :key="img" :src="img" />
    </div>

  </div>
</template>

<script setup>
import { ref } from "vue"
import { supabase } from "../supabaseClient"

const props = defineProps({
  images: Array
})

const emit = defineEmits(["reload"])

const fileInput = ref(null)

async function upload(){

  const file = fileInput.value.files[0]

  if(!file){
    alert("Selecciona una imagen")
    return
  }

  const { error } = await supabase.storage
    .from("files")
    .upload(`admin/${Date.now()}-${file.name}`, file)

  if(error){
    alert("Error al subir: " + error.message)
    return
  }

  fileInput.value.value = ""

  emit("reload")
}
</script>