import path from 'path'

import fsExtra from 'fs-extra'

import AfterEffects from './after-effects'
import * as config from '../../config'
import s3Upload from '../upload/s3'
import sync from '../sync'
import { toH264 } from '../ffmpeg'

const { WORKPLACE, TEMPLATES } = config
const { TEMPLATE_PREVIEW_FOLDER_NAME } = TEMPLATES

const credentials = {
  accessKeyId: TEMPLATES.S3_ACCESS_KEY_ID,
  secretAccessKey: TEMPLATES.S3_SECRET_ACCESS_KEY
}

class Preview {
  constructor (data) {
    const { template, resolutions } = data
    this.template = template
    this.resolutions = resolutions
    this.templateLocalPath = path.join(
      config.TEMPLATES.LOCAL_PATH,
      template.path
    )
    this.uploadedPreviews = []
  }

  async cineFormToH264 (input) {
    const ext = path.extname(input)
    const output = input.replace(new RegExp(ext + '$'), '.mp4')
    await toH264(input, output)
  }

  async uploadPreviews (composition, outPath) {
    const { template } = this

    const previews = await fsExtra.readdir(outPath)

    const promises = previews.map(async previewFile => {
      const filePath = path.join(outPath, previewFile)
      const key = `${template.path}/${TEMPLATE_PREVIEW_FOLDER_NAME}/${
        composition.name
      }/${previewFile}`

      await s3Upload.upload(filePath, credentials, {
        endpoint: TEMPLATES.S3_ENDPOINT,
        bucket: TEMPLATES.S3_BUCKET_NAME,
        key
      })

      return key
    })

    return Promise.all(promises)
  }

  async makePreviewForComp (aep, composition, outPath) {
    const { templateLocalPath } = this
    const aepPath = path.join(templateLocalPath, aep.fileName)

    for (const output of composition.outputs) {
      const ext = AfterEffects.OM_TEMPLATE_FILE_SUFFIX[output.omTemplate]

      for (const resolution of this.resolutions) {
        const outputPath = path.join(
          outPath,
          `${resolution.height}x${resolution.width}${ext}`
        )

        await fsExtra.ensureDir(outPath)
        await AfterEffects.aerender({
          project: aepPath,
          compositionName: composition.name,
          startFrame: output.startFrame,
          endFrame: output.endFrame,
          omTemplate: output.omTemplate,
          increment: output.increment,
          output: outputPath
        })

        if (output.omTemplate === 'CineForm') {
          await this.cineFormToH264(outputPath)
        }
      }
    }

    this.uploadedPreviews.push({
      project: aep.fileName,
      name: composition.name,
      previews: await this.uploadPreviews(composition, outPath)
    })
  }

  async makeTemplatePreview () {
    const { template } = this

    await sync(template.path)

    for (const aep of template.aeps) {
      for (const composition of aep.compositions) {
        const outPath = path.join(
          WORKPLACE,
          'preview',
          template.path,
          composition.name
        )

        await this.makePreviewForComp(aep, composition, outPath)
      }
    }

    return this.uploadedPreviews
  }
}

/**
 * @param {Object} data
 * @param {Object} data.template
 * @param {string} data.template.path The template path ex. 'UserName/Template'.
 * @param {Array<{fileName: string, compositions: []}>} data.template.aeps Each
 *  aep with compositions array.
 * @param {Array<{height:number,width:number}>} data.resolutions All
 * resolutions that must be provided.
 * @returns {Array<{name: string, previews: []}>} Previews will contain
 * the key on s3 bucket where it have been uploaded.
 * @description Make preview images or videos and upload to
 * 'TEMPLATE/TEMPLATE_PREVIEW_FOLDER_NAME' folder. The preview will be made
 * for each composition provided in 'aeps.compositions' array
 * and with each resolution provided in resolutions array.
 */
export const preview = async data => {
  return new Preview(data).makeTemplatePreview()
}
