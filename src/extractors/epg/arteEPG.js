const _ = require('lodash')
const logger = require('../../logger.js')
const { default: axios } = require('axios')
const { addDays, formatDate } = require('date-fns')
const { JSDOM } = require('jsdom')
const {
  sleep,
  getRandomUserAgent,
  getCleanThumbnailUrl,
  getRandomInteger
} = require('../../helperFunctions.js')
const {
  getEpgCacheData,
  updateEpgCacheData
} = require('../../database.js')

async function getUpcomingMoviesFromEpg () {
  try {
    const epgCache = await getEpgCacheData('arte')

    const baseEpgUrl = 'https://www.arte.tv/api/rproxy/emac/v4/de/web/pages/TV_GUIDE/?day='
    const today = new Date()
    const epgDays = 14
    for (let i = 0; i <= epgDays; i++) {
      const epgDayString = formatDate(addDays(today, i), 'yyyy-MM-dd')
      if (!epgCache[epgDayString]) {
        logger.debug(`[API ARTE] EPG "${epgDayString}"`)
        const { data: epgJSON } = await axios.get(`${baseEpgUrl}${epgDayString}`, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            Accept: 'application/json'
          }
        })
        logger.debug(`[API ARTE] EPG DONE "${epgDayString}"`)

        const epgMovieData = getMoviesFromEpgJSON(epgJSON)

        // add epg data to cache to avoid redownloading the same data
        epgCache[epgDayString] = epgMovieData

        await sleep(getRandomInteger(875, 2500))
      }
    }

    const cacheInvalidationDate = addDays(today, -1)
    const cachedDays = Object.keys(epgCache)
    logger.debug('[EPG CHACHE ARTE] Cached days:', cachedDays)
    for (let i = 0; i < cachedDays.length; i++) {
      if (new Date(cachedDays[i]) <= cacheInvalidationDate) {
        delete epgCache[cachedDays[i]]
        logger.debug(`[EPG CACHE ARTE] REMOVED "${cachedDays[i]}"`)
      }
    }

    updateEpgCacheData(epgCache, 'arte')

    const rawMovieData = _.flatten(Object.values(epgCache))

    const upcomingMovieApiIDs = await getUpcomingMovieApiIDs()
    const epgMovies = rawMovieData.filter(movie => upcomingMovieApiIDs.indexOf(movie.apiID) > -1)

    return epgMovies
  } catch (err) {
    logger.error(err)
    return null
  }
}

function getMoviesFromEpgJSON (epgJSON) {
  if (epgJSON.tag !== 'Ok') return []

  const epgMovies = []
  const zoneData = [
    ...epgJSON.value.zones[0].content.data,
    ...epgJSON.value.zones[1].content.data
  ].filter(entry => entry?.genre?.label === 'Filme')

  for (let i = 0; i < zoneData.length; i++) {
    epgMovies.push(normalizeEpgMovieData(zoneData[i]))
  }
  logger.debug(_.compact(epgMovies).length)
  return _.compact(epgMovies)
}

function normalizeEpgMovieData (movieData) {
  try {
    const movieObject = {
      title: movieData.title,
      url: `https://arte.tv${movieData.url}`,
      img: getCleanThumbnailUrl(movieData.mainImage.url) || '',
      description: movieData.teaserText,
      time: {},
      duration: `${Math.ceil(movieData.duration / 60)} min`,
      apiID: movieData.programId
    }

    if (movieData.availability) {
      const now = new Date()
      const start = new Date(movieData.availability.start)
      const end = new Date(movieData.availability.end)

      if (now > start) {
        movieObject.time = {
          date: end,
          type: 'untill'
        }
        movieObject.preText = `Video verfügbar bis ${formatDate(end, 'dd.MM.yyyy HH:mm')}`
      } else {
        movieObject.time = {
          date: start,
          type: 'from'
        }
        movieObject.preText = `Video verfügbar ab ${formatDate(start, 'dd.MM.yyyy HH:mm')}`
      }
    }

    if (movieData && movieData.audioVersions && movieData.audioVersions.length > 0) {
      movieObject.audioLangs = movieData.audioVersions
        .map(lang => lang.code.toUpperCase())
        .filter(lang => lang !== 'UND')
        .sort()
    }

    const restrictions = []
    if (movieData.ageRating > 0) restrictions.push('FSK' + movieData.ageRating)
    if (restrictions.length > 0) movieObject.restrictions = restrictions

    return movieObject
  } catch (err) {
    logger.error(err)
    return null
  }
}

async function getUpcomingMovieApiIDs () {
  try {
    const { data: websiteHtml } = await axios.get('https://www.arte.tv/de/p/demnaechst/')
    const websiteAsElement = new JSDOM(websiteHtml).window.document
    const scripts = websiteAsElement.querySelectorAll('script')

    let scriptContentString = ''
    for (let i = 0; i < scripts.length; i++) {
      if (
        scripts[i].innerHTML.indexOf('nächsten Tagen') > -1 ||
        scripts[i].innerHTML.indexOf('Nur noch ein bisschen Geduld') > -1
      ) {
        scriptContentString += scripts[i].innerHTML
      }
    }

    const movieUrls = scriptContentString.match(/\/({fr|de|en|es|it|pl})\/videos\/(\d{6}-\d{3}-[AF])\/[a-zA-Z-]+\//g) || []

    return _.compact(
      movieUrls.map(movie => movie.match(/\/({fr|de|en|es|it|pl})\/videos\/(\d{6}-\d{3}-[AF])/)?.[2])
    )
  } catch (err) {
    logger.error(err)
    return []
  }
}

module.exports = {
  getUpcomingMoviesFromEpg
}
