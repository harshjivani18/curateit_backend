module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/is-member-exist',
            handler: 'group-members.findIsMemberExist'
        },
        {
            method: "DELETE", // require middleware
            path: "/remove-group/:groupId",
            handler: "group-members.removeFromGroup",
            config: {
                middlewares: ["api::group.group-middleware"],
            },
        },
        {
            method: "DELETE", // require middleware
            path: "/remove-collection/:collectionId/group/:groupId",
            handler: "group-members.removeCollection",
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        }
    ]
}