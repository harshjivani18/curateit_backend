
const { standardAPI } = require("../../../../../protocol");
const axios = require('axios');
const { parse } = require('tldts');

const socialfeed = [
    "twitter.com",
    "medium.com",
    "github.com",
    "reddit.com"
]

const isSocialMediaUrl = async (url) => {
    return socialfeed.some((s) => url.endsWith(s));
}

module.exports = {
    // async afterCreate(event) {
    //     const { data } = event.params;
    //     const userId = strapi?.requestContext?.get()?.state?.user?.id;

    //     // let domainUrl = event.result?.url;
    //     // let domainName = event.result?.domainName;
    //     // let summary = event.result?.tagsData?.summary;
    //     // let category = event.result?.tagsData?.Category;
    //     // let mediaType = event.result.media_type;
    //     // let description = event.result.websiteInfo.description;
    //     // let keywords = event.result?.tagsData?.Keywords?.join(' ');
    //     // let brandcolor = event.result.Extras[0]?.logoColor?.join(' ') + ' ' + event.result.Extras[0].landingPageColor?.join(' ');
    //     // let email = event.result.Extras[3]?.email?.join(' ');
    //     // let technologystack = event.result.Extras[8]?.technologystack?.join(' ');
    //     // let text = event.result.Extras[9]?.text;

    //     // let string = event.result?.url + ' ' + event.result?.domainName + ' ' + event.result?.tagsData?.summary + ' ' + event.result?.tagsData?.Category + ' ' + event.result.media_type + ' ' + event.result.websiteInfo.description + ' ' + brandcolor + ' ' + summary + ' ' + email + ' ' + technologystack + ' ' + sociallinks

    //     // await elasticClient.index({
    //     //     index: "domainmanager",
    //     //     body: {
    //     //         id: event.result.id,
    //     //         // string: string,
    //     //         domainUrl,
    //     //         domainName,
    //     //         summary,
    //     //         category,
    //     //         mediaType,
    //     //         description,
    //     //         keywords,
    //     //         brandcolor,
    //     //         email,
    //     //         technologystack,
    //     //         text,
    //     //         author: userId,
    //     //     },
    //     // });

    //     const standardUrl = await standardAPI(data.url)
    //     const url = new URL(standardUrl)
    //     const domain = parse(standardUrl);
    //     const origin = url.protocol + '//' + domain.domain + '/';
    //     const socialfeedURL = await isSocialMediaUrl(url.hostname)
    //     let profileUrl

    //     if (data.url.includes("twitter.com")) profileUrl = url.origin + url.pathname.split('/').slice(0, 2).join('/');

    //     if (data.url.includes("github.com")) profileUrl = url.origin + '/' + url.pathname.split('/').slice(1, 2).join('/');

    //     if (data.url.includes("reddit.com")) profileUrl = url.origin + url.pathname.split('/').slice(0, 3).join('/');
 
    //     if (data.url.includes("medium.com")) profileUrl = url.origin + url.pathname.split('/').slice(0, 2).join('/');

    //     const isProfileUrl = data.url === profileUrl + '/';
    //     const domainManager = await strapi.db.query("api::domain-manager.domain-manager").findMany({
    //         where: socialfeedURL && !isProfileUrl ? { url: profileUrl } : { url: origin }
    //     })

    //     if (domainManager.length < 1) {
    //         try {
    //             // await axios.get(`http://localhost:1337/api/domain?url=${socialfeedURL ? parentUrl : origin}&email=true&phonenumber=true&brandcolor=true&sociallink=true&category=true&text=true&technologystack=true&screenshot=true&iframe=true&digitalrank=true`);
    //             const url = socialfeedURL && !isProfileUrl ? profileUrl : origin
    //             const parentUrl = `url=${url}&email=true&phonenumber=true&brandcolor=true&sociallink=true&category=true&text=true&technologystack=true&screenshot=true&iframe=true&digitalrank=true`

    //             const urlObj = parentUrl.split('&')
    //             let prepareUrlObj = []
    //             urlObj.forEach((u) => {
    //                 const test = u.split('=')
    //                 prepareUrlObj.push({
    //                     "field": test[0],
    //                     "value": test[1]
    //                 })
    //             })
    //             const obj = {
    //                 url: prepareUrlObj,
    //                 isDomain: true,
    //                 userId
    //             }

    //             await strapi.service("api::domain-detail.domain-details").getOrCreateDomainDetails(obj, prepareUrlObj[0].value)
    //         }
    //         catch (err) {
    //             console.log("Error ===>", err, origin)
    //         }
    //     }
    // },

    // async afterUpdate(event) {
    //     const { params, result } = event;
    //     const userId = strapi?.requestContext?.get()?.state?.user?.id;

    //     if (!params.data.isElastic) {
    //         const mainDomain = await strapi.entityService.findOne("api::domain-manager.domain-manager", result.id, {
    //             populate: { Extras: true }
    //         });

    //         let domainUrl = mainDomain?.url;
    //         let domainName = mainDomain?.domainName;
    //         let summary = mainDomain?.tagsData?.summary;
    //         let category = mainDomain?.tagsData?.Category;
    //         let mediaType = mainDomain.media_type;
    //         let description = mainDomain.websiteInfo.description;
    //         let keywords = mainDomain?.tagsData?.Keywords?.join(' ');
    //         let brandcolor = mainDomain.Extras[0]?.logoColor?.join(' ') + ' ' + mainDomain.Extras[0].landingPageColor?.join(' ');
    //         let email = mainDomain.Extras[3]?.email?.join(' ');
    //         let technologystack = mainDomain.Extras[8]?.technologystack?.join(' ');
    //         let text = mainDomain.Extras[9]?.text;

    //         await elasticClient.index({
    //             index: "domainmanager",
    //             body: {
    //                 id: result.id,
    //                 // string: string,
    //                 domainUrl,
    //                 domainName,
    //                 summary,
    //                 category,
    //                 mediaType,
    //                 description,
    //                 keywords,
    //                 brandcolor,
    //                 email,
    //                 technologystack,
    //                 text,
    //                 author: userId,
    //             },
    //         });
    //     }
    // }
}
