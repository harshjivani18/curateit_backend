module.exports = {
    routes: [
      {
       method: 'GET',
       path: '/platform/profile',
       handler: 'platform-profile.getPlatformProfile',
       config: {
         policies: [],
         middlewares: [],
       },
      },
      {
        method: 'GET',
        path: '/save-gems',
        handler: 'domain-manager.getCountOfSaveGem'
       }
    ],
  };
  