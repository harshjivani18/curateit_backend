module.exports ={
    routes: [
        {
            method: 'GET',
            path: '/get-plan-services',
            handler: 'plan-service.getPlanServices'
        },
        {
            method: 'GET',
            path: '/get-user-plan-details',
            handler: 'plan-service.getUserPlanDetails'
        },
        { 
            method: 'POST',
            path: '/advanced-migration',
            handler: 'plan-service.planMigrateRecords',
        },
        {
            method: "GET",
            path: "/check-is-plan-owner",
            handler: "plan-service.isPlanOwner"
        },
        {
            method: "GET",
            path: "/migrate-plan-service-plans",
            handler: "plan-service.migrateExistingPlanServices"
        }
    ]
}