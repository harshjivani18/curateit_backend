module.exports = {
    routes: [
        {
            method: "PUT",
            path: "/collection-comment-count/:collectionId",
            handler: "collection-comment.updateCollectionCommentCount",
        }
    ]
}