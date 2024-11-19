module.exports = {
  routes: [
    { 
      method: 'POST',
      path: '/import-collections',
      handler: 'collection.importCollection', // Using import collection for uploading using file so no need to validate permissions
      config: {
        middlewares: ["api::collection.share-collection", "api::collection.plan-service", "api::gem.plan-service"],
      },
    },
    { 
      method: 'GET',
      path: '/get-user-collections', // not needed to validate permissions
      handler: 'collection.getUserCollections',
    },
    { 
      method: 'GET',
      path: '/bookmark/collections',
      handler: 'collection.getUserBookmarkCollections', // Getting the bookmark collections from the logged in user only so no need to validate permissions
    },
    { 
      method: 'POST',
      path: '/collections/:sourceCollectionId/move/:collectionId', // Pass
      handler: 'collection.moveCollections',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { 
      method: 'POST',
      path: '/collections/:collectionId/move-to-root', // Pass
      handler: 'collection.moveToRootCollections',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { 
      method: 'POST',
      path: '/collections',
      handler: 'collection.create' // Pass
    },
    { 
      method: 'POST',
      path: '/import-single-collection',
      handler: 'collection.createImportCollection', // Pass,
      config: {
        middlewares: ["api::collection.share-collection", "api::collection.plan-service"],
      },
    },
    { 
      method: 'GET',
      path: '/get-all-bookmark',
      handler: 'collection.getAllBookmark', // It is based on the logged in user id only that is why we no need to validate the permissions
    },
    {
      method: 'GET',
      path: '/collections/:collectionId/bookmarks', // Pass
      handler: 'collection.getCollectionBookmarks',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { 
      method: 'POST',
      path: '/bookmark/:gemId/move/:collectionId', // Pass
      handler: 'collection.moveBookmarkToColl',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { 
      method: 'POST',
      path: '/collection-email/:collectionId', // Pass
      handler: 'collection.shareCollectionViaEmail',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    
    { 
      method: 'GET',
      path: '/collection-email',
      handler: 'collection.getCollectionByEmail', // We are validating this via the email in code so no need to validate using permissions
    },
    { 
      method: 'POST',
      path: '/collection-link/:collectionId', // Pass
      handler: 'collection.shareCollectionViaLink',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { 
      method: 'GET',
      path: '/collection-link',
      handler: 'collection.getCollectionViaShareLink', // We are validating this via the email in code so no need to validate using permissions
    },
    { 
      method: 'POST',
      path: '/collections/:collectionId/security', // Pass
      handler: 'collection.setSecurityOnLink',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { 
      method: 'POST',
      path: '/collection/:collectionId/password', // Pass
      handler: 'collection.setPassword',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { 
      method: 'DELETE',
      path: '/collection/:collectionId/remove-access', // Pass
      handler: 'collection.expireLink',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },


    { 
      method: 'POST',
      path: '/collection/:collectionId/check-password', // Pass
      handler: 'collection.checkPassword',
      // config: {
      //   middlewares: ["api::collection.share-collection"],
      // },
    },
    { 
      method: 'POST',
      path: '/collections/:collectionId/generatelink', // Pass
      handler: 'collection.sharePublicLink',
      config: {
        middlewares: ["api::collection.share-collection", "api::collection.plan-service"],
      },
    },
    { 
      method: 'GET',
      path: '/collection-public',
      handler: 'collection.getCollectionByPublicLink', // Pass
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    { 
      method: 'POST',
      path: '/collection/:collectionId/disable-link', // Pass
      handler: 'collection.disablePublicLink',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    {
      method: 'GET',
      path: '/check-user/:tokenId/:collectionId',
      handler: 'collection.checkUserRegister', // Only getting the user registered or not so no need to validate using permissions
    },
    {
      method: 'POST',
      path: '/collection/check-permission',
      handler: 'collection.checkPermission', // Not in use
    },
    {
      method: 'PATCH',
      path: '/collection/update-unregister-user', // Pass
      handler: 'collection.sharedCollToUnRegisteredUser',
      // config: {
      //   middlewares: ["api::collection.share-collection"],
      // },
    },
    {
      method: 'DELETE',
      path: '/delete-collections',
      handler: 'collection.deleteAllCollections', // We are deleting the all collections who are logged in so no need to check permissinos
    },
    {
      method: 'GET',
      path: '/embed-collection/:collectionId',
      handler: 'collection.fetchCollectionWithEmbed', // we are not using this api in frontend so it is commented
      // config: {
      //   middlewares: ["api::collection.share-collection"],
      // },
    }, 
    {
      method: 'GET',
      path: '/get-all-public-collections',
      handler: 'collection.getAllPublicCollections', // Pass
    },
    {
      method: 'GET',
      path: '/exist-collection',
      handler: 'collection.checkExistingCollection', // Pass
    },
    {
      method: 'POST',
      path: '/copy-collection/:collectionId', // inside service validate it if collection is not publicly shared we are not allowed to copy that
      handler: 'collection.copyCollection',
      config: {
        middlewares: ["api::collection.plan-service"],
      },
    },
    {
      method: 'GET',
      path: '/sub-collection/:collectionId',
      handler: 'collection.subCollectionData',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    {
      method: 'GET',
      path: '/collection-data',
      handler: 'collection.getCollectionAuth',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    {
      method: 'GET',
      path: '/collection-data-public',
      handler: 'collection.getCollectionPublic',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    {
      method: 'GET',
      path: '/public-collection-gems/:collectionId',
      handler: 'collection.categoryGems',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    {
      method: 'GET',
      path: '/public-collection-gems-tags/:collectionId',
      handler: 'collection.tagGems',
      config: {
        middlewares: ["api::tag.share-tags"],
      },
    },
    {
      method: 'DELETE',
      path: '/collection-delete',
      handler: 'collection.deleteEmptyColletion',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    {
      method: 'GET',
      path: '/tab-collection',
      handler: 'collection.getTabGemCollection',
      config: {
        middlewares: ["api::collection.share-collection"],
      },
    },
    {
      method: "GET",
      path: "/collection-migration",
      handler: "migration.collectionMigration"
    },
    {
      method: "GET",
      path: "/collection-share-migration",
      handler: "migration.collectionShareLinkMigration"
    },
    {
      method: "GET",
      path: "/default-collection-migration",
      handler: "migration.followCurateitCollection"
    },
    {
      method: "GET",
      path: "/gems-order-migration",
      handler: "migration.orderOfGems"
    },
    {
      method: "DELETE",
      path: "/delete-curateit-migration",
      handler: "migration.deleteCurateitDelete"
    }
  ]
}