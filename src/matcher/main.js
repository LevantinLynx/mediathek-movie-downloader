const logger = require('../logger.js')
const { getImdbSuggestionsForTitle } = require('./imdb.js')
const { getTmdbSuggestionsForTitle } = require('./tmdb.js')
const { getTmdbApiSuggestionsForTitle } = require('./tmdbApi.js')
const db = require('../database.js')

async function getCachedMovieSuggestionsByMovieID (movieID) {
  try {
    const movie = await db.getMovieMetaDataByID(movieID)
    let imdbMovies = null
    let tmdbMovies = null

    if (movie) {
      const cleanTitle = movie.title?.replace(/[()]/g, '').split(/[|]/)?.[0]?.trim() || null
      const imdbSuggestions = await db.getImdbSuggestionsForTitle(encodeURIComponent(cleanTitle || movie.title))
      if (imdbSuggestions?.length > 0) {
        imdbMovies = await Promise.all(imdbSuggestions.map(movieID => db.getImdbMovieByID(movieID)))
      }

      const tmdbSuggestions = await db.getTmdbSuggestionsForTitle(encodeURIComponent(cleanTitle || movie.title))
      if (tmdbSuggestions?.length > 0) {
        tmdbMovies = await Promise.all(tmdbSuggestions.map(movieID => db.getTmdbMovieByID(movieID)))
      }
    }

    if (imdbMovies || tmdbMovies) {
      return {
        movieID,
        tmdb: matchTmdbSuggestions(movie, tmdbMovies || []),
        imdb: matchImdbSuggestions(movie, imdbMovies || [])
      }
    }
    return null
  } catch (err) {
    logger.error('[SOCKET] getSuggestionsForMovie', err)
    return null
  }
}

async function getMovieSuggestionsByMovieID (movieID) {
  try {
    const movie = await db.getMovieMetaDataByID(movieID)
    if (movie) {
      movie.cleanTitle = movie.title?.replace(/[()]/g, '').split(/[|]/)?.[0]?.trim() || null
      return {
        movieID,
        tmdb: (
          process.env.TMDB_API_READ_ACCESS_TOKEN
            ? await addTmdbApiSuggestionToMovie(movie)
            : await addTmdbSuggestionToMovie(movie)
        ),
        imdb: await addImdbSuggestionToMovie(movie)
      }
    }
    return {
      movieID,
      error: `Kein Film mit ID "${movieID}" gefunden.`
    }
  } catch (err) {
    logger.error('[SOCKET] getSuggestionsForMovie', err)
    return {
      movieID,
      error: `Fehler beim laden der Vorschläge. "${err.message}"`
    }
  }
}

function matchImdbSuggestions (movie, suggestions) {
  for (let i = 0; i < suggestions.length; i++) {
    const searchTitle = movie.cleanTitle || movie.title
    const suggestion = suggestions[i]
    let match = (
      // Title matching
      suggestion.title.toLowerCase().indexOf(searchTitle.toLowerCase()) === 0 ||
      searchTitle.toLowerCase().indexOf(suggestion.title.toLowerCase()) === 0
    )
    if (!match) {
      // Match by year
      if (
        suggestion.year && (
          movie.description.indexOf(suggestion.year) > -1 ||
          movie.imgAlt?.indexOf(suggestion.year) > -1
        )
      ) match = true
      // Matching by actor names
      if (
        suggestion.info &&
        suggestion.info
          .split(', ')
          .map(actor => (
            movie.description.indexOf(actor) > -1 ||
            movie.imgAlt?.indexOf(actor) > -1
          ))
          .filter(value => value === true)
          .length > 0
      ) match = true
    }
    if (match) {
      return {
        match: {
          imdbid: suggestion.imdbid
        },
        suggestions
      }
    }
  }

  return {
    match: null,
    suggestions
  }
}

async function addImdbSuggestionToMovie (movie) {
  try {
    const searchTitle = movie.cleanTitle || movie.title
    const suggestions = await getImdbSuggestionsForTitle(searchTitle)
    return matchImdbSuggestions(movie, suggestions)
  } catch (err) {
    logger.error(err)
    return {
      match: null,
      suggestions: []
    }
  }
}

function matchTmdbSuggestions (movie, suggestions) {
  for (let i = 0; i < suggestions.length; i++) {
    const searchTitle = movie.cleanTitle || movie.title
    const suggestion = suggestions[i]
    let match = (
      // Title matching
      suggestion.title.toLowerCase().indexOf(searchTitle.toLowerCase()) === 0 ||
      searchTitle.toLowerCase().indexOf(suggestion.title.toLowerCase()) === 0
    )
    if (!match) {
      // Match by year
      if (suggestion.year && movie?.description?.indexOf(suggestion.year) > -1) {
        match = true
      }
    }
    if (match) {
      const matchInfo = { tmdbid: suggestion.tmdbid }
      if (suggestion.imdbid) matchInfo.imdbid = suggestion.imdbid
      return {
        match: matchInfo,
        suggestions
      }
    }
  }

  return {
    match: null,
    suggestions
  }
}

async function addTmdbApiSuggestionToMovie (movie) {
  try {
    const searchTitle = movie.cleanTitle || movie.title
    const suggestions = await getTmdbApiSuggestionsForTitle(searchTitle)
    return matchTmdbSuggestions(movie, suggestions)
  } catch (err) {
    logger.error(err)
    return {
      match: null,
      suggestions: []
    }
  }
}

async function addTmdbSuggestionToMovie (movie) {
  try {
    const searchTitle = movie.cleanTitle || movie.title
    const suggestions = await getTmdbSuggestionsForTitle(searchTitle)

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i]
      let match = (
        // Title matching
        suggestion.title.toLowerCase().indexOf(searchTitle.toLowerCase()) === 0 ||
        searchTitle.toLowerCase().indexOf(suggestion.title.toLowerCase()) === 0
      )
      if (!match) {
        // Match by year
        if (
          suggestion.year && (
            movie.description.indexOf(suggestion.year) > -1 ||
            movie.imgAlt?.indexOf(suggestion.year) > -1
          )
        ) match = true
      }
      if (match) {
        return {
          match: suggestion,
          suggestions
        }
      }
    }

    return {
      match: null,
      suggestions
    }
  } catch (err) {
    logger.error(err)
    return {
      match: null,
      suggestions: []
    }
  }
}

module.exports = {
  getCachedMovieSuggestionsByMovieID,
  getMovieSuggestionsByMovieID
}
