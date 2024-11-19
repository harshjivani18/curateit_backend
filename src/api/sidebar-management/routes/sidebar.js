module.exports = {
    routes : [
        {
            method: 'GET',
            path: '/public-sidebar',
            handler: 'sidebar-management.getAllPublicSidebar', 
        },
        {
            method: 'POST',
            path: '/sequence-sidebar',
            handler: 'sidebar-management.sequenceSidebar', 
        },
        {
            method: 'GET',
            path: '/sequence-sidebar',
            handler: 'sidebar-management.getSequenceSidebar', 
        },
        {
            method: "POST",
            path: "/update-most-visited-app",
            handler: "sidebar-management.updateMostVisitedApp"
        },
        {
            method: "POST",
            path: "/add-sidebarapp",
            handler: "sidebar-management.addSidebarApp"
        }
    ]
}