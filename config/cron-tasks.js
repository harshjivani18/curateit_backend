// require("dotenv").config()

// const awaitRequest               = require("../utils")
// const request = require('request');
const axios = require('axios')

const { RAINDROP_CLIENT_ID,
  RAINDROP_CLIENT_SECRET,
  RAINDROP_REDIRECT_URI,
} = process.env

const { checkWebsites } = require("../utils");
const { REMINDER_MAIL } = require("../emails/reminder")
const { getService}     = require('@strapi/plugin-users-permissions/server/utils');
// const awaitRequest = (options) => {
//   return new Promise((resolve, reject) => {
//     request(options, function (error, response, body) {
//       if (error) reject(error);
//       resolve(body);
//     });
//   });
// };


module.exports = {
  /**
   * Simple example.
   * Every monday at 1am.
   */

  // Raindrop access token refresh Cron for after every two weeks
  '0 0 1,15 * * *': async ({ strapi }) => {
    // '* * * * * *': async ({ strapi }) => {
    // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
    console.log("Cron Started For Updating Refresh Token!")
    const activeTokens = await strapi.entityService.findMany("api::third-party-token.third-party-token", { filters: { provider: "Raindrop", is_active: true } })
    const activeToken = activeTokens ? activeTokens[0] : null
    if (!activeToken) {
      // console.log("URL ==>", `https://api.raindrop.io/v1/oauth/authorize?client_id=${RAINDROP_CLIENT_ID}&redirect_uri=${RAINDROP_REDIRECT_URI}`)
      await axios.get(`https://api.raindrop.io/v1/oauth/authorize?client_id=${RAINDROP_CLIENT_ID}&redirect_uri=${RAINDROP_REDIRECT_URI}`,
        {
          headers: { "Accept-Encoding": "gzip,deflate,compress" }
        }
      )
      return
    }
    console.log("Refreshing the token")
    await strapi.entityService.update("api::third-party-token.third-party-token", activeToken.id, {
      data: {
        is_active: false
      }
    })
    const raindropToken = await axios({
      url: "https://raindrop.io/oauth/access_token",
      method: "post",
      data: {
        client_id: RAINDROP_CLIENT_ID,
        client_secret: RAINDROP_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: activeToken.refresh_token
      }
    })
    console.log("Token Generating!")
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
  },
  '0 30 * * * *': async ({ strapi }) => { 
    // Cron to update zoho access token after every 1 hour
    const {
      ZOHO_OAUTH_URL,
      ZOHO_CLIENT_ID,
      ZOHO_CLIENT_SECRET,
      ZOHO_CLIENT_CODE,
      NODE_ENV
    } = process.env

    if (NODE_ENV !== "production") return

    const activeTokens = await strapi.entityService.findMany("api::third-party-token.third-party-token", { 
      filters: { provider: "Zoho", is_active: true } 
    })
    const activeToken = activeTokens ? activeTokens[0] : null
    
    if (!activeToken) {
      // get access token and refresh token from zoho
      const res       = await axios({
        url: `${ZOHO_OAUTH_URL}?client_id=${ZOHO_CLIENT_ID}&client_secret=${ZOHO_CLIENT_SECRET}&grant_type=authorization_code&code=${ZOHO_CLIENT_CODE}`,
        method: "post",
      })
      const zohoToken = res.data
      // create third party token in strapi
      await strapi.entityService.create('api::third-party-token.third-party-token', {
        data: {
          provider: "Zoho",
          token: zohoToken.access_token,
          token_type: zohoToken.token_type,
          refresh_token: zohoToken.refresh_token,
          is_active: true,
          publishedAt: new Date().toISOString()
        },
      });
      return
    }
    console.log("Refreshing the token", activeToken.refresh_token)
    
    const refreshTokenRes    = await axios({
      url: `${ZOHO_OAUTH_URL}?client_id=${ZOHO_CLIENT_ID}&grant_type=refresh_token&client_secret=${ZOHO_CLIENT_SECRET}&refresh_token=${activeToken.refresh_token}`,
      method: "post"
    })
    const zohoToken         = refreshTokenRes.data
    await strapi.entityService.update('api::third-party-token.third-party-token', activeToken.id, {
      data: {
        provider: "Zoho",
        token: zohoToken.access_token,
        token_type: zohoToken.token_type,
        refresh_token: activeToken.refresh_token,
        is_active: true,
        publishedAt: new Date().toISOString()
      },
    });
  },
  '0 2 * * *': async ({strapi}) =>{
     
    try{
          console.log("Cron-job is running to update broken link of websites with statusCode");  
          
          /* Fetch gems data by filtering media_type & url */
          const gems = await strapi.db.query('api::gem.gem').findMany({
            select: ["id", "url", "media_type", "broken_link"],
            where:{
              $and:[
                { 
                  url:{ 
                    $startsWith:'https' 
                  } 
                },
                {
                  media_type:{
                    $notNull: true  
                  }    
                },
                {
                  author: {
                    $not: null
                  }
                },
                {
                  broken_link: {
                    $null: true
                  }
                }
              ] 
            },
            sort:{ id: 'desc' },
            populate:{
              author:{
                select: ["id", "username", "email"]
              },
              collection_gems:{
                select: ["id","name"]
              },
              tags:{
                select: ["id","tag"]
              }
            }
          }); 
          for(const gm of gems){
            const { url , media_type } = gm;
            if(url && ( url.startsWith('http') && media_type)){
              let linkActive = null;
              let timer = setTimeout(async () => {
                await strapi.db.query("api::gem.gem").update({
                  select: ["id", "url", "media_type", "broken_link"],
                  where:{
                    id: gm.id
                  },
                  data:{
                    broken_link: false,
                    status_code: 200
                  }
                })
              }, 2000)
              linkActive = await checkWebsites(url.trim());
              clearTimeout(timer);


                  if(linkActive?.state === "OK"){ 
                      await strapi.db.query("api::gem.gem").update({
                        select: ["id", "url", "media_type", "broken_link"],
                        where:{
                          id: gm.id
                        },
                        data:{
                          broken_link: false,
                          status_code: linkActive?.status ? linkActive.status : 200
                        }
                      })
                  }else{
                    await strapi.db.query("api::gem.gem").update({
                      select: ["id", "url", "media_type", "broken_link"],
                      where:{
                        id: gm.id
                      },
                      data:{
                        broken_link: true,
                        status_code: linkActive?.status ? linkActive.status : 500
                      }
                    })
                  }
            }
          }
          console.log("Gems updated with broken link ");
    }catch(err){
        console.log("error occrued : ",err);
    }
  },

  "0 0 23 * * *": async ({ strapi }) => {
    // Get all users from the database who have not sent reminder email
    const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: {
        $and: [ { is_reminder_sent: false }, { confirmed: false } ]
      },
    }); 

    // Loop through the users and send reminder email
    const userPermissionService = getService('users-permissions');
    for (const user of users) {
      const code  = user.confirmationToken
      const email = user.email
      const message = await userPermissionService.template(REMINDER_MAIL, {
        USER: user,
        CODE: code
      });
  
      const subject = await userPermissionService.template("Everything okay? 😔", {
        USER: user,
      });
      // Send reminder email to the user
      await strapi
      .plugin('email')
      .service('email')
      .send({
        to: email,
        from: `CurateIt <${process.env.AWS_EMAIL_FROM}>`,
        replyTo: process.env.AWS_EMAIL_REPLY_TO,
        subject,
        text: message,
        html: message,
      });

      // Update the user to indicate that reminder email has been sent
      await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: {
          is_reminder_sent: true
        }
      });
    }
  },


  // For Plan-Service
  "* * * 1 * *": async ({ strapi }) => {
    try {  
      const plansServices = await strapi.entityService.findMany("api::plan-service.plan-service", {
        fields: ["id", "plan"],
        populate: { author: { fields: ["id", "username"] }}
      })
      
      const planServiceIds = [];
      plansServices.forEach((p) => {
        if (p.plan === "free") {
          planServiceIds.push(p.id)
        }
      })

      const configLimit = await strapi.db.query("api::config-limit.config-limit").findOne({
        where: { is_free: true },
        populate: {
          related_plans: {
            select: ["id", "display_name"]
          }
        }
      })

      const plansServiceObj = {
        gem_limit: configLimit?.gem_limit ? parseInt(configLimit.gem_limit) : 100,
        coll_limit: configLimit?.coll_limit ? parseInt(configLimit.coll_limit) : 5,
        tag_limit: configLimit?.tag_limit ? parseInt(configLimit.tag_limit) : 5,
        speech_limit: configLimit?.speech_limit ? parseInt(configLimit.speech_limit) : 5,
        ocr_pdf_limit: configLimit?.ocr_pdf_limit ? parseInt(configLimit.ocr_pdf_limit) : 5,
        ocr_image_limit: configLimit?.ocr_image_limit ? parseInt(configLimit.ocr_image_limit) : 5,
        // subscription_plans: configLimit?.related_plans?.length > 0 ? configLimit.related_plans?.[0]?.display_name : "Explorer",
        file_upload: configLimit?.file_upload ? parseInt(configLimit.file_upload) : 5000,
        guest_users: configLimit?.guest_users ? parseInt(configLimit.guest_users) : 5,
        included_members: configLimit?.included_members ? parseInt(configLimit.included_members) : 1,
        public_collection_and_tags: configLimit?.public_collection_and_tags ? parseInt(configLimit.public_collection_and_tags) : 5,
        workspaces: configLimit?.workspaces ? parseInt(configLimit.workspaces) : 1,
        storage: configLimit?.storage ? parseInt(configLimit.storage) : 1000000,
        audio_recording: configLimit?.audio_recording ? parseInt(configLimit.audio_recording) : 180,
        file_upload_size_limit: configLimit?.file_upload_size_limit ? parseInt(configLimit.file_upload_size_limit) : 500000,
        bio_links: configLimit?.bio_links ? parseInt(configLimit.bio_links) : 1,
        related_plan: configLimit.related_plans?.[0]?.id
      }
      
      if (planServiceIds && planServiceIds.length === 0) {
        return
      }
      
      for (const planServiceId of planServiceIds) {
        await strapi.db.query("api::plan-service.plan-service").update({
          where: { id: planServiceId },
          data: plansServiceObj
        })
        const referral = await strapi.db.query("api::referral.referral").findOne({
          where: { author: planServiceId}
        })
        // const referral_count = (referral?.ref_users && referral?.ref_users?.length > 0) ? referral?.ref_users?.length : 0
        const referral_count = 
            (referral?.ref_users_via_link && referral?.ref_users_via_link?.length > 0) ? referral?.ref_users_via_link?.length : 0 
          + (referral?.ref_users_via_email && referral?.ref_users_via_email?.length > 0) ? referral?.ref_users_via_email?.length : 0 
          + (referral?.ref_users_via_wp && referral?.ref_users_via_wp?.length > 0) ? referral?.ref_users_via_wp?.length : 0 
          + (referral?.ref_users_via_ig && referral?.ref_users_via_ig?.length > 0) ? referral?.ref_users_via_ig?.length : 0 
          + (referral?.ref_users_via_li && referral?.ref_users_via_li?.length > 0) ? referral?.ref_users_via_li?.length : 0 
          + (referral?.ref_users_via_fb && referral?.ref_users_via_fb?.length > 0) ? referral?.ref_users_via_fb?.length : 0 
          + (referral?.ref_users_via_tw && referral?.ref_users_via_tw?.length > 0) ? referral?.ref_users_via_tw?.length : 0

        if (referral_count >= 30 ) {
          const planService = await strapi.db.query("api::plan-service.plan-service").findOne({
            where: { author: planServiceId}
          })

          const referPlan = await strapi.db.query("api::reward.reward").findOne({
            where: {
              reward_plans: "Refer"
            }
          })

          const newPlansServiceObj = {
            gem_limit: parseInt(planService?.gem_limit) + parseInt(referPlan?.gems),
            coll_limit: parseInt(planService?.coll_limit) + parseInt(referPlan?.collections),
            tag_limit: parseInt(planService?.tag_limit) + parseInt(referPlan?.tags),
            speech_limit: parseInt(planService?.speech_limit) + parseInt(referPlan?.speech),
            ocr_image_limit: parseInt(planService?.ocr_image_limit) + parseInt(referPlan?.ocr),
            file_upload: parseInt(planService?.file_upload) + parseInt(referPlan?.file_upload),
            guest_users: parseInt(planService?.guest_users) + parseInt(referPlan?.guest_users),
            included_members: parseInt(planService?.included_members) + parseInt(referPlan?.included_members),
            public_collection_and_tags: parseInt(planService?.public_collection_and_tags) + parseInt(referPlan?.public_collection_and_tags),
            storage: parseInt(planService?.storage) + parseInt(referPlan?.storage),
            audio_recording: parseInt(planService?.audio_recording) + parseInt(referPlan?.audio_recording)
          }

          await strapi.db.query("api::plan-service.plan-service").update({
            where: { id: planServiceId},
            data: newPlansServiceObj
          }) 
          console.log("success");
        }
      }

      // for (const planServiceId of planServiceIds) {
      //   const referral = await strapi.db.query("api::referral.referral").findOne({
      //     where: { author: planServiceId}
      //   })
      //   // const referral_count = (referral?.ref_users && referral?.ref_users?.length > 0) ? referral?.ref_users?.length : 0
      //   const referral_count = 
      //       (referral?.ref_users_via_link && referral?.ref_users_via_link?.length > 0) ? referral?.ref_users_via_link?.length : 0 
      //     + (referral?.ref_users_via_email && referral?.ref_users_via_email?.length > 0) ? referral?.ref_users_via_email?.length : 0 
      //     + (referral?.ref_users_via_wp && referral?.ref_users_via_wp?.length > 0) ? referral?.ref_users_via_wp?.length : 0 
      //     + (referral?.ref_users_via_ig && referral?.ref_users_via_ig?.length > 0) ? referral?.ref_users_via_ig?.length : 0 
      //     + (referral?.ref_users_via_li && referral?.ref_users_via_li?.length > 0) ? referral?.ref_users_via_li?.length : 0 
      //     + (referral?.ref_users_via_fb && referral?.ref_users_via_fb?.length > 0) ? referral?.ref_users_via_fb?.length : 0 
      //     + (referral?.ref_users_via_tw && referral?.ref_users_via_tw?.length > 0) ? referral?.ref_users_via_tw?.length : 0

      //   if (referral_count >= 30 ) {
      //     const planService = await strapi.db.query("api::plan-service.plan-service").findOne({
      //       where: { author: planServiceId}
      //     })

      //     const referPlan = await strapi.db.query("api::reward.reward").findOne({
      //       where: {
      //         reward_plans: "Refer"
      //       }
      //     })

      //     const newPlansServiceObj = {
      //       gem_limit: parseInt(planService?.gem_limit) + parseInt(referPlan?.gems),
      //       coll_limit: parseInt(planService?.coll_limit) + parseInt(referPlan?.collections),
      //       tag_limit: parseInt(planService?.tag_limit) + parseInt(referPlan?.tags),
      //       speech_limit: parseInt(planService?.speech_limit) + parseInt(referPlan?.speech),
      //       ocr_image_limit: parseInt(planService?.ocr_image_limit) + parseInt(referPlan?.ocr),
      //       file_upload: parseInt(planService?.file_upload) + parseInt(referPlan?.file_upload),
      //       guest_users: parseInt(planService?.guest_users) + parseInt(referPlan?.guest_users),
      //       included_members: parseInt(planService?.included_members) + parseInt(referPlan?.included_members),
      //       public_collection_and_tags: parseInt(planService?.public_collection_and_tags) + parseInt(referPlan?.public_collection_and_tags),
      //       storage: parseInt(planService?.storage) + parseInt(referPlan?.storage),
      //       audio_recording: parseInt(planService?.audio_recording) + parseInt(referPlan?.audio_recording)
      //     }

      //     await strapi.db.query("api::plan-service.plan-service").update({
      //       where: { id: planServiceId},
      //       data: newPlansServiceObj
      //     }) 
      //     console.log("success");
      //   }
      // }
    
    } catch (error) {
      console.log("planservice cron error ===>", error.message);
    }
  },

  // for Update Rewards

  "* * 5 * * *": async ({ strapi }) => {
    try {
      const referrals = await strapi.entityService.findMany("api::referral.referral", {
        populate: { author: {fields: ["id", "username"] }}
      })

      for (const referral of referrals) {
        // const referral_count = ( referral?.ref_users && referral?.ref_users?.length > 0 ) ? referral?.ref_users?.length : 0
        const referral_count = 
            (referral?.ref_users_via_link && referral?.ref_users_via_link?.length > 0) ? referral?.ref_users_via_link?.length : 0 
          + (referral?.ref_users_via_email && referral?.ref_users_via_email?.length > 0) ? referral?.ref_users_via_email?.length : 0 
          + (referral?.ref_users_via_wp && referral?.ref_users_via_wp?.length > 0) ? referral?.ref_users_via_wp?.length : 0 
          + (referral?.ref_users_via_ig && referral?.ref_users_via_ig?.length > 0) ? referral?.ref_users_via_ig?.length : 0 
          + (referral?.ref_users_via_li && referral?.ref_users_via_li?.length > 0) ? referral?.ref_users_via_li?.length : 0 
          + (referral?.ref_users_via_fb && referral?.ref_users_via_fb?.length > 0) ? referral?.ref_users_via_fb?.length : 0 
          + (referral?.ref_users_via_tw && referral?.ref_users_via_tw?.length > 0) ? referral?.ref_users_via_tw?.length : 0

        if (referral_count >= 30) {
          const planService = await strapi.db.query("api::plan-service.plan-service").findOne({
            where: { author: referral?.author?.id}
          })

          const referPlan = await strapi.db.query("api::reward.reward").findOne({
            where: {
              reward_plans: "Refer"
            }
          })

          const newPlansServiceObj = {
            gem_limit: parseInt(planService?.gem_limit) + parseInt(referPlan?.gems),
            coll_limit: parseInt(planService?.coll_limit) + parseInt(referPlan?.collections),
            tag_limit: parseInt(planService?.tag_limit) + parseInt(referPlan?.tags),
            speech_limit: parseInt(planService?.speech_limit) + parseInt(referPlan?.speech),
            ocr_image_limit: parseInt(planService?.ocr_image_limit) + parseInt(referPlan?.ocr),
            file_upload: parseInt(planService?.file_upload) + parseInt(referPlan?.file_upload),
            guest_users: parseInt(planService?.guest_users) + parseInt(referPlan?.guest_users),
            included_members: parseInt(planService?.included_members) + parseInt(referPlan?.included_members),
            public_collection_and_tags: parseInt(planService?.public_collection_and_tags) + parseInt(referPlan?.public_collection_and_tags),
            storage: parseInt(planService?.storage) + parseInt(referPlan?.storage),
            audio_recording: parseInt(planService?.audio_recording) + parseInt(referPlan?.audio_recording)
          }

          await strapi.db.query("api::plan-service.plan-service").update({
            where: { id: referral?.author?.id},
            data: newPlansServiceObj
          }) 
          console.log("success");
        }
      }
    } catch (error) {
      console.log("Reward cron error====>", error.message);
    }
  }
};