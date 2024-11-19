'use strict';
const axios = require("axios")
const { PutObjectCommand,
    S3Client } = require("@aws-sdk/client-s3");
const { openai } = require('../../../../utils');

/**
 * domain-details service
 */
module.exports = () => ({

    storeImageInS3: (userId, filename, header, data) => {
        const {
            AWS_BUCKET,
            AWS_ACCESS_KEY_ID,
            AWS_ACCESS_SECRET,
            AWS_REGION,
            AWS_BASE_URL
        }                       = process.env;
        
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
            Key: `users/${userId}/images/${filename}`,
            Body: data,
            ACL: 'public-read',
            ContentType: header
        }
        client.send(new PutObjectCommand(params));

        return `${AWS_BASE_URL}/users/${userId}/images/${filename}`
    },

    getOCRDetailsFromImage: async (url) => {
        const { 
            X_RAPIDAPI_KEY,
            AWS_BASE_URL,
            AWS_S3_BUCKET_BASE_URL
         }    = process.env;
        const res                   = await axios.get(`https://ocr-extract-text.p.rapidapi.com/ocr?url=${url.startsWith(AWS_BASE_URL) ? url.replace(AWS_BASE_URL, AWS_S3_BUCKET_BASE_URL) : url}`,
            {
                headers: {
                    'X-RapidAPI-Key': X_RAPIDAPI_KEY,
                    'X-RapidAPI-Host': 'ocr-extract-text.p.rapidapi.com',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'identity',
                    'Access-Control-Allow-Origin': "*"
                }
            }
        );

        const promptsData = await strapi.entityService.findMany('api::internal-ai-prompt.internal-ai-prompt', {
            filters: { promptType: 'Text or Code OCR' }
        })

        if (promptsData.length === 0) return 404;

        const words = promptsData[0].inputWords;
        const textForOpenai = res.data.text !== undefined && (res.data.text.split(/\s+/).slice(0, words).join(" "));
        const prompt = promptsData[0].prompt.replace(/{Text}/g, textForOpenai);
        const openaiRes = await openai(prompt);

        return openaiRes.split('Correction: ')[1];
    },

    getImageToText: (url) => {
        console.log("URL")
    },

    getImageOcr: async (params, userId) => {
        try {

            let queryURL;
            params.map(data => queryURL = data.value.endsWith('/') ? data.value.slice(0, -1) : data.value);

            const imageOcrData = await strapi.entityService.findMany('api::gem.gem', {
                filters: { url: queryURL, author: userId, media_type: "Image" }
            });

            let result = imageOcrData.map(({ id, media }) => ({ id, media })).flat(Infinity);

            return result;
        } catch (error) {
            console.log(error);
        }
    },

    getImageOcrById: async (gemId) => {
        try {
            const imageOcrGem = await strapi.entityService.findOne('api::gem.gem', gemId, {
                populate: '*'
            });

            return imageOcrGem
        } catch (error) {
            console.log(error);
        }
    },

    updateImageOcr: async (body, gemId) => {
        try {

            const obj = {
                media: body,
                title: body.title,
                description: body.description,
                collection_gems: body.collections,
                is_favourite: body.is_favourite,
                remarks: body.notes
            }

            if (body.tags) {
                obj["tags"] = body.tags
            }

            const imageOcrGem = await strapi.entityService.update('api::gem.gem', gemId, {
                data: {
                    media: body,
                    title: body.title,
                    description: body.description,
                    tags: body.tags,
                    collection_gems: body.collections,
                    is_favourite: body.is_favourite,
                    remarks: body.notes
                }
            });

            return imageOcrGem;
        } catch (error) {
            console.log(error);
        }
    },

    deleteImageOcr: async (gemId) => {
        try {
            const imageOcrGem = await strapi.entityService.delete('api::gem.gem', gemId);

            return imageOcrGem;
        } catch (error) {
            console.log(error);
        }
    },
})