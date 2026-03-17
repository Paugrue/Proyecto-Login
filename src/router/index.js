import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Profile from '@/views/Profile.vue'
import MyTasksView from '@/views/MyTasksView.vue'
import AllTasksView from '@/views/AllTasksView.vue'
import Login from '@/components/Login.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [

    { path: '/', name: 'Home', component: Home },

    // 👇 IMPORTANTE: guestOnly
    { 
      path: '/login', 
      name: 'Login', 
      component: Login,
      meta: { guestOnly: true }
    },

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

router.beforeEach((to, from, next) => {

  const supabaseSession = Object.keys(localStorage)
    .find(key => key.includes('supabase.auth.token'))

  const isLogged = !!supabaseSession || !!localStorage.getItem('token')

  // Rutas protegidas
  if (to.matched.some(record => record.meta.requiresAuth) && !isLogged) {
    return next('/login')
  }

  // Evitar entrar a login si ya está logueado
  if (to.matched.some(record => record.meta.guestOnly) && isLogged) {
    return next('/')
  }

  next()
})

export default router