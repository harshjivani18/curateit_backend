module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/gem-feedback',
            handler: 'feedback.createFeedback',
        },
        // {
        //     method: 'GET',
        //     path: '/feedback',
        //     handler: 'feedback.getFeedback',
        // },
        // {
        //     method: 'GET',
        //     path: '/feedback/:id',
        //     handler: 'feedback.getFeedbackById',
        // },
        // {
        //     method: 'PUT',
        //     path: '/feedback/:id',
        //     handler: 'feedback.updateFeedback',
        // },
        // {
        //     method: 'DELETE',
        //     path: '/feedback/:id',
        //     handler: 'feedback.deleteFeedback',
        // }
    ]
}