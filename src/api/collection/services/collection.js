'use strict';

/**
 * collection service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::collection.collection', ({ strapi }) => ({
   async groupBookmarkByCollection(userId){
    return  await strapi.entityService.findMany('api::collection.collection', {
            filters: {
            author: userId
            },
            sort: { id: 'desc' },
            fields: ["id","name","slug", "comments_count", "shares_count", "likes_count", "save_count"],
            populate: {
                gems: {
                    fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "expander", "comments_count", "shares_count", "likes_count", "save_count"],
                    populate: {
                        tags: {
                            fields: ["id", "tag", "slug"]
                        }
                    }
                }
            }
    }); 
   },
   async getCollectionByIdWithBookmark(collectionId){
    return await strapi.entityService.findOne('api::collection.collection',collectionId,{
         fields:["id","name", "slug", "comments_count", "shares_count", "likes_count", "save_count"],
         populate:{
            gems: {
                fields: ["id", "url", "title", "slug", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "expander", "comments_count", "shares_count", "likes_count", "save_count"],
                populate: {
                    tags: {
                        fields: ["id", "tag", "slug"]
                    }
                }
            }
         }
      }) 
   } 
}));
