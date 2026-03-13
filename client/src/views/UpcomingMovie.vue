<template>
  <section v-if="!movie?.id">
    <h1>{{ movie.title }}</h1>
    <p>{{ movie.error }}</p>
  </section>
  <section v-else>
    <transition mode="out-in">
    <div :key="'movie_' + movie.id">
    <header class="mainHeader">
      <h1>{{ movie.title }}</h1>
      <div>
        <a class="button" @click="$router.go(-1)" title="Zurück">
          <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 12H4M4 12L10 6M4 12L10 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </header>
    <article>
      <aside class="mainPicture">
        <picture>
          <img :src="movie.img" :alt="movie.imgAlt || `Cover Bild von ${movie.title}`">
        </picture>
      </aside>

      <div class="info box">
        <header>
          <img :src="'/logo/' + movie.channel + '.svg'"
            :height="['arte', 'ard', 'zdf'].indexOf(movie.channel) > -1 ? '16px' : '22px'"
            :alt="movie.channel + ' Logo'"
            loading="lazy">
          <p>{{ movie.preText }}</p>
        </header>

        <div v-if="movieInfoAvailable">
          <div class="langs" v-if="movie.audioLangs">
            <span>Sprachen</span>
            <span v-for="lang in movie.audioLangs">{{ lang }}</span>
          </div>
          <div class="langs subs" v-if="movie.subLangs">
            <span>UT</span>
            <span v-for="lang in movie.subLangs">{{ lang }}</span>
          </div>
          <div class="features" v-if="movie.features">
            <span>Merkmale</span>
            <span v-for="feature in movie.features">{{ feature }}</span>
          </div>
          <div class="combi">
            <div class="restrictions" v-if="movie.restrictions">
              <span :class="fskClass(restriction)" v-for="restriction in movie.restrictions">{{ restriction }}</span>
            </div>
            <div class="extra" v-if="movie.duration">
              <span>{{ movie.duration }}</span>
            </div>
          </div>
        </div>
        <div v-else>
          <p>Aktuell liegen keine weiteren Information für den Film vor.</p>
        </div>

        <div style="flex-grow: 1;"></div>
        <div class="selectedMatch">
          <h5>Zuordnung</h5>
          <div>
            <span>{{ matchInfoForDownloadRequest?.match?.indexOf('tt') === 0 ? 'IMDB' : 'TMDB'}}</span>
            <span>{{ matchInfoForDownloadRequest.match || 'Keine' }}</span>
          </div>
        </div>
      </div>

      <div class="action box">
        <div class="movie">
          <div class="inputGrp">
            <input name="matchID" id="matchID"
              type="text" placeholder="TMDB oder IMDB Film ID"
              pattern="(t{2})?\d{1,12}"
              v-model="matchInfoForDownloadRequest.match"
            >
            <button class="clear" v-if="matchInfoForDownloadRequest.match" @click="matchInfoForDownloadRequest.match = ''">
              <svg width="2.4rem" height="2.4rem" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
          <a class="button download" @click="scheduleDownload()" v-if="!scheduleEntry">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 15C3 17.8284 3 19.2426 3.87868 20.1213C4.75736 21 6.17157 21 9 21H15C17.8284 21 19.2426 21 20.1213 20.1213C21 19.2426 21 17.8284 21 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M12 3V16M12 16L16 11.625M12 16L8 11.625" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Download
          </a>
          <div class="planned" v-else>
            <div>
              Download geplant: {{ scheduleDate  }}
            </div>
            <a class="button" @click="removeScheduledDownload(movie.id)">
              <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </a>
          </div>
          <a class="button entry" :href="movie.url" target="_blank">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.1625 18.4876L13.4417 19.2084C11.053 21.5971 7.18019 21.5971 4.79151 19.2084C2.40283 16.8198 2.40283 12.9469 4.79151 10.5583L5.51236 9.8374" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M9.8374 14.1625L14.1625 9.8374" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M9.8374 5.51236L10.5583 4.79151C12.9469 2.40283 16.8198 2.40283 19.2084 4.79151C21.5971 7.18019 21.5971 11.053 19.2084 13.4417L18.4876 14.1625" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Beitrag
          </a>
          <a class="button ignore" @click="addMovieToIgnoreList(movie.id)" v-if="!scheduleEntry">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.5 5.5L5.50002 18.4998" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            Ignorieren
          </a>
        </div>

        <div class="matcher">
          <p>Meta Daten Quelle</p>
          <input type="radio" name="metaMatcher" id="tmdb" value="tmdb" v-model="metaMatcher">
          <label for="tmdb">
            <img src="/logo/tmdb.svg" alt="tmdb Logo">
          </label>
          <input type="radio" name="metaMatcher" id="imdb" value="imdb" v-model="metaMatcher">
          <label for="imdb">
            <img src="/logo/imdb.svg" alt="imdb Logo">
          </label>
        </div>
      </div>

      <div class="description box">
        <p>{{ movie.description }}</p>
        <p v-if="movie.imgAlt">{{ movie.imgAlt }}</p>
      </div>

      <Transition mode="out-in">
      <aside class="imdb box matcherSelection" v-if="metaMatcher === 'imdb'" key="imdb">
        <header>
          <h2 class="span">
            <span>Suchergebnis</span>
            <img src="/logo/imdb.svg" alt="imdb logo" class="logo">
          </h2>
        </header>
        <div class="matcherSuggestions" v-if="!movieMatcherSuggestions?.movieID">
          <div style="font-size: 2rem;" v-if="suggestionLoading === 'loading'" key="imdb_loading">
            <svg style="height: 1em; width: 1.6em;margin-right: .8rem;" xmlns="http://www.w3.org/2000/svg" viewBox="12 6 74 74" preserveAspectRatio="xMidYMid">
              <path fill="none" ng-attr-stroke="{{config.stroke}}" ng-attr-stroke-width="{{config.width}}" ng-attr-stroke-dasharray="{{config.dasharray}}" d="M24.3,30C11.4,30,5,43.3,5,50s6.4,20,19.3,20c19.3,0,32.1-40,51.4-40 C88.6,30,95,43.3,95,50s-6.4,20-19.3,20C56.4,70,43.6,30,24.3,30z" stroke="currentColor" stroke-width="7" stroke-dasharray="159.08513549804687 97.50379272460938">
                <animate attributeName="stroke-dashoffset" calcMode="linear" values="0;256.58892822265625" keyTimes="0;1" dur="1" begin="0s" repeatCount="indefinite"></animate>
              </path>
            </svg>Suche läuft …
          </div>
          <div v-else-if="suggestionLoading === 'none'" key="imdb_request">
            <button @click="getSuggestions(movie.id)">
              <svg width="24px" hanging="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="height: 1em;vertical-align: top; transform: scale(1.3);">
                <path d="M22 13V12C22 8.22876 22 6.34315 20.8284 5.17157C19.6569 4 17.7712 4 14 4H10C6.22876 4 4.34315 4 3.17157 5.17157C2 6.34315 2 8.22876 2 12C2 15.7712 2 17.6569 3.17157 18.8284C4.34315 20 6.22876 20 10 20H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M10 16H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M2 10L22 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="18" cy="17" r="3" stroke="currentColor" stroke-width="1.5"/>
                <path d="M20.5 19.5L21.5 20.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              TMDB &amp; IMDB Daten laden
            </button>
          </div>
        </div>
        <div class="matcherSuggestions" v-else-if="movieMatcherSuggestions?.imdb?.suggestions?.length">
          <div v-for="suggestion in movieMatcherSuggestions?.imdb?.suggestions" :key="'suggestion_' + suggestion.imdbid"
            class="suggestion"
            :class="{ active: movieMatcherSuggestions.imdb?.match?.imdbid === suggestion.imdbid }"
          >
            <div class="compactInfo">
              <picture>
                <img :src="suggestion.img || '/imgs/movie_poster_unavailable.svg'" loading="lazy" :alt="suggestion.title + ' (Cover Art)'">
              </picture>
              <div>
                <h4>
                  {{ suggestion.title }}
                  <span v-if="suggestion.year">({{ suggestion.year }})</span>
                </h4>
                <div v-if="suggestion.genres || suggestion.duration || suggestion.fsk" class="extraInfo">
                  <div v-if="suggestion.duration" class="duration">{{ suggestion.duration }}</div>
                  <div v-if="suggestion.fsk" class="fsk" :class="fskClass(suggestion.fsk)">{{ suggestion.fsk }}</div>
                  <div v-if="suggestion.genres" v-for="item in suggestion.genres">{{ item }}</div>
                </div>
                <div v-if="suggestion.actors && suggestion.actors.length > 0" class="actors">
                  <h5>Schauspieler</h5>
                  <p>{{ suggestion.actors.map(x => x.replace(' ', '&nbsp;')).join(', ') }}</p>
                </div>
                <div v-if="suggestion.ratings && Object.keys(suggestion.ratings).length > 0">
                  <h5>Ratings</h5>
                  <ul class="ratings">
                    <li v-for="(rate, key) in suggestion.ratings" :key="'rate_' + suggestion.tmdbid + '_' + key">
                      <span v-if="key === 'metacritic' && rate" title="Metacritic Rating">
                        <img src="/logo/metacritic.svg" alt="Metacritic Logo">
                        {{ rate }}/100
                      </span>
                      <span v-else-if="key === 'imdb' && rate" title="IMDB Rating">
                        <img src="/logo/imdb.svg" alt="IMDB Logo">
                        {{ rate }}/10
                      </span>
                      <span v-else-if="key === 'tmdb' && rate" title="TMDB Rating">
                        <img src="/logo/tmdb.svg" alt="TMDB Logo">
                        {{ rate }}/10
                      </span>
                      <span v-else-if="key === 'rotten' && rate" title="Rotten Tomatoes Rating">
                        <img :src="'/imgs/r_' + (parseInt(rate) > 59 ? 'p' : 'n') + '.svg'" alt="Rotten Tomatoes Logo">
                        {{ rate }}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div class="description">
              <transition mode="out-in">
                <button @click="matchAndDownload(suggestion.imdbid)" v-if="!isSuggestionPlanned(suggestion.imdbid)">
                  Zuordnen & herunterladen
                </button>
                <div class="button" v-else>
                  Geplant für {{ scheduleDate }}
                </div>
              </transition>
              <p v-if="suggestion.info">{{ suggestion.info }}</p>
            </div>
          </div>
        </div>
        <div class="matcherSuggestions" v-else>
          <h4>Keine Vorschläge bei "IMDb" gefunden &hellip;</h4>
        </div>
      </aside>

      <aside class="tmdb box matcherSelection" v-else-if="metaMatcher === 'tmdb'" key="tmdb">
        <header>
          <h2 class="span">
            <span>Suchergebnis</span>
            <img src="/logo/tmdb.svg" alt="imdb logo" class="logo">
          </h2>
        </header>
        <div class="matcherSuggestions" v-if="!movieMatcherSuggestions?.movieID">
          <div style="font-size: 2rem;" v-if="suggestionLoading === 'loading'" key="tmdb_loading">
            <svg style="height: 1em; width: 1.6em;margin-right: .8rem;" xmlns="http://www.w3.org/2000/svg" viewBox="12 6 74 74" preserveAspectRatio="xMidYMid">
              <path fill="none" ng-attr-stroke="{{config.stroke}}" ng-attr-stroke-width="{{config.width}}" ng-attr-stroke-dasharray="{{config.dasharray}}" d="M24.3,30C11.4,30,5,43.3,5,50s6.4,20,19.3,20c19.3,0,32.1-40,51.4-40 C88.6,30,95,43.3,95,50s-6.4,20-19.3,20C56.4,70,43.6,30,24.3,30z" stroke="currentColor" stroke-width="7" stroke-dasharray="159.08513549804687 97.50379272460938">
                <animate attributeName="stroke-dashoffset" calcMode="linear" values="0;256.58892822265625" keyTimes="0;1" dur="1" begin="0s" repeatCount="indefinite"></animate>
              </path>
            </svg>Suche läuft …
          </div>
          <div v-else-if="suggestionLoading === 'none'" key="tmdb_request">
            <button @click="getSuggestions(movie.id)">
              <svg width="24px" hanging="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="height: 1em;vertical-align: top; transform: scale(1.3);">
                <path d="M22 13V12C22 8.22876 22 6.34315 20.8284 5.17157C19.6569 4 17.7712 4 14 4H10C6.22876 4 4.34315 4 3.17157 5.17157C2 6.34315 2 8.22876 2 12C2 15.7712 2 17.6569 3.17157 18.8284C4.34315 20 6.22876 20 10 20H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M10 16H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M2 10L22 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="18" cy="17" r="3" stroke="currentColor" stroke-width="1.5"/>
                <path d="M20.5 19.5L21.5 20.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              TMDB &amp; IMDB Daten laden
            </button>
          </div>
        </div>
        <div class="matcherSuggestions" v-else-if="movieMatcherSuggestions?.tmdb?.suggestions?.length > 0">
          <div v-for="suggestion in movieMatcherSuggestions?.tmdb?.suggestions"
            :key="'suggestion_' + suggestion.tmdbid"
            class="suggestion"
            :class="{ active: movieMatcherSuggestions?.tmdb?.match?.tmdbid === suggestion.tmdbid }"
          >
            <div class="compactInfo">
              <picture>
                <img :src="suggestion.img || '/imgs/movie_poster_unavailable.svg'" loading="lazy" :alt="suggestion.title + ' (Cover Art)'">
              </picture>
              <div>
                <h4>
                  {{ suggestion.title }}
                  <span v-if="suggestion.year">({{ suggestion.year }})</span>
                </h4>
                <div v-if="suggestion.genres || suggestion.duration || suggestion.fsk" class="extraInfo">
                  <div v-if="suggestion.duration" class="duration">{{ suggestion.duration }}</div>
                  <div v-if="suggestion.fsk" class="fsk" :class="fskClass(suggestion.fsk)">{{ suggestion.fsk }}</div>
                  <div v-for="item in suggestion.genres">{{ item }}</div>
                </div>
                <div v-if="suggestion.actors && suggestion.actors.length > 0" class="actors">
                  <h5>Schauspieler</h5>
                  <p>{{ suggestion.actors.map(x => x.replace(' ', '&nbsp;')).join(', ') }}</p>
                </div>
                <div v-if="suggestion.ratings && Object.keys(suggestion.ratings).length > 0">
                  <h5>Ratings</h5>
                  <ul class="ratings">
                    <li v-for="(rate, key) in suggestion.ratings" :key="'rate_' + suggestion.tmdbid + '_' + key">
                      <span v-if="key === 'metacritic' && rate" title="Metacritic Rating">
                        <img src="/logo/metacritic.svg" alt="Metacritic Logo">
                        {{ rate }}/100
                      </span>
                      <span v-else-if="key === 'imdb' && rate" title="IMDB Rating">
                        <img src="/logo/imdb.svg" alt="IMDB Logo">
                        {{ rate }}/10
                      </span>
                      <span v-else-if="key === 'tmdb' && rate" title="TMDB Rating">
                        <img src="/logo/tmdb.svg" alt="TMDB Logo">
                        {{ rate }}/10
                      </span>
                      <span v-else-if="key === 'rotten' && rate" title="Rotten Tomatoes Rating">
                        <img :src="'/imgs/r_' + (parseInt(rate) > 59 ? 'p' : 'n') + '.svg'" alt="Rotten Tomatoes Logo">
                        {{ rate }}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div class="description">
              <transition mode="out-in">
                <button @click="matchAndDownload(suggestion.tmdbid)" v-if="!isSuggestionPlanned(suggestion.tmdbid)">
                  Zuordnen & herunterladen
                </button>
                <div class="button" v-else>
                  Geplant für {{ scheduleDate }}
                </div>
              </transition>
              <p v-if="suggestion.info">{{ suggestion.info }}</p>
            </div>
          </div>
        </div>
        <div class="matcherSuggestions" v-else>
          <h4>Keine Vorschläge bei "The Movie Database" gefunden &hellip;</h4>
        </div>
      </aside>
      </Transition>
    </article>
    </div>
    </transition>
  </section>
</template>

<script lang="js" setup>
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useMovieStore } from '@/stores/movie'
import { storeToRefs } from 'pinia'
import { computed, ref, toRef, watch } from 'vue'
import { socket } from '@/socket'
import { formatDate } from 'date-fns'
import _ from 'lodash'

const route = useRoute()
const router = useRouter()
const movieStore = useMovieStore()
const {
  availableMovies,
  availableMovieMetaData,
  availableSuggestions,
  scheduledDownloads,
  scheduledIds
} = storeToRefs(movieStore)

const suggestionLoading = ref('none')
const metaMatcher = ref('')
const settingsStore = useSettingsStore()
const defaultMatcher = toRef(settingsStore.settings, 'defaultMatcher')
watch(defaultMatcher, value => { metaMatcher.value = value || '' }, { immediate: true })

const matchInfoForDownloadRequest = ref({
  movieID: route?.params?.movieID,
  match: ''
})

function conditionalNavigation (list) {
  if (list.map(movie => movie.id).indexOf(route?.params?.movieID) > -1) {
    if (settingsStore.settings?.autoNavigateOnDownloadAndIgnore) {
      if (availableMovies.value?.length > 0) {
        const nextID = availableMovies.value[0].id
        suggestionLoading.value = 'none'
        matchInfoForDownloadRequest.value.movieID =  nextID
        matchInfoForDownloadRequest.value.match =  ''
        setTimeout(() => {
          router.push({
            name: 'UpcomingMovie',
            params: { movieID: nextID }
          })
        }, 50)
      } else {
        router.push({
          name: 'Schedule',
          path: '/schedule'
        })
      }
    } else {
      router.push({
        name: 'Upcoming',
        path: '/upcoming'
      })
    }
  }
}
socket.on('scheduleUpdate', scheduleData => conditionalNavigation(scheduleData))
socket.on('ignoreListUpdate', list => conditionalNavigation(list))

function scheduleDownload () {
  socket.emit('removeEntryFromDoneList', matchInfoForDownloadRequest.value.movieID)
  socket.emit('removeEntryFromIgnoreList', matchInfoForDownloadRequest.value.movieID)
  socket.emit('scheduleDownloadByMovieID', matchInfoForDownloadRequest.value)
}

function removeScheduledDownload (movieID) {
  socket.emit('removeDownloadFromSchedule', movieID)
}

function addMovieToIgnoreList (movieID) {
  socket.emit('addEntryToIgnoreList', movieID)
}

const movie = computed(() => {
  if (availableMovieMetaData?.value?.[route.params?.movieID]) {
    return availableMovieMetaData.value[route.params.movieID]
  }
  return {
    title: `Film ID "${route?.params?.movieID}" nicht gefunden!`,
    error: 'Kein Film vorhanden!'
  }
})

const movieInfoAvailable = computed(() => {
  return !!(
    movie?.value?.audioLangs ||
    movie?.value?.subLangs ||
    movie?.value?.features ||
    movie?.value?.restrictions ||
    movie?.value?.duration
  )
})

function getSuggestions (movieID) {
  if (availableSuggestions?.value?.[movie.value.id]) {
    return
  } else {
    socket.emit('getSuggestionsForMovie', movieID)
    suggestionLoading.value = 'loading'
  }
}

const movieMatcherSuggestions = computed(() => {
  if (movie.value) {
    if (availableSuggestions?.value?.[movie.value.id]) return availableSuggestions.value[movie.value.id]
    socket.emit('getCachedSuggestionsForMovie', movie.value.id)
  }

  return {}
})

const scheduleEntry = computed(() => {
  if (scheduledIds?.value?.indexOf(movie?.value?.id) > -1) {
    const dl = scheduledDownloads?.value?.filter(dl => dl.id === movie.value.id)?.[0]
    return dl || null
  } else {
    return null
  }
})

const scheduleDate = computed(() => {
  if (scheduleEntry) {
    const dl = scheduleEntry.value
    return `${formatDate(new Date(dl.scheduleDates[dl.failCount]), 'dd.MM.yyyy HH:mm')} Uhr`
  } else {
    return ''
  }
})

function isSuggestionPlanned (matchID) {
  if (scheduleEntry) {
    const dl = scheduleEntry.value
    return (dl?.extraInfo?.imdbid === matchID || dl?.extraInfo?.tmdbid === matchID)
  }
  return false
}

function matchAndDownload (matchID) {
  matchInfoForDownloadRequest.value.match = matchID
  scheduleDownload()
}

function fskClass (ageRating) {
  switch (ageRating) {
    case 'FSK6':
    case '6':
    case '0':
    case 'G':
    case 'Approved':
      return 'age6'
    case 'FSK12':
    case '12':
    case 'PD':
    case 'PG':
    case 'PG-13':
      return 'age12'
    case 'FSK16':
    case 'PD-M':
      return 'age16'
    case 'FSK18':
    case 'NC-17':
    case 'R':
      return 'age18'
  
    default:
      return ''
  }
}
</script>

<style scoped>
.mainHeader {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  margin: var(--boxMargin) 0 calc(var(--boxMargin) * 2);
}
.mainHeader h1 {
  margin: 0;
}
.mainHeader a.button {
  padding: 0;
  width: 4rem;
  height: 4rem;
  aspect-ratio: 1 / 1 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--boxShadow);
}
article {
  --gap: 3rem;
  display: grid;
  gap: var(--gap);
  grid-template-columns: repeat(8, 1fr);
}
article .box {
  border-radius: var(--borderRadius);
  box-shadow: var(--boxShadow);
}

.box.info {
  background-color: rgba(0,0,0,.5);
  display: flex;
  flex-direction: column;
}
.box.info header {
  display: flex;
  gap: 1.4rem;
  align-items: center;
  align-content: center;
}
.box.info > div {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.box.info span {
  font-size: 1.5rem;
  line-height: 1;
  padding: .5rem .6rem;
  background-color: var(--bg2);

  border-radius: .3rem;
}
.langs,
.restrictions,
.combi,
.extra,
.features {
  display: flex;
  gap: .8rem;
  flex-wrap: wrap;
}
.features span:first-child {
  background-color: var(--purple);
  color: #000;
}
.langs span:first-child {
  background-color: var(--bgLight3);
  color: #000;
}
.langs.subs span:first-child {
  background-color: var(--lightBlue);
}
.box.info span.age6 {
  background-color: var(--green);
  color: #000;
}
.box.info span.age12 {
  background-color: var(--yellow);
  color: #000;
}
.box.info span.age16 {
  background-color: var(--orange);
  color: #000;
}
.box.info span.age18 {
  background-color: var(--red);
}

.box.info .selectedMatch {
  margin-top: 2rem;
  display:flex;
  flex-direction: column;
  gap: 1rem;
}
.selectedMatch h5 {
  font-weight: 600;
}
.selectedMatch div {
  display: flex;
  gap: 1rem;
}
.selectedMatch div span:first-child {
  background-color: var(--bgLight3);
  color: #000;
}
.selectedMatch button {
  position: relative;
  background-color: var(--red);
  color: #fff;
  width: 1.5em;
}
.selectedMatch button svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1em;
  height: 1em;
}


.box.action {
  display: grid;
  align-content: space-between;
}
.box.action input {
  padding: .8rem 1rem;
  border-radius: var(--borderRadius);
  border: .1rem solid #000;
}
.box.action input:invalid {
  border-color: var(--red);
  color: #fff;
}
.box.action .button {
  display: flex;
  gap: .6rem;
  align-items: center;
}
.box.action .inputGrp {
  display: flex;
}
.box.action .inputGrp input {
  width: 50%;
  flex-grow: 1;
}
.box.action .inputGrp input:not(:only-child) {
  border-right: 0;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.box.action .clear {
  position: relative;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  background: var(--red);
  color: #fff;
  width: 3.6rem;
}
.box.action .clear svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  background: var(--red);
  color: #fff;
}
.box.action .button.download {
  background-color: var(--green);
  color: #000;
}
.box.action .button.entry {
  background-color: var(--blue);
  color: #fff;
  text-decoration: unset;
}
.box.action .button.ignore {
  background-color: var(--red);
  color: #fff;
}
.box.action .button svg {
  height: 1em;
  transform: scale(1.1);
}
.box.action .movie {
  display: flex;
  gap: 1.4rem;
  flex-direction: column;
}
.box.action .planned {
  display: flex;
  gap: 1rem;
}
.box.action .planned div {
  color: #fff;
  padding: .8rem 0;
  flex-grow: 1;
}
.box.action .planned a:first-child {
  flex-grow: 1;
}
.box.action .planned a:last-child {
  background-color: var(--red);
  color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
}
.box.action .planned a svg {
  transform: scale(1.5);
}
.matcher {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr 1fr;
}
.matcher p {
  grid-column: span 2;
  margin: 0;
  font-weight: 600;
}
.matcher label {
  user-select: none;
  cursor: pointer;
  border: .1rem solid rgba(255,255,255,.2);
  background-color: rgba(255,255,255,.1);
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: var(--borderRadius);

  transition: border 200ms ease-in-out,
    background 200ms ease-in-out;
}
.matcher label[for="imdb"] img {
  height: 3rem;
}
.matcher label[for="tmdb"] img {
  width: 8.6rem;
}
.matcher input[type="radio"] {
  position: absolute;
  visibility: hidden;
  width: 0;
  height: 0;
}
.matcher input[type="radio"]:checked + label {
  border-color: var(--green);
}
.matcher input[type="radio"]:not(:checked) + label:hover {
  border-color: var(--purple);
}

.mainPicture img {
  border-radius: var(--borderRadius);
  box-shadow: var(--boxShadow);
  aspect-ratio: 16 / 9;
  display: block;
  object-fit: cover;
  width: 100%;
}

.matcherSelection .span {
  display: flex;
  gap: 1.4rem;
  justify-content: space-between;
}
.matcherSelection .logo {
  height: 1em;
  width: auto;
}
.tmdb .logo {
  width: 8rem;
}


.matcherSuggestions {
  display: grid;
  gap: 2rem;
}
.suggestion {
  background-position: bottom center;
  background-repeat: no-repeat;
  background-size: contain;
  border-radius: var(--borderRadius);
  border: .2rem solid transparent;
  transition: border 150ms ease-in-out;
  background-color: var(--bg1);
}
.suggestion .compactInfo {
  display: grid;
  grid-template-columns: 12rem auto;
  padding: var(--boxMargin);
  gap: 2rem;
}
.suggestion .description {
  padding: 0 var(--boxMargin) var(--boxMargin);
}
.suggestion .description .button {
  background-color: var(--green);
  cursor: not-allowed;
  display: inline-block;
}
.suggestion .description p {
  margin-top: var(--boxMargin);
}
.suggestion img {
  border-radius: var(--borderRadius);
}
.suggestion h4 {
  font-size: 1.8rem;
  margin-bottom: 1.4rem;
  font-weight: 600;
}
.suggestion h4 span {
  font-size: 1.4rem;
  font-weight: normal;
}
.suggestion .extraInfo {
  display: flex;
  flex-wrap: wrap;
  gap: .8rem;
  margin-bottom: 2rem;
}
.suggestion .extraInfo div {
  font-size: .9em;
  padding: .4rem .6rem;
  border-radius: .2rem;
  background: #fff;
  color: #000;
}
.suggestion .extraInfo .duration {
  background-color: var(--bg3);
  color: #fff;
}
.suggestion .extraInfo .age6 {
  background-color: var(--green);
}
.suggestion .extraInfo .age12 {
  background-color: var(--yellow);
}
.suggestion .extraInfo .age16 {
  background-color: var(--orange);
}
.suggestion .extraInfo .age18 {
  background-color: var(--red);
  color: #fff;
}
.suggestion h5 {
  font-weight: 600;
  margin-bottom: .6rem;
}
.suggestion .actors:not(:last-child),
.suggestion .ratings:not(:last-child) {
  margin-bottom: 1.4rem;
}
.suggestion .ratings {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
}
.suggestion .ratings li img {
  height: 1em;
  max-width: 3em;
  margin-right: .6rem;
  vertical-align: top;
}

.suggestion.active {
  border-color: var(--green);
}


.mainPicture {
  grid-column: span 4;
}
.box.info {
  grid-column: span 2;
}
.box.action {
  grid-column: span 2;
}
.box.description {
  grid-column: span 8;

  -webkit-box-shadow: unset;
  -moz-box-shadow: unset;
  box-shadow: unset;
  background-color: unset;
  border-radius: unset;
  padding: 0;
  overflow: unset;
}
.matcherSelection {
  grid-column: span 8;
}

@media (width <= 1160px) {
  .mainPicture {
    grid-column: span 5;
  }
  .box.info {
    grid-column: span 3;
  }
  .box.action {
    grid-column: span 8;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--boxMargin);
  }
}
@media (width >= 1024px) {
  .matcherSuggestions {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (width <= 1024px) {
  .mainPicture {
    grid-column: span 5;
  }
  .box.info {
    grid-column: span 3;
  }
  .box.action {
    grid-column: span 8;
    gap: var(--boxMargin);
  }
}

@media  (width <= 768px) {
  .box.info,
  .mainPicture {
    grid-column: span 8;
  }
  .box.action {
    grid-template-columns: unset;
    gap: 2.6rem;
  }
}
@media  (width <= 560px) {
  .suggestion .compactInfo {
    grid-template-columns: 8.8rem auto;
    gap: 1rem;
  }
}
</style>