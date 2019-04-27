import { exec } from 'child_process'
import util from 'util'

import fsExtra from 'fs-extra'
import path from 'path'

import { ErrorUtil } from '../util'
import { TEMPLATES } from '../config'

const execPromise = util.promisify(exec)

/**
 * @param {string} provider
 * @param {string} accessKeyId
 * @param {string} secretAccessKey
 * @param {string} endpoint
 * @description The only way to use rclone configs,
 * without writing them in rclone.config file, is to
 * set environment variables for 'rclone'. see https://bit.ly/2yWtlnm.
 */
const _getEnv = (provider, accessKeyId, secretAccessKey, endpoint) => {
  return {
    [`RCLONE_CONFIG_${provider.toUpperCase()}_TYPE`]: 's3',
    [`RCLONE_CONFIG_${provider.toUpperCase()}_PROVIDER`]: provider,
    [`RCLONE_CONFIG_${provider.toUpperCase()}_ACCESS_KEY_ID`]: accessKeyId,
    [`RCLONE_CONFIG_${provider.toUpperCase()}_SECRET_ACCESS_KEY`]: secretAccessKey,
    [`RCLONE_CONFIG_${provider.toUpperCase()}_ENDPOINT`]: endpoint
  }
}

/**
 * @param {string} remotePath
 * @param {string} localPath
 * @description Sync S3 path to directory.
 */
const sync = async (templatePath) => {
  try {
    const _provider = Date.now()
    const _localPath = path.join(TEMPLATES.LOCAL_PATH, templatePath)
    const cmd = `rclone sync --exclude "${TEMPLATES.TEMPLATE_PREVIEW_FOLDER_NAME}/**" ` +
    `"${_provider}:${TEMPLATES.S3_BUCKET_NAME}/${templatePath}" "${_localPath}"`

    await fsExtra.ensureDir(_localPath)

    const env = _getEnv(
      _provider,
      TEMPLATES.S3_ACCESS_KEY_ID,
      TEMPLATES.S3_SECRET_ACCESS_KEY,
      TEMPLATES.S3_ENDPOINT
    )

    await execPromise(cmd, { env })
  } catch (err) {
    console.log(err)
    throw new ErrorUtil.TemplateSyncError(err.message)
  }
}

export default sync
