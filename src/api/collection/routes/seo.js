module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/collections/:collectionId/seo-details', // Pass
            handler: 'seo-details.fetchSeoDetails'
        },
        {
            method: 'PATCH',
            path: '/collections/:collectionId/seo-details', // Pass
            handler: 'seo-details.updateSeoDetails', 
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        }
    ]
}