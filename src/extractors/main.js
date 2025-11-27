const logger = require('../logger.js')
const zdfExtractor = require('./zdf.js')
const ardExtractor = require('./ard.js')
const dreisatExtractor = require('./dreisat.js')
const arteExtractor = require('./arte.js')
const { getAllSettings } = require('../database.js')
const path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')

const cacheDir = path.join(__dirname, '..', '..', 'cache')
fs.ensureDirSync(cacheDir)

async function getAvailableMovieMetaDataFromApis () {
  try {
    const settings = await getAllSettings()
    const activeChannels = settings.channelSelection
      .filter(channel => channel.active)
      .map(channel => channel.name.toLowerCase().replace(' ', '_'))
    logger.debug('activeChannels', activeChannels)
    const cache = {}

    // Get all cached files and generate hash list from names
    const cachedImageFiles = fs.readdirSync(cacheDir)
    const cachedImageFileHashList = {}
    for (let i = 0; i < cachedImageFiles.length; i++) {
      cachedImageFileHashList[cachedImageFiles[i].split('.')[0]] = cachedImageFiles[i]
    }

    if (
      activeChannels.indexOf('zdf') > -1 ||
      activeChannels.indexOf('zdfneo') > -1 ||
      activeChannels.indexOf('zdftivi') > -1 ||
      activeChannels.indexOf('phoenix') > -1 ||
      activeChannels.indexOf('funk') > -1 ||
      activeChannels.indexOf('kika') > -1
    ) {
      const zdfApiData = await zdfExtractor.scrapeMovieData(cachedImageFileHashList)
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
      const sat3Data = await dreisatExtractor.scrapeMovieData(cachedImageFileHashList)
      if (sat3Data?.length > 0) {
        cache['3sat'] = {
          channel: '3sat',
          updated: new Date(),
          movies: sat3Data
        }
      }
    }

    if (activeChannels.indexOf('arte') > -1) {
      const arteData = await arteExtractor.scrapeMovieData(cachedImageFileHashList)
      if (arteData) {
        cache.arte = {
          channel: 'arte',
          updated: new Date(),
          movies: arteData
        }
      }
    }

    if (
      activeChannels.indexOf('ard') > -1 ||
      activeChannels.indexOf('ard_alpha') > -1 ||
      activeChannels.indexOf('das_erste') > -1 ||
      activeChannels.indexOf('br') > -1 ||
      activeChannels.indexOf('hr') > -1 ||
      activeChannels.indexOf('mdr') > -1 ||
      activeChannels.indexOf('ndr') > -1 ||
      activeChannels.indexOf('rbb') > -1 ||
      activeChannels.indexOf('sr') > -1 ||
      activeChannels.indexOf('swr') > -1 ||
      activeChannels.indexOf('wdr') > -1 ||
      activeChannels.indexOf('one') > -1
    ) {
      const ardApiData = await ardExtractor.scrapeMovieData(cachedImageFileHashList)
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
    }

    const cacheValuesObject = Object.values(cache)

    // Remove unused images from cache
    const currentImageLinks = _.flatten(cacheValuesObject.map(channel => channel.movies.map(movie => movie.img)))
    logger.debug('currentImageLinks', currentImageLinks)
    const cachedImageFileNames = Object.values(cachedImageFileHashList)
    for (let i = 0; i < cachedImageFileNames.length; i++) {
      if (currentImageLinks.indexOf(`cache/${cachedImageFileNames[i]}`) === -1) {
        logger.info(`Removing file from cache: ${cachedImageFileNames[i]}`)
        await Bun.file(path.join(cacheDir, cachedImageFileNames[i])).delete()
      }
    }

    return cacheValuesObject
  } catch (err) {
    logger.error(err)
  }
}

module.exports = {
  getAvailableMovieMetaDataFromApis
}
