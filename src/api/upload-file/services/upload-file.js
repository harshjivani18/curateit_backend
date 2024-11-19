"use strict";

/**
 * upload-file service
 */

const { createCoreService } = require("@strapi/strapi").factories;
const path = require("path");
const fs = require("fs");
const url = require("url");
const https = require("https");
const sharp = require('sharp');
const { PutObjectCommand, S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { AWS_BUCKET, AWS_ACCESS_KEY_ID, AWS_ACCESS_SECRET, AWS_REGION } =
  process.env;

const getImage = (imageURL) => {
  return new Promise((resolve, reject) => {
    https.get(imageURL, (res) => {
      const data = [];
      res.on('data', function (chunk) {
        data.push(chunk);
      }).on('end', function () {
        const buffer = Buffer.concat(data);
        resolve(buffer);
      });
    })
  })
};

const buffer = (filePath) => {
  return fs.readFileSync(filePath);
};

const resize = (data) => {
  return new Promise((resolve, reject) => {
    let resizedIcon = sharp(data)
      .resize(256, 256)
      .toBuffer()

    resolve(resizedIcon);
  })
};

module.exports = createCoreService(
  "api::upload-file.upload-file",
  ({ strapi }) => ({
    uploadFile: async (files, query, user) => {
      const filesSelect = files?.length ? "mutiple" : "single";
      const collectionId = query.collectionId;
      const tagId = query.tagId;
      const userId = user.id;

      let folderPath = 'common/images/bookmark_images';
      if (query.isFeedbackImg === 'true') {
        folderPath = 'common/images/feedback_images';
      } else if (query.isFeedbackDoc === 'true') {
        folderPath = 'common/files/feedback_doc';
      } else if (query.isCollectionCover === 'true') {
        folderPath = `collection/${collectionId}/cover`
      } else if (query.isSidebarApp === 'true') {
        folderPath = `sidebar/${userId}/icon`
      } else if (query.isProfile === 'true') {
        folderPath = `common/users/${userId}/profile`
      } else if (query.isProfileCover === 'true') {
        folderPath = `common/users/${userId}/cover`
      } else if (query.isTagCover === 'true') {
        folderPath = `tag/${tagId}/cover`
      }

      if (filesSelect === "single") {
        const fileObj = files;
        let filename;
        let fileStream;
        let type;

        if (files) {
          const absolutePath = path.join(fileObj.path);
          filename = Date.now() + fileObj.name.replace(/ /g, "");
          fileStream = fs.createReadStream(absolutePath);
          type = fileObj.type;
        } else if (query.fileLink) {
          fileStream      = await getImage(query.fileLink);
          const parsed    = url.parse(query.fileLink);
          const basePath  = path.basename(parsed.pathname).replace(/ /g, '')
          const baseArr   = basePath.split('.');
          const fileExt   = baseArr.length > 1 ? basePath.split('.').pop() : null;
          console.log('fileExt', fileExt, baseArr)
          type            = fileExt ? `image/${fileExt}` : "image/jpg";
          filename        = !fileExt && basePath.indexOf(".") === -1 ? `${basePath}.jpg` : basePath;
          console.log('filename', filename, type)
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
          Key: `${folderPath}/${filename}`,
          Body: fileStream,
          ContentType: type,
          ACL: "public-read",
        };
        await client.send(new PutObjectCommand(params));
        const uploadedfile = await strapi.service("api::gem.gem").create({
          data: {
            media: [
              `${process.env.AWS_BASE_URL}/${folderPath}/${filename}`,
            ],
          },
        });

        return uploadedfile;
      } else {
        const filesPath = [];
        for (const fileObj of files) {
          const absolutePath = path.join(fileObj.path);
          const filename = Date.now() + fileObj.name.replace(/ /g, "");
          let fileStream = fs.createReadStream(absolutePath);

          const client = new S3Client({
            region: AWS_REGION,
            credentials: {
              accessKeyId: AWS_ACCESS_KEY_ID,
              secretAccessKey: AWS_ACCESS_SECRET,
            },
          });

          const params = {
            Bucket: AWS_BUCKET,
            Key: `${folderPath}/${filename}`,
            Body: fileStream,
            ContentType: fileObj.type,
            ACL: "public-read",
          };

          await client.send(new PutObjectCommand(params));
          filesPath.push(
            `${process.env.AWS_BASE_URL}/${folderPath}/${filename}`
          );
        }
        const uploadedfile = await strapi.service("api::gem.gem").create({
          data: {
            media: filesPath,
          },
        });
        return uploadedfile;
      }
    },

    uploadFileWithBuffer: async (buffer, query) => {
      try {
        let folderPath;
        if (query.isScreenshotImg === 'true') {
          folderPath = 'common/images/screenshot_images';
        };

        const base64Data = new Buffer.from(buffer.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const type = buffer.split(';')[0].split('/')[1];

        const {
          AWS_BUCKET,
          AWS_ACCESS_KEY_ID,
          AWS_ACCESS_SECRET,
          AWS_REGION
        } = process.env;

        const client = new S3Client({
          region: AWS_REGION,
          credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_ACCESS_SECRET
          }
        });

        const filename = 'screenshot' + Date.now()
        const params = {
          Bucket: AWS_BUCKET,
          Key: `${folderPath}/${filename}`,
          Body: base64Data,
          ACL: 'public-read',
          ContentType: `image/${type}`,
        };
        await client.send(new PutObjectCommand(params));

        return [`${process.env.AWS_BASE_URL}/${folderPath}/${filename}`];
      } catch (error) {
        return error;
      }
    },

    deleteFile: async (path) => {
      try {
        const AWS_BASE_URL = 'https://curateit-files.s3.amazonaws.com/';
        const filePath = path.replace(AWS_BASE_URL, '');

        const client = new S3Client({
          region: AWS_REGION,
          credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_ACCESS_SECRET,
          },
        });

        const params = {
          Bucket: AWS_BUCKET,
          Key: filePath,
          ACL: "public-read",
        };

        const data = await client.send(new DeleteObjectCommand(params));

        return data;
      } catch (error) {
        return error;
      }
    },

    uploadIcon: async (file, userId, fileLink, base64, query) => {
      try {

        const id = userId;
        let folderPath = `common/users/${id}/icons`;
        if(query.isTagIcon === "true") folderPath = `tag/${id}/cover`
        if(query.isTelegram === "true") folderPath = `common/users/${id}/social`

        let filename;
        let fileStream;
        let type;

        if (file != undefined) {
          
          const absolutePath = path.join(file.path);
          filename = file.name.replace(/ /g, "");
          fileStream = buffer(file.path);
          type = file.type;

        } else if (fileLink != undefined) {

          fileStream = await getImage(fileLink);
          const parsed = url.parse(fileLink);
          filename = path.basename(parsed.pathname).replace(/ /g, '');
          type = filename.split('.').pop();

        } else if (base64 != undefined) {

          filename = Date.now() + 'icon';
          fileStream = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
          type = base64.split(';')[0].split('/')[1];

        }

        let iconData = fileStream
        if (query.isIcon !== "false") {
          iconData = await resize(fileStream);
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
          Key: `${folderPath}/${filename}`,
          Body: iconData,
          ContentType: type,
          ACL: "public-read",
        };
        await client.send(new PutObjectCommand(params));

        return `${process.env.AWS_BASE_URL}/${query.w && query.h ? `${folderPath}/${query.w}x${query.h}` : folderPath}/${filename}`;
      } catch (error) {
        return error;
      }
    },

    storeImageScreenshot: (file, key) => {
      const client = new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_ACCESS_SECRET,
        },
      });

      const fileObj      = file;
      const absolutePath = path.join(fileObj.path);
      const filename     = fileObj.name.replace(/ /g, "");
      let fileStream     = fs.createReadStream(absolutePath);
      const params = {
        Bucket: AWS_BUCKET,
        Key: `${key}/${filename}`,
        Body: fileStream,
        ContentType: fileObj.type,
        ACL: "public-read",
      };
      client.send(new PutObjectCommand(params))
      return `${process.env.AWS_BASE_URL}/${key}/${filename}`
    },

    uploadFileFrombase64: async (base64, key, cType = "image/jpeg") => {
      const client = new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_ACCESS_SECRET,
        },
      });
      const params = {
        Bucket: AWS_BUCKET,
        Key: key,
        Body: Buffer.from(base64, 'base64'),
        ContentEncoding: 'base64',
        ContentType: cType
      }

      await client.send(new PutObjectCommand(params));
      return `${process.env.AWS_BASE_URL}/${params.Key}`;
    },

    sidebarIcon: async (file, user) => {
      let fileBuffer = await getImage(file);
      const folderPath = `sidebar/${user.id}/icon`;
      const parsed = url.parse(file);
      const filename = path.basename(parsed.pathname).replace(/ /g, '');

      const client = new S3Client({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_ACCESS_SECRET,
        },
      });
      const params = {
        Bucket: AWS_BUCKET,
        Key: `${folderPath}/${filename}`,
        Body: fileBuffer,
        ACL: "public-read",
      }

      await client.send(new PutObjectCommand(params));

      return `${process.env.AWS_BASE_URL}/${folderPath}/${filename}`
    }
  })
);
