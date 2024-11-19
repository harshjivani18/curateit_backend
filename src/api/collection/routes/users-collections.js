module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/default-collection', // need to apply user middleware
            handler: 'users-collections.createDefaultCollectionGems', 
            // config: {
            //     middlewares: ["api::collection.share-collection"],
            // },
        },
        {
            method: 'POST',
            path: '/update-userdata', // need to apply user middleware
            handler: 'users-collections.updateUserData',
            // config: {
            //     middlewares: ["api::collection.share-collection"],
            // },
        }
    ]
}