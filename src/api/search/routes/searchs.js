module.exports = {
    routes: [
      { // Path defined with an URL parameter
        method: 'GET',
        path: '/search',
        handler: 'search.search',
      },
      { // Path defined with an URL parameter
        method: 'GET',
        path: '/filter-search',
        handler: 'search.searchByFilter',
      },
    ]
  }