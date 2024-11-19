'use strict';

const { convertRestQueryParams } = require('strapi-utils/lib');

/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { updateGemiScoreRecs, updatePlanService, areCollectionIdSame, getFullScreenshot, createActivity, getExtAndColors } = require("../../../../utils");
const { getService } = require('../../../extensions/users-permissions/utils');
const { createBulkElasticData, domaindata } = require('../services/after-operations');
const mql = require('@microlink/mql');
const { default: axios } = require('axios');
const { iframelyData, microlinkData, apifyData, getGems, gemOrderAtDeleteMany } = require('../services/gem-service');
const { v4: uuidv4 } = require('uuid');
const { Configuration, OpenAIApi } = require("openai");
const { default: slugify } = require('slugify');

const microlinkRes = (url) => {
  return new Promise((resolve, reject) => {
    axios.get(`https://pro.microlink.io?url=${url}`, {
      headers: {
        'x-api-key': process.env.MICROLINK_API_KEY,
      }
    }).then((res) => {
      resolve(res.data);
    }).catch((err) => {
      resolve(null)
    })
  });
};

const getDescPayload = (title, mediaType, logo, img, apify, userId, bioCollId, url) => {
  const score = apify?.data?.profileData?.engagementScore || ""
  const t = apify ? `Engagement Score : ${score}` : title
  const res = {
      "title": t,
      "description": title,
      "media_type": mediaType,
      "author": userId,
      "url": url,
      "metaData": {
          "type": mediaType,
          "title": "",
          "icon": {icon: logo, type: "Image"},
          "defaultIcon": logo,
          "url": "",
          "covers": [
              logo
          ],
          "docImages": [
            logo
          ],
          "defaultThumbnail": logo,
      },
      "collection_gems": bioCollId,
      "remarks": "",
      "tags": [],
      "is_favourite": false,
      "expander": [],
      "price": "",
      "isRead": false,
      "media": {
          "covers": [
              ""
          ],
          "shape": "square",
          "x": 4,
          "y": null,
          "notes": "",
          "color": {
              "id": 4,
              "border": "border-l-yellow-200",
              "bg": "#FFFAB3",
              "text": "text-yellow-200",
              "colorCode": "#FFFAB3",
              "className": "yellow-hl"
          },
          "text": title,
          "link": "",
          "collections": bioCollId,
          "tags": [],
          "type": mediaType,
          "_id": uuidv4(),
          "styleClassName": ""
      },
      "collections": bioCollId,
      "image": img,
      publishedAt: new Date().toISOString()

  }
  return res
}

module.exports = createCoreController('api::gem.gem', ({ strapi }) => ({

  async uploadScreenshot(ctx) {
    try {
      if (!ctx.request.files) {
        return ctx.send({ msg: "No file exists" }, 400);
      }
      const { files } = ctx.request.files;

      const filesSelect =
        files?.length && files.length > 0 ? "mutiple" : "single";

      if (filesSelect === "single" && (!files?.name || !files?.size)) {
        return ctx.send({ msg: "No file exists" }, 400);
      }

      const covers = await Promise.all(strapi.service("api::gem.gem").updateBookmarkMedia(files));
      ctx.send(covers);
    } catch (error) {
      console.log("error occured :", error);
    }
  },

  async updateCoverImage(ctx) {
    const { gemId } = ctx.params

    try {
      if (!ctx.request.files) {
        return ctx.send({ msg: "No file exists" }, 400);
      }
      const { files } = ctx.request.files;

      const filesSelect =
        files?.length && files.length > 0 ? "mutiple" : "single";

      if (filesSelect === "single" && (!files?.name || !files?.size)) {
        return ctx.send({ msg: "No file exists" }, 400);
      }

      const covers = await Promise.all(strapi.service("api::gem.gem").updateBookmarkMedia(files));
      const gem = await strapi.entityService.findOne("api::gem.gem", parseInt(gemId));
      let gObj = {
        media: {
          ...gem.media,
          covers: gem.media?.covers ? [...gem.media.covers, ...covers] : covers
        }
      }

      if (gem && gem.metaData) {
        gObj = {
          ...gObj,
          metaData: {
            ...gem.metaData,
            covers: gem.metaData.covers ? [...covers, ...gem.metaData.covers] : covers
          }
        }
      }
      const uGem = await strapi.entityService.update("api::gem.gem", parseInt(gemId), {
        data: gObj
      })

      ctx.send(uGem);
    } catch (error) {
      console.log("error occured :", error);
    }
  },

  async moveGems(ctx) {
    const { gemId, collectionId } = ctx.params
    const { user } = ctx.state
    const jwt = getService('jwt').issue({ id: user.id });

    const gem = await strapi.entityService.update("api::gem.gem", gemId, {
      data: {
        collection_gems: collectionId,
        isMove: true
      },
      populate: {
        collection_gems: {
          fields: ["id", "name", "slug"]
        }
      }
    })

    // /* logs data for update hightlighed text  */
    // await strapi.entityService.create("api::activity-log.activity-log", {
    //   data: {
    //     action: "Moved",
    //     module: "Gem",
    //     actionType: gem.media_type,
    //     author: user.id,
    //     gems: gem.id,
    //     collection: collectionId,
    //     count: 1,
    //     publishedAt: new Date().toISOString(),
    //   },
    // });
    const object = {
      action: "Moved",
      module: "Gem",
      actionType: gem.media_type,
      count: 1,
      collection_info: { id: gem.collection_gems.id, name: gem.collection_gems.name, slug: gem.collection_gems.slug },
      author: { id: user.id, username: user.username },
      gems_info: [{ id: gem.id, name: gem.title }]
    }
    createActivity(object, jwt);

    const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
      populate: {
        gems: {
          fields: ["id", "slug"]
        }
      }
    })

    // Adding gem in the desitination
    await strapi.entityService.update("api::collection.collection", collectionId, {
      data: {
        gems: [...collection.gems, gemId]
      }
    })

    ctx.send(gem)
  },

  async importGem(ctx) {
    const { data } = ctx.request.body
    const { user } = ctx.state

    if (data && user) {
      try {
        const promiseArr = data.map(a => {
          if (a.url.includes("amazon")) {
            a.media_type = a.media_type === "Link" ? "Product" : a.media_type
          }
          if (a.url.includes("youtube")) {
            a.media_type = a.media_type === "Link" ? "Video" : a.media_type

          }
          return this.addGemWithPromise(a, user.id)
        });
        const response = await Promise.all(promiseArr);
        createBulkElasticData(user.id, response, user.username)

        // const collId = [];
        // response.map((r) => collId.push(r.collection_gems.id))

        // let sameId;
        // if (collId.length > 0) {
        //   sameId = areCollectionIdSame(collId);
        // }

        // const postId = [];
        // response.map((post) => postId.push(post.id))

        // /* logs data for update hightlighed text  */
        // await strapi.entityService.create("api::activity-log.activity-log", {
        //   data: {
        //     action: "Imported",
        //     module: "Gem",
        //     actionType: "Link",
        //     author: user.id,
        //     gems: postId,
        //     collection: sameId ? collId[0] : [],
        //     count: response.length,
        //     publishedAt: new Date().toISOString(),
        //   },
        // });
        ctx.send(response)
      } catch (error) {
        ctx.send(error)
      }
    }
    else {
      ctx.send("Data or user invalid")
    }
  },

  addGemWithPromise(o, author) {
    return new Promise((resolve, reject) => {
      if (o.icon && o.icon.startsWith("data:")) {
        const urlParse = parse(o.link)
        const parseArr = urlParse && urlParse.domain ? urlParse.domain.split(".") : []
        const filename = parseArr.length !== 0 ? parseArr[0] : gem.title.slice(0, 3)
        const storeKey = `common/images/bookmark_images/bookmark-${filename}-${moment().toDate().getTime()}.jpg`
                
        strapi.service("api::gem.gem")
                .uploadImageFromBase64(o.icon, storeKey)

        gem = {
          ...gem, 
          icon: `${process.env.AWS_BASE_URL}/${storeKey}`
        }
      }
      strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...o,
            author: author,
            title: o.title,
            media_type: o.media_type || "Link",
            url: o.url,
            tags: o.tags.map((t) => { return t.id }),
            collection_gems: o.collection_gems,
            isImported: true,
            publishedAt: new Date().toISOString(),
          },
          populate: {
            collection_gems: {
              fields: ["id", "name", "slug"]
            }
          }
        }).then((res) => {
          // getFullScreenshot(res);
          axios({
            method: "get",
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'identity'
            },
            url: `https://iframe.ly/api/iframely?url=${encodeURIComponent(res.url)}/&api_key=${process.env.IFRAMELY_API_KEY}`
          }).then((axiosRes) => {
              const { data }      = axiosRes
              let imgSrc          = `${process.env.AWS_SCREENSHOT_API_GATEWAY}/${encodeURIComponent(res.url)}?g=${res.id}&u=${author}`
              if (data && data.links?.thumbnail && data.links?.thumbnail?.length !== 0) {
                  const { thumbnail } = data.links
                  imgSrc = thumbnail[0]?.href
              }
              strapi.entityService.update("api::gem.gem", res.id, {
                  data: {
                      metaData: {
                          ...res.metaData,
                          defaultThumbnail: imgSrc,
                          docImages: [ imgSrc, ...res.metaData.docImages ],
                          covers: [ imgSrc, ...res.metaData.covers ]
                      }
                  }
              })
          })
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
            collection_gems: res.collection_gems,
            tags: o.tags,
            isTabCollection: res.isTabCollection
          })
        }).catch((err) => {
          console.log(err)
        })
    })
  },

  async createGem(data, author) {
    const gem = await strapi
      .service("api::gem.gem")
      .create({
        data: {
          ...data,
          author: author,
          name: data.title,
          media_type: "Link",
          metaData: {
            ...data,
          },
          publishedAt: new Date().toISOString(),
        }
      })
    // getFullScreenshot(gem);
    return gem;
  },

  updateGem: async (ctx, next) => {
    try {
      const { gemId } = ctx.params
      const Body = ctx.request.body
      const data = await strapi.service('api::gem.gem').updateGem(gemId, Body)

      ctx.send(data)
    } catch (error) {
      console.log("error", error);
    }
  },

  getAllHighlights: async (ctx) => {
    const { user } = ctx.state
    const filter = convertRestQueryParams(ctx.request.query);
    const queryParamArr = filter.where
    if (queryParamArr.length === 0) {
      ctx.send("URL not passed.")
      return
    }

    if (!user) {
      ctx.send("You are not authorized to perform this action.")
      return
    }

    let url = queryParamArr[0].value;
    if (url.endsWith("/")) url = url.slice(0, -1);

    const gems = await strapi.entityService.findMany('api::gem.gem', {
      filters: {
        url,
        author: user.id,
        media_type: { $in: ["Highlight", "Code", "Image", "Ai Prompt", "Text Expander", "Note", "Screenshot", "Quote"] }
      },
      fields: ["id", "media", "slug", "title", "description", "S3_link", "metaData", "is_favourite", "remarks", "media_type", "url", "text", "expander", "isPublicPrompt"],
      populate: {
        tags: {
          fields: ["id", "tag", "slug"]
        },
        collection_gems: {
          fields: ["id", "name", "slug"]
        }
      },
    });

    ctx.send(gems);
  },

  async create(ctx) {
    const userId = ctx.state?.user?.id;
    let { data } = ctx.request.body;
    let bodydata = { ...data };
    const tagids = [];

    // checking gem is exist or not
    const isExist = await strapi.db.query('api::gem.gem').findOne({
      where: { author: userId, url: data.url, collection_gems: data.collection_gems }
    })
    if (isExist) {
      return ctx.send({ status: 400, msg: 'Gem already exist' })
    }

    /* Checking plan services is exist or not ? */
    let userPlan
    if(userId) {
      userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
        where: {
          author: userId
        }
      })
    }

    // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')

    // if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.gem_used) >= parseInt(configLimit[0].gem_limit)) {
    //   return ctx.send({ msg: 'Gem bookmarks limit is exceeded Please extend your service plan' })
    // }
    if (userPlan && userPlan?.plan === 'free' && parseInt(userPlan?.gem_used) >= parseInt(userPlan?.gem_limit)) {
      return ctx.send({ msg: 'Gem bookmarks limit is exceeded Please extend your service plan' })
    }

    //checking if tags are in string form
    if (data.tags && /^[a-zA-Z]/.test(data.tags)) {
      for (let i = 0; i < data.tags?.length; i++) {
        const existingTag = await strapi.db.query('api::tag.tag').findOne({
          where: {
            tag: data.tags[i],
            users: userId
          }
        })
        if (existingTag !== null) { tagids.push(existingTag.id) }
        else {
          const addTag = await strapi.db.query('api::tag.tag').create({
            data: {
              tag: data.tags[i],
              users: userId,
              publishedAt: new Date().toISOString()
            }
          })
          tagids.push(addTag.id);
        }

      }
      if (tagids.length > 0) {
        bodydata = {
          ...data,
          tags: tagids
        }
      }
    }

    if (!bodydata.media_type && bodydata.media_type !== "Testimonial" && bodydata.media_type !== "Profile") {
      switch (true) {
        case bodydata.url.includes("youtube"):
        case bodydata.url.includes("dailymotion"):
        case bodydata.url.includes("vimeo"):
          bodydata.media_type = "Video"
          break;

        case bodydata.url.includes("read.amazon"):
        case bodydata.url.includes("goodreads"):
        case bodydata.url.includes("books.google"):
          bodydata.media_type = "Book"
          break;

        case bodydata.url.includes("amazon"):
        case bodydata.url.includes("ebay"):
          bodydata.media_type = "Product"
          break;

        case bodydata.url.includes("imdb"):
          bodydata.media_type = "Movie"
          break;
      }
    }

    const createdgem = await strapi.db.query('api::gem.gem').create({
      data: {
        ...bodydata,
        publishedAt: new Date().toISOString()
      }
    })
    // getFullScreenshot(createdgem);

    if (userPlan) {
      await updatePlanService(userId, { gem_used: parseInt(userPlan.gem_used) + 1 });
    }

    return ctx.send({ data: createdgem })

  },

  async bulkEditGem(ctx) {
    const { user } = ctx.state
    const { bookmarks } = ctx.request.body;
    // const promiseArr = bookmarks.map(g => {
    //   return new Promise((resolve, reject) => {
    //     const newTags = [...g.tags]

    //     strapi.entityService.update('api::gem.gem', g.id, {
    //       data: {
    //         custom_fields_obj: g.custom_fields_obj,
    //         tags: newTags,
    //         is_favourite: g.is_favourite,
    //         collection_gems: parseInt(g.collection_gems),
    //         remarks: g.remarks,
    //         media: g.media,
    //         isBulkEdit: true
    //       }
    //     })
    //       .then((res) => {
    //         resolve(res)
    //       })
    //   })
    // });
    // let promiseArr = []
    for (const bookmark of bookmarks) {
      const newTags = [...bookmark?.tags]
      await strapi.entityService.update('api::gem.gem', bookmark?.id, {
        data: {
          custom_fields_obj: bookmark?.custom_fields_obj,
          tags: newTags,
          is_favourite: bookmark?.is_favourite,
          collection_gems: parseInt(bookmark?.collection_gems),
          remarks: bookmark?.remarks,
          media: bookmark?.media,
          isBulkEdit: true
        }
      })
      // promiseArr.push(updatedGem)
    }
    // await Promise.all(promiseArr);

    // /* logs data for update hightlighed text  */
    // await strapi.entityService.create("api::activity-log.activity-log", {
    //   data: {
    //     action: "Updated",
    //     module: "Gem",
    //     actionType: "Gems",
    //     author: user.id,
    //     count: response.length,
    //     publishedAt: new Date().toISOString(),
    //   },
    // });
    ctx.send("update successfully");
  },

  async identifyDuplicacyGems(ctx) {
    try {
      const user = ctx.state.user;
      const { page, perPage } = ctx.request.query;
      const pages = page ? page : '';
      const perPages = perPage ? perPage : 20;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);

      if (!user?.id) return ctx.send({ msg: 'Unauthorized access' }, 400);

      /* Fetching all gems list by userId */
      const gems = await strapi.db.query('api::gem.gem').findMany({
        where: {
          author: user.id
        },
        populate: {
          author: {
            select: ["id", "email", "username"]
          },
          collection_gems: {
            select: ["id", "name", "slug"]
          },
          tags: {
            select: ["id", "tag", "slug", "avatar"]
          }
        }
      });

      /* Using gems data to  Identify duplicacy on basis of gems url & media_type */
      let duplicateGems = [];
      let duplicateChecker = {};
      for (const gm of gems) {
        const { url, media_type } = gm;
        if (url && media_type) {
          if (duplicateChecker[url]) {
            const duplicateExist = duplicateChecker[url];
            duplicateChecker[url] = { ...duplicateExist, gem: [...duplicateExist.gem, gm] }
          } else {
            duplicateChecker[url] = {
              url: url,
              media_type: media_type,
              gem: [gm]
            }
          }
        }
      }
      /* Keep duplicate gems which is from different folder/sub-folder  */
      for (const dup in duplicateChecker) {
        if (duplicateChecker[dup] && duplicateChecker[dup]?.gem?.length > 1) {
          duplicateGems = [...duplicateGems, ...duplicateChecker[dup]?.gem];
        }
      }

      const start = pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum;
      const end = start + perPagesNum;
      const pageData = duplicateGems.slice(start, end);
      const gemCount = duplicateGems.length;
      const totalPages = Math.ceil(parseInt(duplicateGems.length) / perPagesNum);

      const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
        where: { author: user.id }
      })

      const configLinksExist = bookmarkConfig?.configLinksSetting
      delete bookmarkConfig?.configCollSetting
      delete bookmarkConfig?.configTagSetting
      delete bookmarkConfig?.configLinksSetting
      delete bookmarkConfig?.configFilterSetting

      ctx.send({ msg: 'Gems duplicate data', gemCount, data: pageData, bookmarkConfig: configLinksExist ? configLinksExist : bookmarkConfig });
    } catch (err) {
      console.log("error occrued: ", err);
      ctx.send({ msg: err }, 400)
    }
  },

  async identifyBrokenUrl(ctx) {
    try {
      const user = ctx.state.user;
      const { page, perPage } = ctx.request.query;
      const pages = page ? page : 0;
      const perPages = perPage ? perPage : 20;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);

      if (!user?.id) return ctx.send({ msg: 'Unauthorized access' }, 400);

      /* Fetching all gems list by userId */
      const [gems, gemsCount] = await Promise.all([
        strapi.entityService.findMany('api::gem.gem', {
          filters: {
            author: user.id,
            broken_link: true
          },
          populate: {
            author: {
              fields: ["id", "email", "username"]
            },
            collection_gems: {
              fields: ["id", "name", "slug"]
            },
            tags: {
              fields: ["id", "tag", "slug", "avatar"]
            }
          },
          start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
          limit: perPagesNum
        }),
        strapi.entityService.count("api::gem.gem", {
          filters: { author: user.id, broken_link: true }
        })
      ])

      gems.paginate = {
        pageNo: pages,
        limit: perPages,
        noOfpages: Math.ceil(parseInt(gemsCount) / perPagesNum)
      }

      const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
        where: { author: user.id }
      })
      const configLinksExist = bookmarkConfig?.configLinksSetting

      delete bookmarkConfig?.configCollSetting
      delete bookmarkConfig?.configTagSetting
      delete bookmarkConfig?.configLinksSetting
      delete bookmarkConfig?.configFilterSetting

      ctx.send({ msg: 'Broken links', data: gems, gemsCount, bookmarkConfig: configLinksExist ? configLinksExist : bookmarkConfig });
    } catch (err) {
      console.log("error occrued : ", err);
      ctx.send({ msg: err.message }, 400)
    }
  },

  async bulkDeleteGem(ctx) {
    try {
      const { gemId } = ctx.request.body;
      const gems = await strapi.db.query("api::gem.gem").findMany({
        where: { id: { $in: gemId } },
        select: ["id"],
        populate: {
          collection_gems: { select: ["id", "order_of_gems"] },
          tags: { select: ["id", "order_of_gems"] }
        }
      })
      gemOrderAtDeleteMany(gems)
      await strapi.db.query("api::gem.gem").deleteMany({
        where: { id: gemId },
      })

      // /* logs data for update hightlighed text  */
      // await strapi.entityService.create("api::activity-log.activity-log", {
      //   data: {
      //     action: "Deleted",
      //     module: "Gem",
      //     actionType: "Gems",
      //     author: user.id,
      //     count: gem.count,
      //     publishedAt: new Date().toISOString(),
      //   },
      // });

      ctx.send({
        status: 200,
        message: "Bookmarks is deleted"
      })
    } catch (error) {
      ctx.send({
        status: 400,
        message: error
      })
    }
  },

  async deleteAllGem(ctx) {
    try {
      const { user } = ctx.state;
      const gems = await strapi.db.query("api::gem.gem").findMany({
        where: { author: user.id }
      })

      gems.forEach(async (g) => {
        await strapi.entityService.delete("api::gem.gem", g.id)
      })

      // /* logs data for update hightlighed text  */
      // await strapi.entityService.create("api::activity-log.activity-log", {
      //   data: {
      //     action: "DeleteAll",
      //     module: "Gem",
      //     actionType: "Gems",
      //     author: user.id,
      //     count: gems.length,
      //     publishedAt: new Date().toISOString(),
      //   },
      // });

      ctx.send({
        status: 200,
        message: "All gems successfully deleted"
      })
    } catch (error) {
      ctx.send({
        status: 400,
        message: error
      })
    }
  },

  async getBookmarks(ctx) {
    try {
      const { user } = ctx.state;
      const { type, is_favourite, tags, page, perPage, url, isTabGems } = ctx.request.query;

      if (url) {
        const existingGem = await strapi.db.query("api::gem.gem").findOne({
          where: { url: url, author: user.id }
        })

        const userData = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
          fields: ["id", "username", "preferences"]
        }) 

        let blockedSite = false
        const siteIdx = userData?.preferences?.blocked_sites ? userData?.preferences?.blocked_sites?.findIndex((s) => new URL(url).origin.includes(s?.domain)) : -1
        if (siteIdx !== -1) blockedSite = true

        return ctx.send({
          status: 200,
          message: existingGem ? true : false,
          gemId: existingGem?.id,
          blockedSite
        })
      }

      const pages = page ? page : 0;
      const perPages = perPage ? perPage : 20;
      const pageNum = parseInt(pages);
      const perPagesNum = parseInt(perPages);

      if (!is_favourite) {
        let filters = {
          author: user.id,
          collection_gems: { $not: null }
        };

        if (type) {
          filters.media_type = type
        };
        if (tags) filters.tags = null;
        if (isTabGems === "true") filters.isTabCollection = true;

        const [gems, totalCount] = await Promise.all([
          strapi.entityService.findMany("api::gem.gem", {
            populate: { tags: { fields: ["id", "tag", "slug", "avatar"]}, collection_gems: isTabGems ? { fields: ["id", "name", "slug"] } : true, author: { fields: ["id", "username"] } },
            filters,
            start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
            limit: perPagesNum
          }),
          strapi.entityService.count("api::gem.gem", { filters })
        ]);
        gems.paginate = {
          pageNo: pages,
          limit: perPages,
          noOfpages: Math.ceil(parseInt(gems.length) / perPagesNum)
        }

       

        let configFilterExist;
        let bookmarkConfig;
        if (isTabGems !== "true") {
          bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
            where: { author: user.id }
          })
          configFilterExist = bookmarkConfig?.configFilterSetting
          delete bookmarkConfig?.configCollSetting
          delete bookmarkConfig?.configTagSetting
          delete bookmarkConfig?.configLinksSetting
          delete bookmarkConfig?.configFilterSetting
        }

        return ctx.send({
          status: 200,
          message: gems,
          totalCount,
          bookmarkConfig: configFilterExist ? configFilterExist : bookmarkConfig
        })
      }

      const filters = {
        $or: [
          {
            author: user.id,
            is_favourite: true
          },
          {
            like_users: user.id
          }
        ],
        collection_gems: { $not: null }
      }

      const [gems, totalCount] = await Promise.all([
        strapi.entityService.findMany("api::gem.gem", {
          populate: { tags: true, collection_gems: true, author: { fields: ["id", "username"] }, like_users: { fields: ["id", "username"] } },
          filters,
          start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
          limit: perPagesNum
        }),
        strapi.entityService.count("api::gem.gem", { filters })
      ]);
      gems.paginate = {
        pageNo: pages,
        limit: perPages,
        noOfpages: Math.ceil(parseInt(gems.length) / perPagesNum)
      }

      const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
        where: { author: user.id }
      })

      const configFilterExist = bookmarkConfig?.configFilterSetting

      delete bookmarkConfig?.configCollSetting
      delete bookmarkConfig?.configTagSetting
      delete bookmarkConfig?.configLinksSetting
      delete bookmarkConfig?.configFilterSetting

      return ctx.send({
        status: 200,
        message: gems,
        totalCount,
        bookmarkConfig: configFilterExist ? configFilterExist : bookmarkConfig
      })
    } catch (error) {
      ctx.send({
        status: 400,
        message: error.message,
      })
    }
  },

  async userGemCollection(ctx) {
    try {
      const { user } = ctx.state;
      const { url } = ctx.request.query;

      const collection = await strapi.entityService.findMany("api::gem.gem", {
        filters: { url, author: user.id },
        fields: ["id", "title", "slug"],
        populate: {
          collection_gems: {
            fields: ["id", "name", "slug"],
          }
        }
      })

      // const collectionList = [];
      // collection.map((c) => {
      //   collectionList.push(c.collection_gems)
      // })
      return ctx.send({ status: 200, message: collection })

    } catch (error) {
      return ctx.send({ status: 400, message: error })
    }
  },

  async getAllPublicGems(ctx) {
    try {
      const { page, perPage } = ctx.request.query;
      const pages = page ? parseInt(page) : 0;
      const perPages = perPage ? parseInt(perPage) : 10;
      const gems = await strapi.entityService.findMany("api::gem.gem", {
        filters: { 
          collection_gems: { 
            sharable_links: { $not: null },
            showSeo: true 
          } 
        },
        fields: ["id", "title", "slug", "createdAt", "updatedAt", "media", "media_type"],
        populate: {
          author: {
            fields: ["id", "username", "isInternalUser"]
          },
          collection_gems: {
            fields: ["id", "name", "sharable_links", "slug", "showSeo"]
          }
        },
        start: pages === 0 ? 0 : (pages - 1) * perPages,
        limit: perPages
      })

      return ctx.send({ status: 200, data: gems })
    }
    catch (e) {
      return ctx.send({ status: 400, message: e })
    }
  },

  async createGemFromAIPrompt(ctx) {
    try {
      const { user } = ctx.state;
      const { body,
        files } = ctx.request;
      const { id,
        unfiltered_collection } = user
      const {
        title,
        description,
        url,
        media_type,
        tags
      } = body;
      const gem = await strapi.entityService.create("api::gem.gem", {
        data: {
          title,
          description,
          url,
          media_type,
          collection_gems: unfiltered_collection,
          author: id
        }
      })

      return ctx.send({ status: 200, data: gem })
    }
    catch (e) {
      return ctx.send({ status: 400, message: e })
    }
  },

  async getHighlightsData(ctx) {
    try {
      const { gemId } = ctx.params;

      const highlight = await strapi.entityService.findOne('api::gem.gem', gemId, {
        fields: ["id", "title", "url", "slug"],
        populate: {
          author: {
            fields: ["id", "username"]
          }
        }
      })

      const gems = await strapi.entityService.findMany('api::gem.gem', {
        filters: {
          url: highlight.url,
          author: highlight.author.id,
          media_type: { $in: ["Highlight", "Code", "Image", "Ai Prompt", "Text Expander", "Note", "Screenshot", "Quote"] }
        },
        fields: ["id", "media", "title", "slug", "description", "S3_link", "metaData", "is_favourite", "remarks", "media_type", "url", "text", "expander"],
        populate: {
          tags: {
            fields: ["id", "tag", "slug"]
          },
          collection_gems: {
            fields: ["id", "name", "slug"]
          }
        },
      });

      ctx.send(gems);

    } catch (error) {
      return ctx.send({ status: 400, message: error })
    }
  },

  async getDetailsMicrolinkAndIframely(ctx) {
    try {
      const { url, socialSite, id, platform } = ctx.request.query;
      let iframely;
      let microlink;
      let apify;
      const domainmanagerData = await strapi.db.query("api::domain-manager.domain-manager").findOne({
        where: { url }
      })
      iframely = domainmanagerData?.iframely;
      microlink = domainmanagerData?.microlink;
      apify = domainmanagerData?.apify

      if((domainmanagerData && iframely && microlink) && (socialSite && apify)) {

        const object = {
          iframely,
          microlink,
          apify
        }

        return ctx.send({ status: 200, data: object })
      }

      // let iframely 
      if (!iframely) {
        const iframelyData = await axios({
          method: "get",
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'identity'
          },
          url: `https://iframe.ly/api/iframely?url=${url.charAt(url.length - 1) === "/" ? url : `${url}/`}&api_key=${process.env.IFRAMELY_API_KEY}&iframe=1&omit_script=1`
        })
        iframely = iframelyData.data
      }

      // microlink
      if (!microlink) {
        microlink = await microlinkRes(url)
      }

      const object = {
        iframely: iframely,
        // microlink: data
        microlink,
        apify
      }

      let isUpdate = false
      if(domainmanagerData) isUpdate = true

      let isUpadateApify = false
      if(socialSite && !apify) isUpadateApify = true

      domaindata(url, object, isUpdate, domainmanagerData?.id, socialSite, isUpadateApify, id, platform)

      return ctx.send({ status: 200, data: object })

    } catch (error) {
      return ctx.send({ status: 400, message: error })

    }
  },

  async addSocialurlsInBioCollection(ctx) {
    try {
      const { id, bio_collection } = ctx.state.user;
      const { baseUrls } = ctx.request.body;
      let iframely;
      let microlink;
      let apify;

      for (const url of baseUrls) {
        const domainmanagerData = await strapi.db.query("api::domain-manager.domain-manager").findOne({
          where: { url }
        })
        iframely = domainmanagerData?.iframely;
        microlink = domainmanagerData?.microlink;
        apify = domainmanagerData?.apify

        if(!iframely) {
          iframely = await iframelyData(url)
        }
        if(!microlink) {
          microlink = await microlinkData(url)
        }
        if(!apify && (url.includes('instagram') || url.includes('tiktok') || url.includes('youtube') || url.includes('twitter'))) {
          let platform
          if(url.includes('instagram')) platform = 'instagram'
          if(url.includes('tiktok')) platform = 'tiktok'
          if(url.includes('youtube')) platform = 'youtube'
          if(url.includes('twitter')) platform = 'twitter'

          apify = await apifyData(id, platform)          
        }

        const description = iframely?.meta?.description
        const logo = iframely?.links?.icon[0].href || ""
        const imgUrl = iframely?.links?.thumbnail[0]?.href || ""
        let img
        if (iframely?.status !== 404) {
          const imageData = await getExtAndColors(imgUrl)
          img = await strapi.service('api::ocr.ocrs').storeImageInS3(id, imageData.filename, imageData.header, imageData.data);
        }

        const payload = getDescPayload(description, "Link", logo, img, apify, id, bio_collection, url)

        const gem = await strapi.entityService.create("api::gem.gem", {
          data: payload
        })

        const object = {
          iframely,
          microlink,
          apify
        }
        let isUpdate = false
        if(domainmanagerData) isUpdate = true
        domaindata(url, object, isUpdate, domainmanagerData?.id)
      }
      return ctx.send({ status: 200, message: "Success" })
    } catch (error) {
      return ctx.send({ status: 400, message: error })
    }
  },

  async generateAiseo(ctx) {
    const { user }        = ctx.state;
    const { type, 
            gemId,
            collectionId,
            tagId }       = ctx.request.query;
    const res = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
      where: { promptType: 'SEO Prompts', seo_prompt_type: type }
    })

    const configuration = new Configuration({
      apiKey: process.env.PROD_OPENAI_API_KEY,
    });
    const openai        = new OpenAIApi(configuration);
    if (type === "user") {
      const name          = user?.firstname && user?.lastname ? `${user?.firstname} ${user?.lastname}` : user?.username;
      const completion    = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: res?.prompt?.replace("{name}", name) }],
      }, { responseType: "json" })
      let jsonObject = JSON.parse(completion?.data?.choices[0]?.message?.content);
      if (jsonObject) {
        jsonObject = {
          ...jsonObject,
          seo: {
            ...jsonObject?.seo,
            title: `${jsonObject?.seo?.title} | Curateit`,
            slug: slugify(jsonObject?.seo?.title?.slice(0, 65) || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}]/g }),
            canonical: `${process.env.REDIRECT_URI}${user?.username}`
          }
        }
        await strapi.query('plugin::users-permissions.user').update({
            where: { id: user.id },
            data: {
                seo: jsonObject
            }
        })
        return ctx.send(jsonObject)
      }
      return ctx.badRequest("Unable to generate SEO details for user")
    }
    else if (type === "gem" && gemId) {
      const gem         = await strapi.entityService.findOne("api::gem.gem", gemId)
      const completion  = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: res?.prompt?.replace("{gem_name}", gem?.title).replace("{gem_url}", gem?.url).replace("{gem_type}", gem?.media_type) }],
      })
      let jsonObject = JSON.parse(completion?.data?.choices[0]?.message?.content);
      const gemSlug  = gem?.slug || slugify(gem?.title.slice(0, 65) || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}]/g })
      if (jsonObject) {
        jsonObject = {
          ...jsonObject,
          seo: {
            ...jsonObject?.seo,
            title: `${jsonObject?.seo?.title} | Curateit`,
            slug: gemSlug,
            canonical: `${process.env.REDIRECT_URI}/u/${user?.username}/g/${gem?.id}/${gemSlug}`
          }
        }
        if (jsonObject?.opengraph && jsonObject?.opengraph?.image) {
          jsonObject = {
            ...jsonObject,
            opengraph: {
              ...jsonObject?.opengraph,
              image: gem?.metaData?.covers?.length > 0 ? gem?.metaData?.covers?.[0] : `${process.env.AWS_S3_STATIC_URL}/webapp/curateit-200x200.png`
            }
          }
        }
        const gemRes = await strapi.entityService.update('api::gem.gem', gem.id, {
          data: {
            seo: jsonObject,
            slug: gemSlug
          },
          populate: {
            collection_gems: { fields: ["id", "seo", "avatar"] }
          }
        })
        const collImg = gemRes?.collection_gems?.avatar?.icon;
        if (gemRes?.collection_gems?.seo && collImg !== gemRes?.collection_gems?.seo?.opengraph?.image) {
          let seo = gemRes?.collection_gems?.seo;
          if (seo?.opengraph && seo?.opengraph?.image) {
            seo = {
              ...seo,
              opengraph: {
                ...seo?.opengraph,
                image: gemRes?.collection_gems?.avatar?.type === "image" ? gemRes?.collection_gems?.avatar?.icon : gem?.metaData?.covers?.length > 0 ? gem?.metaData?.covers[0] : seo?.opengraph?.image
              }
            }
            await strapi.entityService.update('api::collection.collection', gemRes?.collection_gems?.id, {
              data: {
                  seo
              }
            })
          }
        }
        return ctx.send(jsonObject)
      }
      return ctx.badRequest("Unable to generate SEO details for gem")
    }
    else if (type === "collection" && collectionId) {
      const collection = await strapi.entityService.findOne("api::collection.collection", collectionId)
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: res?.prompt?.replace("{collection_name}", collection?.name) }],
      })
      let jsonObject = JSON.parse(completion?.data?.choices[0]?.message?.content)
      const collectionSlug = collection?.slug || slugify(collection?.name?.slice(0, 65) || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}]/g })
      if (jsonObject) {
        jsonObject = {
          ...jsonObject,
          seo: {
            ...jsonObject?.seo,
            title: `${jsonObject?.seo?.title} | Curateit`,
            slug: collectionSlug,
            canonical: `${process.env.REDIRECT_URI}/u/${user?.username}/c/${collection?.id}/${collectionSlug}`
          }
        }
        if (jsonObject?.opengraph && jsonObject?.opengraph?.image) {
          jsonObject = {
            ...jsonObject,
            opengraph: {
              ...jsonObject?.opengraph,
              image: `${process.env.AWS_S3_STATIC_URL}/webapp/curateit-logo.png`
            }
          }
        }
        await strapi.entityService.update("api::collection.collection", collection.id, {
          data: {
            seo: jsonObject,
            slug: collectionSlug
          }
        })
        return ctx.send(jsonObject)
      }
      return ctx.badRequest("Unable to generate SEO details for collection")
    }
    else if (type === "tag" && tagId) {
      const tag = await strapi.entityService.findOne("api::tag.tag", tagId)
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: res?.prompt?.replace("{tag_name}", tag?.tag) }],
      })

      let jsonObject = JSON.parse(completion?.data?.choices[0]?.message?.content);
      const tagSlug  = tag?.slug || slugify(tag?.tag?.slice(0, 65) || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}]/g })
      if (jsonObject) {
        jsonObject = {
          ...jsonObject,
          seo: {
            ...jsonObject?.seo,
            title: `${jsonObject?.seo?.title} | Curateit`,
            slug: tagSlug,
            canonical: `${process.env.REDIRECT_URI}/u/${user?.username}/tags/${tag?.id}/${tagSlug}`
          }
        }
        if (jsonObject?.opengraph && jsonObject?.opengraph?.image) {
          jsonObject = {
            ...jsonObject,
            opengraph: {
              ...jsonObject?.opengraph,
              image: tag?.avatar ? tag?.avatar : `${process.env.AWS_S3_STATIC_URL}/webapp/curateit-200x200.png`
            }
          }
        }
        await strapi.entityService.update('api::tag.tag', tag?.id, {
          data: {
            seo: jsonObject,
            slug: tagSlug
          }
        })
        return ctx.send(jsonObject)
      }
      return ctx.badRequest("Unable to generate SEO details for tag")
    }
    return ctx.send("Ai type not exists")
  },

  async fetchAllShortLinks (ctx) {
    const { user }  = ctx.state

    if (user) {
      const gems = await strapi.entityService.findMany("api::gem.gem", {
        filters: {
          author: user?.id,
          $and: [
            { expander: { $notNull: true } },
            { expander: { $containsi: "link"} }
          ]
        },
        fields: ["id", "title", "media", "expander", "description", "url", "fileType", "S3_link", "text", "media_type", "showThumbnail", "metaData"],
        populate: {
          collection_gems: { fields: ["id", "name"] },
          author: { fields: ["id", "username"] },
          tags: { fields: ["id", "tag"] }
        }
      })
      const finalArr = []
      gems.forEach((g) => {
        const idx = g.expander?.findIndex((e) => { return e.type === "link" })
        if (idx !== -1) {
          finalArr.push(g)
        }
      })
      return ctx.send(finalArr)
    }

    return ctx.send([])
  },

  async fetchSubCollectionMediaTypeGems (collections, mediaTypeArr) {
    let newGems = []
    for (const collection of collections) {
      const collectionData = await strapi.entityService.findOne("api::collection.collection", collection.id, {
        fields: ["id", "name", "slug"],
        populate: {
          gems: {
            fields: ["id", "title", "media", "expander", "description", "url", "fileType", "S3_link", "text", "media_type", "showThumbnail", "metaData"],
            populate: {
              author: { fields: ["id", "username"] },
              tags: { fields: ["id", "tag"] }
            }
          },
          parent_collection: {
            fields: ["id", "name"]
          }
        }
      })
      console.log("Gems ===>", collectionData.gems?.length)
      newGems = [ ...newGems, ...collectionData.gems?.filter((g) => mediaTypeArr.includes(g.media_type) || (g.expander && g.expander.findIndex((e) => e.type === "link") !== -1)) ]
      if (collectionData.parent_collection?.length !== 0) {
        newGems = [ ...newGems, ...await this.fetchSubCollectionMediaTypeGems(collectionData.parent_collection, mediaTypeArr) ]
      }
    }
    return newGems
  },

  async fetchAllSharedGemsWithMediaType (ctx) {
    // Note: This API is by default include the gems whose has the short links please do not remove that otherwise shared collection short links would be break
    const { user }          = ctx.state
    const { mediaType }     = ctx.request.query
    const mediaTypeArr      = mediaType.split(",")

    if (mediaTypeArr.length === 0) return ctx.send([])

    const sharedCollections = await strapi.entityService.findMany("api::collection.collection", {
      filters: {
        $and: [
          {
            $or: [
              { invitedUsersViaMail: { $notNull: true, $containsi: user?.email } },
              { invitedUsersViaLinks: { $notNull: true, $containsi: user?.email } },
              // { follower_users: { $notNull: true, $containsi: user?.email } }
            ]
          }
        ]
        
      },
      fields: ["id", "name", "slug"],
      populate: {
        gems: {
          fields: ["id", "title", "media", "expander", "description", "url", "fileType", "S3_link", "text", "media_type", "showThumbnail", "metaData"],
          populate: {
            author: { fields: ["id", "username"] },
            tags: { fields: ["id", "tag"] }
          }
        },
        parent_collection: {
          fields: ["id", "name"]
        }
      }
    })

    let finalArr = []
    for (const c of sharedCollections) {
      if (c.gems && c.gems.length > 0) {
        finalArr = [ ...finalArr, ...c.gems?.filter((g) => mediaTypeArr.includes(g.media_type) || (g.expander && g.expander.findIndex((e) => e.type === "link") !== -1)) ]
      }
      if (c.parent_collection?.length !== 0) {
        finalArr = [ ...finalArr, ...await this.fetchSubCollectionMediaTypeGems(c.parent_collection, mediaTypeArr) ]
      }
    }

    return ctx.send(finalArr)
  },

  async getTabGems(ctx) {
    try {
      const { collectionId } = ctx.params;
      const { page, perPage } = ctx.request.query;

      const tabGems = await getGems(page, perPage, collectionId, true);

      ctx.send({ status: 200, count: tabGems.totalCount, data: tabGems.gems })

    } catch (error) {
      ctx.send({ status: 400, message: error.message })
    }
  },

  async getImageText (ctx) {
    try {
      const { image } = ctx.request.query;
      const { id } = ctx.state.user;
      const ocrRes              = await strapi.service('api::ocr.ocrs').getOCRDetailsFromImage(image);
      const userPlan            = await strapi.db.query('api::plan-service.plan-service').findOne({
          where: {
              author: id
          }
      })
      if (userPlan) {
        updatePlanService(id, "ocr_image", parseInt(userPlan.ocr_image_used) + 1)
      }

      ctx.send({ status: 200, text: ocrRes})

    } catch (error) {
      ctx.send({ status: 400, message: error.message})
    }
  },

  async getMediaTypeGems (ctx) {
    try {
      const { id } = ctx.state.user;
      const { mediatype } = ctx.request.query;

      let filters = {
        author: id
      }

      if ( mediatype === "Ai Prompt" || mediatype === "Text Expander") filters.media_type = { $in: ["Ai Prompt", "Text Expander"]}
      else filters.media_type = { $in: [mediatype]}

      const bookmarks = await strapi.entityService.findMany("api::gem.gem", {
        filters,
        fields: ["id", "title", "media", "expander", "description", "url", "fileType", "S3_link", "text", "media_type", "showThumbnail", "metaData", "prompt_category"],
        populate: {
          collection_gems: { fields: ["id", "name"] },
          author: { fields: ["id", "username"] },
          tags: { fields: ["id", "tag"] }
        }
      })

      bookmarks?.forEach((b) => delete b.seo )
      const count = bookmarks.length;

      ctx.send({ staus: 200, count, data: bookmarks});
    } catch (error) {
      ctx.send({ staus: 400, error: error.message});
    }
  }
}));
