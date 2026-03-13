<template>
  <section>
    <h1>Geplante &amp; laufende Downloads</h1>
    <section class="downloadList">
      <article v-for="movie in sortedSchedule.filter(movie => downloadingIds.indexOf(movie.id) > -1)"
        :key="'downloading_' + movie.id"
        class="box"
      >
        <header>
          <h3>{{ movie.title || `Keine Info für "${movie.id}"` }}</h3>
        </header>
        <div style="flex-grow: 1;text-align: center;">
          <p v-if="downloadProgress[movie.id]?.files" style="margin-bottom: 1.4rem;">
            Datei {{ downloadProgress[movie.id]?.files?.done }}/{{ downloadProgress[movie.id]?.files?.count }}
          </p>
        </div>
        <div class="progress">
          <svg role="progressbar" width="100" height="100" viewBox="0 0 88 88">
            <circle cx="50%" cy="50%" r="42" shape-rendering="geometricPrecision" fill="none"
              stroke="var(--bg1)" stroke-width="2"
            ></circle>
            <circle cx="50%" cy="50%" r="42" shape-rendering="geometricPrecision" fill="none"
              stroke="var(--purpleBright)" stroke-width="4"
              :stroke-dashoffset="downloadProgress[movie.id]?.percent ? (264-264/100*downloadProgress[movie.id]?.percent) : 1"
              stroke-dasharray="264" stroke-linecap="round"
              style="transform:rotate(-90deg);transform-origin: 50% 50%;"
            ></circle>
          </svg>
          <svg class="icon" width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12V19M12 19L9.75 16.6667M12 19L14.25 16.6667M6.6 17.8333C4.61178 17.8333 3 16.1917 3 14.1667C3 12.498 4.09438 11.0897 5.59198 10.6457C5.65562 10.6268 5.7 10.5675 5.7 10.5C5.7 7.46243 8.11766 5 11.1 5C14.0823 5 16.5 7.46243 16.5 10.5C16.5 10.5582 16.5536 10.6014 16.6094 10.5887C16.8638 10.5306 17.1284 10.5 17.4 10.5C19.3882 10.5 21 12.1416 21 14.1667C21 16.1917 19.3882 17.8333 17.4 17.8333" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <div class="dlInfo" v-show="downloadProgress[movie.id].percent > 0">
            <div class="size">{{ downloadProgress[movie.id].size }}</div>
            <div class="speed" v-if="downloadProgress[movie.id].percent === '100.0'">Processing &hellip;</div>
            <div class="speed" v-else>{{ downloadProgress[movie.id].speed }}</div>
            <div class="time">{{ downloadProgress[movie.id].eta }}</div>
          </div>
        </div>
      </article>
    </section>

    <h1>{{ sortedSchedule.filter(movie => downloadingIds.indexOf(movie.id) === -1).length }} Downloads geplant</h1>
    <section class="scheduleList">
      <article v-for="movie in sortedSchedule" :key="'schedule_' + movie.id" v-show="downloadingIds.indexOf(movie.id) === -1">
        <aside>
          <div>
            <picture>
              <img :src="movie.img || '/imgs/movie_image_placeholder.svg'" :alt="movie.imgAlt" class="movieImg">
            </picture>
            <div class="info">
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
                  <span :class="{ age6: restriction.indexOf('FSK6') > -1, age12: restriction.indexOf('FSK12') > -1, age16: restriction.indexOf('FSK16') > -1, age18: restriction.indexOf('FSK18') > -1, }" v-for="restriction in movie.restrictions">{{ restriction }}</span>
                </div>
                <div class="extra" v-if="movie.duration">
                  <span>{{ movie.duration }}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <main>
          <header>
            <p>Download geplant für {{ new Date(movie.scheduleDates[movie.failCount]).toLocaleString('de-DE') }} Uhr</p>
            <h3>{{ movie.title || `Keine Info für "${movie.id}"` }}</h3>
          </header>
          <div v-if="movie.extraInfo" style="padding: var(--boxPadding);" class="downloadInfo">
            <div class="meta">
              <h4>Meta Daten Zuordnung</h4>
              <div>
                <span>IMDB</span><span>{{ movie.extraInfo.imdbid || 'N/A' }}</span>
              </div>
              <div>
                <span>TMDB</span><span>{{ movie.extraInfo.tmdbid || 'N/A' }}</span>
              </div>
            </div>
            <div class="downloadTitle">
              <h4>Titel für Dateien und Ordner</h4>
              <pre>{{ movie.extraInfo.downloadTitle }}</pre>
            </div>
          </div>
          <div style="flex: 1;"></div>
          <div class="action">
            <img :src="'/logo/' + movie.channel + '.svg'"
              :height="['arte', 'ard', 'zdf'].indexOf(movie.channel) > -1 ? '16px' : '22px'"
              :alt="movie.channel + ' Logo'"
              loading="lazy"
              v-if="movie.channel">
            <span v-else>N/A</span>
            <div>
              <RouterLink class="button edit" :to="{ name: 'UpcomingMovie', params: { movieID: movie.id } }" title="Download Info Bearbeiten" aria-label="Download Info Bearbeiten">
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.3601 4.07866L15.2869 3.15178C16.8226 1.61607 19.3125 1.61607 20.8482 3.15178C22.3839 4.68748 22.3839 7.17735 20.8482 8.71306L19.9213 9.63993M14.3601 4.07866C14.3601 4.07866 14.4759 6.04828 16.2138 7.78618C17.9517 9.52407 19.9213 9.63993 19.9213 9.63993M14.3601 4.07866L5.83882 12.5999C5.26166 13.1771 4.97308 13.4656 4.7249 13.7838C4.43213 14.1592 4.18114 14.5653 3.97634 14.995C3.80273 15.3593 3.67368 15.7465 3.41556 16.5208L2.32181 19.8021M19.9213 9.63993L11.4001 18.1612C10.8229 18.7383 10.5344 19.0269 10.2162 19.2751C9.84082 19.5679 9.43469 19.8189 9.00498 20.0237C8.6407 20.1973 8.25352 20.3263 7.47918 20.5844L4.19792 21.6782M4.19792 21.6782L3.39584 21.9456C3.01478 22.0726 2.59466 21.9734 2.31063 21.6894C2.0266 21.4053 1.92743 20.9852 2.05445 20.6042L2.32181 19.8021M4.19792 21.6782L2.32181 19.8021" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </RouterLink>
              <button @click="removeScheduledDownload(movie.id)" title="Download aus der Warteschlange entfernen" aria-label="Download aus der Warteschlange entfernen">
                <svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M18.8332 8.5L18.3732 15.3991C18.1962 18.054 18.1077 19.3815 17.2427 20.1907C16.3777 21 15.0473 21 12.3865 21H11.6132C8.95235 21 7.62195 21 6.75694 20.1907C5.89194 19.3815 5.80344 18.054 5.62644 15.3991L5.1665 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M6.5 6C6.55588 6 6.58382 6 6.60915 5.99936C7.43259 5.97849 8.15902 5.45491 8.43922 4.68032C8.44784 4.65649 8.45667 4.62999 8.47434 4.57697L8.57143 4.28571C8.65431 4.03708 8.69575 3.91276 8.75071 3.8072C8.97001 3.38607 9.37574 3.09364 9.84461 3.01877C9.96213 3 10.0932 3 10.3553 3H13.6447C13.9068 3 14.0379 3 14.1554 3.01877C14.6243 3.09364 15.03 3.38607 15.2493 3.8072C15.3043 3.91276 15.3457 4.03708 15.4286 4.28571L15.5257 4.57697C15.5433 4.62992 15.5522 4.65651 15.5608 4.68032C15.841 5.45491 16.5674 5.97849 17.3909 5.99936C17.4162 6 17.4441 6 17.5 6" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
            </div>
          </div>
        </main>
      </article>
    </section>
  </section>
</template>

<script lang="js" setup>
import { RouterLink } from 'vue-router'
import { useMovieStore } from '@/stores/movie'
import { storeToRefs } from 'pinia'
import _ from 'lodash'
import { socket } from '@/socket'

const movieStore = useMovieStore()
const {
  sortedSchedule,
  downloadProgress,
  downloadingIds,
} = storeToRefs(movieStore)

function removeScheduledDownload (movieID) {
  socket.emit('removeDownloadFromSchedule', movieID)
}
</script>

<style scoped>
.scheduleList {
  display: flex;
  flex-direction: column;
  gap: 6rem;
}
.scheduleList article {
  display: grid;
}
.scheduleList article aside > div {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--borderRadius);
  box-shadow: var(--boxShadow);
  background-color: var(--bg3);
}
.scheduleList article main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--borderRadius);
  box-shadow: var(--boxShadow);
  background-color: var(--bg3);
}
.scheduleList article h4 {
  font-weight: 600;
}
.scheduleList article header {
  padding: 0;
  border-radius: 0;
}
.scheduleList article header p {
  padding: .6em var(--boxPadding);
  background-color: var(--blue);
  color: #fff;
}
.scheduleList article header h3 {
  background-color: #000;
  padding: .6em var(--boxPadding);
  font-size: 2.2rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.scheduleList picture,
.scheduleList picture img {
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
.downloadInfo {
  display: flex;
  gap: 3rem;
  flex-wrap: wrap;
}
.downloadTitle {
  max-width: 100%;
}
.downloadTitle pre {
  display: inline-block;
  background-color: var(--bg1);
  padding: .4rem .6rem;
  border-radius: var(--borderRadius);
  font-family: monospace;
  font-size: 1.4rem;
  overflow-x: auto;
  max-width: 100%;
  margin-top: .8rem;
}
.downloadInfo .meta {
  display: flex;
  flex-direction: column;
  gap: .8rem;
}
.downloadInfo .meta > div {
  display: flex;
}
.downloadInfo .meta > div span {
  display: inline-block;
  padding: .4rem .6rem;
  background-color: var(--bgLight1);
  border-radius: .3rem;
  color: #000;
  font-size: 1.4rem;
  line-height: 1;
}
.downloadInfo .meta > div span:not(:first-child) {
  background-color: var(--bg1);
  color: #fff;
}
.downloadInfo .meta > div span:first-child {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border: .1rem solid var(--bgLight1);
  border-right: 0;
}
.downloadInfo .meta > div span:last-child {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border: .1rem solid var(--bgLight1);
  border-left: 0;
}
.info {
  padding: var(--boxPadding);
  background-color: #000;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex-grow: 1;
}
.info header {
  display: flex;
  gap: 1.4rem;
  align-items: center;
  align-content: center;
}
.info span {
  font-size: 1.4rem;
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
  background-color: #fff;
  color: #000;
}
.langs.subs span:first-child {
  background-color: var(--blue);
  color: #fff;
}
.info span.age6 {
  background-color: var(--green);
  color: #000;
}
.info span.age12 {
  background-color: var(--yellow);
  color: #000;
}
.info span.age16 {
  background-color: var(--orange);
  color: #000;
}
.info span.age18 {
  background-color: var(--red);
}
.action {
  padding: var(--boxPadding);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: .1rem solid rgba(255,255,255,.2);
}
.action div {
  display: flex;
  gap: 1rem;
}
.action .button,
.action button {
  position: relative;
  font-size: 1.4rem;
  background-color: var(--red);
  color: #fff;
  padding: 2rem;
}
.action .button.edit {
  position: relative;
  font-size: 1.4rem;
  background-color: var(--blue);
  color: #fff;
}
.action svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}


.downloadList {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(30rem, 1fr));
  gap: 2rem;
  margin-bottom: 6rem;
}
.downloadList article h3 {
  font-size: 2rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
.downloadList .progress {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}
.downloadList .progress svg[role="progressbar"] {
  --progressCircleSize: 25rem;
  width: var(--progressCircleSize);
  height: var(--progressCircleSize);
}
.downloadList .progress svg.icon {
  color: rgba(255,255,255,.75);
  transform: translate(-50%, -50%);
  position: absolute;
  top: 25%;
  left: 50%;
  width: 7rem;
}
.downloadList .dlInfo {
  position: absolute;
  top: 45%;
  width: 100%;
  text-align: center;
  font-family: monospace;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (width >= 786px) {
  article {
    grid-template-columns: 26rem auto;
    gap: var(--boxMargin);
  }
  article header {
    display: flex;
    flex-direction: column;
  }
  article header h3 {
    order: -1;
  }
}
@media (width < 786px) {
  article aside > div {
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
  }
  article main {
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
  }
}
</style>