const _ = require('lodash')
const path = require('path')
const logger = require('../logger')
const { parseHTML } = require('linkedom')
const {
  getMovieExtraInfoCacheData,
  updateMovieExtraInfoCacheData
} = require('../database.js')
const {
  generateIdFromInput,
  getRandomUserAgent,
  axiosWithTimeouts: axios
} = require('../helperFunctions.js')

async function getAdditionalMovieInfo (movieUrl, apiID) {
  try {
    const movieID = generateIdFromInput(apiID)
    const cachedMovieExtraInfo = await getMovieExtraInfoCacheData(movieID)
    if (cachedMovieExtraInfo?.[0]?.lastUpdate) {
      logger.debug(`[NEXT.JS PARSER] (CACHE HIT) Movie extra info ${apiID} (${movieID})`)
      return cachedMovieExtraInfo[0]
    }

    logger.debug('[NEXT.JS PARSER] SCRAPER – Getting HTML from:', movieUrl)
    const { data: websiteHtml } = await axios.get(movieUrl, {
      headers: {
        'User-Agent': getRandomUserAgent()
      }
    })

    const additionalMovieInfo = await parseNextScriptTags(websiteHtml, movieID)
    if (Object.keys(additionalMovieInfo).length > 1) await updateMovieExtraInfoCacheData(additionalMovieInfo)

    if (process.env.NODE_ENV === 'development') {
      await Bun.write(path.join(__dirname, '..', '..', 'debug_info', `ADDITIONAL_DATA_${apiID}.json`), JSON.stringify(additionalMovieInfo))
    }
    return additionalMovieInfo
  } catch (err) {
    logger.error(err.message)
    return {}
  }
}

async function parseNextScriptTags (websiteHtml, movieHash) {
  try {
    const { document: websiteAsElement } = parseHTML(websiteHtml)
    const scriptElements = websiteAsElement.querySelectorAll('script')

    const movieInfo = { id: movieHash }

    for (let i = 0; i < scriptElements.length; i++) {
      const text = scriptElements[i].textContent
      if (text.indexOf('self.__next_f.push(') > -1) {
        if (text.indexOf('\\"Darsteller\\"') > -1) {
          // ZDF Extractor
          const actorAndCrewData = extractNextjsData(text, movieHash)
          if (actorAndCrewData) {
            const actors = extractZdfActorOrCrewInfo(actorAndCrewData, 'actors')
            if (actors) movieInfo.actors = actors
            const crew = extractZdfActorOrCrewInfo(actorAndCrewData, 'crew')
            if (crew) movieInfo.crew = crew
            // Production year
            if (actorAndCrewData.productionPeriod?.label) movieInfo.year = actorAndCrewData.productionPeriod.label
            // Genre info
            if (actorAndCrewData.structuralMetadata?.genreMetaCollection?.title) movieInfo.genre = actorAndCrewData.structuralMetadata.genreMetaCollection.title
          }
        } else if (text.indexOf('\\"PRODUCTION_YEAR\\"') > -1) {
          // Arte Extractor
          const creditInfo = extractNextjsData(text, movieHash)
          const extraInfo = extractArteExtraInfo(creditInfo, movieHash)
          if (extraInfo) {
            if (extraInfo.actors.length > 0) movieInfo.actors = extraInfo.actors
            if (extraInfo.crew.length > 0) movieInfo.crew = extraInfo.crew
            if (extraInfo.year) movieInfo.year = extraInfo.year
            if (extraInfo.genre) movieInfo.genre = extraInfo.genre
            if (extraInfo.fsk) movieInfo.fsk = extraInfo.fsk
            if (extraInfo.country) movieInfo.country = extraInfo.country
          }
        }
      }
    }

    return movieInfo
  } catch (err) {
    logger.error('[NEXT.JS PARSER]', err.message)
    return {}
  }
}

function extractNextjsData (scriptTagContent, apiID) {
  try {
    const match = scriptTagContent.match(/self\.__next_f\.push\((.*)\)/)
    if (!match) throw new Error('No next_f.push pattern found')
    const cleanString = match[1]
      .replace(/\\n"\]$/, '')
      .split(':')
      .slice(1)
      .join(':')
      .replace(/\\{3}"/g, '#"')
      .replace(/\\"/g, '"')
      .replace(/#/g, '\\')
      .replace(/\\1/g, '1') // @TODO find reason for useless escapes that crash the JSON Parser
      .replace(/\\2/g, '2')
      .replace(/\\3/g, '3')
      .replace(/\\M/g, 'M')
      .replace(/\\m/g, 'm')
      .replace(/\\W/g, 'W')
      .replace(/\\i/g, 'i')
      .replace(/\\p/g, 'p')
      .replace(/\\h/g, 'h')
      .replace(/\\N/g, 'N') // @TODO END
    let data = JSON.parse(cleanString)
    data = _.flattenDeep(data)
    data = data.filter(item => typeof item === 'object')
    data = _.compact(data)

    if (data?.[0]?.collection) data = data[0].collection
    else if (data?.[0]?.data && data?.[0]?.data?.zones && data?.[0]?.mamiBaseUrl) data = data[0].data.zones

    if (process.env.NODE_ENV === 'development') {
      Bun.write(path.join(__dirname, '..', '..', 'debug_info', `NEXTJS_RAWDATA_${apiID}.json`), JSON.stringify(data))
    }

    return data
  } catch (err) {
    logger.error('[NEXT.JS PARSER] Failed to parse scriptTagContent:', err.message)
    logger.error(err)
    return null
  }
}

function extractZdfActorOrCrewInfo (data, type = 'actors') {
  const info = data?.longInfoText?.items?.[0]?.paragraph || []
  const searchType = type === 'actors' ? 'Darsteller' : 'Stab'
  for (let i = 0; i < info.length; i++) {
    if (info[i].text === searchType) {
      return info[i + 1].text
        .replace('<ul><li>', '')
        .replace('</li></ul>', '')
        .split('</li><li>')
        .map(actor => {
          const actorInfo = actor.split('-').map(x => x.trim())
          return type === 'actors'
            ? {
                role: actorInfo[0],
                name: actorInfo[1]
              }
            : {
                function: actorInfo[0],
                name: actorInfo[1]
              }
        })
    }
  }
}

function extractArteExtraInfo (zones, type = 'actor') {
  let creditRawData = zones.filter(zone => zone.content?.data?.[0]?.credits?.length > 0)
  creditRawData = creditRawData?.[0]?.content?.data?.[0]
  const extraInfo = {
    actors: [],
    crew: []
  }
  if (creditRawData.ageRating) extraInfo.fsk = `FSK${creditRawData.ageRating}`
  if (creditRawData.duration) extraInfo.duration = creditRawData.duration

  for (let i = 0; i < creditRawData.credits.length; i++) {
    const entry = creditRawData.credits[i]
    if (entry.code === 'PRODUCTION_YEAR') extraInfo.year = entry.values[0]
    if (entry.code === 'COUNTRY') extraInfo.country = entry.values[0]
    if (entry.code === 'REA') {
      extraInfo.crew = [...extraInfo.crew, ...entry.values.map(name => {
        return { function: 'Regie', name }
      })]
    }
    if (entry.code === 'ACT') {
      extraInfo.actors = [...extraInfo.actors, ...entry.values.map(name => {
        if (name.indexOf('(') > -1 && name.endsWith(')')) {
          const roleParts = name.split('(')
          return {
            role: roleParts[1].replace(')', '').trim(),
            name: roleParts[0].trim()
          }
        }
        return { name }
      })]
    }
    if (entry.code === 'AUT') {
      extraInfo.crew = [...extraInfo.crew, ...entry.values.map(name => {
        return { function: 'Autor', name }
      })]
    }
  }
  return extraInfo
}

module.exports = {
  getAdditionalMovieInfo,
  parseNextScriptTags
}
