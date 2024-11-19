const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    getSyncChildData(childCollections, allCollections) {
        const arr = []

        for (const child of childCollections) {
            const cIdx = allCollections.findIndex((c) => c.id === child.id)
            if (cIdx !== -1) {
                const cObj = allCollections[cIdx]
                const obj  = {
                    id: cObj.id,
                    name: cObj.name,
                    is_sub_collection: cObj.is_sub_collection,
                    collection: cObj.collection,
                    folders: [],
                    bookmarks: cObj.gems
                }
                if (cObj.parent_collection && cObj.parent_collection.length !== 0) {
                    obj.folders = this.getSyncChildData(cObj.parent_collection, allCollections)
                }
                arr.push(obj)
            }
        }

        return arr
    },

    async getUserSyncData(ctx) {
        try {
            const { user } = ctx.state;

            const collections = await strapi.entityService.findMany("api::collection.collection", {
                filters: {
                    author: user.id
                },
                fields: ["id", "name", "is_sub_collection"],
                populate: {
                    parent_collection: { 
                        fields: ["id", "name", "is_sub_collection"],
                    },
                    collection: { 
                        fields: ["id", "name", "is_sub_collection"],
                    },
                    gems: { 
                        fields: ["id", "title", "url"],
                    }
                }
            });

            const collectionArr = []
            const mainArr       = collections.filter((c) => c.is_sub_collection === false)

            mainArr.forEach((m) => {
                const obj = { 
                    id: m.id, 
                    name: m.name, 
                    is_sub_collection: m.is_sub_collection,
                    collection: m.collection,
                    folders: [],
                    bookmarks: m.gems
                }
                if (m.parent_collection && m.parent_collection.length !== 0) {
                    obj.folders = this.getSyncChildData(m.parent_collection, collections)
                }

                collectionArr.push(obj)
            })

            return ctx.send(collectionArr)
        }
        catch (error) {
            return ctx.send({ message: error });
        }
    }
}))