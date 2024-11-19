module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/store-gems', // Pass
            handler: 'socialfeed.importSocialfeedPost', 
            config: {
                middlewares: ["api::gem.bulk-gems", "api::gem.plan-service"],
            },
        },
        {
            method: 'GET',
            path: '/fetch-gems', // It is getting data using logged in user only so there is no need to validate the permission over here
            handler: 'socialfeed.getSocialfeedGem', 
        },
    ]
}
