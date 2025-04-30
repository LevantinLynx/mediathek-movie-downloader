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

async function ytDlpDownloader (movie) {
  let downloadOptions = []
  let multiVideoDownload = false

  downloadOptions = await getParametersForYtdlp(movie)
  // Detect if return contains multi video download instructions (Object return)
  if (!Array.isArray(downloadOptions)) multiVideoDownload = true

  // Start cron job for progress updates if it's not running
  serverEvents.emit('startDownloadProgressJob')

  if (multiVideoDownload) {
    const { multiVideoOptions, files } = downloadOptions
    logger.info(`[YT-DLP] Starting multi video download of ${multiVideoOptions.length} files for "${movie.title}" …`)
    for (let i = 0; i < multiVideoOptions.length; i++) {
      await ytDlpDownloadProcess(movie, multiVideoOptions[i], files[i].file, `${i+1}/${multiVideoOptions.length}`)
    }
  } else {
    await ytDlpDownloadProcess(movie, downloadOptions)
  }
}

function ytDlpDownloadProcess (movie, downloadOptions, fileName, countInfo) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    // Initialize yt-dlp instance
    const ytDlp = new YTDlpWrap(path.join(__dirname, 'bin', 'yt-dlp'))

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
            eta: data[3],
            fileName,
            countInfo
          })
        }
      })
      .on('error', error => reject(error))
      .on('close', () => resolve())
  })
}

async function getParametersForYtdlp (movie) {
  if ([
    'ard', 'das_erste', 'ard_alpha', 'br', 'hr', 'sr',
    'mdr', 'wdr', 'ndr', 'swr', 'rbb', 'one', 'funk', 'kika'
  ].indexOf(movie.channel) > -1) {
    return await getArdGroupParametersForYtdlp(movie)
  }

  const settings = await db.getAllSettings()
  // Create download parameters
  const downloadOptions = [
    movie.downloadUrl, // Add url to the movie
    '-P', movie.baseDownloadPath // Directory to download to
  ]

  // Initialize yt-dlp instance
  const ytDlp = new YTDlpWrap(path.join(__dirname, 'bin', 'yt-dlp'))
  const audioList = []

  if (['arte'].indexOf(movie.channel) > -1) {
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
    if (rawInfo.indexOf(' audio only ') > -1) {
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
      } else if (audio.length === 1) {
        // Format selector
        downloadOptions.push('-f')
        let formatOptionString = await getFfmpegVideoResolutionOption()

        for (let i = 0; i < audio.length; i++) {
          formatOptionString += `+${audio[i].id}`
          audioList.push({ ...audio[i] })
        }

        // Add format options
        downloadOptions.push(formatOptionString)
      }
    }
  } else if (['zdf', 'zdfneo', '3sat'].indexOf(movie.channel) > -1) {
    // Get video info
    const info = await ytDlp.getVideoInfo(downloadOptions)
    if (process.env.NODE_ENV === 'development') {
      await Bun.write(
        path.join(movie.baseDownloadPath, `ytdlp_info_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.json`),
        JSON.stringify(info)
      )
    }

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

    if (audioOnlyFormats.length > 0) {
      if (audioOnlyLanguages.length > 1) {
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
      } else if (audioOnlyLanguages.length === 1) {
        for (let i = 0; i < audioOnlyLanguages.length; i++) {
          audioList.push(audioOnlyLanguages[i])
        }
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
  }

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
          rawAudioFormats[i].height >= 360
        ) return rawAudioFormats[i]
      }
    }

    for (let i = 0; i < rawVideoFormats.length; i++) {
      if (
        rawVideoFormats[i].language === lang &&
        rawVideoFormats[i].height <= resolutionLimit
      ) return rawVideoFormats[i]
    }

    logger.debug('No format matching was found!', [...info.formats])
    return null
  }

  let defaultAudioVideo = audioLanguages.filter(entry => entry.lang.indexOf('audio-description') === -1)
  if (defaultAudioVideo.length === 0) defaultAudioVideo = audioLanguages
  // Use first language entry thats not a special version as default audio & video
  const videoFile = getVideoForAudioIdentifier(defaultAudioVideo[0].lang, false)

  // Add video file to options and info
  multiOptions.files.push({
    file: `${videoFile.format_id}.${videoFile.language}.mp4`.replace(' ', '_'),
    language: `${videoFile.language.split('-')[0]}`,
    rawLanguage: `${videoFile.language}`,
    video: true
  })
  const videoFileOptions = [
    ...downloadOptions,
    '-f', `${videoFile.format_id}`,
    '-o', `${videoFile.format_id}.${videoFile.language}.mp4`.replace(' ', '_')
  ]
  if (settings.includeSubtitles) videoFileOptions.push('--all-subs')
  multiOptions.multiVideoOptions.push(videoFileOptions)

  // Audio files
  for (let i = 1; i < defaultAudioVideo.length; i++) {
    const formatObject = getVideoForAudioIdentifier(defaultAudioVideo[i].lang, true)
    multiOptions.files.push({
      file: `${formatObject.format_id}.${formatObject.language}.mp4`.replace(' ', '_'),
      language: `${formatObject.language.split('-')[0]}`,
      rawLanguage: `${formatObject.language}`
    })
    multiOptions.multiVideoOptions.push([
      ...downloadOptions,
      '-f', `${formatObject.format_id}`,
      '-o', `${formatObject.format_id}.${formatObject.language}.mp4`.replace(' ', '_')
    ])
  }

  // Audio description files
  if (settings.includeAudioTranscription) {
    const audioTranscriptions = audioLanguages.filter(entry => entry.lang.indexOf('audio-description') > -1)
    for (let i = 0; i < audioTranscriptions.length; i++) {
      const formatObject = getVideoForAudioIdentifier(audioTranscriptions[i].lang, true)
      multiOptions.files.push({
        file: `${formatObject.format_id}.${formatObject.language}.mp4`.replace(' ', '_'),
        language: `${formatObject.language.split('-')[0]}`,
        rawLanguage: `${formatObject.language}`
      })
      multiOptions.multiVideoOptions.push([
        ...downloadOptions,
        '-f', `${formatObject.format_id}`,
        '-o', `${formatObject.format_id}.${formatObject.language}.mp4`.replace(' ', '_')
      ])
    }
  }
  logger.debug('multiOptions', multiOptions)

  await createMultiFilePostProcessingFiles(movie, multiOptions)

  return multiOptions
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
      else if (
        audioID.indexOf('Originalton') > -1 ||
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

async function createMultiFilePostProcessingFiles (movie, multiOptions) {
  const { files } = multiOptions

  const audioJson = []

  for (let i = 0; i < files.length; i++) {
    const { file, language: isoLangCode, rawLanguage: audioID } = files[i]
    logger.debug(file, isoLangCode)
    const isoCodeInfo = getIso639Info(`${isoLangCode}`.length === 3 ? isoLangCode : 'und')
    logger.debug(isoCodeInfo, typeof isoLangCode, isoLangCode)

    const audioEntry = {
      iso_639_1: isoLangCode,
      audioID
    }

    if (isoCodeInfo) {
      audioEntry.iso_639_1 = isoCodeInfo.iso_639_1
      audioEntry.iso_639_2 = isoCodeInfo.iso_639_2
      audioEntry.title = `${isoCodeInfo.german}`

      if (audioID.indexOf('audio-description') > -1) audioEntry.title += ' (Audiodeskription)'
      // @TODO: find out if there is a clear language option in ard videos
      // else if (rawLang.indexOf('') > -1) audioEntry.title += ' (klare Sprache)'
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
  ffmpegCommandString += `${mapString} "${movie.title}.mkv"`

  logger.debug('ffmpegCommandString', ffmpegCommandString)

  const ffmpegAudioTitleString = `#!/bin/sh
cd "${movie.baseDownloadPath}"

# Combine video and all audio tracks from the ${audioJson.length} files
${ffmpegCommandString}

for filename in *.vtt; do
  fname="\${filename%.*}"
  ffmpeg -i "$filename" "$fname.srt"
done

find ./*.mp4 -delete

find . -size 0 -delete`

  await Bun.write(
    path.join(movie.baseDownloadPath, `audio_rename_script_${sanitizeFileAndDirNames(movie.title).replace(/ /g, '_')}.sh`),
    ffmpegAudioTitleString
  )
}

module.exports = {
  checkForScheduledDownloads
}
