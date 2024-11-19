'use strict';

/**
 * gem service
 */

const { createCoreService }             = require('@strapi/strapi').factories;
const { AWS_BUCKET, AWS_ACCESS_KEY_ID,
        AWS_ACCESS_SECRET, AWS_REGION } = process.env;
        const path = require("path");
        const { parse } = require('tldts');
        const moment = require("moment")
const fs                                = require("fs");
const { PutObjectCommand, S3Client }    = require("@aws-sdk/client-s3");
// const { SendMessageCommand, SQSClient } = require("@aws-sdk/client-sqs")
const { default: axios } = require('axios');

module.exports = createCoreService('api::gem.gem', ({strapi}) => ({

    updateBookmarkMedia: (files) => {
        const filesSelect = files?.length ? "mutiple" : "single";
        const client      = new S3Client({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_ACCESS_SECRET,
            },
        });
        
        const promiseArr = [];
        if (filesSelect === "single") {
            const fileObj = files;

            const absolutePath = path.join(fileObj.path);
            const filename = fileObj.name.replace(/ /g, "");
            let fileStream = fs.createReadStream(absolutePath);
            const params = {
                Bucket: AWS_BUCKET,
                Key: `common/images/bookmark_images/${filename}`,
                Body: fileStream,
                ContentType: fileObj.type,
                ACL: "public-read",
            };
            promiseArr.push(new Promise((resolve, reject) => {
                client.send(new PutObjectCommand(params)).then((res) => {
                    resolve(`${process.env.AWS_BASE_URL}/common/images/bookmark_images/${filename}`)
                });
            }))
            return promiseArr
        } 
        for (const fileObj of files) {
            const absolutePath = path.join(fileObj.path);
            const filename = fileObj.name.replace(/ /g, "");
            let fileStream = fs.createReadStream(absolutePath);

            const params = {
                Bucket: AWS_BUCKET,
                Key: `common/images/bookmark_images/${filename}`,
                Body: fileStream,
                ContentType: fileObj.type,
                ACL: "public-read",
            };

            promiseArr.push(new Promise((resolve, reject) => {
                client.send(new PutObjectCommand(params)).then((res) => {
                    resolve(`${process.env.AWS_BASE_URL}/common/images/bookmark_images/${filename}`)
                });
            }))
        }
        return promiseArr
    },

    uploadImageFromBase64: (base64, path) => {
        return new Promise((resolve, reject) => {
            const buf       = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64')
            const type      = base64.split(';')[0].split('/')[1];
            const params    = {
                Bucket: AWS_BUCKET,
                Key: path,
                Body: buf,
                ContentEncoding: 'base64',
                ContentType: `image/${type}`,
                ACL: "public-read",
            };
            const client      = new S3Client({
                region: AWS_REGION,
                credentials: {
                    accessKeyId: AWS_ACCESS_KEY_ID,
                    secretAccessKey: AWS_ACCESS_SECRET,
                },
            });
            client.send(new PutObjectCommand(params), (res) => {
                resolve(`${process.env.AWS_BASE_URL}/${path}`)
            })
        })
    },
   
    updateGem: async (gemId, body) => {

        // let gemId;
        // url.map(data => {
        //     gemId = data.value
        // });

        const entry = await strapi.entityService.findMany('api::gem.gem', {
            filters: {id: gemId}
        });

        let updateId = entry[0].id;

        const updatedGem = await strapi.entityService.update('api::gem.gem', updateId, {
            data: {
                ...entry,
                url: body.data.url,
                title: body.data.title,
                description: body.data.description,
                media: body.data.media,
                remarks: body.data.remarks,
                Tags: body.data.tags

            }
        });
        const domainManagerData = await strapi.entityService.findMany('api::domain-manager.domain-manager', {
            populate: '*',
            filters: {url: entry[0].url}
        })

        if(domainManagerData.length > 0){

            let updatedGemData = {
    
                ...updatedGem,
                domainName: domainManagerData[0].domainName,
                medium: domainManagerData[0].medium,
                canonical: domainManagerData[0].canonical,
                Extras: domainManagerData[0].Extras
            }
            return updatedGemData;
        } else {
            let  updatedGemData = {
                ...updatedGem
            }
            return updatedGemData;

        }
    },

    createBookmarkWithIcon(b, author, parentId, resolve) {
        return strapi.entityService.findMany("api::gem.gem", {
            filters: {
                url: b.link,
                author: author
            },
            populate: {
                collection_gems: {
                    fields: ["id"]
                }
            }
        }).then((res) => {
            if (res.length > 0) {
                const finalRes = res[0]
                resolve({
                    id: finalRes.id,
                    url: finalRes.url,
                    title: finalRes.title,
                    remarks: finalRes.remarks,
                    metaData: finalRes.metaData,
                    media: finalRes.media,
                    description: finalRes.description,
                    media_type: finalRes.media_type,
                    S3_link: finalRes.S3_link,
                    is_favourite: finalRes.is_favourite,
                    collection_id: finalRes.collection_gems?.id,
                    tags: []
                })
            }
            else {
                strapi
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
            }
        })
    },

    createGemPromiseForIcon: (gem, author) => {
        return new Promise((resolve, reject) => {
            if (gem.icon && gem.icon.startsWith("data:")) {
                const urlParse = parse(gem.link)
                const parseArr = urlParse && urlParse.domain ? urlParse.domain.split(".") : []
                const filename = parseArr.length !== 0 ? parseArr[0] : gem.title.slice(0, 3)
                const storeKey = `common/images/bookmark_images/bookmark-${filename}-${moment().toDate().getTime()}.jpg`
                
                strapi.service("api::gem.gem")
                        .uploadImageFromBase64(gem.icon, storeKey)
        
                gem = {
                    ...gem, 
                    isImported: true,
                    icon: `${process.env.AWS_BASE_URL}/${storeKey}`
                }
                strapi.service("api::gem.gem").createBookmarkWithIcon(gem, author.id, gem.collection_gems, resolve)
            }
            else {
                strapi.service("api::gem.gem").createBookmarkWithIcon({ ...gem, isImported: true }, author.id, gem.collection_gems, resolve)
            }
      
        })
    }
}));
