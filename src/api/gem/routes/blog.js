module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/blogs/:collectionId', // Pass
            handler: 'blog.createBlog',
            config: {
                policies: [],
                middlewares: [
                    "api::collection.share-collection"
                ],
            },
        },
        {
            method: 'GET',
            path: '/blogs/:collectionId', // Pass
            handler: 'blog.getAllBlog', 
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        { // Path defined with an URL parameter
            method: 'PATCH',
            path: '/blogs/:gemId', // Pass
            handler: 'blog.updateBlog',
            config: {
                middlewares: ["api::collection.share-collection"],
            }
        },
        { // Path defined with an URL parameter
            method: 'GET',
            path: '/single-blog', // Pass
            handler: 'blog.getSingleBlog',
            config: {
                middlewares: ["api::gem.blog-validation"],
            },
        },
        { // Path defined with an URL parameter for blog published
            method: 'PATCH',
            path: '/blogs/:blogId/published', // Pass
            handler: 'blog.makeBlogPublished',
            config: {
                middlewares: ["api::gem.blog-validation"],
            },
        }
    ]
}
