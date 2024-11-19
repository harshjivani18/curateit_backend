module.exports = {
  routes: [
    { // Path defined with an URL parameter
      method: 'POST',
      path: '/tags',
      handler: 'tag.create',
    },
    { // Path defined with an URL parameter
      method: 'POST',
      path: '/tags/:sourceTagId/move/:destinationTagId',
      handler: 'tag.moveTags',
      config: {
        middlewares: ["api::tag.share-tags"]
      },
    },
    { // Path defined with an URL parameter
      method: 'POST',
      path: '/tags/:sourceTagId/move-to-root',
      handler: 'tag.moveTagToRoot',
      config: {
        middlewares: ["api::tag.share-tags"]
      },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/tag-colors',
      handler: 'tag.randomTagColors',
      config: {
        middlewares: ["api::tag.share-tags"]
      },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/tag-wise-gem-counts',
      handler: 'tag.getTagWiseGemCounts',
      config: {
        middlewares: ["api::tag.share-tags"]
      },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/embed-tag/:tagId',  // not in use
      handler: 'tag.fetchTagWithEmbed',
      // config: {
      //   middlewares: ["api::tag.share-tags"]
      // },
    },
    { // Path defined with an URL parameter
      method: 'GET',
      path: '/get-all-public-tags',  // no need to apply middleware because find only public gems
      handler: 'tag.getAllPublicTags',
      // config: {
      //   middlewares: ["api::tag.share-tags"]
      // },
    },
    { // Path defined with an URL parameter
      method: 'DELETE',
      path: '/tags-delete',
      handler: 'tag.deleteEmptyTag',
      config: {
        middlewares: ["api::tag.share-tags"]
      },
    },
    { // Path defined with an URL parameter
      method: 'DELETE',
      path: '/delete-all-tags',
      handler: 'tag.deleteAllTag',
      config: {
        middlewares: ["api::tag.share-tags"]
      },
    },
    {
      method: "GET",
      path: "/tag-migration",
      handler: "migration.tagMigration"
    },
    {
      method: "GET",
      path: "/gems-order-tag-migration",
      handler: "migration.orderOfGemsByTag"
    },
    {
      method: "GET",
      path: "/sub-tag/:tagId",
      handler: "tag.subTagData",
      config: {
        middlewares: ["api::tag.share-tags"]
      },
    },

  ]
}