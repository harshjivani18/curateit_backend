'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");

const { AWS_BUCKET, AWS_ACCESS_KEY_ID, AWS_ACCESS_SECRET, AWS_REGION, PROD_OPENAI_API_KEY } =
process.env;

const readFileForOpenAI = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the CSV file:', err);
                resolve(500);
            }
            resolve(data);
        });
    })
}

module.exports = createCoreController('api::collection.collection', ({ strapi }) => ({

    async collectionImport(ctx) {
        try {
            const { id } = ctx.state.user;
            const file = ctx?.request?.files?.file;
            const { links } = ctx.request.body;
            let s3Path = null;
            let completePrompt = null;

            if (!file) {               
                const prompt = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
                    where: { promptType: 'Import with text' }
                })
                completePrompt = prompt ? prompt : `**Prompt**: ''' Parse links from the text and extract the bookmarks. The output should be a JSON array with fields: url, title, description, favicon, thumbnail, and remarks. If title or description is empty create an appropriate title. Also assign an appropriate media type from options provided for each. If collection not available create new folder Name with Import and today's date and assign all gems into it. Keep Parent Collection empty if not provided. Authorid should be same on all based on one provided. Also Content: url,title, tag, description, media type, favicon, thumbnail, remarks, Collection, Parent Collection, remarks. **Response**: [ { "url": "", "title": "Example Title","Tags": "Example Tags", "Collection": "Example Collection", "MediaType": "Link, Audio, Video, Highlight, Code, Image, Screenshot, PDF, Text Expander, Ai Prompt, Movie, Book, Citation, App, Blog, Article, Note, Quote, Product, Testimonial, Social Feed", "description": "Example description", "favicon": "", "thumbnail": "", "remarks": "Additional notes or tags", authorId:"example AuthorID", }, ... ] If no hyperlinks are found, respond with {"status": 400, "error": "No valid hyperlinks found"}. Recognize links in various formats such as monday.com, https://monday.com, www.monday.com, and https://www.monday.com. Here is the content: ${links}. Ensure that the JSON response contains only the array of objects and not the surrounding text or explanations. if there are any other surrounding text or explanations please remove it.'''`
            } else {
                // upload file to s3 bucket
                const filename     = file.name.replace(/ /g, "");
                const fileStream   = await fs.readFileSync(file.path);
                let ext = "txt";
                const lastIndex = file.name.lastIndexOf(".");
                if (lastIndex !== -1 && lastIndex !== 0) {
                    ext = file.name.substring(lastIndex);
                }
    
                s3Path = `common/users/${id}/importfile/${file?.name}-${new Date().getTime()}${ext}`;
    
                const client = new S3Client({
                    region: AWS_REGION,
                    credentials: {
                        accessKeyId: AWS_ACCESS_KEY_ID,
                        secretAccessKey: AWS_ACCESS_SECRET,
                    },
                });
                const params = {
                    Bucket: AWS_BUCKET,
                    Key: s3Path,
                    Body: fileStream,
                    ContentType: file?.type,
                    ACL: "public-read",
                };
                await client.send(new PutObjectCommand(params));
    
                const data = await readFileForOpenAI(file.path);
                if (data === 500) {
                    return ctx.send({ status: 500, error: "Error reading the file" });
                }

                const prompt = await strapi.db.query('api::internal-ai-prompt.internal-ai-prompt').findOne({
                    where: { promptType: 'Import with .csv or .txt file' }
                })

                completePrompt = prompt ? prompt : `{ "fileType": "csv/text/json", "authorId": ${id}, "content": "${data.replace(/\n/g, '\\n').replace(/"/g, '\\"')}" } **Prompt**: ''' Parse the following filetype content and extract the bookmarks. The output should be a JSON array with fields: url, title, description, favicon, thumbnail, and remarks. If title or description is empty create an appropriate title. Also assign an appropriate media type from options provided for each. If collection not available create new folder Name with Import and todays date and assign all gems into it. Keep Parent Collection empty if not provided. Authorid should be same on all based on one provided. Also Content: url,title, tag, description, media type, favicon, thumbnail, remarks, Collection, Parent Collection, remarks ''' **Response**: [ { "url": "", "title": "Example Title","Tags": "Example Tags", "Collection": "Example Collection", "MediaType": "Link, Audio, Video, Highlight, Code, Image, Screenshot, PDF, Text Expander, Ai Prompt, Movie, Book, Citation, App, Blog, Article, Note, Quote, Product, Testimonial, Social Feed", "description": "Example description", "favicon": "", "thumbnail": "", "remarks": "Additional notes or tags", authorId:"example AuthorID", }, ... ]. Ensure that the JSON response contains only the array of objects and not the surrounding text or explanations. if there are any other surrounding text or explanations please remove it.`
            }


            const { Configuration, OpenAIApi } = require("openai");
    
            const configuration = new Configuration({
                apiKey: PROD_OPENAI_API_KEY,
            });
            const openai = new OpenAIApi(configuration);
            let completion = null;
            try {
                completion = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: completePrompt }],
                }, { responseType: "json" })

                const finalResult = completion?.data?.choices[0]?.message?.content?.replace(/```json/g, '').replace(/```/g, '').replace(/'/g, '');

                // if (JSON.parse(completion?.data?.choices[0]?.message?.content)?.status === 400) {
                if (JSON.parse(finalResult)?.status === 400) {
                    return ctx.send({
                        status: 400,
                        message: "No valid hyperlinks found",
                    });
                }

                return ctx.send({
                   status: 200,
                   message: "File successfully exported",
                   path: file ? `${process.env.AWS_BASE_URL}/${s3Path}` : "",
                   data: JSON.parse(finalResult)
               });
            } catch (error) {
                console.log("Openai Error ====>", error?.response?.data?.error, "userId ===>", id, "s3Path ===>", `${process.env.AWS_BASE_URL}/${s3Path}`, completion?.data?.choices[0]?.message?.content);
                return ctx.send({ status: 400, error: error?.response?.data?.error });
            }


        } catch (error) {
            ctx.send({ status: 400, error: error.message });
        }
    }

}))