const search = require('feathers-mongodb-fuzzy-search')
const { authenticate } = require('@feathersjs/authentication').hooks

module.exports = {
  before: {
    all: [ authenticate('jwt'), search({ fields: ['path'] }) ],
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
