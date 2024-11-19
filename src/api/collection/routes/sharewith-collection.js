module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/share-with-me', // checked with user if from state so no need middleware
            handler: 'sharewith-collection.shareWithMeCollections',
        },
        {
            method: 'GET',
            path: '/share-public-collection', // Pass
            handler: 'sharewith-collection.sharePublicCollection',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/sharecollection-gem-filter-counts/:collectionId',
            handler: 'sharewith-collection.shareGemFiltersCountByMediaType',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/sharecollection-tag-counts/:collectionId',
            handler: 'sharewith-collection.getsharecollectionTagWiseGemCounts',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'POST',
            path: '/sharecollection-group-mail/:collectionId',
            handler: 'sharewith-collection.shareCollectionToGroupViaEmail',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/collection-group-mail/:collectionId', // we are validating it from the token so no need to add middleware
            handler: 'sharewith-collection.getShareCollecctionToGroup',
        },
        {
            method: 'PUT',
            path: '/collection-group-security/:collectionId',
            handler: 'sharewith-collection.setSecurityOnGroupLink',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: 'GET',
            path: '/share-public-subcollection', // Pass
            handler: 'sharewith-collection.sharePublicSubCollection',
            config: {
                middlewares: ["api::collection.share-collection"],
            },
        },
        {
            method: "GET",
            path: "/is-followed-collection/:collectionId",
            handler: "sharewith-collection.isFollowerCollection"
        },
        {
            method: "GET",
            path: "/is-public-collection/:collectionId",
            handler: "sharewith-collection.isPublicCollection"
        },
        {
            method: "GET",
            path: "/is-public-gem/:gemId",
            handler: "sharewith-collection.isPublicGem"
        },
        {
            method: "DELETE",
            path: "/remove-collection/:collectionId",
            handler: "sharewith-collection.removeShareCollection"
        }
    ]
}