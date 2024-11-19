'use strict';

/**
 * collection service
 */

const { createCoreService } = require('@strapi/strapi').factories;

const checkChildCollections = async (collectionId, user) => {
    let isPublic = false;
    const collection = await strapi.entityService.findOne('api::collection.collection',collectionId,{
        fields:["id", "sharable_links", "follower_users"],
        populate:{
            collection: {
                fields: ["id"],
            }
        }
    }) 
    if (user && JSON.stringify(collection.follower_users)?.includes(user.email)) {
        isPublic = true
    }
    if (collection?.sharable_links && collection?.sharable_links !== "") { 
        isPublic = true;
    }
    if (collection?.collection && !isPublic) {
        isPublic = await checkChildCollections(collection?.collection?.id, user);
    }
    return isPublic
}

const checkChildCollectionFollowed = async (collectionId, user) => {
    let isPublic = false;
    const collection = await strapi.entityService.findOne('api::collection.collection',collectionId,{
        fields:["id", "follower_users"],
        populate:{
            collection: {
                fields: ["id"],
            }
        }
    }) 
    if (user && JSON.stringify(collection?.follower_users)?.includes(user.email)) {
        isPublic = true
    }
    if (collection?.collection && !isPublic) {
        isPublic = await checkChildCollectionFollowed(collection?.collection?.id, user);
    }
    return isPublic
}

module.exports = createCoreService('api::collection.collection', ({ strapi }) => ({
    async checkIsRootPublic(collectionId, user){
        return await checkChildCollections(collectionId, user);
    },
    
    async checkIsRootFollowed(collectionId, user){
        return await checkChildCollectionFollowed(collectionId, user);
    },
}));
