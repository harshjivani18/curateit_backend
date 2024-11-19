module.exports = {
    routes: [
        {
            method: "PUT",
            path: "/collection/:collectionId/public-gem/:gemId",
            handler: "public-collection.publicGemApproveReject",
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: "GET",
            path: "/pending-gems/:collectionId",
            handler: "public-collection.getPendingGems",
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: "GET",
            path: "/processed-gems/:collectionId",
            handler: "public-collection.publicGemApproveRejectList",
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        }
    ]
}