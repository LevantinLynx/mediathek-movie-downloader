<template>
  <transition>
  <div id="loading" v-if="!state.loaded">Loading &hellip;</div>
  </transition>
  <main class="content">
    <router-view v-slot="{ Component }">
      <transition mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </main>

  <aside class="menu">
    <transition>
    <aside id="connectionStatus" v-if="!state.connected">
      <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914C3 11.4234 3 10.8996 3 10.4167Z" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 8V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="12" cy="15" r="1" fill="currentColor"/>
      </svg>
      <span>Keine Verbindung zum Server</span>
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

  <TransitionGroup tag="aside" class="notificationWrapper" id="notifications">
    <div
      v-for="notification in infoStore.getNotifications"
      :key="notification.uuid"
      class="notification"
      :class="notification.state, notification.result"
    >
      <div class="notificationContent" :class="{ timer: !!notification.time }">
        <div class="icon">
          <template v-if="notification.state === 'done'">
            <template v-if="notification.result === 'success'">
              <svg v-if="['sync', 'update'].indexOf(notification.type) > -1"
                width="4rem" height="4rem" viewBox="0 0 24 24" fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M16.5 5.38468C18.6128 6.82466 20 9.25033 20 12C20 16.4183 16.4183 20 12 20C11.5898 20 11.1868 19.9691 10.7932 19.9096M13.1599 4.08348C12.7812 4.02847 12.3939 4 12 4C7.58172 4 4 7.58172 4 12C4 14.708 5.34553 17.1018 7.40451 18.5492M13.1599 4.08348L12.5 3M13.1599 4.08348L12.5 5M10.7932 19.9096L11.7561 19M10.7932 19.9096L11.5 21M9 12L11 14L15 10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else
                width="4rem" height="4rem" viewBox="0 0 24 24" fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </template>
            <template v-else-if="notification.result === 'info'">
              <svg v-if="['sync', 'update'].indexOf(notification.type) > -1"
                width="4rem" height="4rem" viewBox="0 0 24 24" fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M15.9375 6.11972C17.7862 7.39969 19 9.55585 19 12C19 15.9274 15.866 19.1111 12 19.1111C11.6411 19.1111 11.2885 19.0837 10.9441 19.0307M13.0149 4.96309C12.6836 4.9142 12.3447 4.88889 12 4.88889C8.13401 4.88889 5 8.07264 5 12C5 14.4071 6.17734 16.5349 7.97895 17.8215M13.0149 4.96309L12.4375 4M13.0149 4.96309L12.4375 5.77778M10.9441 19.0307L11.7866 18.2222M10.9441 19.0307L11.5625 20M12 9V12.5M12 14.5V15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else
                width="4rem" height="4rem" viewBox="0 0 24 24" fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                <path d="M12 17V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="1" cy="1" r="1" transform="matrix(1 0 0 -1 11 9)" fill="currentColor"/>
              </svg>
            </template>
            <template v-else-if="notification.result === 'error'">
              <svg width="4rem" height="4rem" viewBox="0 0 24 24" fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M3 10.4167C3 7.21907 3 5.62028 3.37752 5.08241C3.75503 4.54454 5.25832 4.02996 8.26491 3.00079L8.83772 2.80472C10.405 2.26824 11.1886 2 12 2C12.8114 2 13.595 2.26824 15.1623 2.80472L15.7351 3.00079C18.7417 4.02996 20.245 4.54454 20.6225 5.08241C21 5.62028 21 7.21907 21 10.4167C21 10.8996 21 11.4234 21 11.9914C21 17.6294 16.761 20.3655 14.1014 21.5273C13.38 21.8424 13.0193 22 12 22C10.9807 22 10.62 21.8424 9.89856 21.5273C7.23896 20.3655 3 17.6294 3 11.9914C3 11.4234 3 10.8996 3 10.4167Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M12 8V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="12" cy="15" r="1" fill="currentColor"/>
              </svg>
            </template>
          </template>
          <template v-else-if="notification.state === 'running'">
            <svg 
              width="4rem" height="4rem" viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect stroke="currentColor" fill="currentColor" stroke-width="15" width="30" height="30" x="25" y="85">
                <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4"></animate>
              </rect>
              <rect stroke="currentColor" fill="currentColor" stroke-width="15" width="30" height="30" x="85" y="85">
                <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2"></animate>
              </rect>
              <rect stroke="currentColor" fill="currentColor" stroke-width="15" width="30" height="30" x="145" y="85">
              <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0"></animate>
              </rect>
            </svg>
          </template>
        </div>
        <div class="message">
          {{ notification.msg }}
          <svg @click="infoStore.removeNotification(notification.uuid)" class="closeIcon"
            width="2rem" height="2rem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
      </div>
      <div class="time"v-if="notification.time">
        <div class="bar" :class="{ active: notification.animate }" :style="'transition-duration:' + notification.time + 'ms;'"></div>
      </div>
    </div>
  </TransitionGroup>
</template>

<script setup>
import IconCalendar from '@/components/icons/IconCalendar.vue'
import IconSearch from '@/components/icons/IconSearch.vue'
import IconCheckList from '@/components/icons/IconCheckList.vue'
import IconInfo from '@/components/icons/IconInfo.vue'
import IconCog from '@/components/icons/IconCog.vue'
import { useRoute, RouterLink, RouterView } from 'vue-router'
import { computed } from 'vue'
const route = useRoute()

// Stores
import { useSettingsStore } from '@/stores/settings'
const settingsStore = useSettingsStore()
import { useMovieStore } from '@/stores/movie'
const movieStore = useMovieStore()
import { useInfoStore } from '@/stores/info'
const infoStore = useInfoStore()

// Update time for available movies every 20 minutes
setInterval(() => movieStore.setCurrentDate(), 1_200_000)

// Websocket
import { socket, state } from '@/socket'

// Settings
socket.on('version', version => {
  settingsStore.version = version
})
socket.on('settingsUpdate', settings => {
  settingsStore.settings = settings
})
socket.on('nextMetaDataUpdateDate', nextMetaDataUpdateDate => {
  settingsStore.nextMetaDataUpdateDate = nextMetaDataUpdateDate
})

// Movie & channel metadata
socket.on('availableMovieMetaDataUpdate', availableMovieMetaData => {
  movieStore.availableMovieMetaData = availableMovieMetaData
})
socket.on('doneListUpdate', doneList => {
  movieStore.doneMovieIds = doneList.map(movie => movie.id) || []
  movieStore.doneList = doneList
})
socket.on('ignoreListUpdate', ignoreList => {
  movieStore.ignoredMovieIds = ignoreList.map(movie => movie.id) || []
  movieStore.ignoreList = ignoreList
})
socket.on('scheduleUpdate', scheduleData => {
  movieStore.scheduledIds = scheduleData.map(movie => movie.id) || []
  movieStore.scheduledDownloads = scheduleData
})

// Schedule
socket.on('downloadProgressUpdate', downloadProgressData => {
  movieStore.downloadingIds = Object.keys(downloadProgressData)
  movieStore.downloadProgress = downloadProgressData
})

// Suggestions
socket.on('suggestionsForMovie', data => {
  movieStore.availableSuggestions[data.movieID] = data
})

// Notifications
socket.on('bannerNotification', info => {
  infoStore.updateNotification(info)
})

// Page Menu
const upcomingRouteSelected = computed(() => route.fullPath.indexOf('/upcoming') > -1)
const settingsRouteSelected = computed(() => route.fullPath.indexOf('/settings') > -1)
</script>

<style scoped>
#loading {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: var(--bg1);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
}
main.content {
  max-width: 1280px;
  min-height: max-content;
  margin: 3rem auto 14rem;
  font-size: 1.6rem;
}
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
  padding: 1.6rem 2rem 3.6rem;
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

.notificationWrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  font-size: 1.6rem;
  z-index: 8;
}
.notification {
  background-color: rgba(0,0,0,.85);
  backdrop-filter: blur(.8rem);
  border-bottom: .1rem solid rgba(255, 255, 255, .15);
  position: relative;
}
.notification.success {
  background-color: var(--green);
  color: #000;
}
.notification.error {
  background-color: var(--red);
  color: #fff;
}
.notification .closeIcon {
  position: absolute;
  top: 50%;
  right: 1rem;
  cursor: pointer;
  transform: translateY(-50%);
}
.notificationContent {
  padding: 1rem 4rem;
  display: grid;
  grid-template-columns: 4rem auto;
  gap: 1rem;
  justify-content: center;
  justify-items: center;
  align-items: center;
}
.notificationContent.timer {
  padding-bottom: .6rem;
}
.notification .time {
  width: 100%;
  height: .4rem;
}
.notification .time .bar {
  width: 100%;
  height: .4rem;
  background-color: var(--purple);
  transition-property: width;
  transition-timing-function: linear;
}
.notification.error .time .bar,
.notification.success .time .bar {
  background-color: #fff;
}
.time .bar.active {
  width: 0%;
}

@media (width <= 1312px) {
  main.content {
    margin-inline: var(--boxMargin);
  }
}
@media (width >= 1280px) {
  .notificationWrapper {
    top: 1rem;
    right: 1rem;
    left: unset;
    width: 50rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border-radius: var(--borderRadius);
  }
  .notificationWrapper .notification {
    width: 50rem;
    border-radius: var(--borderRadius);
    -webkit-box-shadow: var(--boxShadow);
    box-shadow: var(--boxShadow);
    overflow: hidden;
  }
  .notificationWrapper .notificationContent {
    padding-left: 1rem;
    justify-content: unset;
    justify-items: unset;
    align-items: center;
  }
}
</style>
