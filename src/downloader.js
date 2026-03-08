const logger = require('./logger.js')
const path = require('path')
const YTDlpWrap = require('./ytDlpWrapper.ts').default
const db = require('./database.js')
const _ = require('lodash')
const { serverEvents } = require('./server.js')
const {
  sleep,
  sanitizeFileAndDirNames,
  getIso639Info,
  sendNotificationToClients
} = require('./helperFunctions.js')
const { downloadPostProcessing } = require('./postProcessing.js')
const { parse: parseDate, formatDate } = require('date-fns')

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
        sendNotificationToClients({
          msg: `Download von "${movie.title || movie.id}" wurde gestartet.`,
          time: 5000
        })
        await sleep(500)
      }
    }
  }
}

async function downloadMovie (movie) {
  try {
    if (!movie.extraInfo?.downloadTitle) throw new Error('No download title provided!')
    await db.setScheduleEntryInProgress(movie, true)

    movie.baseDownloadPath = path.join(__dirname, '..', 'downloads', sanitizeFileAndDirNames(movie.extraInfo.downloadTitle))
    logger.debug('[DOWNLAODER] baseDownloadPath', movie.baseDownloadPath)

    await generateNfoFileForMovie(movie)

    // Download movie via yt-dlp
    await ytDlpDownloader(movie)

    // Add movie to finished download index
    await db.setFinishedMovieState(movie)
    // Remove movie from schedule
    await db.deleteScheduleEntry(movie.id)

    // Post processing and cleanup
    await downloadPostProcessing(movie)
  } catch (err) {
    if (err.message === 'No download title provided!') {
      await db.setScheduleEntryInProgress(movie, false, 9)
      sendNotificationToClients({
        result: 'error',
        msg: `Fehler beim Download von "${movie.title || movie.id}". Error: "${err.message}"`
      })
    } else {
      await db.setScheduleEntryInProgress(movie, false, movie.failCount + 1)
      sendNotificationToClients({
        result: 'error',
        msg: `Fehler beim Download von "${movie.title || movie.id}". Error: "${err.message}"`
      })
    }
    logger.error(err)
  } finally {
    // remove progress cache info
    db.deleteDownloadProgressCacheEntry(movie.id)
    // Stop cron job for progress updates
    serverEvents.emit('stopDownloadProgressJob')
  }
}

async function ytDlpDownloader (movie) {
  let downloadOptions = []

  downloadOptions = await getParametersForYtdlp(movie)

  // Start cron job for progress updates if it's not running
  serverEvents.emit('startDownloadProgressJob')

  // Detect if return contains multi video download instructions (Object return)
  // This is used for ARD channel group since they are unable to host audio and video separately
  if (!Array.isArray(downloadOptions)) {
    const settings = await db.getAllSettings()
    const { multiVideoOptions } = downloadOptions

    // Sadly the ARD does not know how to host subtitles correctly
    // This is neccessary to avoid download fails due to missing or faulty subtitles
    if (settings.includeSubtitles) {
      logger.info(`[YT-DLP] Downloading subtitle files for "${movie.title}" …`)
      try {
        const subtitleOnlyOptions = [
          movie.downloadUrl, // Add url to the movie
          '-P', movie.baseDownloadPath, // Directory to download to
          '-o', `${movie.extraInfo.downloadTitle}.%(ext)s`,
          '--all-subs',
          '--skip-download' // Do not download the video but write all related files
        ]
        await ytDlpDownloadProcess(movie, subtitleOnlyOptions)
      } catch (err) {
        logger.error('[YT-DPL] Subtitle:', err.message)
        logger.info(`You might want to run "yt-dlp --all-dubs --no-download ${multiVideoOptions[0][0]}" manually in the cli to try and download subtitles.`)
      }
    }

    logger.info(`[YT-DLP] Starting multi video download of ${multiVideoOptions.length} files for "${movie.title}" …`)
    for (let i = 0; i < multiVideoOptions.length; i++) {
      await ytDlpDownloadProcess(movie, multiVideoOptions[i], `${i + 1}/${multiVideoOptions.length}`)
    }
  } else {
    await ytDlpDownloadProcess(movie, downloadOptions)
  }
}

function ytDlpDownloadProcess (movie, downloadOptions, countInfo) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    // Initialize yt-dlp instance
    const ytDlp = new YTDlpWrap(path.join(__dirname, 'bin', 'yt-dlp'))

    let fileCount = 0
    let files = []
    // Try downloading movie
    ytDlp
      .exec(downloadOptions)
      .on('ytDlpEvent', (eventType, eventData) => {
        // logger.debug('[YT-DLP]', ytDlpEventEmitter.ytDlpProcess.pid, eventType, eventData, movie.title)
        if (eventType === 'info' && eventData.indexOf('Downloading subtitles') > -1) {
          logger.debug(eventType, eventData)
          files = eventData.split(':').pop().split(',').map(sub => sub.trim())
        }
        if (eventType === 'info' && eventData.indexOf('Downloading 1 format') > -1) {
          logger.debug(eventType, eventData)
          const tracks = eventData.split(':').pop().split('+').map(sub => sub.trim())
          files = [...files, ...tracks]

          logger.debug('files', files)
        }
        if (eventData.indexOf('%') === -1) {
          if (
            // eventData.indexOf('Total fragments') > -1 ||
            eventData.indexOf('has already been downloaded') > -1 ||
            // eventData.indexOf('Writing video subtitles') > -1 ||
            eventData.indexOf('Destination:') > -1
          ) {
            fileCount++
          }
          logger.debug(eventData)
        }
        if (eventType === 'download') {
          const data = eventData.split(/of|at|ETA|\(part/).map(part => part.trim())
          const percent = parseFloat(data[0]).toFixed(1)
          const size = data[1]?.replace('K', ' K').replace('M', ' M').replace('G', ' G').replace('~ ', '~')
          const speed = data[2]?.replace('K', ' K').replace('M', ' M').replace('G', ' G')
          const eta = data[3]?.split(' (')?.[0]
          const fragments = data[3]?.split(' (frag ')?.[1]?.replace(')', '')

          const info = { id: movie.id, countInfo }
          if (data[1]?.length < 16) info.size = data[1]?.replace('K', ' K').replace('M', ' M').replace('G', ' G').replace('~ ', '~')
          if (percent > 0) info.percent = percent
          if (size?.length < 16) info.size = size
          if (speed?.length < 16) info.speed = speed
          if (eta?.length < 16) info.eta = eta
          if (fragments?.length < 16) info.fragments = fragments

          if (Object.keys(files).length > 0) {
            info.files = {
              done: fileCount,
              count: Object.keys(files).length
            }
          }

          db.updateDownloadProgressEntry(info)
        }
      })
      .on('error', error => reject(error))
      .on('close', () => resolve())
  })
}

async function getParametersForYtdlp (movie) {
  const settings = await db.getAllSettings()
  // Create download parameters
  const downloadOptions = [
    movie.downloadUrl, // Add url to the movie
    '-P', movie.baseDownloadPath // Directory to download to
  ]

  // Initialize yt-dlp instance
  const ytDlp = new YTDlpWrap(path.join(__dirname, 'bin', 'yt-dlp'))
  // Get video info
  const info = await ytDlp.getVideoInfo(downloadOptions)
  if (process.env.NODE_ENV === 'development') {
    await Bun.write(
      path.join(movie.baseDownloadPath, `ytdlp_info_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.json`),
      JSON.stringify(info)
    )
  }

  // Check if audio only formats exist and download multi audiostreams if possible
  const audioOnlyFormats = info?.formats?.filter(format => format.vcodec === 'none') || []
  // Get all available audio only language codes
  const audioOnlyLanguages = _.uniqBy(
    audioOnlyFormats.reverse().map(format => {
      return {
        id: format.format_id,
        lang: format.language?.split('-')[0],
        filterID: `${format.format_id.replace(/[0-9]+/g, '')}-${format.language}`
      }
    }),
    'filterID'
  )

  // ARD channel group special case ¯\_(ツ)_/¯
  // They are incapable of hosting video & audio streams correctly
  if (
    audioOnlyFormats.length === 0 &&
    [
      'ard', 'das_erste', 'ard_alpha', 'br', 'hr', 'sr',
      'mdr', 'wdr', 'ndr', 'swr', 'rbb', 'one', 'funk', 'kika'
    ].indexOf(movie.channel) > -1
  ) {
    return await getArdGroupParametersForYtdlp(movie)
  }

  // Ensure output nameing
  downloadOptions.push('-o')
  downloadOptions.push(`${movie.extraInfo.downloadTitle}.%(ext)s`)

  // Add download parameters
  // Filter and sort audio only formats by type
  const audioList = []
  let audioFormats = []
  for (let i = 0; i < audioOnlyLanguages.length; i++) {
    let sortKey = 'A'
    if (
      audioOnlyLanguages[i].id.indexOf('Audiodeskription') > -1 ||
      audioOnlyLanguages[i].filterID.indexOf('audio-description') > -1
    ) {
      sortKey = 'Z'
    } else if (
      audioOnlyLanguages[i].id.indexOf('Klare_Sprache') > -1 ||
      audioOnlyLanguages[i].filterID.indexOf('speech-optimized') > -1
    ) {
      sortKey = 'X'
    }

    let shouldAddAudio = true
    if (sortKey === 'Z' && !settings.includeAudioTranscription) shouldAddAudio = false
    if (sortKey === 'X' && !settings.includeClearLanguage) shouldAddAudio = false

    if (shouldAddAudio) {
      audioFormats.push({
        id: audioOnlyLanguages[i].id,
        lang: audioOnlyLanguages[i].lang,
        type: sortKey,
        order: `${sortKey}${audioOnlyLanguages[i].lang.toUpperCase()}${`000${i}`.slice(-4)}`
      })
    }
  }
  audioFormats = _.sortBy(audioFormats, ['order'])

  logger.debug('[YT-DLP] Available audio languages:', audioFormats)

  if (audioOnlyFormats.length > 0) {
    if (audioFormats.length > 1) {
      // Enable multiple audio streams in final file
      downloadOptions.push('--audio-multistreams')
      // Format selector
      downloadOptions.push('-f')

      let formatOptionString = await getFfmpegVideoResolutionOption()
      const { iso_639_1: iso639v1, iso_639_2: iso639v2 } = getIso639Info(settings.preferedDownloadLanguage)
      const preferedAudioArray = [iso639v1, iso639v2]
      if (settings?.preferedDownloadLanguage) {
        const preferedAudio = audioFormats.filter(a => preferedAudioArray.indexOf(a.lang) > -1)
        for (let i = 0; i < preferedAudio.length; i++) {
          formatOptionString += `+${preferedAudio[i].id}`
          audioList.push(preferedAudio[i])
        }
        const remainingAudio = audioFormats.filter(a => preferedAudioArray.indexOf(a.lang) === -1)
        for (let i = 0; i < remainingAudio.length; i++) {
          formatOptionString += `+${remainingAudio[i].id}`
          audioList.push(remainingAudio[i])
        }
      } else {
        for (let i = 0; i < audioFormats.length; i++) {
          formatOptionString += `+${audioFormats[i].id}`
          audioList.push(audioFormats[i])
        }
      }

      // Add format options
      downloadOptions.push(formatOptionString)
    } else if (audioFormats.length === 1) {
      audioList.push(audioFormats[0])
    }
  } else {
    const formats = [...info.formats].reverse()
    const resolutionLimit = await getResolutionLimitAsInt()
    for (let i = 0; i < formats.length; i++) {
      const format = formats[i]
      if (format.height <= resolutionLimit) {
        audioList.push({
          id: format.format_id,
          lang: format.language
        })
        i = Infinity
      }
    }
  }
  // }

  if (audioList.length > 0) await createAudioAndPostProcessingFiles(movie, audioList)

  if (downloadOptions.indexOf('-f') === -1 && settings.downloadResolutionLimit !== 'none') {
    // Format selector
    downloadOptions.push('-f')
    downloadOptions.push(await getFfmpegVideoResolutionOption())
  }

  // Rate limit for download
  const maxDownloadRate = parseFloat(settings.maxDownloadRate)
  if (typeof maxDownloadRate === 'number' & maxDownloadRate > 0) {
    downloadOptions.push(`--limit-rate=${maxDownloadRate}${settings.maxDownloadRateUnit || 'M'}`)
  }
  // Download all available subtitles
  if (settings?.includeSubtitles) downloadOptions.push('--all-subs')

  logger.debug('[YT-DLP] download options', downloadOptions)

  return downloadOptions
}

async function getResolutionLimitAsInt () {
  const settings = await db.getAllSettings()
  return parseInt(settings.downloadResolutionLimit) || 9999
}

async function getFfmpegVideoResolutionOption () {
  const settings = await db.getAllSettings()
  logger.debug('[DOWNLOADER] getFfmpegVideoResolutionOption', settings)
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

async function getArdGroupParametersForYtdlp (movie) {
  // Initialize yt-dlp instance
  const ytDlp = new YTDlpWrap(path.join(__dirname, 'bin', 'yt-dlp'))

  const settings = await db.getAllSettings()
  const resolutionLimit = await getResolutionLimitAsInt()
  // Rate limit for download
  const maxDownloadRate = parseFloat(settings.maxDownloadRate)

  const multiOptions = {
    files: [],
    multiVideoOptions: []
  }

  // Create download parameters
  const downloadOptions = [
    movie.downloadUrl, // Add url to the movie
    '-P', movie.baseDownloadPath // Directory to download to
  ]

  if (typeof maxDownloadRate === 'number' & maxDownloadRate > 0) {
    downloadOptions.push(`--limit-rate=${maxDownloadRate}${settings.maxDownloadRateUnit || 'M'}`)
  }

  // Get video info
  const info = await ytDlp.getVideoInfo(downloadOptions)
  if (process.env.NODE_ENV === 'development') {
    await Bun.write(
      path.join(movie.baseDownloadPath, `ytdlp_info_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.json`),
      JSON.stringify(info)
    )
  }

  // Ensure output naming
  downloadOptions.push('-o')
  downloadOptions.push(`${movie.extraInfo.downloadTitle}.%(ext)s`)

  // Add download parameters
  // Get all available audio language codes
  const audioLanguages = _.uniqBy(
    [...(info?.formats || [])]
      .reverse()
      .map(format => {
        return {
          id: format.format_id,
          lang: format.language
        }
      }),
    'lang'
  )
  logger.debug('[YT-DLP] Available audio languages:', audioLanguages)

  const rawVideoFormats = [...info.formats].reverse()
  const rawAudioFormats = [...info.formats]
  function getVideoForAudioIdentifier (lang, isForAudioExtractionOnly) {
    if (isForAudioExtractionOnly) {
      for (let i = 0; i < rawAudioFormats.length; i++) {
        if (
          rawAudioFormats[i].language === lang &&
          rawAudioFormats[i].height >= 360 &&
          rawAudioFormats[i].protocol === 'm3u8_native'
        ) return rawAudioFormats[i]
      }
      for (let i = 0; i < rawAudioFormats.length; i++) {
        if (
          rawAudioFormats[i].language === lang &&
          rawAudioFormats[i].height >= 540
        ) return rawAudioFormats[i]
      }
    }

    for (let i = 0; i < rawVideoFormats.length; i++) {
      if (
        rawVideoFormats[i].language === lang &&
        rawVideoFormats[i].height <= resolutionLimit
      ) return rawVideoFormats[i]
    }

    logger.debug(`[DOWNLOADER] No format matching "${lang}" was found!`, [...info.formats])
    return null
  }

  let defaultAudioVideo = audioLanguages.filter(entry =>
    entry.lang.indexOf('audio-description') === -1 &&
    entry.lang.indexOf('speech-optimized') === -1
  )
  if (defaultAudioVideo.length === 0) defaultAudioVideo = audioLanguages
  logger.debug('[DOWNLOADER] defaultAudioVideo', defaultAudioVideo)

  // check if prefered audio language is set and available
  // if possible use the prefered language video file
  let videoFile = null
  if (settings?.preferedDownloadLanguage) {
    const { iso_639_1: iso639v1, iso_639_2: iso639v2 } = getIso639Info(settings.preferedDownloadLanguage)
    const preferedAudioArray = [iso639v1, iso639v2]
    const preferedAudio = defaultAudioVideo.filter(a => preferedAudioArray.indexOf(a.lang) > -1)
    if (preferedAudio.length > 0) {
      videoFile = getVideoForAudioIdentifier(preferedAudio[0].lang, false)
    }
  }

  if (videoFile === null) {
    // Use first language entry thats not a special version as default audio & video
    videoFile = getVideoForAudioIdentifier(defaultAudioVideo[0].lang, false)
  }

  // Add video file to options and info
  multiOptions.files.push({
    file: `${videoFile.format_id}_${videoFile.language}.mp4`.replace(' ', '_'),
    language: `${videoFile.language.split('-')[0]}`,
    rawLanguage: `${videoFile.language}`,
    video: true
  })
  const videoFileOptions = [
    ...downloadOptions,
    '-f', `${videoFile.format_id}`,
    '-o', `${videoFile.format_id}_${videoFile.language}.mp4`.replace(' ', '_')
  ]
  multiOptions.multiVideoOptions.push(videoFileOptions)

  // Generate audio lists for remaining languages and extras
  const remainingAudio = audioLanguages
    .filter(entry =>
      entry.lang.indexOf('audio-description') === -1 &&
      entry.lang.indexOf('speech-optimized') === -1 &&
      entry.lang !== videoFile.language
    )
  logger.debug('[DOWNLOADER] remainingAudio', remainingAudio)

  // Audio files
  for (let i = 0; i < remainingAudio.length; i++) {
    const formatObject = getVideoForAudioIdentifier(remainingAudio[i].lang, true)
    multiOptions.files.push({
      file: `${formatObject.format_id}_${formatObject.language}.mp4`.replace(' ', '_'),
      language: `${formatObject.language.split('-')[0]}`,
      rawLanguage: `${formatObject.language}`
    })
    multiOptions.multiVideoOptions.push([
      ...downloadOptions,
      '-f', `${formatObject.format_id}`,
      '-o', `${formatObject.format_id}_${formatObject.language}.mp4`.replace(' ', '_')
    ])
  }

  // Audio clear language files
  if (settings.includeClearLanguage) {
    const audioClearLanguage = audioLanguages
      .filter(entry =>
        entry.lang.indexOf('speech-optimized') > -1 &&
        entry.lang !== videoFile.language
      )
    logger.debug('[DOWNLOADER] audioClearLanguage', audioClearLanguage)
    for (let i = 0; i < audioClearLanguage.length; i++) {
      const formatObject = getVideoForAudioIdentifier(audioClearLanguage[i].lang, true)
      multiOptions.files.push({
        file: `${formatObject.format_id}_${formatObject.language}.mp4`.replace(' ', '_'),
        language: `${formatObject.language.split('-')[0]}`,
        rawLanguage: `${formatObject.language}`
      })
      multiOptions.multiVideoOptions.push([
        ...downloadOptions,
        '-f', `${formatObject.format_id}`,
        '-o', `${formatObject.format_id}_${formatObject.language}.mp4`.replace(' ', '_')
      ])
    }
  }

  // Audio description files
  if (settings.includeAudioTranscription) {
    const audioTranscriptions = audioLanguages
      .filter(entry =>
        entry.lang.indexOf('audio-description') > -1 &&
        entry.lang !== videoFile.language
      )
    logger.debug('[DOWNLOADER] audioTranscriptions', audioTranscriptions)
    for (let i = 0; i < audioTranscriptions.length; i++) {
      const formatObject = getVideoForAudioIdentifier(audioTranscriptions[i].lang, true)
      multiOptions.files.push({
        file: `${formatObject.format_id}_${formatObject.language}.mp4`.replace(' ', '_'),
        language: `${formatObject.language.split('-')[0]}`,
        rawLanguage: `${formatObject.language}`
      })
      multiOptions.multiVideoOptions.push([
        ...downloadOptions,
        '-f', `${formatObject.format_id}`,
        '-o', `${formatObject.format_id}_${formatObject.language}.mp4`.replace(' ', '_')
      ])
    }
  }
  logger.debug('[DOWNLOADER] multiOptions', multiOptions)

  await createMultiFilePostProcessingFiles(movie, multiOptions)

  return multiOptions
}

async function createAudioAndPostProcessingFiles (movie, audioList) {
  const settings = await db.getAllSettings()
  const audioJson = []

  for (let i = 0; i < audioList.length; i++) {
    const { id: audioID, lang: isoLangCode, type } = audioList[i]
    logger.debug('[DOWNLOADER] Audio file & post processing:', audioID, isoLangCode)
    const isoCodeInfo = getIso639Info(isoLangCode)
    logger.debug('[DOWNLOADER] Audio file & post processing:', isoCodeInfo, typeof isoLangCode, isoLangCode)

    const audioEntry = {
      iso_639_1: isoLangCode,
      audioID
    }

    if (isoCodeInfo) {
      audioEntry.iso_639_1 = isoCodeInfo.iso_639_1
      audioEntry.iso_639_2 = isoCodeInfo.iso_639_2
      audioEntry.title = `${isoCodeInfo.german}`

      if (type === 'Z') audioEntry.title += ' (Audiodeskription)'
      else if (type === 'X') audioEntry.title += ' (klare Sprache)'
      else if (
        audioID.indexOf('Originalton') > -1 ||
        audioID.indexOf('_Original_') > -1 ||
        audioID.indexOf('_VO_') > -1
      ) audioEntry.title += ' (Originalton)'
    }
    audioJson.push(audioEntry)
  }

  if (process.env.NODE_ENV === 'development') {
    await Bun.write(
      path.join(movie.baseDownloadPath, `audio_info_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.json`),
      JSON.stringify(audioJson)
    )
  }

  let substitudeString = ''
  for (let i = 0; i < audioJson.length; i++) {
    substitudeString += ` -metadata:s:a:${i} language=${audioJson[i].iso_639_2}`
    substitudeString += ` -metadata:s:a:${i} title="${audioJson[i].title}"`
  }

  const ffmpegAudioTitleString = `#!/bin/sh
cd "${movie.baseDownloadPath}"

for file in *.mkv ; do
  # get only file name without extention
  filename="\${file%.*}"
  # set the first audio track languages and titles
  ffmpeg -i "$file" -map 0 -c copy${substitudeString} "$filename.audio_taged.mkv"
  mv -v "$filename.audio_taged.mkv" "$file"
done

for file in *.mp4 ; do
  # get only file name without extention
  filename="\${file%.*}"
  # set the first audio track languages and titles
  ffmpeg -i "$file" -map 0 -c copy${substitudeString} "$filename.audio_taged.mkv"
  mv -v "$filename.audio_taged.mkv" "$filename.mkv"
  rm "$file"
done

${settings.convertSubtitles
  ? `for file in *.vtt; do
  filename="\${file%.*}"
  ffmpeg -i "$file" "$filename.srt"
done`
: ''}

find . -size 0 -delete`

  await Bun.write(
    path.join(movie.baseDownloadPath, `audio_rename_script_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.sh`),
    ffmpegAudioTitleString
  )
}

async function createMultiFilePostProcessingFiles (movie, multiOptions) {
  const settings = await db.getAllSettings()
  const { files } = multiOptions

  const audioJson = []

  for (let i = 0; i < files.length; i++) {
    const { file, language: isoLangCode, rawLanguage: audioID } = files[i]
    logger.debug('[DOWNLOADER] Multifile processing:', file, isoLangCode)
    const isoCodeInfo = getIso639Info(`${isoLangCode}`.length === 3 ? isoLangCode : 'und')
    logger.debug('[DOWNLOADER] Multifile processing:', isoCodeInfo, typeof isoLangCode, isoLangCode)

    const audioEntry = {
      iso_639_1: isoLangCode,
      audioID
    }

    if (isoCodeInfo) {
      audioEntry.iso_639_1 = isoCodeInfo.iso_639_1
      audioEntry.iso_639_2 = isoCodeInfo.iso_639_2
      audioEntry.title = `${isoCodeInfo.german}`

      if (audioID.indexOf('audio-description') > -1) audioEntry.title += ' (Audiodeskription)'
      else if (audioID.indexOf('speech-optimized') > -1) audioEntry.title += ' (klare Sprache)'
      else if (audioID === 'ov' || audioID === 'OV') audioEntry.title += ' (Originalton)'
    }
    audioJson.push(audioEntry)
  }

  if (process.env.NODE_ENV === 'development') {
    await Bun.write(
      path.join(movie.baseDownloadPath, `audio_info_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.json`),
      JSON.stringify(audioJson)
    )
  }

  let ffmpegCommandString = 'ffmpeg'
  let mapString = ' -c:a copy -c:v copy'
  for (let i = 0; i < files.length; i++) {
    ffmpegCommandString += ` -i ${files[i].file}`
    if (files[i].video) mapString += ` -map ${i}:v:0`
    mapString += ` -map ${i}:a:0 -metadata:s:a:${i} language=${audioJson[i].iso_639_2} -metadata:s:a:${i} title="${audioJson[i].title}"`
  }
  ffmpegCommandString += `${mapString} "${movie.extraInfo.downloadTitle}.mkv"`

  logger.debug('[DOWNLOADER] ffmpegCommandString', ffmpegCommandString)

  const ffmpegAudioTitleString = `#!/bin/sh
cd "${movie.baseDownloadPath}"

# Combine video and all audio tracks from the ${audioJson.length} files
${ffmpegCommandString}

${settings.convertSubtitles
  ? `for file in *.vtt; do
  filename="\${file%.*}"
  ffmpeg -i "$file" "$filename.srt"
done`
: ''}

find ./*.mp4 -delete

find . -size 0 -delete`

  await Bun.write(
    path.join(movie.baseDownloadPath, `audio_rename_script_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.sh`),
    ffmpegAudioTitleString
  )
}

async function generateNfoFileForMovie (movie) {
  try {
    let nfoContent = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>'
    nfoContent += '\n<movie>'

    if (movie.extraInfo.imdbid) nfoContent += `\n  <imdbid>${movie.extraInfo.imdbid}</imdbid>`
    if (movie.extraInfo.tmdbid) nfoContent += `\n  <tmdbid>${movie.extraInfo.tmdbid}</tmdbid>`
    if (movie.extraInfo.title) nfoContent += `\n  <title>${movie.extraInfo.title}</title>`
    if (movie.extraInfo.originalTitle) nfoContent += `\n  <originaltitle>${movie.extraInfo.originalTitle}</originaltitle>`
    if (movie.extraInfo.year) nfoContent += `\n  <year>${movie.extraInfo.year}</year>`
    if (movie.extraInfo.plot) nfoContent += `\n  <plot>${movie.extraInfo.plot}</plot>`
    if (movie.extraInfo.runtime) nfoContent += `\n  <runtime>${movie.extraInfo.runtime}</runtime>`
    if (movie.extraInfo.release) {
      const isDateFormated = /\d{4}-\d{2}-\d{2}/.test(movie.extraInfo.release)
      let date = ''
      if (isDateFormated) date = movie.extraInfo.release
      else {
        if (/\d{2}\.\d{2}\.\d{4}/.test(movie.extraInfo.release)) {
          date = formatDate(parseDate(movie.extraInfo.release, 'dd.MM.yyyy', new Date()), 'yyyy-MM-dd')
        }
        // Fallback leave as is
        date = movie.extraInfo.release
      }
      nfoContent += `\n  <releasedate>${date}</releasedate>`
      nfoContent += `\n  <premiered>${date}</premiered>`
    }

    for (let i = 0; i < movie.extraInfo.genres.length; i++) {
      nfoContent += `\n  <genre>${movie.extraInfo.genres[i]}</genre>`
    }
    for (let i = 0; i < movie.extraInfo.actors.length; i++) {
      nfoContent += '\n  <actor>'
      nfoContent += `\n    <name>${movie.extraInfo.actors[i]}</name>`
      nfoContent += `\n    <order>${i}</order>`
      nfoContent += '\n  </actor>'
    }
    for (let i = 0; i < movie.extraInfo.director.length; i++) {
      nfoContent += `\n  <director>${movie.extraInfo.director[i]}</director>`
    }
    for (let i = 0; i < movie.extraInfo.writer.length; i++) {
      nfoContent += `\n  <credits>${movie.extraInfo.writer[i]}</credits>`
    }

    const ratingKeys = Object.keys(movie.extraInfo.ratings || {})
    if (ratingKeys.length > 0) {
      nfoContent += '\n  <ratings>'

      if (ratingKeys.indexOf('imdb') > -1) {
        nfoContent += `\n    <rating name="imdb" max="10"${ratingKeys[0] === 'imdb' ? ' default="true"' : ''}>`
        nfoContent += `\n      <value>${movie.extraInfo.ratings.imdb}</value>`
        nfoContent += '\n    </rating>'
      }
      if (ratingKeys.indexOf('tmdb') > -1) {
        nfoContent += `\n    <rating name="tmdb" max="10"${ratingKeys[0] === 'tmdb' ? ' default="true"' : ''}>`
        nfoContent += `\n      <value>${movie.extraInfo.ratings.tmdb}</value>`
        nfoContent += '\n    </rating>'
      }
      if (ratingKeys.indexOf('metacritic') > -1) {
        nfoContent += `\n    <rating name="metacritic" max="100"${ratingKeys[0] === 'metacritic' ? ' default="true"' : ''}>`
        nfoContent += `\n      <value>${movie.extraInfo.ratings.metacritic}</value>`
        nfoContent += '\n    </rating>'
      }
      if (ratingKeys.indexOf('rotten') > -1) {
        nfoContent += `\n    <rating name="rottentomatoes" max="100"${ratingKeys[0] === 'rotten' ? ' default="true"' : ''}>`
        nfoContent += `\n      <value>${parseInt(movie.extraInfo.ratings.rotten)}</value>`
        nfoContent += '\n    </rating>'
      }

      nfoContent += '\n  </ratings>'
    }

    nfoContent += '\n</movie>'

    await Bun.write(path.join(movie.baseDownloadPath, 'movie.nfo'), nfoContent)
  } catch (err) {
    logger.error('[DOWNLAODER] Error while creating movie.nfo …', err.message)
  }
}

module.exports = {
  checkForScheduledDownloads
}
