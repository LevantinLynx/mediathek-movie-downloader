import { defineStore } from 'pinia'
import _ from 'lodash'

import { useSettingsStore } from '@/stores/settings'

export const useMovieStore = defineStore('movie', {
  state: () => ({
    availableMovieMetaData: {},
    availableSuggestions: {},
    ignoreList: [],
    ignoredMovieIds: [],
    doneList: [],
    doneMovieIds: [],
    globalListSearchFilterString: '',
    globalListSearch: '',
    preFilter: '',
    scheduledDownloads: [],
    scheduledIds: [],
    downloadProgress: {},
    downloadingIds: [],
    currentDate: new Date(),
  }),
  getters: {
    movieMetaDataInitialized (state) {
      return Object.keys(state.availableMovieMetaData).length > 0
    },
    channelList (state) {
      if (!state.availableMovieMetaData) return []

      let sortedList = Object.values(state.availableMovieMetaData)
      const channelOrder = [
        'zdf', 'zdfneo', 'zdftivi',
        'arte', '3sta',
        'ard', 'das_erste', 'one', 'ard_alpha',
        'ndr', 'mdr', 'wdr', 'swr', 'rbb',
        'hr', 'br', 'sr',
        'funk', 'kika'
      ]
      const filterIds = [ ...state.ignoredMovieIds, ...state.doneMovieIds, ...state.scheduledIds ]
      sortedList = sortedList.filter(movie => filterIds.indexOf(movie.id) === -1)
      sortedList = _.compact(_.uniq(sortedList.map(movie => movie.channel)))
      sortedList = _.intersection(channelOrder, sortedList)
      return sortedList
    },
    availableMovies (state) {
      if (!state.availableMovieMetaData) return []

      let sortedList = Object.values(state.availableMovieMetaData)
      sortedList = sortedList.map(movie => {
        if (movie.time.type === 'untill') movie.remainingTime = getRemainingTime(movie.time.date, state.currentDate)
        return movie
      }).filter(movie => movie.remainingTime !== null)
      if (state.preFilter) sortedList = sortedList.filter(movie => movie.channel === state.preFilter)
      const filterIds = [ ...state.ignoredMovieIds, ...state.doneMovieIds, ...state.scheduledIds ]
      sortedList = sortedList.filter(movie => filterIds.indexOf(movie.id) === -1)

      const settingsStore = useSettingsStore()
      switch (settingsStore.settings.movieSortOrder) {
        case 'title': sortedList = _.sortBy(sortedList, ['title']); break
        case 'date': sortedList = _.orderBy(sortedList, ['time.date', 'title'], ['asc', 'asc']); break
        case 'channel': sortedList = _.sortBy(sortedList, ['channel', 'title']); break
      }

      return sortedList
    },
    filteredMovieMetaData (state) {
      if (state.globalListSearch) {
        return state.availableMovies.filter(movie => {
          return `${movie.title} ${movie.description}`.toLocaleLowerCase().indexOf(state.globalListSearch?.toLocaleLowerCase()) > -1
        })
      }

      return state.availableMovies
    },
    sortedSchedule (state) {
      if (!state.scheduledDownloads) return []

      let sortedList = state.scheduledDownloads
      if (Object.keys(state.availableMovieMetaData).length > 0) {
        sortedList = sortedList.map(entry => {
          return {
            ...(state.availableMovieMetaData[entry.id]),
            ...entry
          }
        })
      }

      sortedList = _.sortBy(sortedList, [entry => entry.scheduleDates[entry.failCount]])
      return sortedList
    },
  },
  actions: {
    setCurrentDate () {
      this.currentDate = new Date()
    }
  }
})

function getRemainingTime (movieDateString, currentDate) {
  if (!movieDateString) return false
  const movieDate = new Date(movieDateString)
  const diff = (movieDate - currentDate) / 1000
  if (diff < 0) return null
  if (diff < 259_200) {
    if (diff < 86_400) {
      const hours = Math.ceil(diff / 3_600)
      return `${hours} Stunde${hours !== 1 ? 'n' : ''}`
    }
    if (diff < 172_800) return '1 Tag'
    return '2 Tage'
  }
  return false
}
