'use strict';

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getURLBufferData } = require('../../../../utils');
const path = require('path');
const fs = require("fs");

/**
 * gem controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { AWS_BUCKET, AWS_ACCESS_KEY_ID, AWS_ACCESS_SECRET, AWS_REGION, AWS_BASE_URL } = process.env;

const mediatypeObj = {
  "ai prompt": "Ai Prompt",
  "app": "App",
  "article": "Article",
  "audio": "Audio",
  "book": "Book",
  "code": "Code",
  "email newsletter": "Email Newsletter",
  "epub": "Epub",
  "highlight": "Highlight",
  "image": "Image",
  "link": "Link",
  "linkedin": "LinkedIn",
  "movie": "Movie",
  "note": "Note",
  "pdf": "PDF",
  "citation": "Citation",
  "podcast": "Podcast",
  "product": "Product",
  "profile": "Profile",
  "quote": "Quote",
  "rss": "RSS",
  "screenshot": "Screenshot",
  "socialfeed": "SocialFeed",
  "testimonial": "Testimonial",
  "text expander": "Text Expander",
  "video": "Video"
}

const saveFiles = async (id, file) => {

  const absolutePath = path.join(file.path);
  const filename = Date.now() + file.name.replace(/ /g, "");
  const fileStream = fs.createReadStream(absolutePath);
  const type = file.type;

  const client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_ACCESS_SECRET,
    },
  });

  const params = {
    Bucket: AWS_BUCKET,
    Key: `common/users/${id}/bot-uploaded-files/${filename}`,
    Body: fileStream,
    ContentType: type,
    ACL: "public-read",
  };

  await client.send(new PutObjectCommand(params))
  return `${process.env.AWS_BASE_URL}/common/users/${id}/bot-uploaded-files/${filename}`;
}

module.exports = createCoreController('api::gem.gem', ({ strapi }) => ({

  async createGemFromAIPrompt(ctx) {
    try {
      const { user } = ctx.state;
      const { body,
        files } = ctx.request;
      const { id,
        unfiltered_collection } = user
      const {
        title,
        description,
        url,
        tags
      } = body;
      let { type, media, metadata } = body;
      let tagids = [];

      type = type.toLowerCase()

      if (files) {
        const s3Link = await saveFiles(id, files.files)

        if (type === 'audio') media.audioLink = s3Link
        if (type === 'video') media.videoLink = s3Link
        if (type === 'pdf') media.pdfLink = s3Link
        if (type === 'image') {
          media.imageLink = s3Link
          metadata.covers = [s3Link]
        }

      }

      if (tags && /^[a-zA-Z]/.test(tags)) {
        for (let i = 0; i < tags?.length; i++) {
          const existingTag = await strapi.db.query('api::tag.tag').findOne({
            where: {
              tag: tags[i],
              users: id
            }
          })
          if (existingTag !== null) { tagids.push(existingTag.id) }
          else {
            const addTag = await strapi.db.query('api::tag.tag').create({
              data: {
                tag: tags[i],
                users: id,
                publishedAt: new Date().toISOString()
              }
            })
            tagids.push(addTag.id);
          }
        }
      }

      if (!mediatypeObj[type]) {
        return ctx.send({ status: 400, message: `media type should be ${Object.keys(mediatypeObj)} ` })
      }

      const gem = await strapi.entityService.create("api::gem.gem", {
        data: {
          title,
          description,
          url,
          media_type: mediatypeObj[type],
          collection_gems: unfiltered_collection,
          author: id,
          metaData: metadata,
          media,
          tags: tagids,
          publishedAt: new Date().toISOString(),

        }
      })

      return ctx.send({ status: 200, data: gem })
    }
    catch (e) {
      return ctx.send({ status: 400, message: e })
    }
  }
}))