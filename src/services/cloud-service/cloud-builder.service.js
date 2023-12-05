// Initializes the `cloud-builder` service on path `/cloud-builder`
const { CloudBuilder } = require('./cloud-builder.class')
const hooks = require('./cloud-builder.hooks')

module.exports = function (app) {
  const options = {
    paginate: app.get('paginate')
  }

  // Initialize our service with any options it requires
  app.use('/cloud-builder', new CloudBuilder(options, app))

  // Get our initialized service so that we can register hooks
  const service = app.service('cloud-builder')

  service.hooks(hooks)
}
