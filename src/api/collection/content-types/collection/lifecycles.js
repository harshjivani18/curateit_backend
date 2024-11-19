const { score_keys } = require("../../../../../constant");
const { getService } = require("../../../../extensions/users-permissions/utils");
const axios = require("axios");
const { deleteElasticData, deleteBulkElasticData } = require("../../../gem/services/after-operations");
const { createActivity, updateGemiScoreRecs, updatePlanService, setCollectionSeoInformation } = require("../../../../../utils");
const { updateSubCollections, collectionOrderAtUpdateCollection, collectionOrderAtCreateCollection, collectionOrderAtDeleteCollection } = require("../../services/collection-service");
const { default: slugify } = require("slugify");
const viewSettingObj = {
    upvote: true,
    downvote: true,
    likes: true,
    comment: true,
    publicSearch: true,
    filterByTags: true,
    filterByCollection: true,
    filterType: true,
    view: ["listView", "cardView", "moodboardView", "boardView", "tableView"],
    sidePanel: "left",
    listView: true,
    cardView: true,
    moodboardView: true,
    boardView: true,
    tableView: true
}

const deleteGemsAndSubfolders = async (collectionId, userId) => {
    const allSubfolders = await strapi.db.query('api::collection.collection').findMany({
        where: {
            collection: {
                id: collectionId
            },
        }
    })

    allSubfolders.forEach(async (a) => {
        if (a.collection && a.collection.id) {
            deleteGemsAndSubfolders(a.collection.id, userId)
        }
        const allGems = await strapi.db.query("api::gem.gem").findMany({
            where: {
                collection_gems: a.id
            }
        })

        await strapi.db.query("api::gem.gem").deleteMany({
            where: {
                id: {
                    $in: allGems.map((g) => { return g.id })
                }
            }
        })
        updatePlanService(userId, "gem")
        const gemids = allGems.map((g) => g.id)
        // console.log("gemids========>", gemids);
        deleteBulkElasticData(gemids, userId)

        await strapi.db.query('api::collection.collection').delete({
            where: {
                id: a.id,
            },
        })
        // updatePlanService(userId, { coll_used: test1.length })
    })
}

module.exports = {
    beforeCreate(event) {
        const { data } = event.params;
        const slug = slugify(data.name?.slice(0, 65) || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}/\/]/g });
        event.params.data.slug = slug;
        event.params.data.seo  = {
            seo: {
                slug,
                title: `${data.name?.slice(0, 65)} | Curateit`,
                keywords: `${data.name?.slice(0, 65)},`,
                canonical: "",
                description: data.description?.slice(0, 155) || data.name?.slice(0, 65),
            },
            opengraph: {
              url: "",
              type: "website",
              image: "https://d3jrelxj5ogq5g.cloudfront.net/webapp/curateit-logo.png",
              title: `${data.name?.slice(0, 65)} | Curateit`,
              description: data.description?.slice(0, 155) || data.name?.slice(0, 65)
            }
        }
    },

    async afterCreate(event) {
        const { result, params } = event;
        const context = strapi?.requestContext?.get();
        const userId = context?.state?.user?.id || params.data.author;
        const username = context?.state?.user?.username;
        const url  = `${process.env.REDIRECT_URI}/u/${username}/c/${result.id}/${result.slug}`
        const obj  = {
            ...result.seo,
            seo: {
                ...result.seo.seo,
                canonical: url
            },
            opengraph: {
                ...result.seo.opengraph,
                url
            }
        }
        strapi.entityService.update("api::collection.collection", result.id, {
            data: {
                seo: obj
            }
        })
        // const token = context?.request?.header?.authorization?.split("Bearer ")?.[1];
        // const jwt = token || getService('jwt').issue({ id: userId });

        // count = await strapi.entityService.count("api::collection.collection", {
        //     filters: { author: userId }
        // })
        updatePlanService(userId, "collection")
        // setCollectionSeoInformation(result, username)

        // await elasticClient.index({
        //     index: "collections",
        //     body: {
        //         id: result.id,
        //         name: result.name,
        //         author: userId,
        //         description: result.description,
        //         comments: result.comments
        //     },
        // });

        // const collection = await strapi.entityService.update('api::collection.collection', result.id, {
        //     data: {
        //         isElastic: true,
        //         viewSettingObj: viewSettingObj,
        //         // isBulk: true

        //     }
        // })

        // if (userId) {
        //     if (params.data.isBulk || params.data.isShareCollection) { }
        //     else {
        //         /* logs data for update hightlighed text  */
        //         // await strapi.entityService.create("api::activity-log.activity-log", {
        //         //     data: {
        //         //         action: "Created",
        //         //         module: "Collection",
        //         //         actionType: "Collection",
        //         //         collection: result.id,
        //         //         count: 1,
        //         //         author: userId,
        //         //         publishedAt: new Date().toISOString(),
        //         //     },
        //         // });
        //         const object = {
        //             action: "Created",
        //             module: "Collection",
        //             actionType: "Collection",
        //             collection_info: { id: result.id, name: result.name },
        //             count: 1,
        //             author: { id: userId, username },
        //         }
        //         createActivity(object, jwt);
        //         // await axios.post(
        //         //     `${process.env.MONGODB_URL}/api/activitylogs`,
        //         //     {
        //         //         action: "Created",
        //         //         module: "Collection",
        //         //         actionType: "Collection",
        //         //         collection_info: { id: result.id, name: result.name },
        //         //         count: 1,
        //         //         author: { id: userId, username },
        //         //     },
        //         //     {
        //         //         headers: {
        //         //             Authorization: `Bearer ${jwt}`
        //         //         },
        //         //     }
        //         // )
        //     }

        //     // const collection = await strapi.entityService.update('api::collection.collection', result.id, {
        //     //     data: {
        //     //         viewSettingObj: viewSettingObj,
        //     //         isElastic: true
        //     //     }
        //     // })

        //     // if (userId) {

        //     /* Updating colls score (Gemification score table) */
        //     const gemiScore = await strapi.db.query('api::gamification-score.gamification-score').findOne({
        //         where: {
        //             author: userId
        //         }
        //     })
        //     if (gemiScore) {
        //         const collScore = parseInt(gemiScore.colls) + 1;
        //         await updateGemiScoreRecs(userId, { colls: collScore, colls_point: collScore });
        //     }

        //     const updatedGemiScore = await strapi.db.query('api::gamification-score.gamification-score').findOne({
        //         where: {
        //             author: userId
        //         }
        //     })
        //     let level;
        //     let totalScore = 0
        //     for (const keys in updatedGemiScore) {
        //         if (score_keys.includes(keys)) {
        //             totalScore += parseInt(updatedGemiScore[keys])
        //         }
        //     }
        //     switch (true) {
        //         case totalScore < 25000:
        //             level = "Rookie";
        //             break;
        //         case totalScore < 100000:
        //             level = "Aspiring Influencer";
        //             break;
        //         case totalScore < 500000:
        //             level = "Expert";
        //             break;
        //         default:
        //             level = "Legend";
        //     }
        //     await updateGemiScoreRecs(userId, { level, totalScore });
        //     // }

        //     return collection
        // }
        collectionOrderAtCreateCollection(userId, result)
    },

    async beforeDelete(event) {
        const { params } = event

        const userId = strapi.requestContext.get().state.user.id;

        if (params && params.where?.id) {
            deleteGemsAndSubfolders(params.where?.id, userId);
        }

        /* Deleting gems which associated with top-level folder */
        let gemsAssociatedColl = [];
        gemsAssociatedColl = await strapi.db.query('api::gem.gem').findMany({
            where: {
                collection_gems: params.where?.id
            }
        })

        gemsAssociatedColl = gemsAssociatedColl.map(gems => gems.id);
        // console.log("gemsAssociatedColl========>", gemsAssociatedColl);

        deleteBulkElasticData(gemsAssociatedColl, userId)

        // for (let id of gemsAssociatedColl) {
        //     console.log("id===========>", id);
        //     deleteElasticData(id)
        // }
        if (gemsAssociatedColl.length > 0) {
            await strapi.db.query('api::gem.gem').deleteMany({
                where: {
                    id: {
                        $in: gemsAssociatedColl
                    }
                }
            })
            updatePlanService(userId, "gem")
        }

        await collectionOrderAtDeleteCollection(userId, params.where?.id)

        // const updatedGems = await strapi.db.query('api::gem.gem').findMany({
        //     where: {
        //         author: userId
        //     }
        // });

        /* Updating gems bookmarks used items */
        // await updatePlanService(userId, { gem_used: parseInt(updatedGems.length) });

        // /* Upadating gems score after gems delete */
        // const gemiScore = await strapi.db.query('api::gamification-score.gamification-score').findOne({
        //     where: {
        //         author: userId
        //     }
        // })
        // if (gemiScore) {
        //     const gemScore = gemiScore?.gems_point ? gemiScore.gems_point : 1;
        //     await updateGemiScoreRecs(userId, { gems: parseInt(updatedGems.length) * parseInt(gemScore) });
        // }
    },

    afterDelete(event) {
        // const { params, result } = event;
        const userId = strapi.requestContext.get().state.user.id;
        // const username = strapi?.requestContext?.get()?.state?.user?.username;
        // const jwt = getService('jwt').issue({ id: userId });

        // strapi.entityService.count("api::collection.collection", {
        //     filters: { author: userId }
        // })
        // .then((res) => {
            updatePlanService(userId, "collection")
        // })
        // .catch((err) => console.log("updatePlanService error", err))


        // if (params && params.where?.id) {
        //     // const { body } = await elasticClient.search({
        //     //     index: 'collections',
        //     //     body: {
        //     //         query: {
        //     //             bool: {
        //     //                 must: [
        //     //                     {
        //     //                         match: { id: params.where?.id }
        //     //                     }
        //     //                 ]
        //     //             }
        //     //         }
        //     //     }
        //     // })
        //     // const elasticDocId = body.hits.hits[0]._id;
        //     // await elasticClient.delete({
        //     //     index: "collections",
        //     //     id: elasticDocId,
        //     // });

        //     const updatedColl = await strapi.db.query('api::collection.collection').findMany({
        //         where: {
        //             author: userId
        //         }
        //     })

        //     /* Updating collections used items */
        //     await updatePlanService(userId, { coll_used: parseInt(updatedColl.length) });

        //     /* logs data for update hightlighed text  */

        //     // const object = {
        //     //     action: "Deleted",
        //     //     module: "Collection",
        //     //     actionType: "Collection",
        //     //     count: 1,
        //     //     collection_info: { id: result.id, name: result.name },
        //     //     author: { id: userId, username }
        //     // }
        //     // createActivity(object, jwt);
        //     // await axios.post(
        //     //     `${process.env.MONGODB_URL}/api/activitylogs`,
        //     //     {
        //     //         action: "Deleted",
        //     //         module: "Collection",
        //     //         actionType: "Collection",
        //     //         count: 1,
        //     //         author: { id: userId, username }
        //     //     },
        //     //     {
        //     //         headers: {
        //     //             Authorization: `Bearer ${jwt}`
        //     //         },
        //     //     }
        //     // )

        //     /* Updating colls score after Folders/Collections delete */
        // //     const gemiScore = await strapi.db.query('api::gamification-score.gamification-score').findOne({
        // //         where: {
        // //             author: userId
        // //         }
        // //     })
        // //     if (gemiScore) {
        // //         const collScore = parseInt(gemiScore.colls) - 1;
        // //         const test = await updateGemiScoreRecs(userId, { colls: collScore, colls_point: collScore });
        // //     }

        // //     const updatedGemiScore = await strapi.db.query('api::gamification-score.gamification-score').findOne({
        // //         where: {
        // //             author: userId
        // //         }
        // //     })
        // //     let level;
        // //     let totalScore = 0
        // //     for (const keys in updatedGemiScore) {
        // //         if (score_keys.includes(keys)) {
        // //             totalScore += parseInt(updatedGemiScore[keys])
        // //         }
        // //     }
        // //     switch (true) {
        // //         case totalScore < 25000:
        // //             level = "Rookie";
        // //             break;
        // //         case totalScore < 100000:
        // //             level = "Aspiring Influencer";
        // //             break;
        // //         case totalScore < 500000:
        // //             level = "Expert";
        // //             break;
        // //         default:
        // //             level = "Legend";
        // //     }
        // //     await updateGemiScoreRecs(userId, { level, totalScore });
        // }
    },

    // async afterFindOne(event) {
    //     console.log(strapi?.requestContext?.get());
    // }

    // async afterUpdate(event) {
    //     const { params, result } = event;
    //     // const userId = strapi?.requestContext?.get()?.state?.user?.id;

    //     //     // if (!params.data.isElastic) {
    //     //     //     const { body } = await elasticClient.search({
    //     //     //         index: 'collections',
    //     //     //         body: {
    //     //     //             query: {
    //     //     //                 bool: {
    //     //     //                     must: [
    //     //     //                         {
    //     //     //                             match: { id: parseInt(params.where?.id) }
    //     //     //                         }
    //     //     //                     ]
    //     //     //                 }
    //     //     //             }
    //     //     //         }
    //     //     //     })
    //     //     //     const elasticDocId = body?.hits?.hits[0]?._id;
    //     //     //     if(elasticDocId){
    //     //     //         await elasticClient.update({
    //     //     //             index: 'collections',
    //     //     //             id: elasticDocId,
    //     //     //             body: {
    //     //     //                 doc: {
    //     //     //                     name: result.name,
    //     //     //                     description: result.description,
    //     //     //                     comments: result.comments
    //     //     //                 }
    //     //     //             },
    //     //     //         })
    //     //     //     }
    //     //     // }

    //     //     // if (params.data.isBulk || params.data.isShared || params.data.isMove) {
    //     // const { body } = await elasticClient.search({
    //     //     index: 'collections',
    //     //     body: {
    //     //         query: {
    //     //             bool: {
    //     //                 must: [
    //     //                     {
    //     //                         match: { id: parseInt(params.where?.id) }
    //     //                     }
    //     //                 ]
    //     //             }
    //     //         }
    //     //     }
    //     // })
    //     // const elasticDocId = body?.hits?.hits[0]?._id;
    //     // if (elasticDocId) {
    //     //     await elasticClient.update({
    //     //         index: 'collections',
    //     //         id: elasticDocId,
    //     //         body: {
    //     //             doc: {
    //     //                 name: result.name,
    //     //                 description: result.description,
    //     //                 comments: result.comments
    //     //             }
    //     //         },
    //     //     })
    //     // }


    //     //     // } else {
    //     //     //     /* logs data for update hightlighed text  */
    //     //     //     await strapi.entityService.create("api::activity-log.activity-log", {
    //     //     //         data: {
    //     //     //             action: "Updated",
    //     //     //             module: "Collection",
    //     //     //             actionType: "Collection",
    //     //     //             collection: event.result.id,
    //     //     //             count: 1,
    //     //     //             author: userId,
    //     //     //             publishedAt: new Date().toISOString(),
    //     //     //         },
    //     //     //     });
    //     //     // }
    // },

    async afterFindOne(event) {
        const userId = strapi.requestContext?.get()?.state?.user?.id;
        const { params, result } = event;
        if (!params.select && result?.author?.id === userId) {
            result.secretPassword = result.collectionPassword
            result.collectionPassword = result.originalPassword
        }
    },

    async afterUpdate(event) {
        const userId = strapi.requestContext?.get()?.state?.user?.id;
        const { params, result } = event;
        if (params?.data?.hasOwnProperty('viewSubCollection')) {
            updateSubCollections(result?.id, userId, params?.data?.viewSubCollection)
        }
    },

    async beforeUpdate(event) {
        const { params } = event;
        const userId = strapi?.requestContext?.get()?.state?.user?.id;

        const oldCollectionData = await strapi.entityService.findOne("api::collection.collection", params?.where?.id, {
            fields: ["id", "order_of_sub_collections"],
            populate: {
                collection: {
                    fields: ["id", "order_of_sub_collections"]
                }
            }
        });

        if (params?.data?.hasOwnProperty('collection') && userId) {
            await collectionOrderAtUpdateCollection(userId, oldCollectionData, params?.data)
        }
        
    }
};