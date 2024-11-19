module.exports = {
    routes: [
        {
            method: "PUT",
            path: "/gem-comment-count/:gemId",
            handler: "gem-comment.updateGemCommentCount",
        }
    ]
}