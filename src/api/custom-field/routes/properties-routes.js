module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/custom-property/:collectionId',
            handler: 'custom-field.getCustomFields',
            config: {
                middlewares: ["api::collection.share-collection"],
            }
        },
        {
            method: 'GET',
            path: '/filter-bookmark-cf',
            handler: 'custom-field.filterBookmarkByCF',
        }
    ]
}