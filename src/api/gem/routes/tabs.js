module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/smart-group-tabs', // Pass
            handler: 'tabs.smartGroupTabs', 
            // config: {
            //     middlewares: ["api::gem.bulk-gems", "api::gem.plan-service"],
            // },
        },
        {
            method: 'POST',
            path: '/import-tabs', // Pass
            handler: 'tabs.createTabs', 
            // config: {
            //     middlewares: ["api::gem.bulk-gems", "api::gem.plan-service"],
            // },
        }
    ]
}
