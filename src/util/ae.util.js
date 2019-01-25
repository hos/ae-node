
class AeUtil {
  /**
   * @param {string} code
   * @description If code starts with '(',
   * append ';' before it.
   */
  static normalizeCode (code) {
    if (code.startsWith('(')) {
      return ';' + code
    }
    return code
  }

  /**
   * @param {Array|string} err
   * @returns {string|null}
   */
  static normalizeStack (stack) {
    if (Array.isArray(stack)) {
      return stack.join('\n')
    } else if (typeof stack === 'string') {
      return stack
    } else {
      return null
    }
  }
}

module.exports = AeUtil
