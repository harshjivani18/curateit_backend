const { default: axios } = require("axios");
const { ApifyClient } = require("apify-client");
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const mql = require("@microlink/mql");

const client = new ApifyClient({
  token: process.env.APIFY_KEY,
});

async function fetchInstagramData(username) {
  const input = {
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsType: "details",
    resultsLimit: 200,
    addParentData: false,
    searchType: "hashtag",
    searchLimit: 1,
  };

  try {
    // Run the Actor and wait for it to finish
    const run = await client.actor(process.env.INSTAGRAM_TOKEN).call(input);

    // Fetch and process Actor results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    let allResults = items[0];
    let name = items[0]?.fullName;
    let description = items[0]?.biography;
    let totalFollowers = items[0]?.followersCount;
    let totalPosts = items[0]?.postsCount;
    let highlightReelCount = items[0]?.highlightReelCount;
    let igtvCount = items[0]?.igtvVideoCount;

    let totalComments = 0;
    let totalLikes = 0;
    let numberOfPosts = items[0]?.latestPosts?.length;

    items[0].latestPosts.forEach((post) => {
      totalComments += post.commentsCount;
      totalLikes += post.likesCount;
    });

    // Calculate the averages
    let averageComments = totalComments / numberOfPosts;
    let averageLikes = totalLikes / numberOfPosts;
    let engagementScore = averageLikes + averageComments;

    const data = {
      description,
      totalFollowers,
      totalPosts,
      highlightReelCount,
      igtvCount,
      engagementScore,
      name,
      allResults,
    };

    return data;
  } catch (error) {
    console.error("Error fetching Instagram data:", error);
    throw error;
  }
}

async function fetchTiktokData(username) {
  const input = {
    startUrls: [`https://www.tiktok.com/@${username}`],
    maxItems: 1,
    getFollowers: true,
    getFollowing: true,
    customMapFunction: (object) => {
      return { ...object };
    },
  };

  try {
    // Run the Actor and wait for it to finish
    const run = await client.actor(process.env.TIKTOK_TOKEN).call(input);

    // Fetch and process Actor results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    let allResults = items[0];
    let name = items[0]?.nickname;
    let followers = items[0]?.followers;
    let totalLikes = items[0]?.likes;
    let totalVideos = items[0]?.videos;
    let description = items[0]?.bio;
    let likes = items[0]?.likes;
    let videos = items[0]?.videos;
    let following = items[0]?.following;

    const likesWeight = 0.4;
    const videosWeight = 0.3;
    const followersWeight = 0.2;
    const followingWeight = 0.1;

    // Calculate engagement score
    const engagementScore =
      likesWeight * likes +
      videosWeight * videos +
      followersWeight * followers -
      followingWeight * following;

    const data = {
      followers,
      totalLikes,
      totalVideos,
      description,
      allResults,
      name,
      engagementScore,
    };

    return data;
  } catch (error) {
    console.error("Error fetching Tiktok data:", error);
    throw error;
  }
}

async function fetchYoutubeData(username) {
  const input = {
    startUrls: [
      {
        url: `https://www.youtube.com/@${username}`,
      },
    ],
    maxResults: 1,
  };

  try {
    // Run the Actor and wait for it to finish
    const run = await client.actor(process.env.YOUTUBE_TOKEN).call(input);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    let allResults = items[0];
    let name = items[0]?.channelName;
    let subscriberCount = items[0]?.numberOfSubscribers;
    let videoCount = items[0]?.channelTotalVideos;
    let description = items[0]?.channelDescription;
    let viewsCount = parseInt(items[0]?.channelTotalViews.replace(/,/g, ""));
    let avgViews = viewsCount / videoCount;
    let avgSubs = subscriberCount / videoCount;
    let engagementScore = Math.round(avgViews + avgSubs);
    const data = {
      subscriberCount,
      videoCount,
      description,
      viewsCount,
      engagementScore,
      allResults,
      name,
    };

    return data;
  } catch (error) {
    console.error("Error fetching Tiktok data:", error);
    throw error;
  }
}

async function fetchTwitterData(username) {
  const input = {
    handles: [username],
    tweetsDesired: 100,
    addUserInfo: true,
    startUrls: [],
    proxyConfig: {
      useApifyProxy: true,
    },
  };

  try {
    // Run the Actor and wait for it to finish
    const run = await client.actor(process.env.TWITTER_TOKEN).call(input);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    let allResults = items[0];
    let name = items[0]?.user?.name;
    let followers = items[0]?.user?.followers_count;
    let bannerUrl = items[0]?.user?.profile_banner_url;
    let profilePicUrl = items[0]?.user?.profile_image_url_https;
    let totalPosts = items[0]?.user?.statuses_count;
    let totalFavourites = items[0]?.user?.favourites_count;
    let replyCount = items[0]?.reply_count;
    let viewCount = items[0]?.view_count;
    let retweetCount = items[0]?.retweet_count;
    let engagementScore =
      totalFavourites + replyCount + viewCount + retweetCount;

    const data = {
      followers,
      bannerUrl,
      profilePicUrl,
      totalPosts,
      engagementScore,
      allResults,
      name,
    };

    return data;
  } catch (error) {
    console.error("Error fetching Twitter data:", error);
    throw error;
  }
}

exports.iframelyData = async (url) => {
  const iframelyData = await axios({
    method: "get",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "identity",
    },
    url: `https://iframe.ly/api/iframely?url=${url}/&api_key=${process.env.IFRAMELY_API_KEY}&iframe=1&omit_script=1`,
  });
  return iframelyData.data;
};

exports.microlinkData = (url) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`https://pro.microlink.io?url=${url}`, {
        headers: {
          "x-api-key": process.env.MICROLINK_API_KEY,
        },
      })
      .then((res) => {
        // console.log("data===>", res);
        resolve(res.data);
      })
      .catch((err) => {
        resolve(null);
      });
  });
};

exports.apifyData = async (id, platform) => {
  let responseObject;
  let profileData;
  if (platform === "instagram") {
    profileData = await fetchInstagramData(id);
  } else if (platform === "tiktok") {
    profileData = await fetchTiktokData(id);
  } else if (platform === "youtube") {
    profileData = await fetchYoutubeData(id);
  } else if (platform === "twitter") {
    profileData = await fetchTwitterData(id);
  }

  if (profileData) {
    responseObject = {
      status: "success",
      data: {
        id: id,
        platform: platform,
        profileData: profileData,
      },
    };
  } else {
    responseObject = {
      status: "failed",
      data: {
        id: id,
        platform: platform,
      },
    };
  }

  return responseObject;
};

exports.deleteGems = async (id) => {
  try {
    await strapi.db.query("api::gem.gem").deleteMany({
      where: {
        id,
      },
    });

    this.gemOrderAtDeleteMany(id);
    return "Success";
  } catch (error) {
    return error.message;
  }
};

exports.getGems = async (page, perPage, collectionId, tabGems) => {
  try {
    // using for getTabGems
    const pages = page ? page : 1;
    const perPages = perPage ? perPage : 10;
    const pageNum = parseInt(pages);
    const perPagesNum = parseInt(perPages);

    let filters = {};
    let populate = {};
    if (tabGems) {
      filters.collection_gems = collectionId;
      filters.isTabCollection = true;
      populate.author = { fields: ["id", "username"] };
      populate.collection_gems = { fields: ["id", "name", "slug"] };
      populate.tags = { fields: ["id", "tag", "slug"] };
    }

    const [gems, totalCount] = await Promise.all([
      strapi.entityService.findMany("api::gem.gem", {
        filters,
        sort: { id: "asc" },
        populate,
        start: pageNum === 0 ? 0 : (pageNum - 1) * perPagesNum,
        limit: perPagesNum,
      }),
      strapi.entityService.count("api::gem.gem", {
        filters
      }),
    ]);

    return ({ totalCount, gems });
  } catch (error) {
    return error.message;
  }
};

exports.updateGemOrder = async (gem) => {
  try {
    const gArr = gem.collection_gems?.order_of_gems ? [ ...gem.collection_gems.order_of_gems ] : []
    const nArr =  []
    if (gArr.length > 0) {
      nArr.push(...gArr)
    }
    nArr.push(gem.id)
    // const order_of_gems = gem?.collection_gems?.order_of_gems ? [...gem?.collection_gems?.order_of_gems, gem.id] : [gem.id]
    await strapi.entityService.update("api::collection.collection", gem.collection_gems.id, {
      data: {
        order_of_gems: nArr
      }
    })

    return "Success"
  } catch (error) {
    return error.message
  }
}

exports.updateGemoOrderViaTag = async (gem) => {
  try {
    for (const tag of gem.tags) {
      gem.tags.order_of_gems = tag?.order_of_gems ? [...tag?.order_of_gems, gem.id] : [gem.id]
      await strapi.entityService.update("api::tag.tag", tag?.id, {
        data: {
          order_of_gems: gem.tags.order_of_gems
        }
      })
    }

    return "Success"
  } catch (error) {
    return error.message
  }
}

exports.gemOrderAtDeleteGem = async (gemId) => {
  try {
    const gemData = await strapi.entityService.findOne("api::gem.gem", gemId, {
      populate: {
        collection_gems: { fields: ["id", "name", "slug", "order_of_gems"] },
        tags: { fields: ["id", "tag", "slug", "order_of_gems"] }
      }
    })

    const collIdx = gemData?.collection_gems?.order_of_gems?.indexOf(gemId)
    if (collIdx !== undefined && collIdx !== -1) {
      gemData.collection_gems.order_of_gems.splice(collIdx, 1)
      await strapi.entityService.update("api::collection.collection", gemData?.collection_gems?.id, {
        data: {
          order_of_gems: gemData?.collection_gems.order_of_gems ? gemData?.collection_gems.order_of_gems : []
        }
      })
    }

    for (const tag of gemData?.tags) {
      const tagIdx = tag?.order_of_gems?.indexOf(gemId)
      if (tagIdx !== undefined && tagIdx !== -1) {
        tag.order_of_gems.splice(tagIdx, 1)
        await strapi.entityService.update("api::tag.tag", tag?.id, {
          data: {
            order_of_gems: tag.order_of_gems ? tag.order_of_gems : []
          }
        })
      }
    }

    return "Success"

  } catch (error) {
    return error.message;
  }
}

exports.gemOrderAtUpdateGem = async (oldGemData, newGemData) => {
  try {

    if (parseInt(oldGemData?.collection_gems?.id) === parseInt(newGemData?.collection_gems?.id)) {
      return
    } else {
      const oldCollection = await strapi.entityService.findOne("api::collection.collection", oldGemData?.collection_gems?.id, {
        fields: ["id", "name", "order_of_gems"]
      })

      oldCollection?.order_of_gems?.splice(oldCollection?.order_of_gems?.indexOf(oldGemData?.id), 1)
     await strapi.entityService.update("api::collection.collection", oldGemData?.collection_gems?.id, {
        data: {
          order_of_gems: oldCollection?.order_of_gems ? oldCollection?.order_of_gems : []
        }
      })
     
     const newCollection = await strapi.entityService.findOne("api::collection.collection", newGemData?.collection_gems, {
        fields: ["id", "name", "order_of_gems"]
      })
      newCollection.order_of_gems = newCollection?.order_of_gems ? [...newCollection?.order_of_gems, oldGemData.id] : [oldGemData.id]

      await strapi.entityService.update("api::collection.collection", newGemData?.collection_gems, {
        data: {
          order_of_gems: newCollection.order_of_gems
        }
      })
    }


    let tagChange = false

    // Create copies of the arrays to avoid modifying the originals
    const oldTags = []
    oldGemData?.tags?.forEach((tag) => {
      oldTags.push(tag.id)
    })
    const newTags = [...newGemData?.tags]

    // Sort the copies of the arrays
    oldTags.sort()
    newTags.sort()
    const oldElements = oldTags.filter(tag => !newTags.includes(tag));
    const newElements = newTags.filter(tag => !oldTags.includes(tag));

    if (oldElements.length > 0 ) {
      for (const tag of oldElements) {
        const tagData = await strapi.entityService.findOne("api::tag.tag", tag, {
          fields: ["id", "tag", "slug", "order_of_gems"]
        })
        tagData.order_of_gems.splice(tagData.order_of_gems.indexOf(oldGemData.id), 1)
        await strapi.entityService.update("api::tag.tag", tagData.id, {
          data: {
            order_of_gems: tagData.order_of_gems ? tagData.order_of_gems : []
          }
        })
      }
    }

    if (newElements.length > 0) {
      for (const tag of newElements) {
        const tagData = await strapi.entityService.findOne("api::tag.tag", tag, {
          fields: ["id", "tag", "slug", "order_of_gems"]
        })

        tagData.order_of_gems = tagData?.order_of_gems ? [...tagData?.order_of_gems, oldGemData.id] : [oldGemData.id]
        await strapi.entityService.update("api::tag.tag", tagData.id, {
          data: {
            order_of_gems: tagData.order_of_gems
          }
        })
      }
    }

  } catch (error) {
    return error.message;
  }
}

exports.gemOrderAtDeleteMany = async (gems) => {
  try {
    for (const gem of gems) {
      let collection = await strapi.entityService.findOne("api::collection.collection", gem?.collection_gems?.id, {
        fields: ["id", "order_of_gems"]
      })
      const collIdx = collection?.order_of_gems?.indexOf(gem.id)
      if (collIdx !== -1) {
        collection.order_of_gems.splice(collIdx, 1)
        await strapi.entityService.update("api::collection.collection", gem?.collection_gems?.id, {
          data: {
            order_of_gems: collection.order_of_gems ? collection.order_of_gems : []
          }
        })
      }

      for (const tag of gem?.tags) {
        let tagData = await strapi.entityService.findOne("api::tag.tag", tag.id, {
          fields: ["id", "order_of_gems"]
        })
        const tagIdx = tagData?.order_of_gems?.indexOf(gem.id)
        if (tagIdx !== -1) {
          tagData.order_of_gems.splice(tagIdx, 1)
          await strapi.entityService.update("api::tag.tag", tag?.id, {
            data: {
              order_of_gems: tagData.order_of_gems ? tagData.order_of_gems : []
            }
          })
        }
      }
    }

  } catch (error) {
    return error.message;
  }
}

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
  const reader = new Readability(doc)
  const article = reader.parse()
  return article
}

exports.readTimeUpdateInGem = async (gem) => {
  try {

    let readTime
    const entries = await strapi.entityService.findMany("api::domain-manager.domain-manager", {
      fields: ["id", "articleDetails"],
      filters: {
        url: gem?.url
      }
    })
    if (entries.length !== 0) {
      const o = entries[0]
      if (o?.articleDetails) {
        readTime = Math.ceil((o?.articleDetails?.textContent?.split(" ")?.length || 0) / 200)
        // const totalWords = o?.articleDetails?.textContent?.split(" ")?.length || 0
        gem.media.readTime = readTime

        await strapi.entityService.update("api::gem.gem", gem?.id, {
          data: {
            media: gem.media
          }
        })
        return 
      }
      const mRes = await microlinkRes(gem?.url)
      const aObj = getHtmlText(mRes, gem?.url)
      await strapi.entityService.update("api::domain-manager.domain-manager", o.id, {
        data: {
          articleDetails: aObj
        }
      })
      readTime = Math.ceil((aObj?.textContent?.split(" ")?.length || 0) / 200)
      // const totalWords = aObj?.textContent?.split(" ")?.length || 0
      gem.media.readTime = readTime

      await strapi.entityService.update("api::gem.gem", gem?.id, {
        data: {
          media: gem.media
        }
      })
      return
    }

    const microRes = await microlinkRes(gem?.url)
    const articleObj = getHtmlText(microRes, gem?.url)
    await strapi.entityService.create("api::domain-manager.domain-manager", {
      data: {
        url: gem?.url,
        media_type: "Article",
        articleDetails: articleObj,
        publishedAt: new Date().toISOString()
      }
    })

    readTime = Math.ceil((articleObj?.textContent?.split(" ")?.length || 0) / 200)
    // const totalWords = articleObj?.textContent?.split(" ")?.length || 0
    gem.media.readTime = readTime

    await strapi.entityService.update("api::gem.gem", gem?.id, {
      data: {
        media: gem.media
      }
    })

    return 

  } catch (error) {
    return error.message;
  }
}
exports.deleteParentGem = async (gemId) => {
  try {
    const parent_gem = await strapi.entityService.findOne("api::gem.gem", gemId, {
      fields: ["id"],
      populate: {
        child_gem_id: { fields: ["id"] }
      }
    })

    if (parent_gem?.child_gem_id?.length > 0) {
      for (const child of parent_gem?.child_gem_id) {
        await strapi.entityService.delete("api::gem.gem", child.id)
      }
      return
    }

  } catch (error) {
    return error.message;
  }
}