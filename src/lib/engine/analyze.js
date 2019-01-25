/**
 * Module is high level API for analyzing After Effects.
 */

const path = require('path')

const fsExtra = require('fs-extra')
const walkPromise = require('walk-promise')

const { LoggerUtil } = require('../../util')
const AfterEffects = require('./after-effects')
const Brew = require('./Brew')
const config = require('../../config')
const Sync = require('../sync')

const { WORKPLACE } = config

class Analyzer {
  constructor (data) {
    const { template, id } = data
    this.task = data

    this.templateLocalPath = path.join(config.TEMPLATES.LOCAL_PATH, template.path)
    this.outputDir = path.join(WORKPLACE, 'analyzes', id)
  }

  /**
   * @description Sync template and find all
   * .aep files in root and sub folders.
   */
  async prepare () {
    await fsExtra.ensureDir(this.outputDir)

    await Sync(this.task.template.path, config.TEMPLATES.PATH)
    const items = await walkPromise(this.templateLocalPath)

    this.aeps = items
      .filter(item => item.name.endsWith('.aep'))
      .map(item => {
        const relativePath = item.root
          .replace(this.templateLocalPath, '')

        return path.join(
          relativePath || '/', // ensure that it starts with '/'
          item.name
        )
      })
  }

  /**
   * @returns {Array<Object>} Template data.
   * @description Personalizes the text areas in project
   * and executes the script for rendering.
   */
  async runAe () {
    const { extract = {} } = this.task
    const data = []

    for (const aep of this.aeps) {
      const fullAepPath = path.join(this.templateLocalPath, aep)

      const ae = new Brew(this.outputDir)
        .beginSuppressDialogs()
        .closeProject()
        .purge(AfterEffects.PURGE_TARGET.ALL_CACHES)
        .setTemplatePath(this.templateLocalPath)
        .openProject(fullAepPath)
        .extractMeta(extract)
        .saveResultAs('compositions')
        .closeProject(AfterEffects.CLOSE_OPTION.DO_NOT_SAVE_CHANGES)
        .endSuppressDialogs()

      const analyzes = await ae.promise()

      data.push({
        project: aep,
        ...analyzes
      })
    }

    return data
  }

  /**
   * @description Analyze the project, get
   * compositions with containing layers.
   */
  async analyze () {
    try {
      AfterEffects.throwIfBusy()

      await this.prepare()

      return this.runAe()
    } catch (error) {
      LoggerUtil.warn(error)
      return error
    }
  }
}

const analyze = (data) => {
  return new Analyzer(data).analyze()
}

module.exports = {
  analyze
}
