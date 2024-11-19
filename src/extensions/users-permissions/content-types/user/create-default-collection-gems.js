const { v4: uuidv4 } = require("uuid");
const { COLLECTION_OBJ,
        LINK_GEM, // Done
        CODE_SNIPET, // Done
        VIDEO_GEM, // Done
        PDF, // Failed to fetch due to cors policy
        ARTICLE, // Not Found
        MOVIE_OBJ, // Done
        AI_PROMPT, // Done
        TEXT_EXPANDER, // Done
        AUDIO, // Done
        QUOTE, // Done
        LINKEDIN_PROFILE, // Not Done
        SOCIAL_FEED_OBJ, // Not Done
        NOTE, // Done
        HIGHLIGHT, // Not Done
        CITATION, // Done
        BOOK, // Done
        PRODUCT, // Done
        APPSTORE_CHATGPT,
        G2_WRITESONIC,
        PLAYSTORE_WRITESONIC,
        TRUSTPILOT_WRITESONIC,
        CAPTERRA_WRITESONIC,
        APP_SUMO,
        GOODREADS_ELONMUSK,
        TRIPADVISOR_LONDONEYE,
        AMAZON,
        GITHUB_PROFILE,
        REDDIT_PROFILE,
        MEDIUM_PROFILE,
        SCREENSHOT_CURATEIT,
        // TWITTER_PROFILE,
        BOOK_KINDLE,
        TWITTER_POST, 
        LINKEDIN_POST, 
        REDDIT_POST,
        IMAGE_GEM
         
    } = require("./default-gems-collection-fixtures")

const createLink = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
            data: {
                ...LINK_GEM,
                author: userId,
                collection_gems: collectionId,
                publishedAt: new Date().toISOString(),
            }
        })
        .then((res) => {resolve(res)})
    })
}

const createCode = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi.service('api::code.code').createCode({ ...CODE_SNIPET, author: userId, collections: collectionId }, { id: userId })
        .then((res) => {resolve(res)})
    })
}

const createVideo = (userId, collectionId) => {
    const obj           = {
        title: VIDEO_GEM.title,
        description: VIDEO_GEM.description,
        expander: VIDEO_GEM.expander === "" ? [] : VIDEO_GEM.expander,
        metaData: VIDEO_GEM.metaData,
        media_type: "Video",
        media: { videoLink: VIDEO_GEM.url },
        S3_link: [VIDEO_GEM.url],
        url: VIDEO_GEM.url,
        showThumbnail: VIDEO_GEM.showThumbnail !== undefined ? VIDEO_GEM.showThumbnail : true,
        author: userId,
        tags: VIDEO_GEM.tags,
        remarks: VIDEO_GEM.notes,
        is_favourite: VIDEO_GEM.is_favourite || false,
        fileType: "url",
        collection_gems: collectionId,
        publishedAt: new Date().toISOString(),
    }
    return new Promise((resolve, reject) => {
        strapi.entityService.create("api::gem.gem", {
                data: obj
            })
        .then((res) => {resolve(res)})
    })
}

const createPDF = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi.service('api::gem.gem').create({
                data: {
                    ...PDF,
                    author: userId,
                    collection_gems: collectionId,
                    publishedAt: new Date().toISOString(),
                }
            })
        .then((res) => {resolve(res)})
    })
}

const createArticle = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...ARTICLE,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createMovie = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...MOVIE_OBJ,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createPrompt = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi.service("api::text.text").createHighlightedText(AI_PROMPT, { collectionId }, userId)
        .then((res) => {resolve(res)})
    })
}

const createExpander = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi.service("api::text.text").createHighlightedText(TEXT_EXPANDER, { collectionId }, userId)
        .then((res) => {resolve(res)})
    })
}

const createAudio = (userId, collectionId) => {
    const obj           = {
        title: AUDIO.title,
        description: AUDIO.description,
        expander: AUDIO.expander === "" ? [] : AUDIO.expander,
        metaData: AUDIO.metaData,
        media_type: "Audio",
        media: { audioLink: AUDIO.url },
        S3_link: [AUDIO.url],
        url: AUDIO.url,
        showThumbnail: AUDIO.showThumbnail !== undefined ? AUDIO.showThumbnail : true,
        author: userId,
        tags: AUDIO.tags,
        remarks: AUDIO.notes,
        is_favourite: AUDIO.is_favourite,
        fileType: "url",
        collection_gems: collectionId,
        publishedAt: new Date().toISOString(),
    }
    return new Promise((resolve, reject) => {
        strapi.entityService.create("api::gem.gem", {
                data: obj
            })
        .then((res) => {resolve(res)})
    })
}

const createQuote = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi.service("api::text.text").createHighlightedText(QUOTE, { collectionId }, userId)
        .then((res) => {resolve(res)})
    })
}

const createLinkedInProfile = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi.service("api::gem.socialfeed").createPostGem({ ...LINKEDIN_PROFILE, collection_gems: collectionId }, userId, collectionId, null, false)
        .then((res) => {resolve(res)})
    })
}

// const createSocialFeed = (userId, collectionId) => {
//     return new Promise((resolve, reject) => {
//         strapi
//         .service("api::gem.gem")
//         .create({
//           data: {
//             ...SOCIAL_FEED_OBJ,
//             author: userId,
//             collection_gems: collectionId,
//             publishedAt: new Date().toISOString(),
//           }
//     })
//         .then((res) => {resolve(res)})
//     })
// }

const createNote = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi.service("api::text.text").createHighlightedText(NOTE, { collectionId }, userId)
        .then((res) => {resolve(res)})
    })
}

const createHighlight = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi.service("api::text.text").createHighlightedText(HIGHLIGHT, { collectionId }, userId)
        .then((res) => {resolve(res)})
    })
}

const createKindleBook = (userId, collectionId, username) => {
    const user = {
        id: userId,
        username: username
    }
    return new Promise((resolve, reject) => {
        strapi.service('api::gem.kindle-highlight').createKindleHighlight(user, BOOK_KINDLE, collectionId, null, null, false)
        .then((res) => {resolve(res)})
    })
}

const createCitation = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...CITATION,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createBook = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...BOOK,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createProduct = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...PRODUCT,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createAppstoreChatGPT = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...APPSTORE_CHATGPT,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createG2Writesonic = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...G2_WRITESONIC,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createPlatstoreWritesonic = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...PLAYSTORE_WRITESONIC,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createTrustpilotWritesonic = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...TRUSTPILOT_WRITESONIC,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createCapterraWritesonic = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...CAPTERRA_WRITESONIC,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createGoodreads= (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...GOODREADS_ELONMUSK,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createAppsumo = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...APP_SUMO,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createTripadvisorLondoneye = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...TRIPADVISOR_LONDONEYE,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createAmazon = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
          data: {
            ...AMAZON,
            author: userId,
            collection_gems: collectionId,
            publishedAt: new Date().toISOString(),
          }
    })
        .then((res) => {resolve(res)})
    })
}

const createGithubProfile = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.socialfeed")
        .createPostGem({
            ...GITHUB_PROFILE,
            collection_gems: collectionId},
            userId, collectionId, null, false
    )
        .then((res) => {resolve(res)})
    })
}

const createRedditProfile = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.socialfeed")
        .createPostGem({
            ...REDDIT_PROFILE,
            collection_gems: collectionId},
            userId, collectionId, null, false
    )
        .then((res) => {resolve(res)})
    })
}

const createMediumProfile = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.socialfeed")
        .createPostGem({
            ...MEDIUM_PROFILE,
            collection_gems: collectionId},
            userId, collectionId, null, false
    )
        .then((res) => {resolve(res)})
    })
}

const createTwitterPost = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.socialfeed")
        .createPostGem({
            ...TWITTER_POST,
            collection_gems: collectionId},
            userId, collectionId, null, false
    )
        .then((res) => {resolve(res)})
    })
}

const createLinkedinPost = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.socialfeed")
        .createPostGem({
            ...LINKEDIN_POST,
            collection_gems: collectionId},
            userId, collectionId, null, false
    )
        .then((res) => {resolve(res)})
    })
}

const createRedditPost = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.socialfeed")
        .createPostGem({
            ...REDDIT_POST,
            collection_gems: collectionId},
            userId, collectionId, null, false
    )
        .then((res) => {resolve(res)})
    })
}

// const createTitterProfile = (userId, collectionId) => {
//     await strapi
//         .service("api::gem.socialfeed")
//         .createPostGem({
//             ...TWITTER_PROFILE,
//             collection_gems: collectionId},
//             userId, collectionId, null
//     )
// }

const createScreenshotCurateit = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
            data: {
                ...SCREENSHOT_CURATEIT,
                collection_gems: collectionId,
                author: userId
            }
        })
        .then((res) => {resolve(res)})
    })
}

const createImage = (userId, collectionId) => {
    return new Promise((resolve, reject) => {
        strapi
        .service("api::gem.gem")
        .create({
            data: {
                ...IMAGE_GEM,
                collection_gems: collectionId,
                author: userId
            }
        })
        .then((res) => {resolve(res)})
    })
}

const createGems = async (userId, collectionId, username) => {
    const [kindleBook, link, article, audio, book, citation, code, expander, highlight, linkedinProfile, movie, note, pdf, product, prompt, quote, socialFeed, video, appstoreChatGPT, g2Writesonic, platstoreWritesonic, trustpilotWritesonic, capterraWritesonic, appsumo, goodreads, tripadvisorLondoneye, amazon, githubProfile, redditProfile, mediumProfile, screenshotCurateit, twitterPost, linkedinPost, redditPost, image] = await Promise.all([
        createKindleBook(userId, collectionId, username),
        createLink(userId, collectionId),
        createArticle(userId, collectionId),
        createAudio(userId, collectionId),
        createBook(userId, collectionId),
        createCitation(userId, collectionId),
        createCode(userId, collectionId),
        createExpander(userId, collectionId),
        createHighlight(userId, collectionId),
        createLinkedInProfile(userId, collectionId, username),
        createMovie(userId, collectionId),
        createNote(userId, collectionId),
        createPDF(userId, collectionId),
        createProduct(userId, collectionId),
        createPrompt(userId, collectionId),
        createQuote(userId, collectionId),
        createVideo(userId, collectionId),
        // createSocialFeed(userId, collectionId),
        createAppstoreChatGPT(userId, collectionId),
        createG2Writesonic(userId, collectionId),
        createPlatstoreWritesonic(userId, collectionId),
        createTrustpilotWritesonic(userId, collectionId),
        createCapterraWritesonic(userId, collectionId),
        createAppsumo(userId, collectionId),
        createGoodreads(userId, collectionId),
        createTripadvisorLondoneye(userId, collectionId),
        createAmazon(userId, collectionId),
        createGithubProfile(userId, collectionId),
        createRedditProfile(userId, collectionId),
        createMediumProfile(userId, collectionId),
        createScreenshotCurateit(userId, collectionId),
        // createTitterProfile(userId, collectionId)
        createTwitterPost(userId, collectionId),
        createLinkedinPost(userId, collectionId),
        createRedditPost(userId, collectionId),
        createImage(userId, collectionId),
    ])

} 

const createCollection = (userId) => {
    return new Promise((resolve, reject) => {
        strapi.service("api::collection.collection").create({
            data: {
                name: COLLECTION_OBJ.name,
                author: userId,
                publishedAt: new Date().toISOString(),
                collection: null,
                isPublicLink: true,
                is_sub_collection: false,
                avatar: {
                    icon: "https://curateit-files.s3.amazonaws.com/common/users/60/icons/curateit-logo.png",
                    type: "image"
                },
                wallpaper: {
                    "type": "gallery",
                    "icon": "#3ea9d5"
                },
                background: {
                    "type": "gallery",
                    "icon": "#fac96c"
                },
            }
        }).then((res) => {
            // https://dev-app.curateit.com/check-user/public?inviteId=7db1c30e-75e8-4066-95f5-2429f23a42f8&collectionId=10857
            strapi.entityService.update("api::collection.collection", res.id, {
                data: {
                    sharable_links: `${process.env.REDIRECT_URI}/check-user/public?inviteId=${uuidv4()}&collectionId=${res.id}`,
                },
            }).then((res1) => {
                resolve(res)
            })
        })
    })
}

module.exports = { createCollection, createGems }