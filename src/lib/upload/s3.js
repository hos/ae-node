const fs = require('fs')

const AwsSdk = require('aws-sdk')

class S3Lib {
  /**
   * @param filePath
   * @param credentials
   * @param upload
   * @description Upload provided file to s3
   * compatible service.
   */
  static async upload (filePath, credentials, upload) {
    const s3 = new AwsSdk.S3({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      endpoint: upload.endpoint
    })

    const stream = fs.createReadStream(filePath)

    const params = {
      Bucket: upload.bucket,
      Key: upload.key,
      Body: stream
    }

    return s3
      .upload(params)
      .promise()
  }
}

module.exports = S3Lib
