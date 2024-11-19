exports.deleteCustomFieldsFromGems = async (collectionId, fieldId) => {
    try {

        const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
            fields: ["id"],
            populate: {
                gems: { fields: ["id", "custom_fields_obj"] }
            }
        })
        const gems = collection?.gems ? collection?.gems : []

        for (const gem of gems) {
            if (gem?.custom_fields_obj) {
                const idx = gem?.custom_fields_obj?.findIndex((f) => f?.id === fieldId)
                if (idx !== -1) {
                    gem?.custom_fields_obj.splice(idx, 1)
                    await strapi.entityService.update("api::gem.gem", gem.id, {
                        data: {
                            custom_fields_obj: gem?.custom_fields_obj
                        }
                    })
                }
            }
        }
        return "success"
    } catch (error) {
        return error.message
    }
}

exports.updateCustomFieldsFromGems = async (collectionId, data) => {
    try {
        const collection = await strapi.entityService.findOne("api::collection.collection", collectionId, {
            fields: ["id"],
            populate: {
                gems: { fields: ["id", "custom_fields_obj"] }
            }
        })
        const gems = collection?.gems ? collection?.gems : []
        for (const gem of gems) {
            if (gem?.custom_fields_obj) {
                const idx = gem?.custom_fields_obj?.findIndex((f) => f?.id === data.id)
                if (idx !== -1) {
                    gem.custom_fields_obj[idx].name = data?.name
                    gem.custom_fields_obj[idx].type = data?.type
                    gem.custom_fields_obj[idx].options != undefined && (gem.custom_fields_obj[idx].options = data?.options)
                    gem.custom_fields_obj[idx].defaultValue = data?.defaultValue
                    gem.custom_fields_obj[idx].tempOptionValue = data?.tempOptionValue
                    gem.custom_fields_obj[idx].isLabel = data?.isLabel

                    await strapi.entityService.update("api::gem.gem", gem.id, {
                        data: {
                            custom_fields_obj: gem?.custom_fields_obj
                        }
                    })
                }
            }
        }
        return "success"
    } catch (error) {
        return error.message
    }
}