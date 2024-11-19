'use strict';

/**
 * gem service
 */

const { createCoreService }             = require('@strapi/strapi').factories;
const { parse } = require('tldts');
const moment = require("moment")
const { default: axios } = require('axios');

module.exports = createCoreService('api::gem.gem', ({strapi}) => ({

    createTab(b, author, parentId, resolve) {
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
                tags: b?.tags && Array.isArray(b.tags) && b.tags.length > 0 ? b.tags : [],
                // isThumbnailBroken: true,
                metaData: {
                    ...b,
                    icon: b.icon ? { type: "image", icon: b.icon } : "",
                    defaultIcon: b.icon ? b.icon : "",
                    docImages: [b.icon],
                    defaultThumbnail: b.icon ? b.icon : "",
                    covers: [b.icon]
                },
                collection_gems: parentId,
                isTabCollection: true,
                publishedAt: new Date().toISOString(),
            }
        }).then((res) => {
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
                collection_id: parentId,
                tags: []
            })
        })
    },

    createTabsPromise: (gem, author) => {
        return new Promise((resolve, reject) => {
            strapi.service("api::gem.tabs").createTab({ ...gem, isImported: true }, author.id, gem.collection_gems, resolve)
        })
    }
}));
