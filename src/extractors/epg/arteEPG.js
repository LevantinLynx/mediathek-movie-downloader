const _ = require('lodash')
const logger = require('../../logger.js')
const { addDays, formatDate } = require('date-fns')
const { parseHTML } = require('linkedom')
const {
  sleep,
  getRandomUserAgent,
  getCleanThumbnailUrl,
  getRandomInteger,
  axiosWithTimeouts: axios
} = require('../../helperFunctions.js')
const {
  getEpgCacheData,
  updateEpgCacheData
} = require('../../database.js')
const nextParser = require('../nextParser.js')

async function getUpcomingMoviesFromEpg () {
  try {
    const epgCache = await getEpgCacheData('arte')

    const baseEpgUrl = 'https://api.arte.tv/api/emac/v4/de/web/pages/TV_GUIDE/?day='
    const today = new Date()
    const epgDays = 14
    for (let i = 0; i <= epgDays; i++) {
      const epgDayString = formatDate(addDays(today, i), 'yyyy-MM-dd')
      if (!epgCache[epgDayString]) {
        logger.debug(`[API ARTE] EPG REQUEST FOR DAY "${epgDayString}"`)
        const { data: epgJSON } = await axios.get(`${baseEpgUrl}${epgDayString}`, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            Accept: 'application/json'
          }
        })
        logger.debug(`[API ARTE] EPG REQUEST FOR DAY DONE "${epgDayString}"`)

        const epgMovieData = await getMoviesFromEpgJSON(epgJSON)

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
    if (err.message === 'canceled') logger.error('[EPG CACHE ARTE] REQUEST TIMEOUT!')
    else logger.error(err)
    return null
  }
}

async function getMoviesFromEpgJSON (epgJSON) {
  if (epgJSON.code !== 'TV_GUIDE' || epgJSON.zones?.length < 1) return []

  let epgMovies = []
  let zoneData = []
  const zones = epgJSON.zones
  for (let i = 0; i < zones.length; i++) {
    zoneData = [...zoneData, ...(zones[i]?.content?.data || [])]
  }
  zoneData = zoneData.filter(entry => entry?.genre?.label === 'Filme')

  for (let i = 0; i < zoneData.length; i++) {
    epgMovies.push(await normalizeEpgMovieData(zoneData[i]))
  }

  epgMovies = _.compact(epgMovies)
  logger.debug('[API ARTE] EPG (epgMovies)', epgMovies.length)
  return epgMovies
}

async function normalizeEpgMovieData (movieData) {
  try {
    const additionalMovieInfo = await nextParser.getAdditionalMovieInfo(movieData.url, movieData.programId)
    const movieObject = {
      title: movieData.title,
      url: movieData.url,
      img: getCleanThumbnailUrl(movieData.mainImage.url) || '',
      description: movieData.teaserText,
      time: {},
      duration: `${Math.ceil(movieData.duration / 60)} min`,
      apiID: movieData.programId,
      channel: 'arte'
    }

    if (additionalMovieInfo.actors) movieObject.actorDetails = additionalMovieInfo.actors.slice(0, 6)
    if (additionalMovieInfo.crew) movieObject.crewDetails = additionalMovieInfo.crew.slice(0, 6)
    if (additionalMovieInfo.year) movieObject.year = additionalMovieInfo.year
    if (additionalMovieInfo.genre) movieObject.genre = additionalMovieInfo.genre
    if (additionalMovieInfo.country) movieObject.country = additionalMovieInfo.country

    if (movieData.availability) {
      const now = new Date()
      const start = new Date(movieData.availability.start)
      const end = new Date(movieData.availability.end)

      if (now > start) {
        movieObject.time = {
          date: end,
          type: 'untill'
        }
        movieObject.preText = `bis ${formatDate(end, 'dd.MM.yyyy HH:mm')}`
      } else {
        movieObject.time = {
          date: start,
          type: 'from'
        }
        movieObject.preText = `ab ${formatDate(start, 'dd.MM.yyyy HH:mm')}`
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
    logger.debug('[ARTE EPG] Getting upcoming movies from DOM.')
    const { data: websiteHtml } = await axios.get('https://www.arte.tv/de/p/demnaechst/')
    const { document: websiteAsElement } = parseHTML(websiteHtml)
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
    const movieIDs = _.compact(
      movieUrls.map(movie => movie.match(/\/({fr|de|en|es|it|pl})\/videos\/(\d{6}-\d{3}-[AF])/)?.[2])
    )
    logger.debug('[ARTE EPG] Movie IDs:', movieIDs)
    logger.debug(`[ARTE EPG] Found "${movieIDs.length}" movie IDs.`)
    logger.debug('[ARTE EPG] DONE! Getting upcoming movies from DOM.')
    return movieIDs
  } catch (err) {
    logger.error(err)
    return []
  }
}

module.exports = {
  getUpcomingMoviesFromEpg
}
