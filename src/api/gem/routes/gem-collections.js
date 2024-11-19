module.exports = {
    routes: [
        {
            method: "GET",
            path: "/fetch-gem-related-collections/:gemId",
            handler: "gem-collections.fetchGemRelatedCollections",
            config: {
                middlewares: ["api::gem.gems-operation"],
            }
        },
        {
            method: "POST",
            path: "/fetch-platform-gem-type",
            handler: "gem-collections.fetchCurateitGemMediaType",
        }
    ]
}
 