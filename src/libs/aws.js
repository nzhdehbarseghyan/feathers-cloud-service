const { S3 } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')
const logger = require('../logger')

/**
 * Creates and returns an S3 client with the specified credentials and region.
 *
 * @param {string} accessKeyId - The access key ID for AWS authentication.
 * @param {string} secretAccessKey - The secret access key for AWS authentication.
 * @param {string} region - The AWS region for the S3 client.
 * @returns {Object} - The S3 client object.
 * @throws {Error} - If any of the required input parameters are missing.
 */
function createS3Client (accessKeyId, secretAccessKey, region) {// TODO: This will be used if each user is using their own AWS account.
  // Validate and sanitize input from the client side before using it
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Invalid input from the client side')
  }

  // Create an S3 client with the specified credentials and region
  const credentials = { accessKeyId, secretAccessKey }

  if (!region) {
    region = 'us-east-1'
  }

  return new S3({
    region,
    credentials,
  })
}

/**
 * Creates an S3 bucket with the given region and name.
 * @param {Object} s3Data - The AWS S3 keys.
 * @param {string} region - The region where the bucket will be created.
 * @param {string} name - The name of the bucket.
 * @returns {Promise<Object>} - A promise that resolves to the created bucket object.
 * @throws {Error} - If there was an error creating the bucket.
 */
const createS3Bucket = async (s3Data, region, name) => {
  try {
    const { accessKey, secretKey } = s3Data
    const s3 = createS3Client(accessKey, secretKey, region)

    return await s3.createBucket({
      Bucket: name,
    })
  } catch (e) {
    logger.error('[AWS createS3Bucket] Error occurred ', e)
    throw e
  }
}

/**
 * Retrieves a list of buckets from an S3 client.
 * @param {object} s3Data - The S3 credentials and configuration.
 * @returns {Promise<ListBucketsCommandOutput>} - The list of buckets.
 * @throws {Error} - If there is an error retrieving the list of buckets.
 */
const getBucketList = async (s3Data) => {
  try {
    const { accessKey, secretKey } = s3Data
    const s3 = createS3Client(accessKey, secretKey, process.env.S3_REGION)

    return await s3.listBuckets({})
  } catch (e) {
    logger.error('[AWS getBucketList] Error occurred ', e)
    throw e
  }
}

/**
 * Uploads a file to AWS S3 bucket.
 *
 * @param {string} userId - The ID of the user uploading the file.
 * @param {Object} fileDetail - The details of the file to be uploaded.
 * @param {string} fileDetail.name - The original name of the file.
 * @param {Buffer} fileDetail.html - The file data as a Buffer.
 * @param {string} bucket - The AWS S3 bucket name.
 * @param {Object} credentials - The AWS credentials object.
 * @param {string} credentials.awsS3.accessKey - The access key for AWS S3.
 * @param {string} credentials.awsS3.secretKey - The secret key for AWS S3.
 * @param {string} credentials.region - The AWS region.
 * @returns {Object} - An object containing the location, bucket, and key of the uploaded file.
 */
const s3Upload = async (userId, fileDetail, bucket, credentials) => {
  try {
    const s3 = createS3Client(credentials.awsS3.accessKey, credentials.awsS3.secretKey, credentials.region)
    const uploadedFile = await new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: `${process.env.S3_DIRECTORY}/${userId}/${fileDetail.name}`,
        Body: fileDetail.html,
      },
    }).done()

    return { location: uploadedFile.Location, bucket: uploadedFile.Bucket, key: uploadedFile.Key }
  } catch (e) {
    logger.error(e)
    throw e
  }
}

/**
 * Retrieves a file from an S3 bucket.
 *
 * @param {string} key - The key of the file.
 * @param {string} bucket - The name of the S3 bucket.
 * @param {Object} credentials - The AWS credentials.
 * @param {string} credentials.accessKey - The access key for the AWS account.
 * @param {string} credentials.secretKey - The secret key for the AWS account.
 * @param {string} credentials.region - The AWS region.
 * @returns {Promise<Object>} - A Promise that resolves to an object containing the file data and content type.
 * @throws {Error} - If there is an error retrieving the file.
 */
const getS3File = async (key, bucket, credentials) => {
  try {
    const s3 = createS3Client(credentials.accessKey, credentials.secretKey, credentials.region)
    const getObjectParams = {
      Bucket: bucket,
      Key: key,
    }

    const fileData = await s3.getObject(getObjectParams)
    const buf = await fileData.Body.transformToString()

    return { body: buf }
  } catch (e) {
    logger.error('[Get S3 File] error occurred', e)
    throw e // Rethrow the error so that the caller can handle it
  }
}

/**
 * Update an S3 file with the provided body content.
 *
 * @param {string} userId - The ID of the user.
 * @param {string|Buffer|Uint8Array|Blob} body - The content of the file to be updated.
 * @param {object} fileDetail - The details of the file to be updated.
 * @param {object} credentials - The AWS credentials object.
 * @returns {object} - The location of the updated file.
 * @throws {Error} - If there is an error updating the file.
 */
const updateS3File = async (userId, body, fileDetail, credentials) => {
  try {
    const s3 = createS3Client(credentials.accessKey, credentials.secretKey, fileDetail.region)
    const putObjectParams = {
      Bucket: fileDetail.bucket,
      Key: fileDetail.key,
      Body: body,
    }

    await s3.putObject(putObjectParams)

    return { location: '' }
  } catch (e) {
    logger.error(e)
    throw e // Rethrow the error so that the caller can handle it
  }
}

module.exports = {
  createS3Bucket,
  getBucketList,
  s3Upload,
  getS3File,
  updateS3File
}
