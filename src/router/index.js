// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Profile from '@/views/Profile.vue'
import MyTasksView from '@/views/MyTasksView.vue'
import AllTasksView from '@/views/AllTasksView.vue'
import Login from '@/components/Login.vue'
import { supabase } from '../supabaseClient'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'Home', component: Home },

    { path: '/login', name: 'Login', component: Login },

    { path: '/admin/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },

    { path: '/tasks', name: 'MyTasks', component: MyTasksView, meta: { requiresAuth: true } },

    { path: '/tasks/all', name: 'AllTasks', component: AllTasksView, meta: { requiresAuth: true } },

    {
      path: '/tasks/:id',
      name: 'TaskDetail',
      component: () => import('../views/TaskDetailView.vue'),
      props: true
    }
  ],
})

// --- Guard global ---
router.beforeEach(async (to, from, next) => {
  const { data } = await supabase.auth.getSession()
  const isLogged = !!data.session

  // Si la ruta requiere login y no estás logueado → login
  if (to.matched.some(record => record.meta.requiresAuth) && !isLogged) {
    return next('/login')
  }

  // Si intentas ir a login estando logueado → home
  if (to.name === 'Login' && isLogged) {
    return next('/')
  }

  next()
})

export default router