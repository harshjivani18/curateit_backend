module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/gems/:gemId/seo-details', // Pass
            handler: 'seo-details.fetchSeoDetails'
        },
        {
            method: 'PATCH',
            path: '/gems/:gemId/seo-details', // Pass
            handler: 'seo-details.updateSeoDetails', 
            config: {
                middlewares: ["api::gem.gems-operation"],
            }
        }
    ]
}