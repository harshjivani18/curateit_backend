const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::gem.gem", ({ strapi }) => ({
  async counts(ctx) {
    try {
      const { user } = ctx.state;
      const { gemId } = ctx.params;
      const { type } = ctx.request.query;

      let data = {};

      const gem = await strapi.entityService.findOne("api::gem.gem", gemId, {
        filters: { author: user.id },
        fields: ["id", "title", "slug", "shares_count", "likes_count", "save_count"],
        populate: {
          like_users: { fields: ["id", "username"] },
        },
      });

      if (type === "share")
        data = {
          shares_count: parseInt(gem.shares_count) + 1,
          share_users: user.id,
        };
      if (type === "like") {
        if (gem.like_users.some((u) => u.id === parseInt(user.id))) {
          let like_users = gem.like_users.filter((u) => {
            return u.id !== parseInt(user.id);
          });
          data = { likes_count: parseInt(gem.likes_count) - 1, like_users };
        } else {
          gem.like_users.push(user.id);
          data = {
            likes_count: parseInt(gem.likes_count) + 1,
            like_users: gem.like_users,
            isLike: true,
          };
        }
      }
      if (type === "save")
        data = {
          save_count: parseInt(gem.save_count) + 1,
          save_users: user.id,
        };

      await strapi.entityService.update("api::gem.gem", gemId, {
        data,
      });

      ctx.send({ status: 200, message: "Count updated", data });
    } catch (error) {
      ctx.send({ status: 400, message: error });
    }
  },

  async countUser(ctx) {
    try {
      const { user } = ctx.state;
      const { gemId } = ctx.params;
      const { type } = ctx.request.query;

      let populate = {};

      if (type === "share")
        populate = { share_users: { fields: ["id", "username"] } };
      if (type === "like")
        populate = { like_users: { fields: ["id", "username"] } };
      if (type === "save")
        populate = { save_users: { fields: ["id", "username"] } };

      const gem = await strapi.entityService.findOne("api::gem.gem", gemId, {
        filters: { author: user.id },
        field: ["id", "name", "slug", "shares_count", "likes_count", "save_count"],
        populate,
      });

      ctx.send({ status: 200, data: gem });
    } catch (error) {
      ctx.send({ status: 400, message: error });
    }
  },

  async gemFiltersCountByMediaType(ctx) {
    try {
      const { user } = ctx.state;

      const mediaTypes = [
        "Book",
        "Testimonial",
        "Link",
        "Screenshot",
        "Profile",
        "SocialFeed",
        "Highlight",
        "Code",
        "Article",
        "PDF",
        "Video",
        "Image",
        "Audio",
        "Product",
        "Ai Prompt",
        "Quote",
        "Note",
        "Movie",
        "Text Expander",
        "Citation",
        "App",
        "Blog"
      ];

      const allGems = await strapi.entityService.findMany("api::gem.gem", {
        filters: { author: user.id },
        fields: ["media_type"],
      });
      const typesObj = {};
      mediaTypes.forEach((type) => {
        typesObj[type] = allGems.filter((g) => g.media_type === type).length;
      });

      // Preparing for favs
      const filters = {
        $or: [
          {
            author: user.id,
            is_favourite: true,
          },
          {
            like_users: user.id,
          },
        ],
        collection_gems: { $not: null },
      };
      const gArr = await strapi.entityService.findMany("api::gem.gem", {
        filters,
      });

      typesObj["Favourites"] = gArr.length;

      return ctx.send(typesObj);
    } catch (error) {
      return ctx.send({ message: error });
    }
  },

  async gemUsageCount(ctx) {
    try {
      const { user } = ctx.state;
      const { gemId } = ctx.params;

      if (!user) { return { status: 200 } }
      const getCount = await strapi.entityService.findOne(
        "api::gem.gem",
        gemId,
        {
          fields: ["id", "title", "slug", "usageCount"],
        }
      );
      const count = getCount?.usageCount
        ? parseInt(getCount.usageCount) + 1
        : 1;
      await strapi.entityService.update("api::gem.gem", gemId, {
        data: {
          usageCount: count,
        },
      });
      ctx.send({ status: 200, message: "Count Updated Successfully", count });
    } catch (error) {
      ctx.send({ status: 400, message: error });
    }
  },

  async getUsageCount(ctx) {
    try {
      const { user } = ctx.state;

      if (!user) throw "Please send the JWT token";
      const gems = await strapi.entityService.findMany("api::gem.gem", {
        filters: { author: user.id, usageCount: { $ne: null } },
        fields: ["id", "title", "slug", "url", "usageCount", "metaData", "media_type"],
        sort: { usageCount: "desc" },
        // start: 0,
        // limit: 10,
      });

      let domains = [];
      gems.map((g) => {
        const { hostname } = new URL(g.url);
        const idx = domains.findIndex((d) => {
          return d.hostname === hostname
        })
        const obj = {
          hostname,
          metaData: g.metaData,
          usageCount: g.usageCount
        }
        if ( idx !== -1 ) {
          domains[idx] = { 
            ...domains[idx], usageCount: parseInt(domains[idx].usageCount) + parseInt(obj.usageCount)
          }
          domains = [...domains]
        } else {
          domains.push(obj)
        }
      })

      const finalResult = {
        mostVisitedSite: gems.slice(0, 10),
        mostVisitedDomain: domains.slice(0, 10)
      }

      ctx.send({ status: 200, message: finalResult });
    } catch (error) {
      ctx.send({ status: 400, message: error });
    }
  },

  async getSavingCost(ctx) {
    try {
      if (!user) throw "Please send the JWT token";
      const gems = await strapi.entityService.findMany("api::gem.gem", {
        filters: { author: user.id, usageCount: { $ne: null } },
        fields: ["id", "title", "slug", "url", "usageCount", "metaData"],
        sort: { usageCount: "desc" },
        // start: 0,
        // limit: 10,
      });

      const mediaTypes = [
        "Book",
        "Testimonial",
        "Link",
        "Screenshot",
        "Profile",
        "SocialFeed",
        "Highlight",
        "Code",
        "Article",
        "PDF",
        "Video",
        "Image",
        "Audio",
        "Product",
        "Ai Prompt",
        "Quote",
        "Note",
        "Movie",
        "Text Expander",
        "Citation",
        "App",
      ];

      

    } catch (error) {
      ctx.send({ status: 400, message: error });
    }
  },

  async usageCountForReaderAndSearch(ctx) {
    try {
      const { user } = ctx.state;
      const { usagefield } = ctx.request.query;
      if (!user) throw "Please send the JWT token";

      const getCount = await strapi.entityService.findOne(
        'plugin::users-permissions.user',
        user.id,
        {
          fileds: ["id", "username", "usageCount"],
        }
      );

      let count = { ...getCount?.usageCount };
      if (usagefield === 'listened') {
        count.articleListened = count.articleListened
        ? parseInt(count.articleListened) + 1
        : 1;
      }
      if (usagefield === 'read') {
        count.speedRead = count.speedRead
        ? parseInt(count.speedRead) + 1
        : 1;
      }
      if (usagefield === 'readerview') {
        count.readerView = count.readerView
        ? parseInt(count.readerView) + 1
        : 1;
      }
      if (usagefield === 'search') {
        count.search = count.search
        ? parseInt(count.search) + 1
        : 1;
      }

      await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: {
          usageCount: count,
        },
      });

      ctx.send({ status: 200, message: "Count Updated Successfully", count });
    } catch (error) {
      ctx.send({ status: 400, message: error });
    }
  },
}));
