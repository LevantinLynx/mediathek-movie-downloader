const logger = require('../logger.js')
const _ = require('lodash')
const { parseHTML } = require('linkedom')
const {
  axiosWithTimeouts: axios,
  getRandomUserAgent
} = require('../helperFunctions.js')
const db = require('../database.js')

/**
 * Get suggested movie objects for movie title
 * @param {String} title of movie to get suggestion movie objects for
 * @returns {Object[]} suggested movie objects
 */
async function getTmdbSuggestionsForTitle (title) {
  let suggestions = []
  try {
    const cacheSuggestions = await db.getTmdbSuggestionsForTitle(encodeURIComponent(title))
    if (cacheSuggestions) {
      suggestions = await Promise.all(cacheSuggestions.map(tmdbid => db.getTmdbMovieByID(tmdbid)))
      logger.debug('[MATCHER] TMDB cache return', suggestions)
      return _.compact(suggestions)
    }

    const { data: searchPageHtml } = await axios.get(`https://www.themoviedb.org/search/movie?query=${encodeURIComponent(title)}`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        accept: 'text/html,application/xhtml+xml,application/xmlq=0.9,image/avif,image/webp,image/apng,*/*q=0.8',
        'accept-language': 'en-US,enq=0.8',
        priority: 'u=0, i',
        'sec-ch-ua': '"Not:A-Brand"v="99", "Brave"v="145", "Chromium"v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'sec-gpc': '1',
        'upgrade-insecure-requests': '1',
        cookie: 'AWSALBAPP-1=_remove_ AWSALBAPP-2=_remove_ AWSALBAPP-3=_remove_ preferences=%7B%22adult%22%3Afalse%2C%22i18n_fallback_language%22%3A%22en-US%22%2C%22locale%22%3A%22de-DE%22%2C%22country_code%22%3A%22DE%22%2C%22timezone%22%3A%22Europe%2FBerlin%22%7D',
        Referer: 'https://www.themoviedb.org/'
      }
    })
    suggestions = await getSuggestionsFromHtml(searchPageHtml)
    if (suggestions.length > 0) {
      await db.saveTmdbSuggestions({
        encodedUriTitle: encodeURIComponent(title),
        suggestions: suggestions.map(movie => movie.tmdbid)
      })
      await Promise.all(
        suggestions.map(movie => db.saveTmdbMovie(movie))
      )
    }

    logger.debug('[MATCHER] TMDB Suggestions:', suggestions?.length)
    return suggestions
  } catch (err) {
    if (
      err.message !== 'canceled' ||
      err.status === 503
    ) {
      logger.error('[MATCHER] TMDB Search request:', err.message)
    } else {
      logger.error('[MATCHER] TMDB Search request:', err)
    }
    return null
  }
}

async function getSuggestionsFromHtml (websiteHtml) {
  try {
    const { document: websiteAsElement } = parseHTML(websiteHtml)
    const suggestionElements = websiteAsElement.querySelectorAll('div.search_results.movie div.card')
    const movies = Array.from(suggestionElements)
    const suggestions = []

    for (let i = 0; i < movies.length; i++) {
      const titleLinkElement = movies[i].querySelector('.title a.result')
      const titleElement = titleLinkElement?.querySelector('h2') || null

      const suggestion = {
        title: titleElement?.textContent.trim() || null,
        tmdbid: titleLinkElement?.getAttribute('href')?.replace('/movie/', '').trim().split('-')[0] || null,
        info: movies[i].querySelector('.overview p')?.textContent.trim() || '',
        year: movies[i].querySelector('.release_date')?.textContent.trim()?.split(' ')?.[2] || null,
        releaseDate: movies[i].querySelector('.release_date')?.textContent.trim() || null,
        img: movies[i].querySelector('img.poster')?.src?.replace('w94_and_h141', 'w220_and_h330') || null
      }

      // Add original title if available
      const originalSpan = titleElement?.querySelector('span.title')
      if (originalSpan) {
        suggestion.title = suggestion.title.replace(originalSpan.textContent, '').trim()
        suggestion.originalTitle = originalSpan.textContent.replace('(', '').replace(')', '').trim()
      }

      suggestions.push(suggestion)
    }

    return suggestions.slice(0, 6)
  } catch (err) {
    logger.error('[MATCHER] TMDB (HTML Parser):', err.message)
    logger.error(err)
    return []
  }
}

async function getFallbackTmdbInfoForId (tmdbid) {
  const movieObject = {}
  try {
    const { data: websiteHtml } = await axios.get(`https://www.themoviedb.org/movie/${tmdbid}?language=de-DE`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        accept: 'text/html,application/xhtml+xml,application/xmlq=0.9,image/avif,image/webp,image/apng,*/*q=0.8',
        'accept-language': 'en-US,enq=0.8',
        priority: 'u=0, i',
        'sec-ch-ua': '"Not:A-Brand"v="99", "Brave"v="145", "Chromium"v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'sec-gpc': '1',
        'upgrade-insecure-requests': '1',
        cookie: 'AWSALBAPP-1=_remove_ AWSALBAPP-2=_remove_ AWSALBAPP-3=_remove_ preferences=%7B%22adult%22%3Afalse%2C%22i18n_fallback_language%22%3A%22en-US%22%2C%22locale%22%3A%22de-DE%22%2C%22country_code%22%3A%22DE%22%2C%22timezone%22%3A%22Europe%2FBerlin%22%7D',
        Referer: 'https://www.themoviedb.org/'
      }
    })

    const { document: websiteAsElement } = parseHTML(websiteHtml)
    const infoJsonString = websiteAsElement.querySelector('script[type="application/ld+json"]').innerHTML
    const infoJsonArray = infoJsonString.split('\n')

    let info = {}
    for (let i = 0; i < infoJsonArray.length; i++) {
      if (infoJsonArray[i].indexOf('{"@') === 0) {
        info = JSON.parse(infoJsonArray[i])
        break
      }
    }

    const year = websiteAsElement.querySelector('head title')?.innerHTML?.match(/\((\d{4})\)/)
    if (year?.[1]) movieObject.year = year[1]

    if (info.alternateName) movieObject.title = info.alternateName
    else if (info.name) movieObject.title = info.name

    if (info.description) movieObject.info = info.description
    if (info.genre?.length > 0) movieObject.genres = info.genre
    if (info.aggregateRating?.ratingValue) movieObject.ratings = { tmdb: info.aggregateRating.ratingValue.toFixed(1) }

    return movieObject
  } catch (err) {
    if (
      err.message !== 'canceled' ||
      err.status === 503
    ) {
      logger.error('[MATCHER] TMDB Fallback request:', err.message)
    } else {
      logger.error('[MATCHER] TMDB Fallback request:', err)
    }
    return null
  }
}

module.exports = {
  getTmdbSuggestionsForTitle,
  getFallbackTmdbInfoForId
}
