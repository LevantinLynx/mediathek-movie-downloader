const logger = require('./logger.js')
const { Glob, $ } = require('bun')
const fs = require('fs-extra')
const path = require('path')
const { sanitizeFileAndDirNames } = require('./helperFunctions.js')

const glob = new Glob('*')
const partialDownloadFile = new Glob('*.part*')
const partialDownloadFileYtdl = new Glob('*.ytdl*')
const shellScriptFile = new Glob('*.sh')
const jsonFile = new Glob('*.json')
const movieMkvFile = new Glob('*.mkv')
const movieMp4File = new Glob('*.mp4')
const movieWebmFile = new Glob('*.webm')
const subtitleFile = new Glob('*.vtt')

/**
 * Clean up file names and remove partial download files
 * @param {Object} movie object from download process
 */
async function downloadPostProcessing (movie) {
  let shouldExecuteShellScript = false
  let shellScriptFileName = null
  const files = glob.scanSync(movie.baseDownloadPath)

  for (let file of files) {
    if (partialDownloadFile.match(file) || partialDownloadFileYtdl.match(file)) {
      logger.debug(`[POSTPROCESSING] Deleting partial download file: "${file}"`)
      Bun.file(path.join(movie.baseDownloadPath, file)).delete()
    } else {
      const cleanFileName = sanitizeFileAndDirNames(file)

      // Rename file
      if (cleanFileName !== file) {
        try {
          logger.debug(`[POSTPROCESSING] Renaming "${file}" to "${cleanFileName}"…`)
          await fs.move(
            path.join(movie.baseDownloadPath, file),
            path.join(movie.baseDownloadPath, cleanFileName)
          )
          logger.debug('[POSTPROCESSING] Setting new file name …')
          file = cleanFileName
        } catch (err) {
          logger.error(`[POSTPROCESSING] Error while trying to rename file "${file}" to "${cleanFileName}"`)
          logger.error(err.message || err)
        }
      }

      if (shellScriptFile.match(file)) {
        shouldExecuteShellScript = true
        shellScriptFileName = file
        logger.debug('[POSTPROCESSING] Shell script detected!')
      } else if (jsonFile.match(file)) {
        logger.debug('[POSTPROCESSING] Json file detected!')
      } else if (movieMkvFile.match(file) || movieMp4File.match(file) || movieWebmFile.match(file)) {
        logger.debug('[POSTPROCESSING] Movie file detected')
      } else if (subtitleFile.match(file)) {
        logger.debug('[POSTPROCESSING] Subtitle file detected')
        if (movie.title.indexOf('.') === -1) {
          if (file !== cleanFileName) {
            logger.debug(`[POSTPROCESSING] Renaming subtitle "${file}" to "${cleanFileName}"…`)
            await fs.move(
              path.join(movie.baseDownloadPath, file),
              path.join(movie.baseDownloadPath, cleanFileName)
            )
          }
        }
      }
    }
  }

  if (shouldExecuteShellScript && shellScriptFileName) {
    try {
      logger.debug(`[POSTPROCESSING] Running script "${shellScriptFileName}"`)
      await $`chmod +x ${path.join(movie.baseDownloadPath, shellScriptFileName)}`.quiet()
      await $`/bin/sh ${path.join(movie.baseDownloadPath, shellScriptFileName)}`.quiet()
      await $`rm ${path.join(movie.baseDownloadPath, shellScriptFileName)}`.quiet()
      logger.debug(`[POSTPROCESSING] DONE! Running script "${shellScriptFileName}"`)
    } catch (err) {
      logger.error(`Error while executing script: ${shellScriptFileName} ${err.exitCode}`)
      logger.error('stdout', err.stdout.toString())
      logger.error('stderr', err.stderr.toString())
    }
  }
}

module.exports = {
  downloadPostProcessing
}
