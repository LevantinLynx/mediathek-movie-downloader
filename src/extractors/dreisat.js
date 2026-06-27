const _ = require('lodash')
const path = require('path')
const logger = require('../logger.js')
const { formatDate } = require('date-fns')
const { parseHTML } = require('linkedom')
const {
  getRandomUserAgent,
  cacheImageAndGenerateCachedLink,
  axiosWithTimeouts: axios
} = require('../helperFunctions.js')

const extractor = {
  scrapeMovieData: scrape3satMovieData,
  validUrlRegex: [
    /https?:\/\/(?:www\.)?3sat\.de\/(?:[^/]+\/)*([^/?#&]+)\.html/
  ],
  channel: '3sat',
  validChannelList: ['3sat']
}

async function scrape3satMovieData (cachedImageFileHashList) {
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
        if (!movieApiData) {
          logger.error(`[3SAT API] Error while processing videoID "${videoID}".`)
          continue
        }
        if (movieApiData && process.env.NODE_ENV === 'development') {
          await Bun.write(path.join(__dirname, '..', '..', 'debug_info', `3SAT_${videoID}.json`), JSON.stringify(movieApiData))
        }

        const movieProgrammeItem = movieApiData.programmeItem?.[0]?.['http://zdf.de/rels/target']

        const thumbnail = (
          movieApiData.teaserImageRef.layouts['1280x720'] ||
          movieApiData.teaserImageRef.layouts['1920x1080'] ||
          movieApiData.teaserImageRef.layouts['768x432'] ||
          movieProgrammeItem?.['http://zdf.de/rels/image']?.layouts?.['1280x720'] ||
          movieProgrammeItem?.['http://zdf.de/rels/image']?.layouts?.['1920x1080']
        )

        const movieObject = {
          title: movieApiData.title,
          url: movieApiData['http://zdf.de/rels/sharing-url'],
          img: await cacheImageAndGenerateCachedLink(
            thumbnail,
            cachedImageFileHashList
          ),
          imgAlt: (
            movieApiData.teaserImageRef.altText ||
            movieProgrammeItem?.['http://zdf.de/rels/image']?.altText
          ),
          description: (
            movieProgrammeItem?.text ||
            movieApiData.leadParagraph ||
            ''
          ).replace(/<[^>]*>/g, ' ').replace(/\s/g, ' '),
          time: {},
          restrictions: [],
          apiID: videoID,
          channel: '3sat'
        }

        const now = new Date()

        if (movieProgrammeItem) {
          // Actor info
          if (movieProgrammeItem.actorDetails?.actorDetail?.length > 0) {
            movieObject.actorDetails = movieProgrammeItem.actorDetails.actorDetail.slice(0, 6)
          }
          // Crew info
          if (movieProgrammeItem.crewDetails?.crewDetail?.length > 0) {
            movieObject.crewDetails = movieProgrammeItem.crewDetails.crewDetail.slice(0, 6)
          }
          // Country info
          if (movieProgrammeItem.country) {
            movieObject.country = movieProgrammeItem.country.trim()
          }
          // Genre info
          if (movieProgrammeItem.genre) {
            movieObject.genre = movieProgrammeItem.genre.trim()
          }
          // FSK info
          if (
            movieProgrammeItem.fsk &&
            movieProgrammeItem.fsk !== 'none'
          ) {
            movieObject.restrictions.push(`FSK${movieProgrammeItem.fsk}`.toUpperCase())
          } else if (movieProgrammeItem.jugendeignung) {
            movieObject.restrictions.push(`FSK${movieProgrammeItem.jugendeignung}`.toUpperCase())
          }
          // Original title of movie
          if (movieProgrammeItem.originalTitle) movieObject.originalTitle = movieProgrammeItem.originalTitle
          // Movie year info
          if (movieProgrammeItem.year) movieObject.year = movieProgrammeItem.year
          else if (movieProgrammeItem.subtitle.match(/\d{4}/)) {
            movieObject.year = movieProgrammeItem.subtitle.match(/\d{4}/)[0]
          }

          if (movieProgrammeItem['http://zdf.de/rels/cmdm/broadcasts']?.length > 0) {
            const relevantBroadcasts = movieProgrammeItem['http://zdf.de/rels/cmdm/broadcasts']
              .filter(broadcast => {
                if (broadcast.onlineFrom && now < new Date(broadcast.onlineFrom)) return true
                if (broadcast.onlineTo && now < new Date(broadcast.onlineTo)) return true

                return false
              })

            const currentBroadcast = relevantBroadcasts[0]
            if (currentBroadcast) {
              if (currentBroadcast.duration) {
                movieObject.duration = `${Math.ceil(currentBroadcast?.duration / 60)} min`
              }
              if (currentBroadcast.geolocationVOD) {
                movieObject.geoLock = currentBroadcast.geolocationVOD
              }

              const onlineFrom = currentBroadcast.onlineFrom
                ? new Date(currentBroadcast.onlineFrom)
                : null
              const onlineTo = currentBroadcast.onlineTo
                ? new Date(currentBroadcast.onlineTo)
                : null

              if (onlineFrom && now < onlineFrom) {
                movieObject.time = {
                  date: onlineFrom,
                  type: 'from'
                }
                movieObject.preText = `ab ${formatDate(onlineFrom, 'dd.MM.yyyy HH:mm')}`
              } else if (onlineTo && now < onlineTo) {
                movieObject.time = {
                  date: onlineTo,
                  type: 'untill'
                }
                movieObject.preText = `bis ${formatDate(onlineTo, 'dd.MM.yyyy HH:mm')}`
              }

              if (currentBroadcast.geolocationVOD?.toLowerCase().indexOf('dach') > -1) {
                movieObject.preText += ' in Deutschland, Österreich & Schweiz'
              } else if (currentBroadcast.geolocationVOD?.toLowerCase().indexOf('d') > -1) {
                movieObject.preText += ' in Deutschland'
              } else if (currentBroadcast.geolocationVOD?.toLowerCase().indexOf('a') > -1) {
                movieObject.preText += ' in Österreich'
              } else if (currentBroadcast.geolocationVOD?.toLowerCase().indexOf('ch') > -1) {
                movieObject.preText += ' in der Schweiz'
              }
            }
          }
        }

        const mainVideoContent = movieApiData.mainVideoContent?.['http://zdf.de/rels/target']
        if (mainVideoContent) {
          if (!movieObject.duration && mainVideoContent.duration) {
            movieObject.duration = `${Math.ceil(mainVideoContent?.duration / 60)} min`
          }

          if (!movieObject.time.date) {
            const visibleFrom = mainVideoContent.visibleFrom
              ? new Date(mainVideoContent.visibleFrom)
              : null
            const visibleTo = mainVideoContent.visibleTo
              ? new Date(mainVideoContent.visibleTo)
              : null

            if (visibleFrom && now < visibleFrom) {
              movieObject.time = {
                date: visibleFrom,
                type: 'from'
              }
              movieObject.preText = `ab ${formatDate(visibleFrom, 'dd.MM.yyyy HH:mm')}`
            } else if (visibleTo && now < visibleTo) {
              movieObject.time = {
                date: visibleTo,
                type: 'untill'
              }
              movieObject.preText = `bis ${formatDate(visibleTo, 'dd.MM.yyyy HH:mm')}`
            } else {
              // Asume infinite availability
              const date = new Date(`${now.getFullYear() + 50}-01-01T00:00:00.000+01:00`)
              movieObject.time = {
                date,
                type: 'untill'
              }
              movieObject.preText = `bis ${formatDate(date, 'dd.MM.yyyy HH:mm')}`
            }
          }

          if (
            !movieProgrammeItem.fsk &&
            mainVideoContent?.fsk &&
            mainVideoContent?.fsk !== 'none'
          ) {
            movieObject.restrictions.push(`${mainVideoContent.fsk}`.toUpperCase())
          }
        }

        if (movieObject.restrictions.length === 0) delete movieObject.restrictions

        movieList.push(movieObject)
      } else {
        logger.error(`Webseite nicht erkannt / Link wird nicht unterstützt! ${movieUrls[i]}`)
      }
    }

    movieList = _.orderBy(_.compact(movieList), ['time.type', 'time.date'], ['desc', 'asc'])

    logger.debug(movieList)

    logger.info(`[3SAT API] Movies found: ${movieList?.length}`)
    return movieList
  } catch (err) {
    logger.error('Error while loading movie json data via axios …')
    logger.error(err)
    return null
  }
}

function getMovieUrls (websiteHtml) {
  const movieUrlList = []
  const { document: websiteAsElement } = parseHTML(websiteHtml)
  const jsonElements = websiteAsElement.querySelectorAll('script[type="application/ld+json"]')

  for (let i = 0; i < jsonElements.length; i++) {
    if (jsonElements[i].textContent.indexOf('ItemList') > -1) {
      logger.debug(fixJsonText(jsonElements[i].textContent))
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
  const { document: websiteAsElement } = parseHTML(websiteHtml)
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
    return null
  }
}

function fixJsonText (text) {
  return text.replace(/,\s+}/g, '}').replace(/\n/g, '').replace(/\s+/g, ' ')
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
    return []
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
