module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/code', // Pass
            handler: 'code.createCode',
            config: {
                middlewares: ["api::ocr.ocr-gems", "api::gem.plan-service"],
            },
        },
        { 
            method: 'POST',
            path: '/collections/:collectionId/codes', // Pass
            handler: 'code.createHighlightedCode',
            config: {
                middlewares: ["api::collection.share-collection", "api::gem.plan-service"],
            },
        },
        {
            method: 'GET',
            path: '/selectedcodes', // It is sending the response using the logged in user details only so no need to validate the permissions
            handler: 'code.getHighlightCode',
            config: {
                policies: [],
                middlewares: [],
            },
        },
        {
            method: 'GET',
            path: '/collections/:collectionId/selectedcodes/:gemId', // Pass
            handler: 'code.getHighlightCodeById',
            config: {
                middlewares: ["api::ocr.ocr-gems"],
            },
        },
        {
            method: 'PUT',
            path: '/collections/:collectionId/selectedcodes/:gemId', // Pass
            handler: 'code.updateHighlightCode',
            config: {
                middlewares: ["api::ocr.ocr-gems"],
            },
        },
        {
            method: 'DELETE',
            path: '/collections/:collectionId/selectedcodes/:gemId', // Pass
            handler: 'code.deleteHighlightCode',
            config: {
                middlewares: ["api::ocr.ocr-gems"],
            },
        },
    ]
}
