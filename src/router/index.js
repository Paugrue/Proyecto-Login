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

    { path: '/login', name: 'Login', component: Login },

    { path: '/admin/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },

    { path: '/tasks', name: 'MyTasks', component: MyTasksView, meta: { requiresAuth: true } },

    { path: '/tasks/all', name: 'AllTasks', component: AllTasksView, meta: { requiresAuth: true } },
  ],
})

router.beforeEach((to, from, next) => {

  const isLogged = !!localStorage.getItem('token')

  if (to.matched.some(record => record.meta.requiresAuth) && !isLogged) {
    next('/login')
  } else {
    next()
  }

})

export default router