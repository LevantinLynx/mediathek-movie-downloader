const path = require('path')
const fs = require('fs-extra')
const YTDlpWrap = require('yt-dlp-wrap').default
const {
  getRandomInteger,
  getRndUuid,
  sendNotificationToClients
} = require('./helperFunctions.js')
const { getAvailableMovieMetaDataFromApis } = require('./extractors/main.js')
const { CronJob, CronTime } = require('cron')
const { io, serverEvents } = require('./server.js')
const db = require('./database.js')
const downloader = require('./downloader.js')
const logger = require('./logger.js')

const scheduleCheckJob = CronJob.from({
  cronTime: `${getRandomInteger(1, 59)} */5 * * * *`,
  onTick: () => downloader.checkForScheduledDownloads(),
  start: false,
  timeZone: 'Europe/Berlin'
})

const metaDataUpdateJob = CronJob.from({
  cronTime: getRandomMetaDataRefreshCronTime(),
  onTick: async () => startMetaDataRefreshJob(),
  start: false,
  timeZone: 'Europe/Berlin'
})

const downloadProgressJob = CronJob.from({
  cronTime: '* * * * * *',
  onTick: () => io.emit('downloadProgressUpdate', db.getDownloadsProgress()),
  start: false,
  timeZone: 'Europe/Berlin'
})

const ytDlpUpdateCronJob = CronJob.from({
  cronTime: `${getRandomInteger(1, 59)} ${getRandomInteger(1, 59)} ${getRandomInteger(8, 9)} * * *`,
  onTick: () => checkAndUpdateYtDlp(),
  start: false,
  timeZone: 'Europe/Berlin'
})

const metaDataScheduleUpdateCronJob = CronJob.from({
  cronTime: '0 55 5 * * *',
  onTick: () => {
    const time = new CronTime(getRandomMetaDataRefreshCronTime())
    metaDataUpdateJob.setTime(time)
    io.emit('nextMetaDataUpdateDate', metaDataUpdateJob.nextDate())
    logger.info('[CRON] Meta data will be updated @', new Date(metaDataUpdateJob.nextDate()).toLocaleString('de-DE'))
  },
  start: false,
  timeZone: 'Europe/Berlin'
})

function getRandomMetaDataRefreshCronTime () {
  return `${getRandomInteger(0, 59)} ${getRandomInteger(0, 54)} ${getRandomInteger(2, 4)} * * *`
}

let metaDataJobRunning = false
async function startMetaDataRefreshJob (isForced) {
  if (metaDataJobRunning) return logger.info('[SKIP] Meta data refresh job is currently running!')
  metaDataJobRunning = true
  const uuid = getRndUuid()

  if (isForced) {
    try {
      sendNotificationToClients({
        state: 'running',
        result: 'info',
        type: 'sync',
        msg: 'Meta Daten Cache wird gelöscht …',
        uuid
      })
      await db.clearEpgCache()
    } catch (err) {
      logger.error(err)
    }
  }

  sendNotificationToClients({
    state: 'running',
    type: 'sync',
    msg: `${isForced ? '[ERZWUNGEN] ' : ''}Meta Daten der TV-Sender werden aktualisiert …`,
    uuid
  })

  try {
    logger.info(`[META DATA] Refreshing available movie data …${isForced ? ' (forced refresh)' : ''}`)
    const metaTimeout = setTimeout(() => {
      logger.info('[META DATA] REFRESH FAILED & REACHED TIMEOUT!')
      throw new Error('META DATA REFRESH REACHED TIMEOUT!')
    }, 5 * 60 * 1000)
    const availableMovieMetaData = await getAvailableMovieMetaDataFromApis()
    db.updateAvailableMovieMetaData(availableMovieMetaData)
    clearTimeout(metaTimeout)
    logger.info('[META DATA] DONE Refreshing available movie data …')
    sendNotificationToClients({
      state: 'done',
      result: 'success',
      type: 'sync',
      msg: 'Meta Daten erfolgreich abgerufen.',
      time: 5000,
      uuid
    })
  } catch (err) {
    logger.error('[META DATA] Error while refreshing meta data.')
    logger.error(err)
    sendNotificationToClients({
      result: 'error',
      type: 'sync',
      msg: `Fehler beim aktualisieren der Meta Daten: "${err.message}"`,
      uuid
    })
  } finally {
    metaDataJobRunning = false
  }
}

let updateJobRunning = false
async function checkAndUpdateYtDlp () {
  if (updateJobRunning) {
    logger.info('[YT-DLP] Update already in progress!')
    return
  }
  updateJobRunning = true
  const uuid = getRndUuid()
  sendNotificationToClients({
    state: 'running',
    type: 'update',
    msg: 'Suche nach Update für yt-dlp …',
    uuid
  })
  try {
    // Ensure yt-dlp directory exists
    fs.ensureDirSync(path.join(__dirname, 'bin'))

    // Update check
    const ytDlpPath = path.join(__dirname, 'bin', 'yt-dlp')
    if (await Bun.file(ytDlpPath).exists()) {
      logger.info('[YT-DLP] Checking for update …')
      const currentYtDlp = new YTDlpWrap(ytDlpPath)
      const currentYtDlpVersion = `${await currentYtDlp.getVersion()}`.trim()
      logger.debug('[YT-DLP] Currently installed version:', currentYtDlpVersion)

      const githubReleasesData = await YTDlpWrap.getGithubReleases(1, 3)
      const versions = githubReleasesData.filter(release => !release.prerelease).map(release => release.tag_name)
      logger.debug('[YT-DLP] Available versions:', versions.join(', '))

      if (versions?.length > 0 && versions[0] !== currentYtDlpVersion) {
        logger.info('[YT-DLP] Updating to version:', versions[0])
        await YTDlpWrap.downloadFromGithub(ytDlpPath)
        const updatedYtDlp = new YTDlpWrap(ytDlpPath)
        const newYtDlpVersion = `${await updatedYtDlp.getVersion()}`.trim()
        logger.info('[YT-DLP] Update successful. Now running version:', newYtDlpVersion)
        sendNotificationToClients({
          result: 'success',
          type: 'update',
          msg: `Yt-dlp update erfolgreich abgeschlossen. Alte Version: ${currentYtDlpVersion}`,
          time: 5000,
          uuid
        })
      } else {
        logger.info('[YT-DLP] No update found.')
        sendNotificationToClients({
          type: 'update',
          msg: 'Yt-dlp ist bereits auf der aktuellen Version.',
          time: 5000,
          uuid
        })
      }
    } else {
      // ensure yt-dlp is downloaded
      logger.info('[YT-DLP] No binary found, downloading yt-dlp …')
      await YTDlpWrap.downloadFromGithub(ytDlpPath)
      const ytDlp = new YTDlpWrap(ytDlpPath)
      const newYtDlpVersion = `${await ytDlp.getVersion()}`.trim()
      logger.info('[YT-DLP] Now running version:', newYtDlpVersion)
      sendNotificationToClients({
        result: 'success',
        type: 'update',
        msg: `Yt-dlp wurde erfolgreich heruntergeladen. Aktuelle Version: ${newYtDlpVersion}`,
        time: 5000,
        uuid
      })
    }
  } catch (err) {
    logger.error('[YT-DLP] Update checker ERROR:', err.message)
    logger.error(err)
    sendNotificationToClients({
      result: 'error',
      type: 'update',
      msg: `Fehler beim Update von yt-dlp. ERROR: ${err.message}`,
      uuid
    })
  } finally {
    updateJobRunning = false
  }
}

// Server event listeners
serverEvents.on('runYtdlpUpdateCheck', () => checkAndUpdateYtDlp())
serverEvents.on('forceMetaDataUpdate', () => startMetaDataRefreshJob(true))
serverEvents.on('runDownloadCheck', () => downloader.checkForScheduledDownloads())

module.exports = {
  scheduleCheckJob,
  metaDataUpdateJob,
  downloadProgressJob,

  ytDlpUpdateCronJob,
  metaDataScheduleUpdateCronJob,

  checkAndUpdateYtDlp
}
