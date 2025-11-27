const _ = require('lodash')
const logger = require('../logger.js')
const { default: axios } = require('axios')
const {
  formatDate,
  parse: parseDate,
  addHours
} = require('date-fns')
const {
  sleep,
  getRandomUserAgent,
  getIso639Info,
  cacheImageAndGenerateCachedLink
} = require('../helperFunctions.js')

const extractor = {
  scrapeMovieData: scrapeZdfMovieData,
  validUrlRegex: [
    /https?:\/\/www\.zdf\.de\/(?:play\/)?(?:video|dokus|(?:magazine|reportagen|konzerte|filme)\/[^/?#&]+)(?:\/[^/?#&]+)*\/([^/?#&.]+)/,
    /https?:\/\/www\.zdf\.de\/(?:[^/]+\/)*([^/?#&]+)\.html/
  ],
  channel: 'zdf'
}

const localCache = {
  apiKey: {
    key: null,
    date: null
  }
}

async function scrapeZdfMovieData (cachedImageFileHashList) {
  try {
    let movieList = []

    const graphqlData = await getMovieDataFromZdfQraphQlApi()
    const graphqlDataLookupTable = {}

    const movieIDs = _.uniq(
      graphqlData.map(
        entry => {
          graphqlDataLookupTable[`${entry.video?.canonical || entry.canonical}`] = entry
          return entry.video?.canonical || entry.canonical
        }
      )
    )

    logger.debug('movieIDs', movieIDs, movieIDs.length)

    for (let i = 0; i < movieIDs.length; i++) {
      const movieApiData = await getMovieInfoFromApi(movieIDs[i])
      const movie = await normalizeMovieData(movieApiData, graphqlDataLookupTable[movieIDs[i]], cachedImageFileHashList)
      if (movie) movieList.push(movie)
    }

    movieList = _.orderBy(movieList, ['time.type', 'time.date'], ['desc', 'asc'])

    const channels = _.uniq(movieList.map(movie => movie.channel)).sort()
    logger.debug(channels, movieList.map(x => x.url))
    const dataByChannel = {}
    for (let i = 0; i < channels.length; i++) {
      dataByChannel[channels[i].toLowerCase()] = movieList
        .filter(movie => movie.channel === channels[i])
        .map(movie => {
          delete movie.channel
          return movie
        })
    }
    logger.info(`[ZDF API] Movies found: ${movieIDs?.length}`)
    return dataByChannel
  } catch (err) {
    logger.error(err)
  }
}

async function getMovieInfoFromApi (ID) {
  try {
    const baseUrl = 'https://zdf-prod-futura.zdf.de/mediathekV2/document/'
    const currentApiUrl = `${baseUrl}${ID}`

    logger.debug(`[API ZDF] MOVIE REQUEST "${currentApiUrl}"`)
    const { data: currentRequestResponse } = await axios.get(currentApiUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        Accept: 'application/json'
      }
    })

    if (currentRequestResponse?.document?.id !== ID) throw new Error(`Api request for "${ID}" failed!`)
    logger.debug(`[API ZDF] MOVIE DONE ${currentApiUrl}`)

    return currentRequestResponse
  } catch (err) {
    logger.error(err.message)
    return null
  }
}

async function normalizeMovieData (rawMovieData, rawGrapthQlData, cachedImageFileHashList) {
  try {
    const graphqlInfo = {
      title: rawGrapthQlData?.title,
      description: rawGrapthQlData?.teaser?.description,
      id: rawGrapthQlData?.video?.canonical || rawGrapthQlData?.canonical,
      url: rawGrapthQlData?.sharingUrl,
      channel: rawGrapthQlData?.contentOwner?.metaCollection?.title,
      thumbnail: getBestThumbnailfromGraphQlData(rawGrapthQlData?.teaser?.imageWithoutLogo?.layouts),
      videoInfo: {
        duration: rawGrapthQlData?.video?.currentMedia?.nodes?.[0]?.duration,
        ad: rawGrapthQlData?.streamingOptions?.ad,
        dgs: rawGrapthQlData?.streamingOptions?.dgs,
        ut: rawGrapthQlData?.streamingOptions?.ut,
        ks: rawGrapthQlData?.streamingOptions?.ks,
        ov: rawGrapthQlData?.streamingOptions?.ov,
        uhd: rawGrapthQlData?.streamingOptions?.uhd,
        fsk: rawGrapthQlData?.streamingOptions?.fskMetaCollection?.title?.replace(/ /g, '') || 'none'
      },
      availableFrom: rawGrapthQlData?.video?.availability?.vod?.visibleFrom,
      availableTo: rawGrapthQlData?.video?.availability?.vod?.visibleTo
    }

    const legacyData = rawMovieData?.document ? rawMovieData?.document : rawMovieData
    const legacyInfo = {
      title: legacyData?.titel,
      description: legacyData?.beschreibung,
      id: legacyData?.id,
      url: legacyData?.sharingUrl,
      channel: legacyData?.channel,
      thumbnail: (
        legacyData?.teaserBild?.['1280']?.url ||
        legacyData?.teaserBild?.['1920']?.url ||
        legacyData?.teaserBild?.['768']?.url ||
        legacyData?.teaserBild?.['1']?.url
      ),
      duration: legacyData?.length,
      availableTo: legacyData?.offlineAvailability,
      availableFrom: null,
      availabilityInfo: legacyData?.availabilityInfo,
      fsk: legacyData?.fsk || 'none'
    }
    if (legacyInfo.availabilityInfo && legacyInfo.availabilityInfo.indexOf('Video verfügbar ab ') === 0) {
      legacyInfo.availableFrom = addHours(parseDate(legacyInfo.availabilityInfo.replace('Video verfügbar ab ', ''), 'dd.MM.yyyy HH:mm', new Date()), 2)
    }

    const movie = {
      title: graphqlInfo.title || legacyInfo.title,
      url: graphqlInfo.url || legacyInfo.url,
      img: await cacheImageAndGenerateCachedLink(
        graphqlInfo.thumbnail || legacyInfo.thumbnail,
        cachedImageFileHashList
      ),
      description: graphqlInfo.description || legacyInfo.description,
      time: {
        date: graphqlInfo.availableTo || legacyInfo.availableTo,
        type: 'untill'
      },
      preText: '',
      duration: (graphqlInfo.videoInfo.duration || legacyInfo.duration)
        ? `${Math.ceil((graphqlInfo.videoInfo.duration || legacyInfo.duration) / 60)} min`
        : null,
      apiID: graphqlInfo.id || legacyInfo.id,
      channel: graphqlInfo.channel || legacyInfo.channel,
      restrictions: [],
      audioLangs: [],
      subLangs: [],
      features: []
    }

    // Set features
    if (graphqlInfo.videoInfo.ad) movie.features.push('AD')
    if (graphqlInfo.videoInfo.uhd) movie.features.push('4K UHD')

    // FSK info
    if (['none', 'FSK0'].indexOf(graphqlInfo.videoInfo.fsk) === -1) movie.restrictions.push(graphqlInfo.videoInfo.fsk.toUpperCase())
    else if (legacyInfo.fsk !== 'none') movie.restrictions.push(legacyInfo.fsk.toUpperCase())

    // Availability checks
    if (legacyInfo.availabilityInfo && legacyInfo.availabilityInfo.indexOf('verfügbar ab') > -1) {
      movie.preText = legacyInfo.availabilityInfo
      movie.time.date = legacyInfo.availableFrom
      movie.time.type = 'from'
    } else if (graphqlInfo.availableFrom && new Date() < new Date(graphqlInfo.availableFrom)) {
      movie.preText = `Verfügbar ab ${formatDate(new Date(graphqlInfo.availableFrom), 'dd.MM.yyyy')}`
      movie.date = graphqlInfo.availableFrom
      movie.time.type = 'from'
    } else if (legacyInfo.availabilityInfo && legacyInfo.availabilityInfo.indexOf('verfügbar bis') > -1) {
      movie.preText = legacyInfo.availabilityInfo
    } else if (graphqlInfo.availableTo) {
      movie.preText = `Verfügbar bis ${formatDate(new Date(graphqlInfo.availableTo), 'dd.MM.yyyy')}`
    } else {
      logger.error('Movie has no preText!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
    }

    if (legacyData.captions) {
      movie.subLangs = _.uniq(legacyData.captions.map(caption => caption.language)).map(lang => {
        const isoInfo = getIso639Info(lang)
        return `${isoInfo.iso_639_1}`.toUpperCase()
      }).sort()
    }
    if (legacyData.formitaeten) {
      movie.audioLangs = _.uniq(legacyData.formitaeten.map(caption => caption.language)).map(lang => {
        const isoInfo = getIso639Info(lang)
        return `${isoInfo.iso_639_1}`.toUpperCase()
      }).sort()
    }

    if (!movie.description && rawMovieData?.shortText?.text) {
      movie.description = rawMovieData.shortText.text
    }

    if (movie.restrictions.length === 0) delete movie.restrictions
    if (movie.audioLangs.length === 0) {
      delete movie.audioLangs
      if (graphqlInfo.videoInfo.ov) movie.features.push('OV')
    }
    if (movie.subLangs.length === 0) {
      delete movie.subLangs
      if (graphqlInfo.videoInfo.ut) movie.features.push('UT')
    }
    if (!movie.duration) delete movie.duration
    if (movie.features.length === 0) delete movie.features

    return movie
  } catch (err) {
    logger.error(err)
    return null
  }
}

// ////////////////////// //
// NEW API IMPLEMENTATION //
// ////////////////////// //
async function getApiKeyFromWebsite () {
  try {
    // Return cached api key if not older than 48 hours
    if (
      localCache.apiKey.key &&
      localCache.apiKey.date &&
      localCache.apiKey.date > (Date.now() - (48 * 60 * 60 * 1000))
    ) {
      return localCache.apiKey.key
    }

    const websiteUrl = 'https://www.zdf.de/'

    logger.debug(`[API ZDF] Extracting API Key from "${websiteUrl}"`)
    const { data: currentRequestResponse } = await axios.get(websiteUrl, {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    })
    logger.debug(`[API ZDF] Got html from "${websiteUrl}"`)

    if (!currentRequestResponse?.indexOf('<!DOCTYPE html><html lang="de">') === -1) throw new Error(`Error while extracting API KEY from "${websiteUrl}"`)

    const apiKeyRegex = /\\"apiToken\\":\\"([a-zA-Z0-9]{32,64})\\",\\"contentServiceBaseUrl\\":\\"https:\/\/api\.zdf\.de\\"/
    const regexMatchResult = currentRequestResponse.match(apiKeyRegex)
    const apiKey = regexMatchResult?.[1]

    if (!apiKey) {
      localCache.apiKey.key = null
      localCache.apiKey.date = null
      throw new Error(`No API Key found on website "${websiteUrl}"`)
    }
    logger.debug(`[API ZDF] API KEY FOUND "${apiKey}"`)

    logger.debug('[API ZDF] Ipdating localCache API Key value')
    localCache.apiKey.key = apiKey
    localCache.apiKey.date = new Date()

    return localCache.apiKey.key
  } catch (err) {
    logger.error(err)
    logger.error(`[API ZDF] ${err.message}`)
    return null
  }
}

async function getMovieDataFromZdfQraphQlApi () {
  try {
    const movieData = []
    const apiKey = await getApiKeyFromWebsite()
    if (apiKey === null) throw new Error('No API Key!')

    const baseUrl = 'https://api.zdf.de/graphql?operationName=getMetaCollectionContent&variables='
    const playload = '{"collectionId":"pub-form-10004","input":{"appId":"zdf-web-bed33b7a","filters":{"contentOwner":["ZDF","ZDFinfo","ZDFneo","ZDFtivi","funk","KiKA","phoenix"]},"pagination":{"first":24,"after":###END_OF_LAST_CURSOR_###},"user":{"abGroup":"gruppe-a","userSegment":"segment_0"},"tabId":null}}'
    const extentions = '{"clientLibrary":{"name":"@apollo/client","version":"4.0.9"},"persistedQuery":{"version":1,"sha256Hash":"4a20bd805555f8ab3a168e745955dde72048093ff2c2c976b222fdfe9e85c8af"}}'
    let endOfLastCursor = null
    let hasNextPage = true
    let i = 0

    while (hasNextPage && i < 20) {
      if (i !== 0) await sleep(275)
      // Additional info about URI encoding for the grapthQl params can be found here:
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
      const currentRequestUrl = `${baseUrl}${encodeURIComponent(`${playload}`.replace('###END_OF_LAST_CURSOR_###', `${endOfLastCursor === null ? null : `"${endOfLastCursor}"`}`))}&extensions=${encodeURIComponent(extentions)}`
      logger.debug('currentRequestUrl', currentRequestUrl)
      const { data: currentRequestResponse } = await axios.get(currentRequestUrl, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Api-Auth': `Bearer ${apiKey}`,
          'content-Type': 'application/json',
          Accept: '*/*'
        }
      })
      endOfLastCursor = currentRequestResponse?.data?.metaCollectionContent?.pageInfo?.endCursor
      hasNextPage = currentRequestResponse?.data?.metaCollectionContent?.pageInfo?.hasNextPage
      i++

      logger.debug('currentRequestResponse?.data?.metaCollectionContent?.pageInfo', currentRequestResponse?.data?.metaCollectionContent?.pageInfo)

      if (currentRequestResponse?.data?.metaCollectionContent?.smartCollections) {
        movieData.push(currentRequestResponse?.data?.metaCollectionContent?.smartCollections)
      }
    }
    logger.debug(_.flatten(_.compact(movieData)))
    return _.flatten(_.compact(movieData))
  } catch (err) {
    // logger.error(err)
    logger.error(err.message)
    return []
  }
}

function getBestThumbnailfromGraphQlData (imageObject) {
  if (
    typeof imageObject === 'object' &&
    !Array.isArray(imageObject) &&
    imageObject !== null
  ) {
    if (imageObject.dim1280X720) return imageObject.dim1280X720
    if (imageObject.dim1920X1080) return imageObject.dim1920X1080
    if (imageObject.dim768X432) return imageObject.dim768X432
  }

  return null
}

module.exports = extractor
