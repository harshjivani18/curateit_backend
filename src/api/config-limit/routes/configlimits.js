module.exports = {
    routes: [
      {
        method: 'GET',
        path: '/config-collections',
        handler: 'config-limit.getConfigLimit',
      }
    ]
  }