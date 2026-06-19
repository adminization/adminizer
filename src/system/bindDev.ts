import {Adminizer} from "../lib/Adminizer";

export default function bindDev(adminizer: Adminizer) {
  if (adminizer.config.models) {
    Object.keys(adminizer.config.models).forEach((modelname) => {
      // if(["User", "Group"].includes(modelname))  return;
      if (typeof adminizer.config.models[modelname] !== "boolean") {
        let modelName = adminizer.config.models[modelname].model;
        adminizer.config.models[`dev-${modelName}`] = {
          title: `dev-${modelName}`,
          model: modelName,
          icon: "view_in_ar"
        };
      }
    });
  }
}
