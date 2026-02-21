import { createRouter, createWebHashHistory } from 'vue-router'
import IndexView from './views/IndexView.vue'
import ChartsView from './views/ChartsView.vue'
import DashboardView from './views/DashboardView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: IndexView },
    { path: '/charts', component: ChartsView },
    { path: '/dashboard', component: DashboardView },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
