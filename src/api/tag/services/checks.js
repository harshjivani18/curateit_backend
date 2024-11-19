'use strict';

/**
 * collection service
 */

const { createCoreService } = require('@strapi/strapi').factories;

const checkChildTags = async (tagId) => {
    let isPublic = false;
    const tag = await strapi.entityService.findOne('api::tag.tag',tagId,{
        fields:["id", "sharable_links"],
        populate:{
            parent_tag: {
                fields: ["id"],
            }
        }
    }) 
    if (tag?.sharable_links && tag?.sharable_links !== "") { 
        isPublic = true;
    }
    if (tag?.parent_tag && !isPublic) {
        isPublic = await checkChildTags(tag?.parent_tag?.id);
    }
    return isPublic
}

module.exports = createCoreService('api::tag.tag', ({ strapi }) => ({
    async checkIsRootPublic(tagId){
        return await checkChildTags(tagId);
    } 
}));
