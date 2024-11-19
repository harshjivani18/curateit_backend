'use strict';

/**
 * gem service
*/
const { S3Client, PutObjectCommand }    = require('@aws-sdk/client-s3');
const { getPathExtension }              = require('../../../../utils');
const { default: axios }                = require('axios');
const { createCoreService }             = require('@strapi/strapi').factories;
const mime                              = require('mime-types');

module.exports = createCoreService('api::gem.gem', ({strapi}) => ({
    updateSaveImg(url, gemId, userId) {
        const {
            AWS_BUCKET,
            AWS_ACCESS_KEY_ID,
            AWS_ACCESS_SECRET,
            AWS_BASE_URL,
            AWS_REGION
        }                       = process.env;
        const ext               = getPathExtension(url);
        const filename          = `${Date.now()}.${!ext || ext.length > 4 ? 'jpg' : ext}`;
        if (!url.includes(AWS_BUCKET)) {
            axios.get(url, { "responseType": "arraybuffer" })
            .then(body => {
                
                const client = new S3Client({
                    region: AWS_REGION,
                    credentials: {
                        accessKeyId: AWS_ACCESS_KEY_ID,
                        secretAccessKey: AWS_ACCESS_SECRET
                    }
                });
                const params = {
                    Bucket: AWS_BUCKET,
                    Key: `users/${userId}/gems/${gemId}/${filename}`,
                    Body: body.data,
                    ACL: 'public-read',
                    ContentType: body.headers['content-type']
                }
                client.send(new PutObjectCommand(params))
            })
            return `${AWS_BASE_URL}/users/${userId}/gems/${gemId}/${filename}`;
        }
        return null
    }
}));
