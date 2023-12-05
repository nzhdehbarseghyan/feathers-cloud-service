const logger = require('../../logger');
const { CLOUD_SITES, AWS_ERROR_CODES } = require('../../constants');
const {
  s3Upload,
  getS3File,
  updateS3File,
  createS3Bucket,
  getBucketList,
} = require('../../libs/aws');

exports.CloudBuilder = class CloudBuilder {
  constructor (options, app) {
    this.options = options || {}
    this.app = app
  }

  /**
   * Create a new entry with the provided data.
   *
   * @param {Object} data - The data to create the entry with.
   * @param {Object} params - Additional parameters.
   * @returns {Object} - An object with status and data properties.
   */
  async create (data, params) {
    try {
      const settingsService = this.app.service('settings');
      const userId = params.user?._id;
      const settings = await settingsService.find({ query: { userId } });
      const { awsS3 } = settings.data[0];
      const selectedAWSS3 = awsS3.find(s3 => s3.label === data.awsAccount);
      let uploadedData;

      if (data.cloud === CLOUD_SITES.S3) {
        if (!selectedAWSS3?.secretKey || !selectedAWSS3?.accessKey) {
          return { status: 'error', data: 'AWS credentials are missing.' }
        }

        uploadedData = await this.addObjectS3(data, selectedAWSS3, userId);
      }

      return { status: 'success', data: uploadedData }
    } catch (e) {
      logger.error('[Creating Object in S3]', e.Code);

      switch (e.Code) {
        case AWS_ERROR_CODES.NO_SUCH_BUCKET:
          return { status: 'error', data: 'The specified bucket does not exist.' };
        case AWS_ERROR_CODES.INVALID_BUCKET_NAME:
          return { status: 'error', data: 'The specified bucket is not valid.' };
        case AWS_ERROR_CODES.BUCKET_ALREADY_EXISTS:
          return { status: 'error', data: 'The specified bucket already exists.' };
        case AWS_ERROR_CODES.BUCKET_ALREADY_OWNED_BY_YOU:
          return { status: 'error', data: 'The specified bucket already owned by you.' };
        default:
          return { status: 'error', data: 'Something went wrong. Please try again!' };
      }
    }
  }

  /**
   * Find media items based on the provided query parameters.
   *
   * @param {Object} params - The query parameters for finding media items.
   * @returns {Object} - An object with status and data properties.
   */
  async find (params) {
    try {
      if ('bucketList' in params.query) {
        const settingsService = this.app.service('settings');
        const userId = params.user?._id;
        const settings = await settingsService.find({ query: { userId } });
        const { awsS3 } = settings.data[0]// TODO this should be changed
        const list = await getBucketList(awsS3);

        return { status: 'success', data: list?.Buckets };
      }

      const query = {
        ...params.query,
        type: 'html',
      }
      const data = await this.getMedia(query);

      return { status: 'success', data }
    } catch (e) {
      logger.error(e)

      return { status: 'error', data: 'Something went wrong. Please try again!' }
    }
  }

  /**
  * Retrieves media data by ID
  * @param {string} id - The ID of the media
  * @param {object} params - Additional parameters
  * @returns {object} - The result of the operation
  */
  async get (id, params) {
    try {
      const file = await this.getMediaById(id);
      const data = await getS3File(file.key, file.bucket);

      return { status: 'success', data }
    } catch (e) {
      logger.error(e)

      return { status: 'error', data: 'Something went wrong. Please try again!' }
    }
  }

  /**
   * Update media file by ID.
   *
   * @param {string} id - The ID of the media file.
   * @param {object} data - The data to update the media file with.
   * @param {object} params - Additional parameters.
   * @returns {object} - The updated media file.
   * @throws {Error} - If an error occurs during the update process.
   */
  async update (id, data, params) {
    try {
      const { _id, html, name } = data;
      const file = await this.getMediaById(_id);
      const updatedData = await updateS3File(params.user._id, html, file);
      const mediaFile = await this.updateMediaById(_id, { name });

      return { status: 'success', data: { location: updatedData.location, name: mediaFile.name } }
    } catch (e) {
      logger.error(e)

      return { status: 'error', data: 'Something went wrong. Please try again!' }
    }
  }

  async addObjectS3 (data, awsS3, userId) {
    if (data.bucket && data.newBucket) {
      await createS3Bucket(awsS3, data.region, data.bucket);
    }

    let region = data.region

    if (!region) {
      const mediaObj = await this.getMedia({ userId, bucket: data.bucket });
      region = mediaObj.data[0]?.region;
    }

    const uploadedData = await s3Upload(userId, data, data.bucket, { region, awsS3 });
    const savedData = await this.saveToDatabase(uploadedData, data, userId, region);

    return { location: uploadedData.location, _id: savedData._id, name: savedData.name }
  }

  async saveToDatabase (uploadedData, fileDetail, userId, region) {
    const mediaStoreService = this.app.service('media-store');

    return await mediaStoreService.create({
      userId,
      name: fileDetail.name,
      thumb: uploadedData.location,
      key: uploadedData.key,
      bucket: uploadedData.bucket,
      region,
      type: 'html',
      cloud: fileDetail.cloud
    });
  }

  async getMediaById (id) {
    const mediaStoreService = this.app.service('media-store');

    return await mediaStoreService.get(id);
  }

  async getMedia (query) {
    const mediaStoreService = this.app.service('media-store');

    return await mediaStoreService.find({ query });
  }

  async updateMediaById (id, data) {
    const mediaStoreService = this.app.service('media-store');

    return await mediaStoreService.patch(id, data);
  }
}
