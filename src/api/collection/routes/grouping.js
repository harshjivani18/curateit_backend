module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/filter-bookmark',
            handler: 'grouping.filterBookmarkByCollTag',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/filter-tag',
            handler: 'grouping.filterTag',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
    ]
}