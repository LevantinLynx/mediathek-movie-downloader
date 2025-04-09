const _ = require('lodash')
const logger = require('../logger.js')
const { default: axios } = require('axios')
const { formatDate } = require('date-fns')
const { JSDOM } = require('jsdom')
const {
  getRandomUserAgent
} = require('../helperFunctions.js')

const extractor = {
  scrapeMovieData: scrape3satMovieData,
  validUrlRegex: [
    /https?:\/\/(?:www\.)?3sat\.de\/(?:[^/]+\/)*([^/?#&]+)\.html/
  ],
  channel: '3sat'
}

async function scrape3satMovieData () {
  try {
    const movieUrls = await getAvailabeMovieUrls()
    logger.debug('movieUrls', movieUrls, movieUrls.length)
    if (!movieUrls || movieUrls.length === 0) return []

    const apiConfig = await getApiConfig()
    logger.debug('apiConfig', apiConfig)
    if (!apiConfig || !apiConfig.apiKey || !apiConfig.baseUrl || !apiConfig.suffix) return []

    let movieList = []
    for (let i = 0; i < movieUrls.length; i++) {
      const videoID = extractIdFromUrlIfValid(movieUrls[i])

      if (videoID) {
        const movieApiData = await getMovieDataFromApiFromUrl(`${apiConfig.baseUrl}${videoID}.json`, apiConfig.apiKey)
        const mainVideoContent = movieApiData.mainVideoContent?.['http://zdf.de/rels/target']

        const movieObject = {
          title: movieApiData.title,
          url: movieApiData['http://zdf.de/rels/sharing-url'],
          img: movieApiData.teaserImageRef.layouts['768x432'],
          imgAlt: movieApiData.teaserImageRef.altText,
          description: movieApiData.leadParagraph,
          time: {},
          restrictions: [],
          apiID: videoID
        }

        if (mainVideoContent?.duration) {
          movieObject.duration = `${Math.ceil(mainVideoContent?.duration / 60)} min`
        }

        const now = new Date()
        if (
          mainVideoContent?.visible &&
          mainVideoContent?.visibleTo &&
          new Date(mainVideoContent.visibleTo) > now
        ) {
          const start = mainVideoContent.visibleFrom ? new Date(mainVideoContent.visibleFrom) : null
          const end = mainVideoContent.visibleTo ? new Date(mainVideoContent.visibleTo) : null

          if (end && end < now) {
            const start = new Date(movieApiData.editorialDate)
            movieObject.time = {
              date: start,
              type: 'from'
            }
            movieObject.preText = `Video verfügbar ab ${formatDate(start, 'dd.MM.yyyy HH:mm')}`
          } else if (
            (start && now > start) ||
            (!start && end && now < end)
          ) {
            movieObject.time = {
              date: end,
              type: 'untill'
            }
            movieObject.preText = `Video verfügbar bis ${formatDate(end, 'dd.MM.yyyy HH:mm')}`
          } else if (start) {
            movieObject.time = {
              date: start,
              type: 'from'
            }
            movieObject.preText = `Video verfügbar ab ${formatDate(start, 'dd.MM.yyyy HH:mm')}`
          }
        } else if (movieApiData.editorialDate) {
          const start = new Date(movieApiData.editorialDate)
          movieObject.time = {
            date: start,
            type: 'from'
          }
          movieObject.preText = `Video verfügbar ab ${formatDate(start, 'dd.MM.yyyy HH:mm')}`
        }

        // if (streams.length > 0) {
        //   movieObject.audioLangs = getAudioLanguages(streams)
        //   movieObject.subLangs = getSubtitleLanguages(streams)
        // }

        if (mainVideoContent?.fsk && mainVideoContent?.fsk !== 'none') {
          movieObject.restrictions.push(`${mainVideoContent.fsk}`.toLocaleUpperCase())
        }

        if (movieObject.restrictions.length === 0) delete movieObject.restrictions

        movieList.push(movieObject)
      } else {
        logger.error(`Webseite nicht erkannt / Link wird nicht unterstützt! ${movieUrls[i]}`)
      }
    }

    movieList = _.orderBy(_.compact(movieList), ['time.type', 'time.date'], ['desc', 'asc'])

    logger.debug(movieList)

    logger.info(`Done! 3sat Movies found: ${movieList?.length}`)
    return movieList
  } catch (err) {
    logger.error('Error while loading movie json data via axios …')
    logger.error(err)
  }
}

function getMovieUrls (websiteHtml) {
  const movieUrlList = []
  const websiteAsElement = new JSDOM(websiteHtml).window.document
  const jsonElements = websiteAsElement.querySelectorAll('script[type="application/ld+json"]')

  for (let i = 0; i < jsonElements.length; i++) {
    if (jsonElements[i].textContent.indexOf('ItemList') > -1) {
      const data = JSON.parse(fixJsonText(jsonElements[i].textContent))

      if (data['@type'] === 'ItemList' && data.itemListElement) {
        movieUrlList.push(data.itemListElement.map(x => x.url).filter(x => x.indexOf('/spielfilm/') > -1))
      }
    }
  }

  return _.flatten(movieUrlList)
}

function getUpcomingMovieUrls (websiteHtml) {
  const movieUrlList = []
  const websiteAsElement = new JSDOM(websiteHtml).window.document
  const upcomingMovieElements = websiteAsElement.querySelectorAll('div.air-dates a.air-date-link')

  if (upcomingMovieElements?.length) {
    for (let i = 0; i < upcomingMovieElements.length; i++) {
      movieUrlList.push(upcomingMovieElements[i].getAttribute('href'))
      logger.debug(upcomingMovieElements[i].getAttribute('href'))
    }
  }

  return movieUrlList
}

async function getMovieDataFromApiFromUrl (movieUrl, apiToken) {
  try {
    logger.debug(`[3SAT API] MOVIE "${movieUrl}".`)
    const { data: movieApiData } = await axios.get(movieUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Api-Auth': `Bearer ${apiToken}`
      }
    })
    logger.debug(`[3SAT API] MOVIE DONE "${movieUrl}".`)

    return movieApiData
  } catch (err) {
    logger.error(`Error while getting info for "${movieUrl}"`)
    if (err?.response?.statusText) logger.error(`${err.response.statusCode} – ${err.response.statusText}`)
    else logger.error(err)
  }
}

function fixJsonText (text) {
  return text.replace(/,\s+}/g, '}').replace(/\n/g, '')
}

async function getApiConfig () {
  try {
    logger.debug('[3SAT API] Requesting config …')
    const { data: apiConfig } = await axios.get('https://ngp.3sat.de/miniplayer/embed/configuration_3sat.json', {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    })
    logger.debug('[3SAT API] DONE Requesting config …')

    return {
      apiKey: apiConfig.apiToken,
      baseUrl: apiConfig.contentPrefix,
      suffix: apiConfig.contentSuffix
    }
  } catch (err) {
    logger.error(err)
    return null
  }
}

async function getAvailabeMovieUrls () {
  try {
    let movieUrls = []
    const { data: spielfilmeHTML } = await axios.get('https://www.3sat.de/film/spielfilm', {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    })
    movieUrls.push(getMovieUrls(spielfilmeHTML))
    movieUrls.push(getUpcomingMovieUrls(spielfilmeHTML))
    movieUrls = _.compact(_.uniq(_.flatten(movieUrls)))

    return movieUrls
  } catch (err) {
    logger.error(err)
    return null
  }
}

function extractIdFromUrlIfValid (url) {
  for (let i = 0; i < extractor.validUrlRegex.length; i++) {
    const match = url.match(extractor.validUrlRegex[i])
    if (match) return match[1]
  }
  return null
}

module.exports = extractor
