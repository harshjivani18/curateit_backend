module.exports = {
    routes: [
        {
            method: 'PUT',
            path: '/count/:collectionId', // Pass
            handler: 'collection-count.counts', 
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/count-user/:collectionId', // Pass
            handler: 'collection-count.countUser',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/collection-wise-counts', // Pass
            handler: 'collection-count.getCollectionWiseCounts'
        }
    ]
}