import { createRouter, createWebHistory } from 'vue-router'

// Importa las vistas
import Home from '@/views/Home.vue'
import Profile from '@/views/Profile.vue'
import MyTasksView from '@/views/MyTasksView.vue'
import AllTasksView from '@/views/AllTasksView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/admin/profile', name: 'Profile', component: Profile },
    { path: '/tasks', name: 'MyTasks', component: MyTasksView },
    { path: '/tasks/all', name: 'AllTasks', component: AllTasksView },
  ],
})

export default router