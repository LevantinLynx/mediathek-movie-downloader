const { addHours, formatDate, addDays } = require('date-fns')
const db = require('./database.js')
const logger = require('./logger.js')
const { sanitizeFileAndDirNames } = require('./helperFunctions.js')
const { getFallbackTmdbInfoForId } = require('./matcher/tmdb.js')
const { getTmdbMovieInfoByID } = require('./matcher/tmdbApi.js')
const { getFallbackImdbInfoForId } = require('./matcher/imdb.js')
const { getOmdbInfoByImdbID } = require('./matcher/omdb.js')

async function scheduleDownloadByMovieID (info) {
  try {
    const settings = await db.getAllSettings()
    const movie = await db.getMovieMetaDataByID(info.movieID)
    const scheduleObject = {
      id: movie.id,
      title: movie.title,
      channel: movie.channel,
      downloadUrl: movie.url,
      scheduleDates: getScheduleDates(movie),
      failed: false,
      failCount: 0
    }

    let matchType = null
    if (info?.match?.match(/^(t{2})?\d{1,12}$/)) {
      matchType = (info?.match?.indexOf('tt') === 0) ? 'imdb' : 'tmdb'
    }

    let imdbMovie = null
    let tmdbMovie = null
    let omdbMovie = null

    if (matchType) {
      const platformMatchingInfo = await db.getPlatformMatchingInfoFromDB(info.match)
      if (platformMatchingInfo) {
        scheduleObject.extraInfo = {
          tmdbid: platformMatchingInfo.tmdbid,
          imdbid: platformMatchingInfo.imdbid
        }
        tmdbMovie = await db.getTmdbMovieByID(platformMatchingInfo.tmdbid)
        imdbMovie = await db.getImdbMovieByID(platformMatchingInfo.imdbid)
        omdbMovie = await db.getOmdbInfoFromDB(platformMatchingInfo.imdbid)
      } else {
        scheduleObject.extraInfo = {}
        scheduleObject.extraInfo[`${matchType}id`] = info.match

        if (matchType === 'tmdb') {
          tmdbMovie = await db.getTmdbMovieByID(info.match)
          if (tmdbMovie?.imdbid) {
            imdbMovie = await db.getImdbMovieByID(tmdbMovie.imdbid)
            if (!omdbMovie) omdbMovie = await db.getOmdbInfoFromDB(tmdbMovie.imdbid)
          }
        } else if (matchType === 'imdb') {
          imdbMovie = await db.getImdbMovieByID(info.match)
          if (!omdbMovie) omdbMovie = await db.getOmdbInfoFromDB(info.match)
        }
      }

      if (matchType === 'tmdb' && !tmdbMovie) {
        // get info via api or scrape as fallback
        if (process.env.TMDB_API_READ_ACCESS_TOKEN) tmdbMovie = await getTmdbMovieInfoByID(info.match)
        else tmdbMovie = await getFallbackTmdbInfoForId(info.match)

        if (tmdbMovie?.imdbid && !omdbMovie && process.env.OMDB_API_KEY) {
          omdbMovie = await getOmdbInfoByImdbID(tmdbMovie.imdbid)
        }
      }

      if (matchType === 'imdb' && !imdbMovie) {
        // get info via omdb or scrape imdb as fallback
        if (!imdbMovie) imdbMovie = await getFallbackImdbInfoForId(info.match)
        if (!omdbMovie && process.env.OMDB_API_KEY) {
          omdbMovie = await getOmdbInfoByImdbID(info.match)
        }
      }

      if (tmdbMovie) {
        if (!scheduleObject.extraInfo.tmdbid && tmdbMovie.tmdbid) scheduleObject.extraInfo.tmdbid = tmdbMovie.tmdbid
        if (!scheduleObject.extraInfo.imdbid && tmdbMovie.imdbid) scheduleObject.extraInfo.tmdbid = tmdbMovie.imdbid
        if (!scheduleObject.extraInfo.year && tmdbMovie.year) scheduleObject.extraInfo.year = tmdbMovie.year
        if (!scheduleObject.extraInfo.release && tmdbMovie.releaseDate) scheduleObject.extraInfo.release = tmdbMovie.releaseDate
        if (!scheduleObject.extraInfo.title && tmdbMovie.title) scheduleObject.extraInfo.title = tmdbMovie.title
        if (!scheduleObject.extraInfo.originalTitle && tmdbMovie.originalTitle) scheduleObject.extraInfo.originalTitle = tmdbMovie.originalTitle
        if (!scheduleObject.extraInfo.plot && tmdbMovie.info) scheduleObject.extraInfo.plot = tmdbMovie.info
        if (!scheduleObject.extraInfo.genres && tmdbMovie.genres?.length > 0) scheduleObject.extraInfo.genres = tmdbMovie.genres
        if (!scheduleObject.extraInfo.ratings && Object.keys(tmdbMovie.ratings || {}).length > 0) {
          scheduleObject.extraInfo.ratings = tmdbMovie.ratings
        }
      }

      if (imdbMovie) {
        if (!scheduleObject.extraInfo.imdbid && imdbMovie.imdbid) scheduleObject.extraInfo.imdbid = imdbMovie.imdbid
        if (!scheduleObject.extraInfo.year && imdbMovie.year) scheduleObject.extraInfo.year = imdbMovie.year
        if (!scheduleObject.extraInfo.title && imdbMovie.title) scheduleObject.extraInfo.title = imdbMovie.title
        if (!scheduleObject.extraInfo.runtime && imdbMovie.duration) scheduleObject.extraInfo.runtime = parseInt(imdbMovie.duration.split(' ')[0])
        if (!scheduleObject.extraInfo.actors && imdbMovie.actors?.length > 0) scheduleObject.extraInfo.actors = imdbMovie.actors
        if (!scheduleObject.extraInfo.genres && imdbMovie.genres?.length > 0) scheduleObject.extraInfo.genres = imdbMovie.genres
        if (!scheduleObject.extraInfo.ratings && Object.keys(imdbMovie.ratings || {}).length > 0) {
          scheduleObject.extraInfo.ratings = imdbMovie.ratings
        }
      }

      if (omdbMovie) {
        if (!scheduleObject.extraInfo.runtime && omdbMovie.Runtime) scheduleObject.extraInfo.runtime = parseInt(omdbMovie.Runtime.split(' ')[0])
        if (!scheduleObject.extraInfo.release && omdbMovie.Released) scheduleObject.extraInfo.release = omdbMovie.Released
        if (!scheduleObject.extraInfo.plot && omdbMovie.Plot) scheduleObject.extraInfo.plot = omdbMovie.Plot
        if (!scheduleObject.extraInfo.country && omdbMovie.Country) scheduleObject.extraInfo.country = omdbMovie.Country
        if (!scheduleObject.extraInfo.director && omdbMovie.Director) scheduleObject.extraInfo.director = omdbMovie.Director.split(', ')
        if (!scheduleObject.extraInfo.writer && omdbMovie.Writer) scheduleObject.extraInfo.writer = omdbMovie.Writer.split(', ')
        if (!scheduleObject.extraInfo.actors && omdbMovie.Actors) scheduleObject.extraInfo.actors = omdbMovie.Actors.split(', ')
        if (!scheduleObject.extraInfo.genres && omdbMovie.Genre) scheduleObject.extraInfo.genres = omdbMovie.Genre.split(', ')
        if (!scheduleObject.extraInfo.year && omdbMovie.Genre) scheduleObject.extraInfo.year = omdbMovie.Year
        if (!scheduleObject.extraInfo.imdbid && omdbMovie.imdbID) scheduleObject.extraInfo.imdbid = omdbMovie.imdbID
      }

      // Generate file and dir name based on settings and available meta data
      let downloadTitle = `${scheduleObject.extraInfo.title}`
      switch (settings.fileAndFolderNaming) {
        case 'jellyfin':
          // https://jellyfin.org/docs/general/server/metadata/identifiers/
          if (scheduleObject.extraInfo.year) downloadTitle += ` (${scheduleObject.extraInfo.year})`
          if (scheduleObject.extraInfo.tmdbid) downloadTitle += ` [tmdbid-${scheduleObject.extraInfo.tmdbid}]`
          if (scheduleObject.extraInfo.imdbid) downloadTitle += ` [imdbid-${scheduleObject.extraInfo.imdbid}]`
          break
        case 'plex':
          if (scheduleObject.extraInfo.year) downloadTitle += ` (${scheduleObject.extraInfo.year})`
          // According to https://support.plex.tv/articles/naming-and-organizing-your-movie-media-files/
          // "So long as you’re using the current “Plex Movie” metadata agent for the library, you can also
          // include the IMDb or TheMovieDB ID number in curly braces to help match the movie. It must follow the form {[source]-[id]}."
          // Check for preferenced matcher in settings
          if (settings.defaultMatcher === 'tmdb') {
            if (scheduleObject.extraInfo.tmdbid) downloadTitle += ` {tmdb-${scheduleObject.extraInfo.tmdbid}}`
            else if (scheduleObject.extraInfo.imdbid) downloadTitle += ` {imdb-${scheduleObject.extraInfo.imdbid}}`
          } else {
            if (scheduleObject.extraInfo.imdbid) downloadTitle += ` {imdb-${scheduleObject.extraInfo.imdbid}}`
            else if (scheduleObject.extraInfo.tmdbid) downloadTitle += ` {tmdb-${scheduleObject.extraInfo.tmdbid}}`
          }
          break
        case 'no_space':
          if (scheduleObject.extraInfo.year) downloadTitle += ` (${scheduleObject.extraInfo.year})`
          downloadTitle = downloadTitle.replace(/ /g, '_')
          break

        default: // also 'none'
          downloadTitle = scheduleObject.title
          break
      }

      if (!scheduleObject.extraInfo.title) {
        throw new Error('No movie title for schedule!')
      }

      scheduleObject.extraInfo.downloadTitle = sanitizeFileAndDirNames(downloadTitle)
    } else {
      // Fallback title provided by the tv channel
      scheduleObject.extraInfo = {
        downloadTitle: sanitizeFileAndDirNames(
          settings.fileAndFolderNaming === 'no_space'
            ? scheduleObject.title.replace(/ /g, '_')
            : scheduleObject.title
        )
      }
    }

    db.addScheduleEntry(scheduleObject)
    logger.debug('[SCHEDULER] scheduleObject', scheduleObject)

    return { ok: true, title: movie.title }
  } catch (err) {
    logger.error(err)
    return { error: `Error while scheduling download for "${info.movieID}".` }
  }
}

function getScheduleDates (movie) {
  const schedule = []
  if (movie.time.type === 'untill') {
    // 10 minute offset - some sites have some delay on their age restricted content
    if (movie.restrictions?.indexOf('FSK16') > -1) schedule.push(new Date(`${formatDate(new Date(), 'yyyy-MM-dd')}T22:10:00.000`))
    else if (movie.restrictions?.indexOf('FSK18') > -1) schedule.push(new Date(`${formatDate(new Date(), 'yyyy-MM-dd')}T23:10:00.000`))
    else schedule.push(new Date())

    const originalDate = schedule[0]
    const datePlusOneHours = addHours(originalDate, 1)
    const datePlusTwoHours = addHours(originalDate, 2)

    schedule.push(datePlusOneHours)
    schedule.push(datePlusTwoHours)

    schedule.push(addDays(originalDate, 1))
    schedule.push(addDays(datePlusOneHours, 1))
    schedule.push(addDays(datePlusTwoHours, 1))

    schedule.push(addDays(originalDate, 2))
    schedule.push(addDays(datePlusOneHours, 2))
    schedule.push(addDays(datePlusTwoHours, 2))

    return schedule
  }

  return [
    addHours(movie.time.date, 2),
    addHours(movie.time.date, 3),
    addDays(addHours(movie.time.date, 2), 1),
    addDays(addHours(movie.time.date, 3), 1)
  ]
}

module.exports = {
  scheduleDownloadByMovieID
}
