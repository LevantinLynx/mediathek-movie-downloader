const logger = require('./logger.js')
const path = require('path')
const YTDlpWrap = require('yt-dlp-wrap').default
const db = require('./database.js')
const _ = require('lodash')
const { serverEvents } = require('./server.js')
const { sleep, sanitizeFileAndDirNames, getIso639Info } = require('./helperFunctions.js')
const { downloadPostProcessing } = require('./postProcessing.js')

async function checkForScheduledDownloads () {
  const settings = await db.getAllSettings()
  const maxConcurrentDownloads = settings.maxDownloads || 3

  logger.debug('[DOWNLOADER] Checking for scheduled downloads...')
  const currentDate = new Date()
  const schedule = await db.getScheduleData()
  for (let i = 0; i < schedule.length; i++) {
    const movie = schedule[i]
    // Check only entries that are not marked as in progress
    if (!movie.inProgress) {
      // Skip if max downloads are reached
      const currentDownloadsInProgressCount = await db.getScheduleEntryInProgressCount()
      if (
        maxConcurrentDownloads > 0 &&
        currentDownloadsInProgressCount >= maxConcurrentDownloads
      ) {
        logger.debug(`[DOWNLOADER] Maximum concurrent downloads of "${maxConcurrentDownloads}" reached. Will resume once at least one download has finished.`)
        return
      }

      // check if movie scheduled date is reached
      if (
        movie.failCount < movie.scheduleDates.length &&
        movie.scheduleDates[movie.failCount] < currentDate
      ) {
        logger.debug('[DOWNLOADER] Starting movie scheduled for download:', movie.downloadUrl)
        downloadMovie(movie)
        await sleep(250)
      }
    }
  }
}

async function downloadMovie (movie) {
  try {
    const settings = await db.getAllSettings()
    await db.setScheduleEntryInProgress(movie, true)

    movie.baseDownloadPath = path.join(__dirname, '..', 'downloads', sanitizeFileAndDirNames(settings.removeSpacesFromDirNames ? movie.title.replace(/ /g, '_') : movie.title))

    // Download movie via yt-dlp
    await ytDlpDownloader(movie)

    // Add movie to finished download index
    await db.setFinishedMovieState(movie, true)
    // Remove movie from schedule
    await db.deleteScheduleEntry(movie.apiID)

    // Post processing and cleanup
    await downloadPostProcessing(movie)
  } catch (err) {
    await db.setScheduleEntryInProgress(movie, false, movie.failCount + 1)
    logger.error(err)
  } finally {
    // remove progress cache info
    db.deleteDownloadProgressCacheEntry(movie.apiID)
    // Stop cron job for progress updates
    serverEvents.emit('stopDownloadProgressJob')
  }
}

function ytDlpDownloader (movie) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    // Initialize yt-dlp instance
    const ytDlp = new YTDlpWrap(path.join(__dirname, 'bin', 'yt-dlp'))

    let downloadOptions = []
    try {
      downloadOptions = await getParametersForYtdlp(movie, ytDlp)
    } catch (err) {
      logger.error(err)
      reject(err)
    }

    // Start cron job for progress updates if it's not running
    serverEvents.emit('startDownloadProgressJob')

    // Try downloading movie
    ytDlp
      .exec(downloadOptions)
      .on('ytDlpEvent', (eventType, eventData) => {
        // logger.debug('[YT-DLP]', ytDlpEventEmitter.ytDlpProcess.pid, eventType, eventData, movie.title)
        if (eventType === 'download') {
          const data = eventData.split(/of|at|ETA|\(part/).map(part => part.trim())
          db.updateDownloadProgressEntry({
            apiID: movie.apiID,
            percent: `${parseFloat(data[0])}`.split('.')[0],
            size: data[1],
            speed: data[2],
            eta: data[3]
          })
        }
      })
      .on('error', error => reject(error))
      .on('close', () => resolve())
  })
}

async function getParametersForYtdlp (movie, ytDlp) {
  const settings = await db.getAllSettings()
  // Create download parameters
  const downloadOptions = [
    movie.downloadUrl, // Add url to the movie
    '-P', movie.baseDownloadPath // Directory to download to
  ]

  if (!ytDlp) ytDlp = new YTDlpWrap(path.join(__dirname, 'bin', 'yt-dlp'))
  const audioList = []

  if (movie.channel === 'arte') {
    // ///////////////////////////////////////////////////// //
    //                          ARTE                         //
    //                                                       //
    // @INFO: Arte only check is required, because arte does //
    // not work with getVideoInfo aka. --dump-json option    //
    // ///////////////////////////////////////////////////// //
    const rawInfo = await ytDlp.execPromise([movie.downloadUrl, '-F'])
    logger.debug('[DOWNLOADER] ARTE WORKAROUND INFO DATA')
    logger.debug(rawInfo)

    // Add download parameters
    if (rawInfo.indexOf(' audio only ') > -1 && rawInfo.indexOf(' video only ') > -1) {
      const lines = rawInfo
        .split(/-{80,999}/)[1]
        .split('\n')
        .map(line => line.replace(/\s+/g, ' '))

      let audio = []
      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i]
        if (currentLine.indexOf('audio only') > -1) {
          const language = currentLine.match(/\[([a-z]{2,3})\]/)
          const orderNumber = `000${i}`.slice(-4)

          let sortKey = 'A'
          if (currentLine.indexOf('_Audiodeskription_') > -1) sortKey = 'Z'
          else if (currentLine.indexOf('_Klare_Sprache_') > -1) sortKey = 'X'

          let shouldAddAudio = true
          if (sortKey === 'Z' && !settings.includeAudioTranscription) shouldAddAudio = false
          if (sortKey === 'X' && !settings.includeClearLanguage) shouldAddAudio = false

          if (shouldAddAudio) {
            audio.push({
              id: currentLine.split(' ')[0],
              lang: language?.[1],
              order: `${sortKey}${language?.[1].toUpperCase()}${orderNumber}`
            })
          }
        }
      }
      audio = _.sortBy(audio, ['order'])

      if (audio.length > 1) {
        // Enable multiple audio streams in final file
        downloadOptions.push('--audio-multistreams')
        // Format selector
        downloadOptions.push('-f')

        let formatOptionString = await getFfmpegVideoResolutionOption()
        logger.debug('[DOWNLOADER] settings?.preferedDownloadLanguage', settings?.preferedDownloadLanguage)
        if (settings?.preferedDownloadLanguage) {
          const preferedAudio = audio.filter(a => a.lang === settings.preferedDownloadLanguage)
          for (let i = 0; i < preferedAudio.length; i++) {
            formatOptionString += `+${preferedAudio[i].id}`
            audioList.push({ ...preferedAudio[i] })
          }
          const remainingAudio = audio.filter(a => a.lang !== settings.preferedDownloadLanguage)
          for (let i = 0; i < remainingAudio.length; i++) {
            formatOptionString += `+${remainingAudio[i].id}`
            audioList.push({ ...remainingAudio[i] })
          }
        } else {
          for (let i = 0; i < audio.length; i++) {
            formatOptionString += `+${audio[i].id}`
            audioList.push({ ...audio[i] })
          }
        }

        // Add format options
        downloadOptions.push(formatOptionString)
      }
    }
  } else if (['zdf', 'zdfneo'].indexOf(movie.channel) > -1) {
    // Get video info
    const info = await ytDlp.getVideoInfo(downloadOptions)
    logger.debug(JSON.stringify(info))

    // Add download parameters
    // Check if audio only formats exist and download multi audiostreams if possible
    const audioOnlyFormats = info?.formats?.filter(format => format.vcodec === 'none') || []
    // Get all available audio only language codes
    const audioOnlyLanguages = _.uniqBy(
      audioOnlyFormats.map(format => {
        return {
          id: format.format_id.replace(/[0-9]+/g, ''),
          lang: format.language
        }
      }),
      'lang'
    )
    logger.debug('[YT-DLP] Available audio languages:', audioOnlyLanguages)

    if (audioOnlyFormats.length > 0 && audioOnlyLanguages.length > 1) {
      // Enable multiple audio streams in final file
      downloadOptions.push('--audio-multistreams')
      // Format selector
      downloadOptions.push('-f')

      let formatOptionString = await getFfmpegVideoResolutionOption()

      if (settings?.preferedDownloadLanguage) {
        const preferedAudio = audioOnlyLanguages.filter(a => a.lang === settings.preferedDownloadLanguage)
        for (let i = 0; i < preferedAudio.length; i++) {
          formatOptionString += `+ba[language=${preferedAudio[i].lang}]`
          audioList.push(preferedAudio[i])
        }
        const remainingAudio = audioOnlyLanguages.filter(a => a.lang !== settings.preferedDownloadLanguage)
        for (let i = 0; i < remainingAudio.length; i++) {
          formatOptionString += `+ba[language=${remainingAudio[i].lang}]`
          audioList.push(remainingAudio[i])
        }
      } else {
        for (let i = 0; i < audioOnlyLanguages.length; i++) {
          formatOptionString += `+ba[language=${audioOnlyLanguages[i].lang}]`
          audioList.push(audioOnlyLanguages[i])
        }
      }

      // Add format options
      downloadOptions.push(formatOptionString)
    }
  }

  if (audioList.length > 0) await createAudioAndPostProcessingFiles(movie, audioList)

  if (downloadOptions.indexOf('-f') === -1 && settings.downloadResolutionLimit !== 'none') {
    // Format selector
    downloadOptions.push('-f')
    downloadOptions.push(await getFfmpegVideoResolutionOption())
  }

  // Rate limit for download
  downloadOptions.push(`--limit-rate=${settings.maxDownloadRate || '1'}${settings.maxDownloadRateUnit || 'M'}`)
  // Download all available subtitles
  if (settings?.includeSubtitles) downloadOptions.push('--all-subs')

  logger.debug('[YT-DLP] download options', downloadOptions)

  return downloadOptions
}

async function getFfmpegVideoResolutionOption () {
  const settings = await db.getAllSettings()
  logger.debug('getFfmpegVideoResolutionOption', settings)
  const downloadResolutionLimit = settings.downloadResolutionLimit || 'none'
  switch (downloadResolutionLimit) {
    case 'none': return 'best*[height<=9999]'
    case '2160': return 'best*[height<=2160]'
    case '1080': return 'best*[height<=1080]'
    case '720': return 'best*[height<=720]'
    case '540': return 'best*[height<=540]'
    case '360': return 'best*[height<=360]'

    default:
      return 'best*[height<=9999]'
  }
}

async function createAudioAndPostProcessingFiles (movie, audioList) {
  const audioJson = []

  for (let i = 0; i < audioList.length; i++) {
    const { id: audioID, lang: isoLangCode } = audioList[i]
    logger.debug(audioID, isoLangCode)
    const isoCodeInfo = getIso639Info(isoLangCode)
    logger.debug(isoCodeInfo, typeof isoLangCode, isoLangCode)

    const audioEntry = {
      iso_639_1: isoLangCode,
      audioID
    }

    if (isoCodeInfo) {
      audioEntry.iso_639_1 = isoCodeInfo.iso_639_1
      audioEntry.iso_639_2 = isoCodeInfo.iso_639_2
      audioEntry.title = `${isoCodeInfo.german}`

      if (audioID.indexOf('_Audiodeskription_') > -1) audioEntry.title += ' (Audiodeskription)'
      else if (audioID.indexOf('_Klare_Sprache_') > -1) audioEntry.title += ' (klare Sprache)'
      else if (audioID.indexOf('Originalton') > -1) audioEntry.title += ' (Originalton)'
    }
    audioJson.push(audioEntry)
  }

  await Bun.write(
    path.join(movie.baseDownloadPath, `audio_info_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.json`),
    JSON.stringify(audioJson)
  )

  let substitudeString = ''
  for (let i = 0; i < audioJson.length; i++) {
    substitudeString += ` -metadata:s:a:${i} language=${audioJson[i].iso_639_2} -metadata:s:a:${i} title="${audioJson[i].title}"`
  }

  let ffmpegAudioTitleString = `#!/bin/sh
cd "${movie.baseDownloadPath}"

for file in *.mkv ; do
  # get only file name without extention
  filename="\${file%.*}"
  # set the first audio track to english and the second one to german
  ffmpeg -i "$file" -map 0 -c copy${substitudeString} "$filename.audio_taged.mkv"
  mv -v "$filename.audio_taged.mkv" "$file"
done`

  ffmpegAudioTitleString += `
for filename in *.vtt; do
  fname="\${filename%.*}"
  ffmpeg -i "$filename" "$fname.srt"
done

find . -size 0 -delete`

  await Bun.write(
    path.join(movie.baseDownloadPath, `audio_rename_script_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.sh`),
    ffmpegAudioTitleString
  )
}

module.exports = {
  checkForScheduledDownloads
}
