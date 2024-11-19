'use strict';

const { convertRestQueryParams } = require('strapi-utils');
const mime = require('mime-types');
const path = require('path');
const fs = require('fs');
const axios = require("axios");
const url = require("url");
const { awaitRequest, 
        imageColor, 
        openai, 
        updatePlanService, 
        getPathExtension,
        getExtAndColors,
        getFullScreenshot } = require('../../../../utils');
const { PutObjectCommand,
    S3Client } = require("@aws-sdk/client-s3");

const parentImage = async (data, userId) => {
    if (data.fileType === "file") return null
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
                author: userId,
                media,
                collection_gems: data.collections,
                metaData: data.metaData,
                publishedAt: new Date().toISOString()
            }
        })
        // getFullScreenshot(createParent);
        return createParent.id;
    }
    return existParent[0].id;
}

module.exports = {

    storeImage: async (ctx, next) => {
        const userId            = ctx.state.user?.id;
        const bodyData          = ctx.request.body;
        const { 
            image,
            imageColor,
            ocr,
        }                       = ctx.request.query;
        const { AWS_BUCKET }    = process.env;
        const newImage          = decodeURIComponent(image)

        let imageData           = null
        let s3Path              = null
        let ocrRes              = null
        let userPlan            = null

        if (imageColor === 'true' || (newImage && !newImage.includes(AWS_BUCKET))) {
            imageData           = await getExtAndColors(newImage, imageColor === "true")
        }

        if (imageData === null) {
            return ctx.send({ msg: 'Image not found' })
        }

        if (imageData !== null && newImage && !newImage.includes(AWS_BUCKET)) {
            s3Path              = strapi.service('api::ocr.ocrs').storeImageInS3(userId, imageData.filename, imageData.header, imageData.data);
        }
        s3Path                  = (newImage.includes(AWS_BUCKET)) ? newImage : s3Path

        if (ocr === 'true') {
            ocrRes              = await strapi.service('api::ocr.ocrs').getOCRDetailsFromImage(image);
            userPlan            = await strapi.db.query('api::plan-service.plan-service').findOne({
                where: {
                    author: userId
                }
            })
        }

        let parentImageId       = null
        if (!bodyData.base64 && (Object.keys(bodyData).length === 1 && !bodyData.link?.startsWith(process.env.AWS_BASE_URL) && ocr === 'true')) {
            parentImageId       = await parentImage(bodyData, userId);
        }
        const bioObj = bodyData?.media
        delete bodyData?.media
        const gemObj            = {
            url: bodyData?.url,
            title: bodyData.title || imageData.filename,
            text: ocrRes || '',
            S3_link: [s3Path],
            media_type: bodyData.type || "Image",
            FileName: imageData.filename,
            imageColor: imageData.colors,
            media: {...bodyData, covers: bioObj?.covers, shape: bioObj?.shape, x: bioObj?.x, y: bioObj?.y},
            metaData: { ...bodyData.metaData, fallbackURL: newImage },
            description: bodyData?.description,
            author: userId,
            tags: bodyData.tags,
            showThumbnail: bodyData.showThumbnail !== undefined ? bodyData.showThumbnail : true,
            collection_gems: bodyData?.collections,
            is_favourite: bodyData.is_favourite,
            remarks: bodyData.notes,
            parent_gem_id: parentImageId,
            fileType: bodyData.fileType
        }

        const createGemDetails = await strapi.service('api::gem.gem').create({
            data: gemObj
        });

        if (userPlan) {
            updatePlanService(userId, "ocr_image", parseInt(userPlan.ocr_image_used) + 1)
        }

        return ctx.send(createGemDetails)
    },

    getImageToText: async (ctx, next) => {

        // try {
        const userId = ctx.state.user?.id;
        const bodyData = ctx.request.body;
        const filter = convertRestQueryParams(ctx.request.query);
        const ocr = ctx.request.query.ocr;
        const { X_RAPIDAPI_KEY,
            AWS_BUCKET,
            AWS_ACCESS_KEY_ID,
            AWS_ACCESS_SECRET,
            AWS_REGION
        } = process.env;

        /* Checking ocr-image limit before converting image-to-text */
        let userPlan;
        if (userId) {
            userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
                where: {
                    author: userId
                }
            })

            // const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')

            // if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.ocr_image_used) >= parseInt(configLimit[0].ocr_image_limit)) {
            //     return ctx.send({ msg: 'Your image to text conversion limit is exceeded Please extend your service plan' });
            // }
            if (userPlan && userPlan?.plan === 'free' && parseInt(userPlan?.ocr_image_used) >= parseInt(userPlan?.ocr_image_limit)) {
                return ctx.send({ msg: 'Your image to text conversion limit is exceeded Please extend your service plan' });
            }
        }

        const imgURL = filter.where[0].value;
        const body = await axios.get(imgURL, { "responseType": "arraybuffer" })
        const ext = (!body.error) ? mime.extension(body.headers['content-type']) : getPathExtension(imgURL);
        const filename = `${Date.now()}.${ext === false ? 'jpg' : ext}`;

        // let filename = Date.now() + path.basename(parsed.pathname);
        if (!imgURL.includes(AWS_BUCKET)) {
            // let filename
            if (!body.error) {
                const client = new S3Client({
                    region: AWS_REGION,
                    credentials: {
                        accessKeyId: AWS_ACCESS_KEY_ID,
                        secretAccessKey: AWS_ACCESS_SECRET
                    }
                });
                // const extension = filename.split('.').pop();
                const params = {
                    Bucket: AWS_BUCKET,
                    Key: `common/images/annotated_images/${filename}`,
                    Body: body.data,
                    ACL: 'public-read',
                    ContentType: body.headers['content-type']
                }
                await client.send(new PutObjectCommand(params));
            }
        }


        if (filter.where) {
            const parentImageId = await parentImage(bodyData, userId);
            const s3Path = imgURL.includes(AWS_BUCKET) ? imgURL : `${process.env.AWS_BASE_URL}/common/images/annotated_images/${filename}`;
            const color = ctx.request.query.imageColor ? await imageColor(s3Path, ext) : null;
            let res;
            if (ocr) {
                res = await axios.get(`https://ocr-extract-text.p.rapidapi.com/ocr?url=${filter.where[0].value}`,
                    {
                        headers: {
                            'X-RapidAPI-Key': X_RAPIDAPI_KEY,
                            'X-RapidAPI-Host': 'ocr-extract-text.p.rapidapi.com',
                            'Accept': 'application/json',
                            'Accept-Encoding': 'identity'
                        }
                    }
                );

                const promptsData = await strapi.entityService.findMany('api::internal-ai-prompt.internal-ai-prompt', {
                    filters: { promptType: 'Text or Code OCR' }
                })

                if (promptsData.length === 0) return ctx.send({ msg: 'No prompt data found' });

                const words = promptsData[0].inputWords;
                const textForOpenai = res.data.text !== undefined && (res.data.text.split(/\s+/).slice(0, words).join(" "));
                const prompt = promptsData[0].prompt.replace(/{Text}/g, textForOpenai);
                const openaiRes = await openai(prompt);
                let correction = openaiRes.split('Correction: ')[1];

                const createGemDetails = await strapi.service('api::gem.gem').create({
                    data: {
                        url: bodyData?.url,
                        title: bodyData.title || filename,
                        text: correction,
                        S3_link: [imgURL.includes(AWS_BUCKET) ? imgURL : `${process.env.AWS_BASE_URL}/common/images/annotated_images/${filename}`],
                        media_type: bodyData.type || "Image",
                        FileName: filename,
                        imageColor: ctx.request.query.imageColor ? color : null,
                        metaData: bodyData.metaData,
                        media: bodyData,
                        description: bodyData?.description,
                        author: ctx.state.user?.id,
                        tags: bodyData.tags,
                        showThumbnail: bodyData.showThumbnail !== undefined ? bodyData.showThumbnail : true,
                        collection_gems: bodyData?.collections,
                        is_favourite: bodyData.is_favourite,
                        remarks: bodyData.notes,
                        child_gem_id: parentImageId,
                        fileType: bodyData.fileType
                    }
                });

                /* Updating ocr-image limit into plan services */
                if (userPlan) {
                    await updatePlanService(userId, { ocr_image_used: parseInt(userPlan.ocr_image_used) + 1 })
                }

                ctx.send(createGemDetails);
                return
            }
            const createGemDetails = await strapi.service('api::gem.gem').create({
                data: {
                    url: bodyData?.url,
                    title: bodyData.title || filename,
                    text: '',
                    S3_link: [imgURL.includes(AWS_BUCKET) ? imgURL : `${process.env.AWS_BASE_URL}/common/images/annotated_images/${filename}`],
                    media_type: bodyData.type || "Image",
                    FileName: filename,
                    imageColor: ctx.request.query.imageColor ? color : null,
                    media: bodyData,
                    metaData: bodyData.metaData,
                    description: bodyData?.description,
                    author: ctx.state.user?.id,
                    tags: bodyData.tags,
                    showThumbnail: bodyData.showThumbnail !== undefined ? bodyData.showThumbnail : true,
                    collection_gems: bodyData?.collections,
                    is_favourite: bodyData.is_favourite,
                    remarks: bodyData.notes,
                    parent_gem_id: parentImageId,
                    fileType: bodyData.fileType
                }
            })

            /* Updating ocr-image limit into plan services */
            if (userPlan) {
                await updatePlanService(userId, { ocr_image_used: parseInt(userPlan.ocr_image_used) + 1 })
            }
            // getFullScreenshot(createGemDetails);
            ctx.send(createGemDetails);

        }
        else {
            ctx.send({
                message: res.error
            });
        }

        // }
        // catch (error) {
        //     ctx.send({
        //         message: error
        //     });
        // }
    },

    getImageOcr: async (ctx, next) => {
        try {
            const filter = convertRestQueryParams(ctx.request.query);

            const userId = ctx.state.user.id;

            const data = await strapi.service('api::ocr.ocrs').getImageOcr(filter.where, userId);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        };
    },

    getImageOcrById: async (ctx, next) => {
        try {
            const params = ctx.params.gemId;

            const data = await strapi.service('api::ocr.ocrs').getImageOcrById(params);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        };
    },

    updateImageOcr: async (ctx, next) => {
        try {

            const body = ctx.request.body;
            const params = ctx.params.gemId;

            const data = await strapi.service('api::ocr.ocrs').updateImageOcr(body, params);

            ctx.send(data);
        } catch (error) {
            ctx.send({ status: 400, message: error });
        };
    },

    deleteImageOcr: async (ctx, next) => {
        try {
            const params = ctx.params.gemId;

            const data = await strapi.service('api::ocr.ocrs').deleteImageOcr(params);

            ctx.send("Data Deleted");
        } catch (error) {
            ctx.send({ status: 400, message: error });
        };
    },

    fileImageToText: async (ctx, next) => {
        try {
            const userId = ctx.state.user?.id;
            const files = ctx.request.files;
            const { X_RAPIDAPI_KEY,
                AWS_BUCKET,
                AWS_ACCESS_KEY_ID,
                AWS_ACCESS_SECRET,
                AWS_REGION
            } = process.env

            /* Checking ocr-image limit before conversion image-to-text */
            let userPlan;
            if (userId) {
                userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
                    where: {
                        author: userId
                    }
                })
            }

            if (ctx.is('multipart')) {
                const file = files.image;
                const filename = Date.now() + file.name.replace(/ /g, '');
                const absolutePath = path.join(file.path);
                const options = {
                    method: 'POST',
                    url: 'https://ocr-extract-text.p.rapidapi.com/ocr',
                    headers: {
                        'content-type': 'multipart/form-data; boundary=---011000010111000001101001',
                        'X-RapidAPI-Key': X_RAPIDAPI_KEY,
                        'X-RapidAPI-Host': 'ocr-extract-text.p.rapidapi.com',
                        useQueryString: true
                    },
                    formData: {
                        image: {
                            value: fs.createReadStream(absolutePath),
                            options: { filename: absolutePath, contentType: 'application/octet-stream' }
                        }
                    }
                };

                const ocrResponse = await awaitRequest(options);
                const ocrJSON = JSON.parse(ocrResponse);

                let fileStream = fs.createReadStream(absolutePath);

                const client = new S3Client({
                    region: AWS_REGION,
                    credentials: {
                        accessKeyId: AWS_ACCESS_KEY_ID,
                        secretAccessKey: AWS_ACCESS_SECRET
                    }
                });

                const params = {
                    Bucket: AWS_BUCKET,
                    Key: `common/images/annotated_images/${filename}`,
                    Body: fileStream,
                    ContentType: file.type,
                    ACL: 'public-read'
                }
                await client.send(new PutObjectCommand(params));

                const color = ctx.request.query.imageColor ? await imageColor(`${process.env.AWS_BASE_URL}/common/images/annotated_images/${filename}`) : null;
                if (ctx.request.query.openai) {
                    const promptsData = await strapi.entityService.findMany('api::internal-ai-prompt.internal-ai-prompt', {
                        filters: { promptType: 'Text or Code OCR' }
                    });

                    const words = promptsData[0].inputWords;
                    const textForOpenai = ocrJSON.text.split(/\s+/).slice(0, words).join(" ");

                    const prompt = promptsData[0].prompt.replace(/{text}/g, textForOpenai);
                    const openaiRes = await openai(prompt);

                    let correction = openaiRes.split('Correction: ')[1];

                    const crateGem = await strapi.service('api::gem.gem').create({
                        data: {
                            title: filename,
                            text: correction,
                            S3_link: [`${process.env.AWS_BASE_URL}/common/images/annotated_images/${filename}`],
                            media_type: "Image",
                            FileName: filename,
                            imageColor: ctx.request.query.imageColor ? color : null,
                        }
                    });

                    /* Updating ocr-image limit into plan services */
                    if (userPlan) {
                        updatePlanService(userId, "ocr_image", parseInt(userPlan.ocr_image_used) + 1)
                    }


                    ctx.send(crateGem);

                } else {
                    const crateGem = await strapi.service('api::gem.gem').create({
                        data: {
                            title: filename,
                            text: ocrJSON.text.replace(/\n/g, ''),
                            S3_link: [`${process.env.AWS_BASE_URL}/common/images/annotated_images/${filename}`],
                            media_type: "Image",
                            FileName: filename,
                            imageColor: ctx.request.query.imageColor ? color : null,
                        }
                    });

                    /* Updating ocr-image limit into plan services */
                    if (userPlan) {
                        updatePlanService(userId, "ocr_image", parseInt(userPlan.ocr_image_used) + 1)
                    }

                    ctx.send(crateGem);
                }
            }
        } catch (error) {
            ctx.send({
                message: error
            });
        }

    }
};