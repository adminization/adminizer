/**
 * GET /adminizer/groups
 * Returns list of all groups (for admin filter visibility settings)
 */
export async function getAllGroups(req: ReqType, res: ResType) {
    // Check access - only admins can see all groups
    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.status(401).send({ error: req.i18n.__('Unauthorized') });
        }
        if (!req.user.isAdministrator) {
            return res.status(403).send({ error: req.i18n.__('Forbidden') });
        }
    }

    try {
        const groupModel = req.adminizer.modelHandler.model.get('groupap');
        if (!groupModel) {
            return res.status(500).send({ error: req.i18n.__('GroupAP model not found') });
        }

        const groups = await groupModel['_find']({});

        return res.json({
            groups: groups.map((g: any) => ({
                id: g.id,
                name: g.name,
                description: g.description || ''
            }))
        });
    } catch (error: any) {
        return res.status(500).json({
            error: req.i18n.__('Failed to load groups'),
            message: error.message
        });
    }
}
