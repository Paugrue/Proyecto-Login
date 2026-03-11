// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import Profile from "../views/Profile.vue";

// Define rutas
const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/admin/profile",
    name: "Profile",
    component: Profile,
  },
];

// Base dinámico: GitHub Pages necesita '/Proyecto-Login/', Vercel funciona con '/'
const base = import.meta.env.PROD ? "/Proyecto-Login/" : "/";

const router = createRouter({
  history: createWebHistory(base),
  routes,
});

export default router;