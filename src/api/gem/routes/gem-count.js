module.exports = {
    routes: [
        {
            method: 'PUT',
            path: '/count-gem/:gemId', // Pass
            handler: 'gem-count.counts',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/count-gem-user/:gemId', // Pass
            handler: 'gem-count.countUser',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/gems-filters-count', // Pass
            handler: 'gem-count.gemFiltersCountByMediaType',
        },
        {
            method: 'PUT',
            path: '/usage-count/:gemId', // Pass
            handler: 'gem-count.gemUsageCount',
            config: {
                middlewares: ["api::gem.gems-operation"],
            }
        },
        {
            method: 'GET',
            path: '/gems-usage-list', // no need to add because validation with user id from state
            handler: 'gem-count.getUsageCount',
        },
        {
            method: 'PUT',
            path: '/usage-user-count',  // pending integration of this api need test when it integrate
            handler: 'gem-count.usageCountForReaderAndSearch',
        },
    ]
}