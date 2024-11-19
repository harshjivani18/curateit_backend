'use strict';

const { areCollectionIdSame, getFullScreenshot, createActivity } = require('../../../../utils');
const { createBulkElasticData } = require('./after-operations');

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::gem.gem', ({ strapi }) => ({

    async createKindleHighlight(user, books, collectionId, remarks, tags, isImported=true) {
        try {
            const existingBooks = await strapi.db.query("api::gem.gem").findMany({
                fields: ["id", "title", "slug", "description", "author"],
                populate: {
                    author: ["id"]
                },
                filters: {
                    title: {
                        $in: books.map(data => data.title)
                    }, 
                    author: user.id, 
                    collection_gems: collectionId 
                }
            })
            const mainBook = books.map(data => {
                return this.addBookGem(data, user.id, collectionId, existingBooks, isImported)
            })
            const booksArr = await Promise.all(mainBook)
            if (isImported) createBulkElasticData(user.id, booksArr, user.username)

            let hightLightList = [];

            for (const bk of books) {
                const { highlights } = bk;
                if (highlights.length > 0)
                    highlights.forEach(h_light => hightLightList.push({ ...bk, bookTitle: bk.title, description: bk.title, highlightId: h_light.highlightId, title: h_light.text, highlights: h_light }));
            }

            /* In title field only keep first five word in text highlight word */
            hightLightList = hightLightList.map(h_lightText => {
                const titleLen = h_lightText.title.split(" ").length;
                const highlightObj = h_lightText.highlights
                delete h_lightText.highlights
                return {
                    ...h_lightText,
                    ...highlightObj,
                    title: titleLen > 5 ? h_lightText.title.split(" ").slice(0, 5).join(" ") : h_lightText.title
                }
            })

            const highArr = hightLightList.map(data => data.highlightId)
            const existingHighlightArr = await strapi.db.query("api::gem.gem").findMany({
                filters: {
                    highlightId: {
                        $in: highArr
                    },
                    author: user.id, 
                    collection_gems: collectionId
                }
            })

            const bookArr = hightLightList.map(data => {
                return this.addKindleWithPromise(data, user.id, collectionId, remarks, tags, booksArr, existingHighlightArr, isImported)
            });
            const res = await Promise.all(bookArr);
            if (isImported) {
                if (res.length <= 10) {
                    createBulkElasticData(user.id, res, user.username)
                }
                else {
                    const chunk = 10;
                    for (let i = 0; i < res.length; i += chunk) {
                        const tempArr = res.slice(i, i + chunk);
                        createBulkElasticData(user.id, tempArr, user.username)
                    }
                }
            }

            const newHighlightArr = res.filter((hl) => {
                return hl.isCreated === true
            })

            const collId = [];
            let collName;
            newHighlightArr.map((h) => {
                collName = h.collection_gems.name
                collId.push(h.collection_gems.id)
            })

            let sameId;
            if (collId.length > 0) {
                sameId = areCollectionIdSame(collId);
            }

            if (newHighlightArr.length > 0) {
                const postId = [];
                newHighlightArr.map((post) => postId.push(post.id))

                // /* logs data for update hightlighed text  */
                // await strapi.entityService.create("api::activity-log.activity-log", {
                //     data: {
                //         action: "Imported",
                //         module: "Gem",
                //         actionType: "Highlight",
                //         author: user.id,
                //         count: newHighlightArr.length,
                //         gems: postId,
                //         collection: sameId ? collId[0] : [],
                //         publishedAt: new Date().toISOString(),
                //     },
                // });
                // const object = {
                //     action: "Imported",
                //     module: "Gem",
                //     actionType: "Highlight",
                //     collection_info: sameId ? { id: collId[0], name: collName } : {},
                //     count: newHighlightArr.length,
                //     author: { id: user.id, username: user.username },
                //     gems_info: [postId]
                // }
                // createActivity(object, jwt);
                // await axios.post(
                //     `${process.env.MONGODB_URL}/api/activitylogs`,
                //     {
                //         action: "Imported",
                //         module: "Gem",
                //         actionType: "Highlight",
                //         collection_info: sameId ? {id: collId[0]} : {},
                //         count: newHighlightArr.length,
                //         author: { id: user.id, username: user.username },
                //         gems_info: [postId]
                //     },
                //     {
                //         headers: {
                //             Authorization: `Bearer ${jwt}`
                //         },
                //     }
                // )
            }
            return res;
        } catch (error) {
            return error;
        }
    },

    addBookGem(data, userId, collectionId, existingBooks, isImported=true) {
        return new Promise((resolve, reject) => {
            const bIdx = existingBooks.findIndex((b) => b.title === data.title);
            const b    = bIdx > -1 ? existingBooks[bIdx] : null;
            if (b) {
                resolve(b);
            }
            else {
                strapi.entityService.create("api::gem.gem", {
                    data: {
                        description: data.authorName,
                        author: userId,
                        media: { authorName: data.authorName, type: data.media_type, link: data.url, status: "read" },
                        title: data.title,
                        metaData: data.metaData,
                        url: data.url,
                        entityObj: data.entityObj,
                        media_type: "Book",
                        collection_gems: collectionId,
                        isImported,
                        publishedAt: new Date().toISOString(),
                    }
                })
                .then(res => {
                    // getFullScreenshot(res);
                    resolve({ ...res, author: { id: userId } });
                })
            }
            // strapi.db.query("api::gem.gem").findOne({
            //     where: { title: data.title, author: userId, collection_gems: collectionId }
            // })
            //     .then((res) => {
            //         if (!res) {
            //             strapi.entityService.create("api::gem.gem", {
            //                 data: {
            //                     description: data.authorName,
            //                     author: userId,
            //                     media: { authorName: data.authorName, type: data.media_type, link: data.url },
            //                     title: data.title,
            //                     metaData: data.metaData,
            //                     url: data.url,
            //                     entityObj: data.entityObj,
            //                     media_type: "Book",
            //                     collection_gems: collectionId,
            //                     isImported: true,
            //                     publishedAt: new Date().toISOString(),
            //                 },
            //             })
            //                 .then(res => {
            //                     // getFullScreenshot(res);
            //                     resolve(res);
            //                 })
            //                 .catch(error => reject(error));
            //         } else {
            //             resolve(res)
            //         }
            //     })
            //     .catch((err) => {
            //         reject(err)
            //     })
        })
    },

    addKindleWithPromise(data, userId, collectionId, remarks, tags, parentBooks, existingHighlightArr, isImported=true) {
        return new Promise((resolve, reject) => {
            const hIdx = existingHighlightArr.findIndex((h) => h.highlightId === data.highlightId);
            const h    = hIdx > -1 ? existingHighlightArr[hIdx] : null;
            if (h) {
                resolve({ id: h.id, media: h.media, collection_gems: h.collection_gems, isCreated: false });  
            }
            else {
                const bIdx = parentBooks.findIndex((book) => {
                    return book.title === data.bookTitle && (book.author?.id === userId || book.author === userId) 
                });
                const b    = bIdx !== -1 ? parentBooks[bIdx] : null;
                strapi.entityService.create("api::gem.gem", {
                    data: {
                        highlightId: data.highlightId,
                        description: data.description,
                        author: userId,
                        media: { text: data.text, color: data.color, authorName: data.authorName, pageNo: data.pageNo, type: data.media_type, link: data.url },
                        title: data.title,
                        metaData: data.metaData,
                        url: data.url,
                        media_type: data.media_type,
                        collection_gems: collectionId,
                        parent_gem_id: b ? b.id : null,
                        remarks,
                        tags,
                        isImported,
                        publishedAt: new Date().toISOString(),
                    },
                    populate: {
                        collection_gems: {
                            fields: ["id", "name", "slug"]
                        }
                    }
                })
                .then(res => {
                    // getFullScreenshot(res);
                    const { id, media, collection_gems } = res;
                    resolve({ id, media, collection_gems, isCreated: true });
                })
            }
        })
    }
}))