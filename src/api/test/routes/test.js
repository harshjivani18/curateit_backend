module.exports = {
  routes: [
    {
      method: "GET",
      path: "/testing",
      handler: "test.getTest",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};