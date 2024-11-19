const createReferralViaLink = async (id, username) => {
    try {
        await strapi.entityService.create("api::referral.referral", {
            data: {
                author: id,
                ref_code: username,
                publishedAt: new Date().toISOString(),
                platform: "link"
            }
        })
        return "success"
    } catch (error) {
        return error.message
    }
}

const updateReferral = async (user, code, platform, id, trigger, slug) => {
    try {
        // if (!user || !code) return "Invalid data"
        if (!user) return "Invalid data"
        const referral = await strapi.db.query("api::referral.referral").findOne({
            where: {
                ref_code: code
            }
        })

        let obj = {
            id: user?.id,
            name: (user?.firstname && user?.lastname) ? `${user?.firstname} ${user?.lastname}` : user?.email,
            code,
            username: user?.username,
            email: user?.email,
            platform: platform ? platform : "link",
            avatar: user?.avatar,
            slug: slug ? slug : null,
            source_id : id ? id : null,
            trigger: trigger ? trigger : null,
            "date-time": new Date().toLocaleString()
        }

        let data
        if (platform === "email") {
            const idx = referral?.ref_users_via_email?.findIndex((r) => r?.email === user?.email)
            referral.ref_users_via_email[idx].id = user?.id
            referral.ref_users_via_email[idx].name = (user?.firstname && user?.lastname) ? `${user?.firstname} ${user?.lastname}` : user?.email
            referral.ref_users_via_email[idx].username = user?.username
            referral.ref_users_via_email[idx].status = "accepted"

            data = { ref_users_via_email: referral?.ref_users_via_email }
        }

        if (platform === "link"  || !platform || platform === "null" || platform === "undefined") {
            obj.platform = "link"
            data = { ref_users_via_link: (referral?.ref_users_via_link && referral?.ref_users_via_link?.length > 0) ? [...referral?.ref_users_via_link, obj] : [obj] }
        }

        if (platform === "ig") {
            data = { ref_users_via_ig: (referral?.ref_users_via_ig && referral?.ref_users_via_ig?.length > 0) ? [...referral?.ref_users_via_ig, obj] : [obj] }
        }

        if (platform === "li") {
            data = { ref_users_via_li: (referral?.ref_users_via_li && referral?.ref_users_via_li?.length > 0) ? [...referral?.ref_users_via_li, obj] : [obj] }
        }

        if (platform === "fb") {
            data = { ref_users_via_fb: (referral?.ref_users_via_fb && referral?.ref_users_via_fb?.length > 0) ? [...referral?.ref_users_via_fb, obj] : [obj] }
        }

        if (platform === "tw") {
            data = { ref_users_via_tw: (referral?.ref_users_via_tw && referral?.ref_users_via_tw?.length > 0) ? [...referral?.ref_users_via_tw, obj] : [obj] }
        }

        if (platform === "wp") {
            data = { ref_users_via_wp: (referral?.ref_users_via_wp && referral?.ref_users_via_wp?.length > 0) ? [...referral?.ref_users_via_wp, obj] : [obj] }
        }

        if (platform === "tags" || platform === "collections" || platform === "gems" || platform === "profile") {
            data = { ref_users_via_modules: (referral?.ref_users_via_modules && referral?.ref_users_via_modules?.length > 0) ? [...referral?.ref_users_via_modules, obj] : [obj] }
        }

        await strapi.entityService.update("api::referral.referral", referral?.id, {
            // data: {
            //     ref_users: (referral?.ref_users && referral?.ref_users?.length > 0) ? [...referral?.ref_users, obj] : [obj]
            // }
            data
        })
        return "success"
    } catch (error) {
        return error.message
    }
}

module.exports = {
    createReferralViaLink,
    updateReferral
}