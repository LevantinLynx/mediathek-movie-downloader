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
  cronTime: process.env.NODE_ENV === 'development'
    ? '0 */5 * * * *'
    : `${getRandomInteger(1, 59)} */15 * * * *`,
  onTick: () => downloader.checkForScheduledDownloads(),
  start: false,
  timeZone: 'Europe/Berlin'
})

const metaDataUpdateJob = CronJob.from({
  cronTime: getRandomMetaDataRefreshCronTime(),
  onTick: async () => startMetaDataRefreshJob(),
  start: true,
  timeZone: 'Europe/Berlin'
})

const downloadProgressJob = CronJob.from({
  cronTime: '* * * * * *',
  onTick: () => io.emit('downloadProgressUpdate', db.getDownloadsProgress()),
  start: false,
  timeZone: 'Europe/Berlin'
})

CronJob.from({
  cronTime: '0 1 6 * * *',
  onTick: () => {
    const time = new CronTime(getRandomMetaDataRefreshCronTime())
    metaDataUpdateJob.setTime(time)
    io.emit('nextMetaDataUpdateDate', metaDataUpdateJob.nextDate())
    logger.info('[CRON] Meta data will be updated @', metaDataUpdateJob.cronTime.source)
  },
  start: true,
  timeZone: 'Europe/Berlin'
})

function getRandomMetaDataRefreshCronTime () {
  return `${getRandomInteger(0, 59)} ${getRandomInteger(5, 55)} ${shuffleArray([0, 1, 2, 3, 4, 5, 23]).pop()} * * *`
}

serverEvents.on('forceMetaDataUpdate', () => startMetaDataRefreshJob(true))

let metaDataJobRunning = false
async function startMetaDataRefreshJob (isForced) {
  if (metaDataJobRunning) return logger.info('[SKIP] Meta data refresh job is currently running!')

  if (isForced) {
    try {
      await db.clearEpgCache()
    } catch (err) {
      logger.error(err)
    }
  }

  metaDataJobRunning = true
  logger.info(`[META DATA] Refreshing available movie data …${isForced ? ' (forced refresh)' : ''}`)
  const availableMovieMetaData = await getAvailableMovieMetaDataFromApis()
  db.updateAvailableMovieMetaData(availableMovieMetaData)
  metaDataJobRunning = false
  logger.info('[META DATA] DONE Refreshing available movie data …')
}

module.exports = {
  scheduleCheckJob,
  metaDataUpdateJob,
  downloadProgressJob
}
