const { default: slugify } = require("slugify");
const { updatePlanService, setTagSeoInformation } = require("../../../../../utils");
const { updateSubTags, tagOrderAtUpdateTag } = require("../../services/tag-service");

module.exports = {

    beforeCreate(event) {
        const { data } = event.params;
        const slug     = slugify(data.tag?.slice(0, 65) || "", { lower: true, remove: /[&,+()$~%.'":*?<>{}/\/]/g });
        event.params.data.slug = slug
        event.params.data.seo  = {
            seo: {
                slug,
                title: `${data.tag?.slice(0, 65)} | Curateit`,
                keywords: `${data.tag?.slice(0, 65)},`,
                canonical: "",
                description: data.description?.slice(0, 65) || data.tag?.slice(0, 65),
            },
            opengraph: {
              url: "",
              type: "website",
              image: "https://d3jrelxj5ogq5g.cloudfront.net/webapp/curateit-logo.png",
              title: `${data.tag?.slice(0, 65)} | Curateit`,
              description: data.description?.slice(0, 65) || data.tag?.slice(0, 65)
            }
        }
    },

    afterCreate(event) {
        const { result } = event;
        const userId = strapi?.requestContext?.get()?.state?.user?.id;
        const username = strapi?.requestContext?.get()?.state?.user?.username;
        // setTagSeoInformation(result, username)
        updatePlanService(userId, "tag")
        const url  = `${process.env.REDIRECT_URI}/u/${username}/tags/${result.id}/${result.slug}`
        const obj  = {
            ...result.seo,
            seo: {
                ...result.seo.seo,
                canonical: url
            },
            opengraph: {
                ...result.seo.opengraph,
                url
            }
        }
        strapi.entityService.update("api::tag.tag", result.id, {
            data: {
                seo: obj
            }
        })
    },

    afterDelete(event) {
        const userId = strapi?.requestContext?.get()?.state?.user?.id;

        updatePlanService(userId, "tag")

    },

    async afterUpdate(event) {
        const userId = strapi.requestContext?.get()?.state?.user?.id;
        const { params, result } = event;
        if (params?.data?.hasOwnProperty('viewSubTag')) {
            updateSubTags(result?.id, userId, params?.data?.viewSubTag)
        }
    },

    async beforeUpdate(event) {
        const { params } = event;
        const userId = strapi.requestContext.get().state.user.id;
        const oldTagData = await strapi.entityService.findOne("api::tag.tag", params?.where?.id, {
            fields: ["id", "order_of_sub_tags"],
            populate: {
                parent_tag: {
                    fields: ["id", "order_of_sub_tags"]
                }
            }
        });

        if (params?.data?.hasOwnProperty('parent_tag')) {
            await tagOrderAtUpdateTag(userId, oldTagData, params?.data)
        }
    }
}