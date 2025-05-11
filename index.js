const YTDlpWrap = require('yt-dlp-wrap').default
const { version } = require('./package.json')
const logger = require('./src/logger.js')
const db = require('./src/database.js')
const fs = require('fs-extra')
const path = require('path')
const { server, io, serverEvents } = require('./src/server.js')
const cron = require('./src/cron.js')
// const downloader = require('./src/downloader.js')
const {
  scheduleDownloadByIdAndChannel
} = require('./src/scheduler.js')
const { sleep } = require('./src/helperFunctions.js')

io.on('connection', async socket => {
  socket.emit('version', version)
  socket.emit('settingsUpdate', await db.getAllSettings())
  socket.emit('scheduleUpdate', await db.getScheduleData())
  socket.emit('finishedMoviesUpdate', await db.getFinishedMovies())
  socket.emit('ignoreListUpdate', await db.getIgnoreList())
  socket.emit('downloadProgressUpdate', db.getDownloadsProgress())
  socket.emit('availableMovieMetaDataUpdate', await db.getAvailableMovieMetaData())
  socket.emit('nextMetaDataUpdateDate', cron.metaDataUpdateJob.nextDate())

  // Schedule
  socket.on('addEntryToSchedule', async (apiID, channel) => {
    const status = await scheduleDownloadByIdAndChannel(apiID, channel)
    if (status.ok) {
      io.emit('scheduleUpdate', await db.getScheduleData())
      io.emit('bannerNotification', { type: 'success', msg: `Download für "${status.title || apiID}" geplant.` })
    }
  })
  socket.on('removeEntryFromSchedule', apiID => db.deleteScheduleEntry(apiID))

  // Finished Downloads list
  socket.on('removeEntryFromFinished', apiID => db.deleteFinishedEntry(apiID))

  // Ignore list
  socket.on('addEntryToIgnoreList', async (movie) => await db.addMovieToIgnoreList(movie))
  socket.on('removeEntryFromIgnoreList', apiID => db.deleteMovieFromIgnoreList(apiID))

  // Settings
  socket.on('updateSettings', settings => db.updateSettings(settings))

  // Manual meta data refresh triggered in settings panel
  socket.on('forceMetaDataUpdate', () => serverEvents.emit('forceMetaDataUpdate'))
})

async function initializeServer () {
  logger.info('[SERVER] Ensure all required dirs are created...')
  // Ensure downloads directory exists
  fs.ensureDirSync(path.join(__dirname, 'downloads'))
  // Ensure yt-dlp directory exists
  fs.ensureDirSync(path.join(__dirname, 'src', 'bin'))

  logger.info('[SERVER] Downloading yt-dlp...')
  // ensure yt-dlp is downloaded
  await YTDlpWrap.downloadFromGithub(path.join(__dirname, 'src', 'bin', 'yt-dlp'))

  const ytDlp = new YTDlpWrap(path.join(__dirname, 'src', 'bin', 'yt-dlp'))

  logger.info('[YT-DLP] Version:', `${await ytDlp.getVersion()}`.trim())

  await db.initialize()

  // Start express server
  server.listen(process.env.SERVER_PORT || 12345, '0.0.0.0', () => {
    logger.info(`[SERVER] http/ws server listening on http://0.0.0.0:${process.env.SERVER_PORT || 12345}`)
  })

  // Start cron jobs
  cron.scheduleCheckJob.start()
  logger.info('[CRON] Schedule checker will run @', cron.scheduleCheckJob.cronTime.source)
  cron.metaDataUpdateJob.start()
  logger.info('[CRON] Meta data will be updated @', new Date(cron.metaDataUpdateJob.nextDate()).toLocaleString('de-DE'))
}

// DB event listeners
db.events.on('availableMovieMetaDataUpdate', async () => {
  io.emit('availableMovieMetaDataUpdate', await db.getAvailableMovieMetaData())
})

db.events.on('scheduleUpdate', async (info) => {
  if (info?.error) {
    io.emit('bannerNotification', {
      type: 'error',
      msg: `${info.error} "${info.apiID}"`
    })
  }

  io.emit('scheduleUpdate', await db.getScheduleData())
})

db.events.on('settingsUpdate', async () => {
  io.emit('settingsUpdate', await db.getAllSettings())
})

db.events.on('finishedMoviesUpdate', async () => {
  io.emit('finishedMoviesUpdate', await db.getFinishedMovies())
})

db.events.on('ignoreListUpdate', async () => {
  io.emit('ignoreListUpdate', await db.getIgnoreList())
})

serverEvents.on('startDownloadProgressJob', () => {
  if (!cron.downloadProgressJob.running) {
    cron.downloadProgressJob.start()
    logger.debug('[CRON] downloadProgressJob started …')
  }
})
serverEvents.on('stopDownloadProgressJob', async () => {
  await sleep(1500)
  if (await db.getScheduleEntryInProgressCount() === 0 && cron.downloadProgressJob.running) {
    cron.downloadProgressJob.stop()
    logger.debug('[CRON] downloadProgressJob stopped …')
  }
})

initializeServer()
