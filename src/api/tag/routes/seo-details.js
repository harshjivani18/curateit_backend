module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/tags/:tagId/seo-details', // Pass
            handler: 'seo-details.fetchSeoDetails'
        },
        {
            method: 'PATCH',
            path: '/tags/:tagId/seo-details', // Pass
            handler: 'seo-details.updateSeoDetails', 
            config: {
                middlewares: ["api::tag.share-tags"]
            }
        }
    ]
}