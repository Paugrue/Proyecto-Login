<script setup>

import { ref,onMounted } from "vue"
import { useRoute } from "vue-router"
import { supabase } from "../supabaseClient"

const route = useRoute()

const task = ref(null)

async function loadTask(){

  const { data } = await supabase
  .from("tasks")
  .select("*")
  .eq("id",route.params.id)
  .single()

  task.value = data
}

onMounted(loadTask)

</script>

<template>

<div v-if="task" class="task-view">

<button class="back-btn" @click="$router.back()">← Volver</button>

 <img
v-if="task.file_url"
:src="task.file_url"
class="task-image"
/>

  <h1>{{task.title}}</h1>

  <p>{{task.description}}</p>

</div>

</template>

<style scoped>

.task-view{
max-width:900px;
margin:auto;
padding:20px;
}

.task-image{
  width:100%;
  max-width:500px;
  border-radius:14px;
  margin-bottom:20px;
  display:block;
  margin-left:auto;
  margin-right:auto;
}

</style>