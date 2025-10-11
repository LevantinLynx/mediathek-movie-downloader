const truncateUtf8Bytes = require('truncate-utf8-bytes')
const userAgentArray = require('./userAgents.json')
const iso639codes = require('./iso639Codes.json')

const logger = require('./logger.js')
const { default: axios } = require('axios')
const path = require('path')
const fs = require('fs-extra')

const cacheDir = path.join(__dirname, '..', 'cache')
fs.ensureDirSync(cacheDir)

function getRandomUserAgent () {
  return userAgentArray && userAgentArray.length > 0
    ? userAgentArray[getRandomInteger(0, userAgentArray.length - 1)]
    : 'Mozilla/5.0 (Windows NT 10.0; Windows; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.114 Safari/537.36'
}

function getRandomInteger (min, max) {
  return Math.round(Math.random() * (max - min) + min)
}

function shuffleArray (inputArray) {
  const array = [...inputArray]
  for (let i = array.length - 1; i >= 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
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

  const illegalRe = /[\/\?<>\\:\*\|"]/g // eslint-disable-line no-useless-escape
  const controlRe = /[\x00-\x1f\x80-\x9f]/g // eslint-disable-line no-control-regex
  const reservedRe = /^\.+$/
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i
  const windowsTrailingRe = /[\. ]+$/ // eslint-disable-line no-useless-escape

  const sanitized = input
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

async function cacheImageAndGenerateCachedLink (url, cacheHashList) {
  if ( // Don't cache fsk warning images
    url.indexOf('https://zdf-prod-futura.zdf.de/static/mediathek/fskImages/fsk_16_1280x720.jpg') > -1
  ) return url

  const cleanUrlForHashing = url.split('?')[0]

  const fileNameHash = new Bun.CryptoHasher('md5').update(cleanUrlForHashing).digest('hex')

  if (cacheHashList[fileNameHash]) {
    logger.debug('File is already cached!')
    return path.join('cache', `${cacheHashList[fileNameHash]}`)
  }

  try {
    logger.info('Caching image', url)
    let result = await axios.get(url, { responseType: 'arraybuffer' })
    let fileExtention = getFileExtention(result.headers)

    // ARD can't provide a thumbnail size ¯\_(ツ)_/¯
    // so we just try a few common ones ...
    if (url.indexOf('https://api.ardmediathek.de/') === 0) {
      if (fileExtention === null) {
        logger.debug('Trying width 940')
        result = await axios.get(url.replace('w=768', 'w=940'), { responseType: 'arraybuffer' })
        fileExtention = getFileExtention(result.headers)
      }
      if (fileExtention === null) {
        logger.debug('Trying width 720')
        result = await axios.get(url.replace('w=768', 'w=720'), { responseType: 'arraybuffer' })
        fileExtention = getFileExtention(result.headers)
      }
      if (fileExtention === null) {
        logger.debug('Trying width 640')
        result = await axios.get(url.replace('w=768', 'w=640'), { responseType: 'arraybuffer' })
        fileExtention = getFileExtention(result.headers)
      }
      if (fileExtention === null) {
        logger.debug('Trying width 1280')
        result = await axios.get(url.replace('w=768', 'w=1280'), { responseType: 'arraybuffer' })
        fileExtention = getFileExtention(result.headers)
      }
      if (fileExtention === null) {
        logger.debug('Trying width 1920')
        result = await axios.get(url.replace('w=768', 'w=1920'), { responseType: 'arraybuffer' })
        fileExtention = getFileExtention(result.headers)
      }
      if (fileExtention === null) {
        logger.debug('Trying without width')
        result = await axios.get(url.split('?')[0], { responseType: 'arraybuffer' })
        fileExtention = getFileExtention(result.headers)
      }
    }

    if (fileExtention === null) {
      logger.error('No image type detected!', 'Returning original URL.')
      return url
    }

    const fileData = Buffer.from(result.data, 'binary')
    await Bun.write(path.join(cacheDir, `${fileNameHash}.${fileExtention}`), fileData)

    logger.info('DONE Caching', url)
    await new Promise(resolve => setTimeout(() => resolve(), getRandomInteger(150, 350)))
    return path.join('cache', `${fileNameHash}.${fileExtention}`)
  } catch (err) {
    logger.error(err)
  }
  return url
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
  sanitizeFileAndDirNames,
  getCleanThumbnailUrl,
  getRandomUserAgent,
  getRandomInteger,
  shuffleArray,
  sleep,
  getIso639Info,
  cacheImageAndGenerateCachedLink
}
