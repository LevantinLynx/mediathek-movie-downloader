const truncateUtf8Bytes = require('truncate-utf8-bytes')
const userAgentArray = require('./userAgents.json')
const iso639codes = require('./iso639Codes.json')

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
    thumbnailUrl = thumbnailUrl.replace('__SIZE__', '650x366')
  } else if (thumbnailUrl.indexOf('940x530') > -1) {
    thumbnailUrl = thumbnailUrl.replace('940x530', '650x366') + '?type=TEXT'
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

module.exports = {
  sanitizeFileAndDirNames,
  getCleanThumbnailUrl,
  getRandomUserAgent,
  getRandomInteger,
  shuffleArray,
  sleep,
  getIso639Info
}
