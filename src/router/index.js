import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import Profile from "../views/Profile.vue";

const routes = [
  { path: "/", name: "Home", component: Home },
  { path: "/admin/profile", name: "Profile", component: Profile },
];

const isGithubPages = window.location.hostname.includes("github.io");
const base = isGithubPages ? "/Proyecto-Login/" : "/";

const router = createRouter({
  history: createWebHistory(base),
  routes,
});

export default router;