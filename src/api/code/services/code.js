'use strict';

const { getFullScreenshot } = require('../../../../utils');

/**
 * code service
 */

const { createCoreService } = require('@strapi/strapi').factories;

const parentLink = async (data, userId) => {
  if (data.url === "" || data.url === undefined || data.url === null) return null
  let filters = {
    url: data.url,
    collection_gems: data.collections
  }
  if(userId) filters.author = userId
  const existParent = await strapi.entityService.findMany("api::gem.gem", {
      // filters: {
      //     url: data.url,
      //     author: userId,
      //     collection_gems: data.collections
      // }
      filters
  })

  if (existParent.length === 0) {
      const media = {
        "shape": "square",
        "x": 0,
        "y": null
      }
    const createParent = await strapi.entityService.create("api::gem.gem", {
        data: {
            url: data.url,
            title: data.title,
            description: data.description,
            media_type: "Link",
            media,
            author: userId,
            collection_gems: data.collections,
            metaData: data.metaData,
            tags: data.tags,
            publishedAt: new Date().toISOString()
        }
    })
    // getFullScreenshot(createParent);
    return createParent.id;
  }
  return existParent[0].id;
}

module.exports = createCoreService('api::code.code', ({ strapi }) => ({

  createCode: async (body, user) => {
    const parentId = await parentLink(body, user?.id);
    const bioObj = body?.media
    delete body?.media
    const code = await strapi.service("api::gem.gem").create({
      data: {
        media: {...body, covers: bioObj?.covers, shape: bioObj?.shape, x: bioObj?.x, y: bioObj?.y},
        media_type: "Code",
        url: body.url,
        title: body.title,
        description: body.description,
        author: user?.id,
        tags: body.tags,
        metaData: body.metaData,
        remarks: body.notes,
        showThumbnail: body.showThumbnail !== undefined ? body.showThumbnail : true,
        is_favourite: body.is_favourite,
        collection_gems: body.collections,
        fileType: null,
        // child_gem_id: parentId,
        parent_gem_id: parentId,
        publishedAt: new Date().toISOString()
      }
    });
    
    // getFullScreenshot(code);
    return code;
  },

  createHighlightedCode: async (body, params, userId) => {

    let tagsArr = [];
    if (body.tags != undefined) {
      tagsArr.push(body.tags);
    }
    tagsArr = tagsArr.flat(Infinity);

    let tagIds = [];
    if (tagsArr.length > 0) {
      tagsArr.map(data => {
        tagIds.push(data.id);
      });
    }

    const code = await strapi.entityService.create("api::gem.gem", {
      data: {
        url: body.link || body.url,
        media: body,
        collection_gems: params.collectionId,
        author: userId,
        tags: tagIds,
        metaData: body.metaData || null,
        media_type: "Code",
        publishedAt: new Date().toISOString(),
      }
    });
    // getFullScreenshot(code);
    return code;
  },

  getHighlightCode: async (params, userId) => {
    try {
      let queryURL;
      params.map(data => {
        queryURL = data.value.endsWith('/') ? data.value.slice(0, -1) : data.value;
      });

      const codeData = await strapi.entityService.findMany('api::gem.gem', {
        filters: { url: queryURL, media_type: "Code", author: userId }
      });

      let result = codeData.map(({ id, media }) => ({ id, media })).flat(Infinity);

      return result;

    } catch (error) {
      return error;
    }
  },

  getHighlightCodeById: async (gemId) => {
    try {
      const codeData = await strapi.entityService.findOne('api::gem.gem', gemId, {
        populate: '*'
      });

      return codeData;
    } catch (error) {
      return error
    }
  },

  updateHighlightCode: async (body, gemId, userId) => {
    try {
      let tagIds = [];
      if (body.tags?.length > 0) {
        body.tags.map(data => {
          tagIds.push(data);
        });
      }

      const obj = {
        media: body,
        title: body.title,
        description: body.description,
        url: body.url,
        metaData: body.metaData || null,
        is_favourite: body.is_favourite,
        remarks: body.notes,
        collection_gems: body.collections
      }

      if (tagIds.length !== 0) {
        obj["tags"] = tagIds
      }

      const codeData = await strapi.entityService.update('api::gem.gem', gemId, {
        data: obj
      });

      return codeData;
    } catch (error) {
      return error;
    }
  },

  deleteHighlightCode: async (gemId, userId) => {
    try {

      const codeData = await strapi.entityService.delete('api::gem.gem', gemId);

      return codeData;
    } catch (error) {
      return error;
    }
  },

}));
