const fsExtra = require('fs-extra')
const http = require('http')
const https = require('https')
const path = require('path')

const { STATUS_CODES } = http

/**
 * @param {{url}} resource Object containing url.
 * @param {Promise<string>} dest Destination file path.
 * @description Download remote resource to local directory.
 */
const download = async (resource, dest) => {
  const { url } = resource
  const request = url.startsWith('https') ? https : http
  await fsExtra.ensureDir(path.dirname(dest))

  return new Promise((resolve, reject) => {
    const onResponse = (response) => {
      if (response.statusCode >= 300) {
        if (response.statusCode < 400) {
          resolve(download(response.headers.location, dest))
        } else {
          reject(new Error(`${response.statusCode} : ${STATUS_CODES[response.statusCode]}`))
        }
        return
      }

      const fileStream = fsExtra.createWriteStream(dest)
      fileStream
        .once('error', reject)
        .once('close', () => resolve(dest))
      response
        .once('error', err => reject(err))
        .pipe(fileStream)
    }

    request.get(url)
      .once('response', onResponse)
      .once('error', reject)
  })
}

module.exports = download
