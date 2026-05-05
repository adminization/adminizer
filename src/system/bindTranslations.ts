import {TranslationHelper} from "../helpers/translationHelper";
import * as fs from "fs";
import {Adminizer} from "../lib/Adminizer";

export default function bindTranslations(adminizer: Adminizer) {
  // load adminpanel translations
  TranslationHelper.loadTranslations(adminizer, `${adminizer.config.rootPath}/translations`);

  if (typeof adminizer.config.translation === 'boolean') {
    if (adminizer.config.translation as boolean === true) {
      Adminizer.log.warn("adminizer.config.translation is TRUE, is not mater")
    }
    return
  }
  const translationsDirectory =
    adminizer.config.translation.directory ?? adminizer.config.translation.path;

  if (!translationsDirectory) {
    return;
  }

  if (fs.existsSync(translationsDirectory)) {
    let translationsDir = fs.readdirSync(translationsDirectory);
    if (translationsDir.length) {
      // load project translations
      TranslationHelper.loadTranslations(adminizer, `${process.cwd()}/${translationsDirectory}`);
    }
  }
}
