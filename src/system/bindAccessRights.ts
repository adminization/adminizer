import { Group } from "../models/Group";
import {Adminizer} from "../lib/Adminizer";
import { GROUP_FILTER_VISIBILITY_TOKEN } from "../policies/permissionResolvers";
import { ownershipTransferToken } from "../lib/access-graph/shared";

export default async function bindAccessRights(adminizer: Adminizer) {
    if (adminizer.config.models) {
        let models = adminizer.config.models;
        for (const [resourceName, model] of Object.entries(models)) {
            if (typeof model !== "boolean") {
                adminizer.accessRightsHelper.registerModelTokens(resourceName);

                // Records of an access-restricted model are pinned to their owner; this token is the
                // opt-in way back to the pre-scoping workflow of handing one over.
                if (model && typeof model === "object" && model.userAccessRelation) {
                    adminizer.accessRightsHelper.registerToken({
                        id: ownershipTransferToken(resourceName),
                        name: "Transfer ownership",
                        description: "Allows setting the owner of a record explicitly instead of inheriting the current user's one",
                        department: `Model ${resourceName}`
                    });
                }
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
        const groupModel = adminizer.modelHandler.internal("access-rights").get<Group>("Group");
        let defaultUserGroupRecord: Group = await groupModel.findOne({where: {name: adminizer.config.registration.defaultUserGroup}});
        if (!defaultUserGroupRecord) {
            await groupModel.create({
                name: adminizer.config.registration.defaultUserGroup,
                description: "Group for default users (guests) who dont have access to fields"
            })
        }
    }
}
