module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/text',
            handler: 'text.createText', // Collections or gem operation not query so no need to validate it using permissions
            config: {
                policies: [],
                middlewares: ["api::gem.plan-service"],
            },
        },
        { 
            method: 'POST',
            path: '/collections/:collectionId/highlights', // Pass
            handler: 'text.createHighlightedText',
            config: {
                middlewares: ["api::collection.share-collection", "api::gem.plan-service"],
            },
        },
        {
            method: 'GET',
            path: '/highlights',
            handler: 'text.getHighlightedText', // It is giving the highlights according to the logged in user id and url so no need to validate the permissions
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/collections/:collectionId/highlights/:gemId', // Pass
            handler: 'text.getHighlightedTextById',
            config: {
                middlewares: ["api::ocr.ocr-gems"],
            },
        },
        {
            method: 'PUT',
            path: '/collections/:collectionId/highlights/:gemId', // Pass
            handler: 'text.updateHighlightedText',
            config: {
                middlewares: ["api::ocr.ocr-gems"],
            },
        },
        {
            method: 'DELETE',
            path: '/collections/:collectionId/highlights/:gemId', // Pass
            handler: 'text.deleteHighlightedText',
            config: {
                middlewares: ["api::ocr.ocr-gems"],
            },
        }
    ]
}