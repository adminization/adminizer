import {Adminizer} from "../../lib/Adminizer";

/** Returns dynamic permission options from a registered token. */
export async function getPermissionOptions(req: ReqType, res: ResType) {
    const tokenId = typeof req.query.tokenId === "string" ? req.query.tokenId : "";
    const token = req.adminizer.accessRightsHelper.getToken(tokenId);
    if (!token?.getOptions) {
        return res.status(404).json({error: "Contextual access token was not found"});
    }

    try {
        const options = await token.getOptions(req.user);
        return res.json({
            options: options.map((option) => ({
                id: String(option.id),
                name: String(option.name),
                description: option.description ? String(option.description) : undefined,
            })),
        });
    } catch (error) {
        Adminizer.log.error("AccessRightsHelper > token options failed", token.id, error);
        return res.status(500).json({error: "Failed to load permission options"});
    }
}
