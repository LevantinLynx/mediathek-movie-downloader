import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    settings: {
      maxDownloads: 3,
      maxDownloadRate: 1.5,
      maxDownloadRateUnit: 'M',

      downloadResolutionLimit: 'none',
      preferedDownloadLanguage: 'de',
      includeAudioTranscription: true,
      includeClearLanguage: true,
      includeSubtitles: true,
      convertSubtitles: false,

      autoNavigateOnDownloadAndIgnore: false,

      movieSortOrder: 'date',

      fileAndFolderNaming: 'jellyfin',
      generateNfoFile: false,

      enableImageCaching: true,

      defaultMatcher: 'tmdb',

      debugLogsEnabled: false,

      channelSelection: [
        { name: 'ZDF', active: true },
        { name: 'ZDFneo', active: true },
        { name: 'ZDFtivi', active: true },
        { name: 'phoenix', active: true },
        { name: '3sat', active: true },
        { name: 'Arte', active: true },
        { name: 'ARD', active: true },
        { name: 'ARD alpha', active: true },
        { name: 'Das Erste', active: true },
        { name: 'BR', active: true },
        { name: 'HR', active: true },
        { name: 'MDR', active: true },
        { name: 'NDR', active: true },
        { name: 'rbb', active: true },
        { name: 'SR', active: true },
        { name: 'SWR', active: true },
        { name: 'WDR', active: true },
        { name: 'ONE', active: true },
        { name: 'funk', active: true },
        { name: 'KIKA', active: true }
      ]
    },
    nextMetaDataUpdateDate: null,
    version: null,
  }),
  getters: {
    isIosStandalone () {
      return window.navigator.standalone
    },
    isStandalone () {
      return window.matchMedia('(display-mode: standalone)').matches
    },
    isMinimalUI () {
      return window.matchMedia('(display-mode: minimal-ui)').matches
    },
    isLaunchedAsApp (state) {
      return ( // App mode if any of these are true
        state.isIosStandalone ||
        state.isStandalone ||
        state.isMinimalUI
      )
    },
  }
})