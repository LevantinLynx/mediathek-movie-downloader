const { serverEvents } = require('./server.js')
const truncateUtf8Bytes = require('truncate-utf8-bytes')
const userAgentArray = require('./userAgents.json')
const iso639codes = require('./iso639Codes.json')
const { getAllSettings } = require('./database.js')
const logger = require('./logger.js')
const path = require('path')
const fs = require('fs-extra')
const crypto = require('crypto')
const sharp = require('sharp')

const { default: axios } = require('axios')
// Add timeout signal to EVERY request
const timeoutInMs = 45_000
axios.defaults.timeout = timeoutInMs
const axiosWithTimeouts = axios.create({ timeout: timeoutInMs })
axiosWithTimeouts.interceptors.request.use((config) => {
  // Only set signal if not provided
  if (!config.signal) config.signal = AbortSignal.timeout(timeoutInMs)
  return config
})

const cacheDir = path.join(__dirname, '..', 'cache')
fs.ensureDirSync(cacheDir)

/**
 * Sends a notification to all connected clients.
 * @param {Object} info Object that contains all relevant info for the notification
 * @param {String} info.uuid=getRndUuid() UUID of the notification. MUST BE identical to update the state of an existing notification.
 * @param {String} info.state=done "running" or "done"
 * @param {String} info.result=info "info", "success" or "error"
 * @param {String} info.msg Message to be displayed to the user. MUST NOT contain HTML
 * @param {String} [info.type] Type of logic the notification comes from. "sync" or "update"
 * @param {Number} [info.time] Time in ms. Will make the notification disappear after set duration.
 */
function sendNotificationToClients (info) {
  if (!info?.msg) {
    return logger.error(new Error('[NOTIFICATION] No "msg" given!'))
  } else if (info.time && typeof info.time !== 'number') {
    return logger.error(new Error('[NOTIFICATION] "time" MUST be of type number!'))
  } else {
    if (!info.uuid) info.uuid = getRndUuid()
    if (!info.state) info.state = 'done'
    if (!info.result) info.result = 'info'

    serverEvents.emit('sendNotificationToClients', info)
  }
}

function getRandomUserAgent () {
  return userAgentArray && userAgentArray.length > 0
    ? userAgentArray[getRandomInteger(0, userAgentArray.length - 1)]
    : 'Mozilla/5.0 (Windows NT 10.0; Windows; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.114 Safari/537.36'
}

function getRandomInteger (min, max) {
  return Math.round(Math.random() * (max - min) + min)
}

function getRndUuid () {
  return crypto.randomUUID()
}

function sleep (timeInMs = 2500) {
  return new Promise(resolve => setTimeout(() => resolve(), timeInMs))
}

function getCleanThumbnailUrl (thumbnailUrl) {
  thumbnailUrl = thumbnailUrl.replace(/&#x3D;/g, '=')

  if (thumbnailUrl.indexOf('__SIZE__') > -1) {
    thumbnailUrl = thumbnailUrl.replace('__SIZE__', '940x530')
  } else if (thumbnailUrl.indexOf('940x530') > -1) {
    thumbnailUrl = thumbnailUrl.replace('940x530', '940x530?type=TEXT')
  }

  return thumbnailUrl
}

function sanitizeFileAndDirNames (input) {
  if (typeof input !== 'string') throw new Error('Input must be string')

  const unwantedTitleCharacters = /[«»：]/g // eslint-disable-line no-useless-escape
  const illegalRe = /[\/\?<>\\:\*\|"]/g // eslint-disable-line no-useless-escape
  const controlRe = /[\x00-\x1f\x80-\x9f]/g // eslint-disable-line no-control-regex
  const reservedRe = /^\.+$/
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i
  const windowsTrailingRe = /[\. ]+$/ // eslint-disable-line no-useless-escape

  const sanitized = input
    .replace(unwantedTitleCharacters, '')
    .replace(illegalRe, '')
    .replace(controlRe, '')
    .replace(reservedRe, '')
    .replace(windowsReservedRe, '')
    .replace(windowsTrailingRe, '')
  return truncateUtf8Bytes(sanitized, 255)
}

function getIso639Info (iso639Code1Or2) {
  iso639Code1Or2 = `${iso639Code1Or2}`.trim().toLowerCase()
  for (let i = 0; i < iso639codes.length; i++) {
    if (
      iso639codes[i].iso_639_1 === iso639Code1Or2 ||
      iso639codes[i].iso_639_2 === iso639Code1Or2
    ) return iso639codes[i]
  }
  return null
}

const IMG_CACHE_REQUEST_TIMEOUT = 10_000
async function cacheImageAndGenerateCachedLink (url, cacheHashList) {
  const settings = await getAllSettings()
  if (!settings.enableImageCaching) {
    logger.debug('[IMG CACHE] Disabled, returning original url.')
    return url
  }

  // Fallback if image is unavailable
  if (!url) return '/imgs/movie_image_not_found.svg'

  if ( // Don't cache fsk warning images
    url.indexOf('https://zdf-prod-futura.zdf.de/static/mediathek/fskImages/') > -1
  ) return url

  const urlObject = new URL(url)
  const fileNameHash = new Bun
    .CryptoHasher('sha1')
    .update(`${urlObject.origin}${urlObject.pathname}`)
    .digest('hex')
    .substring(0, 10)

  if (cacheHashList[fileNameHash]) {
    logger.debug('[IMG CACHE] File is already cached!')
    return path.join('/', 'cache', `${cacheHashList[fileNameHash]}`)
  }

  try {
    logger.debug('[IMG CACHE] Caching image:', url)
    let result = null
    let fileExtention = null

    if (urlObject.host === 'api.ardmediathek.de') {
      const data = await getArdImageData(urlObject)
      result = data.result
      fileExtention = data.fileExtention
    } else if (urlObject.host === 'api-cdn.arte.tv') {
      const data = await getArteImageData(urlObject)
      result = data.result
      fileExtention = data.fileExtention
    } else if (urlObject.host === 'www.3sat.de') {
      const data = await get3satImageData(urlObject)
      result = data.result
      fileExtention = data.fileExtention
    } else if (urlObject.host === 'www.zdf.de') {
      const data = await getZdfImageData(urlObject)
      result = data.result
      fileExtention = data.fileExtention
    } else if (urlObject.host === 'epg-image.zdf.de') {
      const data = await getZdfImageDataEpgFotobase(urlObject)
      result = data.result
      fileExtention = data.fileExtention
    }

    if (fileExtention === null) {
      const data = await getFallbackImageData(url)
      result = data.result
      fileExtention = data.fileExtention
    }

    if (fileExtention === null) {
      logger.error('[IMG CACHE] No image type detected! Fallback URL.')
      return '/imgs/movie_image_placeholder.svg'
    }

    const resizedFileExtention = 'webp'
    const resizedFileWidth = 768
    logger.debug(`[IMG CACHE] Converting image to "${resizedFileExtention}" with max width "${resizedFileWidth}" …`)
    const resizedImageBuffer = await sharp(Buffer.from(result.data, 'binary'))
      .resize(resizedFileWidth, null, { fit: 'inside', withoutEnlargement: true })
      .webp({
        quality: 85,
        effort: 5,
        smartSubsample: true
      })
      .toBuffer()

    await Bun.write(path.join(cacheDir, `${fileNameHash}.${resizedFileExtention}`), resizedImageBuffer)

    logger.debug('[IMG CACHE] DONE Caching:', url)
    await sleep(getRandomInteger(275, 555)) // avoid rate limiting while downloading images
    return path.join('/', 'cache', `${fileNameHash}.${resizedFileExtention}`)
  } catch (err) {
    logger.error(err)
  }
  return url
}

async function getArdImageData (urlObject) {
  // ardmediathek.de image sizes
  // url encoded ?!?! /img?imwidth=208&amp;url=https%3A%2F%2Fapi.ardmediathek.de%2Fimage-service%2Fimages%2Furn%3Aard%3Aimage%3A977f650cf04f4daf%3Fch%3D024db2775bd386aa%26w%3D%7Bwidth%7D
  // url https://api.ardmediathek.de/image-service/images/urn:ard:image:977f650cf04f4daf?ch=024db2775bd386aa&w={width}
  // poster 320 480 600 768 840 960 1280 1440 1600 1920 2560
  // landscape 320 480 600 768 840 960 1280 1440 1600 1920 2560
  try {
    const cleanUrl = `${urlObject.origin}${urlObject.pathname}`
    const searchParams = Object.fromEntries(urlObject.searchParams)
    const availableSizes = ['960', '840', '768', '1280', '1440', '1600', '1920', '2560', '', '600', '480', '320']
    let fileExtention = null
    let result = null

    if (searchParams.ch) {
      // ch and w
      for (let i = 0; i < availableSizes.length; i++) {
        if (fileExtention !== null) break
        logger.debug(`[IMG CACHE] (ARD) Trying width clean url and "?ch=${searchParams.ch}&w=${availableSizes[i]}"`)
        result = await axiosWithTimeouts.get(`${cleanUrl}?ch=${searchParams.ch}&w=${availableSizes[i]}`, {
          headers: {
            'User-Agent': getRandomUserAgent()
          },
          responseType: 'arraybuffer',
          signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
        })
        fileExtention = getFileExtention(result.headers)
      }
    }

    if (fileExtention === null && searchParams.ch) {
      // w and ch
      for (let i = 0; i < availableSizes.length; i++) {
        if (fileExtention !== null) break
        logger.debug(`[IMG CACHE] (ARD) Trying width clean url and "?w=${availableSizes[i]}&ch=${searchParams.ch}"`)
        result = await axiosWithTimeouts.get(`${cleanUrl}?w=${availableSizes[i]}&ch=${searchParams.ch}`, {
          headers: {
            'User-Agent': getRandomUserAgent()
          },
          responseType: 'arraybuffer',
          signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
        })
        fileExtention = getFileExtention(result.headers)
      }
    }

    if (fileExtention === null && searchParams.ch) {
      // only ch
      logger.debug(`[IMG CACHE] (ARD) Trying width clean url and "?ch=${searchParams.ch}"`)
      result = await axiosWithTimeouts.get(`${cleanUrl}?ch=${searchParams.ch}`, {
        headers: {
          'User-Agent': getRandomUserAgent()
        },
        responseType: 'arraybuffer',
        signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
      })
      fileExtention = getFileExtention(result.headers)
    }

    // only w
    if (fileExtention === null) {
      for (let i = 0; i < availableSizes.length; i++) {
        if (fileExtention !== null) break
        logger.debug(`[IMG CACHE] (ARD) Trying width clean url and "?w=${availableSizes[i]}"`)
        result = await axiosWithTimeouts.get(`${cleanUrl}?w=${availableSizes[i]}`, {
          headers: {
            'User-Agent': getRandomUserAgent()
          },
          responseType: 'arraybuffer',
          signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
        })
        fileExtention = getFileExtention(result.headers)
      }
    }

    return { result, fileExtention }
  } catch (err) {
    logger.error(err)
    return { result: null, fileExtention: null }
  }
}

async function getArteImageData (urlObject) {
  // arte.tv image sizes
  // url https://api-cdn.arte.tv/img/v2/image/DLhrUwfrxubrqUFFN3xQ4J/1400x2100?type=TEXT
  // poster 500x750 1400x2100
  // landscape 325x183 430x242 480x270 620x350 720x406 940x530
  try {
    const cleanUrl = `${urlObject.origin}${urlObject.pathname.split('/').slice(0, -1).join('/')}`
    const availableSizes = ['940x530', '720x406', '620x350', '480x270', '430x242', '325x183']
    let fileExtention = null
    let result = null

    for (let i = 0; i < availableSizes.length; i++) {
      if (fileExtention !== null) break
      logger.debug(`[IMG CACHE] (ARTE) Trying width clean url and "/${availableSizes[i]}?type=TEXT"`)
      result = await axiosWithTimeouts.get(`${cleanUrl}/${availableSizes[i]}?type=TEXT`, {
        headers: {
          'User-Agent': getRandomUserAgent()
        },
        responseType: 'arraybuffer',
        signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
      })
      fileExtention = getFileExtention(result.headers)
    }

    if (fileExtention === null) {
      for (let i = 0; i < availableSizes.length; i++) {
        if (fileExtention !== null) break
        logger.debug(`[IMG CACHE] (ARTE) Trying width clean url and "/${availableSizes[i]}"`)
        result = await axiosWithTimeouts.get(`${cleanUrl}/${availableSizes[i]}`, {
          headers: {
            'User-Agent': getRandomUserAgent()
          },
          responseType: 'arraybuffer',
          signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
        })
        fileExtention = getFileExtention(result.headers)
      }
    }

    return { result, fileExtention }
  } catch (err) {
    logger.error(err)
    return { result: null, fileExtention: null }
  }
}

async function get3satImageData (urlObject) {
  // 3sat.de image sizes
  // url https://www.3sat.de/assets/der-chinese-sendetypical-2400x1350-16zu9-100~384x216?cb=1770294024797
  // poster 240x270 640x720
  // landscape 384x216 1280x720 1920x1080
  try {
    const cleanUrl = `${urlObject.origin}${urlObject.pathname}`.split('~')[0]
    const searchParams = Object.fromEntries(urlObject.searchParams)
    const availableSizes = ['1280x720', '1920x1080', '384x216']
    let fileExtention = null
    let result = null

    if (searchParams.cb) {
      // cb
      for (let i = 0; i < availableSizes.length; i++) {
        if (fileExtention !== null) break
        logger.debug(`[IMG CACHE] (3sat) Trying width clean url and "~${availableSizes[i]}?cb=${searchParams.cb}"`)
        result = await axiosWithTimeouts.get(`${cleanUrl}~${availableSizes[i]}?cb=${searchParams.cb}`, {
          headers: {
            'User-Agent': getRandomUserAgent()
          },
          responseType: 'arraybuffer',
          signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
        })
        fileExtention = getFileExtention(result.headers)
      }
    }

    for (let i = 0; i < availableSizes.length; i++) {
      if (fileExtention !== null) break
      logger.debug(`[IMG CACHE] (3sat) Trying width clean url and "~${availableSizes[i]}"`)
      result = await axiosWithTimeouts.get(`${cleanUrl}~${availableSizes[i]}`, {
        headers: {
          'User-Agent': getRandomUserAgent()
        },
        responseType: 'arraybuffer',
        signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
      })
      fileExtention = getFileExtention(result.headers)
    }

    return { result, fileExtention }
  } catch (err) {
    logger.error(err)
    return { result: null, fileExtention: null }
  }
}

async function getZdfImageData (urlObject) {
  // zdf.de image sizes
  // url https://www.zdf.de/assets/hero-angel-has-fallen-100~768x432?cb=1770819277586
  // poster N/A
  // landscape 384x216 768x432 936x520 1280x720 1300x650 1500x800 1920x1080
  // logo opton for movies >>> https://www.zdf.de/assets/logo-mittig-dartagnan-100~380x170?cb=1766402840878
  // 380x170 and 760x340
  try {
    const cleanUrl = `${urlObject.origin}${urlObject.pathname}`.split('~')[0]
    const searchParams = Object.fromEntries(urlObject.searchParams)
    const availableSizes = ['936x520', '768x432', '1300x650', '1500x800', '1920x1080', '384x216']
    let fileExtention = null
    let result = null

    if (searchParams.cb) {
      // cb
      for (let i = 0; i < availableSizes.length; i++) {
        if (fileExtention !== null) break
        logger.debug(`[IMG CACHE] (ZDF) Trying width clean url and "~${availableSizes[i]}?cb=${searchParams.cb}"`)
        result = await axiosWithTimeouts.get(`${cleanUrl}~${availableSizes[i]}?cb=${searchParams.cb}`, {
          headers: {
            'User-Agent': getRandomUserAgent()
          },
          responseType: 'arraybuffer',
          signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
        })
        fileExtention = getFileExtention(result.headers)
      }
    }

    for (let i = 0; i < availableSizes.length; i++) {
      if (fileExtention !== null) break
      logger.debug(`[IMG CACHE] (ZDF) Trying width clean url and "~${availableSizes[i]}"`)
      result = await axiosWithTimeouts.get(`${cleanUrl}~${availableSizes[i]}`, {
        headers: {
          'User-Agent': getRandomUserAgent()
        },
        responseType: 'arraybuffer',
        signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
      })
      fileExtention = getFileExtention(result.headers)
    }

    return { result, fileExtention }
  } catch (err) {
    logger.error(err)
    return { result: null, fileExtention: null }
  }
}

async function getZdfImageDataEpgFotobase (urlObject) {
  // zdf.de image sizes
  // url https://epg-image.zdf.de/fotobase-webdelivery/images/07423d8d-5a5f-4b6a-953d-cf6d746613ec?layout=1280x720
  // poster N/A
  // landscape 384x216 768x432 1280x720 1920x1080
  try {
    const cleanUrl = `${urlObject.origin}${urlObject.pathname}`.split('~')[0]
    const searchParams = Object.fromEntries(urlObject.searchParams)
    const availableSizes = ['1280x720', '768x432', '1920x1080', '384x216']
    let fileExtention = null
    let result = null

    if (searchParams.layout) {
      // layout
      for (let i = 0; i < availableSizes.length; i++) {
        if (fileExtention !== null) break
        logger.debug(`[IMG CACHE] (ZDF) Trying width clean url and "?layout=${availableSizes[i]}"`)
        result = await axiosWithTimeouts.get(`${cleanUrl}?layout=${availableSizes[i]}`, {
          headers: {
            'User-Agent': getRandomUserAgent()
          },
          responseType: 'arraybuffer',
          signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
        })
        fileExtention = getFileExtention(result.headers)
      }
    }

    for (let i = 0; i < availableSizes.length; i++) {
      if (fileExtention !== null) break
      logger.debug('[IMG CACHE] (ZDF) Trying width clean url only')
      result = await axiosWithTimeouts.get(`${cleanUrl}`, {
        headers: {
          'User-Agent': getRandomUserAgent()
        },
        responseType: 'arraybuffer',
        signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
      })
      fileExtention = getFileExtention(result.headers)
    }

    return { result, fileExtention }
  } catch (err) {
    logger.error(err)
    return { result: null, fileExtention: null }
  }
}

async function getFallbackImageData (url) {
  try {
    const result = await axiosWithTimeouts.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent()
      },
      responseType: 'arraybuffer',
      signal: AbortSignal.timeout(IMG_CACHE_REQUEST_TIMEOUT)
    })
    const fileExtention = getFileExtention(result.headers)

    return { result, fileExtention }
  } catch (err) {
    logger.error(err)
    return { result: null, fileExtention: null }
  }
}

function getFileExtention (headers) {
  let fileExtention = null
  switch (headers['content-type']) {
    case 'image/jpeg': fileExtention = 'jpg'; break
    case 'image/png': fileExtention = 'png'; break
    case 'image/gif': fileExtention = 'gif'; break
    case 'image/webp': fileExtention = 'webp'; break
    case 'image/svg+xml; charset=utf-8':
    case 'image/svg+xml': fileExtention = 'svg'; break
    case 'image/tiff': fileExtention = 'tiff'; break
    case 'image/bmp': fileExtention = 'bmp'; break
    case 'image/x-bmp': fileExtention = 'bmp'; break
    case 'image/x-ms-bmp': fileExtention = 'bmp'; break
    case 'image/cis-cod': fileExtention = 'cod'; break
    case 'image/cmu-raster': fileExtention = 'ras'; break
    case 'image/fif': fileExtention = 'fif'; break
    case 'image/ief': fileExtention = 'ief'; break
    case 'image/vasa': fileExtention = 'mcf'; break
    case 'image/vnd.wap.wbmp': fileExtention = 'wbmp'; break
    case 'image/x-icon': fileExtention = 'ico'; break
    case 'image/x-portable-anymap': fileExtention = 'pnm'; break
    case 'image/x-portable-bitmap': fileExtention = 'pbm'; break
    case 'image/x-portable-graymap': fileExtention = 'pgm'; break
    case 'image/x-portable-pixmap': fileExtention = 'ppm'; break
    case 'image/x-rgb': fileExtention = 'rgb'; break
    case 'image/x-windowdump': fileExtention = 'xwd'; break
    case 'image/x-xbitmap': fileExtention = 'xbm'; break
    case 'image/x-xpixmap': fileExtention = 'xpm'; break

    default:
      fileExtention = null
  }

  return fileExtention
}

module.exports = {
  sendNotificationToClients,
  sanitizeFileAndDirNames,
  getCleanThumbnailUrl,
  getRandomUserAgent,
  getRandomInteger,
  getRndUuid,
  sleep,
  getIso639Info,
  cacheImageAndGenerateCachedLink,

  axiosWithTimeouts
}
