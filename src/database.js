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
  try {
    // Initialize all databases
    logger.info('[DB] Initializing databases...')
    db.schedule = await new Datastore({ filename: path.join(databaseDirPath, 'schedule.db'), autoload: true })
    db.metaData = await new Datastore({ filename: path.join(databaseDirPath, 'metaData.db'), autoload: true })
    db.epgCache = await new Datastore({ filename: path.join(databaseDirPath, 'epgCache.db'), autoload: true })
    db.settings = await new Datastore({ filename: path.join(databaseDirPath, 'settings.db'), autoload: true })

    db.doneAndIgnore = await new Datastore({ filename: path.join(databaseDirPath, 'doneAndIgnore.db'), autoload: true })

    db.imdbMovies = await new Datastore({ filename: path.join(databaseDirPath, 'imdbMovies.db'), autoload: true })
    db.imdbSuggestions = await new Datastore({ filename: path.join(databaseDirPath, 'imdbSuggestions.db'), autoload: true })

    db.tmdbMovies = await new Datastore({ filename: path.join(databaseDirPath, 'tmdbMovies.db'), autoload: true })
    db.tmdbSuggestions = await new Datastore({ filename: path.join(databaseDirPath, 'tmdbSuggestions.db'), autoload: true })

    db.platformMatchingInfo = await new Datastore({ filename: path.join(databaseDirPath, 'platformMatchingInfo.db'), autoload: true })

    db.omdb = await new Datastore({ filename: path.join(databaseDirPath, 'omdb.db'), autoload: true })
    logger.info('[DB] Done initializing databases.')

    logger.info('[DB] Resetting lingering progress entries.')
    const scheduleItems = await getScheduleData()
    for (let i = 0; i < scheduleItems.length; i++) {
      if (scheduleItems[i].inProgress) {
        await setScheduleEntryInProgress(scheduleItems[i], false)
      }
    }
    logger.info('[DB] Done resetting lingering progress entries.')
  } catch (err) {
    logger.error('[DB] initialize', err)
  }
}

// ****************** //
// Database Functions //
// ****************** //
async function getAvailableMovieMetaData () {
  const movieMetaData = await db.metaData.findAsync({ type: 'availableMovieMetaData' })
  return movieMetaData?.[0]?.data || {}
}
async function getMovieMetaDataByID (movieID) {
  const movieMetaData = await db.metaData.findAsync({ type: 'availableMovieMetaData' })
  return movieMetaData?.[0]?.data?.[movieID] || null
}

function updateAvailableMovieMetaData (availableMovieMetaDataObject) {
  if (Object.keys(availableMovieMetaDataObject)?.length > 0) {
    db.metaData.updateAsync({
      type: 'availableMovieMetaData'
    }, {
      $set: {
        type: 'availableMovieMetaData',
        data: availableMovieMetaDataObject
      }
    }, {
      upsert: true
    })
    events.emit('availableMovieMetaDataUpdate')
    logger.debug('[DB] DONE: updateAvailableMovieMetaData')
  } else {
    logger.info('[DB] updateAvailableMovieMetaData: No or empty object provided on update!')
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
async function getScheduleData (movieID) {
  const options = movieID ? { id: movieID } : {}
  let scheduleData = await db.schedule.findAsync(options)

  scheduleData = _.sortBy(scheduleData, [function (entry) {
    return entry.scheduleDates[entry.failCount] || entry.scheduleDates[entry.scheduleDates.length - 1]
  }])
  return scheduleData.map(x => {
    delete x._id
    return x
  })
}

async function addScheduleEntry (movie) {
  if (movie && movie.id) {
    db.schedule.updateAsync({
      id: movie.id
    }, {
      $set: {
        ...movie,
        date: new Date()
      }
    }, {
      upsert: true
    })
    events.emit('scheduleUpdate')
    logger.debug(`[DB] SCHEDULE UPDATE DONE: "${movie.id}"`)
  } else {
    logger.info('[DB] SCHEDULE UPDATE: No valid entry provided.')
  }
}

async function setScheduleEntryInProgress (movie, status = false, failCount) {
  if (movie && movie.id) {
    const updateObject = { inProgress: status }
    if (failCount) updateObject.failCount = failCount
    if (failCount > movie.scheduleDates.length - 1) updateObject.failed = true

    db.schedule.updateAsync({
      id: movie.id
    }, {
      $set: updateObject
    }, {
      upsert: false
    })
    events.emit('scheduleUpdate')
    logger.debug(`[DB] SCHEDULE UPDATE DONE: "${movie.id}" in progress "${status}"`)
  } else {
    logger.info('[DB] SCHEDULE UPDATE: No valid entry provided.', movie, status, failCount)
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

async function deleteScheduleEntry (movieID) {
  db.schedule.remove({ id: movieID }, {}, err => {
    if (err) {
      logger.error(err)
      events.emit('scheduleUpdate', { error: 'Error while deleting schedule entry.', movieID })
    } else {
      events.emit('scheduleUpdate')
    }
  })
}

async function setFinishedMovieState (movie) {
  db.doneAndIgnore.updateAsync({
    id: movie.id,
    type: 'done'
  }, {
    $set: {
      id: movie.id,
      title: movie.title,
      channel: movie.channel,
      type: 'done',
      date: new Date()
    }
  }, {
    upsert: true
  })
  events.emit('doneListUpdate')
}

async function getFinishedMovies () {
  const finishedMovies = await db.doneAndIgnore.findAsync({ type: 'done' })
  return _.orderBy(
    finishedMovies.map(movie => {
      delete movie._id
      return movie
    }),
    ['date']
  )
}

async function deleteFinishedEntry (movieID) {
  db.doneAndIgnore.remove({ id: movieID, type: 'done' }, {}, err => {
    if (err) {
      logger.error(err)
      events.emit('doneListUpdate', { error: 'Error while deleting done entry.', movieID })
    } else {
      events.emit('doneListUpdate')
    }
  })
}

async function getIgnoreList () {
  try {
    const ignoreList = await db.doneAndIgnore.findAsync({ type: 'ignore' })
    return _.orderBy(
      ignoreList.map(movie => {
        delete movie._id
        return movie
      }),
      ['date']
    )
  } catch (err) {
    logger.error(err)
    return []
  }
}

async function addMovieToIgnoreList (movie) {
  try {
    await db.doneAndIgnore.updateAsync({
      id: movie.id,
      type: 'ignore'
    }, {
      $set: {
        id: movie.id,
        title: movie.title,
        channel: movie.channel,
        type: 'ignore',
        date: new Date()
      }
    }, {
      upsert: true
    })
    events.emit('ignoreListUpdate')
  } catch (err) {
    events.emit('ignoreListUpdate', {
      errorMsg: `Fehler beim löschen der Film ID "${movie.id}" von der Ignore List. "${err.message}"`
    })
  }
}

async function deleteMovieFromIgnoreList (movieID) {
  try {
    await db.doneAndIgnore.removeAsync({ id: movieID, type: 'ignore' }, {})
    events.emit('ignoreListUpdate')
  } catch (err) {
    events.emit('ignoreListUpdate', {
      errorMsg: `Fehler beim hinzufügen der Film ID "${movieID}" zur Ignore List. "${err.message}"`
    })
  }
}

// //////////////////////////////// //
// CACHE FUNCTIONS (IN MEMORY ONLY) //
// //////////////////////////////// //
function getDownloadsProgress () {
  return db.cache.downloadsInProgress
}
function updateDownloadProgressEntry (progress) {
  db.cache.downloadsInProgress[progress.id] = progress
}
function deleteDownloadProgressCacheEntry (movieID) {
  if (db.cache.downloadsInProgress[movieID]) delete db.cache.downloadsInProgress[movieID]
}

// /////////////// //
// CACHE FUNCTIONS //
// /////////////// //

// IMDB Movies & Suggestions
/**
 * Get movie object for provided imdbid
 * @param {String} imdbid as string
 * @returns {Object | null} Movie object or null
 */
async function getImdbMovieByID (imdbid) {
  try {
    const doc = await db.imdbMovies.findOneAsync({ imdbid })
    if (doc?.imdbid) logger.debug('[DB] IMDB CACHE HIT:', imdbid)
    return doc || null
  } catch (err) {
    logger.error(err)
    return null
  }
}
/**
 * Save provided imdb movie object
 * @param {Object} document imdb movie object
 */
async function saveImdbMovie (document) {
  try {
    await db.imdbMovies.updateAsync({
      imdbid: document.imdbid
    }, {
      ...document,
      date: new Date()
    }, {
      upsert: true
    })
  } catch (err) {
    logger.error('[DB] IMDB CACHE ERROR', err)
  }
}
/**
 * Get suggestion imdbid array for provided title
 * @param {String} encodedUriTitle Movie title encoded with encodeURIComponent()
 * @returns {String[]} Array of imdbid
 */
async function getImdbSuggestionsForTitle (encodedUriTitle) {
  try {
    const doc = await db.imdbSuggestions.findOneAsync({ encodedUriTitle })
    if (doc?.suggestions) logger.debug('[DB] IMDB CACHE HIT:', encodedUriTitle)
    return doc?.suggestions || null
  } catch (err) {
    logger.error(err)
    return null
  }
}
/**
 * Save suggestion object for title
 * @param {Object} document suggestion object for title encoded with encodeURIComponent()
 */
async function saveImdbSuggestions (document) {
  try {
    await db.imdbSuggestions.updateAsync({
      encodedUriTitle: document.encodedUriTitle
    }, {
      $set: {
        ...document,
        date: new Date()
      }
    }, {
      upsert: true
    })
  } catch (err) {
    logger.error('[DB] TMDB CACHE ERROR', err)
  }
}

// TMDB Movies & Suggestions
/**
 * Get movie object for provided imdbid
 * @param {String} tmdbid as string
 * @returns {Object | null} Movie object or null
 */
async function getTmdbMovieByID (tmdbid) {
  try {
    const doc = await db.tmdbMovies.findOneAsync({ tmdbid })
    if (doc?.tmdbid) logger.debug('[DB] TMDB CACHE HIT:', tmdbid)
    return doc || null
  } catch (err) {
    logger.error(err)
    return null
  }
}
/**
 * Save provided tmdb movie object
 * @param {Object} document tmdb movie object
 */
async function saveTmdbMovie (document) {
  try {
    await db.tmdbMovies.updateAsync({
      tmdbid: document.tmdbid
    }, {
      ...document,
      date: new Date()
    }, {
      upsert: true
    })
  } catch (err) {
    logger.error('[DB] TMDB CACHE ERROR', err)
  }
}
/**
 * Get suggestion tmdbid array for provided title
 * @param {String} encodedUriTitle Movie title encoded with encodeURIComponent()
 * @returns {String[]} Array of tmdbid
 */
async function getTmdbSuggestionsForTitle (encodedUriTitle) {
  try {
    const doc = await db.tmdbSuggestions.findOneAsync({ encodedUriTitle })
    if (doc?.suggestions) logger.debug('[DB] TMDB CACHE HIT:', encodedUriTitle)
    return doc?.suggestions || null
  } catch (err) {
    logger.error(err)
    return null
  }
}
/**
 * Save suggestion object for title
 * @param {Object} document suggestion object for title encoded with encodeURIComponent()
 */
async function saveTmdbSuggestions (document) {
  try {
    await db.tmdbSuggestions.updateAsync({
      encodedUriTitle: document.encodedUriTitle
    }, {
      $set: {
        ...document,
        date: new Date()
      }
    }, {
      upsert: true
    })
  } catch (err) {
    logger.error('[DB] TMDB CACHE ERROR', err)
  }
}

async function getPlatformMatchingInfoFromDB (tmdbOrImdbID) {
  try {
    if (['number', 'string'].indexOf(typeof tmdbOrImdbID) > -1) tmdbOrImdbID = `${tmdbOrImdbID}`
    else throw new Error('[DB] Platform Match tmdbOrImdbID is no string!')

    const searchObject = (tmdbOrImdbID.indexOf('tt') === 0)
      ? { imdbid: tmdbOrImdbID }
      : { tmdbid: tmdbOrImdbID }
    const doc = await db.platformMatchingInfo.findOneAsync(searchObject)
    if (doc?.imdbid) logger.debug('[DB] Platform Match CACHE HIT:', tmdbOrImdbID)
    return doc || null
  } catch (err) {
    logger.error(err)
    return null
  }
}
async function savePlatformMatchingInfoToDB (document) {
  try {
    await db.platformMatchingInfo.updateAsync({
      tmdbid: document.tmdbid,
      imdbid: document.imdbid
    }, {
      $set: {
        ...document,
        date: new Date()
      }
    }, {
      upsert: true
    })
  } catch (err) {
    logger.error('[DB] Platform Match CACHE ERROR', err)
  }
}

async function getOmdbInfoFromDB (searchString) {
  try {
    const searchObject = (searchString.indexOf('tt') === 0)
      ? { imdbID: searchString }
      : { query: encodeURIComponent(searchString) }
    const doc = await db.omdb.findOneAsync(searchObject)
    if (doc?.imdbID) logger.debug('[DB] OMDB CACHE HIT:', encodeURIComponent(searchString))
    return doc || null
  } catch (err) {
    logger.error(err)
    return null
  }
}

async function saveOmdbInfoToDB (document) {
  try {
    await db.omdb.updateAsync({
      imdbID: document.imdbID
    }, {
      $set: {
        ...document,
        date: new Date()
      }
    }, {
      upsert: true
    })
  } catch (err) {
    logger.error('[DB] OMDB CACHE ERROR', err)
  }
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

    downloadResolutionLimit: 'none',
    preferedDownloadLanguage: 'de',
    includeAudioTranscription: true,
    includeClearLanguage: true,
    includeSubtitles: true,
    convertSubtitles: false,

    movieSortOrder: 'date',

    fileAndFolderNaming: 'jellyfin',

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
  getMovieMetaDataByID,
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

  getImdbMovieByID,
  saveImdbMovie,
  getImdbSuggestionsForTitle,
  saveImdbSuggestions,

  getTmdbMovieByID,
  saveTmdbMovie,
  getTmdbSuggestionsForTitle,
  saveTmdbSuggestions,

  getPlatformMatchingInfoFromDB,
  savePlatformMatchingInfoToDB,

  getOmdbInfoFromDB,
  saveOmdbInfoToDB,

  // SETTINGS
  getAllSettings,
  updateSettings
}
