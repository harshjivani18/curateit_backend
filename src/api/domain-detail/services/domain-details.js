"use strict";

const mql = require("@microlink/mql");
const axios = require("axios");
const { Readability } = require("@mozilla/readability");
const { JSDOM } = require("jsdom");
const getColors = require("get-image-colors");
const sanitizeHtml = require("sanitize-html");
const { additional_field, social_link } = require("../../../../constant");
const { parse } = require('tldts');
const { openai } = require("../../../../utils");
const { standardAPI } = require("../../../../protocol");

/**
 * domain-details service
 */



const siteInfo = async (domain) => {
  console.log("Site Info")
  const info = await axios.get(`https://api.thecompaniesapi.com/v1/companies/${domain}`, {
    headers: {
      "Authorization": `Basic ${process.env.COMPANIES_API_KEY}`,
      "Accept-Encoding": "gzip,deflate,compress"
    }
  })
  console.log("site ---- info", info.data)
  return info.data
}

const iframelyRes = async (urldata) => {
  console.log("Iframely")
  const iframely = await axios({
    method: "get",
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'identity'
    },
    url: `https://iframe.ly/api/iframely?url=${urldata}/&api_key=${process.env.IFRAMELY_API_KEY}&iframe=1&omit_script=1`
  })
  console.log("iframely ---- info", iframely.data)
  return iframely.data
}

const emailPhone = async (urldata) => {
  const emailsArr = [];
  const phoneNumArr = [];
  console.log("Email Phone")
  const webcontact = await axios({
    method: "get",
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'identity'
    },
    url: `https://website-contacts.whoisxmlapi.com/api/v1?apiKey=${process.env.WEB_CONTACT_KEY}&domainName=${urldata}&outputFormat=json`
  });
  console.log("Webcontact ---- info", webcontact.data)
  let webcontactData = {
    emails: webcontact.data.emails,
    phones: webcontact.data.phones,
  };

  webcontactData.emails.map((data) => {
    emailsArr.push(data.email);
  });
  webcontactData.phones.map((data) => {
    phoneNumArr.push(data);
  });

  return {
    emailsArr,
    phoneNumArr
  }
}

const technologystackRes = async (urldata) => {
  try {
    const technologystackres = await mql(urldata, {
      apiKey: process.env.MICROLINK_API_KEY,
      meta: false,
      insights: {
        lighthouse: false,
        technologies: true,
      },
    })
    return technologystackres.data.insights.technologies
  }
  catch (err) {
    return []
  }
}

const text = async (urldata) => {
  const { data } = await mql(urldata, {
    apiKey: process.env.MICROLINK_API_KEY,
    meta: false,
    data: {
      html: {
        selector: "html",
      },
    },
  })
  const htmldata = sanitizeHtml(data.html);
  const doc = new JSDOM(htmldata, { url: urldata });
  let reader = new Readability(doc.window.document);
  const article = reader.parse().textContent.replace(/\t|\n/g, '');
  return article;
}

const categories = async (urldata) => {
  const categoryArr = [];
  console.log("Categories")
  const category = await axios({
    method: "get",
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'identity'
    },
    url: `https://website-categorization.whoisxmlapi.com/api/v2?apiKey=${process.env.WEB_CONTACT_KEY}&domainName=${urldata}`
  })
  console.log("category ---- info", category.data)

  category.data.categories.map((data) => {
    if (data.tier1 === null) {
      categoryArr;
    } else {
      categoryArr.push(data.tier1.name);
    }
    if (data.tier2 === null) {
      categoryArr;
    } else {
      categoryArr.push(data.tier2.name);
    }
  });
  const uniqueCategory = [...new Set(categoryArr)];
  return uniqueCategory
}

const screenshotRes = async (urldata) => {
  const res = await mql(urldata, {
    apiKey: process.env.MICROLINK_API_KEY,
    meta: false,
    screenshot: true,
  })
  const screenshotRes = res.data.screenshot
  return screenshotRes
}

const fullscreenshotRes = async (urldata) => {
  const res = await mql(urldata, {
    apiKey: process.env.MICROLINK_API_KEY,
    meta: false,
    screenshot: true,
    fullpage: true,
  })
  const fullscreenshot = res.data.screenshot
  return fullscreenshot
}

const iframeRes = async (urldata) => {
  console.log("Iframe html")
  const res = await axios({
    method: "get",
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'identity'
    },
    url: `https://iframe.ly/api/oembed?url=${urldata}/&api_key=${process.env.IFRAMELY_API_KEY}&iframe=1&omit_script=1`
  });
  console.log("iframely html ---- info", res.data)
  return res.data.html
}

const openaiRes = async (text) => {
  const promptsData = await strapi.entityService.findMany('api::internal-ai-prompt.internal-ai-prompt', {
    filters: { promptType: 'Explain Site & Get Keywords' }
  });
  const words = promptsData[0].inputWords;
  const textForOpenai = text.split(/\s+/).slice(0, words).join(" ");
  const prompt = promptsData[0].prompt.replace(/::{Text}::/g, textForOpenai);
  const openaiData = await openai(prompt);
  return openaiData;
}

const landingPagecolor = async (screenshot) => {
  const col = [];
  const colors = await getColors(screenshot);
  for (let i = 0; i < colors.length; i++) {
    colors.forEach((color) => {
      col.push(color.hex());
    });
  }
  return [...new Set(col)]
}

const logocolor = async (urldata) => {
  let logoCol;
  const { data } = await mql(urldata);
  if (!data.logo) {
    logoCol = [];
  } else if (data.logo.type === "image/x-icon" || "ico") {
    logoCol = [];
  } else {
    const logoColor = await getColors(data.logo.url);
    for (let i = 0; i < logoColor.length; i++) {
      logoColor.forEach((color) => {
        logoCol.push(color.hex());
      });
    }
  }
  const uniqueLogoCol = [...new Set(logoCol)];
  return [...new Set(logoCol)];
}

const digitalrank = async (domain) => {
  console.log("Digital Rank")
  const digitalRankData = await axios({
    method: "get",
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'identity'
    },
    url: `https://api.similarweb.com/v1/similar-rank/${domain}/rank?api_key=${process.env.SIMILAR_RANK_API_KEY}`
  });
  console.log("digital rank ---- info", digitalRankData.data)
  return digitalRankData.data.similar_rank.rank;
}

const sociallinkRes = async (urldata) => {
  console.log("Social Link")
  const res = await axios({
    method: "get",
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'identity'
    },
    url: `https://website-contacts.whoisxmlapi.com/api/v1?apiKey=${process.env.WEB_CONTACT_KEY}&domainName=${urldata}`
  })
  console.log("social link ---- info", res.data)
  return res.data.socialLinks
}

const github = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    headers: {
      'Accept-Encoding': '*',
    },
    data: {
      stats: {
        selector: ".application-main",
        attr: {
          followers: {
            selector:
              '.js-profile-editable-area a[href*="tab=followers"] span',
            type: "boolean",
          },
          following: {
            selector:
              '.js-profile-editable-area a[href*="tab=following"] span',
            type: "boolean",
          },
          stars: {
            selector:
              '.js-responsive-underlinenav a[data-tab-item="stars"] span',
            type: "boolean",
          },
        },
      },
    },
  });

  return {
    followers: data.stats.followers,
    following: data.stats.following,
    stars: data.stats.stars
  }
}

const spotify = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    audio: true,
  });
  return { audio: data.audio }
}

const soundcloud = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    prerender: true,
    audio: true,
    data: {
      plays: {
        selector: ".sc-ministats-plays .sc-visuallyhidden",
        type: "number",
      },
    },
  });
  return {
    audio: data.audio,
    plays: data.plays
  }
}

const reddit = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    data: {
      karma: {
        selector: "#profile--id-card--highlight-tooltip--karma",
      },
      birthday: {
        selector: "#profile--id-card--highlight-tooltip--cakeday",
      },
      avatar: {
        selector: 'img[alt="User avatar"]',
        attr: "src",
        type: "url",
      },
    },
  });
  return {
    avatar: data.avatar,
    birthday: data.birthday,
    karma: data.karma
  }
}

const producthunt = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    headers: {
      'Accept-Encoding': '*'
    },
    data: {
      reviews: {
        selector: 'div div div div div div a[href$="reviews"]',
      },
    },
  });
  return { reviews: data.reviews }
}

const imdb = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    data: {
      director: {
        selector: ".ipc-metadata-list__item:nth-child(1) a",
        type: "text",
      },
      writer: {
        selector: ".ipc-metadata-list__item:nth-child(2) a",
        type: "text",
      },
      duration: {
        selector:
          '.ipc-inline-list__item[role="presentation"]:nth-child(3)',
        type: "text",
      },
      year: {
        selector:
          '.ipc-inline-list__item[role="presentation"]:nth-child(1) span',
        type: "number",
      },
      rating: {
        selector: ".rating-bar__base-button .ipc-button__text span",
        type: "text",
      },
      ratingCount: {
        selector:
          ".rating-bar__base-button .ipc-button__text div:nth-child(3)",
        type: "text",
      },
    },
  });
  return {
    director: data.director,
    duration: data.duration,
    rating: data.rating,
    ratingCount: data.ratingCount,
    writer: data.writer,
    year: data.year
  }
}

const amazon = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    data: {
      price: {
        selector: "#attach-base-product-price",
        attr: "val",
        type: "number",
      },
      currency: {
        selector: "#featurebullets_feature_div",
        attr: "val",
      },
    },
  });
  return {
    currency: data.currency,
    price: data.price
  }
}

const instagram = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    data: {
      avatar: {
        selector: 'meta[property="og:image"]',
        attr: "content",
        type: "image",
      },
      stats: {
        selector: 'meta[property="og:description"]',
        attr: "content",
      },
    },
  });
  return {
    avatar: data.avatar,
    stats: data.stats
  }
}

const tiktok = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    data: {
      song: {
        selector: 'h4[data-e2e="browse-music"]',
        attr: "text",
        type: "string",
      },
      likeCount: {
        selector: 'strong[data-e2e="like-count"]',
        attr: "text",
        type: "string",
      },
      commentCount: {
        selector: 'strong[data-e2e="comment-count"]',
        attr: "text",
        type: "string",
      },
      shareCount: {
        selector: 'strong[data-e2e="share-count"]',
        attr: "text",
        type: "string",
      },
    },
  });
  return {
    commentCount: data.commentCount,
    likeCount: data.likeCount,
    shareCount: data.shareCount,
    song: data.song
  }
}

const youtube = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    prerender: true,
    video: true,
    audio: true,
    data: {
      views: {
        selector: ".view-count",
        type: "number",
      },
    },
  });
  return {
    audio: data.audio,
    video: data.video,
    views: data.views
  }
}

const twitter = async (origin) => {
  const { data } = await mql(origin, {
    apiKey: process.env.MICROLINK_API_KEY,
    data: {
      banner: {
        selector: 'main a[href$="header_photo"] img',
        attr: "src",
        type: "image",
      },
      stats: {
        selector: "main",
        attr: {
          tweets: {
            selector: "div > div > div > div h2 + div",
          },
          followings: {
            selector: 'a[href*="following"] span span',
          },
          followers: {
            selector: 'a[href*="followers"] span span',
          },
        },
      },
      latestTweets: {
        selectorAll: "main article",
        attr: {
          content: {
            selector: "div[lang]",
            attr: "text",
          },
          link: {
            selector: "a",
            attr: "href",
          },
        },
      },
    },
    prerender: true,
    waitForSelector: "main article",
  });
  return { stats: data.stats }
}

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

module.exports = () => ({
  getDomainDetails: async (url, origin) => {
    let originURL = origin.endsWith('/') ? origin.slice(0, -1) : origin;

    let urldata;
    let sociallinkURL;
    let categoryURL;
    let textURL;
    let emailURL;
    let phonenumberURL;
    let technologystackURL;
    let screenshotURL;
    let iframeURL;
    let brandcolorURL;
    let digitalrankURL;

    url.map(async (data) => {

      if (data.field === "url") {
        if (data.value.endsWith("/")) {
          data.value = data.value.slice(0, -1);
        }
        urldata = data.value;
      }

      if (data.field === "email" && data.value === "true") {
        emailURL = data.value;
      }
      if (data.field === "phonenumber" && data.value === "true") {
        phonenumberURL = data.value;
      }
      if (data.field === "brandcolor" && data.value === "true") {
        brandcolorURL = data.value;
      }
      if (data.field === "sociallink" && data.value === "true") {
        sociallinkURL = data.value;
      }
      if (data.field === "category" && data.value === "true") {
        categoryURL = data.value;
      }
      if (data.field === "text" && data.value === "true") {
        textURL = data.value;
      }
      if (data.field === "technologystack" && data.value === "true") {
        technologystackURL = data.value;
      }
      if (data.field === "screenshot" && data.value === "true") {
        screenshotURL = data.value;
      }
      if (data.field === "iframe" && data.value === "true") {
        iframeURL = data.value;
      }
      if (data.field === "digitalrank" && data.value === "true") {
        digitalrankURL = data.value;
      }

    });

    const domain = parse(urldata);
    const siteManagerSiteInfo = await strapi.db.query('api::site-manager.site-manager').findMany({
      where: {
        provider: "SiteInfo",
        url: domain.domain
      }
    })
    const siteInfoObjData = siteManagerSiteInfo[0]?.siteInfoObj;

    const siteManagerIframely = await strapi.db.query('api::site-manager.site-manager').findMany({
      where: {
        provider: "Iframely",
        url: originURL
      }
    })
    const iframelyObjData = siteManagerIframely[0]?.iframelyObj;

    const [siteinfo, iframelyData, emailphoneData, textData, screenshotData, fullscreenshotData, technologystackData, categoryData, iframeData, logocolorData, githubRes, spotifyRes, soundcloudRes, redditRes, producthuntRes, imdbRes, amazonRes, instagramRes, tiktokRes, youtubeRes, twitterRes] = await Promise.all([
      siteInfoObjData ? siteInfoObjData : siteInfo(domain.domain),
      iframelyObjData ? iframelyObjData : iframelyRes(originURL),
      emailURL || phonenumberURL ? emailPhone(urldata) : null,
      textURL ? text(urldata) : null,
      screenshotURL || brandcolorURL ? screenshotRes(urldata) : null,
      screenshotURL ? fullscreenshotRes(urldata) : null,
      technologystackURL ? technologystackRes(urldata) : null,
      categoryURL ? categories(urldata) : null,
      iframeURL ? iframeRes(urldata) : null,
      brandcolorURL ? logocolor(urldata) : null,
      urldata.startsWith(additional_field.github) ? github(origin) : null,
      urldata.includes(additional_field.spotify) ? spotify(origin) : null,
      urldata.startsWith(additional_field.soundcloud) ? soundcloud(origin) : null,
      urldata.startsWith(additional_field.reddit) ? reddit(origin) : null,
      urldata.startsWith(additional_field.producthunt) ? producthunt(origin) : null,
      urldata.startsWith(additional_field.imdb) ? imdb(origin) : null,
      urldata.startsWith(additional_field.amazon) ? amazon(origin) : null,
      urldata.startsWith(additional_field.instagram) ? instagram(origin) : null,
      urldata.startsWith(additional_field.tiktok) ? tiktok(origin) : null,
      urldata.startsWith(additional_field.youtube) ? youtube(origin) : null,
      urldata.startsWith(additional_field.twitter) ? twitter(origin) : null,
    ]);
    const results = { siteinfo, iframelyData, emailphoneData, textData, screenshotData, fullscreenshotData, technologystackData, categoryData, iframeData, logocolorData, githubRes, spotifyRes, soundcloudRes, redditRes, producthuntRes, imdbRes, amazonRes, instagramRes, tiktokRes, youtubeRes, twitterRes };

    if (!siteInfoObjData) {

      const createSiteManager = await strapi.db.query('api::site-manager.site-manager').create({
        data: {
          url: domain.domain,
          provider: "SiteInfo",
          siteInfoObj: results.siteinfo,
          publishedAt: new Date().toISOString()
        }
      })
    }

    if (!iframelyObjData) {

      const createSiteManager = await strapi.db.query('api::site-manager.site-manager').create({
        data: {
          url: originURL,
          provider: "Iframely",
          iframelyObj: results.iframelyData,
          publishedAt: new Date().toISOString()
        }
      })
    }

    const alexaRank = siteinfo.alexaRank;
    const socialNetworks = siteinfo.socialNetworks;

    const [openaiData, landingpageColorData, digitalrankData, sociallinkData] = await Promise.all([
      textURL ? openaiRes(textData) : null,
      brandcolorURL ? landingPagecolor(screenshotData.url) : null,
      digitalrankURL ? alexaRank ? alexaRank : digitalrank(domain.domain) : null,
      sociallinkURL ? socialNetworks ? socialNetworks : sociallinkRes(urldata) : null
    ])
    const resultData = { openaiData, landingpageColorData, digitalrankData, sociallinkData }

    let additionalFieldsObj;
    if (Object.values(additional_field).some(value => urldata.includes(value))) {
      additionalFieldsObj = {
        github: results.githubRes,
        spotify: results.spotifyRes,
        soundcloud: results.soundcloudRes,
        reddit: results.redditRes,
        producthunt: results.producthuntRes,
        imdb: results.imdbRes,
        amazon: results.amazonRes,
        instagram: results.instagramRes,
        tiktok: results.tiktokRes,
        youtube: results.youtubeRes,
        twitter: results.twitterRes
      }
    }

    const logo = results.siteinfo.logo ? results.siteinfo.logo : results.iframelyData.links?.logo ? results.iframelyData.links.logo[0].href : null;
    const icon = results.iframelyData?.links?.icon ? results.iframelyData.links.icon[0].href : null;
    const thumbnail = results.iframelyData?.links?.thumbnail ? results.iframelyData.links.thumbnail[0].href : null;

    let obj = {
      core: iframelyObjData ? iframelyObjData : results.iframelyData,
      websiteInfo: siteInfoObjData ? siteInfoObjData : results.siteinfo,
      brandcolors: brandcolorURL
        ? {
          logoColor: results.logocolorData,
          landingPageColor: resultData.landingpageColorData,
        }
        : null,
      logo: logo,
      icon: icon,
      thumbnail: thumbnail,
      iframe: iframeURL ? results.iframeData : null,
      email: emailURL ? results.emailphoneData.emailsArr : null,
      phonenumber: phonenumberURL ? results.emailphoneData.phoneNumArr : null,
      sociallink: sociallinkURL ? resultData.sociallinkData : null,
      category: categoryURL ? results.categoryData : null,
      text: textURL ? results.textData : null,
      screenshot: {
        fullscreenshot: screenshotURL
          ? results.fullscreenshotData
          : null,
        screenshot: screenshotURL ? results.screenshotData : null,
      },
      technologystack: technologystackURL
        ? results.technologystackData
        : null,
      additionalFields: additionalFieldsObj,
      digitalrank: digitalrankURL ? resultData.digitalrankData : null,
      tagsData: typeof(resultData.openaiData) === Object ? resultData.openaiData : null,
    };

    return obj;
  },

  getOrCreateDomainDetails: async (params, origin) => {
    const { isDomain, userId, url }     = params
    const queryURL                      = await standardAPI(url[0].value)
    const subDomainDetails              = parse(queryURL)
    const urlRegex                      = /^(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/g

    if (urlRegex.test(queryURL)) {
      const entries         = await strapi.entityService.findMany("api::domain-manager.domain-manager",
        {
          populate: "*",
          filters: { url: queryURL },
        }
      );

      const domain          = new URL(queryURL);
      const socialMediaUrl  = await isSocialMediaUrl(domain.hostname)

      if (entries.length > 0) {
        const author = entries[0].author;
        author.push(userId)
        // await strapi
        //     .entityService.update("api::domain-manager.domain-manager", entries[0].id, {
        //       data: {
        //         author
        //       }
        //     })
        const city = entries[0].websiteInfo?.city
        const address = []
        if (city && city.name) address.push(city?.name)
        if (city && city.add) address.push(city?.address)
        if (city && city.pcode) address.push(city?.postcode)

        const queryParams = []
        for (let i = 0; i < url.length; i++) {
          const newQP = entries[0].Extras.filter((e) => {
            return e.queryStr === url[i].field;
          });
          if (newQP.length === 0) {
            queryParams.push(url[i])
          }
        }

        if (queryParams.length > 1) {
          const data = await strapi.service("api::domain-detail.domain-details").getDomainDetails(queryParams, origin, params.url);

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

          await strapi
            .entityService.update("api::domain-manager.domain-manager", entries[0].id, {
              populate: "*",
              data: {
                TagsData: tagData ? tagData : data?.tagsData,
                isElastic: true,
                author,
                Extras: [
                  {
                    __component: "extras.brand-colors",
                    brand_colors: params.brandcolor ? params.brandcolor : entries[0]?.Extras[0]?.brand_colors,
                    logoColor: logoColor ? logoColor : data.brandcolors?.logoColor,
                    landingPageColor: landingPageColor ? landingPageColor : data.brandcolors?.landingPageColor,
                    isPublished: params.brandcolor ? params.brandcolor : entries[0]?.Extras[0].isPublished,
                    queryStr: params.brandcolor ? 'brandcolor' : entries[0]?.Extras[0].queryStr,
                  },
                  {
                    __component: "extras.iframe",
                    iframe_bool: params.iframe ? params.iframe : entries[0]?.Extras[1]?.iframe_bool,
                    iframe: iframe ? iframe : data?.iframe,
                    isPublished: params.iframe ? params.iframe : entries[0]?.Extras[1].isPublished,
                    queryStr: params.iframe ? 'iframe' : entries[0]?.Extras[1].queryStr,
                  },
                  {
                    __component: "extras.category",
                    category_bool: params.category ? params.category : entries[0]?.Extras[2]?.category_bool,
                    category: category ? category : data?.category,
                    isPublished: params.category ? params.category : entries[0]?.Extras[2].isPublished,
                    queryStr: params.category ? 'category' : entries[0]?.Extras[2].queryStr,
                  },
                  {
                    __component: "extras.email",
                    email_bool: params.email ? params.email : entries[0]?.Extras[3]?.email_bool,
                    email: email ? email : data?.email,
                    isPublished: params.email ? params.email : entries[0]?.Extras[3].isPublished,
                    queryStr: params.email ? 'email' : entries[0]?.Extras[3].queryStr,
                  },
                  {
                    __component: "extras.digital-rank",
                    digitalrank_bool: params.digitalrank ? params.digitalrank : entries[0]?.Extras[4]?.digitalrank_bool,
                    digitalrank: digitalrank ? digitalrank : data?.digitalrank,
                    isPublished: params.digitalrank ? params.digitalrank : entries[0]?.Extras[4].isPublished,
                    queryStr: params.digitalrank ? 'digitalrank' : entries[0]?.Extras[4].queryStr,
                  },
                  {
                    __component: "extras.phone-numbers",
                    phonenumber_bool: params.phonenumber ? params.phonenumber : entries[0]?.Extras[5]?.phonenumber_bool,
                    phonenumber: phonenumber ? phonenumber : data?.phonenumber,
                    isPublished: params.phonenumber ? params.phonenumber : entries[0]?.Extras[5].isPublished,
                    queryStr: params.phonenumber ? 'phonenumber' : entries[0]?.Extras[5].queryStr,
                  },
                  {
                    __component: "extras.screenshots",
                    screenshot_bool: params.screenshot ? params.screenshot : entries[0]?.Extras[6]?.screenshot_bool,
                    fullscreenshot: fullscreenshot ? fullscreenshot : data.screenshot?.fullscreenshot,
                    screenshot: screenshot ? screenshot : data.screenshot?.screenshot,
                    isPublished: params.screenshot ? params.screenshot : entries[0]?.Extras[6].isPublished,
                    queryStr: params.screenshot ? 'screenshot' : entries[0]?.Extras[6].queryStr,
                  },
                  {
                    __component: "extras.social-links",
                    sociallink_bool: params.sociallink ? params.sociallink : entries[0]?.Extras[7]?.sociallink_bool,
                    socialLinks: socialLinks ? socialLinks : data?.sociallink,
                    isPublished: params.sociallink ? params.sociallink : entries[0]?.Extras[7].isPublished,
                    queryStr: params.sociallink ? 'sociallink' : entries[0]?.Extras[7].queryStr,
                  },
                  {
                    __component: "extras.technology-stack",
                    technologystack_bool: params.technologystack ? params.technologystack : entries[0]?.Extras[8]?.technologystack_bool,
                    technologystack: technologystack ? technologystack : data?.technologystack,
                    isPublished: params.technologystack ? params.technologystack : entries[0]?.Extras[8].isPublished,
                    queryStr: params.technologystack ? 'technologystack' : entries[0]?.Extras[8].queryStr,
                  },
                  {
                    __component: "extras.text",
                    text_bool: params.text ? params.text : entries[0]?.Extras[9]?.text_bool,
                    text: text ? text : data?.text,
                    isPublished: params.text ? params.text : entries[0]?.Extras[9].isPublished,
                    queryStr: params.text ? 'text' : entries[0]?.Extras[9].queryStr,
                  },
                  {
                    __component: "extras.additional-fields",
                    additionalFields: data.additionalFields,
                    isPublished: data.additionalFields ? true : false,
                  },
                ],
              },
          });
          return 
        }

        return
      }

      if (socialMediaUrl && domain.pathname.length > 1) {
        const profileArrUrl   = profileArr.some(link => link.startsWith(domain.hostname));
        const profileArrayUrl = profileArray.some(link => link.startsWith(domain.hostname));
        const urlParts        = domain.href.split('/');

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
        const filteredArr   = url.filter(obj => desiredFields.includes(obj.field));

        // const filteredArr = url.split('/').splice(0, 4).join('/')
        const data = await strapi.service("api::domain-detail.domain-details").getDomainDetails(filteredArr, origin, url);
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
              description: data.core.error ? '' : data.core?.meta.description,
              title: data.core.error ? '' : data.core?.meta.title,
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

        await strapi
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

        return
      }

      if (domain.pathname.length > 1) {
        const desiredFields = ['url', 'text', 'screenshot', 'brandcolor'];
        const filteredArr = url.filter(obj => desiredFields.includes(obj.field));

        const data = await strapi
          .service("api::domain-detail.domain-details")
          .getDomainDetails(filteredArr, origin, url);

        const createDomainDetails = await strapi
          .service("api::domain-manager.domain-manager")
          .create({
            populate: "*",
            data: {
              url: queryURL,
              description: data.core.status = 404 ? '' : data.core.meta.description,
              title: data.core.status = 404 ? '' : data.core.meta.title,
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
                  brand_colors: params.brandcolor,
                  logoColor:
                    params.brandcolor === "true"
                      ? data.brandcolors.logoColor
                      : null,
                  landingPageColor:
                    params.brandcolor === "true"
                      ? data.brandcolors.landingPageColor
                      : null,
                  isPublished: params.brandcolor,
                  queryStr: params.brandcolor === "true"
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
                  screenshot_bool: params.screenshot,
                  fullscreenshot_bool: params.fullscreenshot,
                  fullscreenshot: data.screenshot.fullscreenshot,
                  screenshot: data.screenshot.screenshot,
                  isPublished: params.screenshot,
                  queryStr: params.screenshot === "true"
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
                  text_bool: params.text,
                  text: data.text,
                  isPublished: params.text,
                  queryStr: params.text === "true"
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

        await strapi
          .entityService.update("api::domain-manager.domain-manager", createDomainDetails.id, {
            populate: "*",
            data: {
              websiteInfo: domainDetails[0].websiteInfo,
              gems: createGemDetails?.id,
              MainDomain: domainDetails[0].id,
              isElastic: true,

              Extras: [
                {
                  __component: "extras.brand-colors",
                  brand_colors: params.brandcolor,
                  logoColor:
                    params.brandcolor === "true"
                      ? createDomainDetails.Extras[0].logoColor
                      : null,
                  landingPageColor:
                    params.brandcolor === "true"
                      ? createDomainDetails.Extras[0].landingPageColor
                      : null,
                  isPublished: params.brandcolor,
                  queryStr: params.brandcolor === "true"
                    ? 'brandcolor'
                    : null,
                },
                {
                  __component: "extras.iframe",
                  iframe_bool: domainDetails[0].Extras[1].iframe_bool,
                  iframe: domainDetails[0].Extras[1].iframe,
                  isPublished: params.iframe,
                  queryStr: domainDetails[0].Extras[1].iframe_bool === true
                    ? 'iframe'
                    : null,
                },
                {
                  __component: "extras.category",
                  category_bool: domainDetails[0].Extras[2].category_bool,
                  category: domainDetails[0].Extras[2].category,
                  isPublished: params.category,
                  queryStr: domainDetails[0].Extras[2].category_bool === true
                    ? 'category'
                    : null,
                },
                {
                  __component: "extras.email",
                  email_bool: domainDetails[0].Extras[3].email_bool,
                  email: domainDetails[0].Extras[3].email,
                  isPublished: params.email,
                  queryStr: domainDetails[0].Extras[3].email_bool === true
                    ? 'email'
                    : null,
                },
                {
                  __component: "extras.digital-rank",
                  digitalrank_bool: domainDetails[0].Extras[4].digitalrank_bool,
                  digitalrank: domainDetails[0].Extras[4].digitalrank,
                  isPublished: params.digitalrank,
                  queryStr: domainDetails[0].Extras[4].digitalrank_bool === true
                    ? 'digitalrank'
                    : null,
                },
                {
                  __component: "extras.phone-numbers",
                  phonenumber_bool: domainDetails[0].Extras[5].phonenumber_bool,
                  phonenumber: domainDetails[0].Extras[5].phonenumber,
                  isPublished: params.phonenumber,
                  queryStr: domainDetails[0].Extras[5].phonenumber_bool === true
                    ? 'phonenumber'
                    : null,
                },
                {
                  __component: "extras.screenshots",
                  screenshot_bool: params.screenshot,
                  fullscreenshot_bool: params.fullscreenshot,
                  fullscreenshot: createDomainDetails.Extras[6].fullscreenshot,
                  screenshot: createDomainDetails.Extras[6].screenshot,
                  isPublished: params.screenshot,
                  queryStr: params.screenshot === "true"
                    ? 'screenshot'
                    : null,
                },
                {
                  __component: "extras.social-links",
                  sociallink_bool: domainDetails[0].Extras[7].sociallink_bool,
                  socialLinks: domainDetails[0].Extras[7].socialLinks,
                  isPublished: params.sociallink,
                  queryStr: domainDetails[0].Extras[7].sociallink_bool === true
                    ? 'sociallink'
                    : null,
                },
                {
                  __component: "extras.technology-stack",
                  technologystack_bool: domainDetails[0].Extras[8].technologystack_bool,
                  technologystack: domainDetails[0].Extras[8].technologystack,
                  isPublished: params.technologystack,
                  queryStr: domainDetails[0].Extras[8].technologystack_bool === true
                    ? 'technologystack'
                    : null,
                },
                {
                  __component: "extras.text",
                  text_bool: params.text,
                  text: createDomainDetails.Extras[9].text,
                  isPublished: params.text,
                  queryStr: params.text === "true"
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

        return
      }

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
        .getDomainDetails(url, origin, url);

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
                brand_colors: params.brandcolor,
                logoColor:
                  params.brandcolor === "true"
                    ? data.brandcolors.logoColor
                    : null,
                landingPageColor:
                  params.brandcolor === "true"
                    ? data.brandcolors.landingPageColor
                    : null,
                isPublished: params.brandcolor,
                queryStr: params.brandcolor === "true"
                  ? 'brandcolor'
                  : null,
              },
              {
                __component: "extras.iframe",
                iframe_bool: params.iframe,
                iframe: data.iframe,
                isPublished: params.iframe,
                queryStr: params.iframe === "true"
                  ? 'iframe'
                  : null,
              },
              {
                __component: "extras.category",
                category_bool: params.category,
                category: data.category,
                isPublished: params.category,
                queryStr: params.category === "true"
                  ? 'category'
                  : null,
              },
              {
                __component: "extras.email",
                email_bool: params.email,
                email: data.email,
                isPublished: params.email,
                queryStr: params.email === "true"
                  ? 'email'
                  : null,
              },
              {
                __component: "extras.digital-rank",
                digitalrank_bool: params.digitalrank,
                digitalrank:
                  params.digitalrank === "true"
                    ? data.digitalrank
                    : null,
                isPublished: params.digitalrank,
                queryStr: params.digitalrank === "true"
                  ? 'digitalrank'
                  : null,
              },
              {
                __component: "extras.phone-numbers",
                phonenumber_bool: params.phonenumber,
                phonenumber: data.phonenumber,
                isPublished: params.phonenumber,
                queryStr: params.phonenumber === "true"
                  ? 'phonenumber'
                  : null,
              },
              {
                __component: "extras.screenshots",
                screenshot_bool: params.screenshot,
                fullscreenshot_bool: params.fullscreenshot,
                fullscreenshot: data.screenshot.fullscreenshot,
                screenshot: data.screenshot.screenshot,
                isPublished: params.screenshot,
                queryStr: params.screenshot === "true"
                  ? 'screenshot'
                  : null,
              },
              {
                __component: "extras.social-links",
                sociallink_bool: params.sociallink,
                socialLinks: data.sociallink,
                isPublished: params.sociallink,
                queryStr: params.sociallink === "true"
                  ? 'sociallink'
                  : null,
              },
              {
                __component: "extras.technology-stack",
                technologystack_bool: params.technologystack,
                technologystack: data.technologystack,
                isPublished: params.technologystack,
                queryStr: params.technologystack === "true"
                  ? 'technologystack'
                  : null,
              },
              {
                __component: "extras.text",
                text_bool: params.text,
                text: data.text,
                isPublished: params.text,
                queryStr: params.text === "true"
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
          mainDomainId = data?.id;
        }
      });

      let updatedObj = {}
      if (subDomainDetails.subdomain.length > 1) {
        updatedObj = {
          gems: createGemDetails?.id,
          MainDomain: mainDomainId,
        }
      }
      else {
        updatedObj = {
          gems: createGemDetails?.id,
          URLs: result,
        }
      }

      await strapi.entityService.update(
        "api::domain-manager.domain-manager",
        createDomainDetails.id,
        {
          populate: "*",
          data: updatedObj,
        }
      );
      return
    }
  }
});