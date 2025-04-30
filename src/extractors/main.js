const logger = require('../logger.js')
const zdfExtractor = require('./zdf.js')
const ardExtractor = require('./ard.js')
const dreisatExtractor = require('./dreisat.js')
const arteExtractor = require('./arte.js')
const { getAllSettings } = require('../database.js')

async function getAvailableMovieMetaDataFromApis () {
  try {
    const settings = await getAllSettings()
    const activeChannels = settings.channelSelection
      .filter(channel => channel.active)
      .map(channel => channel.name.toLowerCase().replace(' ', '_'))
    logger.debug('activeChannels', activeChannels)
    const cache = {}

    if (
      activeChannels.indexOf('zdf') > -1 ||
      activeChannels.indexOf('zdfneo') > -1
    ) {
      const zdfApiData = await zdfExtractor.scrapeMovieData()
      const zdfApiDataChannels = Object.keys(zdfApiData)
      for (let i = 0; i < zdfApiDataChannels.length; i++) {
        if (
          activeChannels.indexOf(zdfApiDataChannels[i]) > -1 &&
          zdfApiData[zdfApiDataChannels[i]]
        ) {
          cache[zdfApiDataChannels[i]] = {
            channel: zdfApiDataChannels[i],
            updated: new Date(),
            movies: zdfApiData[zdfApiDataChannels[i]]
          }
        }
      }
    }

    if (activeChannels.indexOf('3sat') > -1) {
      const sat3Data = await dreisatExtractor.scrapeMovieData()
      if (sat3Data?.length > 0) {
        cache['3sat'] = {
          channel: '3sat',
          updated: new Date(),
          movies: sat3Data
        }
      }
    }

    if (activeChannels.indexOf('arte') > -1) {
      const arteData = await arteExtractor.scrapeMovieData()
      if (arteData) {
        cache.arte = {
          channel: 'arte',
          updated: new Date(),
          movies: arteData
        }
      }
    }

    const ardApiData = await ardExtractor.scrapeMovieData()
    const ardApiDataChannels = Object.keys(ardApiData)
    for (let i = 0; i < ardApiDataChannels.length; i++) {
      if (
        activeChannels.indexOf(ardApiDataChannels[i]) > -1 &&
        ardApiData[ardApiDataChannels[i]]
      ) {
        cache[ardApiDataChannels[i]] = {
          channel: ardApiDataChannels[i],
          updated: new Date(),
          movies: ardApiData[ardApiDataChannels[i]]
        }
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
