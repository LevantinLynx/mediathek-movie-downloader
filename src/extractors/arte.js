const _ = require('lodash')
const logger = require('../logger.js')
const { default: axios } = require('axios')
const { formatDate } = require('date-fns')
const {
  sleep,
  getRandomInteger,
  getRandomUserAgent,
  getCleanThumbnailUrl
} = require('../helperFunctions.js')
const { getUpcomingMoviesFromEpg } = require('./epg/arteEPG.js')

const extractor = {
  scrapeMovieData: scrapeArteCinemaMovieData,
  validUrlRegex: [
    /https?:\/\/(?:www\.)?arte\.tv\/({fr|de|en|es|it|pl})\/videos\/(\d{6}-\d{3}-[AF])/
  ],
  channel: 'arte'
}

async function scrapeArteCinemaMovieData () {
  try {
    let movieList = []
    const apiData = await getAllDataFromPaginatedApi()
    const uniqData = _.uniq(apiData.map(movie => movie.programId))
    const chunked = _.chunk(uniqData, 5)

    let movieApiData = []
    for (let i = 0; i < chunked.length; i++) {
      const requestResponses = await Promise.all(chunked[i].map(id => getMovieApiDataByID(id)))
      movieApiData.push(requestResponses)
      await sleep(getRandomInteger(1250, 2875))
    }

    movieApiData = _.flatten(movieApiData)

    for (let i = 0; i < movieApiData.length; i++) {
      if (!movieApiData[i]?.data?.attributes) continue
      const { metadata, rights, streams, warnings } = movieApiData[i].data.attributes
      const movieObject = {
        title: metadata.title,
        url: metadata.link.url,
        img: getCleanThumbnailUrl(metadata.images[0].url),
        description: metadata.description,
        time: {},
        duration: `${Math.ceil(metadata.duration.seconds / 60)} min`,
        apiID: metadata.providerId
      }

      if (rights?.begin) {
        const now = new Date()
        const start = new Date(rights.begin)
        const end = new Date(rights.end)

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

      if (streams.length > 0) {
        movieObject.audioLangs = getAudioLanguages(streams)
        movieObject.subLangs = getSubtitleLanguages(streams)
      }

      if (warnings.length > 0) {
        const restrictions = []
        for (let j = 0; j < warnings.length; j++) {
          const warning = warnings[j]
          if (warning.code.indexOf('WARNING_AGE_RESTRICTION') > -1) {
            restrictions.push('FSK' + warning.code.split('_').pop())
          }
        }
        if (restrictions.length > 0) movieObject.restrictions = restrictions
      }

      movieList.push(movieObject)
    }

    const epgData = await getUpcomingMoviesFromEpg()

    movieList = _.uniqBy(
      _.flatten([movieList, epgData]),
      'apiID'
    )

    return _.orderBy(movieList, ['time.type', 'time.date'], ['desc', 'asc'])
  } catch (err) {
    logger.error('Error while loading movie json data via axios …')
    logger.error(err)
  }
}

async function getAllDataFromPaginatedApi () {
  // API version of this page "https://www.arte.tv/de/videos/kino/filme/"
  let currentApiUrl = 'https://www.arte.tv/api/rproxy/emac/v4/de/web/zones/a114e45f-eb3f-4868-b4d7-dff9fc8df592/content?abv=B&authorizedCountry=DE&page=0&pageId=SUBCATEGORY_FLM&zoneIndexInPage=0'
  let rawData = []

  try {
    let done = false
    while (!done) {
      logger.debug(`[API ARTE] NEXT "${currentApiUrl}"`)
      const ua = getRandomUserAgent()
      const { data: currentRequestresponse } = await axios.get(currentApiUrl, {
        headers: {
          'User-Agent': ua,
          Accept: 'application/json'
        }
      })

      if (currentRequestresponse?.tag !== 'Ok') {
        logger.info(currentRequestresponse, ua)
        throw new Error(`Api request for "${currentApiUrl}" failed!`)
      }
      if (currentRequestresponse?.value?.data) rawData = [...rawData, ...currentRequestresponse.value.data]

      logger.debug(`[API ARTE] DONE ${currentApiUrl}`)

      if (currentRequestresponse.value.pagination.page === currentRequestresponse.value.pagination.pages) done = true
      else currentApiUrl = `https://www.arte.tv/api/rproxy/emac/v4/de/web/zones/a114e45f-eb3f-4868-b4d7-dff9fc8df592/content?abv=B&authorizedCountry=DE&page=${currentRequestresponse.value.pagination.page + 1}&pageId=SUBCATEGORY_FLM&zoneIndexInPage=0`
    }
  } catch (err) {
    logger.error(err)
  }

  return rawData
}

async function getMovieApiDataByID (ID, lang = 'de') {
  try {
    logger.debug(`[API ARTE] MOVIE "${ID}"`)
    const { data: currentRequestresponse } = await axios.get(`https://api.arte.tv/api/player/v2/config/${lang}/${ID}`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'application/json'
      }
    })

    logger.debug(`[API ARTE] MOVIE DONE ${ID}`)
    return currentRequestresponse
  } catch (err) {
    logger.error(err)
    return {}
  }
}

function getAudioLanguages (streams) {
  if (!streams || streams.length === 0) return []
  return _.uniq(streams[0]?.versions?.map(version => version.audioLanguage))
    .map(lang => lang.toUpperCase())
    .filter(lang => lang !== 'UND')
}

function getSubtitleLanguages (streams) {
  if (!streams || streams.length === 0) return []
  return _.uniq(streams[0]?.versions?.map(version => version.subtitleLanguage))
    .map(lang => lang.toUpperCase())
    .filter(lang => lang !== 'UND')
}

module.exports = extractor
