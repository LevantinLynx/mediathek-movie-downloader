const logger = require('../logger.js')
const {
  axiosWithTimeouts: axios,
  getRandomUserAgent
} = require('../helperFunctions.js')
const {
  getImdbSuggestionsForTitleFromDB,
  saveImdbSuggestionsForTitleToDB
} = require('../database.js')

async function getImdbSuggestionsForTitle (title) {
  try {
    const cacheSuggestions = await getImdbSuggestionsForTitleFromDB(title)
    if (cacheSuggestions) return cacheSuggestions

    const { data } = await axios.get(`https://v3.sg.media-imdb.com/suggestion/x/${encodeURIComponent(title)}.json`, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        accept: 'application/json, text/plain, */*',
        'accept-language': 'de-DE,de;q=0.6',
        priority: 'u=1, i',
        'sec-ch-ua': '"Not:A-Brand";v="99", "Brave";v="145", "Chromium";v="145"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-gpc': '1',
        'x-imdb-pace-migration': 'true',
        Referer: 'https://www.imdb.com/de/'
      }
    })
    let suggestions = []

    for (let i = 0; i < data.d.length; i++) {
      const entry = data.d[i]
      suggestions.push({
        title: entry.l,
        imdbid: entry.id,
        type: entry.qid,
        info: entry.s,
        year: entry.y,
        img: entry?.i?.imageUrl?.replace('_V1_', '_V1_QL300_UX200_') || null
      })
    }
    suggestions = suggestions.filter(movie => ['movie', 'tvMovie'].indexOf(movie.type) > -1)
    await saveImdbSuggestionsForTitleToDB(title, suggestions)

    logger.debug(suggestions)
    return suggestions
  } catch (err) {
    logger.error(err)
    return []
  }
}

module.exports = {
  getImdbSuggestionsForTitle
}
