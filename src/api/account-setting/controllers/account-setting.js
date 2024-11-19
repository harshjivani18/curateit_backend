'use strict';

/**
 * account-setting controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { validating_social_url } = require("../../../../constant");

module.exports = createCoreController('api::account-setting.account-setting',({strapi})=>({
       
     async getAccProfile(ctx){
        try { 
            const user = ctx.state.user;
            
            const { profileAccess , userId } = ctx.request.query;
            
            if(profileAccess && userId && profileAccess.toLowerCase() === 'public' ){
                
                /* Fetching user profile by userId  */
                const accountProfile = await strapi.db.query("api::account-setting.account-setting").findOne({
                    where: {
                        userId: userId
                    },
                    select:["id","userId","profile_url","full_name","about_us","name_pronouns","website","username","social_links"]
                }) 
                if(!accountProfile) return ctx.send({msg:'No user found'},400);

                return ctx.send({msg:'User profile data ',data:accountProfile});
            }
              
            /* check user exist or not ? */
            if(!user?.id || (userId && parseInt(user.id) !== parseInt(userId)) ) return ctx.send({msg:'Unauthorised access'},400);   

            /* Checking if account setting recs is there or not ? */
            let accountSet
            accountSet = await strapi.db.query('api::account-setting.account-setting').findOne({
                    where:{
                        userId: user.id
                    }
            })   
            if(!accountSet){
                  
                const defaultProfile = {
                      username: user?.username,
                      userId: user.id,
                      full_name: user?.firstname ? { first_name:user?.firstname , last_name: user?.lastname } : null,
                      publishedAt: new Date().toISOString()
                 }
                accountSet = await strapi.db.query("api::account-setting.account-setting").create({
                    data: defaultProfile
                })
            }

            return ctx.send({msg:'Account profile',data:accountSet});
        }catch( err ){
            console.log("error occured :",err);
            ctx.send({msg:err},400);
        }
     },
     async updateAccProfile( ctx){
         try {
            const user = ctx.state.user;
            let requestBody = ctx.request.body;
            const { del_social_links } = ctx.request.query;
            
            /* check user exist or not  */
            if(!user?.id) return ctx.send({msg:'Unauthorised access'},400);
        
            /* check account profile is exist or not */
            const profileSet = await strapi.db.query('api::account-setting.account-setting').findOne({
               where:{
                   userId: user.id
               }
            })
             
            let socialLinkExist;
            
            /* Deleting social_links from profile-setting  */
            if(del_social_links){
               
                socialLinkExist = profileSet?.social_links ?  profileSet.social_links.find(s_links=> ( s_links.name === del_social_links ) ) : null;  

                if(!socialLinkExist) return ctx.send({msg:'No social_links exist'},400);

                const updatedSocialLinks = profileSet.social_links ? profileSet.social_links.filter(s_links=>( s_links.name !== del_social_links )) : null;
                
                   
                await strapi.db.query("api::account-setting.account-setting").update({
                      where:{
                        userId: user.id
                      },
                      data:{
                        social_links: updatedSocialLinks
                      }
                }) 
                return ctx.send({msg:'Social_links is deleted successfully'}); 
            }

             if(!requestBody || typeof(requestBody) === 'string' || ( Object.keys(requestBody).length === 0 )) 
                return ctx.send({msg:'No data is passes from body'},400)
            
                  

            if(!profileSet) return ctx.send({msg:'No user profile exists'},400);
            const {  social_links } = requestBody;
            if(social_links){
                /* validating social_link & email */
                if(!( validating_social_url.includes(social_links?.name) && social_links?.url.includes(social_links?.name) )){
                   return ctx.send({msg:'Please pass valid url'},400)   
                } 
                 
                socialLinkExist = profileSet.social_links ?  profileSet.social_links.find(s_links=> ( s_links.name === social_links.name ) ) : null;
                 
                if(socialLinkExist) return ctx.send({msg:'This social_links is already added.'},400);
                
                requestBody = profileSet.social_links ? {...requestBody, social_links:[ ...profileSet?.social_links , requestBody.social_links ] } : { ...requestBody, social_links:[ requestBody.social_links ] };   
            }
             
            const updatedProfile = await strapi.db.query('api::account-setting.account-setting').update({
                where:{
                    userId: user.id
                },
                data:{
                    ...requestBody
                }
            });

            ctx.send({msg:'Updated user profile', data: updatedProfile});
        }catch( err ){
            console.log("error occured :",err);
            ctx.send({msg:err},400);
         }
     }

}));
