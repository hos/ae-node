import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec)

/**
 * @param {string} input The input file path.
 * @param {string} output The output file path.
 */
export const toH264 = (input, output) => {
  return execPromise(`ffmpeg -i "${input}" -c:v h264 -y "${output}"`)
}
