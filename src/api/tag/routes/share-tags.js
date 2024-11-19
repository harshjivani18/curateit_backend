module.exports = {
    routes: [
        { // Path defined with an URL parameter
            method: 'GET',
            path: '/check-user-tag/:tokenId/:tagId', // Only getting the user registered or not so no need to validate using permissions
            handler: 'share-tags.checkUserRegister'
        },
        { // Path defined with an URL parameter
            method: 'POST',
            path: '/tag-email/:tagId',
            handler: 'share-tags.shareTagViaEmail',
            config: {
                middlewares: ["api::tag.share-tags"]
            },
        },
        { // Path defined with an URL parameter
            method: 'GET',
            path: '/tag-email', // We are validating this via the email in code so no need to validate using permissions
            handler: 'share-tags.getTagViaEmail'
        },
        { // Path defined with an URL parameter
            method: 'POST',
            path: '/tag-link/:tagId',
            handler: 'share-tags.shareTagViaLink',
            config: {
                middlewares: ["api::tag.share-tags"]
            },
        }, 
        { // Path defined with an URL parameter
            method: 'GET',
            path: '/tag-link',  // We are validating this via the email in code so no need to validate using permissions
            handler: 'share-tags.getTagViaLink',
        },
        { // Path defined with an URL parameter
            method: 'POST',
            path: '/tag-public-link/:tagId',
            handler: 'share-tags.shareTagPublicLink',
            config: {
                middlewares: ["api::tag.share-tags", "api::tag.plan-service"]
            },
        },
        { // Path defined with an URL parameter
            method: 'GET',
            path: '/tag-public-link',
            handler: 'share-tags.getTagViaPublicLink',
            config: {
                middlewares: ["api::tag.share-tags"]
            },
        },


        { // Path defined with an URL parameter
            method: 'POST',
            path: '/tag/:tagId/disable-link',
            handler: 'share-tags.disablePublicLink',
            config: {
                middlewares: ["api::tag.share-tags"]
            },
        },
        { // Path defined with an URL parameter
            method: 'PATCH',
            path: '/tag/update-unregister-user',  // no need to apply middleware
            handler: 'share-tags.sharedCollToUnRegisteredUser',
            // config: {
            //     middlewares: ["api::tag.share-tags"]
            // },
        },
        { // Path defined with an URL parameter
            method: 'POST',
            path: '/tag/:tagId/security',
            handler: 'share-tags.setSecurityOnLink',
            config: {
                middlewares: ["api::tag.share-tags"]
            },
        },
        { // Path defined with an URL parameter
            method: 'POST',
            path: '/tag/:tagId/password',
            handler: 'share-tags.setPassword',
            config: {
                middlewares: ["api::tag.share-tags"]
            },
        },
        { // Path defined with an URL parameter
            method: 'POST',
            path: '/tag/:tagId/check-password',  // only checking password 
            handler: 'share-tags.checkPassword',
            // config: {
            //     middlewares: ["api::tag.share-tags"]
            // },
        },
        { // Path defined with an URL parameter
            method: 'DELETE',
            path: '/tag/:tagId/remove-access',
            handler: 'share-tags.expireLink',
            config: {
                middlewares: ["api::tag.share-tags"]
            },
        },
        {
            method: 'GET',
            path: '/share-with-me-tags',  // no need apply middleware because validating from state
            handler: 'share-tags.shareWithMeTags',
        },
        {
            method: 'GET',
            path: '/share-public-tags', // Pass
            handler: 'share-tags.sharePublicTag',
            config: {
                middlewares: ["api::tag.share-tags"],
            },
        },
        {
            method: 'POST',
            path: '/sharetags-group-mail/:tagId', // Pass
            handler: 'share-tags.shareTagToGroupViaEmail',
            config: {
                middlewares: ["api::tag.share-tags"],
            },
        },
        {
            method: 'GET',
            path: '/sharetags-group-mail/:tagId', // no need to apply because validating from the token
            handler: 'share-tags.getShareTagToGroup',
            // config: {
            //     middlewares: ["api::tag.share-tags"],
            // },
        },
        {
            method: 'PUT',
            path: '/tag-group-security/:tagId', // Pass
            handler: 'share-tags.setSecurityOnGroupLink',
            config: {
                middlewares: ["api::tag.share-tags"],
            },
        },
        {
            method: "GET",
            path: "/is-public-tag/:tagId",  // no need to add middleware
            handler: "tag.isPublicTag"
        },
        {
            method: "DELETE",
            path: "/remove-tag/:tagId",  // no need to add middleware because validating from the api code
            handler: "share-tags.removeShareTag"
        },
        {
            method: "GET",
            path: "/sharetag-collection-counts/:tagId",
            handler: "share-tags.shareTagCollectionCount",
            config: {
                middlewares: ["api::tag.share-tags"],
            },
        },
        {
            method: "GET",
            path: "/sharetag-gem-filter-counts/:tagId",
            handler: "share-tags.shareGemFiltersCountByMediaType",
            config: {
                middlewares: ["api::tag.share-tags"],
            },
        },
        {
            method: 'GET',
            path: '/public-tag-gems/:tagId',
            handler: 'share-tags.categoryGemsForTag',
            config: {
                middlewares: ["api::tag.share-tags"],
            },
        },
        {
            method: 'GET',
            path: '/public-tag-gems-collections/:tagId',
            handler: 'share-tags.collectionGemsForTag',
            config: {
                middlewares: ["api::tag.share-tags"],
            },
        },
        {
            method: 'GET',
            path: '/share-public-subtag',
            handler: 'share-tags.sharePublicSubTag',
            config: {
                middlewares: ["api::tag.share-tags"],
            },
        }
    ]
}