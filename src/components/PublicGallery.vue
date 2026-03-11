<template>
  <div>
    <h3>Galería Pública</h3>

    <div style="margin:10px 0;">
      <input type="file" ref="file" accept="image/*" />
      <button @click="upload">Subir a pública</button>
    </div>

    <div id="public-gallery">
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
const file = ref(null)

async function upload() {
  if (!file.value.files[0]) return alert("Selecciona un archivo")

  const f = file.value.files[0]

  const { data, error } = await supabase.storage
    .from("files")
    .upload(`public/${Date.now()}-${f.name}`, f)

  if (error) return alert("Error al subir imagen: " + error.message)

  emit("reload")
  file.value.value = null
}
</script>