<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'
import Tasks from '@/components/Tasks.vue'

const user = ref(null)
const tasks = ref([])
const loading = ref(true)

async function loadUser() {
  const { data } = await supabase.auth.getSession()
  user.value = data.session?.user || null
}

async function loadAllTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('id', { ascending: false })
  if (!error) tasks.value = data || []
}

async function init() {
  loading.value = true
  await loadUser()
  await loadAllTasks()
  loading.value = false
}

onMounted(init)
</script>

<template>
  <div class="section">
    <h2>Todas las tareas</h2>
    <div v-if="loading">Cargando…</div>
    <div v-else-if="!user">Inicia sesión para ver las tareas.</div>
    <div v-else>
      <Tasks
        :tasks="tasks"
        :user="user"
        :allowAdd="false"     
        :showCreator="true"   
        title="Listado global"
        @reload="loadAllTasks"
      />
    </div>
  </div>
</template>