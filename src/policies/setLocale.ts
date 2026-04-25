export default async function setLocale(req: ReqType, res: ResType, proceed: ()=>void) {
  if (!req.i18n || typeof req.i18n.setLocale !== 'function') {
    return proceed();
  }

  if (req.user && req.user.locale) {
    req.i18n.setLocale(req.user.locale);
    return proceed();
  }

  if (typeof req.adminizer.config.translation !== 'boolean') {
    req.i18n.setLocale(req.adminizer.config.translation.defaultLocale);
  }

  return proceed()
}
