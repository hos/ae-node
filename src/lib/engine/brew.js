/**
 * Module for generating and executing scripts, with
 * support of TCP connection which can be used in
 * extendscript for sending messages to node.js server.
 */

const net = require('net')
const os = require('os')
const path = require('path')

const fsExtra = require('fs-extra')

const AfterEffects = require('./after-effects')
const { AeUtil, ErrorUtil } = require('../../util')
const config = require('../../config')

const { WORKPLACE } = config

const AEQUERY_PATH = require.resolve('aequery').replace(/\\/g, '/') // to make path correct on windows

// Directory with write access.
const SCRIPTS_PATH = path.join(WORKPLACE, 'engine')

const scriptExt = 'jsx'

const defaultContext = {
  host: null,
  port: null,
  logPath: path.join(SCRIPTS_PATH, 'log.log'),
  outputPath: path.join(SCRIPTS_PATH, 'output.js'),
  scriptPath: path.join(SCRIPTS_PATH, `script.${scriptExt}`)
}

Object.freeze(defaultContext)

class Brew {
  /**
   * @param {string} flags
   * @returns {string} Not supported flag, if any.
   * @description Check for invalid flags, that is
   * not supported by extendscript.
   */
  static validateRegExpFlags (flags) {
    const supportedFlags = ['i', 'm', 'g']
    return flags
      .split('')
      .some(f => !supportedFlags.find(f))
  }

  /**
   * @param {string} code Function call code.
   * @param {...*} args Arguments to put into function call.
   * @returns {string} Inserted string.
   * @description Inserts stringified arguments in function parentheses.
   * The 'undefined' values also will be passed to let omit parameters.
   */
  static setArgs (code, ...args) {
    const withUndefined = argv => {
      if (argv === undefined) {
        return 'undefined'
      }
      return JSON.stringify(argv)
    }

    const argsStr = args
      .map(withUndefined)
      .join(',')

    return code.replace(/\(.*\)/, `(${argsStr})`)
  }

  /**
   * @param {string} filePath
   * @description Load file with import(),
   * if there is _error throw, otherwise return 'output'.
   */
  static loadOutput (filePath) {
    const output = require(filePath)

    if (!output) {
      throw Error('output is missing after execution')
    }

    if (output._error) {
      const err = new ErrorUtil.AeScriptError(output._error.message)
      err.stack += '\n' + AeUtil.normalizeStack(output._error.stack)
      throw err
    }

    return output._return
  }

  /**
   * @param {string} [dir] Directory to write
   * log, script and output files. Default is
   * $HOME + 'engine'.
   */
  constructor (dir) {
    this.aeLab = ''
    this.code = []
    this.isLoaded = false

    this.ctx = Object.assign({}, defaultContext, {
      logPath: dir && path.join(dir, `log.log`),
      outputPath: dir && path.join(dir, `output.js`),
      scriptPath: dir && path.join(dir, `script.${scriptExt}`)
    })

    this.server = net.createServer((socket) => {
      socket.pipe(process.stdout)
      socket.unref()
    })
  }

  /**
   * @description Empty code array.
   */
  unsetCode () {
    this.code = []
    return this
  }

  /**
   * @param {boolean} force Load scripts even if loaded.
   * @description Reads init script from file.
   */
  async loadScripts (force) {
    if (this.isLoaded && !force) {
      return
    }

    this.aeLab = [
      `// @include "${AEQUERY_PATH}"`,
      `// @include "${path.join(__dirname, 'lab/main.jsx')}"`,
      `// @include "${path.join(__dirname, 'lab/extract.jsx')}"`
    ].join('\n')

    this.isLoaded = true
  }

  /**
   * @param {string} code Usually function call.
   * @description Concat provided code with
   * already existing wrapping it into os.EOL.
   */
  addCode (code) {
    this.code.push('  ' + code)
    return this
  }

  /**
   * @param {string} aepPath
   * @description Open provided 'aep' file.
   */
  openProject (aepPath) {
    return this.addCode(
      Brew.setArgs(`var file = Lab.openProject()`, aepPath)
    )
  }

  /**
   * @enum {AfterEffects.CLOSE_OPTION} closeOption
   */
  closeProject (closeOption = AfterEffects.CLOSE_OPTION.DO_NOT_SAVE_CHANGES) {
    return this.addCode(
      `if (app.project.close) app.project.close(${closeOption})`
    )
  }

  beginSuppressDialogs () {
    return this.addCode(
      `app.beginSuppressDialogs()`
    )
  }

  endSuppressDialogs (alert = false) {
    return this.addCode(
      `app.endSuppressDialogs(${alert})`
    )
  }

  /**
   * @param {AfterEffects.PURGE_TARGET} option
   * Default is 'ALL_CACHES'.
   * @description Calls app.purge() with
   * 'PurgeTarget.ALL_CACHES' option.
   */
  purge (option = AfterEffects.PURGE_TARGET.ALL_CACHES) {
    return this.addCode(
      `app.purge(${option})`
    )
  }

  /**
   * @param {Function} fn
   * @description Convert to string and
   * run the provided code.
   */
  runFn (fn) {
    return this.addCode(
      `return (${fn.toString()})()`
    )
  }

  /**
   * @param {string} code
   * @description Run provided code,
   * this will use addCode under the hook.
   */
  runCode (code) {
    return this.addCode(
      AeUtil.normalizeCode(code)
    )
  }

  /**
   * @param {string} layerName
   * @param {*} value
   */
  replaceAsset (matchFilePath, newFilePath) {
    return this.addCode(
      Brew.setArgs(`Lab.replaceAsset()`, matchFilePath, newFilePath)
    )
  }

  /**
   * @param {string} layerName
   * @param {*} value
   */
  replaceText (layerName, value) {
    return this.addCode(
      Brew.setArgs(`Lab.replaceText()`, layerName, value)
    )
  }

  /**
   * @param {string} composition Composition name to add,
   * will use first matched composition.
   * @description Find composition with 'aequery' and
   * add it to 'renderQueue.items' collection.
   */
  addQueue (composition) {
    return this.addCode(`
      var comp = aeq('comp[name="${composition}"]')[0]
      if(!comp) {
        throw Error('can\\'t find composition with name "${composition}"')
      }
      app.project.renderQueue.items.add(comp)
      app.project.renderQueue.item(1).outputModule(1).applyTemplate('Lossless')
    `)
  }

  /**
   * @param {number} width
   * @param {number} height
   * @description Resize to width and height.
   */
  setResizeTo (width, height) {
    return this.addCode(`
      var resizeTo = {
        "Lock Aspect Ratio": "true",
        'Resize to': {
          x: ${width},
          y: ${height}
        }
      }
      app.project.renderQueue.item(1).outputModule(1).setSettings(resizeTo)
    `)
  }

  /**
   * @param {string} templatePath
   * @description Set this.ctx.templatePath.
   */
  setTemplatePath (templatePath) {
    if (typeof templatePath !== 'string') {
      throw Error(`'templatePath' must be string, got ${typeof templatePath}`)
    } else {
      this.ctx.templatePath = templatePath
      return this
    }
  }

  /**
   * @param {string} outputPath
   * @description Set output video file directory.
   */
  setOutput (outputPath) {
    const outputStr = JSON.stringify(outputPath)
    return this.addCode(`
      var omSettings = {}
      omSettings['Output File Info'] = {}
      omSettings['Output File Info']['Full Flat Path'] = ${outputStr}
      app.project.renderQueue.item(1).outputModule(1).setSettings(omSettings)

      app.project.renderQueue.item(1).logType = LogType.ERRORS_AND_PER_FRAME_INFO
    `)
  }

  /**
   * @param {Object} opts
   * @param {string} opts.folderRegExp
   * @param {string} opts.flags Extendscript RegExp flags i, m, g.
   * @param {boolean} opts.onlyUnused Ignore comps used in other comps.
   * @description Extract compositions that not used
   * in other compositions with layers used in it.
   */
  extractMeta (opts) {
    const { folderRegExp, flags, onlyUnused } = opts

    if (typeof flags === 'string') {
      const invalidFlag = Brew.validateRegExpFlags(flags)
      if (invalidFlag) {
        throw Error(`the flag '${invalidFlag}' is not supported by extendscript`)
      }
    }

    if (folderRegExp && typeof folderRegExp !== 'string') {
      throw Error(`'folderRegExp' must be string, got ${typeof folderRegExp}`)
    }

    return this.addCode(
      Brew.setArgs(`return Lab.extractMeta()`, {
        folderRegExp,
        flags,
        onlyUnused
      })
    )
  }

  /**
   * @description Call 'renderQueue.render()' function.
   */
  render () {
    return this.addCode(
      `app.project.renderQueue.render()`
    )
  }

  /**
   * @description First checking if host is
   * 'localhost' or '127.0.0.1' opening TCP server for
   * chatting with After Effects then, concatenating
   * scripts in order they have been provided and appending after
   * AeLab, wrapping provided code in try...catch block.
   */
  async _wrapCode () {
    if (this.ctx.host !== null) {
      this.ctx.port = await this.openChat()
    }

    const newCode = [
      this.aeLab,
      'try {',
      `Lab.ctx = ${JSON.stringify(this.ctx, null, 2)}`,
      'Lab.connect()',
      ...this.code,
      `} catch (err) {
        Lab.setError(err)
      }
      Lab.writeLog()
      Lab.writeOutput()
      `
    ]

    return newCode.join(os.EOL.repeat(2))
  }

  /**
   * @description Save project on same file.
   */
  saveProject () {
    return this.addCode(
      `app.project.save(file)`
    )
  }

  /**
   * @param {string} [fieldName] Field name on output object.
   * @description Will wrap last code in anonymous function,
   * to save result as '_return[fieldName]'. If no field name
   * provided result will to the return object and all
   * previously saved object will not be exported.
   */
  saveResultAs (fieldName) {
    const inFn = `(function () {${this.code.pop()}})()`
    const comma = fieldName ? ', ' : ''
    const _fieldName = fieldName ? JSON.stringify(fieldName) : ''
    const lastBlock = `Lab.saveAs(${inFn}${comma}${_fieldName})`

    return this.addCode(lastBlock)
  }

  async openChat () {
    return new Promise((resolve, reject) => {
      this.server.on('error', (err) => {
        if (!resolve.called) {
          reject(err)
        }
      })
      this.server.listen(0, () => {
        resolve.called = true
        resolve(this.server.address().port)
      })
    })
  }

  /**
   * @description Close chat if it is open.
   */
  async closeChat () {
    return new Promise((resolve, reject) => {
      if (this.server.listening) {
        this.server.close((err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * @returns {Promise<Object>} Will resolve to output object,
   * with saved fields on exported object.
   * @description Loads 'lib.ae.js' script if not loaded,
   * and then executes provided script.
   */
  async promise () {
    await this.loadScripts()

    const code = await this._wrapCode()

    await fsExtra.ensureFile(this.ctx.outputPath)
    await fsExtra.ensureFile(this.ctx.logPath)
    await fsExtra.writeFile(this.ctx.scriptPath, code)

    this.unsetCode()
    await AfterEffects.runScript(this.ctx.scriptPath)
    this.closeChat()

    return Brew.loadOutput(this.ctx.outputPath)
  }
}

module.exports = Brew
