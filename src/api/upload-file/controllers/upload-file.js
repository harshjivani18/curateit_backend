"use strict";

/**
 * upload-file controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { getBase64MimeType, getURLBufferData }    = require("../../../../utils");
const mime                     = require('mime-types');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { AWS_BUCKET, AWS_ACCESS_KEY_ID, AWS_ACCESS_SECRET, AWS_REGION } =
  process.env;
const fs = require("fs");

module.exports = createCoreController(
  "api::upload-file.upload-file",
  ({ strapi }) => ({
    uploadBase64Img: async (ctx) => {
      try {
        const { base64 } = ctx.request.body;
        const mimeType   = getBase64MimeType(base64);
        const ext        = mime.extension(mimeType);
        const splitArr   = base64.split(",");

        if (splitArr.length === 2) {
          const data = await strapi
            .service("api::upload-file.upload-file")
            .uploadFileFrombase64(splitArr[1], `common/base64-converted-imgs/${Date.now()}.${ext}`, mimeType);
  
          return ctx.send({ status: 200, message: data });
        }
        return ctx.send({ status: 400, message: "Invalid base64 string"})
      } catch (error) {
        return { status: 400, message: error };
      }
    },
    uploadFile: async (ctx, next) => {
      try {
        // if (!ctx.request.files) {
        //   return ctx.send({ msg: "No file exists" }, 400);
        // }
        const { user } = ctx.state
        const files = ctx.request?.files?.files;
        const query = ctx.request.query;

        // const filesSelect =
        //   files?.length && files.length > 0 ? "mutiple" : "single";

        // if (filesSelect === "single" && (!files?.name || !files?.size)) {
        //   return ctx.send({ msg: "No file exists" }, 400);
        // }

        const data = await strapi
          .service("api::upload-file.upload-file")
          .uploadFile(files, query, user);

        ctx.send(data);
      } catch (error) {
        ctx.send(error);
      }
    },

    uploadFileWithBuffer: async (ctx, next) => {
      try {
        const buffer = ctx.request.body.base64;
        const query = ctx.request.query;

        const data = await strapi
          .service("api::upload-file.upload-file")
          .uploadFileWithBuffer(buffer, query);

        ctx.send({ status: 200, message: data });

      } catch (error) {
        return { status: 400, message: error };
      }
    },

    deleteFile: async (ctx) => {
      try {
        const path = ctx.request.query.path;

        const data = await strapi
          .service("api::upload-file.upload-file")
          .deleteFile(path);

        ctx.send({ status: 200, message: "File is deleted" });

      } catch (error) {
        return { status: 400, message: error };
      }
    },

    uploadIcon: async (ctx) => {
      try {
        const file = ctx.request?.files?.file;
        const userId = ctx.state.user.id;
        const fileLink = ctx.request.body.fileLink;
        const base64 = ctx.request.body.base64;
        const query = ctx.request.query;
        const data = await strapi
          .service("api::upload-file.upload-file")
          .uploadIcon(file, userId, fileLink, base64, query);

        ctx.send({ status: 200, message: data });
      } catch (error) {
        return { status: 400, message: error };
      }
    },

    sidebarIcon: async (ctx) => {
      try {
        const { user } = ctx.state;
        const { file } = ctx.request.body;

        if (!user) {
          ctx.send("Unauthorized user")
          return
        }

        const data = await strapi.service("api::upload-file.upload-file").sidebarIcon(file, user);
        ctx.send({ message: data });
      } catch (error) {
        ctx.send({ message: error });
      }
    },

    
    uploadAllFiles: async (ctx) => {
      try {
        const { user } = ctx.state;
        const { file } = ctx.request.body;
        const localFile = ctx.request.files.file;

        const fileObj      = localFile;
        let filename;
        let fileStream;
        let URLData;
        if (localFile) {
          filename     = fileObj.name.replace(/ /g, "");
          fileStream     = fs.readFileSync(fileObj.path);
        } else {
          URLData = await getURLBufferData(file);
          filename = URLData.filename
        }

        const client = new S3Client({
          region: AWS_REGION,
          credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_ACCESS_SECRET,
          },
        });

        const params = {
          Bucket: AWS_BUCKET,
          Key: `common/users/${user.id}/bot-uploaded-files/${filename}`,
          Body: localFile ? fileStream : URLData.data,
          ContentType: localFile ? fileObj?.type : URLData.header,
          ACL: "public-read",
        };

        await client.send(new PutObjectCommand(params))
        return `${process.env.AWS_BASE_URL}/common/users/${user.id}/bot-uploaded-files/${filename}`; 
        
      } catch (error) {
        ctx.send({status: 400, message: error.message})
      }
    },

   
  })
);
