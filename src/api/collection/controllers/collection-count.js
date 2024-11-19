const { collectionOrder, getCollectionInOrder, getCollectionOrder } = require('../services/collection-service');

const { createCoreController } = require('@strapi/strapi').factories;

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

    async counts(ctx) {
        try {
            const { user } = ctx.state;
            const { collectionId } = ctx.params;
            const { type } = ctx.request.query;

            let data = {}

            const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                filters: { author: user.id },
                field: ["id", "name", "slug", "shares_count", "likes_count", "save_count"],
                populate: {
                    like_users: { fields: ["id", "username"] }
                }
            });

            if (type === "share") data = { shares_count: parseInt(collection.shares_count) + 1, share_users: user.id };
            if (type === "like") {
                if (collection.like_users.some((u) => u.id === parseInt(user.id))) {
                    let like_users = collection.like_users.filter((u) => {
                        return u.id !== parseInt(user.id)
                    })
                    data = { likes_count: parseInt(collection.likes_count) - 1, like_users };
                } else {
                    data = { likes_count: parseInt(collection.likes_count) + 1, like_users: user.id };
                }
            }
            if (type === "save") data = { save_count: parseInt(collection.save_count) + 1, save_users: user.id };

            await strapi.entityService.update("api::collection.collection", collectionId, {
                data
            });

            ctx.send({ status: 200, message: "Count updated" })

        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    async countUser(ctx) {
        try {
            const { user } = ctx.state;
            const { collectionId } = ctx.params;
            const { type } = ctx.request.query;
            
            let populate = {}

            if (type === "share") populate = { share_users: { fields: ["id", "username"] } };
            if (type === "like") populate = { like_users: { fields: ["id", "username"] } };
            if (type === "save") populate = { save_users: { fields: ["id", "username"] } };

            const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
                filters: { author: user.id },
                field: ["id", "name", "slug", "shares_count", "likes_count", "save_count"],
                populate
            });

            ctx.send({ status: 200, data: collection })

        } catch (error) {
            ctx.send({ status: 400, message: error });
        }
    },

    async prepareSubCollectionCounts(collections) {
        const arr = []
        for (const collection of collections) {
            const obj = { 
                id: collection.id, 
                name: collection.name, 
                gems_count: collection.gems?.length || 0,
                avatar: collection.avatar,
                is_sub_collection: collection.is_sub_collection,
                slug: collection.slug,
                // iconLink: collection.iconLink,
                // background: collection.background,
                // coverImage: collection.coverImage,
                // icon: collection.icon,
                // color: collection.color,
                folders: []
            }
            if (collection.parent_collection && collection.parent_collection.length !== 0) {
                // console.log("Count ===>", collection.parent_collection)
                for (const parentCollection of collection.parent_collection) {
                    const parentCollectionObj = await strapi.entityService.findOne("api::collection.collection", parentCollection.id, {
                        fields: ["id", "name", "slug", "avatar", "is_sub_collection"],
                        populate: {
                            parent_collection: { fields: ["id", "name", "slug", "avatar", "is_sub_collection"] },
                            collection: { fields: ["id", "name", "slug"] },
                            gems: { fields: ["id", "slug"] }
                        }
                    });
                    if (parentCollectionObj.parent_collection.length !== 0) {
                        obj.folders = await this.prepareSubCollectionCounts(collection.parent_collection)
                    }
                }
            }
            arr.push(obj)
        }
        return arr
    },

    async getChildCollectionAndItsCount(childCollections, allCollections) {
        const arr = []

        for (const child of childCollections) {
            const cIdx = allCollections.findIndex((c) => c?.id === child?.id)
            if (cIdx !== -1) {
                const cObj = allCollections[cIdx]

                const gemArr    = cObj.gems?.filter((g) => {
                    if ((g?.author?.id === cObj?.author?.id) || (g.isApproved === true && g.isPending === false)) {
                        return g
                    }
                })
                const obj  = {
                    id: cObj.id,
                    name: cObj.name,
                    gems_count: gemArr.length || 0,
                    avatar: cObj.avatar,
                    is_sub_collection: cObj.is_sub_collection,
                    collection: cObj.collection,
                    media_type: cObj.media_type,
                    slug: cObj.slug,
                    tags: cObj.tags,
                    folders: []
                }
                if (cObj.parent_collection && cObj.parent_collection.length !== 0) {

                    const orderOfNestedCollection = cObj?.order_of_sub_collections || []
                    const uniqueOrderOfNestedCollection = [...new Set(orderOfNestedCollection)]
                    const pNestedCollectionId = []
                    cObj.parent_collection.forEach((s) => {
                        pNestedCollectionId.push(s.id)
                    })

                    const finalSubCollectionArr = await getCollectionOrder(cObj.id, uniqueOrderOfNestedCollection, pNestedCollectionId, cObj.parent_collection, true)

                    // obj.folders = this.getChildCollectionAndItsCount(cObj.parent_collection, allCollections)
                    obj.folders = await this.getChildCollectionAndItsCount(finalSubCollectionArr, allCollections)

                }
                arr.push(obj)
            }
        }

        return arr
    },

    async getCollectionWiseCounts(ctx) {
        try {
            const { user } = ctx.state;

            const collections = await strapi.entityService.findMany("api::collection.collection", {
                filters: {
                    author: user.id
                },
                fields: ["id", "name", "avatar", "slug", "is_sub_collection", "media_type", "background", "order_of_sub_collections"],
                populate: {
                    parent_collection: { 
                        fields: ["id", "name", "slug", "avatar", "is_sub_collection", "media_type", "order_of_sub_collections"],
                        populate: {
                            author: { fields: ["id"] }
                        } 
                    },
                    collection: { 
                        fields: ["id", "name", "slug"],
                        populate: {
                            author: { fields: ["id"] }
                        }
                    },
                    gems: { 
                        fields: ["id", "slug", "isApproved", "isPending"],
                        populate: {
                            author: { fields: ["id"] }
                        } 
                    },
                    author: {
                        fields: ["id"]
                    },
                    tags: {
                        fields: ["id", "tag", "slug", "avatar"]
                    }
                }
            });

            const collectionArr = []
            const mainArr       = collections.filter((c) => c.is_sub_collection === false)
            const bookmarkConfig = await strapi.db.query("api::bookmark-config.bookmark-config").findOne({
                where: { author: user.id },
                select: ["id", "order_of_collections"]
            })

            const collectionOrder = bookmarkConfig?.order_of_collections || [];
            const uniquecollectionOrder = [...new Set(collectionOrder)]
            const pCollectionId = []

            // mainArr.forEach((m) => {
                for (const m of mainArr) {
                pCollectionId.push(m.id)

                const gemArr    = m.gems?.filter((g) => {
                    if ((g?.author?.id === m.author?.id) || (g?.isApproved === true && g?.isPending === false)) {
                        return g
                    }
                })

                const obj = { 
                    id: m.id, 
                    name: m.name, 
                    gems_count: gemArr.length || 0,
                    avatar: m.avatar,
                    is_sub_collection: m.is_sub_collection,
                    collection: m.collection,
                    media_type: m.media_type,
                    background : m.background,
                    slug: m.slug,
                    tag: m?.tags,
                    // iconLink: collection.iconLink,
                    // background: collection.background,
                    // coverImage: collection.coverImage,
                    // icon: collection.icon,
                    // color: collection.color,
                    folders: []
                }

                if (m.parent_collection && m.parent_collection.length !== 0) {

                    const subCollectionOrder =  m?.order_of_sub_collections || [];

                    const uniqueSubCollectionOrder = [...new Set(subCollectionOrder)]

                    const pSubCollectionId = []
                    m.parent_collection.forEach((s) => {
                        pSubCollectionId.push(s.id)
                    })

                    const finalSubCollectionArr = await getCollectionOrder(m.id, uniqueSubCollectionOrder, pSubCollectionId, m.parent_collection, true)

                    // obj.folders = this.getChildCollectionAndItsCount(m.parent_collection, collections)
                    obj.folders = await this.getChildCollectionAndItsCount(finalSubCollectionArr, collections)

                }

                collectionArr.push(obj)
            }
            // })

            const finalCollectionArr = await getCollectionOrder(user.id, uniquecollectionOrder, pCollectionId, collectionArr)

            return ctx.send(finalCollectionArr)

        }
        catch (error) {
            return ctx.send({ message: error.message });
        }
    }
}))