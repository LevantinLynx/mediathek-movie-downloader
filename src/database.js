const { EventEmitter } = require('events')
const events = new EventEmitter()
const Datastore = require('@seald-io/nedb')
const logger = require('./logger')
const path = require('path')
const _ = require('lodash')

const databaseDirPath = path.join(__dirname, '..', 'db')

const db = {
  cache: {
    downloadsInProgress: {}
  }
}
async function initialize () {
  // Initialize all databases
  logger.info('[DB] Initializing databases...')
  db.schedule = await new Datastore({ filename: path.join(databaseDirPath, 'schedule.db'), autoload: true })
  db.metaData = await new Datastore({ filename: path.join(databaseDirPath, 'metaData.db'), autoload: true })
  db.epgCache = await new Datastore({ filename: path.join(databaseDirPath, 'epgCache.db'), autoload: true })
  db.settings = await new Datastore({ filename: path.join(databaseDirPath, 'settings.db'), autoload: true })
  db.ignore = await new Datastore({ filename: path.join(databaseDirPath, 'ignore.db'), autoload: true })
  db.done = await new Datastore({ filename: path.join(databaseDirPath, 'done.db'), autoload: true })
  logger.info('[DB] Done initializing databases.')

  logger.info('[DB] Resetting lingering progress entries.')
  const scheduleItems = await getScheduleData()
  for (let i = 0; i < scheduleItems.length; i++) {
    if (scheduleItems[i].inProgress) {
      await setScheduleEntryInProgress(scheduleItems[i], false)
    }
  }
  logger.info('[DB] Done resetting lingering progress entries.')
}

// ****************** //
// Database Functions //
// ****************** //
async function getAvailableMovieMetaData () {
  const movieMetaData = await db.metaData.findAsync({ type: 'availableMovieMetaData' })
  return movieMetaData?.[0]?.data || []
}

function updateAvailableMovieMetaData (availableMovieMetaDataArray) {
  if (availableMovieMetaDataArray?.length > 0) {
    db.metaData.updateAsync({
      type: 'availableMovieMetaData'
    }, {
      $set: {
        type: 'availableMovieMetaData',
        data: availableMovieMetaDataArray
      }
    }, {
      upsert: true
    })
    events.emit('availableMovieMetaDataUpdate')
    logger.debug('[DB] DONE: updateAvailableMovieMetaData')
  } else {
    logger.info('[DB] updateAvailableMovieMetaData: No or empty array provided on update!')
  }
}

async function getEpgCacheData (channel) {
  if (!channel) logger.error('[DB] getEpgCacheData: No channel provided!')
  const epgCacheData = await db.epgCache.findAsync({ channel })
  return epgCacheData?.[0]?.data || {}
}

function updateEpgCacheData (cacheData, channel) {
  if (cacheData && Object.keys(cacheData).length > 0 && channel) {
    db.epgCache.updateAsync({
      channel
    }, {
      $set: {
        channel,
        data: cacheData,
        lastUpdate: new Date()
      }
    }, {
      upsert: true
    })
    logger.debug(`[DB] EPG CACHE UPDATE DONE: "${channel}"`)
  } else {
    logger.info('[DB] EPG CACHE UPDATE FAILED: No cache data or channel provided.')
  }
}
function clearEpgCache () {
  return new Promise((resolve, reject) => {
    logger.debug('[DB] Clearing EPG cache …')
    db.epgCache.remove({}, { multi: true }, (err, numRemoved) => {
      if (err) {
        logger.info('[DB] ERROR while clearing EPG cache …')
        reject(err)
      } else {
        logger.info('[DB] EPG cache cleared …', numRemoved)
        resolve()
      }
    })
  })
}

// /////// //
// SCHDULE //
// /////// //
async function getScheduleData (apiID) {
  const options = apiID ? { apiID } : {}
  let scheduleData = await db.schedule.findAsync(options)

  scheduleData = _.sortBy(scheduleData, [function (entry) {
    return entry.scheduleDates[entry.failCount] || entry.scheduleDates[entry.scheduleDates.length - 1]
  }])
  return scheduleData.map(x => {
    delete x._id
    return x
  })
}

async function addScheduleEntry (entry) {
  if (entry && entry.apiID) {
    db.schedule.updateAsync({
      apiID: entry.apiID
    }, {
      $set: entry
    }, {
      upsert: true
    })
    events.emit('scheduleUpdate')
    logger.debug(`[DB] SCHEDULE UPDATE DONE: "${entry.apiID}"`)
  } else {
    logger.info('[DB] SCHEDULE UPDATE: No valid entry provided.')
  }
}

async function setScheduleEntryInProgress (entry, status = false, failCount) {
  if (entry && entry.apiID) {
    const updateObject = { inProgress: status }
    if (failCount) updateObject.failCount = failCount
    if (failCount > entry.scheduleDates.length - 1) updateObject.failed = true

    db.schedule.updateAsync({
      apiID: entry.apiID
    }, {
      $set: updateObject
    }, {
      upsert: false
    })
    events.emit('scheduleUpdate')
    logger.debug(`[DB] SCHEDULE UPDATE DONE: "${entry.apiID}" in progress "${status}"`)
  } else {
    logger.info('[DB] SCHEDULE UPDATE: No valid entry provided.')
  }
}

async function getScheduleEntryInProgressCount () {
  try {
    const inProgressEntries = await db.schedule.findAsync({
      inProgress: true
    })
    return inProgressEntries?.length || 0
  } catch (err) {
    logger.error(err)
    return 0
  }
}

async function deleteScheduleEntry (apiID) {
  db.schedule.remove({ apiID }, {}, err => {
    if (err) {
      logger.error(err)
      events.emit('scheduleUpdate', { error: 'Error while deleting schedule entry.', apiID })
    } else {
      events.emit('scheduleUpdate')
    }
  })
}

async function setFinishedMovieState (movie, doneState) {
  db.done.updateAsync({
    apiID: movie.apiID
  }, {
    $set: {
      apiID: movie.apiID,
      title: movie.title,
      channel: movie.channel,
      done: doneState,
      date: new Date()
    }
  }, {
    upsert: true
  })
  events.emit('finishedMoviesUpdate')
}

async function getFinishedMovies () {
  const finishedMovies = await db.done.findAsync({ done: true })
  return _.orderBy(
    finishedMovies.map(movie => {
      delete movie._id
      return movie
    }),
    ['date']
  )
}

async function deleteFinishedEntry (apiID) {
  db.done.remove({ apiID }, {}, err => {
    if (err) {
      logger.error(err)
      events.emit('finishedMoviesUpdate', { error: 'Error while deleting done entry.', apiID })
    } else {
      events.emit('finishedMoviesUpdate')
    }
  })
}

async function addMovieToIgnoreList (movie) {
  db.ignore.updateAsync({
    apiID: movie.apiID
  }, {
    $set: {
      apiID: movie.apiID,
      title: movie.title,
      channel: movie.channel
    }
  }, {
    upsert: true
  })
  events.emit('ignoreListUpdate')
}

async function getIgnoreList () {
  const ignoreList = await db.ignore.findAsync({})
  return _.orderBy(
    ignoreList.map(movie => {
      delete movie._id
      return movie
    }),
    ['title']
  )
}

async function deleteMovieFromIgnoreList (apiID) {
  db.ignore.remove({ apiID }, {}, err => {
    if (err) {
      logger.error(err)
      events.emit('ignoreListUpdate', { error: 'Error while deleting ignore entry.', apiID })
    } else {
      events.emit('ignoreListUpdate')
    }
  })
}

// //////////////////////////////// //
// CACHE FUNCTIONS (IN MEMORY ONLY) //
// //////////////////////////////// //
function getDownloadsProgress () {
  return db.cache.downloadsInProgress
}
function updateDownloadProgressEntry (progress) {
  db.cache.downloadsInProgress[progress.apiID] = progress
}
function deleteDownloadProgressCacheEntry (apiID) {
  if (db.cache.downloadsInProgress[apiID]) delete db.cache.downloadsInProgress[apiID]
}

// //////// //
// SETTINGS //
// //////// //
async function getAllSettings () {
  const entries = await db.settings.findAsync({})

  const defaults = {
    maxDownloads: 3,
    maxDownloadRate: 1.5,
    maxDownloadRateUnit: 'M',

    removeSpacesFromDirNames: false,

    downloadResolutionLimit: 'none',
    preferedDownloadLanguage: 'de',
    includeAudioTranscription: true,
    includeClearLanguage: true,
    includeSubtitles: true,
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
  }

  if (entries?.[0]?.settings) {
    // Ensure changes to the defaults get added for existing installs
    const settings = { ...defaults, ...entries?.[0]?.settings }

    // Add potential new additions to settings channel selection
    const defaultsChannels = defaults.channelSelection.map(x => x.name)
    const settingsChannels = settings.channelSelection.map(x => x.name)
    for (let i = 0; i < defaultsChannels.length; i++) {
      if (settingsChannels.indexOf(defaultsChannels[i]) === -1) {
        settings.channelSelection.push({ name: defaultsChannels[i], active: true })
      }
    }
    logger.enableOrDisableDebugLogging(settings.debugLogsEnabled || false)

    return settings
  }
  return defaults
}
async function updateSettings (settings) {
  db.settings.updateAsync({
    type: 'settings'
  }, {
    $set: {
      type: 'settings',
      updated: new Date(),
      settings
    }
  }, {
    upsert: true
  })
  events.emit('settingsUpdate')
  logger.enableOrDisableDebugLogging(settings.debugLogsEnabled || false)
}

module.exports = {
  initialize,
  events,

  // MOVIE META DATA
  getAvailableMovieMetaData,
  updateAvailableMovieMetaData,
  // EPG DATA
  getEpgCacheData,
  updateEpgCacheData,
  clearEpgCache,

  // SCHEDULE
  addScheduleEntry,
  setScheduleEntryInProgress,
  deleteScheduleEntry,
  getScheduleData,
  getScheduleEntryInProgressCount,

  setFinishedMovieState,
  getFinishedMovies,
  deleteFinishedEntry,

  // IGNORE LIST
  addMovieToIgnoreList,
  getIgnoreList,
  deleteMovieFromIgnoreList,

  // CACHE FUNCTIONS
  getDownloadsProgress,
  updateDownloadProgressEntry,
  deleteDownloadProgressCacheEntry,

  // SETTINGS
  getAllSettings,
  updateSettings
}
