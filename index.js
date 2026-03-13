const { version } = require('./package.json')
const logger = require('./src/logger.js')
const db = require('./src/database.js')
const matcher = require('./src/matcher/main.js')
const fs = require('fs-extra')
const path = require('path')
const { server, io, serverEvents } = require('./src/server.js')
const cron = require('./src/cron.js')

const {
  scheduleDownloadByMovieID
} = require('./src/scheduler.js')
const {
  sleep,
  sendNotificationToClients,
  generateTestNotifications
} = require('./src/helperFunctions.js')

io.on('connection', async socket => {
  async function sendInitialData () {
    socket.emit('version', version)
    socket.emit('settingsUpdate', await db.getAllSettings())
    socket.emit('downloadProgressUpdate', db.getDownloadsProgress())
    socket.emit('scheduleUpdate', await db.getScheduleData())
    socket.emit('ignoreListUpdate', await db.getIgnoreList())
    socket.emit('doneListUpdate', await db.getFinishedMovies())
    socket.emit('availableMovieMetaDataUpdate', await db.getAvailableMovieMetaData())
    socket.emit('nextMetaDataUpdateDate', cron.metaDataUpdateJob.nextDate())

    const notificationIDs = Object.keys(runningNotificationsCache)
    if (notificationIDs.length > 0) {
      for (let i = 0; i < notificationIDs.length; i++) {
        socket.emit('bannerNotification', runningNotificationsCache[notificationIDs[i]])
      }
    }

    if (process.env.NODE_ENV === 'development') generateTestNotifications()
  }

  socket.on('getInitialData', () => sendInitialData())

  // Settings
  socket.on('updateSettings', settings => db.updateSettings(settings))
  // Manual actions triggered in settings panel
  socket.on('runYtdlpUpdateCheck', () => serverEvents.emit('runYtdlpUpdateCheck'))
  socket.on('forceMetaDataUpdate', () => serverEvents.emit('forceMetaDataUpdate'))
  socket.on('runDownloadCheck', () => serverEvents.emit('runDownloadCheck'))

  // Imdb/Tmdb Suggestions
  socket.on('getCachedSuggestionsForMovie', async movieID => {
    try {
      const suggestions = await matcher.getCachedMovieSuggestionsByMovieID(movieID)
      if (suggestions) socket.emit('suggestionsForMovie', suggestions)
    } catch (err) {
      logger.error('[SOCKET] getSuggestionsForMovie', err)
      socket.emit('suggestionsForMovie', {
        movieID,
        error: `Fehler beim laden der Vorschläge. "${err.message}"`
      })
    }
  })
  socket.on('getSuggestionsForMovie', async movieID => {
    try {
      const suggestions = await matcher.getMovieSuggestionsByMovieID(movieID)
      if (suggestions) socket.emit('suggestionsForMovie', suggestions)
    } catch (err) {
      logger.error('[SOCKET] getSuggestionsForMovie', err)
      socket.emit('suggestionsForMovie', {
        movieID,
        error: `Fehler beim laden der Vorschläge. "${err.message}"`
      })
    }
  })

  // Schedule
  socket.on('scheduleDownloadByMovieID', async (info) => {
    const status = await scheduleDownloadByMovieID(info)
    if (status.ok) {
      io.emit('scheduleUpdate', await db.getScheduleData())
      sendNotificationToClients({
        result: 'success',
        msg: `Download für "${status.title || info.movieID}" geplant.`,
        time: 2000
      })
    }
  })
  socket.on('removeDownloadFromSchedule', movieID => db.deleteScheduleEntry(movieID))

  // Finished Downloads list
  socket.on('removeEntryFromDoneList', movieID => db.deleteFinishedEntry(movieID))

  // Ignore list
  socket.on('addEntryToIgnoreList', async movieID => {
    try {
      const movie = await db.getMovieMetaDataByID(movieID)
      if (movie?.id) await db.addMovieToIgnoreList(movie)
      else {
        sendNotificationToClients({
          result: 'error',
          msg: `Kein Film mit ID "${movieID}" gefunden.`,
          time: 5000
        })
      }
    } catch (err) {
      logger.error('[SOCKET] Error while adding movie to ignorelist', err)
      sendNotificationToClients({
        result: 'error',
        msg: `Fehler beim ignorieren des Film: "${err.message}"`,
        time: 5000
      })
    }
  })
  socket.on('removeEntryFromIgnoreList', async movieID => {
    try {
      await db.deleteMovieFromIgnoreList(movieID)
    } catch (err) {
      logger.error('[SOCKET] Error while adding movie to ignorelist', err)
      sendNotificationToClients({
        result: 'error',
        msg: `Fehler beim entfernen des Film von der Ignore Liste: "${err.message}"`,
        time: 5000
      })
    }
  })
})

const runningNotificationsCache = {}
// Notifications for user feedback client side
serverEvents.on('sendNotificationToClients', info => {
  if (info.state === 'running') {
    runningNotificationsCache[info.uuid] = info
  } else if (info.state === 'done' && runningNotificationsCache[info.uuid]) {
    delete runningNotificationsCache[info.uuid]
  }
  io.emit('bannerNotification', info)
})

async function initializeServer () {
  logger.info('[SERVER] Ensure all required dirs are created...')
  // Ensure downloads directory exists
  fs.ensureDirSync(path.join(__dirname, 'downloads'))

  await cron.checkAndUpdateYtDlp()

  await db.initialize()

  if (!process.env.OMDB_API_KEY || !process.env.TMDB_API_READ_ACCESS_TOKEN) {
    logger.info('🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈')
  }
  logger.info('[API KEYS] If you add API keys on an existing install, remove the "tmdbMovies.db", "imdbMovies.db", "tmdbSuggestions.db" & "imdbSuggestions.db" and restart the server!')
  if (!process.env.OMDB_API_KEY) {
    logger.error('[API OMDB] No OMDB_API_KEY set, not retrieving ratings for movies!')
    logger.info('[API OMDB] To get the full experience, get an API key and set it in the environment variables.')
    logger.info('[API OMDB] Request and API Key on https://www.omdbapi.com/apikey.aspx the free account is fine. (Consider donating!)')
  } else {
    logger.info('[API OMDB] API Key detected! Will request ratings info for movies!')
  }
  if (!process.env.TMDB_API_READ_ACCESS_TOKEN) {
    logger.error('[API TMDB] No TMDB_API_READ_ACCESS_TOKEN set, using fallback search.')
    logger.info('[API TMDB] To get the full experience, get an API key and set it in the environment variables.')
    logger.info('[API TMDB] Register an account (free) on https://www.themoviedb.org/signup and get your API Read Access Token. https://developer.themoviedb.org/docs/getting-started')
  } else {
    logger.info('[API TMDB] API Key detected! Will request additional info for movies!')
  }
  if (!process.env.OMDB_API_KEY || !process.env.TMDB_API_READ_ACCESS_TOKEN) {
    logger.info('🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈 🛈')
  }

  // Start express server
  server.listen(process.env.SERVER_PORT || 12345, '0.0.0.0', () => {
    logger.info(`[SERVER VERSION] ${version}`)
    logger.info(`[SERVER] http/ws server listening on http://0.0.0.0:${process.env.SERVER_PORT || 12345}`)
  })

  // Start cron jobs
  if (process.env.NODE_ENV === 'production') {
    cron.scheduleCheckJob.start()
    logger.info('[CRON] Schedule checker will run @', cron.scheduleCheckJob.cronTime.source)

    cron.metaDataUpdateJob.start()
    cron.metaDataScheduleUpdateCronJob.start()
    logger.info('[CRON] Meta data will be updated @', new Date(cron.metaDataUpdateJob.nextDate()).toLocaleString('de-DE'))

    cron.ytDlpUpdateCronJob.start()
    logger.info('[CRON] yt-dlp updater will check for updates @', new Date(cron.ytDlpUpdateCronJob.nextDate()).toLocaleString('de-DE'))
  } else {
    logger.debug('[CRON] Development mode detected. No cron jobs will be scheduled!')
  }
}

// DB event listeners
db.events.on('availableMovieMetaDataUpdate', async () => {
  io.emit('availableMovieMetaDataUpdate', await db.getAvailableMovieMetaData())
})

db.events.on('scheduleUpdate', async (info) => {
  if (info?.error) {
    sendNotificationToClients({
      type: 'error',
      msg: `${info.error} "${info.apiID}"`
    })
  }

  io.emit('scheduleUpdate', await db.getScheduleData())
})

db.events.on('settingsUpdate', async () => {
  sendNotificationToClients({
    result: 'success',
    msg: 'Einstellungen gespeichert.',
    time: 1500
  })
  io.emit('settingsUpdate', await db.getAllSettings())
})

db.events.on('doneListUpdate', async () => {
  io.emit('doneListUpdate', await db.getFinishedMovies())
})

db.events.on('ignoreListUpdate', async (err) => {
  if (err) sendNotificationToClients({ type: 'error', msg: err.errorMsg, time: 5000 })
  else io.emit('ignoreListUpdate', await db.getIgnoreList())
})

serverEvents.on('startDownloadProgressJob', () => {
  if (!cron.downloadProgressJob.running) {
    cron.downloadProgressJob.start()
    logger.debug('[CRON] downloadProgressJob started …')
  }
})
serverEvents.on('stopDownloadProgressJob', async () => {
  await sleep(1500)
  if (await db.getScheduleEntryInProgressCount() === 0 && cron.downloadProgressJob.isActive) {
    cron.downloadProgressJob.stop()
    logger.debug('[CRON] downloadProgressJob stopped …')
  }
})

initializeServer()
