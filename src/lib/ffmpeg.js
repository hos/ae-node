const { exec } = require('child_process')
const util = require('util')

const execPromise = util.promisify(exec)

/**
 * @param {string} input The input file path.
 * @param {string} output The output file path.
 */
const toH264 = (input, output) => {
  return execPromise(`ffmpeg -i "${input}" -c:v h264 -y "${output}"`)
}

module.exports = {
  toH264
}
