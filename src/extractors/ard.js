const _ = require('lodash')
const logger = require('../logger.js')
const { default: axios } = require('axios')
const {
  formatDate
} = require('date-fns')
const {
  getRandomUserAgent
} = require('../helperFunctions.js')

const extractor = {
  scrapeMovieData: scrapeArdMovieData,
  validUrlRegex: [],
  channel: 'ard'
}

async function scrapeArdMovieData () {
  try {
    let movieList = []
    let movies = []

    const apiMovies = await getAvailableMoviesFromApi()
    if (apiMovies) movies.push(apiMovies)

    movies = _.uniqBy(_.flatten(movies), 'id')

    for (let i = 0; i < movies.length; i++) {
      const movie = normalizeMovieData(movies[i])
      movieList.push(movie)
    }

    movieList = _.orderBy(movieList, ['time.date'], ['asc'])
    movieList = _.uniqBy(_.flatten(movieList), 'url')

    const channels = _.compact(
      _.uniq(
        movieList
          .map(movie => movie.channel)
          .filter(channel => channel && [
            'ard', 'ard_alpha', 'das_erste', 'br', 'hr', 'mdr', 'ndr',
            'rbb', 'sr', 'swr', 'wdr', 'one', 'funk', 'kika'
          ].indexOf(channel) > -1)
      ).sort()
    )
    logger.debug(channels, movieList.map(x => x.title))
    const dataByChannel = {}
    for (let i = 0; i < channels.length; i++) {
      dataByChannel[channels[i].toLowerCase()] = movieList
        .filter(movie => movie.channel === channels[i])
        .map(movie => {
          delete movie.channel
          return movie
        })
    }

    logger.info(`[ARD API] Movies found: ${movieList?.length}`)
    return dataByChannel
  } catch (err) {
    logger.error(err)
  }
}

function normalizeMovieData (rawMovieData) {
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
    const movieDate = new Date(availableTo)

    const movie = {
      title: `${shortTitle}`.split(' | ')[0].trim(),
      url: `https://ardmediathek.de/video/${rawMovieData.links?.target?.urlId}`,
      img: images.aspect16x9?.src?.replace('{width}', 768),
      imgCover: images.aspect3x4?.src?.replace('{width}', 320),
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
  const apiUrl = 'https://api.ardmediathek.de/page-gateway/pages/ard/editorial/filme'

  logger.debug(`[API ARD] NEXT "${apiUrl}"`)
  const { data: currentRequestresponse } = await axios.get(apiUrl, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      Accept: 'application/json'
    }
  })

  if (!currentRequestresponse?.title === 'Die besten Filme in der ARD') throw new Error(`Api request for "${apiUrl}" failed!`)
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
}

module.exports = extractor
