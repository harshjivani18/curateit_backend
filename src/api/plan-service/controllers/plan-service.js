'use strict';

const { populate } = require('dotenv');

/**
 * plan-service controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::plan-service.plan-service', ({ strapi }) => ({
   async getPlanServices(ctx) {
      try {
         const userId = ctx.state.user.id;

         /* Get plan services by userId */
         const userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
            where: {
               author: userId
            }
         })

         if (!userPlan) {
            return ctx.send({ msg: 'No plan services found' }, 400);
         }

         /* Get plan services details of remaining , used & limit data */
         let payload = {
            gem: {},
            coll: {},
            speech: {},
            tag: {},
            ocr_pdf: {},
            ocr_image: {},
         };
         for (const keys in userPlan) {
            switch (true) {
               case keys.includes('gem'):
                  payload.gem[keys] = userPlan[keys];
                  break;
               case keys.includes('coll'):
                  payload.coll[keys] = userPlan[keys];
                  break;
               case keys.includes('tag'):
                  payload.tag[keys] = userPlan[keys];
                  break;
               case keys.includes('speech'):
                  payload.speech[keys] = Math.ceil(parseInt(userPlan[keys]) / 780) + " min";
                  break;
               case keys.includes('ocr_pdf'):
                  payload.ocr_pdf[keys] = userPlan[keys];
                  break;
               case keys.includes('ocr_image'):
                  payload.ocr_image[keys] = userPlan[keys];
                  break;
               default:
                  payload[keys] = userPlan[keys];
            }
         }
         payload.gem["gem_rem"] = parseInt(userPlan.gem_limit) - parseInt(userPlan.gem_used);
         payload.coll["coll_rem"] = parseInt(userPlan.coll_limit) - parseInt(userPlan.coll_used);
         payload.speech["speech_rem"] = Math.floor((parseInt(userPlan.speech_limit) - parseInt(userPlan.speech_used)) / 780) + " min";
         payload.tag["tag_rem"] = parseInt(userPlan.tag_limit) - parseInt(userPlan.tag_used);
         payload.ocr_pdf["ocr_pdf_rem"] = parseInt(userPlan.ocr_pdf_limit) - parseInt(userPlan.ocr_pdf_used);
         payload.ocr_image["ocr_image_rem"] = parseInt(userPlan.ocr_image_limit) - parseInt(userPlan.ocr_image_used);

         ctx.send({ msg: 'Plan services data retrieved successfully', data: payload });

      } catch (err) {
         console.log("error occured :", err);
      }
   },

   async planMigrateRecords(ctx) {
      await strapi.db.query("api::plan-service.plan-service").updateMany({
         data: { is_advanced_search: false }
      })
      return ctx.send("All records updated!")
   },

   async getUserPlanDetails(ctx) {
      const { user } = ctx.state;
      const userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
         where: {
            author: user.id
         },
         populate: {
            author: {
               select: ["id", "username", "email", "firstname", "lastname", "profilePhoto"]
            },
            related_plan: true
         }
      })
      const subscriptionDetails = await strapi.db.query('api::subscription.subscription').findOne({
         where: {
            author: user.id,
            status: "active",
            is_active: true
         },
         populate: {
            author: {
               select: ["id", "username", "email", "firstname", "lastname", "profilePhoto"]
            },
            plan: {
               select: ["id", "name", "price", "price_id", "display_name", "is_team_plan", "is_default_created_plan", "tenure"]
            }
         }
      })
      const transactions = await strapi.db.query('api::transaction.transaction').findMany({
         where: {
            author: user.id,
            status: { $notIn: ["draft", "ready"] } 
         },
         populate: {
            author: {
               select: ["id", "username", "email", "firstname", "lastname", "profilePhoto"]
            },
            plan: {
               select: ["id", "name", "price", "price_id", "display_name", "is_team_plan", "is_default_created_plan", "tenure"]
            }
         }
      })

      return ctx.send({ userPlan, subscriptionDetails, transactions });
   },

   async isPlanOwner(ctx) {
      const { user }    = ctx.state;
      const planService = await strapi.db.query('api::plan-service.plan-service').findOne({
         where: {
            author: user.id,
         },
         populate: {
            subscription: {
               populate: {
                  author: {
                     select: ["id", "username", "email", "firstname", "lastname", "profilePhoto"]
                  }
               }
            },
            related_plan: {
               select: ["id", "display_name"]
            }

         }
      })
      return ctx.send({ 
         ownerDetails: planService?.subscription?.author || null,
         isPlanOwner: (planService?.subscription && planService?.subscription?.author?.id && planService?.subscription?.author?.id === user.id ? true : false) || planService?.subscription === null,
         plan: planService?.related_plan?.display_name || null
      });
   },

   async migrateExistingPlanServices(ctx) {
      const plan        = await strapi.db.query('api::plan.plan').findOne({ 
         where: { 
             is_default_created_plan: true
         } 
     })
     const configLimit = await strapi.db.query('api::config-limit.config-limit').findOne({
         where: { 
             related_plans: plan?.id
         },
         populate: {
             related_plans: {
                 select: ["id", "display_name", "tenure"]
             }
         }
     })

     let related_plan = null
      if (configLimit.related_plans?.length > 0) {
         const relatedIndex = configLimit.related_plans.findIndex((p) => p.id === plan.id)
         related_plan = relatedIndex !== -1 ? configLimit.related_plans[relatedIndex] : null
      }

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
         related_plan: related_plan?.id
      }
      
      // const planservices = await strapi.db.query("api::plan-service.plan-service").findMany({
      //    where: {
      //       plan: "free"
      //    }
      // })
      // const serviceIds = planservices.map((service) => service.id)
      // for (const serviceId of serviceIds) {
      //    await strapi.db.query("api::plan-service.plan-service").update({
      //       where: {
      //          id: serviceId
      //       },
      //       data: plansServiceObj
      //    })
      // }
      await strapi.db.query("api::plan-service.plan-service").updateMany({
         data: {
            createdAt: new Date().toISOString(),
         }
      })
      return ctx.send("Done Migrations!")
   }



   // async checkPlanService(ctx) {
   //    const { user } = ctx.state;
   //    const { module } = ctx.request.query;

   //    const userPlan = await strapi.db.query('api::plan-service.plan-service').findOne({
   //       where: {
   //          author: user.id
   //       }
   //    })

   //    const configLimit = await strapi.entityService.findMany('api::config-limit.config-limit')

   //    if (module === 'collection') {
   //       if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.coll_used) >= parseInt(configLimit[0].coll_limit)) {
   //          return ctx.send({ msg: 'Folders bookmark limit is exceeded Please extend your service plan' })
   //       }
   //    }

   //    if (module === 'gem') {
   //       if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.gem_used) >= parseInt(configLimit[0].gem_limit)) {
   //          return ctx.send({ msg: 'Folders bookmark limit is exceeded Please extend your service plan' })
   //       }
   //    }

   //    if (module === 'tag') {
   //       if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.tag_used) >= parseInt(configLimit[0].tag_limit)) {
   //          return ctx.send({ msg: 'Folders bookmark limit is exceeded Please extend your service plan' })
   //       }
   //    }

   //    if (module === 'speech') {
   //       if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.speech_used) >= parseInt(configLimit[0].speech_limit)) {
   //          return ctx.send({ msg: 'Folders bookmark limit is exceeded Please extend your service plan' })
   //       }
   //    }

   //    if (module === 'ocr_pdf') {
   //       if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.ocr_pdf_used) >= parseInt(configLimit[0].ocr_pdf_limit)) {
   //          return ctx.send({ msg: 'Folders bookmark limit is exceeded Please extend your service plan' })
   //       }
   //    }

   //    if (module === 'ocr_image') {
   //       if (userPlan && userPlan.plan === 'free' && parseInt(userPlan.ocr_image_used) >= parseInt(configLimit[0].ocr_image_limit)) {
   //          return ctx.send({ msg: 'Folders bookmark limit is exceeded Please extend your service plan' })
   //       }
   //    }

   //    return "Please add Module";
   // }
}));
