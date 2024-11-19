"use strict";

const { convertRestQueryParams } = require("strapi-utils");
const { standardAPI } = require("../../../../protocol");
const { parse } = require("tldts");
const { social_link } = require("../../../../constant");
const { getFullScreenshot } = require("../../../../utils");

/**
 * A set of functions called "actions" for `domain-details`
 */
const profileArr = [
  'twitter.com',
  'instagram.com',
  'facebook.com',
  'pinterest.com',
  'tiktok.com',

];
const profileArray = [
  'linkedin.com',
  'youtube.com',
  'snapchat.com',
  'reddit.com'
]
const socialMediaDomains = [
  ...profileArr,
  ...profileArray,
];
const isSocialMediaUrl = async (url) => {
  return socialMediaDomains.some((socialDomain) => url.endsWith(socialDomain));
}

module.exports = {
  getDomainDetails: async (ctx, next) => {
    const { isDomain, userId } = ctx.request.query;
    const filter = convertRestQueryParams(ctx.request.query);
    const origin = ctx.request.query.url;
    let url = filter.where;

    if (url[0].field === "url") {
      let urlArray = await standardAPI(url[0].value);
      url[0].value = urlArray;
    }

    let queryURL = await standardAPI(ctx.request.query.url);
    let subDomainDetails = parse(queryURL);

    if (
      /^(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/g.test(
        queryURL
      )
    ) {

      const entries = await strapi.entityService.findMany(
        "api::domain-manager.domain-manager",
        {
          populate: "*",
          filters: { url: queryURL },
        }
      );

      let domain = new URL(queryURL);

      const socialMediaUrl = await isSocialMediaUrl(domain.hostname)

      if (entries.length > 0) {
        let author = entries[0].author;
        author.push(userId)
        await strapi
            .entityService.update("api::domain-manager.domain-manager", entries[0].id, {
              data: {
                author
              }
            })
        const city = entries[0].websiteInfo?.city
        const address = []
        if (city && city.name) address.push(city?.name)
        if (city && city.add) address.push(city?.address)
        if (city && city.pcode) address.push(city?.postcode)

        const queryParams = []
        for (let i = 0; i < url.length; i++) {
          const newQP = entries[0]?.Extras.filter((e) => {
            return e.queryStr === url[i].field;
          });
          if (newQP.length === 0) {
            queryParams.push(url[i])
          }
        }

        if (queryParams.length > 1) {
          const data = await strapi
            .service("api::domain-detail.domain-details")
            .getDomainDetails(queryParams, origin, ctx.request.query.url);

          const tagData = entries[0]?.TagsData
          const logoColor = entries[0]?.Extras[0]?.logoColor;
          const landingPageColor = entries[0]?.Extras[0]?.landingPageColor;
          const iframe = entries[0]?.Extras[1]?.iframe;
          const category = entries[0]?.Extras[2]?.category;
          const email = entries[0]?.Extras[3]?.email;
          const digitalrank = entries[0]?.Extras[4]?.digitalrank;
          const phonenumber = entries[0]?.Extras[5]?.phonenumber;
          const fullscreenshot = entries[0]?.Extras[6]?.fullscreenshot;
          const screenshot = entries[0]?.Extras[6]?.screenshot;
          const socialLinks = entries[0]?.Extras[7]?.socialLinks;
          const technologystack = entries[0]?.Extras[8]?.technologystack;
          const text = entries[0]?.Extras[9]?.text;

          const createDomainDetails = await strapi
            .entityService.update("api::domain-manager.domain-manager", entries[0].id, {
              populate: "*",
              data: {
                TagsData: tagData ? tagData : data?.tagsData,
                isElastic: true,

                Extras: [
                  {
                    __component: "extras.brand-colors",
                    brand_colors: ctx.request.query.brandcolor ? ctx.request.query.brandcolor : entries[0]?.Extras[0]?.brand_colors,
                    logoColor: logoColor ? logoColor : data.brandcolors?.logoColor,
                    landingPageColor: landingPageColor ? landingPageColor : data.brandcolors?.landingPageColor,
                    isPublished: ctx.request.query.brandcolor ? ctx.request.query.brandcolor : entries[0]?.Extras[0]?.isPublished,
                    queryStr: ctx.request.query.brandcolor ? 'brandcolor' : entries[0]?.Extras[0]?.queryStr,
                  },
                  {
                    __component: "extras.iframe",
                    iframe_bool: ctx.request.query.iframe ? ctx.request.query.iframe : entries[0]?.Extras[1]?.iframe_bool,
                    iframe: iframe ? iframe : data?.iframe,
                    isPublished: ctx.request.query.iframe ? ctx.request.query.iframe : entries[0]?.Extras[1]?.isPublished,
                    queryStr: ctx.request.query.iframe ? 'iframe' : entries[0]?.Extras[1]?.queryStr,
                  },
                  {
                    __component: "extras.category",
                    category_bool: ctx.request.query.category ? ctx.request.query.category : entries[0]?.Extras[2]?.category_bool,
                    category: category ? category : data?.category,
                    isPublished: ctx.request.query.category ? ctx.request.query.category : entries[0]?.Extras[2]?.isPublished,
                    queryStr: ctx.request.query.category ? 'category' : entries[0]?.Extras[2]?.queryStr,
                  },
                  {
                    __component: "extras.email",
                    email_bool: ctx.request.query.email ? ctx.request.query.email : entries[0]?.Extras[3]?.email_bool,
                    email: email ? email : data?.email,
                    isPublished: ctx.request.query.email ? ctx.request.query.email : entries[0]?.Extras[3]?.isPublished,
                    queryStr: ctx.request.query.email ? 'email' : entries[0]?.Extras[3]?.queryStr,
                  },
                  {
                    __component: "extras.digital-rank",
                    digitalrank_bool: ctx.request.query.digitalrank ? ctx.request.query.digitalrank : entries[0]?.Extras[4]?.digitalrank_bool,
                    digitalrank: digitalrank ? digitalrank : data?.digitalrank,
                    isPublished: ctx.request.query.digitalrank ? ctx.request.query.digitalrank : entries[0]?.Extras[4]?.isPublished,
                    queryStr: ctx.request.query.digitalrank ? 'digitalrank' : entries[0]?.Extras[4]?.queryStr,
                  },
                  {
                    __component: "extras.phone-numbers",
                    phonenumber_bool: ctx.request.query.phonenumber ? ctx.request.query.phonenumber : entries[0]?.Extras[5]?.phonenumber_bool,
                    phonenumber: phonenumber ? phonenumber : data?.phonenumber,
                    isPublished: ctx.request.query.phonenumber ? ctx.request.query.phonenumber : entries[0]?.Extras[5]?.isPublished,
                    queryStr: ctx.request.query.phonenumber ? 'phonenumber' : entries[0]?.Extras[5]?.queryStr,
                  },
                  {
                    __component: "extras.screenshots",
                    screenshot_bool: ctx.request.query.screenshot ? ctx.request.query.screenshot : entries[0]?.Extras[6]?.screenshot_bool,
                    fullscreenshot: fullscreenshot ? fullscreenshot : data.screenshot?.fullscreenshot,
                    screenshot: screenshot ? screenshot : data.screenshot?.screenshot,
                    isPublished: ctx.request.query.screenshot ? ctx.request.query.screenshot : entries[0]?.Extras[6]?.isPublished,
                    queryStr: ctx.request.query.screenshot ? 'screenshot' : entries[0]?.Extras[6]?.queryStr,
                  },
                  {
                    __component: "extras.social-links",
                    sociallink_bool: ctx.request.query.sociallink ? ctx.request.query.sociallink : entries[0]?.Extras[7]?.sociallink_bool,
                    socialLinks: socialLinks ? socialLinks : data?.sociallink,
                    isPublished: ctx.request.query.sociallink ? ctx.request.query.sociallink : entries[0]?.Extras[7]?.isPublished,
                    queryStr: ctx.request.query.sociallink ? 'sociallink' : entries[0]?.Extras[7]?.queryStr,
                  },
                  {
                    __component: "extras.technology-stack",
                    technologystack_bool: ctx.request.query.technologystack ? ctx.request.query.technologystack : entries[0]?.Extras[8]?.technologystack_bool,
                    technologystack: technologystack ? technologystack : data?.technologystack,
                    isPublished: ctx.request.query.technologystack ? ctx.request.query.technologystack : entries[0]?.Extras[8]?.isPublished,
                    queryStr: ctx.request.query.technologystack ? 'technologystack' : entries[0]?.Extras[8]?.queryStr,
                  },
                  {
                    __component: "extras.text",
                    text_bool: ctx.request.query.text ? ctx.request.query.text : entries[0]?.Extras[9]?.text_bool,
                    text: text ? text : data?.text,
                    isPublished: ctx.request.query.text ? ctx.request.query.text : entries[0]?.Extras[9]?.isPublished,
                    queryStr: ctx.request.query.text ? 'text' : entries[0]?.Extras[9]?.queryStr,
                  },
                  {
                    __component: "extras.additional-fields",
                    additionalFields: data.additionalFields,
                    isPublished: data.additionalFields ? true : false,
                  },
                ],
              },
            });

          const payload = {
            id: createDomainDetails.id,
            url: createDomainDetails.url,
            SocialWebsites: createDomainDetails.SocialWebsites,
            description: createDomainDetails.description,
            title: createDomainDetails.title,
            summary: createDomainDetails.TagsData?.Summary,
            domaintype: createDomainDetails.DomainType,
            keyword: createDomainDetails.TagsData?.Keywords,
            category: createDomainDetails?.Extras[2]?.category,
            type: createDomainDetails.TagsData?.Category,
            domain_name: createDomainDetails.domainName,
            total_employees_exact: createDomainDetails.websiteInfo?.totalEmployees,
            monthly_visitors: createDomainDetails.websiteInfo?.monthly_visitors,
            revenue: createDomainDetails.websiteInfo?.revenue,
            address: address,
            year_founded: createDomainDetails.websiteInfo?.year_founded,
            industries: createDomainDetails.websiteInfo?.industries,
            stockExchange: createDomainDetails.websiteInfo?.stockExchange,
            stockSymbol: createDomainDetails.websiteInfo?.stockSymbol,
            companyParent: createDomainDetails.websiteInfo?.companyParent,
            companiesSubsidiaries: createDomainDetails.websiteInfo?.companiesSubsidiaries,
            companiesAcquisitions: createDomainDetails.websiteInfo?.companiesAcquisitions,
            code_naics: !createDomainDetails.websiteInfo?.code_naics ? null : createDomainDetails.websiteInfo?.code_naics,
            code_saic: !createDomainDetails.websiteInfo?.code_saic ? null : createDomainDetails.websiteInfo?.code_saic,
            thumbnail_url: createDomainDetails.thumbnailUrl,
            logo_url: createDomainDetails.logoUrl,
            icon_url: createDomainDetails.iconUrl,
            logoColor: createDomainDetails?.Extras[0]?.logoColor,
            landingPageColor: createDomainDetails?.Extras[0]?.landingPageColor,
            emails: createDomainDetails?.Extras[3]?.email,
            digital_rank: createDomainDetails?.Extras[4]?.digitalrank,
            phone_numbers: createDomainDetails?.Extras[5]?.phonenumber,
            screenshot_url: createDomainDetails?.Extras[6]?.screenshot,
            full_screenshot_url: createDomainDetails?.Extras[6]?.fullscreenshot,
            social_links: createDomainDetails?.Extras[7]?.socialLinks,
            technologystack: createDomainDetails?.Extras[8]?.technologystack,
            website_text: createDomainDetails?.Extras[9]?.text,
            iframe: createDomainDetails?.Extras[1]?.iframe,
            additionalFields: createDomainDetails?.Extras[10]?.additionalFields,
            companiesSimilar: createDomainDetails.websiteInfo?.companiesSimilar,
            updatedAt: createDomainDetails.updatedAt,
            mediaType: createDomainDetails.media_type
          }

          ctx.response.send(payload);
          return
        }

        const payload = {
          id: entries[0].id,
          url: entries[0].url,
          SocialWebsites: entries[0].SocialWebsites,
          description: entries[0].description,
          title: entries[0].title,
          summary: entries[0].TagsData?.Summary,
          domaintype: entries[0].DomainType,
          keyword: entries[0].TagsData?.Keywords,
          category: entries[0]?.Extras[2]?.category,
          type: entries[0].TagsData?.Category,
          domain_name: entries[0].domainName,
          total_employees_exact: entries[0].websiteInfo?.totalEmployees,
          monthly_visitors: entries[0].websiteInfo?.monthly_visitors,
          revenue: entries[0].websiteInfo?.revenue,
          address: address,
          year_founded: !entries[0].websiteInfo?.year_founded ? null : entries[0].websiteInfo?.year_founded,
          industries: entries[0].websiteInfo?.industries,
          stockExchange: entries[0].websiteInfo?.stockExchange,
          stockSymbol: entries[0].websiteInfo?.stockSymbol,
          companyParent: entries[0].websiteInfo?.companyParent,
          companiesSubsidiaries: entries[0].websiteInfo?.companiesSubsidiaries,
          companiesAcquisitions: entries[0].websiteInfo?.companiesAcquisitions,
          code_naics: !entries[0].websiteInfo?.code_naics ? null : entries[0].websiteInfo?.code_naics,
          code_saic: !entries[0].websiteInfo?.code_saic ? null : entries[0].websiteInfo?.code_saic,
          thumbnail_url: entries[0].thumbnailUrl,
          logo_url: entries[0].logoUrl,
          icon_url: entries[0].iconUrl,
          logoColor: entries[0]?.Extras[0]?.logoColor,
          landingPageColor: entries[0]?.Extras[0]?.landingPageColor,
          emails: entries[0]?.Extras[3]?.email,
          digital_rank: entries[0]?.Extras[4]?.digitalrank,
          phone_numbers: entries[0]?.Extras[5]?.phonenumber,
          screenshot_url: entries[0]?.Extras[6]?.screenshot,
          full_screenshot_url: entries[0]?.Extras[6]?.fullscreenshot,
          social_links: entries[0]?.Extras[7]?.socialLinks,
          technologystack: entries[0]?.Extras[8]?.technologystack,
          website_text: entries[0]?.Extras[9]?.text,
          iframe: entries[0]?.Extras[1]?.iframe,
          additionalFields: entries[0]?.Extras[10]?.additionalFields,
          companiesSimilar: entries[0].websiteInfo?.companiesSimilar,
          updatedAt: entries[0].updatedAt,
          mediaType: entries[0].media_type
        }

        ctx.response.send(payload);
      } else if (socialMediaUrl && domain.pathname.length > 1) {

        const profileArrUrl = profileArr.some(link => link.startsWith(domain.hostname));
        const profileArrayUrl = profileArray.some(link => link.startsWith(domain.hostname));

        const urlParts = domain.href.split('/');
        let type;

        switch (true) {

          case domain.href.includes("soundcloud"):
            type = "Audio"
            break;

          case domain.href.includes("amazon"):
            type = "Product"
            break;

          case profileArrUrl:
            type = urlParts.length === 5 ? "Profile" : "Social Feed"
            break;

          case profileArrayUrl:
            type = urlParts.length === 6 ? "Profile" : "Social Feed"
            break;

          default:
            type = "Link"
            break;
        }

        const desiredFields = ['url'];

        const filteredArr = url.filter(obj => desiredFields.includes(obj.field));

        const data = await strapi
          .service("api::domain-detail.domain-details")
          .getDomainDetails(filteredArr, origin, ctx.request.query.url);
        const createDomainDetails = await strapi
          .service("api::domain-manager.domain-manager")
          .create({
            populate: "*",
            data: {
              url: queryURL,
              SocialWebsites: true,
              renderOnlyObj: data.core,
              domainName: subDomainDetails.domain,
              media_type: type,
              author: userId ? userId : null ,
              Extras: [
                {
                  __component: "extras.brand-colors",
                  brand_colors: false,
                },
                {
                  __component: "extras.iframe",
                  iframe_bool: false,
                },
                {
                  __component: "extras.category",
                  category_bool: false,
                },
                {
                  __component: "extras.email",
                  email_bool: false,
                },
                {
                  __component: "extras.digital-rank",
                  digitalrank_bool: false,
                },
                {
                  __component: "extras.phone-numbers",
                  phonenumber_bool: false,
                },
                {
                  __component: "extras.screenshots",
                  screenshot_bool: false,
                  fullscreenshot_bool: false,
                },
                {
                  __component: "extras.social-links",
                  sociallink_bool: false,
                },
                {
                  __component: "extras.technology-stack",
                  technologystack_bool: false,
                },
                {
                  __component: "extras.text",
                  text_bool: false,
                },
                {
                  __component: "extras.additional-fields",
                  additionalFields: data.additionalFields,
                  isPublished: true
                },
              ],
            },
          });
        let createGemDetails
        if (!isDomain) {
          createGemDetails = await strapi.service("api::gem.gem").create({
            data: {
              url: data.core.url,
              description: data.core.error ? '' : data.core?.meta?.description,
              title: data.core.error ? '' : data.core?.meta?.title,
              media_type: type,
              isDomainDetails: true
            },
          });
        }

        const domainUrl = domain.protocol + '//' + subDomainDetails.domain + '/'
        const mainDomain = await strapi.entityService.findMany(
          "api::domain-manager.domain-manager",
          {
            populate: "*",
            filters: { url: domainUrl },
          }
        );

        const updateDomainDetails = await strapi
          .entityService.update("api::domain-manager.domain-manager", createDomainDetails.id, {
            populate: "*",
            data: {
              websiteInfo: mainDomain[0]?.websiteInfo,
              gems: createGemDetails?.id,
              MainDomain: mainDomain[0].id,
              isElastic: true,

              Extras: [
                {
                  __component: "extras.brand-colors",
                  brand_colors: true,
                  logoColor: mainDomain[0]?.Extras[0]?.logoColor,
                  landingPageColor: mainDomain[0]?.Extras[0]?.landingPageColor,
                  isPublished: true,
                  queryStr: 'brandcolor',
                },
                {
                  __component: "extras.iframe",
                  iframe_bool: true,
                  iframe: createDomainDetails?.renderOnlyObj?.html,
                  isPublished: true,
                  queryStr: 'iframe',
                },
                {
                  __component: "extras.category",
                  category_bool: true,
                  category: mainDomain[0]?.Extras[2]?.category,
                  isPublished: true,
                  queryStr: 'category',
                },
                {
                  __component: "extras.email",
                  email_bool: true,
                  email: mainDomain[0]?.Extras[3]?.email,
                  isPublished: true,
                  queryStr: 'email',
                },
                {
                  __component: "extras.digital-rank",
                  digitalrank_bool: true,
                  digitalrank: mainDomain[0]?.Extras[4]?.digitalrank,
                  isPublished: true,
                  queryStr: 'digitalrank',
                },
                {
                  __component: "extras.phone-numbers",
                  phonenumber_bool: true,
                  phonenumber: mainDomain[0]?.Extras[5]?.phonenumber,
                  isPublished: true,
                  queryStr: 'phonenumber',
                },
                {
                  __component: "extras.screenshots",
                  screenshot_bool: true,
                  fullscreenshot: mainDomain[0]?.Extras[6]?.fullscreenshot,
                  screenshot: mainDomain[0]?.Extras[6]?.screenshot,
                  isPublished: true,
                  queryStr: 'screenshot',
                },
                {
                  __component: "extras.social-links",
                  sociallink_bool: true,
                  socialLinks: mainDomain[0]?.Extras[7]?.sociallinks,
                  isPublished: true,
                  queryStr: 'sociallink',
                },
                {
                  __component: "extras.technology-stack",
                  technologystack_bool: true,
                  technologystack: mainDomain[0]?.Extras[8]?.technologystack,
                  isPublished: true,
                  queryStr: 'technologystack',
                },
                {
                  __component: "extras.text",
                  text_bool: true,
                  text: mainDomain[0]?.Extras[9]?.text,
                  isPublished: true,
                  queryStr: 'text',
                },
                {
                  __component: "extras.additional-fields",
                  additionalFields: data?.additionalFields,
                  isPublished: data.additionalFields ? true : false,
                },
              ],
            },
          });

        const payload = {
          id: updateDomainDetails.id,
          url: updateDomainDetails.url,
          SocialWebsites: updateDomainDetails.SocialWebsites,
          iframe: updateDomainDetails.renderOnlyObj.html,
          domain_name: updateDomainDetails.domainName,
          additionalFields: updateDomainDetails?.Extras[10]?.additionalFields,
          updatedAt: updateDomainDetails.updatedAt,
          mediaType: updateDomainDetails.media_type,
        }

        ctx.response.send(payload);
      } else if (domain.pathname.length > 1) {

        const desiredFields = ['url', 'text', 'screenshot', 'brandcolor'];
        const filteredArr = url.filter(obj => desiredFields.includes(obj.field));

        const data = await strapi
          .service("api::domain-detail.domain-details")
          .getDomainDetails(filteredArr, origin, ctx.request.query.url);

        const createDomainDetails = await strapi
          .service("api::domain-manager.domain-manager")
          .create({
            populate: "*",
            data: {
              url: queryURL,
              description: data.core.status = 404 ? '' : data.core?.meta?.description,
              title: data.core.status = 404 ? '' : data.core?.meta?.title,
              websiteInfo: data.websiteInfo,
              SocialWebsites: social_link.some((link) => queryURL.startsWith(link)),
              renderOnlyObj: data.core,
              DomainType: "URL",
              media_type: "Link",
              domainName: subDomainDetails.domain,
              TagsData: data.tagsData,
              siteSummary: data.summaryText,
              author: userId ? userId : null ,
              Extras: [
                {
                  __component: "extras.brand-colors",
                  brand_colors: ctx.request.query.brandcolor,
                  logoColor:
                    ctx.request.query.brandcolor === "true"
                      ? data.brandcolors.logoColor
                      : null,
                  landingPageColor:
                    ctx.request.query.brandcolor === "true"
                      ? data.brandcolors.landingPageColor
                      : null,
                  isPublished: ctx.request.query.brandcolor,
                  queryStr: ctx.request.query.brandcolor === "true"
                    ? 'brandcolor'
                    : null,
                },
                {
                  __component: "extras.iframe",
                  iframe_bool: false,
                },
                {
                  __component: "extras.category",
                  category_bool: false,
                },
                {
                  __component: "extras.email",
                  email_bool: false,
                },
                {
                  __component: "extras.digital-rank",
                  digitalrank_bool: false,
                },
                {
                  __component: "extras.phone-numbers",
                  phonenumber_bool: false,
                },
                {
                  __component: "extras.screenshots",
                  screenshot_bool: ctx.request.query.screenshot,
                  fullscreenshot_bool: ctx.request.query.fullscreenshot,
                  fullscreenshot: data.screenshot.fullscreenshot,
                  screenshot: data.screenshot.screenshot,
                  isPublished: ctx.request.query.screenshot,
                  queryStr: ctx.request.query.screenshot === "true"
                    ? 'screenshot'
                    : null,
                },
                {
                  __component: "extras.social-links",
                  sociallink_bool: false,
                },
                {
                  __component: "extras.technology-stack",
                  technologystack_bool: false,
                },
                {
                  __component: "extras.text",
                  text_bool: ctx.request.query.text,
                  text: data.text,
                  isPublished: ctx.request.query.text,
                  queryStr: ctx.request.query.text === "true"
                    ? 'text'
                    : null,
                },
                {
                  __component: "extras.additional-fields",
                  additionalFields: data.additionalFields,
                },
              ],
            },
          });

        const domainUrl = domain.protocol + '//' + subDomainDetails.domain + '/'

        const domainDetails = await strapi.entityService.findMany(
          "api::domain-manager.domain-manager",
          {
            populate: "*",
            filters: { url: domainUrl },
          }
        );
        let createGemDetails;
        if (!isDomain) {
          createGemDetails = await strapi.service("api::gem.gem").create({
            data: {
              url: data.core.url,
              description: data.core?.meta?.description,
              title: data.core?.meta?.title,
              isDomainDetails: true
            },
          });
        }

        const updateDomainDetails = await strapi
          .entityService.update("api::domain-manager.domain-manager", createDomainDetails.id, {
            populate: "*",
            data: {
              websiteInfo: domainDetails[0]?.websiteInfo,
              gems: createGemDetails?.id,
              MainDomain: domainDetails[0]?.id,
              isElastic: true,

              Extras: [
                {
                  __component: "extras.brand-colors",
                  brand_colors: ctx.request.query.brandcolor,
                  logoColor:
                    ctx.request.query.brandcolor === "true"
                      ? createDomainDetails?.Extras[0]?.logoColor
                      : null,
                  landingPageColor:
                    ctx.request.query.brandcolor === "true"
                      ? createDomainDetails?.Extras[0]?.landingPageColor
                      : null,
                  isPublished: ctx.request.query.brandcolor,
                  queryStr: ctx.request.query.brandcolor === "true"
                    ? 'brandcolor'
                    : null,
                },
                {
                  __component: "extras.iframe",
                  iframe_bool: domainDetails[0]?.Extras[1]?.iframe_bool,
                  iframe: domainDetails[0]?.Extras[1]?.iframe,
                  isPublished: ctx.request.query.iframe,
                  queryStr: domainDetails[0]?.Extras[1]?.iframe_bool === true
                    ? 'iframe'
                    : null,
                },
                {
                  __component: "extras.category",
                  category_bool: domainDetails[0]?.Extras[2]?.category_bool,
                  category: domainDetails[0]?.Extras[2]?.category,
                  isPublished: ctx.request.query.category,
                  queryStr: domainDetails[0]?.Extras[2]?.category_bool === true
                    ? 'category'
                    : null,
                },
                {
                  __component: "extras.email",
                  email_bool: domainDetails[0]?.Extras[3]?.email_bool,
                  email: domainDetails[0]?.Extras[3]?.email,
                  isPublished: ctx.request.query.email,
                  queryStr: domainDetails[0]?.Extras[3]?.email_bool === true
                    ? 'email'
                    : null,
                },
                {
                  __component: "extras.digital-rank",
                  digitalrank_bool: domainDetails[0]?.Extras[4]?.digitalrank_bool,
                  digitalrank: domainDetails[0]?.Extras[4]?.digitalrank,
                  isPublished: ctx.request.query.digitalrank,
                  queryStr: domainDetails[0]?.Extras[4]?.digitalrank_bool === true
                    ? 'digitalrank'
                    : null,
                },
                {
                  __component: "extras.phone-numbers",
                  phonenumber_bool: domainDetails[0]?.Extras[5]?.phonenumber_bool,
                  phonenumber: domainDetails[0]?.Extras[5]?.phonenumber,
                  isPublished: ctx.request.query.phonenumber,
                  queryStr: domainDetails[0]?.Extras[5]?.phonenumber_bool === true
                    ? 'phonenumber'
                    : null,
                },
                {
                  __component: "extras.screenshots",
                  screenshot_bool: ctx.request.query.screenshot,
                  fullscreenshot_bool: ctx.request.query.fullscreenshot,
                  fullscreenshot: createDomainDetails?.Extras[6]?.fullscreenshot,
                  screenshot: createDomainDetails?.Extras[6]?.screenshot,
                  isPublished: ctx.request.query.screenshot,
                  queryStr: ctx.request.query.screenshot === "true"
                    ? 'screenshot'
                    : null,
                },
                {
                  __component: "extras.social-links",
                  sociallink_bool: domainDetails[0]?.Extras[7]?.sociallink_bool,
                  socialLinks: domainDetails[0]?.Extras[7]?.socialLinks,
                  isPublished: ctx.request.query.sociallink,
                  queryStr: domainDetails[0]?.Extras[7]?.sociallink_bool === true
                    ? 'sociallink'
                    : null,
                },
                {
                  __component: "extras.technology-stack",
                  technologystack_bool: domainDetails[0]?.Extras[8]?.technologystack_bool,
                  technologystack: domainDetails[0]?.Extras[8]?.technologystack,
                  isPublished: ctx.request.query.technologystack,
                  queryStr: domainDetails[0]?.Extras[8]?.technologystack_bool === true
                    ? 'technologystack'
                    : null,
                },
                {
                  __component: "extras.text",
                  text_bool: ctx.request.query.text,
                  text: createDomainDetails?.Extras[9]?.text,
                  isPublished: ctx.request.query.text,
                  queryStr: ctx.request.query.text === "true"
                    ? 'text'
                    : null,
                },
                {
                  __component: "extras.additional-fields",
                  additionalFields: data.additionalFields,
                  isPublished: data.additionalFields ? true : false,
                },
              ],
            },
          });

        ctx.response.send(updateDomainDetails);
      } else {
        let type;
        switch (true) {
          case domain.href.includes("youtube"):
            type = "Video"
            break;

          case domain.href.includes("twitter"):
            type = "Twitter"
            break;

          case domain.href.includes("soundcloud"):
            type = "Audio"
            break;

          case domain.href.includes("amazon"):
            type = "Product"
            break;

          default:
            type = "Link"
            break;
        }

        const data = await strapi
          .service("api::domain-detail.domain-details")
          .getDomainDetails(url, origin, ctx.request.query.url);

        const urlid = await strapi.entityService.findMany(
          "api::domain-manager.domain-manager",
          {
            filters: { domainName: subDomainDetails.domain },
          }
        );
        let result = urlid.map(({ id }) => id);

        const createDomainDetails = await strapi
          .service("api::domain-manager.domain-manager")
          .create({
            populate: "*",
            data: {
              url: queryURL,
              description: data.core.status === 404 ? '' : data.core?.meta?.description,
              title: data.core.status === 404 ? '' : data.core?.meta?.title,
              SocialWebsites: social_link.some((link) => data.core.url.startsWith(link)),
              websiteInfo: data.websiteInfo,
              iconUrl: data.icon,
              logoUrl: data.logo,
              thumbnailUrl: data.thumbnail,
              domainName: subDomainDetails.domain,
              medium: data.core?.meta?.medium,
              canonical: data.core?.meta?.canonical,
              renderOnlyObj: data.core,
              DomainType: subDomainDetails.subdomain ? "Subdomain" : "Domain",
              TagsData: data.tagsData,
              media_type: type,
              author: userId ? userId : null ,
              Extras: [
                {
                  __component: "extras.brand-colors",
                  brand_colors: ctx.request.query.brandcolor,
                  logoColor:
                    ctx.request.query.brandcolor === "true"
                      ? data.brandcolors.logoColor
                      : null,
                  landingPageColor:
                    ctx.request.query.brandcolor === "true"
                      ? data.brandcolors.landingPageColor
                      : null,
                  isPublished: ctx.request.query.brandcolor,
                  queryStr: ctx.request.query.brandcolor === "true"
                    ? 'brandcolor'
                    : null,
                },
                {
                  __component: "extras.iframe",
                  iframe_bool: ctx.request.query.iframe,
                  iframe: data.iframe,
                  isPublished: ctx.request.query.iframe,
                  queryStr: ctx.request.query.iframe === "true"
                    ? 'iframe'
                    : null,
                },
                {
                  __component: "extras.category",
                  category_bool: ctx.request.query.category,
                  category: data.category,
                  isPublished: ctx.request.query.category,
                  queryStr: ctx.request.query.category === "true"
                    ? 'category'
                    : null,
                },
                {
                  __component: "extras.email",
                  email_bool: ctx.request.query.email,
                  email: data.email,
                  isPublished: ctx.request.query.email,
                  queryStr: ctx.request.query.email === "true"
                    ? 'email'
                    : null,
                },
                {
                  __component: "extras.digital-rank",
                  digitalrank_bool: ctx.request.query.digitalrank,
                  digitalrank:
                    ctx.request.query.digitalrank === "true"
                      ? data.digitalrank
                      : null,
                  isPublished: ctx.request.query.digitalrank,
                  queryStr: ctx.request.query.digitalrank === "true"
                    ? 'digitalrank'
                    : null,
                },
                {
                  __component: "extras.phone-numbers",
                  phonenumber_bool: ctx.request.query.phonenumber,
                  phonenumber: data.phonenumber,
                  isPublished: ctx.request.query.phonenumber,
                  queryStr: ctx.request.query.phonenumber === "true"
                    ? 'phonenumber'
                    : null,
                },
                {
                  __component: "extras.screenshots",
                  screenshot_bool: ctx.request.query.screenshot,
                  fullscreenshot_bool: ctx.request.query.fullscreenshot,
                  fullscreenshot: data.screenshot.fullscreenshot,
                  screenshot: data.screenshot.screenshot,
                  isPublished: ctx.request.query.screenshot,
                  queryStr: ctx.request.query.screenshot === "true"
                    ? 'screenshot'
                    : null,
                },
                {
                  __component: "extras.social-links",
                  sociallink_bool: ctx.request.query.sociallink,
                  socialLinks: data.sociallink,
                  isPublished: ctx.request.query.sociallink,
                  queryStr: ctx.request.query.sociallink === "true"
                    ? 'sociallink'
                    : null,
                },
                {
                  __component: "extras.technology-stack",
                  technologystack_bool: ctx.request.query.technologystack,
                  technologystack: data.technologystack,
                  isPublished: ctx.request.query.technologystack,
                  queryStr: ctx.request.query.technologystack === "true"
                    ? 'technologystack'
                    : null,
                },
                {
                  __component: "extras.text",
                  text_bool: ctx.request.query.text,
                  text: data.text,
                  isPublished: ctx.request.query.text,
                  queryStr: ctx.request.query.text === "true"
                    ? 'text'
                    : null,
                },
                {
                  __component: "extras.additional-fields",
                  additionalFields: data.additionalFields,
                  isPublished: data.additionalFields ? true : false,
                },
              ],
            },
          });

        let createGemDetails;
        if (!isDomain) {
            createGemDetails = await strapi.service("api::gem.gem").create({
              data: {
                url: queryURL,
                description: data.core.status === 404 ? '' : data.core?.meta?.description,
                title: data.core.status === 404 ? '' : data.core?.meta?.title,
                media_type: type,
                isDomainDetails: true
              },
            });
        }

        const mainDomain = await strapi.entityService.findMany(
          "api::domain-manager.domain-manager",
          {
            filters: { domainName: subDomainDetails.domain },
          }
        );

        let mainDomainId;
        mainDomain.map((data) => {
          let url = parse(data.url);
          if (url.subdomain.length <= 1) {
            mainDomainId = data.id;
          }
        });

        if (subDomainDetails.subdomain.length > 1) {
          const updateDomaindetails = await strapi.entityService.update(
            "api::domain-manager.domain-manager",
            createDomainDetails.id,
            {
              populate: "*",
              data: {
                gems: createGemDetails?.id,
                MainDomain: mainDomainId,
              },
            }
          );

          const city = updateDomaindetails.websiteInfo?.city;
          const address = [];
          if (city && city.name) address.push(city.name);
          if (city && city.add) address.push(city.address);
          if (city && city.pcode) address.push(city.postcode);

          const payload = {
            id: updateDomaindetails.id,
            url: updateDomaindetails.url,
            description: updateDomaindetails.description,
            title: updateDomaindetails.title,
            summary: updateDomaindetails.TagsData?.Summary,
            domaintype: updateDomaindetails.DomainType,
            keyword: updateDomaindetails.TagsData?.Keywords,
            category: updateDomaindetails?.Extras[2]?.category,
            type: updateDomaindetails.TagsData?.Category,
            domain_name: updateDomaindetails.domainName,
            total_employees_exact: updateDomaindetails.websiteInfo.totalEmployees,
            monthly_visitors: updateDomaindetails.websiteInfo.monthly_visitors,
            revenue: updateDomaindetails.websiteInfo.revenue,
            address: address,
            year_founded: !updateDomaindetails.websiteInfo.year_founded ? null : updateDomaindetails.websiteInfo.year_founded,
            industries: updateDomaindetails.websiteInfo?.industries,
            stockExchange: updateDomaindetails.websiteInfo?.stockExchange,
            stockSymbol: updateDomaindetails.websiteInfo?.stockSymbol,
            companyParent: updateDomaindetails.websiteInfo?.companyParent,
            companiesSubsidiaries: updateDomaindetails.websiteInfo?.companiesSubsidiaries,
            companiesAcquisitions: updateDomaindetails.websiteInfo?.companiesAcquisitions,
            code_naics: !updateDomaindetails.websiteInfo.code_naics ? null : updateDomaindetails.websiteInfo.code_naics,
            code_saic: !updateDomaindetails.websiteInfo.code_saic ? null : updateDomaindetails.websiteInfo.code_saic,
            thumbnail_url: updateDomaindetails.thumbnailUrl,
            logo_url: updateDomaindetails.logoUrl,
            icon_url: updateDomaindetails.iconUrl,
            logoColor: updateDomaindetails?.Extras[0]?.logoColor,
            landingPageColor: updateDomaindetails?.Extras[0]?.landingPageColor,
            emails: updateDomaindetails?.Extras[3]?.email,
            digital_rank: updateDomaindetails?.Extras[4]?.digitalrank,
            phone_numbers: updateDomaindetails?.Extras[5]?.phonenumber,
            screenshot_url: updateDomaindetails?.Extras[6]?.screenshot,
            full_screenshot_url: updateDomaindetails?.Extras[6]?.fullscreenshot,
            social_links: updateDomaindetails?.Extras[7]?.socialLinks,
            technologystack: updateDomaindetails?.Extras[8]?.technologystack,
            website_text: updateDomaindetails?.Extras[9]?.text,
            iframe: updateDomaindetails?.Extras[1]?.iframe,
            SocialWebsites: updateDomaindetails.SocialWebsites,
            additionalFields: updateDomaindetails?.Extras[10]?.additionalFields,
            companiesSimilar: updateDomaindetails.websiteInfo.companiesSimilar,
            updatedAt: updateDomaindetails.updatedAt,
            mediaType: updateDomaindetails.media_type
          }
          ctx.response.send(payload);

        } else {
          const updateDomaindetails = await strapi.entityService.update(
            "api::domain-manager.domain-manager",
            createDomainDetails.id,
            {
              populate: "*",
              data: {
                gems: createGemDetails?.id,
                URLs: result,
              },
            }
          );

          const city = updateDomaindetails.websiteInfo?.city
          const address = []

          if (city && city.name) address.push(city.name);
          if (city && city.add) address.push(city.address);
          if (city && city.pcode) address.push(city.postcode);

          const payload = {
            id: updateDomaindetails.id,
            url: updateDomaindetails.url,
            description: updateDomaindetails.description,
            title: updateDomaindetails.title,
            summary: updateDomaindetails.TagsData?.Summary,
            domaintype: updateDomaindetails.DomainType,
            keyword: updateDomaindetails.TagsData?.Keywords,
            category: updateDomaindetails?.Extras[2]?.category,
            type: updateDomaindetails.TagsData?.Category,
            domain_name: updateDomaindetails.domainName,
            total_employees_exact: updateDomaindetails.websiteInfo.totalEmployees,
            monthly_visitors: updateDomaindetails.websiteInfo.monthly_visitors,
            revenue: updateDomaindetails.websiteInfo.revenue,
            address: address,
            year_founded: !updateDomaindetails.websiteInfo.year_founded ? null : updateDomaindetails.websiteInfo.year_founded,
            industries: updateDomaindetails.websiteInfo?.industries,
            stockExchange: updateDomaindetails.websiteInfo?.stockExchange,
            stockSymbol: updateDomaindetails.websiteInfo?.stockSymbol,
            companyParent: updateDomaindetails.websiteInfo?.companyParent,
            companiesSubsidiaries: updateDomaindetails.websiteInfo?.companiesSubsidiaries,
            companiesAcquisitions: updateDomaindetails.websiteInfo?.companiesAcquisitions,
            code_naics: !updateDomaindetails.websiteInfo.code_naics ? null : updateDomaindetails.websiteInfo.code_naics,
            code_saic: !updateDomaindetails.websiteInfo.code_saic ? null : updateDomaindetails.websiteInfo.code_saic,
            thumbnail_url: updateDomaindetails.thumbnailUrl,
            logo_url: updateDomaindetails.logoUrl,
            icon_url: updateDomaindetails.iconUrl,
            logoColor: updateDomaindetails?.Extras[0]?.logoColor,
            landingPageColor: updateDomaindetails?.Extras[0]?.landingPageColor,
            emails: updateDomaindetails?.Extras[3]?.email,
            digital_rank: updateDomaindetails?.Extras[4]?.digitalrank,
            phone_numbers: updateDomaindetails?.Extras[5]?.phonenumber,
            screenshot_url: updateDomaindetails?.Extras[6]?.screenshot,
            full_screenshot_url: updateDomaindetails?.Extras[6]?.fullscreenshot,
            social_links: updateDomaindetails?.Extras[7]?.socialLinks,
            technologystack: updateDomaindetails?.Extras[8]?.technologystack,
            website_text: updateDomaindetails?.Extras[9]?.text,
            iframe: updateDomaindetails?.Extras[1]?.iframe,
            SocialWebsites: updateDomaindetails.SocialWebsites,
            additionalFields: updateDomaindetails?.Extras[10]?.additionalFields,
            companiesSimilar: updateDomaindetails.websiteInfo.companiesSimilar,
            updatedAt: updateDomaindetails.updatedAt,
            mediaType: updateDomaindetails.media_type
          }
          ctx.response.send(payload);
        }
      }
    } else {
      ctx.response.send({
        status: 400,
        message:
          "Please enter the valid url; Example: 'https://curateit.com/'",
      });
    }

  },
};