const { createCoreController } = require('@strapi/strapi').factories;
const { default: axios } = require("axios");
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const mql = require("@microlink/mql");
const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");

const microlinkRes = (url) => {
    return new Promise((resolve, reject) => {
        mql(url, {
            apiKey: process.env.MICROLINK_API_KEY,
            meta: false,
            data: {
                html: {
                    selector: "html",
                },
            },
        }).then((res) => {
            resolve(res?.data?.html)
        }).catch((err) => {
            resolve(null)
        })
    });
};

const getHtmlText = (htmlText, url) => {
    const dom = new JSDOM(htmlText, { url })
    const doc = dom.window.document
    const lazyImgs = doc.querySelectorAll("img")
    if (lazyImgs.length !== 0) {
        Array.from(lazyImgs).forEach((e) => {
            e.removeAttribute("loading")
        })
    }
    const reader    = new Readability(doc)
    const article   = reader.parse()
    return article
}

module.exports = createCoreController('api::gem.gem', ({ strapi }) => ({

    getSingleFile: async (ctx) => {
        try {
            const { user }      = ctx.state;
            const { gemId }     = ctx.request.params;
            const { refresh }   = ctx.request.query
            const gemData = await strapi.entityService.findOne("api::gem.gem", gemId, {
                fields: ["url", "html_file_link", "slug"]
            })
            if (gemData?.html_file_link && !refresh) {
                const { 
                    AWS_REGION, 
                    AWS_ACCESS_KEY_ID,
                    AWS_ACCESS_SECRET,
                    AWS_BASE_URL,
                    AWS_BUCKET
                } = process.env
                const client = new S3Client({
                    region: AWS_REGION,
                    credentials: {
                        accessKeyId: AWS_ACCESS_KEY_ID,
                        secretAccessKey: AWS_ACCESS_SECRET,
                    },
                });
                const params = {
                    Bucket: AWS_BUCKET,
                    Key: gemData?.html_file_link?.replace(`${AWS_BASE_URL}/`, ""),
                }
                const htmlContent = await client.send(new GetObjectCommand(params))
                const htmlText    = await htmlContent?.Body?.transformToString()
                return ctx.send({ status: 200, s3Link: gemData.html_file_link, data: htmlText })
            }
            const html = await microlinkRes(gemData.url);
            if (html && user) {
                const uploadedFile = await strapi.service('api::gem.reader-view').uploadSingleFile(user.id, html)

                await strapi.entityService.update("api::gem.gem", gemId, {
                    data: {
                        html_file_link: uploadedFile
                    }
                })
                ctx.send({ status: 200, s3Link: uploadedFile, data: html })
            } else {
                ctx.send({ status: 400, message: error })
            }
        } catch (error) {
            console.log("error====>", error);
            ctx.send({ status: 400, message: error })
        }
    },

    setArticleContent: async (ctx) => {
        const { articleBody,
                url }           = ctx.request.body
        if (!url) {
            return ctx.send({ status: 400, message: "Details not found!" })
        }

        const articleText = await strapi.entityService.create("api::domain-manager.domain-manager", {
            data: {
                articleDetails: getHtmlText(articleBody, url),
                url,
                media_type: "Article",
                publishedAt: new Date().toISOString()
            }
        });

        return ctx.send(articleText)

    },

    getArticle: async (ctx) => {
        try {
            const { url } = ctx.request.query;
            if (!url) {
                return ctx.send({ status: 400, message: error })
            }

            const entries = await strapi.entityService.findMany("api::domain-manager.domain-manager", {
                fields: ["id", "articleDetails"],
                filters: {
                    url
                }
            })
            if (entries.length !== 0) {
                const o = entries[0]
                if (o.articleDetails) {
                    return ctx.send({ status: 200, article: o.articleDetails })
                }
                const mRes = await microlinkRes(url)
                const aObj = getHtmlText(mRes, url)
                await strapi.entityService.update("api::domain-manager.domain-manager", o.id, {
                    data: {
                        articleDetails: aObj
                    }
                })
                return ctx.send({ status: 200, article: aObj })
            }

            const microRes   = await microlinkRes(url)
            const articleObj = getHtmlText(microRes, url)
            await strapi.entityService.create("api::domain-manager.domain-manager", {
                data: {
                    url,
                    media_type: "Article",
                    articleDetails: articleObj,
                    publishedAt: new Date().toISOString()
                }
            })
            return ctx.send({ status: 200, article: articleObj })
        } catch (error) {
            console.log("error====>", error);
            return ctx.send({ status: 400, message: error })
        }
    },

    // getArticle: async (ctx) => {
    //     try {
    //         const { url } = ctx.request.query;
    //         if (!url) {
    //             ctx.send({ status: 400, message: error })
    //         }

    //         const response = await axios.get(url);
    //         const dom = new JSDOM(response.data, { url: url });
    //         const doc = dom.window.document
    //         const lazyImgs = doc.querySelectorAll("img")
    //         console.log("Lzy img===>", lazyImgs.length)
    //         if (lazyImgs.length !== 0) {
    //             Array.from(lazyImgs).forEach((e) => {
    //                 e.removeAttribute("loading")
    //                 // const sources = e.querySelectorAll("source")
    //                 // console.log(e.querySelector("img"))
    //                 // console.log("Sources ===>", sources.length)
    //                 // Array.from(sources).forEach((s) => {
    //                 //     s.remove()
    //                 // })
    //             })
    //         }
    //         const reader = new Readability(doc);
    //         const article = reader.parse();

    //         ctx.send({ status: 200, article })


    //     } catch (error) {
    //         console.log("error====>", error);
    //         ctx.send({ status: 400, message: error })
    //     }
    // },

    fetchYoutubeTranscript: async (ctx) => {
        try{
            const { url } = ctx.request.query;

            const response = await fetch(url);
            const videoPageHtml = await response.text();

            const splittedHtml = videoPageHtml.split('"captions":')
            if (splittedHtml.length < 2) { 
                return ctx.send({ status: 200, langs: [] })
             }
    
            const captions_json = JSON.parse(splittedHtml[1].split(',"videoDetails')[0].replace('\n', ''));

            const captionTracks = captions_json.playerCaptionsTracklistRenderer.captionTracks;
            
            const languageOptions = Array.from(captionTracks).map(i => { return i.name.simpleText; })
    
            const first = "English";
            languageOptions.sort(function (x, y) { return x.includes(first) ? -1 : y.includes(first) ? 1 : 0; });
            languageOptions.sort(function (x, y) { return x == first ? -1 : y == first ? 1 : 0; });
    
            const resData =  Array.from(languageOptions).map((langName, index) => {
                const link = captionTracks.find(i => i.name.simpleText === langName).baseUrl;
                return {
                    language: langName,
                    link: link
                }
            })
            ctx.send({ status: 200, langs: resData })
        }catch(error){
            ctx.send({ status: 400, message: error})
        }
    }
}))