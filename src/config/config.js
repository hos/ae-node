const path = require('path')
const os = require('os')

const win32Paths = {
  renderEngineFileName: 'aerender.exe',
  renderOnlyPath: 'C:\\Users\\Public\\Documents\\Adobe\\ae_render_only_node.txt'
}

const darwinPaths = {
  renderEngineFileName: 'aerender',
  renderOnlyPath: '/Users/Shared/Adobe/ae_render_only_node.txt'
}

const platformSpecific = (() => {
  const platform = os.platform()

  if (platform === 'win32') {
    return win32Paths
  }
  if (platform === 'darwin') {
    return darwinPaths
  }

  throw Error(`unsupported platform ${platform}`)
})()

const config = {
  WORKPLACE: path.join(os.homedir(), 'engine'),
  AFTER_EFFECTS: {
    RENDER_ENGINE: platformSpecific.renderEngineFileName,
    RENDER_ONLY_FILENAME: platformSpecific.renderOnlyPath
  },
  TEMPLATES: {
    LOCAL_PATH: path.join(os.homedir(), 'engine/templates'),
    TEMPLATE_PREVIEW_FOLDER_NAME: '_preview',
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY
  }
}

module.exports = config
