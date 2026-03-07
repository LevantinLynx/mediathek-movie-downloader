const logger = require('../logger.js')
const { parseHTML } = require('linkedom')
const _ = require('lodash')
const {
  axiosWithTimeouts: axios,
  getRandomUserAgent
} = require('../helperFunctions.js')
const {
  getOmdbInfoByTitleOrImdbID
} = require('./omdb.js')
const db = require('../database.js')

/**
 * Get suggested movie objects for movie title
 * @param {String} title of movie to get suggestion movie objects for
 * @returns {Object[]} suggested movie objects
 */
async function getImdbSuggestionsForTitle (title) {
  let suggestions = []
  try {
    const cacheSuggestions = await db.getImdbSuggestionsForTitle(encodeURIComponent(title))
    if (cacheSuggestions) {
      suggestions = await Promise.all(cacheSuggestions.map(imdbid => db.getImdbMovieByID(imdbid)))
      return _.compact(suggestions)
    }

    try {
      suggestions = await getImdbSuggestionsForTitleBySearch(title)
      if (suggestions.length === 0) suggestions = await getImdbSuggestionsForTitleByApi(title)
    } catch (err) {
      suggestions = await getImdbSuggestionsForTitleByApi(title)
    }

    for (let i = 0; i < suggestions.length; i++) {
      let omdbInfo = null
      if (process.env.OMDB_API_KEY) {
        omdbInfo = await getOmdbInfoByTitleOrImdbID(suggestions[i].imdbid)
      }

      if (omdbInfo) {
        if (!suggestions[i].ratings) suggestions[i].ratings = {}
        if (suggestions[i].img === 'N/A') suggestions[i].img = null
        if (omdbInfo.Runtime && omdbInfo.Runtime !== 'N/A') suggestions[i].duration = omdbInfo.Runtime
        if (omdbInfo.Rated && ['N/A', 'Not Rated'].indexOf(omdbInfo.Rated) === -1) {
          suggestions[i].fsk = omdbInfo.Rated
        }
        if (omdbInfo.Actors && omdbInfo.Actors !== 'N/A') suggestions[i].actors = omdbInfo.Actors.split(', ')
        if (!suggestions[i].img && omdbInfo.Poster) suggestions[i].img = omdbInfo.Poster
        if (omdbInfo.Metascore && omdbInfo.Metascore !== 'N/A') {
          suggestions[i].ratings.metacritic = omdbInfo.Metascore
        }
        if (omdbInfo.imdbRating && omdbInfo.imdbRating !== 'N/A') {
          suggestions[i].ratings.imdb = omdbInfo.imdbRating
        }
        if (omdbInfo.Ratings) {
          const rotten = omdbInfo.Ratings.filter(item => item.Source === 'Rotten Tomatoes')
          if (rotten.length > 0) suggestions[i].ratings.rotten = rotten[0].Value
        }

        if (Object.keys(suggestions[i].ratings).length === 0) delete suggestions[i].ratings
      }

      if (suggestions[i].img === 'N/A') suggestions[i].img = null
      if (suggestions[i].duration === 'N/A') suggestions[i].duration = null
    }

    if (suggestions.length > 0) {
      await db.saveImdbSuggestions({
        encodedUriTitle: encodeURIComponent(title),
        suggestions: suggestions.map(movie => movie.imdbid)
      })
      await Promise.all(
        suggestions.map(movie => db.saveImdbMovie(movie))
      )
    }

    logger.debug('[MATCHER] IMDB Suggestions:', suggestions?.length)
    return suggestions
  } catch (err) {
    logger.error('[MATCHER] IMDB ERROR', err)
    return []
  }
}

/**
 * Get imdb movie suggestions for given title by api
 * @param {String} title of the movie to get suggestions for
 * @returns {Object[]} Array of movie objects
 */
async function getImdbSuggestionsForTitleByApi (title) {
  try {
    const { data } = await axios.get(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(title)}.json`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        accept: 'application/json, text/plain, */*',
        'accept-language': 'de-DE,de;q=0.6',
        priority: 'u=1, i',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-gpc': '1',
        'x-imdb-pace-migration': 'true',
        Referer: 'https://www.imdb.com/de/'
      }
    })
    let suggestions = []

    for (let i = 0; i < data.d.length; i++) {
      const entry = data.d[i]
      suggestions.push({
        title: entry.l,
        imdbid: entry.id,
        type: entry.qid,
        year: entry.y,
        img: entry?.i?.imageUrl?.replace('_V1_', '_V1_QL300_UX200_') || null,
        actors: entry.s.split(', ')
      })
    }
    suggestions = suggestions
      .filter(movie => ['movie', 'tvMovie'].indexOf(movie.type) > -1)
      .map(movie => {
        delete movie.type
        return movie
      })
    return suggestions
  } catch (err) {
    logger.error('[MATCHER] IMDB API request:', err.message)
    logger.error(err)
    return []
  }
}

/**
 * Get imdb movie suggestions for given title by search
 * @param {String} title of the movie to get suggestions for
 * @returns {Object[]} Array of movie objects
 */
async function getImdbSuggestionsForTitleBySearch (title) {
  try {
    const { data: searchPageHtml } = await axios.get(`https://www.imdb.com/de/find/?q=${encodeURIComponent(title)}&s=tt&ttype=ft&ref_=fn_mov`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'de-DE,de;q=0.6',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        priority: 'u=0, i',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'sec-gpc': '1',
        'upgrade-insecure-requests': '1',
        cookie: 'lc-main=de_DE'
      },
      referrer: 'https://www.imdb.com/',
      signal: AbortSignal.timeout(8_000)
    })

    const suggestions = getSuggestionsFromHtml(searchPageHtml)
    return suggestions
  } catch (err) {
    logger.error('[MATCHER] IMDB Search request:', err.message)
    logger.error(err)
    return []
  }
}

/**
 * Converts imdb search page html to movie objects
 * @param {String} websiteHtml hrml of imdb search page
 * @returns {Object[]} Array of movie objects
 */
function getSuggestionsFromHtml (websiteHtml) {
  try {
    const { document: websiteAsElement } = parseHTML(websiteHtml)
    const suggestionElements = websiteAsElement.querySelectorAll('section[data-testid="find-results-section-title"] div.li-compact')
    const movies = Array.from(suggestionElements)
      .map(card => {
        const titleLinkElement = card.querySelector('a.ipc-title-link-wrapper')
        const titleElement = titleLinkElement?.querySelector('h3') || null
        const metaArray = card.querySelectorAll('.cli-title-metadata-item').map(el => el.textContent.trim())

        const movie = {
          title: titleElement?.textContent.trim() || null,
          imdbid: titleLinkElement?.getAttribute('href')?.replace('/de/title/', '').split('/')[0].trim() || null,
          year: metaArray[0] || null,
          img: card.querySelector('.cli-poster-container img')?.src?.replace(/_V1.+_/, '_V1_QL300_UX200_') || null,
          ratings: {}
        }

        const metacritic = card.querySelector('.metacritic-score-box')?.textContent.trim() || null
        if (metacritic) movie.ratings.metacritic = metacritic
        const imdb = card.querySelector('.ipc-rating-star--rating')?.textContent.trim().replace(',', '.') || null
        if (imdb) movie.ratings.imdb = imdb

        if (metaArray[1]) movie.duration = metaArray[1]
        if (metaArray[2]) movie.fsk = metaArray[2]

        return movie
      })
      .slice(0, 6)

    return movies
  } catch (err) {
    logger.error('[MATCHER] IMDB (HTML Parser):', err.message)
    logger.error(err)
    return []
  }
}

async function getFallbackImdbInfoForId (imdbid) {
  let movieObject = null
  try {
    const suggestionArray = await getImdbSuggestionsForTitleByApi(imdbid)
    movieObject = suggestionArray.filter(entry => entry.imdbid === imdbid)[0]

    try {
      const { data: websiteHtml } = await axios.get(`https://www.imdb.com/de/title/${imdbid}/`, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'accept-language': 'de-DE,de;q=0.6',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
          priority: 'u=0, i',
          'sec-ch-ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Linux"',
          'sec-fetch-dest': 'document',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-site': 'same-origin',
          'sec-fetch-user': '?1',
          'sec-gpc': '1',
          'upgrade-insecure-requests': '1',
          cookie: 'lc-main=de_DE'
        },
        referrer: `https://www.imdb.com/title/${imdbid}/?ref_=nv_sr_srsg_0_tt_3_nm_0_in_0_q_${imdbid}`,
        signal: AbortSignal.timeout(8_000)
      })

      const { document: websiteAsElement } = parseHTML(websiteHtml)
      const infoJsonString = websiteAsElement.querySelector('script[type="application/ld+json"]').innerHTML
      const info = JSON.parse(infoJsonString)

      if (info.alternateName) movieObject.title = info.alternateName
      else if (info.name) movieObject.title = info.name

      if (info.description) movieObject.description = info.description
      if (info.genre?.length > 0) movieObject.genres = info.genre
      if (info.aggregateRating?.ratingValue) movieObject.ratings = { imdb: `${info.aggregateRating.ratingValue}` }

      if (info.actor?.length > 0) {
        movieObject.actors = []
        for (let i = 0; i < info.actor.length; i++) {
          if (info.actor[i]['@type'] === 'Person') {
            movieObject.actors.push(info.actor[i].name)
          }
        }
      }
      if (info.director?.length > 0) {
        movieObject.director = []
        for (let i = 0; i < info.director.length; i++) {
          if (info.director[i]['@type'] === 'Person') {
            movieObject.director.push(info.director[i].name)
          }
        }
      }
    } catch (e) {
      logger.error(e)
    }

    return movieObject
  } catch (err) {
    logger.error('[MATCHER] UMDB ERROR', err.message)
    if (err.message !== 'canceled') logger.error(err)
    return null
  }
}

module.exports = {
  getImdbSuggestionsForTitle,
  getFallbackImdbInfoForId
}
