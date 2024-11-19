'use strict';

module.exports = (config, { strapi }) => {

    return async (ctx, next) => {

        const { user } = ctx.state;
        const { groupId, id } = ctx.params;
        const { method } = ctx.request;
        const { data } = ctx.request.body

        const gId = groupId || id
        const group = await strapi.entityService.findOne("api::group.group", gId);

        const oldMembers = group.members;
        const newMembers = data.members;
        const uniqueTo1 = oldMembers.filter(item => !newMembers.find(element => element.id === item.id));

        const idx = oldMembers.findIndex((m) => m.email === user.email)
        if (idx === -1) return ctx.forbidden("This action is unauthorized")
        if (method === "PUT") {
            // const idx = members.findIndex((m) => m.email === email)
            if (oldMembers[idx].role !== "admin" && oldMembers[idx].role !== "Admin" && uniqueTo1[0]?.id !== user?.id ) return ctx.forbidden("This action is unauthorized")
        }

        // if (method === "DELETE") {
        //     const idx = members.findIndex((m) => m.email === email)
        //     if (idx === -1) return ctx.forbidden("This action is unauthorized")
        // }

        return next()

    }
}

