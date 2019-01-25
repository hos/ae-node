/**
 * Module mus provide interface for working with After Effects. All Ae
 * calls must be executed using this module which must handle concurrent
 * execution blocking if it is required and provide JS API for all
 * required operations.
 */

const childProcess = require('child_process')
const fsExtra = require('fs-extra')
const os = require('os')
const util = require('util')

const { ErrorUtil } = require('../../util')
const config = require('../../config')

const { AFTER_EFFECTS } = config
const { exec } = childProcess
const isRunning = Symbol('IS_RUNNING')

const execPromise = util.promisify(exec)

const SET_BUSY = Symbol('setBusy')
const SET_FREE = Symbol('setFree')

/**
 * @param {string} filePath
 * @description Generate command for executing
 * scripts in after effects. For details
 * see https://adobe.ly/2CsGsPG.
 */
const cmdForScript = (filePath) => {
  if (os.platform() === 'win32') {
    return `afterfx -r "${filePath}"`
  } else {
    return `osascript -e 'tell application id "com.adobe.aftereffects" to activate DoScriptFile "${filePath}"'`
  }
}

/**
 * @param {Arguments} params
 * @returns {string}
 * @description Get provided arguments
 * and if they exist push to args list.
 */
const generateCommand = (params = {}) => {
  const args = []

  args.push(`-project "${params.project}"`)
  args.push(`-comp "${params.compositionName}"`)
  args.push(`-output "${params.output}"`)

  params.startFrame > 0 && args.push(`-s "${params.startFrame}"`)
  params.endFrame > 0 && args.push(`-e "${params.endFrame}"`)
  params.increment > 0 && args.push(`-i "${params.increment}"`)

  params.omTemplate && args.push(`-OMtemplate "${params.omTemplate}"`)
  params.rsTemplate && args.push(`-RStemplate "${params.rsTemplate}"`)

  params.log && args.push(`-log "${params.log}"`)

  args.push(`-close DO_NOT_SAVE_CHANGES`)
  args.push(`-mp`)
  args.push(`-reuse`)
  args.push(`-continueOnMissingFootage`)

  return `"${AFTER_EFFECTS.RENDER_ENGINE}" ${args.join(' ')}`
}

/**
 * @param {string} str The Ae stdout and stderr.
 * @description Throw error if log contain error message.
 */
const throwIfFailed = (str) => {
  const regExs = [
    /.*aerender ERROR:.*/,
    /.*After Effects error:[^\r\n]+/,
    /.*logged one error.*/,
    /.*Rendering error while writing to file/,
    /aerender ERROR/,
    /Unable to obtain a license/
  ]

  str.split('\n').forEach(line => {
    regExs.forEach(regExp => {
      const match = line.match(new RegExp(regExp))
      if (match) {
        throw Error(line)
      }
    })
  })
}

class AfterEffects {
  static get OM_TEMPLATE_FILE_SUFFIX () {
    return {
      CineForm: '.mov',
      AppleProRes: '.mov',
      JPEG: '_[####].jpg'
    }
  }

  static get CLOSE_OPTION () {
    const _closeOptions = 'CloseOptions.'
    return {
      DO_NOT_SAVE_CHANGES: _closeOptions + 'DO_NOT_SAVE_CHANGES',
      PROMPT_TO_SAVE_CHANGES: _closeOptions + 'PROMPT_TO_SAVE_CHANGES',
      SAVE_CHANGES: _closeOptions + 'SAVE_CHANGES'
    }
  }

  static get PURGE_TARGET () {
    const _purgeTarget = 'PurgeTarget.'
    return {
      IMAGE_CACHES: _purgeTarget + 'IMAGE_CACHES',
      SNAPSHOT_CACHES: _purgeTarget + 'SNAPSHOT_CACHES',
      UNDO_CACHES: _purgeTarget + 'UNDO_CACHES',
      ALL_CACHES: _purgeTarget + 'ALL_CACHES'
    }
  }

  static get isRunning () {
    return AfterEffects[isRunning]
  }

  /**
   * @throws {AfterEffectsInUseError} If already busy.
   */
  static throwIfBusy () {
    if (AfterEffects.isRunning) {
      throw new ErrorUtil.AfterEffectsInUseError(
        `already running another instance of engine Ae`
      )
    }
  }

  /**
   * @throws {AfterEffectsInUseError} If already busy.
   * @description Set status to busy.
   */
  static [SET_BUSY] () {
    AfterEffects.throwIfBusy()
    AfterEffects[isRunning] = true
  }

  /**
   * @description Set status to free.
   */
  static [SET_FREE] () {
    AfterEffects[isRunning] = false
  }

  /**
   * @param {boolean} isRenderOnly
   * @description If 'isRenderOnly' is true, will
   * change after effects mode to render engine. Otherwise
   * it will change to standard mode. For more about
   * render only mode see https://adobe.ly/2yKBkTC.
   */
  static async changeMode (isRenderOnly) {
    if (isRenderOnly) {
      await fsExtra.writeFile(AFTER_EFFECTS.RENDER_ONLY_FILENAME, '')
    } else {
      await fsExtra.remove(AFTER_EFFECTS.RENDER_ONLY_FILENAME)
        .catch(() => false)
    }
  }

  /**
   * @param {Object} params
   * @param {string} params.project
   * @param {string} params.output
   * @param {string} params.compositionName
   * @param {string} [params.startFrame]
   * @param {string} [params.endFrame]
   * @param {string} [params.increment]
   * @param {string} [params.omTemplate]
   * @param {string} [params.rsTemplate]
   * @param {string} [params.log]
   * @description Run 'aerender' with specified
   * params and add stream data listeners if provided.
   * For options details see https://adobe.ly/2c854g3.
   */
  static async aerender (params) {
    const cmd = generateCommand(params)

    const { stdout, stderr } = await execPromise(cmd)
    throwIfFailed(stdout + stderr)

    return stdout
  }

  /**
   * @param {string} scriptPath
   * @description Generated command for running
   * AfterEffects and executing script.
   */
  static async runScript (scriptPath) {
    const cmd = cmdForScript(scriptPath)
    await execPromise(cmd)
  }
}

/**
 * Wrap each function which will call Ae,
 * to and block other calls until current
 * will complete.
 */
['runScript', 'aerender'].forEach((fnName) => {
  const fn = AfterEffects[fnName]

  AfterEffects[fnName] = async function () {
    AfterEffects[SET_BUSY]()
    try {
      return fn(...arguments)
    } finally {
      AfterEffects[SET_FREE]()
    }
  }
})

module.exports = AfterEffects
