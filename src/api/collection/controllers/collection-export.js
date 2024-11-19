'use strict';

const { prepareRequireCollectionData, exportCollectionData } = require('../services/collection-service');

const { createCoreController } = require('@strapi/strapi').factories;
const excelJS = require("exceljs");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { AWS_BUCKET, AWS_ACCESS_KEY_ID, AWS_ACCESS_SECRET, AWS_REGION } =
    process.env;

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    async collectionExport(ctx) {
        try {
            const { id } = ctx.state.user;
            const { collectionId } = ctx.params;

            const collections = await strapi.entityService.findMany("api::collection.collection", {
                filters: { author: id },
                fields: ["id", "name", "slug"],
                populate: {
                    gems: {
                        fields: ["id", "title", "description", "url", "slug", "isPending", "isApproved"],
                        populate: {
                            author: {
                                fields: ["id", "username"]
                            }
                        }
                    },
                    collection: {
                        fields: ["id", "name", "slug"]
                    },
                    parent_collection: {
                        fields: ["id", "name", "slug"]
                    },
                    author: {
                        fields: ["id", "username"]
                    }
                }
            });

            const mainCollection    = collections?.filter((c) => {
                return parseInt(c.id) === parseInt(collectionId)
            })

            const finalCollection   = await prepareRequireCollectionData(mainCollection[0], collections)

            const workbook = new excelJS.Workbook();
            const path = `common/users/${id}/exportfile/${finalCollection[0].name}-${new Date().getTime()}.xlsx`;
            
            exportCollectionData(finalCollection[0], workbook, parseInt(collectionId))

            // Save workbook to buffer
            const buffer = await workbook.xlsx.writeBuffer();

            // Upload to S3
            const client = new S3Client({
                region: AWS_REGION,
                credentials: {
                    accessKeyId: AWS_ACCESS_KEY_ID,
                    secretAccessKey: AWS_ACCESS_SECRET,
                },
            });

            const params = {
                Bucket: AWS_BUCKET,
                Key: path,
                Body: buffer,
                ACL: "public-read",
            };

            await client.send(new PutObjectCommand(params));

            ctx.send({
                status: 200,
                message: "File successfully exported",
                path: `${process.env.AWS_BASE_URL}/${path}`,
            });
        } catch (error) {
            ctx.send({ status: 400, error: error.message });
        }
    }

}))