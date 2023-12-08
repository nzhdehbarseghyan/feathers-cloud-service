// Initializes the `media-store` service on path `/media-store`
const { MediaStore } = require('./media-store.class')
const createModel = require('../../models/media-store.model')
const hooks = require('./media-store.hooks')

module.exports = function (app) {
  const options = {
    Model: createModel(app),
    paginate: app.get('paginate'),
    whitelist: ['$text', '$search', '$regex'],
  }

  // Initialize our service with any options it requires
  app.use('/media-store', new MediaStore(options, app))

  // Get our initialized service so that we can register hooks
  const service = app.service('media-store')

  service.hooks(hooks)
}
