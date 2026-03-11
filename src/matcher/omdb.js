const logger = require('../logger.js')
const {
  axiosWithTimeouts: axios
} = require('../helperFunctions.js')
const {
  getOmdbInfoFromDB,
  saveOmdbInfoToDB
} = require('../database.js')

const OMDB_REQUEST_TIMOUT_IN_MS = 15_000

/**
 *
 * @param {String} searchString movie title or imdbid
 * @returns {Object | null}
 */
async function getOmdbInfoByTitleOrImdbID (searchString) {
  if (!searchString) return null
  let suggestion = null
  if (!process.env.OMDB_API_KEY) {
    logger.debug('[MATCHER] OMDB No API Key found skipping!')
    return suggestion
  }
  try {
    const cacheInfo = await getOmdbInfoFromDB(searchString)
    if (cacheInfo) return cacheInfo

    if (searchString.indexOf('tt') === 0) {
      suggestion = await getOmdbInfoByImdbID(searchString)
    } else {
      suggestion = await getOmdbInfoByTitle(searchString)
    }
  } catch (err) {
    logger.error(err)
  }

  return suggestion
}

/**
 * Get OMdb movie object by movie title
 * @param {String} title of movie to get info for
 * @returns {Object | null} movie object
 */
async function getOmdbInfoByTitle (title) {
  try {
    if (!process.env.OMDB_API_KEY) {
      logger.debug('[MATCHER] OMDB No API Key found skipping!')
      return null
    }

    const { data } = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${process.env.OMDB_API_KEY}`, {
      signal: AbortSignal.timeout(OMDB_REQUEST_TIMOUT_IN_MS)
    })

    if (data.imdbID && !data.Error) {
      data.query = encodeURIComponent(title)
      await saveOmdbInfoToDB(data)
    } else {
      logger.info(`[MATCHER] OMDB No match found for "${title}", search query "${encodeURIComponent(title)}". API MSG: "${data?.Error}"`)
      return null
    }

    logger.debug('[MATCHER] OMDB match:', data)
    return data
  } catch (err) {
    logger.error('[MATCHER] OMDB ERROR', err.message)
    if (err.message !== 'canceled') logger.error(err)
    return null
  }
}

/**
 * Get OMdb movie object by movie imdbid
 * @param {String} imdbid of movie to get info for
 * @returns {Object | null} movie object
 */
async function getOmdbInfoByImdbID (imdbid) {
  try {
    if (!process.env.OMDB_API_KEY) {
      logger.debug('[MATCHER] OMDB No API Key found skipping!')
      return null
    }

    const cacheInfo = await getOmdbInfoFromDB(imdbid)
    if (cacheInfo) return cacheInfo

    const { data } = await axios.get(`https://www.omdbapi.com/?i=${imdbid}&apikey=${process.env.OMDB_API_KEY}`, {
      signal: AbortSignal.timeout(OMDB_REQUEST_TIMOUT_IN_MS)
    })

    if (data.imdbID && !data.Error) {
      await saveOmdbInfoToDB(data)
    } else {
      logger.info(`[MATCHER] OMDB No match found for imdb id "${imdbid}". API MSG: "${data?.Error}"`)
      return null
    }

    logger.debug('[MATCHER] OMDB match:', data)
    return data
  } catch (err) {
    logger.error('[MATCHER] OMDB ERROR', err.message)
    if (err.message !== 'canceled') logger.error(err)
    return null
  }
}

module.exports = {
  getOmdbInfoByTitleOrImdbID,
  getOmdbInfoByImdbID
}
