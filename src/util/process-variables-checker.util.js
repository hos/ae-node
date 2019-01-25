class ProcessVariablesChecker {
  /**
   * @description Check process variables for `production` mode.
   * @throws Will throw error if required environment variable is missing.
   */
  static check () {
    if (process.env.NODE_ENV === 'production') {
      ProcessVariablesChecker.REQUIRED_VARIABLES.forEach(variable => {
        if (!process.env[variable]) {
          throw new Error(`Missing '${variable}' required environment variable.`)
        }
      })
    }
  }
}

ProcessVariablesChecker.REQUIRED_VARIABLES = [
  'S3_ACCESS_KEY_ID',
  'S3_BUCKET_NAME',
  'S3_ENDPOINT',
  'S3_PROVIDER',
  'S3_SECRET_ACCESS_KEY'
]

module.exports = ProcessVariablesChecker
