'use strict';

const { PutObjectCommand,
    S3Client } = require("@aws-sdk/client-s3");
const url = require("url");
const https = require("https");
const path = require('path');
const { getFullScreenshot } = require("../../../../utils");
const getPDF = (pdfURL) => {
    return new Promise((resolve, reject) => {
        https.get(pdfURL, (res) => {
            const data = []
            res.on('data', function(chunk) {
                data.push(chunk);
            }).on('end', function() {
                const buffer = Buffer.concat(data);
                resolve(buffer);
            });
        })
    })
}

const parentImage = async (data, userId) => {
    // if (data.fileType === "file") return null
    let filters = {
        url: data.url,
        media_type: "PDF",
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
                media_type: "PDF",
                author: userId,
                media,
                collection_gems: data.collections,
                metaData: data.metaData,
                fileType: "url",
                publishedAt: new Date().toISOString()
            }
        })
        // getFullScreenshot(createParent);
        return createParent.id;
    }
    return existParent[0].id;
}


module.exports = () => ({


    pdfStore: async (queryParams) => {
        try {

            const {
                AWS_BUCKET,
                AWS_ACCESS_KEY_ID,
                AWS_ACCESS_SECRET,
                AWS_REGION
            } = process.env


            const body = await getPDF(queryParams.file)
            let filename
            if (body.error === undefined) {
                const client = new S3Client({
                    region: AWS_REGION,
                    credentials: {
                        accessKeyId: AWS_ACCESS_KEY_ID,
                        secretAccessKey: AWS_ACCESS_SECRET
                    }
                })
                const parsed = url.parse(queryParams.file);
                filename = path.basename(parsed.pathname).replace(/ /g, '')
                const extension = filename.split('.').pop();
                const params = {
                    Bucket: AWS_BUCKET,
                    Key: `common/files/docs/${filename}`,
                    Body: body,
                    ACL: 'public-read',
                    ContentType: `application/${extension}`,
                }
                await client.send(new PutObjectCommand(params))
            }

            return [`${process.env.AWS_BASE_URL}/common/files/docs/${filename}`];
        } catch (error) {
            console.log(error);
        }
    },

    createHighlightPdf: async (body, userId) => {
        try {

            let tagIds = [];
            if (body.tags.length > 0) {
                body.tags.map(data => {
                    tagIds.push(data.id)
                });
            };
            const parentId = body.type === "Highlight" ? await parentImage(body, userId) : null;
            const pdfGem   = await strapi.entityService.create("api::gem.gem", {
                data: {
                    title: body.title,
                    collection_gems: body.collections,
                    tags: tagIds,
                    comments: body.comments,
                    url: body.url,
                    media: body,
                    media_type: body.type,
                    text: body.text,
                    author: userId,
                    metaData: body.metaData,
                    S3_link: [`${body.s3link}`],
                    parent_gem_id: parentId || null,
                    publishedAt: new Date().toISOString(),
                    fileType: body.fileType || null
                }
            })
            
            // getFullScreenshot(pdfGem);
            return pdfGem;
        } catch (error) {
            console.log(error);
        }
    },

    getPdfHighlight: async (params, userId, type, filterObj) => {
        try {
            let queryURL = params.endsWith('/') ? params.slice(0, -1) : params;

            const pdfOcrData = await strapi.entityService.findMany('api::gem.gem', {
                filters: { 
                    media_type: type,
                    author: userId
                },
                populate: {
                    tags: {
                        fields: ["id", "tag", "slug"]
                    }
                }
            });

            return pdfOcrData.filter((t) => { return t.S3_link && Array.isArray(t.S3_link) && t.S3_link.findIndex((s) => { return s === queryURL }) !== -1 });
           
        } catch (error) {
            console.log(error);
        }
    },

    getPdfHighlightById: async (gemId) => {
        try {
            const pdfOcrGem = await strapi.entityService.findOne('api::gem.gem', gemId, {
                populate: '*'
            });

            return pdfOcrGem
        } catch (error) {
            console.log(error);
        }
    },

    updatePdfHighlight: async (body, gemId) => {
        try {

            let tagIds = [];
            if (body.tags?.length > 0) {
                body.tags.map(data => {
                    tagIds.push(data.id)
                });
            }

            const obj = {
                title: body.title,
                description: body.description,
                collection_gems: body.collections
            }

            if (body.metaData) {
                obj["metaData"] = body.metaData
            }

            if (tagIds.length !== 0) {
                obj["tags"] = tagIds
            }

            const pdfOcrGem = await strapi.entityService.update('api::gem.gem', gemId, {
                data: obj
            });

            return pdfOcrGem;
        } catch (error) {
            console.log(error);
        }
    },

    deletePdfHighlight: async (gemId) => {
        try {
            const pdfOcrGem = await strapi.entityService.delete('api::gem.gem', gemId);

            return pdfOcrGem
        } catch (error) {
            console.log(error);
        }
    },




})