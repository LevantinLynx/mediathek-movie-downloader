const _ = require('lodash')
const logger = require('../logger.js')
const {
  formatDate
} = require('date-fns')
const {
  getRandomUserAgent,
  cacheImageAndGenerateCachedLink,
  axiosWithTimeouts: axios
} = require('../helperFunctions.js')
const {
  getAllSettings
} = require('../database.js')

const extractor = {
  scrapeMovieData: scrapeArdMovieData,
  validUrlRegex: [],
  channel: 'ard',
  validChannelList: ['ard', 'ard_alpha', 'das_erste', 'br', 'hr', 'mdr', 'ndr', 'rbb', 'sr', 'swr', 'wdr', 'one']
}

async function scrapeArdMovieData (cachedImageFileHashList) {
  try {
    let movieList = []
    let movies = []

    const settings = await getAllSettings()
    const activeChannels = settings.channelSelection
      .filter(channel => channel.active)
      .map(channel => channel.name.toLowerCase().replace(' ', '_'))

    const apiMovies = await getAvailableMoviesFromApi()
    if (apiMovies) movies.push(apiMovies)

    movies = _.uniqBy(_.flatten(movies), 'id')

    for (let i = 0; i < movies.length; i++) {
      const movie = await normalizeMovieData(movies[i], cachedImageFileHashList, activeChannels)
      if (movie) movieList.push(movie)
    }

    movieList = _.orderBy(movieList, ['time.date'], ['asc'])
    movieList = _.uniqBy(_.flatten(movieList), 'url')

    logger.info(`[ARD API] Movies found: ${movieList?.length}`)
    return movieList
  } catch (err) {
    logger.error(err)
    return null
  }
}

async function normalizeMovieData (rawMovieData, cachedImageFileHashList, activeChannels) {
  try {
    const {
      id,
      availableTo,
      maturityContentRating,
      duration,
      images,
      publicationService,
      binaryFeatures,
      shortTitle,
      show
    } = rawMovieData

    const currentChannel = `${publicationService?.name}`.toLowerCase().replace(' ', '_')
    // Skip channels not belonging to extractor channel group
    if (extractor.validChannelList.indexOf(currentChannel) === -1) return null
    // Skip inactive channels
    if (activeChannels.indexOf(currentChannel) === -1) return null

    const movieDate = new Date(availableTo)

    const movie = {
      title: `${shortTitle}`.split(' | ')[0].trim(),
      url: `https://ardmediathek.de/video/${rawMovieData.links?.target?.urlId}`,
      img: await cacheImageAndGenerateCachedLink(
        images.aspect16x9?.src,
        cachedImageFileHashList
      ),
      description: show?.shortSynopsis,
      time: {
        date: movieDate,
        type: 'untill'
      },
      preText: '',
      duration: duration > 500 ? `${Math.ceil(duration / 60)} min` : null,
      apiID: id,
      channel: publicationService?.name?.toLowerCase().replace(' ', '_'),
      restrictions: [],
      audioLangs: [],
      subLangs: [],
      features: []
    }

    if (
      maturityContentRating &&
      maturityContentRating !== 'FSK0' &&
      maturityContentRating !== 'NONE' &&
      maturityContentRating !== 'none'
    ) movie.restrictions.push(maturityContentRating)

    if (availableTo) movie.preText = `Video verfügbar bis ${formatDate(movieDate, 'dd.MM.yyyy')}`

    if (binaryFeatures && binaryFeatures.length > 0) movie.features = binaryFeatures

    if (movie.restrictions.length === 0) delete movie.restrictions
    if (movie.audioLangs.length === 0) delete movie.audioLangs
    if (movie.subLangs.length === 0) delete movie.subLangs
    if (movie.features.length === 0) delete movie.features
    if (!movie.duration) delete movie.duration

    return movie
  } catch (err) {
    logger.error(err)
    return null
  }
}

async function getAvailableMoviesFromApi () {
  try {
    const apiUrl = 'https://api.ardmediathek.de/page-gateway/pages/ard/editorial/filme'

    logger.debug(`[API ARD] Requesting overall movie data. "${apiUrl}"`)
    const { data: currentRequestresponse } = await axios.get(apiUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'application/json'
      }
    })

    if (!currentRequestresponse?.title === 'Die besten Filme in der ARD') {
      throw new Error(`[API ARD] Request for "${apiUrl}" failed!`)
    }
    logger.debug(`[API ARD] DONE ${apiUrl}`)

    const widgetsToExtract = [
      'Navigation',
      'Film-Empfehlungen',
      // "Neu verfügbare Filme",
      // "Aktuelle Fernsehfilme",
      'Krimis und Thriller',
      // "Krimi | Beliebte Teams",
      'Komödien | Kinofilme',
      'Dramen | Kinofilme',
      'Preisgekrönte Filme',
      'Literaturverfilmungen',
      // "Coming-of-Age-Filme",
      // "Filme zum Entspannen",
      // "Feel-Good-Filme",
      'Romantische Filme',
      // "Skandinavische Krimis | Düster und spannend",
      'Derzeit beliebte Filme',
      // "Roadmovies",
      'Filme für die ganze Familie',
      // "Zauberhafte Märchen",
      'Klassiker und Kultfilme',
      'Nicht mehr lange online',
      // "Krimikomödien",
      // "Filme, die Geschichte erzählen",
      // "Weitere Drama-Filme",
      // "Arthouse-Filme | Leinwandperlen fürs Heimkino",
      'Filme in Originalversion',
      'Filme nach wahren Begebenheiten'
      // "Kurzfilme | Von preisgekrönt bis experimentell",
      // "Rubriken"
    ]
    const movies = []
    const { widgets } = currentRequestresponse
    for (let i = 0; i < widgets.length; i++) {
      if (widgetsToExtract.indexOf(widgets[i].links?.self?.title) > -1) {
        movies.push(widgets[i].teasers)
      }
    }

    return _.flatten(movies)
  } catch (err) {
    logger.error(err)
    logger.error('[API ARD] Error while loading movies.', err.message)
    return null
  }
}

module.exports = extractor
