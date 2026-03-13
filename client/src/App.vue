<template>
  <Transition>
  <div id="loading" v-if="!state.loaded">Loading &hellip;</div>
  </Transition>
  <main class="content" :class="{ pwaMode: settingsStore.isLaunchedAsApp, ios: settingsStore.isIosStandalone }">
    <RouterView v-slot="{ Component }">
      <transition mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
  </main>
  <Menu />
  <Notifications />
</template>

<script setup>
import Notifications from '@/components/Notifications.vue'
import Menu from '@/components/Menu.vue'
import { RouterView } from 'vue-router'

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

@media (width <= 1312px) {
  main.content {
    margin-inline: var(--boxMargin);
  }
}
</style>
