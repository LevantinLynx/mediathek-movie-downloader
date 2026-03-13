<template>
  <aside class="menu" :class="{ pwaMode: settingsStore.isLaunchedAsApp, ios: settingsStore.isIosStandalone }">
    <transition>
    <aside id="connectionStatus" v-if="!state.connected">
      <IconShieldFail />
      <span>Keine Verbindung zum Server.</span>
    </aside>
    </transition>
    <div id="menu">
      <nav>
        <RouterLink to="/upcoming" aria-label="Verfügbare Filme" :class="{ 'active': upcomingRouteSelected }">
          <IconSearch />
        </RouterLink>
        <RouterLink to="/schedule" aria-label="Geplante und laufende Downloads">
          <IconCalendar />
        </RouterLink>
        <RouterLink to="/completed" aria-label="Abgeschlossene und ignorierte Downloads">
          <IconCheckList />
        </RouterLink>
        <RouterLink to="/info" aria-label="Info und Nützliches">
          <IconInfo />
        </RouterLink>
        <RouterLink to="/settings" aria-label="Einstellungen" :class="{ 'active': settingsRouteSelected }">
          <IconCog />
        </RouterLink>
      </nav>
    </div>
  </aside>
</template>

<script setup>
import IconShieldFail from '@/components/icons/IconShieldFail.vue'
import IconCalendar from '@/components/icons/IconCalendar.vue'
import IconSearch from '@/components/icons/IconSearch.vue'
import IconCheckList from '@/components/icons/IconCheckList.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconCog from '@/components/icons/IconCog.vue'

import { useRoute, RouterLink } from 'vue-router'
import { computed } from 'vue'
const route = useRoute()

// Websocket
import { state } from '@/socket'

// Stores
import { useSettingsStore } from '@/stores/settings'
const settingsStore = useSettingsStore()

// Page Menu
const upcomingRouteSelected = computed(() => route.fullPath.indexOf('/upcoming') > -1)
const settingsRouteSelected = computed(() => route.fullPath.indexOf('/settings') > -1)
</script>

<style scoped>
/* PWA Overwrites */
.pwaMode #menu {
  padding: 1.6rem 2rem 3.2rem;
}
.pwaMode #menu nav svg {
  --icon-size: 4.8rem;
}
/* PWA Overwrites end */

.menu {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9;
}
#menu {
  transition: color 250ms ease-in-out;

  display: flex;
  justify-content: center;
  padding: 2rem;
  background-color: rgba(0,0,0,.88);
  color: rgba(255,255,255, .65);
  -webkit-backdrop-filter: blur(.6rem);
  backdrop-filter: blur(.6rem);
}
#menu .router-link-active,
#menu a.active {
  color: rgba(255,255,255, .85);
}
#menu nav {
  display: flex;
  vertical-align: center;
  gap: 2.2rem;
  max-width: 60rem;
}
#menu nav a {
  color: rgba(255,255,255, .65);
  cursor: pointer;
  padding: 0;
}
#menu nav svg {
  --icon-size: 5rem;
  width: var(--icon-size);
  height: var(--icon-size);
}
#subMenu {
  padding-bottom: 1rem;
}

#connectionStatus {
  background-color: crimson;
  color: #fff;
  padding: .5rem var(--boxPadding);
  font-size: 1.4rem;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .4rem;
}
</style>