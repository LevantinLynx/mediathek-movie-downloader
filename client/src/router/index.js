import { createRouter, createWebHistory } from 'vue-router'

import Upcoming from '@/views/Upcoming.vue'
import UpcomingMovie from '@/views/UpcomingMovie.vue'
import Schedule from '@/views/Schedule.vue'
import Completed from '@/views/Completed.vue'
import Info from '@/views/Info.vue'
import Settings from '@/views/Settings.vue'
import SettingsApiKeyInfo from '@/views/SettingsApiKeyInfo.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      alias: '/',
      path: '/upcoming',
      name: 'Upcoming',
      // component: () => import('@/views/Upcoming.vue'),
      component: Upcoming,
    },
    {
      path: '/upcoming/:movieID',
      name: 'UpcomingMovie',
      // component: () => import('@/views/UpcomingMovie.vue')
      component: UpcomingMovie
    },
    {
      path: '/schedule',
      name: 'Schedule',
      // component: () => import('@/views/Schedule.vue')
      component: Schedule
    },
    {
      path: '/completed',
      name: 'Completed',
      // component: () => import('@/views/Completed.vue')
      component: Completed,
    },
    {
      path: '/info',
      name: 'Info',
      // component: () => import('@/views/Info.vue')
      component: Info
    },
    {
      path: '/settings',
      name: 'Settings',
      // route level code-splitting
      // this generates a separate chunk (Settings.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      // component: () => import('@/views/Settings.vue'),
      component: Settings
    },
    {
      path: '/settings/apikeys',
      name: 'SettingsApiKeyInfo',
      component: SettingsApiKeyInfo
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    return new Promise((resolve) => {
      // Force scroll to top on every navigation
      // This breaks history scroll position!
      // 175ms delay to ensure it happens while fade animation and not visible to the user
      setTimeout(() => resolve({ left: 0, top: 0 }), 175)
    })
    // return new Promise((resolve) => {
    //   // 195ms delay to ensure it happens while fade animation and not visible to the user
    //   setTimeout(() => {
    //     if (savedPosition) resolve(savedPosition)
    //     else resolve({ left: 0, top: 0 })
    //   }, 195)
    // })
  }
})

export default router
