module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/collection-export/:collectionId', // Pass
            handler: 'collection-export.collectionExport', 
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
    ]
}