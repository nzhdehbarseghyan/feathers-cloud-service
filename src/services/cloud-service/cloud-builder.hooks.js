const { authenticate } = require('@feathersjs/authentication').hooks
const setUserId = require('../../hooks/set-user-id')

module.exports = {
  before: {
    all: [authenticate('jwt'), setUserId()],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: []
  }
}
