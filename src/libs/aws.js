const { S3 } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const logger = require('../logger');
let s3 = new S3();

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

  s3 = new S3({
    region,
    credentials,
  })

  return s3
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
    s3 = createS3Client(accessKey, secretKey, region)

    return await s3.createBucket({
      Bucket: name,
    })

    // const bucketPolicy = { // TODO: This should be uncommented to change bucket permission (if needed)
    //   'Version': '2012-10-17',
    //   'Statement': [
    //     {
    //       'Effect': 'Allow',
    //       'Principal': '*',
    //       'Action': 's3:GetObject',
    //       'Resource': `arn:aws:s3:::${name}/*`
    //     }
    //   ]
    // }
    //
    // const putBucketPolicyParams = {
    //   Bucket: name,
    //   Policy: JSON.stringify(bucketPolicy),
    // }
    // await s3.send(new PutBucketPolicyCommand(putBucketPolicyParams))
  } catch (e) {
    logger.error('[AWS createS3Bucket] Error occurred ', e)
    throw e
  }
}

const getBucketList = async (s3Data) => {
  try {
    const { accessKey, secretKey } = s3Data
    s3 = createS3Client(accessKey, secretKey, process.env.S3_REGION)

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
    s3 = createS3Client(credentials.awsS3.accessKey, credentials.awsS3.secretKey, credentials.region)
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
 * @returns {Object} - An object containing the file data and content type.
 * @throws {Error} - If there is an error retrieving the file.
 */
const getS3File = async (key, bucket) => {
  try {
    const getObjectParams = {
      Bucket: bucket,
      Key: key,
    }

    const fileData = await s3.getObject(getObjectParams)
    const buf = await fileData.Body.transformToString()

    return { body: buf, contentType: fileData.ContentType }
  } catch (e) {
    logger.error('[Get S3 File] error occurred', e)
    throw e // Rethrow the error so that the caller can handle it
  }
}

/**
 * Update an S3 file with the provided body content.
 * @param {string} userId - The ID of the user.
 * @param {string|Buffer|Uint8Array|Blob} body - The content of the file to be updated.
 * @param {object} fileDetail - The details of the file to be updated.
 * @returns {object} - The location of the updated file.
 * @throws {Error} - If there is an error updating the file.
 */
const updateS3File = async (userId, body, fileDetail) => {
  try {
    const putObjectParams = {
      Bucket: fileDetail.bucket,
      Key: fileDetail.key,
      Body: body,
    }

    await s3.putObject(putObjectParams)

    return { location: `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${putObjectParams.Key}` }
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
