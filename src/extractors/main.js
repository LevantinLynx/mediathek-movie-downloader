const logger = require('../logger.js')
const zdfExtractor = require('./zdf.js')
const ardExtractor = require('./ard.js')
const arteExtractor = require('./arte.js')
const dreisatExtractor = require('./dreisat.js')
const { getAllSettings } = require('../database.js')
const {
  sendNotificationToClients
} = require('../helperFunctions.js')
const { getImdbSuggestionsForTitle } = require('../matcher/imdb.js')
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')

const cacheDir = path.join(__dirname, '..', '..', 'cache')
fs.ensureDirSync(cacheDir)

let isExtractionRunning = false
let cache = {}
async function getAvailableMovieMetaDataFromApis () {
  if (isExtractionRunning) throw new Error('[META DATA] getAvailableMovieMetaDataFromApis is already running!')
  isExtractionRunning = true

  const startTimestamp = Date.now()
  try {
    const settings = await getAllSettings()
    const activeChannels = settings.channelSelection
      .filter(channel => channel.active)
      .map(channel => channel.name.toLowerCase().replace(' ', '_'))
    logger.debug('activeChannels', activeChannels)
    cache = {}

    // Get all cached files and generate hash list from names
    const cachedImageFiles = fs.readdirSync(cacheDir)
    const cachedImageFileHashList = {}
    for (let i = 0; i < cachedImageFiles.length; i++) {
      cachedImageFileHashList[cachedImageFiles[i].split('.')[0]] = cachedImageFiles[i]
    }

    await getExtractorMovies(zdfExtractor, activeChannels, cachedImageFileHashList)
    await getExtractorMovies(dreisatExtractor, activeChannels, cachedImageFileHashList)
    await getExtractorMovies(ardExtractor, activeChannels, cachedImageFileHashList)
    await getExtractorMovies(arteExtractor, activeChannels, cachedImageFileHashList)

    const doneTimestamp = Date.now()

    logger.debug(`[META DATA] Data retrieval took ${doneTimestamp - startTimestamp} ms and found ${Object.keys(cache).length} movies.`)
    logger.debug(`[META DATA] Channels: ${_.uniq(Object.values(cache).map(movie => movie.channel)).sort()}`)

    isExtractionRunning = false
    return _.omitBy(cache, _.isNil)
  } catch (err) {
    isExtractionRunning = false
    throw err
  }
}

function generateIdFromApiID (apiID) {
  return new Bun
    .CryptoHasher('sha1')
    .update(apiID)
    .digest('hex')
    .substring(0, 10)
}

/**
 * If channel is marked active in settings,
 * retrieve movies from api and add them to cache object
 * @param {Object} channelExtractor object for channel extractor import
 * @param {String[]} activeChannels List of active channels
 * @param {Object} cachedImageFileHashList List of img files on disk
 */
async function getExtractorMovies (channelExtractor, activeChannels, cachedImageFileHashList) {
  const activeAndValidChannels = _.intersection(channelExtractor.validChannelList, activeChannels)
  if (activeAndValidChannels.length > 0) {
    let channelApiData = await channelExtractor.scrapeMovieData(cachedImageFileHashList)
    channelApiData = channelApiData.filter(movie => activeAndValidChannels.indexOf(movie.channel) > -1)
    for (let i = 0; i < channelApiData.length; i++) {
      const movie = channelApiData[i]
      const hash = generateIdFromApiID(movie.apiID)
      cache[hash] = {
        ...channelApiData[i],
        id: hash
      }
      delete cache[hash].apiID

      await addImdbSuggestionToMovie(hash)
    }
    if (process.env.NODE_ENV !== 'production') {
      sendNotificationToClients({
        result: 'success',
        msg: `${channelApiData.length} Filme für "${channelExtractor.channel}" angerufen.`,
        time: 5000
      })
    }
  } else {
    logger.debug('[META DATA] Skipping extractor. No channels marked for retrieval.')
  }
}

async function addImdbSuggestionToMovie (hash) {
  try {
    const movie = cache[hash]
    const suggestions = await getImdbSuggestionsForTitle(movie.title)

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i]
      let match = (
        // Title matching
        suggestion.title.indexOf(movie.title) > -1 ||
        movie.title.indexOf(suggestion.title) > -1
      )
      if (!match) {
        // Match by year
        if (
          suggestion.year && (
            movie.description.indexOf(suggestion.year) > -1 ||
            movie.imgAlt?.indexOf(suggestion.year) > -1
          )
        ) match = true
        // Matching by actor names
        if (
          suggestion.info &&
          suggestion.info
            .split(', ')
            .map(actor => (
              movie.description.indexOf(actor) > -1 ||
              movie.imgAlt?.indexOf(actor) > -1
            ))
            .filter(value => value === true)
            .length > 0
        ) match = true
      }
      if (match) {
        cache[hash].imdb = {
          match: suggestion,
          suggestions
        }
        break
      }
    }

    if (!cache[hash].imdb) {
      cache[hash].imdb = {
        match: null,
        suggestions
      }
    }
  } catch (err) {
    logger.error(err)
    if (!cache[hash].imdb) {
      cache[hash].imdb = {
        match: null,
        suggestions: []
      }
    }
  }
}

module.exports = {
  getAvailableMovieMetaDataFromApis
}
