const { addHours, formatDate, addDays } = require('date-fns')
const db = require('./database.js')
const logger = require('./logger.js')

async function scheduleDownloadByMovieID (movieID) {
  try {
    const movie = await db.getMovieMetaDataByID(movieID)

    const scheduleObject = {
      id: movie.id,
      title: movie.title,
      channel: movie.channel,
      downloadUrl: movie.url,
      scheduleDates: getScheduleDates(movie),
      failed: false,
      failCount: 0
    }

    db.addScheduleEntry(scheduleObject)
    logger.debug('[SCHEDULER] scheduleObject', scheduleObject)

    return { ok: true, title: movie.title }
  } catch (err) {
    logger.error(err)
    return { error: `Error while scheduling download for "${movieID}".` }
  }
}

function getScheduleDates (movie) {
  const schedule = []
  if (movie.time.type === 'untill') {
    // 10 minute offset - some sites have some delay on their age restricted content
    if (movie.restrictions?.indexOf('FSK16') > -1) schedule.push(new Date(`${formatDate(new Date(), 'yyyy-MM-dd')}T22:10:00.000`))
    else if (movie.restrictions?.indexOf('FSK18') > -1) schedule.push(new Date(`${formatDate(new Date(), 'yyyy-MM-dd')}T23:10:00.000`))
    else schedule.push(new Date())

    schedule.push(addHours(schedule[0], 1))
    schedule.push(addHours(schedule[0], 2))
    schedule.push(addDays(schedule[0], 2))

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
