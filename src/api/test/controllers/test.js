module.exports = {
  async getTest(ctx, next) {
    try {
      const data = await strapi
        .service("api::test.test")
        .getTest()
      ctx.body = { msg: "OK", data };
    } catch (err) {
      ctx.badRequest("Post report controller error", { moreDetails: err });
    }
  },
};