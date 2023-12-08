const cloudService = require('./cloud-service/cloud-builder.service.js')
const mediaStoreService = require('./media-store/media-store.service.js')

export const services = (app) => {
    app.configure(cloudService)
    app.configure(mediaStoreService)
}
