import { GroupAP } from "../models/GroupAP";
import {Adminizer} from "../lib/Adminizer";

export default async function bindAccessRights(adminizer: Adminizer) {
    if (adminizer.config.models) {
        let models = adminizer.config.models;
        for (let key of Object.keys(models)) {
            
            const model = models[key];
            if (typeof model !== "boolean") {
                adminizer.accessRightsHelper.registerModelTokens(model.model);
            }
        }
    }

    if (adminizer.config.forms && adminizer.config.forms.data) {
        let forms = adminizer.config.forms.data;
        for (let key of Object.keys(forms)) {
            let department = `Form ${key}`;

            // create
            adminizer.accessRightsHelper.registerToken({
                id: `create-${key}-form`, name: "Create",
                description: "Access to creating form in database", department: department
            });

            // read
            adminizer.accessRightsHelper.registerToken({
                id: `read-${key}-form`, name: "Read",
                description: "Access to reading form in database", department: department
            });

            // update
            adminizer.accessRightsHelper.registerToken({
                id: `update-${key}-form`, name: "Update",
                description: "Access to updating form in database", department: department
            });

            // delete
            adminizer.accessRightsHelper.registerToken({
                id: `delete-${key}-form`, name: "Delete",
                description: "Access to deleting form in database", department: department
            });
        }
    }

    // Widgets
    adminizer.accessRightsHelper.registerToken({
        id: `widgets`, name: "Widgets",
        description: "Access to widgets", department: "Widgets"
    });

    // Allow access login
    adminizer.accessRightsHelper.registerToken({
        id: 'access-to-adminpanel',
        name: "Allowed log in",
        description: "Are users allowed to log in to the admin panel?",
        department: "Admin panel"
    });

    // Default user group
    if (adminizer.config.registration && adminizer.config.registration.enable) {
        // TODO refactor CRUD functions for DataAccessor usage
        let defaultUserGroupRecord: GroupAP = await adminizer.modelHandler.model.get("GroupAP")["_findOne"]({name: adminizer.config.registration.defaultUserGroup});
        if (!defaultUserGroupRecord) {
            // TODO refactor CRUD functions for DataAccessor usage
            await adminizer.modelHandler.model.get("GroupAP")?.["_create"]({
                name: adminizer.config.registration.defaultUserGroup,
                description: "Group for default users (guests) who dont have access to fields"
            })
        }
    }
}
