const _ = require('lodash')
const logger = require('../logger.js')
const { default: axios } = require('axios')
const {
  parse: parseDate,
  addHours
} = require('date-fns')
const {
  getRandomUserAgent,
  getIso639Info
} = require('../helperFunctions.js')

const extractor = {
  scrapeMovieData: scrapeZdfMovieData,
  validUrlRegex: [
    /https?:\/\/www\.zdf\.de\/(?:play\/)?(?:video|dokus|(?:magazine|reportagen|konzerte|filme)\/[^/?#&]+)(?:\/[^/?#&]+)*\/([^/?#&.]+)/,
    /https?:\/\/www\.zdf\.de\/(?:[^/]+\/)*([^/?#&]+)\.html/
  ],
  channel: 'zdf'
}

async function scrapeZdfMovieData () {
  try {
    let movieList = []
    let movies = []

    const apiMovies = await getAvailableMoviesFromApi()
    if (apiMovies) movies.push(apiMovies)

    movies = _.flatten(movies)
    const movieIDs = _.uniqBy(movies, 'id').map(movie => movie.id)

    for (let i = 0; i < movieIDs.length; i++) {
      const movieApiData = await getMovieInfoFromApi(movieIDs[i])
      const movie = normalizeMovieData(movieApiData)
      if (movie) movieList.push(movie)
    }

    movieList = _.orderBy(movieList, ['time.type', 'time.date'], ['desc', 'asc'])

    const channels = _.uniq(movieList.map(movie => movie.channel)).sort()
    logger.debug(channels, movieList.map(x => x.url))
    const dataByChannel = {}
    for (let i = 0; i < channels.length; i++) {
      dataByChannel[channels[i].toLowerCase()] = movieList
        .filter(movie => movie.channel === channels[i])
        .map(movie => {
          delete movie.channel
          return movie
        })
    }
    logger.info(`[ZDF API] Movies found: ${movieIDs?.length}`)
    return dataByChannel
  } catch (err) {
    logger.error(err)
  }
}

async function getMovieInfoFromApi (ID) {
  try {
    const baseUrl = 'https://zdf-prod-futura.zdf.de/mediathekV2/document/'
    const currentApiUrl = `${baseUrl}${ID}`

    logger.debug(`[API ZDF] MOVIE REQUEST "${currentApiUrl}"`)
    const { data: currentRequestresponse } = await axios.get(currentApiUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'application/json'
      }
    })

    if (!currentRequestresponse?.document?.id === ID) throw new Error(`Api request for "${ID}" failed!`)
    logger.debug(`[API ZDF] MOVIE DONE ${currentApiUrl}`)

    return currentRequestresponse
  } catch (err) {
    logger.error(err)
  }
}

function normalizeMovieData (rawMovieData) {
  try {
    const entry = rawMovieData.document ? rawMovieData.document : rawMovieData
    let movieDate = new Date(entry.offlineAvailability)

    const { availabilityInfo } = rawMovieData
    if (availabilityInfo && availabilityInfo.indexOf('Video verfügbar ab ') === 0) {
      movieDate = addHours(parseDate(availabilityInfo.replace('Video verfügbar ab ', ''), 'dd.MM.yyyy HH:mm', new Date()), 2)
    }

    const movie = {
      title: entry.titel,
      url: entry.sharingUrl,
      img: entry.teaserBild?.['768']?.url || entry.teaserBild?.['1']?.url,
      description: entry.beschreibung,
      time: {
        date: movieDate,
        type: 'untill'
      },
      preText: '',
      duration: entry.length > 500 ? `${Math.ceil(entry.length / 60)} min` : null,
      apiID: entry.id,
      channel: entry.channel,
      restrictions: [],
      audioLangs: [],
      subLangs: []
    }

    if (entry.fsk && entry.fsk !== 'none') movie.restrictions.push(entry.fsk.toUpperCase())

    if (entry.availabilityInfo) {
      movie.preText = entry.availabilityInfo
      if (entry.availabilityInfo.indexOf('verfügbar ab') > -1) movie.time.type = 'from'
      else if (entry.availabilityInfo.indexOf('verfügbar bis') > -1) movie.time.type = 'untill'
    }

    if (!movie.preText) logger.error('Movie has no preText!!!!!!!!!!!!!!!!!!!!!!!!!!!!')

    if (entry.captions) {
      movie.subLangs = _.uniq(entry.captions.map(caption => caption.language)).map(lang => {
        const isoInfo = getIso639Info(lang)
        return `${isoInfo.iso_639_1}`.toUpperCase()
      }).sort()
    }
    if (entry.formitaeten) {
      movie.audioLangs = _.uniq(entry.formitaeten.map(caption => caption.language)).map(lang => {
        const isoInfo = getIso639Info(lang)
        return `${isoInfo.iso_639_1}`.toUpperCase()
      }).sort()
    }

    if (movie.restrictions.length === 0) delete movie.restrictions
    if (movie.audioLangs.length === 0) delete movie.audioLangs
    if (movie.subLangs.length === 0) delete movie.subLangs
    if (!movie.duration) delete movie.duration

    return movie
  } catch (err) {
    logger.error(err)
    return null
  }
}

async function getAvailableMoviesFromApi () {
  const apiUrl = 'https://zdf-prod-futura.zdf.de/mediathekV2/document/spielfilm-104'

  logger.debug(`[API ZDF] NEXT "${apiUrl}"`)
  const { data: currentRequestresponse } = await axios.get(apiUrl, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      Accept: 'application/json'
    }
  })

  if (!currentRequestresponse?.meta) throw new Error(`Api request for "${apiUrl}" failed!`)
  logger.debug(`[API ZDF] DONE ${apiUrl}`)

  const movies = []
  for (let i = 0; i < currentRequestresponse.cluster.length; i++) {
    if (currentRequestresponse.cluster[i].name.indexOf('Serien') === -1) {
      movies.push(currentRequestresponse.cluster[i].teaser.filter(x => x.channel !== '3sat'))
    }
  }

  return _.flatten(movies)
}

module.exports = extractor
