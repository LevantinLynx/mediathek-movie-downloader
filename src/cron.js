const {
  getRandomInteger,
  shuffleArray
} = require('./helperFunctions.js')
const { getAvailableMovieMetaDataFromApis } = require('./extractors/main.js')
const { CronJob, CronTime } = require('cron')
const { io, serverEvents } = require('./server.js')
const db = require('./database.js')
const downloader = require('./downloader.js')
const logger = require('./logger.js')

const scheduleCheckJob = CronJob.from({
  cronTime: `${getRandomInteger(1, 59)} * * * * *`,
  onTick: () => downloader.checkForScheduledDownloads(),
  start: false,
  timeZone: 'Europe/Berlin'
})

const metaDataUpdateJob = CronJob.from({
  cronTime: '0 0 0 * * *',
  onTick: async () => startMetaDataRefreshJob(),
  start: false,
  timeZone: 'Europe/Berlin'
})
metaDataUpdateJob.setTime(new CronTime(getRandomMetaDataRefreshCronTime()))
metaDataUpdateJob.start()

const downloadProgressJob = CronJob.from({
  cronTime: '* * * * * *',
  onTick: () => io.emit('downloadProgressUpdate', db.getDownloadsProgress()),
  start: false,
  timeZone: 'Europe/Berlin'
})

CronJob.from({
  cronTime: '0 55 5 * * *',
  onTick: () => {
    const time = new CronTime(getRandomMetaDataRefreshCronTime())
    metaDataUpdateJob.setTime(time)
    io.emit('nextMetaDataUpdateDate', metaDataUpdateJob.nextDate())
    logger.info('[CRON] Meta data will be updated @', new Date(metaDataUpdateJob.nextDate()).toLocaleString('de-DE'))
  },
  start: true,
  timeZone: 'Europe/Berlin'
})

function getRandomMetaDataRefreshCronTime () {
  return `${getRandomInteger(0, 59)} ${getRandomInteger(0, 54)} ${shuffleArray([2, 3, 4]).pop()} * * *`
}

serverEvents.on('forceMetaDataUpdate', () => startMetaDataRefreshJob(true))

let metaDataJobRunning = false
async function startMetaDataRefreshJob (isForced) {
  if (metaDataJobRunning) return logger.info('[SKIP] Meta data refresh job is currently running!')

  if (isForced) {
    io.emit('bannerNotification', {
      type: 'success',
      msg: 'Erzwungenes neu laden der Meta Daten gestartet … dies dauert ~45 Sekunden.'
    })
    try {
      await db.clearEpgCache()
    } catch (err) {
      logger.error(err)
    }
  }

  metaDataJobRunning = true
  logger.info(`[META DATA] Refreshing available movie data …${isForced ? ' (forced refresh)' : ''}`)
  const metaTimeout = setTimeout(() => {
    metaDataJobRunning = false
    logger.info('[META DATA] REFRESH FAILED & REACHED TIMEOUT!')
  }, 15 * 60 * 1000)
  const availableMovieMetaData = await getAvailableMovieMetaDataFromApis()
  db.updateAvailableMovieMetaData(availableMovieMetaData)
  metaDataJobRunning = false
  clearTimeout(metaTimeout)
  logger.info('[META DATA] DONE Refreshing available movie data …')
}

module.exports = {
  scheduleCheckJob,
  metaDataUpdateJob,
  downloadProgressJob
}
