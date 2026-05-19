import { GroupAP } from "../models/GroupAP";
import {Adminizer} from "../lib/Adminizer";
import { GROUP_FILTER_VISIBILITY_TOKEN } from "../policies/permissionResolvers";

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

    // Filters
    adminizer.accessRightsHelper.registerToken({
        id: GROUP_FILTER_VISIBILITY_TOKEN,
        name: "Manage group filter visibility",
        description: "Allows setting saved filter visibility to selected groups",
        department: "Filters"
    });

    // Default user group
    if (adminizer.config.registration && adminizer.config.registration.enable) {
        const groupModel = adminizer.modelHandler.internal("access-rights").get<GroupAP>("GroupAP");
        let defaultUserGroupRecord: GroupAP = await groupModel.findOne({where: {name: adminizer.config.registration.defaultUserGroup}});
        if (!defaultUserGroupRecord) {
            await groupModel.create({
                name: adminizer.config.registration.defaultUserGroup,
                description: "Group for default users (guests) who dont have access to fields"
            })
        }
    }
}
