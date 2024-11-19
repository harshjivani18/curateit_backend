'use strict';

/**
 * collection controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { parse } = require('tldts');
const path = require('path')
const moment = require("moment")
const fs = require('fs')
const { awaitRequest, updateGemiScoreRecs, updatePlanService, bookmarkUtils, accessPermissions, createActivity, setCollectionSeoInformation } = require("../../../../utils")
const { operationValue, hierarchyValue } = require("../../../../constant");
const nodemailer = require("nodemailer")
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require("uuid");
const { parser } = require('html-metadata-parser');
const { score_keys } = require("../../../../constant");
const { getService } = require('../../../extensions/users-permissions/utils');
const axios = require('axios');
const { createCollectionCopy } = require('../services/collection-copy');
const { createBulkElasticData } = require('../../gem/services/after-operations');
const { prepareSubCollectionData, collectionData, deleteEmptyCollectionsService, getCollections, getCollectionOrder } = require('../services/collection-service');
const { default: slugify } = require('slugify/slugify');
const { SHARED_EMAIL } = require('../../../../emails/share-collection');
const { shareInviteTopToBottom, removeShareChildLevelCollection } = require('../services/share-collection');

const arraysHaveSameElements = (a, b) => {
  // Sort both arrays
  const sortedArr1 = a.slice().sort();
  const sortedArr2 = b.slice().sort();

  // Compare sorted arrays element-wise
  for (let i = 0; i < sortedArr1.length; i++) {
    if (sortedArr1[i] !== sortedArr2[i]) {
      return false;
    }
  }
  for (let i = 0; i < sortedArr2.length; i++) {
    if (sortedArr2[i] !== sortedArr1[i]) {
      return false;
    }
  }
  return true;
}

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

  async moveToRootCollections(ctx) {
    const { user } = ctx.state;
    const { collectionId } = ctx.params;
    const jwt = getService('jwt').issue({ id: user.id });

    const collection = await strapi.entityService.update("api::collection.collection", collectionId, {
      data: {
        collection: null,
        is_sub_collection: false,
        isMove: true,
        isRoot: true
      }
    })

    const object = {
      action: "Moved",
      module: "Collection",
      actionType: "Collection",
      count: 1,
      author: { id: user.id, username: user.name },
      collection_info: { id: collection.id, name: collection.name },
    }
    createActivity(object, jwt);

    ctx.send(collection)

  },

  async moveCollections(ctx) {
    const { user } = ctx.state;
    const { sourceCollectionId, collectionId } = ctx.params;
    const jwt = getService('jwt').issue({ id: user.id });

    // Remove and update collection from the source to destination
    const collections = await strapi.db.query("api::collection.collection").findMany({
      where: {
        id: {
          $in: [sourceCollectionId, collectionId]
        }
      },
      populate: {
        collection: true
      }
    })
    const srcIdx = collections.findIndex((f) => { return f.id === parseInt(sourceCollectionId) })
    const destIdx = collections.findIndex((f) => { return f.id === parseInt(collectionId) })
    const source = srcIdx !== -1 ? collections[srcIdx] : null
    const destination = destIdx !== -1 ? collections[destIdx] : null

    if (source && destination && destination.collection && destination.collection.id === source.id) {
      await strapi.entityService.update("api::collection.collection", collectionId, {
        data: {
          collection: null,
          is_sub_collection: false,
          isMove: true
        }
      })

      // const object = {
      //   action: "Moved",
      //   module: "Collection",
      //   actionType: "Collection",
      //   count: 1,
      //   author: { id: user.id, username: user.name },
      //   collection_info: { id: coll.id, name: coll.name },
      // }
      // createActivity(object, jwt);

      // return ctx.send(coll)
    }

    const collection = await strapi.entityService.update("api::collection.collection", sourceCollectionId, {
      data: {
        collection: collectionId,
        is_sub_collection: true,
        isMove: true
      }
    })

    const object = {
      action: "Moved",
      module: "Collection",
      actionType: "Collection",
      count: 1,
      author: { id: user.id, username: user.name },
      collection_info: { id: collection.id, name: collection.name },
    }
    createActivity(object, jwt);

    ctx.send(collection)

  },

  createBookmarkCollection(collections, author, collection = null) {
    const arr = []
    collections.forEach((c) => {
      const finalCollection = {
        ...c,
        name: c.title,
        author: author?.id,
        isBulk: true,
        publishedAt: new Date().toISOString(),
        is_sub_collection: collection !== null,
        collection: collection ? { id: collection.id, name: collection.name } : null
      };

      arr.push(new Promise((resolve, reject) => {
        strapi.service("api::collection.collection").create({ data: finalCollection })
          .then(async (col) => {
            if (c.folders.length !== 0) {
              const subfolders = this.createBookmarkCollection(c.folders, author, col)
              finalCollection.folders = await Promise.all(subfolders)

            }
            if (c.bookmarks.length !== 0) {
              const bookmarks = []
              c.bookmarks.forEach((b) => {
                b.isImported = true
                bookmarks.push(this.createBookmarkGem(b, author, col.id))
              })
              finalCollection.bookmarks = await Promise.all(bookmarks)
            }
            resolve(
              { ...finalCollection, ...col })
          })
      }))
    })
    return arr
  },

  createBookmarkWithIcon(b, author, parentId, resolve) {
    return strapi
      .service("api::gem.gem")
      .create({
        data: {
          ...b,
          url: b.link,
          author: author,
          name: b.title,
          media_type: "Link",
          media: b.icon ? { covers: [b.icon] } : {},
          tags: [],
          metaData: {
            ...b,
            covers: [b.icon]
          },
          collection_gems: parentId,
          publishedAt: new Date().toISOString(),
        }
      }).then((res) => {
        resolve({
          id: res.id,
          url: res.url,
          title: res.title,
          remarks: res.remarks,
          metaData: res.metaData,
          media: res.media,
          description: res.description,
          media_type: res.media_type,
          S3_link: res.S3_link,
          is_favourite: res.is_favourite,
          collection_id: parentId,
          tags: []
        })
      })
  },

  createBookmarkGem(b, author, parentId) {
    // return new Promise((resolve, reject) => {
    //   resolve("success")
    // })
    return new Promise((resolve, reject) => {
      if (b.icon && b.icon.startsWith("data:")) {
        const urlParse = parse(b.link)
        const parseArr = urlParse && urlParse.domain ? urlParse.domain.split(".") : []
        const filename = parseArr.length !== 0 ? parseArr[0] : b.title.slice(0, 3)
        const storeKey = `common/images/bookmark_images/bookmark-${filename}-${moment().toDate().getTime()}.jpg`

        strapi.service("api::gem.gem")
          .uploadImageFromBase64(b.icon, storeKey)

        b = {
          ...b, icon: `${process.env.AWS_BASE_URL}/${storeKey}`
        }
        this.createBookmarkWithIcon(b, author, parentId, resolve)

        // parser(b.link)
        //   .then((res) => {
        //     b = {
        //       ...b,
        //       icon: res.og.image,
        //     }
        //     this.createBookmarkWithIcon(b, author, parentId, resolve)
        //   })
        //   .catch((error) => {
        //     strapi.service("api::gem.gem")
        //       .uploadImageFromBase64(b.icon, `common/images/bookmark_images/bookmark-${filename}-${moment().toDate().getTime()}.jpg`)
        //       .then((path) => {
        //         b.icon = path
        //         this.createBookmarkWithIcon(b, author, parentId, resolve)
        //       })
        //   })
      }
      else {
        this.createBookmarkWithIcon(b, author, parentId, resolve)
      }

    })
  },

  async importCollection(ctx) {
    const author = ctx.state.user;
    const { body, header } = ctx.request;
    const token = header.authorization?.split("Bearer ")?.[1]
    const jwt = token ? token : getService('jwt').issue({ id: author.id });
    if (body) {
      const mainArr = this.createBookmarkCollection(body, author)
      const data = await Promise.all(mainArr)
      createBulkElasticData(user.id, booksArr, user.username)

      const object = {
        action: "Imported",
        module: "Collection",
        actionType: "Collection",
        count: data.length,
        author: { id: author.id, username: author.username },
      }
      // createActivity(object, jwt);
      ctx.send(data);
    }
    else {
      ctx.send({ msg: "Collection data not passed." });
    }
  },

  async importCollectionRaindrop(ctx) {
    const files = ctx.request.files;
    const author = ctx.state.user
    const jwt = getService('jwt').issue({ id: author.id });
    if (ctx.is('multipart')) {
      const file = files.files;
      const absolutePath = path.join(file.path);

      try {
        const raindropTokens = await strapi.entityService.findMany('api::third-party-token.third-party-token', {
          filters: {
            provider: "Raindrop",
            is_active: true
          },
        });
        console.log("Token Fetched")
        if (raindropTokens && raindropTokens.length === 1) {
          const raindropToken = raindropTokens[0]
          console.log("Ready for raindrop api")
          const bookmarks = await awaitRequest({
            method: "post",
            url: "https://api.raindrop.io/rest/v1/import/file",
            headers: {
              "Content-Type": "multipart/form-data",
              "Authorization": `${raindropToken.token_type} ${raindropToken.token}`
            },
            formData: {
              import: {
                value: fs.createReadStream(absolutePath),
                options: {
                  filename: file.name,
                  contentType: 'text/html'
                }
              }
            }
          })
          console.log("Bookmarked Fetched!")
          const mainArr = this.createBookmarkCollection(JSON.parse(bookmarks).items, author)
          const data = await Promise.all(mainArr)
          console.log("Sending the response")

          /* logs data for update hightlighed text  */
          // await strapi.entityService.create("api::activity-log.activity-log", {
          //   data: {
          //     action: "Imported",
          //     module: "Collection",
          //     actionType: "Collection",
          //     count: data.length,
          //     author: author.id,
          //     publishedAt: new Date().toISOString(),
          //   },
          // });
          const object = {
            action: "Imported",
            module: "Collection",
            actionType: "Collection",
            count: data.length,
            author: { id: author.id, username: author.name },
          }
          createActivity(object, jwt);
          // await axios.post(
          //   `${process.env.MONGODB_URL}/api/activitylogs`,
          //   {
          //     action: "Imported",
          //     module: "Collection",
          //     actionType: "Collection",
          //     count: data.length,
          //     author: { id: author.id, username: author.name },
          //   },
          //   {
          //     headers: {
          //       Authorization: `Bearer ${jwt}`
          //     },
          //   }
          // )

          // return data
          ctx.send(data)
        }
        else {
          ctx.send([])
        }
      } catch (error) {
        ctx.send(error)
      }
    }
    else {
      ctx.send({ "msg": "File not available" })
    }
  },

  prepareSubfolders(collections, parent) {
    const arr = []
    const filteredArr = collections.filter((c) => { return c.collection !== null && c.collection.id === parent.id })
    if (filteredArr.length !== 0) {
      filteredArr.forEach((s) => {
        if (s.collection.id === parent.id) {
          const obj = {
            ...s,
            folders: this.prepareSubfolders(collections, s),
            bookmarks: s.gems || []
          }
          delete obj.gems
          arr.push(obj)
        }
      })
    }
    return arr
  },

  prepareCollectionData(collections) {
    const arr = []
    collections.filter((c) => { return c.collection === null }).forEach((p) => {
      const obj = {
        ...p,
        folders: this.prepareSubfolders(collections, p),
        bookmarks: p.gems || []
      }
      delete obj.gems
      arr.push(obj)
    })
    return arr
  },

  async getUserCollections(ctx) {
    const { user } = ctx.state
    if (user) {
      const collections = await strapi.entityService.findMany('api::collection.collection', {
        filters: {
          author: user.id
        },
        sort: { id: 'asc' },
        fields: ["id", "name", "slug", "avatar", "comments_count", "shares_count", "likes_count", "save_count"]
      })
      ctx.send(collections)
    }
    else {
      ctx.send([])
    }
  },

  async getUserBookmarkCollections(ctx) {
    const { user } = ctx.state
    const { type, collectionId, isPublic } = ctx.request.query
    let collections
    if (user) {
      if (type) {
        collections = await strapi.entityService.findMany('api::collection.collection', {
          filters: {
            author: user.id
          },
          sort: { id: 'asc' },
          fields: ["id", "name", "slug", "avatar", "iconLink", "comments_count", "shares_count", "likes_count", "save_count"],
          populate: {
            collection: {
              fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
            },
            gems: {
              fields: ["id", "url", "title", "slug", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "usageCount", "isPending", "isApproved"]
            },
            tags: {
              fields: ["id", "tag", "slug"]
            }
          }
        });
        collections.forEach((g) => {
          g.bookmark_length = g.gems.length
          delete g.gems
        })

      } else if (collectionId) {
        collections = await strapi.entityService.findMany('api::collection.collection', {
          filters: {
            id: collectionId,
            author: user.id
          },
          sort: { id: 'asc' },
          populate: {
            collection: {
              fields: ["id", "name", "slug"]
            },
            parent_collection: true,
            gems: {
              fields: ["id", "url", "title", "slug", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "entityObj", "socialfeedAt", "expander", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "usageCount", "isPending", "isApproved"],
              populate: {
                tags: {
                  fields: ["id", "tag", "slug"]
                }
              }
            }
          }
        });
        const { type, collectionId, isPublic } = ctx.request.query
      } else if (isPublic) {
        collections = await strapi.entityService.findMany('api::collection.collection', {
          filters: {
            author: user.id
          },
          sort: { id: 'asc' },
          populate: {
            collection: {
              fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
            },
            gems: {
              filters: {
                isPublic: true,
              },
              fields: ["id", "url", "title", "slug", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "entityObj", "socialfeedAt", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "showThumbnail", "fileType", "highlightId", "isPublic", "usageCount", "isPending", "isApproved"],
              populate: {
                tags: {
                  fields: ["id", "tag", "slug"]
                }
              }
            },
            tags: {
              fields: ["id", "tag", "slug"]
            }
          }
        });
      } else {
        collections = await strapi.entityService.findMany('api::collection.collection', {
          filters: {
            author: user.id
          },
          sort: { id: 'asc' },
          populate: {
            collection: {
              fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
            },
            gems: {
              fields: ["id", "url", "title", "slug", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "entityObj", "socialfeedAt", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "showThumbnail", "fileType", "highlightId", "usageCount", "isPending", "isApproved"],
              populate: {
                tags: {
                  fields: ["id", "tag", "slug"]
                }
              }
            },
            tags: {
              fields: ["id", "tag", "slug"]
            }
          }
        });
      }
      const finalCollections = this.prepareCollectionData(collections)
      const finalResult = finalCollections.filter((f) => { return f.collection === null })
      ctx.send(finalResult)
    }
    else {
      ctx.send([])
    }
  },

  async create(ctx) {
    const userId = ctx.state.user.id;
    const { data } = ctx.request.body;

    const userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
      where: {
        author: userId
      }
    })

    // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')

    // if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.coll_used) >= parseInt(configLimit[0].coll_limit)) {
    //   return ctx.send({ msg: 'Folders bookmark limit is exceeded Please extend your service plan' })
    // }
    if (userPlan && userPlan?.plan === 'free' && parseInt(userPlan?.coll_used) >= parseInt(userPlan?.coll_limit)) {
      return ctx.send({ msg: 'Folders bookmark limit is exceeded Please extend your service plan' })
    }

    const createdColl = await strapi.db.query('api::collection.collection').create({
      data: {
        ...data,
        publishedAt: new Date().toISOString()
      }
    })

    if (userPlan) {
      await updatePlanService(userId, { coll_used: parseInt(userPlan.coll_used) + 1 })
    }

    return ctx.send({ data: createdColl });
  },

  async createImportCollection(ctx) {
    const { data } = ctx.request.body;
    // When there is bulk import using html file or browser sync it should not create duplicate collection for that particular user
    if (data?.isBasicImport) {
      let queryObj = { name: data.name, collection: null, author: { id: ctx.state?.user?.id } }
      if (data?.parent_collection_name) {
        queryObj = { 
          ...queryObj,
          collection: {
            name: data?.parent_collection_name
          }
        }
      }
      const existingCollectionArr = await strapi.db.query('api::collection.collection').findMany({
        where: queryObj,
        populate: {
          collection: ["id", "name", "slug"]
        }
      })
      if (existingCollectionArr?.length > 0) {
        return ctx.send({ data: existingCollectionArr[0] })
      }
    }
    const createdColl = await strapi.db.query('api::collection.collection').create({
      data: {
        ...data,
        publishedAt: new Date().toISOString()
      },
      populate: {
        collection: ["id", "name", "slug"]
      }
    })
    return ctx.send({ data: createdColl });
  },

  async getAllBookmark(ctx) {
    const userId = ctx?.state?.user?.id;

      const { page, perPage, groupBy, type, posttype, platform, userQueryId } = ctx.request.query;
      const pages = page ? page : '';
      const perPages = perPage ? perPage : 10;
      let payload = {};
      let bookmark;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);
      const qUserId = userQueryId && typeof userQueryId === "string" ? parseInt(userQueryId) : userQueryId

      if (groupBy && groupBy.toLowerCase() === 'collection') {
        bookmark = await strapi.service('api::collection.collection').groupBookmarkByCollection(userId);
        return ctx.send({ data: bookmark });
      }

      let filters = {
        author: userQueryId ? userQueryId : userId,
      }

      if (type) {
        filters.media_type = type
      }
      if (platform) {
        filters.platform = platform
      }
      if (posttype) {
        filters.post_type = posttype
      }

      if (userQueryId && qUserId !== userId) {
        filters.collection_gems = {
          $or: [
            { sharable_links: { $notNull: true } },
            { invitedUsersViaMail: { $notNull: true, $containsi: ctx.state.user?.email } },
            { invitedUsersViaLinks: { $notNull: true, $containsi: ctx.state.user?.email } }
          ]
        }
      }

      /* total no of bookmarks  */
      const totalBookmark = await strapi.entityService.findMany('api::gem.gem', {
        filters,
        fields: ["id", "title", "slug"]
      })

      if (pages) {
        bookmark = await strapi.entityService.findMany('api::gem.gem', {
          filters,
          fields: ["id", "url", "slug", "altInfo", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "createdAt", "post_type", "socialfeed_obj", "entityObj", "socialfeedAt", "broken_link", "expander", "platform", "comments_count", "shares_count", "likes_count", "save_count", "updatedAt", "fileType", "imageColor"],
          sort: { id: 'desc' },
          populate: {
            collection_gems: {
              fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
            },
            tags: {
              fields: ["id", "tag", "slug", "avatar"]
            },
            like_users: {
              fields: ["id", "username"]
            },
            author: {
              fields: ["id", "username"]
            }
          },
          start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
          limit: perPagesNum
        });

        payload.paginate = {
          pageNo: pages,
          limit: perPages,
          noOfpages: Math.ceil(parseInt(totalBookmark.length) / perPagesNum)
        }
      } else {
        bookmark = await strapi.entityService.findMany('api::gem.gem', {
          filters,
          fields: ["id", "url", "slug", "altInfo", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "createdAt", "post_type", "socialfeed_obj", "entityObj", "socialfeedAt", "broken_link", "expander", "platform", "comments_count", "shares_count", "likes_count", "save_count", "fileType"],
          sort: { id: 'desc' },
          populate: {
            collection_gems: {
              fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
            },
            tags: {
              fields: ["id", "tag", "slug", "avatar"]
            },
            like_users: {
              fields: ["id"]
            },
            author: {
              fields: ["id", "username"]
            }
          },
        });
      }

      if (bookmark.length > 0) {
        payload.bookmark = bookmarkUtils(bookmark);
      }

      // gemification score
      const gemificationScore = await strapi.entityService.findMany('api::gamification-score.gamification-score', {
        filters: { author: userQueryId ? userQueryId : userId }
      })
      const commentsCount = gemificationScore[0]?.comments || [];

      ctx.send({ msg: 'Get all bookmark', totalBookmark: totalBookmark.length, data: payload, commentsCount }) 

  },

  getCollectionBookmarks: async (ctx) => {
    try {
      const collectionId = ctx.params.collectionId;
      const { user } = ctx.state;
      const { page, perPage, userId, isBio, isExtension } = ctx.request.query;
      const pages = page ? page : 1;
      const perPages = perPage ? perPage : 10;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);

      let populate = {
        gems: {
          fields: ["id", "url", "slug", "altInfo", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "custom_fields_obj", "createdAt", "updatedAt", "socialfeed_obj", "entityObj", "broken_link", "expander", "platform", "comments_count", "shares_count", "likes_count", "save_count", "fileType", "isApproved", "isPending", "isRead", "isPublicPrompt", "imageColor", "post_type", "is_enable_for_all_sites","prompt_priority_sites", "prompt_category"],
          populate: {
            tags: {
              fields: ["id", "tag", "slug", "avatar"]
            },
            author: {
              fields: ["id", "username"]
            },
            parent_gem_id: {
              fields: ["id"]
            }
          }
        }
      };
      if (isExtension !== "true") {
        populate.collection = {
          fields: ["id", "name", "comments_count", "shares_count", "likes_count", "save_count", "viewSubCollection", "shortDescription", "showGem", "gemOnClickEvent", "otherSupportedMediaTypes"]
        }
        populate.author = {
          fields: ["id"]
        }   
      }

      let collections = await strapi.entityService.findOne('api::collection.collection', collectionId, {
        // filters: {
        //   author: user.id
        // },
        fields: isExtension === "true" ? ["id", "name", "slug"] : ["id", "name", "slug", "fields", "description", "color", "sharable_links", "invited_users", "public_url_detail", "total_downvotes", "total_upvotes", "comments", "public_link", "account", "is_sub_collection", "rating", "invitedUsersViaMail", "invitedUsersViaLinks", "custom_fields_obj", "iconLink", "avatar", "media_type", "background", "coverImage", "follower_users", "viewSettingObj", "isPublicLink", "collectionPassword", "comments_count", "shares_count", "likes_count", "save_count", "createdAt", "updatedAt", "publishedAt", "wallpaper", "isShareCollection", "originalPassword", "seo", "isBioContactCollection", "showSidebar", "shortDescription", "viewSubCollection", "publicSubCollection", "allowCopy", "order_of_gems", "showGem", "order_of_sub_collections", "gemOnClickEvent", "otherSupportedMediaTypes"],
        sort: { id: 'asc' },
        populate
      });

      let order = collections?.order_of_gems ? collections.order_of_gems : [];
      const uniqueOrder = [...new Set(order)];

      const gemsId = [] 
      collections?.gems?.forEach((g) => {
        gemsId.push(g.id)
      })

      const isArraySame = arraysHaveSameElements(uniqueOrder, gemsId)
      let uniquemergedArray = null;

      if (uniqueOrder.length === 0 || uniqueOrder.length !== gemsId.length || !isArraySame) {

        const mergedArray = uniqueOrder.concat(gemsId.filter(element => !uniqueOrder.includes(element)));
        uniquemergedArray = [...new Set(mergedArray)];
        await strapi.entityService.update("api::collection.collection", collections?.id, {
          data: {
            order_of_gems: uniquemergedArray
          }
        })
      }

      const gems = await strapi.entityService.findMany('api::gem.gem', {
        filters: { id: { $in: uniquemergedArray ? uniquemergedArray : uniqueOrder }},
        populate: {
          tags: {
            fields: ["id", "tag", "slug", "avatar"]
          },
          author: {
            fields: ["id", "username"]
          },
          parent_gem_id: {
            fields: ["id"]
          }
        }
      })

      // const gemsInOrder = uniquemergedArray 
      //   ? uniquemergedArray.map(id => gems.find(gem => gem.id === id)) 
      //   : uniqueOrder?.map(id => gems.find(gem => gem.id === id));
      
      let gemsInOrder = []
      if (uniquemergedArray) {
        uniquemergedArray.forEach(id => {
          const gem = gems.find(gem => gem.id === id)
          if (gem) {
            gemsInOrder.push(gem)
          }
        })
      } else {
        uniqueOrder?.forEach(id => {
          const gem = gems.find(gem => gem.id === id)
          if (gem) {
            gemsInOrder.push(gem)
          }
        })
      }

      let approvedCollectionGems
      // if (collections?.sharable_links) {
      //    approvedCollectionGems = collections.gems.filter((data) => {
      //     if ((data?.author?.id === collections.author.id) || (data.isApproved === true && data.isPending === false)) {
      //       return data
      //     }
      //   })
      // }
      if (collections?.sharable_links) {
        approvedCollectionGems = gemsInOrder.filter((data) => {
          if ((data?.author?.id === collections.author.id) || (data?.isApproved === true && data?.isPending === false)) {
            return true
          }
        })
      }

      const totalCount = approvedCollectionGems ? approvedCollectionGems.length : gemsInOrder?.length ? gemsInOrder?.length : 0;

      if (page && perPage) {
        const totalPages = Math.ceil(parseInt(collections.gems.length) / perPagesNum);

        if (pageNum > totalPages) {
          collections.gems = [];
        } else {
          const start = (pageNum - 1) * perPagesNum;
          const end = start + perPagesNum;
          const paginatedGems = approvedCollectionGems ? approvedCollectionGems.slice(start, end) : gemsInOrder.slice(start, end);
          collections.gems = bookmarkUtils(paginatedGems);
        }
        collections.paginate = {
          pageNo: pages,
          limit: perPages,
          noOfpages: totalPages
        };
      }

      if (isBio === "true") {
        collections = {
          id: collections.id,
          name: collections.name,
          gems: collections.gems,
        }
        ctx.send({ totalBookmark: totalCount, collection: collections });
        return
      }

      if (user) {

        if (isExtension !== "true") {
          /* Fetching collection-config setting by collectionId */
          const bookmarkConfig = await strapi.db.query('api::bookmark-config.bookmark-config').findOne({
            where: {
              author: user.id
            }
          })
          collections.configColl = bookmarkConfig

          if (bookmarkConfig?.configCollSetting) {
            const configCollExist = bookmarkConfig.configCollSetting.find(c_coll => (parseInt(c_coll.pageId) === parseInt(collectionId)));
            collections.configColl = configCollExist ? configCollExist : bookmarkConfig;
          }
          delete collections?.configColl?.configCollSetting
          delete collections?.configColl?.configTagSetting
          delete collections?.configColl?.configLinksSetting
          delete collections?.configColl?.configFilterSetting
        }

        ctx.send({ totalBookmark: totalCount, collection: collections, oderOfSubCollections: collections?.order_of_sub_collections });
        return
      }

    } catch (error) {
      ctx.send({ status: 400, message: error.message })
    }
  },

  async moveBookmarkToColl(ctx) {
    const userId = ctx.state.user.id;
    const { gemId, collectionId } = ctx.params;

    const srcBookmark = await strapi.db.query('api::gem.gem').findOne({
      where: {
        $and: [
          {
            author: userId
          },
          {
            id: gemId
          }
        ]
      }
    })

    const destColl = await strapi.db.query("api::collection.collection").findOne({
      where: {
        id: collectionId
      }
    })

    if (!srcBookmark || !destColl) {
      return ctx.send({ msg: 'No bookmark or collection detail exist' }, 400);
    }

    const gem = await strapi.db.query('api::gem.gem').update({
      where: {
        id: gemId
      },
      data: {
        collection_gems: collectionId
      }
    })

    ctx.send({ msg: 'Bookmark has moved to new folder successfully' });
  },

  prepareRequireCollection(coll, mainData) {
    const arr = []
    let approvedCollectionGems = coll.gems.filter((data) => {
      if ((data?.author?.id === coll.author.id) || (data.isApproved === true && data.isPending === false)) {
        return data
      }
    })

    if (coll.parent_collection === null || coll.parent_collection === undefined || coll.parent_collection?.length === 0) {
      const copyObj = coll.gems ? [...coll.gems] : []
      delete coll.parent_collection
      delete coll.gems
      arr.push({
        ...coll,
        folders: [],
        // bookmarks: copyObj
        bookmarks: approvedCollectionGems

      })

      return arr
    }

    if (Array.isArray(coll.parent_collection)) {
      const copyObj = coll.gems ? [...coll.gems] : []
      const obj = {
        ...coll,
        folders: [],
        // bookmarks: copyObj
        bookmarks: approvedCollectionGems

      }
      coll.parent_collection?.forEach((p) => {
        const idx = mainData.findIndex((d) => { return d.id === p.id })
        if (idx !== -1) {
          obj.folders = [...obj.folders, ...this.prepareRequireCollection(mainData[idx], mainData)]
        }
      })
      delete obj.parent_collection
      delete obj.gems
      return [obj]
    }
  },

  async shareCollectionViaEmail(ctx) {
    try {
      const id = ctx.state.user.id;
      const u  = ctx.state.user
      const uname = ctx.state.user.username;
      const jwt = getService('jwt').issue({ id: id });
      const { description,
        accessType,
        email } = ctx.request.body;

      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: email }
      });
      const userid = !user ? null : user.id;
      const username = !user ? null : user.username;

      const collid = ctx.params.collectionId;
      const collection = await strapi.entityService.findOne('api::collection.collection', collid, {
        populate: '*'
      });

      let invitedUsersArr = [];
      if (collection.invitedUsersViaMail != null) invitedUsersArr.push(...collection.invitedUsersViaMail);
      const index = invitedUsersArr.findIndex(d => d.emailId === email);

      // const creationDate = new Date();
      // const expiryDate = new Date(creationDate.getFullYear() + 1, creationDate.getMonth(), creationDate.getDate());
      const expiryDate = moment(new Date()).add(1, 'years').format("DD/MM/YYYY")
      // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')
      const configLimit = await strapi.db.query("api::config-limit.config-limit").findOne({
        where: { allowViews: { $notNull: true }, allowsDownload: { $notNull: true } }
      })

      const permissions = await accessPermissions(accessType);
      const uniqueToken = uuidv4();

      /* Frontend redirect url that shared into user-mail */
      const link = `${process.env.REDIRECT_URI}/check-user?token=${uniqueToken}&collectionId=${collid}&email=${email}`;

      const invitedUsersObj = {
        id: userid,
        emailId: email,
        userName: username,
        link: link,
        token: uniqueToken,
        accessType: accessType,
        password: null,
        isSecure: false,
        isExpire: false,
        permissions,
        expiryDate: expiryDate,
        allowViews: configLimit?.allowViews,
        allowsDownload: configLimit?.allowsDownload,
        totalDownload: 0,
        linkClick: 0,
        isAccept: false,
      };
      index === -1 ? invitedUsersArr.push(invitedUsersObj) : invitedUsersArr[index] = invitedUsersObj;

      const collectionData = await strapi.entityService.update('api::collection.collection', collid, {
        data: {
          invitedUsersViaMail: invitedUsersArr,
          isShareCollection: true,
          isShared: true
        }
      });

      shareInviteTopToBottom(collid, invitedUsersObj)

      await strapi.service('api::team.team').updateCurrentSharedCollectionsOrTags({
        email,
        author: id
      }, collid, "collections");

      /* logs data for update hightlighed text  */
      // await strapi.entityService.create("api::activity-log.activity-log", {
      //   data: {
      //     action: "Shared",
      //     module: "Collection",
      //     actionType: "Collection",
      //     collection: collectionData.id,
      //     count: 1,
      //     author: id,
      //     publishedAt: new Date().toISOString(),
      //   },
      // });
      const object = {
        action: "Shared",
        module: "Collection",
        actionType: "Collection",
        count: 1,
        author: { id: id, username: uname },
        collection_info: { id: collectionData.id, name: collectionData.name }
      }
      createActivity(object, jwt);

      const userService = getService('users-permissions');
      const message     = await userService.template(SHARED_EMAIL, {
          USER: { name: u.firstname && u.lastname ? `${u.firstname} ${u.lastname}` : u.username },
          CODE: collection.name,
          URL: link
      });
      const subject     = await userService.template("You just received a collection!📦", {
          USER: u,
      });
      strapi
        .plugin('email')
        .service('email')
        .send({
            to: email,
            from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
            replyTo: process.env.AWS_EMAIL_REPLY_TO,
            subject,
            text: message,
            html: message,
        });
      // await axios.post(
      //   `${process.env.MONGODB_URL}/api/activitylogs`,
      //   {
      //     action: "Shared",
      //     module: "Collection",
      //     actionType: "Collection",
      //     count: 1,
      //     author: { id: id, username: uname },
      //     collection_info: { id: collectionData.id, name: collectionData.name}
      //   },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${jwt}`
      //     },
      //   }
      // )

      // await strapi.plugins['email'].services.email.send({
      //   to: email,
      //   from: 'noreply@curateit.com',
      //   subject: 'Share Collection',
      //   html: `<div><p>${description}</p> <a href=${link}>Click Here</a></div>`,
      // })

      return { status: 200, message: "email send" };

    } catch (error) {
      console.log(error);
    }
  },

  async getCollectionByEmail(ctx) {
    try {
      const { user } = ctx.state;
      const collid = ctx.request.query.collectionId;
      const email = ctx.request.query.email;
      const collection = await strapi.entityService.findOne('api::collection.collection', collid, {
        populate: {
          author: {
            fields: ["id"]
          }
        }
      });
      const invitedUser = collection.invitedUsersViaMail;
      let objIndex = invitedUser.findIndex(d => d.emailId === email);

      if (objIndex === -1) return ctx.send({ msg: 'No user exist' }, 400);

      const expiryDate = invitedUser[objIndex]?.expiryDate
      const allowsDownload = invitedUser[objIndex]?.allowsDownload
      const allowViews = invitedUser[objIndex]?.allowViews
      const accessType = invitedUser[objIndex]?.accessType
      const creationDate = moment(new Date()).format("DD/MM/YYYY")

      // if (invitedUser[objIndex]?.emailId === user.email && moment(expiryDate, "DD/MM/YYYY").isAfter(moment(creationDate, "DD/MM/YYYY")) && allowViews >= invitedUser[objIndex]?.linkClick && allowsDownload >= invitedUser[objIndex]?.totalDownload && !invitedUser[objIndex]?.isExpire) {

      if (moment(expiryDate, "DD/MM/YYYY").isAfter(moment(creationDate, "DD/MM/YYYY")) && allowViews >= invitedUser[objIndex]?.linkClick && allowsDownload >= invitedUser[objIndex]?.totalDownload && !invitedUser[objIndex]?.isExpire) {


        if (invitedUser[objIndex]?.emailId !== user.email) {
          return ctx.send({ msg: 'You are not allowed to open this collection' }, 400);
        }

        if (!invitedUser[objIndex].isAccept) {
          invitedUser[objIndex].isAccept = true;
        }
        invitedUser[objIndex].linkClick = invitedUser[objIndex].linkClick + 1;
        await strapi.entityService.update('api::collection.collection', collid, {
          data: {
            invitedUsersViaMail: invitedUser
          }
        });

        const requireColl = await strapi.entityService.findMany('api::collection.collection', {
          filters: {
            author: collection.author.id
          },
          sort: { id: 'asc' },
          fields: ["id", "name", "slug", "avatar", "iconLink", "comments_count", "shares_count", "likes_count", "save_count", "isShareCollection"],
          populate: {
            parent_collection: {
              fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"],
            },
            gems: {
              fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending"]
            },
            tags: {
              fields: ["id", "tag", "slug"]
            },
            author: {
              fields: ["id"]
            }
          }
        });

        const parentColl = requireColl.filter((d) => {
          return d.id === parseInt(collid)
        })

        const finalCollection = this.prepareRequireCollection(parentColl[0], requireColl)
        
        return ctx.send({
          status: 200, msg: "Shared collection details is valid ", accessType, isShareCollection: collection.isShareCollection, data: finalCollection
        });
      }

      ctx.send({ status: 400, msg: 'Shared collection details is expired. Please contact owner.' });

    } catch (error) {
      console.log("error occured :", error);
      ctx.send({ status: 400, msg: error.message });
    }
  },

  async shareCollectionViaLink(ctx) {
    try {
      const { user } = ctx.state;
      const jwt = getService('jwt').issue({ id: user.id });
      const collid = ctx.params.collectionId;
      const uniqueId = collid + "" + uuidv4();
      const { allowEmail, accessType } = ctx.request.query;

      let link;
      /* Shared collection via invite link */
      if (allowEmail) {
        link = `${process.env.REDIRECT_URI}/check-user/link?inviteId=${uniqueId}&collectionId=${collid}&allowEmail=${allowEmail}&isLink=true`;
      } else {
        link = `${process.env.REDIRECT_URI}/check-user/link?inviteId=${uniqueId}&collectionId=${collid}&isLink=true`;
      }

      const collection = await strapi.entityService.findOne('api::collection.collection', collid);

      let invitedLinksArr = [];
      if (collection.invitedUsersViaLinks != null) invitedLinksArr.push(...collection.invitedUsersViaLinks);

      // const creationDate = new Date();

      // const expiryDate = new Date(creationDate.getFullYear() + 1, creationDate.getMonth(), creationDate.getDate());

      const expiryDate = moment(new Date()).add(1, 'years').format("DD/MM/YYYY")

      // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')
      const configLimit = await strapi.db.query("api::config-limit.config-limit").findOne({
        where: { allowViews: {$notNull: true}, allowsDownload: {$notNull: true} }
      })

      const permissions = await accessPermissions(accessType);

      const invitedLinksObj = {
        id: uniqueId,
        url: link,
        accessType: accessType,
        password: null,
        isSecure: false,
        isExpire: false,
        permissions,
        expiryDate: expiryDate,
        allowViews: configLimit?.allowViews,
        allowsDownload: configLimit?.allowsDownload,
        totalDownload: 0,
        linkClick: 0,
        emailArr: [],
        allowAllMail: allowEmail ? allowEmail : "all"
      };
      invitedLinksArr.push(invitedLinksObj);

      const collectionData = await strapi.entityService.update('api::collection.collection', collid, {
        data: {
          invitedUsersViaLinks: invitedLinksArr,
          isShareCollection: true,
          isShared: true
        }
      });

      /* logs data for update hightlighed text  */
      // await strapi.entityService.create("api::activity-log.activity-log", {
      //   data: {
      //     action: "Shared",
      //     module: "Collection",
      //     actionType: "Collection",
      //     collection: collectionData.id,
      //     count: 1,
      //     author: user.id,
      //     publishedAt: new Date().toISOString(),
      //   },
      // });
      const object = {
        action: "Shared",
        module: "Collection",
        actionType: "Collection",
        count: 1,
        author: { id: user.id, username: user.username },
        collection_info: { id: collectionData.id, name: collectionData.name }
      }
      createActivity(object, jwt);
      // await axios.post(
      //   `${process.env.MONGODB_URL}/api/activitylogs`,
      //   {
      //     action: "Shared",
      //     module: "Collection",
      //     actionType: "Collection",
      //     count: 1,
      //     author: { id: user.id, username: user.username },
      //     collection_info: { id: collectionData.id, name: collectionData.name}
      //   },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${jwt}`
      //     },
      //   }
      // )

      ctx.send({ status: 200, msg: 'Invited links created successfully', link });

    } catch (error) {
      console.log(error);
      ctx.send({ msg: "error occured" }, 400);
    }
  },

  async getCollectionViaShareLink(ctx) {
    try {
      const { email } = ctx.state.user;
      const inviteId = ctx.request.query.inviteId
      const collId = ctx.request.query.collectionId;

      const collection = await strapi.entityService.findOne('api::collection.collection', collId, {
        populate: {
          author: {
            fields: ["id"]
          }
        }
      });

      const invitedLink = collection?.invitedUsersViaLinks;
      let invitedEmails = collection?.invitedUsersViaMail || [];

      if (!invitedLink) return ctx.send({ status: 400, msg: 'No invited link is exist' }, 400);

      let objIndex = invitedLink.findIndex((d => d.id === inviteId));

      if (objIndex === -1) return ctx.send({ status: 400, msg: 'No invite link is exist' }, 400);

      /* Checking allow to all mail or specific mail ? */
      const domainOfMail = email.split("@")[1];

      if (invitedLink[objIndex].allowAllMail !== "all" && invitedLink[objIndex].allowAllMail.toLowerCase() !== domainOfMail.toLowerCase()) {
        return ctx.send({ status: 400, msg: "You are not authorized to access this collection content" });
      }

      const expiryDate = invitedLink[objIndex].expiryDate
      const allowsDownload = invitedLink[objIndex].allowsDownload
      const allowViews = invitedLink[objIndex].allowViews
      const accessType = invitedLink[objIndex]?.accessType
      const currentDate = moment(new Date()).format("DD/MM/YYYY")
      // if (!invitedLink[objIndex].emailArr.includes(email)) {
      //   invitedLink[objIndex].emailArr.push(email)
      // }

      if (moment(expiryDate, "DD/MM/YYYY").isAfter(moment(currentDate, "DD/MM/YYYY")) && parseInt(allowViews) >= parseInt(invitedLink[objIndex].linkClick) && parseInt(allowsDownload) >= parseInt(invitedLink[objIndex].totalDownload) && !invitedLink[objIndex].isExpire) {

        const newUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { email: email }
        })
        const emailIdx = invitedEmails.findIndex(d => d.emailId === email);
        if (newUser && emailIdx === -1) {
          const uniqueToken = uuidv4();
          const link = `${process.env.REDIRECT_URI}/check-user?token=${uniqueToken}&collectionId=${collId}&email=${newUser.email}`;
          const invitedUsersObj = {
            id: newUser.id,
            emailId: newUser.email,
            userName: newUser.username,
            link: link,
            token: uniqueToken,
            accessType: invitedLink[objIndex].accessType,
            password: null,
            isSecure: false,
            isExpire: false,
            permissions: invitedLink[objIndex].permissions,
            expiryDate: invitedLink[objIndex].expiryDate,
            allowViews: invitedLink[objIndex].allowViews,
            allowsDownload: invitedLink[objIndex].allowsDownload,
            totalDownload: 0,
            linkClick: 0,
            isAccept: true,
            isViaLink: true
          };
          shareInviteTopToBottom(collId, invitedUsersObj, true)
          invitedEmails.push(invitedUsersObj)
        }
        invitedLink[objIndex].linkClick = invitedLink[objIndex].linkClick + 1;
        const collectionData = await strapi.entityService.update('api::collection.collection', collId, {
          data: {
            invitedUsersViaLinks: invitedLink,
            invitedUsersViaMail: invitedEmails
          }
        });
        /* Deleting inviteUserVaiMail Object */
        delete collectionData.invitedUsersViaMail;

        const requireColl = await strapi.entityService.findMany('api::collection.collection', {
          filters: {
            author: collection.author.id
          },
          sort: { id: 'asc' },
          fields: ["id", "name", "slug", "avatar", "iconLink", "comments_count", "shares_count", "likes_count", "save_count"],
          populate: {
            parent_collection: {
              fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"],
            },
            gems: {
              fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isPending", "isApproved"]
            },
            tags: {
              fields: ["id", "tag", "slug"]
            },
            author: {
              fields: ["id"]
            }
          }
        });

        const parentColl = requireColl.filter((d) => {
          return d.id === parseInt(collId)
        })

        const finalCollection = this.prepareRequireCollection(parentColl[0], requireColl)

        return ctx.send({ status: 200, msg: 'Invite links is valid', accessType, isShareCollection: collection.isShareCollection, data: finalCollection })

      }

      ctx.send({ status: 400, msg: 'Shared collection details is expired. Please contact owner.' });
    } catch (error) {
      ctx.send({ status:400, msg: error.message });
    }
  },

  async setSecurityOnLink(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        ctx.send({
          message: "Unauthorized User!"
        })
        return
      }

      const {
        accessType,
        allowsDownload,
        allowViews,
        expiryDate
      } = ctx.request.body;
      const collectionId = ctx.params.collectionId;
      const { id, isLink } = ctx.request.query;
      const collection = await strapi.entityService.findOne('api::collection.collection', collectionId);
      const permissions = await accessPermissions(accessType);

      if (isLink === "true") {

        const index = collection.invitedUsersViaLinks.findIndex(d => d.id === id);
        let invitedUsers = collection.invitedUsersViaLinks;
        invitedUsers[index].accessType = accessType;
        invitedUsers[index].allowViews = allowViews;
        invitedUsers[index].allowsDownload = allowsDownload;
        invitedUsers[index].expiryDate = expiryDate;
        invitedUsers[index].permissions = permissions;

        const shareCollectionLinkData = await strapi.entityService.update('api::collection.collection', collectionId, {
          data: {
            invitedUsersViaLinks: invitedUsers
          }
        })

      } else {

        const index = collection.invitedUsersViaMail.findIndex(d => d.token === id);
        let invitedUsers = collection.invitedUsersViaMail;
        invitedUsers[index].accessType = accessType;
        invitedUsers[index].allowViews = allowViews;
        invitedUsers[index].allowsDownload = allowsDownload;
        invitedUsers[index].expiryDate = expiryDate;
        invitedUsers[index].permissions = permissions;

        const shareCollectionEmailData = await strapi.entityService.update('api::collection.collection', collectionId, {
          data: {
            invitedUsersViaMail: invitedUsers
          }
        })

      }

      ctx.send({ status: 200, msg: 'Update successfully.' })

    } catch (error) {
      ctx.send({
        message: error
      })
    }
  },

  async setPassword(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        return ctx.send({
          message: "Unauthorized User"
        })
      }

      const { password } = ctx.request.body;
      let hashedPassword = null

      if (password) {
        const saltRounds = 10; // number of salt rounds to use
        const salt = await bcrypt.genSalt(saltRounds);
        hashedPassword = await bcrypt.hash(password, salt);
      }

      const collectionId = ctx.params.collectionId;

      await strapi.entityService.update('api::collection.collection', collectionId, {
        data: {
          collectionPassword: hashedPassword ? hashedPassword : null,
          originalPassword: password
        }
      })

      ctx.send({ status: 200, msg: "Password set to invitedUser links successfully" })
    } catch (error) {
      ctx.send({
        message: error
      })
    }
  },

  async checkPassword(ctx) {
    try {
      const collid = ctx.params.collectionId;
      const userPassword = ctx.request.body.password;

      const collection = await strapi.entityService.findOne('api::collection.collection', collid);
      const collectionPassword = collection.secretPassword;

      if (!collectionPassword) {
        return ctx.send({ status: 200, msg: 'Password not set for this collection' });
      }

      if (!userPassword) {
        return ctx.send({ status: 200, msg: 'Password not provided in request boddy' });
      }

      const isPasswordCorrect = await bcrypt.compare(userPassword, collectionPassword);

      if (isPasswordCorrect) {
        return ctx.send({ status: 200, msg: 'Password matched successfully', isMatched: isPasswordCorrect });
      }

      ctx.send({ status: 400, msg: 'Invalid Credentials', isMatched: false });
    } catch (error) {
      console.log(error);
    }
  },

  async expireLink(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) {
        ctx.send({
          message: "Unauthorized User"
        })
      }

      let updatedCollection
      const collectionId = ctx.params.collectionId;
      const { id, isLink } = ctx.request.query;

      if (isLink === "false") {
        const collection = await strapi.entityService.findOne('api::collection.collection', collectionId, {
          populate: {
            parent_collection: {
              fields: ["id", "name", "invitedUsersViaMail", "invitedUsersViaLinks"]
            }
          }
        });
        const invitedUser = collection.invitedUsersViaMail
        let userEmail = null;
        const invitedUserObj = invitedUser.filter(d => {
          if (d.token === id) {
            userEmail = d?.emailId
          }
          return (d.token !== id)
        });

        updatedCollection = await strapi.entityService.update('api::collection.collection', collectionId, {
          data: {
            invitedUsersViaMail: invitedUserObj
          }
        })

        if (collection?.parent_collection && collection?.parent_collection?.length > 0) {
          removeShareChildLevelCollection(collection?.parent_collection, userEmail)
        }

        return ctx.send({ status: 200, msg: 'Access remove successfully' })
      }

      const collection = await strapi.entityService.findOne('api::collection.collection', collectionId, {
        populate: {
          parent_collection: {
            fields: ["id", "name", "invitedUsersViaMail", "invitedUsersViaLinks"]
          }
        }
      });
      const invitedLink = collection.invitedUsersViaLinks
      let userEmail = null;
      const invitedLinkObj = invitedLink.filter(d => {
        if (d.token === id) {
          userEmail = d?.emailId
        }
        return (d.id !== id)
      });

      updatedCollection = await strapi.entityService.update('api::collection.collection', collectionId, {
        data: {
          invitedUsersViaLinks: invitedLinkObj
        }
      })

      if (collection?.parent_collection && collection?.parent_collection?.length > 0) {
        removeShareChildLevelCollection(collection?.parent_collection, userEmail)
      }

      return ctx.send({ status: 200, msg: 'Access remove successfully' })

    } catch (error) {
      ctx.send({
        message: error
      })
    }
  },

  async sharePublicLink(ctx) {
    try {
      const { user } = ctx.state;
      const collid = ctx.params.collectionId;
      const jwt = getService('jwt').issue({ id: user.id });
      const uniqueId = uuidv4();
      const { viewSettingObj, showSidebar, slug, publicSubCollection } = ctx.request.body;

      const link = `${process.env.REDIRECT_URI}/u/${user.username.replace(" ", "")}/c/${collid}/${slug}`;

      const collectionData = await strapi.entityService.update('api::collection.collection', collid, {
        data: {
          sharable_links: link,
          isPublicLink: true,
          viewSettingObj,
          isShared: true,
          showSidebar: showSidebar ? showSidebar : true,
          publicSubCollection: publicSubCollection ? publicSubCollection : true
        }
      });

      // setCollectionSeoInformation(collectionData, collectionData?.author?.username)

      /* logs data for update hightlighed text  */
      // await strapi.entityService.create("api::activity-log.activity-log", {
      //   data: {
      //     action: "Shared",
      //     module: "Collection",
      //     actionType: "Collection",
      //     collection: collectionData.id,
      //     count: 1,
      //     author: user.id,
      //     publishedAt: new Date().toISOString(),
      //   },
      // });
      const object = {
        action: "Shared",
        module: "Collection",
        actionType: "Collection",
        count: 1,
        author: { id: user.id, username: user.username },
        collection_info: { id: collectionData.id, name: collectionData.name }
      }
      createActivity(object, jwt);
      updatePlanService(user.id, "public_collection_tag")
      // await axios.post(
      //   `${process.env.MONGODB_URL}/api/activitylogs`,
      //   {
      //     action: "Shared",
      //     module: "Collection",
      //     actionType: "Collection",
      //     count: 1,
      //     author: { id: user.id, username: user.username },
      //     collection_info: { id: collectionData.id, name: collectionData.name}
      //   },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${jwt}`
      //     },
      //   }
      // )

      ctx.send({ status: 200, msg: 'Public link created successfully', link });
    } catch (error) {
      console.log(error);
    }
  },

  async getCollectionByPublicLink(ctx) {
    try {

      const { inviteId, collectionId } = ctx.request.query;
      const coll = await strapi.entityService.findOne('api::collection.collection', collectionId, {
        populate: {
          author: {
            fields: ["id"]
          }
        }
      });
      const collection = await strapi.entityService.findMany('api::collection.collection', {
        filters: {
          author: coll.author.id
        },
        sort: { id: 'asc' },
        fields: ["id", "name", "slug", "avatar", "iconLink", "comments_count", "shares_count", "likes_count", "save_count", "collectionPassword", "wallpaper", "background", "description", "showSidebar"],
        populate: {
          parent_collection: {
            fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"],
          },
          gems: {
            fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending"],
            populate: {
              author: {
                fields: ["id", "username"]
              }
            }
          },
          tags: {
            fields: ["id", "tag", "slug"]
          },
          author: {
            fields: ["id", "username", "profilePhoto"]
          }
        }
      });

      if (!collection) return ctx.send({ status: 400, msg: 'No collection exist' });

      // const getInviteId = collection?.sharable_links ? collection.sharable_links.split('?')[1].split("=")[1] : null;

      // if (!getInviteId.includes(inviteId)) return ctx.send({ status: 400, msg: "This is not a valid inviteId link" });

      // if (collection?.invitedUsersViaMail)
      //   delete collection.invitedUsersViaMail;

      // if (collection?.invitedUsersViaLinks)
      //   delete collection.invitedUsersViaLinks;

      const parentColl = collection.filter((d) => {
        return d.id === parseInt(collectionId)
      })

      let finalCollection = this.prepareRequireCollection(parentColl[0], collection)

      const follower = await strapi.db.query("api::follower.follower").findOne({
        where: { userId: coll.author.id.toString() },
        populate: {
          follower_users: {
            select: ['id']
          }
        }
      })

      finalCollection[0].author.follower = follower?.follower_users || []
      finalCollection[0].author.following = follower?.following_users || []

      ctx.send({ status: 200, msg: 'Get public collection shared successfully', data: finalCollection })
    } catch (error) {
      console.log(error);
    }
  },

  async disablePublicLink(ctx) {
    try {
      const { user } = ctx.state;
      const collectionId = ctx.params.collectionId;

      await strapi.entityService.update('api::collection.collection', collectionId, {
        data: {
          sharable_links: null,
          isPublicLink: false,
          collectionPassword: null,
          showSeo: false
        }
      });
      updatePlanService(user.id, "public_collection_tag")

      ctx.send({ status: 200, msg: 'Public link is unable' })

    } catch (error) {
      ctx.send({ status: 400, msg: error })
    }
  },

  async checkUserRegister(ctx) {
    try {
      const { tokenId, collectionId } = ctx.params;
      const { email } = ctx.request.query;

      /* Fetching collectionId details */
      const collection = await strapi.db.query("api::collection.collection").findOne({
        where: {
          id: parseInt(collectionId)
        }
      })

      if (!collection || !collection?.invitedUsersViaMail) return ctx.send({ msg: 'No collection or invited user found' }, 400);

      /* checking tokenId existing into UserInvitedObj */
      const inviteUser = collection?.invitedUsersViaMail.find(i_users => (i_users.token === tokenId));

      if (!inviteUser) return ctx.send({ msg: 'No invited user exist' }, 400);

      if (inviteUser?.isGroupShare) {
        const grpMember = inviteUser?.members?.find(u => u.email === email)
        if (!grpMember) return ctx.send({ status: 400, msg: 'No invited user exist' });
        if (inviteUser.token && grpMember.id) {
          return ctx.send({ status: 200, msg: 'Register-user' })
        }
      }

      if (inviteUser.token && inviteUser.id) {
        return ctx.send({ status: 200, msg: 'Register-user' })
      }
      return ctx.send({ status: 400, msg: 'Unregister-user' })

    } catch (error) {
      ctx.send({ status: 400, msg: error.message });
    }
  },

  async checkPermission(ctx) {
    try {
      const user = ctx.state.user;
      const { parent_collId, share_collId, hierarchyLevel, operation, token } = ctx.request.body;

      if (!hierarchyLevel || !operation) return ctx.send({ msg: 'Please pass valid input' }, 400);

      /* Checking hierarchy/operation value is correct or not ? */
      if (!hierarchyValue[hierarchyLevel] || !operationValue.includes(operation)) {
        return ctx.send({ msg: 'Please pass valid input' }, 400);
      }

      /* Fetching share collection detail by collId */
      const shareColl = await strapi.db.query("api::collection.collection").findOne({
        where: {
          id: parseInt(share_collId)
        }
      });
      if (!shareColl || !shareColl?.invitedUsersViaMail) return ctx.send({ msg: 'No share collection exist' }, 400);

      let invitedColl;

      /* Is user invited collection via email */
      // const invitedColl = shareColl?.invitedUsersViaMail.find(i_users => (parseInt(i_users.id) === parseInt(user.id)));
      if (token) {
        invitedColl = shareColl?.invitedUsersViaLinks.find(i_users => (i_users.id === token));
      } else {
        invitedColl = shareColl?.invitedUsersViaMail.find(i_users => (parseInt(i_users.id) === parseInt(user.id)));
      }

      if (!invitedColl) return ctx.send({ msg: 'No invite user exist into share collection' }, 400);

      let c_permission;
      let message;
      let statusCode;
      let dataInBoolean
      /* Checking parent_collId is childColl of share_collId or not ? */
      if (parseInt(share_collId) === parseInt(parent_collId)) {
        if (!invitedColl.permissions[hierarchyLevel][operation]) {
          message = "You are not allowed to perform this operation"
          dataInBoolean = invitedColl.permissions[hierarchyLevel][operation]
          statusCode = 400
        } else {
          message = "Permission granted"
          dataInBoolean = invitedColl.permissions[hierarchyLevel][operation]
          statusCode = 200
        }
      } else {
        /* Checking share-collId is parent of parent_collId using recursively */
        const parentColl = await strapi.db.query("api::collection.collection").findOne({
          where: {
            id: parseInt(parent_collId)
          },
          select: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"],
          populate: {
            collection: {
              select: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
            }
          }
        })

        if (!parentColl) return ctx.send({ msg: "No parent collection exist" }, 400);

        c_permission = await this.checkParentOfParentColl(parentColl, share_collId);

        if (c_permission) {
          if (!invitedColl.permissions[hierarchyLevel][operation]) {
            message = "You are not allowed to perform this operation"
            dataInBoolean = invitedColl.permissions[hierarchyLevel][operation]
            statusCode = 400
          } else {
            message = "Permission granted"
            dataInBoolean = invitedColl.permissions[hierarchyLevel][operation]
            statusCode = 200
          }
        } else {
          message = "You are not allowed to perform this operation"
          dataInBoolean = false
          statusCode = 400
        }
      }

      ctx.send({ msg: message, data: dataInBoolean }, statusCode);
    } catch (err) {
      ctx.send({ msg: 'error occured', }, 400);
    }
  },

  async sharedCollToUnRegisteredUser(ctx) {
    try {
      const tokenId = ctx.request.query.tokenId;
      const collectionId = ctx.request.query.collectionId;
      const { id, email, username, profilePhoto, firstname, lastname } = ctx.state.user;

      /* Fetching collection details by collId  */
      const collection = await strapi.db.query("api::collection.collection").findOne({
        where: {
          id: parseInt(collectionId)
        }
      })
      if (!collection) return ctx.send({ msg: 'No collection exists' }, 400);

      /* Checking tokenId is exist or not ? */
      const inviteUserIndex = collection.invitedUsersViaMail ? (collection.invitedUsersViaMail.findIndex(i_users => (i_users.token === tokenId))) : null;

      // if (!inviteUserIndex || parseInt(inviteUserIndex) === -1) return ctx.send({ msg: 'No invite user exist into collection' }, 400);
      const updatedInvitedUsersList = collection.invitedUsersViaMail;
      if (updatedInvitedUsersList[inviteUserIndex]?.isGroupShare) {
        const gIdx = updatedInvitedUsersList[inviteUserIndex]?.members?.findIndex(gMem => gMem.email === email)
        updatedInvitedUsersList[inviteUserIndex].members[gIdx] = { ...updatedInvitedUsersList[inviteUserIndex]?.members[gIdx], id: id, email: email, username: username, avatar: profilePhoto, name: `${firstname} ${lastname}` };
      } else {
        updatedInvitedUsersList[inviteUserIndex] = { ...updatedInvitedUsersList[inviteUserIndex], id: id, emailId: email, userName: username };
      }

      /* Updating inviteUserObj into collections/folder */

      await strapi.db.query("api::collection.collection").update({
        where: {
          id: parseInt(collectionId)
        },
        data: {
          invitedUsersViaMail: updatedInvitedUsersList
        }
      })

      ctx.send({ status: 200, msg: 'Un-register user details updated successfully' });
    } catch (err) {
      ctx.send({ msg: "error occrued" }, 400);
    }
  },

  async checkParentOfParentColl(parentColl, share_collId) {
    if (!parentColl.collection) return false;

    if (parseInt(parentColl?.collection.id) === parseInt(share_collId)) return true;

    if (parentColl?.collection?.id) {
      const parentOfColl = await strapi.db.query("api::collection.collection").findOne({
        where: {
          id: parentColl.collection.id
        },
        populate: {
          collection: {
            select: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
          }
        }
      })
      const res = this.checkParentOfParentColl(parentOfColl, share_collId);
      return res;
    }
    return false;
  },

  async deleteAllCollections(ctx) {
    try {
      const { user } = ctx.state;
      const jwt = getService('jwt').issue({ id: user.id });
      // const unfiltered = await strapi.db.query("api::collection.collection").findOne({
      //   where: { name: "Unfiltered", author: user.id },
      //   populate: {
      //     gems: true
      //   }
      // })

      const collection = await strapi.entityService.findMany("api::collection.collection", {
        filters: {
          author: user.id,
          id: { $in: [user.bio_contact_collection, user.bio_collection, user.unfiltered_collection] }
        },
        populate: {
          gems: true
        }
      })

      // const gems = unfiltered.gems;
      let gems = [];
      collection?.forEach((c) => gems?.push(c?.gems));
      gems = gems.flat(Infinity);
      gems.forEach(async (g) => {
        await strapi.entityService.delete("api::gem.gem", g.id)
      })

      // const collections = await strapi.db.query("api::collection.collection").findMany({
      //   where: { author: user.id },
      //   populate: {
      //     gems: true
      //   }
      // })

      // const coll = collections.filter((c) => c.name !== 'Unfiltered');
      const coll = await strapi.entityService.findMany("api::collection.collection", {
        filters: {
          author: user.id,
          id: { $notIn: [user.bio_contact_collection, user.bio_collection, user.unfiltered_collection] }
        },
      })
      coll.forEach(async (c) => {
        await strapi.entityService.delete("api::collection.collection", c.id)
      })

      /* logs data for update hightlighed text  */
      // await strapi.entityService.create("api::activity-log.activity-log", {
      //   data: {
      //     action: "Deleted",
      //     module: "Collection",
      //     actionType: "Collection",
      //     count: coll.length,
      //     author: user.id,
      //     publishedAt: new Date().toISOString(),
      //   },
      // });
      const object = {
        action: "Deleted All",
        module: "Collection",
        actionType: "Collection",
        count: coll.length,
        author: { id: user.id, username: user.username }
      }
      createActivity(object, jwt);
      // await axios.post(
      //   `${process.env.MONGODB_URL}/api/activitylogs`,
      //   {
      //     action: "Deleted",
      //     module: "Collection",
      //     actionType: "Collection",
      //     count: coll.length,
      //     author: { id: user.id, username: user.username }
      //   },
      //   {
      //     headers: {
      //       Authorization: `Bearer ${jwt}`
      //     },
      //   }
      // )

      ctx.send({
        status: 200,
        message: "All collections successfully deleted"
      })
    } catch (error) {
      ctx.send({
        status: 400,
        message: error.message,
      })
    }
  },

  async fetchCollectionWithEmbed(ctx) {
    try {
      const { collectionId } = ctx.params
      const { isEmbed, page, perPage } = ctx.request.query;
      const pages = page ? page : '';
      const perPages = perPage ? perPage : 10;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);

      if (isEmbed === "true") {
        const collections = await strapi.entityService.findOne("api::collection.collection", collectionId, {
          fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"],
          populate: {
            collection: {
              fields: ["id", "name", "slug", "comments_count", "shares_count", "likes_count", "save_count"]
            },
            gems: {
              fields: ["id", "url", "title", "slug", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "custom_fields_obj", "entityObj", "createdAt", "updatedAt", "broken_link", "expander", "platform", "comments_count", "shares_count", "likes_count", "save_count", "socialfeed_obj", "isPending", "isApproved"],
              populate: {
                tags: {
                  fields: ["id", "tag", "slug"]
                },
                author: {
                  fields: ["id", "username"]
                }
              },
              start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
              limit: perPagesNum
            }
          }
        })

        const totalCount = collections.gems.length;
        const totalPages = Math.ceil(parseInt(collections.gems.length) / perPagesNum);

        if (pageNum > totalPages) {
          collections.gems = [];
        } else {
          const start = (pageNum - 1) * perPagesNum;
          const end = start + perPagesNum;
          const paginatedGems = collections.gems.slice(start, end);
          collections.gems = paginatedGems;
        }
        ctx.send({ totalBookmark: totalCount, collection: collections });
      } else {
        ctx.send({ status: 400, message: "Not able to see collection data" });
      }
    } catch (error) {
      ctx.send({
        status: 400,
        message: error
      })
    }
  },

  async find(ctx) {
    try {
      const { userId, page, perPage } = ctx.request.query;
      const pages = page ? page : 0;
      const perPages = perPage ? perPage : 10;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);
      let payload = {};

      let [allCollection, totalCount] = await Promise.all([
        strapi.entityService.findMany("api::collection.collection", {
          filters: { author: parseInt(userId) },
          fields: ["id", "name", "slug", "follower_users", "comments_count", "shares_count", "likes_count", "save_count"],
          populate: {
            author: {
              fields: ["id"]
            }
          },
          start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
          limit: perPagesNum
        }),
        strapi.entityService.count("api::collection.collection", {
          filters: { author: parseInt(userId) },
        })
      ])

      const totalPages = Math.ceil(parseInt(totalCount) / perPagesNum);

      payload.paginate = {
        pageNo: pages,
        limit: perPages,
        noOfpages: totalPages
      };

      if (allCollection.length > 0) {
        payload.collections = allCollection;
      }

      ctx.send({
        status: 200,
        collectionCount: totalCount,
        collections: payload,
      });
    } catch (error) {
      ctx.send({
        status: 400,
        message: error
      })
    }
  },

  async getAllPublicCollections(ctx) {
    try {
      const { page, perPage } = ctx.request.query;
      const pages = page ? parseInt(page) : 0;
      const perPages = perPage ? parseInt(perPage) : 10;

      const collections = await strapi.entityService.findMany("api::collection.collection", {
        filters: { sharable_links: { $notNull: true }, showSeo: true },
        fields: ["id", "name", "slug", "createdAt", "updatedAt", "sharable_links", "showSeo"],
        populate: {
          author: {
            fields: ["id", "username"]
          }
        },
        start: pages === 0 ? 0 : (pages - 1) * perPages,
        limit: perPages
      })

      return ctx.send({ status: 200, data: collections })
    }
    catch (e) {
      return ctx.send({ status: 400, message: e })
    }
  },

  async checkExistingCollection(ctx) {
    try {
      const { name } = ctx.request.query;
      const { id } = ctx.state.user;

      const collection = await strapi.db.query("api::collection.collection").findOne({
        where: { name, author: id },
        select: ["id", "name", "slug"],
        populate: {
          author: {
            select: ["id", "username"],

          }
        }
      })

      if (collection) {
        return ctx.send({ status: 200, data: collection })
      }
      return ctx.send({ status: 200, message: "Collection is not exist" })

    } catch (error) {
      ctx.send({ status: 400, message: error })
    }
  },

  async copyCollection(ctx) {
    try {
      const { user } = ctx.state;
      const { collectionId } = ctx.params;

      const copyCollection = await strapi.service("api::collection.collection-copy").createCollectionCopy(collectionId, user);
      if (copyCollection.status === 400) return ctx.tooManyRequests(copyCollection.message)

      ctx.send({ status: copyCollection.status, message: copyCollection.message, collectionId: copyCollection.collectionId });

    } catch (error) {
      ctx.send({ status: 400, message: error.message });
    }
  },

  // async subCollectionData(ctx) {
  //   try {
  //     const { id } = ctx.state.user;
  //     const { collectionId } = ctx.params;

  //     // const coll = await strapi.entityService.findOne('api::collection.collection', collectionId, {
  //     //   populate: {
  //     //     author: {
  //     //       fields: ["id"]
  //     //     }
  //     //   }
  //     // });
  //     const collection = await strapi.entityService.findMany('api::collection.collection', {
  //       filters: {
  //         author: id
  //       },
  //       sort: { id: 'asc' },
  //       fields: ["id", "name", "avatar", "iconLink", "comments_count", "shares_count", "likes_count", "save_count", "is_sub_collection", "collectionPassword", "background", "wallpaper", "description", "showSidebar"],
  //       populate: {
  //         parent_collection: {
  //           fields: ["id", "name", "comments_count", "shares_count", "likes_count", "save_count"],
  //         },
  //         gems: {
  //           sort: { id: 'asc' },
  //           fields: ["id", "url", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending"],
  //           populate: {
  //             author: {
  //               fields: ["id", "username", "firstname"]
  //             }
  //           },
  //         },
  //         tags: {
  //           fields: ["id", "tag"]
  //         },
  //         author: {
  //           fields: ["id", "username", "firstname", "profilePhoto"]
  //         },
  //       }
  //     });

  //     let parentColl = collection.filter((d) => {
  //       return d.id === parseInt(collectionId)
  //     })
  //     const count = parentColl[0]?.gems?.length;
  //     // if (isPagination === 'true') {
  //     //   const pages = page ? page : '';
  //     //   const perPages = perPage ? perPage : 20;
  //     //   const pageNum = parseInt(pages);
  //     //   const perPagesNum = parseInt(perPages);
  //     //   const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
  //     //   const limit = start + perPagesNum;


  //     //   parentColl[0].gems = parentColl[0]?.gems?.slice(start, limit);
  //     // }

  //     let finalCollection = prepareSubCollectionData(parentColl[0], collection)

  //     // const follower = await strapi.db.query("api::follower.follower").findOne({
  //     //   where: { userId: coll.author.id.toString() },
  //     //   populate: {
  //     //     follower_users: {
  //     //       select: ['id']
  //     //     }
  //     //   }
  //     // })

  //     // finalCollection[0].author.follower = follower?.follower_users
  //     // finalCollection[0].author.following = follower?.following_users


  //     ctx.send({ status: 200, msg: 'Get public collection shared successfully', totalCount: count, data: finalCollection })
  //   } catch (error) {
  //     ctx.send({ status: 400, message: error.message });
  //   }
  // }

  async subCollectionData(ctx) {
    try {
      const { collectionId } = ctx.params;
      const { page, perPage } = ctx.request.query;
      const pages = page ? page : 0;
      const perPages = perPage ? perPage : 9;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);
      const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
      const limit = start + perPagesNum;

      let collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
        fields: ["id", "name", "order_of_sub_collections"],
        populate: {
          parent_collection: {
            sort: { id: 'asc' },
            fields: ["id", "name", "slug", "avatar", "iconLink", "comments_count", "shares_count", "likes_count", "save_count", "is_sub_collection", "collectionPassword", "background", "wallpaper", "description", "showSidebar", "viewSubCollection", "shortDescription", "publicSubCollection", "order_of_sub_collections"],
            tags: {
              fields: ["id", "tag", "slug"]
            },
            author: {
              fields: ["id", "username", "firstname", "profilePhoto"]
            },
            populate: {
              gems: {
                fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "entityObj", "expander", "platform", "isRead", "comments_count", "shares_count", "likes_count", "save_count", "highlightId", "isApproved", "isPending"],
                populate: {
                  author: {
                    fields: ["id", "username", "firstname", "profilePhoto"]
                  },
                }
              },
              author: {
                fields: ["id", "username", "firstname", "profilePhoto"]
              },
              tags: {
                fields: ["id", "tag", "slug"]
              },
            }
          }
        }
      })
      const count = collection.parent_collection.length

      const subCollectionOrder =  collection?.order_of_sub_collections || [];
      const uniqueSubCollectionOrder = [...new Set(subCollectionOrder)]

      const pSubCollectionId = []
      collection.parent_collection.forEach((s) => {
          pSubCollectionId.push(s.id)
      })

      const finalSubCollectionArr = await getCollectionOrder(collection?.id, uniqueSubCollectionOrder, pSubCollectionId, collection?.parent_collection, true)

      let finalCollection = []
      if (finalSubCollectionArr.length > 0) {
        collection.parent_collection = finalSubCollectionArr?.slice(start, limit);
        collection.parent_collection.filter((data) => {
          finalCollection.push(prepareSubCollectionData(data))
        })
      }

      return { count, finalCollection, orderOfSubCollections: collection?.order_of_sub_collections }
    } catch (error) {
      ctx.send({ status: 400, message: error.message });
    }
  },

  async getCollectionAuth(ctx) {
    try {
      const { id, bio_contact_collection, bio_collection } = ctx.state.user;
      const { page, perPage } = ctx.request.query;
      const pages = page ? page : 0;
      const perPages = perPage ? perPage : 10;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);

      const [collections, collectionCount] = await Promise.all([
        strapi.entityService.findMany("api::collection.collection", {
          filters: { 
            author: id, collection: null,
            id: { $notIn: [bio_contact_collection, bio_collection] }
          },
          fields: ["id", "name", "slug", "background", "shortDescription", "avatar"],
          populate: {
            author: {
              fields: ["id", "username"]
            },
            tags: {
              fields: ["id", "tag", "slug"]
            },
            gems: {
              fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "custom_fields_obj", "entityObj", "createdAt", "updatedAt", "broken_link", "expander", "platform", "comments_count", "shares_count", "likes_count", "save_count", "socialfeed_obj", "isPending", "isApproved"],
              sort: { id: "asc" },
              populate: {
                author: {
                  fields: ["id", "username"]
                },
              }
            }
          },
          start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
          limit: perPagesNum
        }),
        strapi.entityService.count("api::collection.collection", {
          filters: { 
            author: id, collection: null,
            id: { $notIn: [bio_contact_collection, bio_collection] }
          },
        })
      ])

      const colletionData = await collectionData(collections)
      ctx.send({ status: 200, collectionCount, data: colletionData });

    } catch (error) {
      ctx.send({ status: 400, message: error.message });
    }
  },

  async getCollectionPublic(ctx) {
    try {
      const { page, perPage, userId } = ctx.request.query;
      const pages = page ? page : 0;
      const perPages = perPage ? perPage : 10;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);

      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        fields: ['bio_contact_collection', 'bio_collection']
      })

      const [collections, collectionCount] = await Promise.all([
        strapi.entityService.findMany("api::collection.collection", {
          filters: { 
            author: userId, collection: null, sharable_links: { $notNull: true },
            id: { $notIn: [user.bio_contact_collection, user.bio_collection] }
          },
          fields: ["id", "name", "slug", "background", "shortDescription", "avatar"],
          populate: {
            author: {
              fields: ["id", "username"]
            },
            tags: {
              fields: ["id", "tag", "slug"]
            },
            gems: {
              fields: ["id", "url", "title", "slug", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "custom_fields_obj", "entityObj", "createdAt", "updatedAt", "broken_link", "expander", "platform", "comments_count", "shares_count", "likes_count", "save_count", "socialfeed_obj", "isPending", "isApproved"],
              sort: { id: "asc" },
              populate: {
                author: {
                  fields: ["id", "username"]
                },
              }
            }
          },
          start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
          limit: perPagesNum
        }),
        strapi.entityService.count("api::collection.collection", {
          filters: { 
            author: userId, collection: null, sharable_links: { $notNull: true }, 
            id: { $notIn: [user.bio_contact_collection, user.bio_collection] }
          },
        })
      ])
      const colletionData = await collectionData(collections)
      ctx.send({ status: 200, collectionCount, data: colletionData });

    } catch (error) {
      ctx.send({ status: 400, message: error.message });
    }
  },

  async categoryGems(ctx) {
    try {
      const { type, page, perPage } = ctx.request.query;
      const { collectionId } = ctx.params;
      const pages = page ? page : 1;
      const perPages = perPage ? perPage : 10;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);

      let filters = {
        collection_gems: Number(collectionId)
      }

      if (type !== "tag") {
        filters.media_type = type
      } else {
        filters.tags = null
      }
      const [gems, collection] = await Promise.all([
        strapi.entityService.findMany("api::gem.gem", {
          populate: {
            tags: true,
            collection_gems: true,
            author: { fields: ["id"] }
          },
          filters,
          start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
          limit: perPagesNum
        }),
        // strapi.entityService.count("api::gem.gem", {
        //   filters
        // }),
        strapi.entityService.findOne("api::collection.collection", parseInt(collectionId), {
          fields: ["id", "name"],
          populate: {
            author: {
              fields: ["id", "username"]
            }
          }
        })
      ])

      let approvedGems = gems?.filter((data) => {
        if ((data?.author?.id === collection?.author?.id) || (data?.isApproved === true && data?.isPending === false)) {
            return data
        }
      })
      const totalCount = approvedGems?.length

      ctx.send({ status: 200, totalCount, data: approvedGems });
    } catch (error) {
      ctx.send({ status: 400, message: error.message });
    }
  },

  async tagGems(ctx) {
    try {
      const { collectionId } = ctx.request.params;
      const { page, perPage, tagId } = ctx.request.query;
      const pages = page ? page : 1;
      const perPages = perPage ? perPage : 10;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);

      const tags = await strapi.entityService.findOne("api::tag.tag", tagId, {
        fields: ["id", "tag", "slug", "tagColor", "is_sub_tag", "wallpaper", "description", "avatar", "background", "media_type", "invitedUsersViaMail", "invitedUsersViaLink", "isPublicLink", "tagPassword", "sharable_links", "seo"],
        populate: {
          gems: {
            fields: ["id", "url", "slug", "title", "remarks", "metaData", "media", "description", "media_type", "S3_link", "is_favourite", "isTabCollection", "createdAt", "post_type", "socialfeed_obj", "socialfeedAt", "expander", "platform", "isRead", "fileType", "isPending", "isApproved"],
            populate: {
              author: {
                fields: ["id", "username"]
              },
              collection_gems: {
                fields: ["id", "name", "slug"]
              }
            }
          },
          users: {
            fields: ["id", "username"]
          }
        }
      })
      delete tags?.originalPassword

      let gemsData = tags?.gems?.filter((g) => {
        return (g?.collection_gems?.id === parseInt(collectionId))
      })

      const totalCount = gemsData?.length;
      const totalPages = Math.ceil(parseInt(gemsData?.length) / perPagesNum);

      if (pageNum > totalPages) {
        tags.gems = [];
      } else {
        const start = (pageNum - 1) * perPagesNum;
        const end = start + perPagesNum;
        const paginatedGems = gemsData.slice(start, end);
        tags.gems = paginatedGems;
      }

      const finalTag = { ...tags, author: (tags.users.length > 0) ? tags.users[0] : null }
      delete finalTag.users
      ctx.send({ status: 200, totalCount, data: finalTag })
    } catch (error) {
      ctx.send({ status: 400, message: error.message });
    }
  },

  async deleteEmptyColletion(ctx) {
    try {
      const { id, bio_contact_collection, bio_collection, unfiltered_collection } = ctx.state.user;

      const collection = await strapi.entityService.findMany("api::collection.collection", {
        filters: {
          author: id, gems: null, parent_collection: null,
          id: { $notIn: [bio_contact_collection, bio_collection, unfiltered_collection] }
        },
      })

      const res = await deleteEmptyCollectionsService(id, collection, bio_contact_collection, bio_collection, unfiltered_collection)
      if (res !== "success") { return ctx.send({ status: 400, message: res }); }

      // const collectionIds = []
      // collection?.map((c) => collectionIds.push(c.id))

      // await strapi.db.query("api::collection.collection").deleteMany({
      //   where: { id: collectionIds }
      // })

      ctx.send({ status: 200, message: "Empty collections deleted successfully" });

    } catch (error) {
      ctx.send({ status: 400, message: error.message });
    }
  },

  async getTabGemCollection(ctx) {
    try {
      const { id } = ctx.state.user;
      const { page, perPage } = ctx.request.query;

      const collections = await getCollections(page, perPage, id, true);

      ctx.send({ status: 200, count: collections.count, data: collections.collections });
    } catch (error) {
      ctx.send({ status: 400, message: error.message });
    }
  }
}));