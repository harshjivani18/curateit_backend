module.exports = {
    routes: [
      { // Path defined with an URL parameter
        method: 'GET',
        path: '/account-profile',
        handler: 'account-setting.getAccProfile',
      },
      { // Path defined with an URL parameter
        method: 'PUT',
        path: '/update-account-profile',
        handler: 'account-setting.updateAccProfile',
      },
    ]
  }