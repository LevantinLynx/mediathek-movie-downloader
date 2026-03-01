const logger = require('../logger.js')
const zdfExtractor = require('./zdf.js')
const ardExtractor = require('./ard.js')
const arteExtractor = require('./arte.js')
const dreisatExtractor = require('./dreisat.js')
const { getAllSettings } = require('../database.js')
const {
  sendNotificationToClients
} = require('../helperFunctions.js')
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

    // Remove unused images from cache
    const currentImageLinks = Object.values(cache).map(movie => movie.img.split('/').pop())
    logger.debug('[META DATA] CACHE: Cached image count:', currentImageLinks.length)

    if (process.env.NODE_ENV === 'production') {
      const cachedImageFileNames = Object.values(cachedImageFileHashList)
      for (let i = 0; i < cachedImageFileNames.length; i++) {
        if (currentImageLinks.indexOf(cachedImageFileNames[i]) === -1) {
          logger.info(`Removing file from cache: ${cachedImageFileNames[i]}`)
          await Bun.file(path.join(cacheDir, cachedImageFileNames[i])).delete()
        }
      }
    }

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

module.exports = {
  getAvailableMovieMetaDataFromApis
}
