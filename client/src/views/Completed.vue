<template>
  <section>
    <section>
      <h1>{{ doneList.length }} geladene Filme</h1>
      <aside class="searchWrapper">
        <div class="search">
          <input type="text" placeholder="Downloads filtern …" v-model="doneListFilter">
          <button v-if="doneListFilter.length > 0" @click="doneListFilter = ''">
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
      <div class="pagination" v-if="chunkedDoneList.length > 1">
        <button @click="pageDoneDown()" aria-label="Vorherige Seite" title="Vorherige Seite">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L9 12L15 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button>
          <span>{{ pageDoneIndex + 1 }}</span>
        </button>
        <button @click="pageDoneUp()" aria-label="Nächste Seite" title="Nächste Seite">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5L15 12L9 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="list">
        <Transition mode="out-in">
        <section :key="pageDoneIndex">
          <div v-for="movie in chunkedDoneList[pageDoneIndex]" :key="'ignorelist_' + movie.id" class="entry">
            <div>
              <div class="title">{{ movie.title }}</div>
              <div class="time">{{ formatDate(movie.date) }}</div>
              <div class="split">
                <img :src="'/logo/' + movie.channel + '.svg'"
                  :height="['arte', 'ard', 'zdf'].indexOf(movie.channel) > -1 ? '16px' : '20px'"
                  :alt="movie.channel + ' Logo'"
                  loading="lazy"
                  v-if="movie.channel">
                <span class="hash">{{ movie.id }}</span>
              </div>
            </div>
            <button @click="removeEntryFromDoneList(movie.id)" aria-lanel="Eintrag aus Liste entfernen">
              <svg width="2.4rem" height="2.4rem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        </section>
        </Transition>
      </div>
      <div class="pagination" v-if="chunkedDoneList.length > 1">
        <button @click="pageDoneDown()" aria-label="Vorherige Seite" title="Vorherige Seite">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L9 12L15 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button>
          <span>{{ pageDoneIndex + 1 }}</span>
        </button>
        <button @click="pageDoneUp()" aria-label="Nächste Seite" title="Nächste Seite">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5L15 12L9 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </section>

    <section>
      <h1 style="margin-top: 8rem;">{{ ignoreList.length }} ignorierte Filme</h1>
      <aside class="searchWrapper">
        <div class="search">
          <input type="text" placeholder="Ignore Liste filtern …" v-model="ignoreListFilter">
          <button v-if="ignoreListFilter.length > 0" @click="ignoreListFilter = ''">
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
      <div class="pagination" v-if="chunkedIgnoreList.length > 1">
        <button @click="pageIgnoreDown()" aria-label="Vorherige Seite" title="Vorherige Seite">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L9 12L15 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button>
          <span>{{ pageIgnoreIndex + 1 }}</span>
        </button>
        <button @click="pageIgnoreUp()" aria-label="Nächste Seite" title="Nächste Seite">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5L15 12L9 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="list">
        <Transition mode="out-in">
        <section :key="pageIgnoreIndex">
          <div v-for="movie in chunkedIgnoreList[pageIgnoreIndex]" :key="'ignorelist_' + movie.id" class="entry">
            <div>
              <div class="title">{{ movie.title }}</div>
              <div class="time">{{ formatDate(movie.date) }}</div>
              <div class="split">
                <img :src="'/logo/' + movie.channel + '.svg'"
                  :height="['arte', 'ard', 'zdf'].indexOf(movie.channel) > -1 ? '16px' : '20px'"
                  :alt="movie.channel + ' Logo'"
                  loading="lazy"
                  v-if="movie.channel">
                <span class="hash">{{ movie.id }}</span>
              </div>
            </div>
            <button @click="removeEntryFromIgnoreList(movie.id)" aria-lanel="Eintrag aus Liste entfernen">
              <svg width="2.4rem" height="2.4rem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        </section>
        </Transition>
      </div>
      <div class="pagination" v-if="chunkedIgnoreList.length > 1">
        <button @click="pageIgnoreDown()" aria-label="Vorherige Seite" title="Vorherige Seite">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L9 12L15 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button>
          <span>{{ pageIgnoreIndex + 1 }}</span>
        </button>
        <button @click="pageIgnoreUp()" aria-label="Nächste Seite" title="Nächste Seite">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 5L15 12L9 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </section>
  </section>
</template>

<script lang="js" setup>
import { useMovieStore } from '@/stores/movie'
import { storeToRefs } from 'pinia'
import { socket } from '@/socket'
import { computed, ref, watch } from 'vue'

import { formatDate as formatDateFns } from 'date-fns'

const movieStore = useMovieStore()
const {
  ignoreList,
  doneList
} = storeToRefs(movieStore)

const doneListFilter = ref('')
const ignoreListFilter = ref('')

function chunk (arr, chunkSize = 1) {
  const chunked = []
  const tmp = [...arr]
  if (chunkSize <= 0) return chunked
  while (tmp.length) chunked.push(tmp.splice(0, chunkSize))
  return chunked
}

const chunkSize = 8

const chunkedDoneList = computed(() => {
  const filteredList = doneList.value.filter(movie => movie.title.toLowerCase().indexOf(doneListFilter.value.toLowerCase()) > -1)
  return chunk(filteredList.reverse(), chunkSize)
})
const pageDoneIndex = ref(0)
function pageDoneUp () {
  if (pageDoneIndex.value < chunkedDoneList.value.length - 1) pageDoneIndex.value++
}
function pageDoneDown () {
  if (pageDoneIndex.value > 0) pageDoneIndex.value--
}
watch(doneListFilter, () => { pageDoneIndex.value = 0 })

const chunkedIgnoreList = computed(() => {
  const filteredList = ignoreList.value.filter(movie => movie.title.toLowerCase().indexOf(ignoreListFilter.value.toLowerCase()) > -1)
  return chunk(filteredList.reverse(), chunkSize)
})
const pageIgnoreIndex = ref(0)
function pageIgnoreUp () {
  if (pageIgnoreIndex.value < chunkedIgnoreList.value.length - 1) pageIgnoreIndex.value++
}
function pageIgnoreDown () {
  if (pageIgnoreIndex.value > 0) pageIgnoreIndex.value--
}
watch(ignoreListFilter, () => { pageIgnoreIndex.value = 0 })

function removeEntryFromDoneList (movieID) {
  socket.emit('removeEntryFromDoneList', movieID)
}
function removeEntryFromIgnoreList (movieID) {
  socket.emit('removeEntryFromIgnoreList', movieID)
}

function formatDate (date) {
  return formatDateFns(new Date(date),'dd.MM.yyyy HH:mm') + ' Uhr'
}
</script>

<style scoped>
.list section {
  display: grid;
  /* grid-template-columns: repeat(auto-fit, minmax(34rem, 1fr)); */
  gap: var(--boxMargin);
  margin-top: 2rem;
  position: relative;
}
.list .entry {
  width: 100%;
  overflow: hidden;
  border-radius: var(--borderRadius);
  box-shadow: var(--boxShadow);
  background-color: var(--bg3);
  display: grid;
  grid-template-columns: auto 4rem;
}
.list .entry > div {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* gap: 1rem; */
  padding: var(--boxPadding);
}
.list .entry .split {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.list .entry .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 2rem;
}
.list .entry .time {
  color: rgba(255,255,255,.9);
  font-size: 1.4rem;
  margin-top: .6rem;
  margin-bottom: 1.4rem;
}
.list .entry .hash {
  font-size: 1.4rem;
  font-family: monospace;
  line-height: 1;
}
.list .entry button {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  background-color: var(--red);
  color: #fff;
  position: relative;
}
.list .entry button svg {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  background-color: var(--red);
  color: #fff;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

table {
  width: 100%;
}
table thead {
  background-color: #000;
  font-size: 1.8rem;
}
table thead td {
  padding: .4rem .6rem;
}
table tbody td {
  padding: .4rem .6rem;
}
table button {
  background-color: var(--red);
  color: #fff;
  position: relative;
  border-radius: 0;
  width: 3rem;
  height: 3rem;
}
table button svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.pagination {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: end;
}
.pagination button {
  position: relative !important;
  padding: 1.8rem;
  background-color: var(--bgLight3);
}
.pagination button span,
.pagination button svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.searchWrapper {
  position: sticky;
  top: 2rem;
  z-index: 1;
}
.searchWrapper .search {
  display: flex;
  background-color: rgba(0,0,0,.85);
  backdrop-filter: blur(2rem);
  padding: var(--boxPadding);
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

@media (width >= 1024px) {
  .list section {
    grid-template-columns: 1fr 1fr;
  }
}
</style>