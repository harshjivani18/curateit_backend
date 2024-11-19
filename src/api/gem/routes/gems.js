module.exports = {
    routes: [
        {
        method: 'PUT',
        path: '/gem/:gemId', // Pass
        handler: 'gem.updateGem',
        config: {
            policies: [],
            middlewares: [
                "api::collection.share-collection"
            ],
          },
        },
        {
            method: 'POST',
            path: '/gems', // Pass
            handler: 'gem.create', 
        },
        { // Path defined with an URL parameter
            method: 'POST',
            path: '/gems/:gemId/move/:sourceCollId/:collectionId', // Pass
            handler: 'gem.moveGems',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        { // Path defined with an URL parameter
            method: 'PUT',
            path: '/gems/:gemId/upload-bookmark-cover', // Pass
            handler: 'gem.updateCoverImage',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'POST',
            path: '/gems/upload-screenshot', // Uploading the screenshot only so no need to integrate it with permissions
            handler: 'gem.uploadScreenshot'
        },
        {
            method: 'POST',
            path: '/gems/store-screenshot', // Uploading the screenshot only so no need to integrate it with permissions
            handler: 'screenshot.storeScreenshot'
        },
        {
            method: 'GET',
            path: '/identify-duplicate-gems', // It is identifying the duplicate gems using the user id only so no need to validate using permissions
            handler: 'gem.identifyDuplicacyGems'
        },
        {
            method: 'GET',
            path: '/identify-broken-gems',// It is identifying the broken gems using the user id only so no need to validate using permissions
            handler: 'gem.identifyBrokenUrl'
        },
        {
            method: 'DELETE',
            path: '/delete-gems', // It is deleting the all gems by logged in user id only so no need to validate using permissions
            handler: 'gem.deleteAllGem'
        },
        {
            method: 'GET',
            path: '/fetch-bookmarks', // It is also getting the data using logged in user id only so no need to validate using permissions
            handler: 'gem.getBookmarks'
        },
        {
            method: 'GET',
            path: '/collection-list', // validating using the user id from state
            handler: 'gem.userGemCollection'
        },
        {
            method: "POST",
            path: "/save-base64-to-bucket", // no need to apply middleware
            handler: "screenshot.saveBase64ToBucket"
        },
        {
            method: 'GET',
            path: '/get-all-public-gems',
            handler: 'gem.getAllPublicGems', // no need to apply because validation with public collection
        },
        {
            method: "POST",
            path: "/take-url-screenshot",  // not in use
            handler: "screenshot.updateGemScreenshot"
        },
        {
            method: "POST",
            path: "/bio-gems",  // check validation from the code 
            handler: "gem.addSocialurlsInBioCollection"
        },
        {
            method: "POST",
            path: "/generate-ai-seo",  // need to check with middleware
            handler: "gem.generateAiseo"
        },
        {
            method: 'GET',
            path: '/tab-gems/:collectionId',
            handler: 'gem.getTabGems',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/image-text',
            handler: 'gem.getImageText',
            config: {
                middlewares: ["api::gem.plan-service"],
            },
        },
        {
            method: 'GET',
            path: '/media-type',
            handler: 'gem.getMediaTypeGems',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: "GET",
            path: '/fetch-all-short-links',
            handler: 'gem.fetchAllShortLinks',
            config: {
                middlewares: ["api::collection.share-collection"],
            }
        },
        {
            method: "GET",
            path: '/fetch-all-shared-media-type',
            handler: 'gem.fetchAllSharedGemsWithMediaType',
        }
    ]
}
