const logger = require('../logger.js')
const zdfExtractor = require('./zdf.js')
const dreisatExtractor = require('./dreisat.js')
const arteExtractor = require('./arte.js')

async function getAvailableMovieMetaDataFromApis () {
  try {
    const cache = {}

    const zdfApiData = await zdfExtractor.scrapeMovieData()
    const zdfApiDataChannels = Object.keys(zdfApiData)
    for (let i = 0; i < zdfApiDataChannels.length; i++) {
      if (zdfApiData[zdfApiDataChannels[i]]) {
        cache[zdfApiDataChannels[i]] = {
          channel: zdfApiDataChannels[i],
          updated: new Date(),
          movies: zdfApiData[zdfApiDataChannels[i]]
        }
      }
    }

    const sat3Data = await dreisatExtractor.scrapeMovieData()
    if (sat3Data?.length > 0) {
      cache['3sat'] = {
        channel: '3sat',
        updated: new Date(),
        movies: sat3Data
      }
    }

    const arteData = await arteExtractor.scrapeMovieData()
    if (arteData) {
      cache.arte = {
        channel: 'arte',
        updated: new Date(),
        movies: arteData
      }
    }

    return Object.values(cache)
  } catch (err) {
    logger.error(err)
  }
}

module.exports = {
  getAvailableMovieMetaDataFromApis
}
