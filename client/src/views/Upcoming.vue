<template>
  <div>
    <aside class="searchWrapper">
      <div class="search">
        <input type="text" placeholder="Tippen zum Suchen …" v-model="globalListSearchFilterString">
        <button v-if="globalListSearch.length > 0" @click="globalListSearchFilterString = ''">
          <svg width="2.4rem" height="2.4rem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </div>
    </aside>
    <transition mode="out-in">
    <h1 v-if="movieMetaDataInitialized">{{ filteredMovieMetaData.length }} Film{{ filteredMovieMetaData.length !== 1 ? 'e' : '' }} verfügbar</h1>
    <h1 v-else>Noch keine Meta Daten verfügbar</h1>
    </transition>
    <transition>
    <aside class="channelPrefilterMenu" v-show="channelList.length > 0">
      <div>
        <nav>
          <transition>
          <a @click="preFilter = ''" v-show="preFilter !== ''" class="filterClear">
            <img src="/imgs/filter_clear.svg" alt="Filter clear" height="22px">
          </a>
          </transition>
          <a @click="preFilter === channel ? preFilter = '' : preFilter = channel" v-for="channel in channelList" :class="{ active: preFilter === channel }">
            <img :src="'/logo/' + channel + '.svg'"
              :height="['arte', 'ard', 'zdf'].indexOf(channel) > -1 ? '16px' : '22px'"
              :alt="channel + ' Logo'"
              loading="lazy">
          </a>
        </nav>
      </div>
    </aside>
    </transition>
    <div v-if="!movieMetaDataInitialized" class="pretext">
      <p>
        Es wurden noch keine Filme von den TV-Sendern abgerufen. Der Abruf findet <strong>automatisch</strong> statt, nächster Abruf: <strong>{{
          settingsStore.nextMetaDataUpdateDate
            ? new Date(settingsStore.nextMetaDataUpdateDate).toLocaleString('de-DE') + ' Uhr'
            : ''
        }}</strong><br>
        Sollte gewünscht sein, dass die Filme sofort abgerufen werden, kann dies in den <RouterLink to="/settings">Einstellungen</RouterLink> erzwungen werden.
      </p>
      <p>
        <small><strong>Hinweis:</strong> Werden die Daten/Bilder der TV-Sender innerhalb der Jugendschutzzeiten (6-23 Uhr) abgerufen, sind diese unvollständig.</small>
      </p>
    </div>
    <div v-else-if="availableMovies.length === 0" class="pretext">
      <p>Es stehen aktuell keine weiteren Filme zur Verfügung.</p>
      <p>
        Der nächste Abruf findet am <strong>{{
          settingsStore.nextMetaDataUpdateDate
            ? new Date(settingsStore.nextMetaDataUpdateDate).toLocaleString('de-DE') + ' Uhr'
            : ''
        }}</strong> statt.
      </p>
    </div>
    <transition-group tag="section" class="coverList">
      <article class="card" :class="{ landscape: !movie.imgCover }"
        v-for="movie in filteredMovieMetaData"
        :key="movie.id"
      >
        <router-link
          :to="{ name: 'UpcomingMovie', params: { movieID: movie.id } }"
          class="cardImage"
        >
          <div class="timeSpecialInfo" v-if="movie.remainingTime">{{ movie.remainingTime }}</div>
          <img :src="movie.img || '/imgs/movie_image_not_found.svg'" :alt="movie.title" loading="lazy">
        </router-link>
        <div class="cardText">
          <router-link :to="{ name: 'UpcomingMovie', params: { movieID: movie.id } }">
            <img class="logo" :src="'/logo/' + movie.channel + '.svg'" :alt="movie.channel + ' Logo'" loading="lazy">
            <span v-if="movie.features?.indexOf('OV') > -1">(OV) </span>{{ movie.title }}
          </router-link>
        </div>
      </article>
    </transition-group>
  </div>
</template>

<script lang="js" setup>
import { RouterLink } from 'vue-router'
import { useMovieStore } from '@/stores/movie'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import { watch } from 'vue'
import _ from 'lodash'

const settingsStore = useSettingsStore()
const movieStore = useMovieStore()
const {
  movieMetaDataInitialized,
  channelList,
  filteredMovieMetaData,
  availableMovies,
  globalListSearchFilterString,
  globalListSearch,
  preFilter,
} = storeToRefs(movieStore)

// Search input with debounce
// @TODO find a way without side effects
const updateGlobalListSearch = _.debounce(setGlobalListSearch, 300)
function setGlobalListSearch (value) {
  globalListSearch.value = value
}
watch(globalListSearchFilterString, (newValue) => {
  if (newValue === '') globalListSearch.value = ''
  updateGlobalListSearch(newValue)
})
</script>

<style scoped>
.pretext a {
  color: var(--main);
  text-decoration: none;
}
.pretext p:not(:last-child) {
  margin-bottom: 1em;
}
.pretext small {
  font-style: italic;
}
.coverList {
  --aspectRatio: 16 / 9;
}
.searchWrapper {
  margin-bottom: 5rem;

  position: sticky;
  top: 1rem;
  z-index: 8;
}
.searchWrapper .search {
  display: flex;
  background-color: rgba(0,0,0,.85);
  backdrop-filter: blur(2rem);
  padding: var(--boxMargin);
  border-radius: var(--borderRadius);
  box-shadow: var(--boxShadow);
}
.searchWrapper input {
  padding: 1rem;
  border-radius: var(--borderRadius);
  flex: 1;
}
.searchWrapper input:not(:only-child) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.searchWrapper button {
  width: 3.9rem;
  background-color: var(--red);
  color: #fff;
  border-radius: var(--borderRadius);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  position: relative;
}
.searchWrapper button svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.channelPrefilterMenu div {
  margin-bottom: 3rem;
  background-color: rgba(0,0,0,.75);
  transition: color 250ms ease-in-out;
  position: relative;
  overflow: hidden;

  display: flex;
  justify-content: center;
  padding: var(--boxMargin) 5rem;
  border-radius: var(--borderRadius);
  box-shadow: var(--boxShadow);
}
.channelPrefilterMenu nav img {
  cursor: pointer;
  max-width: 5rem;
  filter: grayscale(1);
  transition: filter 250ms ease-in-out;
  padding: .4rem .5rem;
  border: .1rem solid transparent;
  box-sizing: content-box;
  border-radius: .4rem;
  transition: background 250ms ease-in-out,
              border-color 250ms ease-in-out,
              filter 300ms ease-in-out;
}
.channelPrefilterMenu nav {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: .6rem;
}
.channelPrefilterMenu nav a img {
  background-color: transparent;
}
.channelPrefilterMenu nav a:focus img,
.channelPrefilterMenu nav a:hover img {
  filter: grayscale(0);
  border-color: var(--bg1);
}
.channelPrefilterMenu nav .active img {
  filter: grayscale(0);
  border-color: var(--bg1);
  background-color: rgba(255,255,255,.1);
}
.channelPrefilterMenu nav .filterClear {
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 4rem;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  background-color: var(--red);
}
.channelPrefilterMenu nav .filterClear img {
  filter: unset !important;
  background-color: unset !important;
  border: unset !important;
}

article {
  overflow: unset;
}
.coverList {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(30rem, auto));
  gap: 3rem 2.2rem;
}
.card {
  display: flex;
  flex-direction: column;
}
.cardInfo p {
  text-align: center;
  font-size: 1.4rem;
  margin-top: .4rem;
}
.cardImage {
  aspect-ratio: var(--aspectRatio);
  background-color: var(--bg3);
  border-radius: var(--borderRadius);
  box-shadow: var(--boxShadow);

  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cardImage img {
  aspect-ratio: var(--aspectRatio);
  object-fit: cover;
  transition: opacity 250ms ease-in-out;
}
.cardImage .timeSpecialInfo {
  position: absolute;
  top: .4rem;
  right: .4rem;
  background-color: rgba(0,0,0,.75);
  backdrop-filter: blur(.4rem);
  padding: .6rem;
  border-radius: var(--borderRadius);
  color: #fff;
  font-size: 1.4rem;
  z-index: 1;
}
.cardText {
  margin-top: 1rem;
  overflow: hidden;
  padding: 0 .6rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.cardText a {
  background: transparent;
  border: 0 !important;
  cursor: pointer;
  padding: 0 !important;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  outline: none !important;
  -webkit-text-decoration: none;
  text-decoration: none;
  vertical-align: top;
  line-height: 1;
}
.cardText .logo {
  height: 1em;
  margin-right: .6rem;
}
</style>