'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const { AWS_BUCKET, AWS_ACCESS_KEY_ID,
    AWS_ACCESS_SECRET, AWS_REGION } = process.env;
const path = require("path");
const fs = require("fs");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

module.exports = createCoreService('api::gem.gem', ({ strapi }) => ({
    uploadSingleFile: (userId, files) => {
        const client = new S3Client({
            region: AWS_REGION,
            credentials: {
                accessKeyId: AWS_ACCESS_KEY_ID,
                secretAccessKey: AWS_ACCESS_SECRET,
            },
        })
        
        const fileObj = files;
        const filename = new Date().getTime() + '.html';
        const params = {
            Bucket: AWS_BUCKET,
            Key: `common/html-file/${userId}/${filename}`,
            Body: fileObj,
            ContentType: "text/html",
            ACL: "public-read",
        };

        return new Promise((resolve, reject) => {
            client.send(new PutObjectCommand(params)).then((res) => {
                resolve(`${process.env.AWS_BASE_URL}/common/html-file/${userId}/${filename}`)
            });
        })
    }
}));
