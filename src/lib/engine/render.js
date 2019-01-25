/**
 * Module is high level API for rendering After Effects
 * projects and executing scripts.
 */

const path = require('path')

const fsExtra = require('fs-extra')

const { LoggerUtil } = require('../../util')
const AfterEffects = require('./after-effects')
const Brew = require('./Brew')
const config = require('../../config')
const Download = require('../download')
const S3 = require('../upload/s3')
const sync = require('../sync')

const { WORKPLACE } = config

class Render {
  constructor (data) {
    this.task = data

    const { template, output = {} } = data
    const outputName = output.name

    this.templateLocalPath = path.join(config.TEMPLATES.LOCAL_PATH, template.path)
    this.aepPath = path.join(this.templateLocalPath, template.aepName)
    this.outputDir = path.join(WORKPLACE, 'render', data.id)
    this.outputPath = path.join(this.outputDir, `${outputName}.mov`)

    const ext = path.extname(this.outputPath)

    output.name = outputName
    if (!data.upload.key) {
      data.upload.key = `${data.id}/${outputName}${ext}`
    }
  }

  /**
   * @param {Object} resource
   * @returns {{accessKeyId: string, secretAccessKey: string}} Credentials
   * @description If 'resource.credentials' is truly will return credentials,
   * if 'resource.credentialsIndex' is positive number or 0, will return credentials[index].
   */
  getCredentials (resource) {
    if (resource.credentials) {
      return resource.credentials
    }
    if (resource.credentialsIndex >= 0) {
      return this.task.credentials[resource.credentialsIndex]
    }
    return null
  }

  /**
   * @description Personalizes the text areas in project
   * and executes the script for rendering.
   */
  async runAe () {
    const { template, layers, output } = this.task
    const { resolution } = output

    const renderDir = path.join(this.outputDir)
    const ae = new Brew(renderDir)
      .beginSuppressDialogs()
      .closeProject()
      .purge(AfterEffects.PURGE_TARGET.ALL_CACHES)
      .openProject(this.aepPath)
      .setTemplatePath(this.templateLocalPath)

    for (const layer of layers) {
      if (layer.resource) {
        ae.replaceAsset(
          layer.relativePath,
          layer._filePath
        )
      } else if (layer.value) {
        ae.replaceText(layer.name, layer.value)
      }
    }

    ae
      .addQueue(template.composition)
      .setOutput(this.outputPath)

    if (resolution && resolution.width > 0 && resolution.height > 0) {
      ae.setResizeTo(resolution.width, resolution.height)
    }

    // save to prevent Ae opening dialog for unsaved files
    return ae.saveProject()
      .closeProject(AfterEffects.CLOSE_OPTION.SAVE_CHANGES)
      .endSuppressDialogs()
      .promise()
  }

  /**
   * @description Sync template and replace assets,
   * ensure that output directory exist and output
   * file don't exist as Ae will fail if file
   * already exist.
   */
  async prepare () {
    await fsExtra.ensureFile(this.outputPath)
    await fsExtra.remove(this.outputPath)

    await sync(this.task.template.path, config.TEMPLATES.PATH)

    await this.downloadAssets()
  }

  /**
   * @description Will loop over 'assets' and download
   * 'asset.resource' into 'assetsPath' + 'asset.relativePath'.
   */
  async downloadAssets () {
    const { layers } = this.task
    const toDos = []

    for (const layer of layers) {
      const { resource } = layer
      if (!resource) {
        continue
      }

      const opts = Object.assign({}, resource,
        this.getCredentials(resource)
      )

      layer._filePath = path.join(this.outputDir, layer.relativePath)
      await fsExtra.ensureDir(path.dirname(layer._filePath))

      const downloader = Download[resource.fetchMethod]
      toDos.push(
        downloader(opts, layer._filePath)
      )
    }

    await Promise.all(toDos)
  }

  /**
   * @description Render aep file.
   */
  async _execRendering () {
    return AfterEffects.aerender({
      project: this.aepPath,
      compositionName: this.task.template.composition,
      output: this.outputPath
    })
  }

  /**
   * @description Upload the output file,
   * as specified in task.upload.
   */
  async upload () {
    const task = this.task
    const credentials = this.getCredentials(task.upload)

    await S3.upload(
      this.outputPath,
      credentials,
      this.task.upload
    )
  }

  /**
   * @description Render the project described in template
   * and than upload to s3 compatible device.
   */
  async render () {
    try {
      AfterEffects.throwIfBusy()

      await this.prepare()

      await this.runAe()

      await this._execRendering()

      await this.upload()

      return { uri: this.task.upload.key }
    } catch (error) {
      LoggerUtil.warn(error)
      return error
    }
  }
}

/**
 * @param {Object} task
 * @description Render the project described in template
 * and than upload to s3 compatible device.
 */
const render = (task) => {
  return new Render(task).render()
}

module.exports = {
  render
}
