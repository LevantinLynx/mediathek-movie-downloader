const logger = require('../logger.js')
const zdfExtractor = require('./zdf.js')
const dreisatExtractor = require('./dreisat.js')
const arteExtractor = require('./arte.js')

async function getAvailableMovieMetaDataFromApis () {
  try {
    const cache = {}

    const zdfApiData = await zdfExtractor.scrapeMovieData()
    logger.debug(zdfApiData)
    if (zdfApiData?.zdf) {
      cache.zdf = {
        channel: 'zdf',
        updated: new Date(),
        movies: zdfApiData.zdf
      }
    }
    if (zdfApiData?.zdfneo) {
      cache.zdfneo = {
        channel: 'zdfneo',
        updated: new Date(),
        movies: zdfApiData.zdfneo
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

    const updateArray = []
    if (cache.zdf) updateArray.push(cache.zdf)
    if (cache.zdfneo) updateArray.push(cache.zdfneo)
    if (cache['3sat']) updateArray.push(cache['3sat'])
    if (cache.ard) updateArray.push(cache.ard)
    if (cache.arte) updateArray.push(cache.arte)

    return updateArray
  } catch (err) {
    logger.error(err)
  }
}

module.exports = {
  getAvailableMovieMetaDataFromApis
}
