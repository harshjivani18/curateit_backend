module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/reader-view/:gemId', // Pass
            handler: 'reader-view.getSingleFile',
            config: {
                middlewares: ["api::gem.gems-operation"],
            },
        },
        {
            method: 'GET',
            path: '/article', // No need to validate it with permission because it is not considering any particular gem or collection id
            handler: 'reader-view.getArticle',
        },
        {
            method: "POST",
            path: "/set-article-text",
            handler: 'reader-view.setArticleContent'
        },
        {
            method: 'GET',
            path: '/fetch-transcript', // No need to validate it with permission because it is not considering any particular gem or collection id
            handler: 'reader-view.fetchYoutubeTranscript',
        }
    ]
}