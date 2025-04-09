const { addHours, formatDate, addDays } = require('date-fns')
const db = require('./database.js')
const logger = require('./logger.js')

async function scheduleDownloadByIdAndChannel (apiID, channel) {
  try {
    const metaData = await db.getAvailableMovieMetaData()
    const channelData = metaData.filter(x => x.channel === channel)[0].movies
    const movieData = channelData.filter(x => x.apiID === apiID)[0]

    const scheduleObject = {
      apiID,
      channel,
      title: movieData.title,
      downloadUrl: movieData.url,
      scheduleDates: getScheduleDates(movieData),
      failed: false,
      failCount: 0
    }

    logger.debug(scheduleObject)
    db.addScheduleEntry(scheduleObject)

    return { ok: true, title: movieData.title }
  } catch (err) {
    logger.error(err)
    return { error: `Error while scheduling download for "${apiID}" - ${channel}` }
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
  scheduleDownloadByIdAndChannel
}
