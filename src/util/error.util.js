const ERRORS_NAME = [
  'AeScriptError',
  'AfterEffectsInUseError',
  'MissingDownloaderError',
  'TemplateSyncError'
]

const ERRORS = ERRORS_NAME.reduce((acc, className) => {
  acc[className] = ({
    [className]: class extends Error {
      constructor (msg) {
        super()
        this.message = msg
        this.name = this.constructor.name
      }
    }
  })[className]

  return acc
}, {})

module.exports = ERRORS
