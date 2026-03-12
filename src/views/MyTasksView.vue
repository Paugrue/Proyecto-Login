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

async function loadMyTasks() {
  if (!user.value) return
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.value.id)
    .order('id', { ascending: false })
  if (!error) tasks.value = data || []
}

async function init() {
  loading.value = true
  await loadUser()
  await loadMyTasks()
  loading.value = false
}

onMounted(init)
</script>

<template>
  <div class="section">
    <h2>Mis tareas</h2>
    <div v-if="loading">Cargando…</div>
    <div v-else-if="!user">Inicia sesión para ver tus tareas.</div>
    <div v-else>
      <Tasks
        :tasks="tasks"
        :user="user"
        :allowAdd="true"
        :showCreator="false"
        title="Tus tareas"
        @reload="loadMyTasks"
      />
    </div>
  </div>
</template>
