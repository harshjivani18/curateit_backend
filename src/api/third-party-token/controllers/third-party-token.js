'use strict';

/**
 * third-party-token controller
 */
const request = require('request');
const querystring = require('querystring');
const axios = require('axios');
const { RAINDROP_CLIENT_ID,
    RAINDROP_CLIENT_SECRET,
    RAINDROP_REDIRECT_URI
} = process.env;
const { createCoreController } = require('@strapi/strapi').factories;

const awaitRequest = (options) => {
    return new Promise((resolve, reject) => {
        request(options, function (error, response, body) {
            if (error) {
                // console.log(error, response, body)
                reject(error);
            }
            resolve(body);
        });
    });
};

const removeDuplicateRecords = (data) => {
    const uniqueData = [];
    data.forEach((d) => {
        const index = uniqueData.findIndex((o) => o.link === d.link && o.collections === d.collections);
        if (index === -1) {
            uniqueData.push(d);
        }
    })
    return uniqueData;
}

const parentLinks = (data, userId) => {
    return data.map((o) => {
        return new Promise((resolve, reject) => {
            strapi.entityService.findMany("api::gem.gem", {
                filters: {
                    url: o.link,
                    author: userId,
                    collection_gems: o.collections
                }
            }).then((existParent) => {
                if (existParent.length === 0) {
                    strapi.entityService.create("api::gem.gem", {
                        data: {
                            url: o.link,
                            title: o.title,
                            description: o.description,
                            media_type: "Link",
                            author: userId,
                            collection_gems: o.collections,
                            metaData: o.metaData,
                            tags: o.tags,
                            publishedAt: new Date().toISOString()
                        }
                    }).then((createParent) => {
                        resolve(createParent)
                    })
                }
                else {
                    resolve(existParent[0])
                }
            })
        })
    })
  }

const multipleEntries = (data, strapi, userId, parents) => {
    const promiseArr  = []
    data.forEach((o) => {
        const pIdx = parents.findIndex((a) => { return a.url === o.link })
        const p    = pIdx > -1 ? parents[pIdx] : null
        const h = {
            media_type: "Highlight",
            url: o.link,
            title: o.title,
            description: o.description,
            author: userId,
            tags: o.tags,
            metaData: o.metaData || null,
            remarks: o.notes,
            is_favourite: o.is_favourite,
            collection_gems: o.collections,
            publishedAt: new Date().toISOString(),
            parent_gem_id: p ? p.id : null,
            media: o
        }
        promiseArr.push(new Promise((resolve, reject) => {
            strapi.entityService.create('api::gem.gem', {
                data: h
            }).then((res) => {
                resolve(res)
            }).catch((err) => {
                resolve(err)
            })
        }))
    })
}

module.exports = createCoreController('api::third-party-token.third-party-token', ({ strapi }) => ({
    setRaindropToken: async (ctx) => {
        const queryParams = ctx.request.url.split("?code=")
        const code = queryParams.length > 1 ? queryParams[1] : ""
        // console.log("API Called!", code)
        if (code !== "") {
            const raindropToken = await axios({
                url: "https://raindrop.io/oauth/access_token",
                method: "post",
                data: {
                    client_id: RAINDROP_CLIENT_ID,
                    client_secret: RAINDROP_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: RAINDROP_REDIRECT_URI
                }
            })

            await strapi.entityService.create('api::third-party-token.third-party-token', {
                data: {
                    provider: "Raindrop",
                    token: raindropToken.data.access_token,
                    token_type: raindropToken.data.token_type,
                    refresh_token: raindropToken.data.refresh_token,
                    is_active: true,
                    publishedAt: new Date().toISOString()
                },
            });

            ctx.send({
                provider: "Raindrop",
                token: raindropToken.data.access_token,
                token_type: raindropToken.data.token_type,
                refresh_token: raindropToken.data.refresh_token,
                is_active: true
            })
            return
        }
        ctx.send({})
    },
    
    setZohoToken: async (ctx) => {
        const { code } = ctx.request.query;
        console.log("Code ==>", code, ctx)
        console.log("Zoho Token API Called!")
        const zohoToken = await axios({
            url: `${process.env.ZOHO_OAUTH_URL}?client_id=${process.env.ZOHO_CLIENT_ID}&client_secret=${process.env.ZOHO_CLIENT_SECRET}&grant_type=authorization_code&code=${code}&access_type=offline&redirect_uri=${process.env.MAIN_DOMAIN_URL}/api/set-zoho-token`,
            method: "post",
        })
        await strapi.entityService.create('api::third-party-token.third-party-token', {
            data: {
                provider: "Zoho",
                token: zohoToken.data.access_token,
                token_type: zohoToken.data.token_type,
                refresh_token: zohoToken.data.refresh_token,
                is_active: true,
                publishedAt: new Date().toISOString()
            },
        });
        ctx.send(zohoToken.data);
    },

    setInstaAccessToken: async (ctx) => {
        try {
            const { code }                  = ctx.request.body
            const {
                INSTAGRAM_CLIENT_ID,
                INSTAGRAM_CLIENT_SECRET,
                REDIRECT_URI
            }                               = process.env

            const obj = {
                client_id: INSTAGRAM_CLIENT_ID,
                client_secret: INSTAGRAM_CLIENT_SECRET,
                redirect_uri: `${REDIRECT_URI}/instawall`,
                code,
                grant_type: 'authorization_code',
            }

            const instaRes = await axios.post(
                'https://api.instagram.com/oauth/access_token',
                querystring.stringify(obj),
                {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                }
            )

            console.log("Insta Res ===>", instaRes.data)

            ctx.send(instaRes.data)
        }
        catch (err) {
            console.log("Insta Error ==>", err)
        }
    },


    addRaindropHighlights: async (ctx) => {
        try {
            const { body } = ctx.request;
            const { user } = ctx.state;

            let highlights = []
            if (user?.id && body?.length > 0) {
                const finalArr = removeDuplicateRecords(body)
                const parents  = await Promise.all(parentLinks(finalArr, user.id))
                highlights     = await multipleEntries(body, strapi, user.id, parents)
            }
            ctx.send(highlights)
        }
        catch (err) {
            ctx.send(err)
        }
    },

    importRaindropHighlights: async (ctx) => {
        try {

            const token = await strapi.entityService.findMany('api::third-party-token.third-party-token', {
                filters: { is_active: true },
                fields: ['token']
            });

            const raindropHighlight = await axios({
                url: "https://api.raindrop.io/rest/v1/highlights",
                method: "get",
                headers: {
                    'Authorization': `Bearer 8aa75909-46fe-476a-8c09-5afd53fb1d9b`,
                    'Accept-Encoding': 'gzip,deflate,compress'
                }
            });

            ctx.send(raindropHighlight.data);
        } catch (error) {
            console.log(error);
        }
    },

    getRaindropAccessToken: async (ctx) => {
        try {
            const { code } = ctx.request.query;
            const raindropToken = await axios({
                url: "https://raindrop.io/oauth/access_token",
                method: "post",
                data: {
                    client_id: RAINDROP_CLIENT_ID,
                    client_secret: RAINDROP_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    redirect_uri: `${RAINDROP_REDIRECT_URI}`,
                    code
                }
            })

            ctx.send(raindropToken.data);
        }
        catch (e) {
            console.log("Error", e)
            ctx.send(e)
        }
    },

    importRaindrops: async (ctx) => {
        try {

            const token = await strapi.entityService.findMany('api::third-party-token.third-party-token', {
                filters: { is_active: true, provider: "Raindrop" },
                fields: ['token']
            });

            const raindropHighlight = await axios({
                url: "https://api.raindrop.io/rest/v1/raindrops/29118642",
                method: "get",
                headers: {
                    'Authorization': `Bearer ${token[0].token}`,
                    'Accept-Encoding': 'gzip,deflate,compress'
                }
            })

            ctx.send(raindropHighlight.data);
        } catch (error) {
            console.log(error);
        }
    },

    async getPocketRequestToken(ctx){
        const reqToken = await axios({
            url:'https://getpocket.com/v3/oauth/request',
            method:'post',
            data:{
              consumer_key:process.env.POCKET_CONSUMER_KEY,
              redirect_uri:`${process.env.REDIRECT_URI}`  
            }
        })    
        
        ctx.send({code:reqToken.data.split("=")[1],redirect_uri:`${process.env.REDIRECT_URI}`});
    },
    async getPocketAccessToken (ctx){
        // try{
         const userId = ctx.state.user.id;
         const {requestCode } = ctx.request.body; 
        
         const isTokenExist = await strapi.db.query('api::third-party-token.third-party-token').findOne({
              where:{
                 author: userId
              },
              select:['provider','token','username']
         })
        let pocketSaveData;
        if(isTokenExist){
            pocketSaveData = await this.importPocketData(isTokenExist.token, userId);
            if(pocketSaveData.length === 0){
               return ctx.send({msg:'All pocket data is already saved'});  
            }
            await this.pocketDataSync(pocketSaveData,userId);
            return ctx.send({msg:'All pocket data is saved successfully',data:pocketSaveData});  
        }
        
        if(!requestCode){
            return ctx.send({msg:'Something went wrong.'},400);   
         }

         const accessTokenRes = await axios({
              url:'https://getpocket.com/v3/oauth/authorize',
              method:'post',
              data:{
                consumer_key:process.env.POCKET_CONSUMER_KEY,
                code:requestCode 
              }  
         })
         
         const accessToken = accessTokenRes.data.split("&")[0];
         const userName = accessTokenRes.data.split("&")[1];

        await strapi.entityService.create('api::third-party-token.third-party-token', {
            data: {
              provider: "Pocket",
              token: accessToken.split("=")[1],
              username:userName.split("=")[1],
              token_type: 'Auth',
              refresh_token: "No refresh token required",
              is_active: true,
              author:userId,
              publishedAt: new Date().toISOString()
            },
        });
        
        pocketSaveData = await this.importPocketData(accessToken.split("=")[1], userId);
        
        if(pocketSaveData.length === 0){
            return ctx.send({msg:'All pocket data is already saved'});  
        }

        await this.pocketDataSync(pocketSaveData,userId);
        ctx.send({msg:'All pocket data is saved successfully',data:pocketSaveData});
    //  }catch(err){
    //      console.log("error occured:",err);
    //  }
    },
    pocketDataSync(pocketData,userId){
        //  pocketData=pocketData.map(pd=>{
        //     return {
        //        ...pd,
        //        publishedAt: new Date().toISOString(),
        //        author:userId 
        //     } 
        //  })
        const promiseArr = []
        pocketData.forEach((pocketObj) => {
            promiseArr.push(new Promise((resolve, reject) => {
                strapi.db.query('api::gem.gem').create({
                    data: pocketObj
                }).then((res) => {
                    resolve(res)
                }).catch((e) => {
                    console.log(e)
                })
            }))
        })
        return Promise.all(promiseArr)
    },
    async importPocketData (accessToken, userId){
        /* Getting all save data from Pocket */
        const pocketData = await axios({
            url:'https://getpocket.com/v3/get',
            method:'post',
            Headers: { "Accept-Encoding": "gzip,deflate,compress" },
            data:{
              consumer_key:process.env.POCKET_CONSUMER_KEY,
              access_token:accessToken,
              state:'all' 
            }  
        })
        const collection = await strapi.db.query('api::collection.collection').findOne({ where: { 
            name: 'Unfiltered',
            author: userId
        }});
        const pocketList = pocketData.data.list;
        let resSaveList = {};  
        const arr       = [] 
        for(const data in pocketList){
            const pData = pocketList[data];
            resSaveList[data]={
                item_id:pData.item_id,
                title:pData?.given_title ? pData?.given_title : pData?.resolved_title, 
                description:pData?.excerpt,
                is_favourite: pData?.favorite === '1' ? true : false,
                image_url: pData?.top_image_url,
                url:pData?.given_url,
                media_type: pData?.is_article ? 'Article' : 'Link',
                collection_gems: collection?.id,
                metaData: {
                    covers: pData?.top_image_url ? [pData?.top_image_url] : [],
                    docImages: pData?.top_image_url ? [pData?.top_image_url] : [],
                    defaultThumbnail: pData?.top_image_url ? pData?.top_image_url : null,
                    defaultIcon: `${process.env.AWS_S3_STATIC_URL}/webapp/pocket-n.png`,
                    icon: { "type": "image", "icon": `${process.env.AWS_S3_STATIC_URL}/webapp/pocket-n.png` }
                },
                service_type:'pocket',
                author: userId,
                publishedAt: new Date().toISOString(),

            }
            arr.push(pData.item_id)
        }

        /* Getting all pocket data from gems */
        const pocketExistData= await  strapi.db.query('api::gem.gem').findMany({  
            where:{
               service_type:'pocket',
               author: userId,
               item_id: { $in: arr } 
            } 
        }) 
        let newPocketData = [];
        let pocketDataMap = {};
        
        /* Storing pocket data gems in key:value pair */
        for(const ped of pocketExistData){
            pocketDataMap[ped.item_id]=ped;                      
        }
        
        /* Keeping new pocket data that coming from pocket save article */
        for(const rsl in resSaveList){
            if(!pocketDataMap[rsl]){
               newPocketData.push(resSaveList[rsl]); 
            }                      
        } 

        return newPocketData;
    }
}));
