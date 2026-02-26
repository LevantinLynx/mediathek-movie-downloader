const logger = require('../logger.js')
const _ = require('lodash')
const {
  axiosWithTimeouts: axios
} = require('../helperFunctions.js')
const {
  getOmdbInfoByTitleOrImdbID
} = require('./omdb.js')
const db = require('../database.js')

const TMDB_API_REQUEST_TIMEOUT = 20_000

/**
 * Get suggested movie objects for movie title
 * @param {String} title of movie to get suggestion movie objects for
 * @returns {Object[]} suggested movie objects
 */
async function getTmdbApiSuggestionsForTitle (title) {
  if (!process.env.TMDB_API_READ_ACCESS_TOKEN) {
    logger.debug('[MATCHER] OMDB No API Key found skipping!')
    return []
  }

  let suggestions = []
  try {
    const cacheSuggestions = await db.getTmdbSuggestionsForTitle(encodeURIComponent(title))
    if (cacheSuggestions) {
      suggestions = await Promise.all(cacheSuggestions.map(tmdbid => db.getTmdbMovieByID(tmdbid)))
      logger.debug('[MATCHER] TMDB cache return', suggestions)
      return _.compact(suggestions)
    }

    const { data } = await axios.get(`https://api.themoviedb.org/3/search/movie?language=de-DE&query=${encodeURIComponent(title)}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(TMDB_API_REQUEST_TIMEOUT)
    })

    for (let i = 0; i < data.results.length; i++) {
      const result = data.results[i]
      const entry = {
        tmdbid: `${result.id}`.split('-')[0],
        title: result.title,
        genres: _.compact(result.genre_ids.map(item => genres[item])),
        ratings: {
          tmdb: result.vote_average.toFixed(1)
        },
        releaseDate: result.release_date,
        year: result.release_date.split('-')?.[0],
        info: result.overview,
        originalLanguage: result.original_language
      }

      if (result.poster_path) entry.img = `https://image.tmdb.org/t/p/w200${result.poster_path}`
      if (result.backdrop_path) entry.backdrop = `https://image.tmdb.org/t/p/w1280${result.backdrop_path}`
      if (result.title !== result.original_title) entry.originalTitle = result.original_title

      const platformMatchingInfo = await getPlatformMatchingInfo(entry.tmdbid)
      logger.debug('platformMatchingInfo', platformMatchingInfo)
      if (platformMatchingInfo && platformMatchingInfo.imdbid) {
        entry.imdbid = platformMatchingInfo.imdbid

        const omdbInfo = await getOmdbInfoByTitleOrImdbID(platformMatchingInfo.imdbid)
        if (omdbInfo) {
          if (!entry.ratings) entry.ratings = {}
          if (omdbInfo.Runtime && omdbInfo.Runtime === 'N/A') entry.duration = omdbInfo.Runtime
          if (omdbInfo.Rated && ['N/A', 'Not Rated'].indexOf(omdbInfo.Rated) === -1) {
            entry.fsk = omdbInfo.Rated
          }
          if (omdbInfo.Actors) entry.actors = omdbInfo.Actors.split(', ')
          if (!entry.img && omdbInfo.Poster) entry.img = omdbInfo.Poster
          if (omdbInfo.Metascore && omdbInfo.Metascore !== 'N/A') {
            entry.ratings.metacritic = omdbInfo.Metascore
          }
          if (omdbInfo.imdbRating && omdbInfo.imdbRating !== 'N/A') {
            entry.ratings.imdb = omdbInfo.imdbRating
          }
          if (omdbInfo.Ratings) {
            const rotten = omdbInfo.Ratings.filter(item => item.Source === 'Rotten Tomatoes')
            if (rotten.length > 0) entry.ratings.rotten = rotten[0].Value
          }

          if (Object.keys(entry.ratings).length === 0) delete entry.ratings
        }
      }

      if (entry.img === 'N/A') entry.img = null
      if (entry.duration === 'N/A') entry.duration = null

      suggestions.push(entry)
      if (i === 5) break
    }

    suggestions = suggestions.slice(0, 6)

    if (suggestions.length > 0) {
      await db.saveTmdbSuggestions({
        encodedUriTitle: encodeURIComponent(title),
        suggestions: suggestions.map(movie => movie.tmdbid)
      })
      await Promise.all(
        suggestions.map(movie => db.saveTmdbMovie(movie))
      )
    }

    logger.debug('[MATCHER] TMDB API Suggestions:', suggestions?.length)
    return suggestions
  } catch (err) {
    logger.error('[MATCHER] TMDB API Search request:', err.message)
    if (err.message !== 'canceled') logger.error(err)
    return []
  }
}

/**
 * Get ids from all providers for given id
 * @param {String} tmdbOrImdbID of the movie to get ids for
 * @returns {Object} Object with key for providers
 */
async function getPlatformMatchingInfo (tmdbOrImdbID) {
  let match = null
  if (!process.env.TMDB_API_READ_ACCESS_TOKEN) {
    logger.debug('[MATCHER] OMDB No API Key found skipping!')
    return match
  }

  try {
    if (['number', 'string'].indexOf(typeof tmdbOrImdbID) > -1) tmdbOrImdbID = `${tmdbOrImdbID}`
    else throw new Error('[MATCHER] TMDB API tmdbOrImdbID is no string!')

    const cacheMatch = await db.getPlatformMatchingInfoFromDB(tmdbOrImdbID)
    if (cacheMatch) return cacheMatch

    const postfix = tmdbOrImdbID.indexOf('tt') === 0 ? '/external_ids' : ''
    const { data } = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbOrImdbID}${postfix}`, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(TMDB_API_REQUEST_TIMEOUT)
    })
    logger.debug('[MATCHER] getPlatformMatchingInfo', data)
    if (data?.id) {
      match = {
        tmdbid: data.id ? `${data.id}`.split('-')[0] : null,
        imdbid: data.imdb_id ? `${data.imdb_id}` : null
      }
      await db.savePlatformMatchingInfoToDB(match)
    }
  } catch (err) {
    logger.error('[MATCHER] TMDB API:', err.message)
    if (err.message !== 'canceled') logger.error(err)
  }
  return match
}

const genres = {
  28: 'Action',
  12: 'Abenteuer',
  16: 'Animation',
  35: 'Komödie',
  80: 'Krimi',
  99: 'Dokumentarfilm',
  18: 'Drama',
  10751: 'Familie',
  14: 'Fantasy',
  36: 'Historie',
  27: 'Horror',
  10402: 'Musik',
  9648: 'Mystery',
  10749: 'Liebesfilm',
  878: 'Science Fiction',
  10770: 'TV-Film',
  53: 'Thriller',
  10752: 'Kriegsfilm',
  37: 'Western'
}

module.exports = {
  getTmdbApiSuggestionsForTitle,
  getPlatformMatchingInfo
}
