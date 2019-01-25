const { S3 } = require('aws-sdk')
const fsExtra = require('fs-extra')

/**
 * @param {{accessKeyId, secretAccessKey, key, endpoint, bucket}} resource
 * @param {string} dest
 * @description Download provided s3 object to dest.
 */
const download = async (resource, dest) => {
  const { accessKeyId, secretAccessKey, key, endpoint, bucket } = resource

  const s3 = new S3({
    accessKeyId,
    secretAccessKey,
    endpoint
  })

  const params = {
    Bucket: bucket,
    Key: key
  }

  const obj = await s3.getObject(params).promise()

  await fsExtra.writeFile(dest, obj.Body)

  return dest
}

module.exports = download
