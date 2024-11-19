module.exports = {
  routes: [
    {
     method: 'GET',
     path: '/domain', // There is no refrence for the collection in the api so no need to validate the permissions
     handler: 'domain-details.getDomainDetails',
     config: {
       policies: [],
       middlewares: [],
     },
    }
  ],
};
