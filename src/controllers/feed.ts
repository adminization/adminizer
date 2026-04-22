import { FeedService } from "../services/FeedService";
import { Adminizer } from "../lib/Adminizer";

/**
 * Public feed controller — exports data by apiKey with userKey authentication
 * GET /adminizer/api/feed/:apiKey.json?userKey=xxx
 * GET /adminizer/api/feed/:apiKey.xml?userKey=xxx
 */
export default async function feedController(req: ReqType, res: ResType) {
    const { apiKey, format } = req.params as { apiKey?: string; format?: string };
    const userKey = req.query.userKey as string | undefined;

    // Validate format
    const exportFormat = (format || 'json').toLowerCase();
    if (!['json', 'xml'].includes(exportFormat)) {
        return res.status(400).json({ error: 'Invalid format. Supported: json, xml' });
    }

    if (!apiKey) {
        return res.status(400).json({ error: 'apiKey is required' });
    }

    if (!userKey) {
        return res.status(401).json({ error: 'userKey is required' });
    }

    try {
        const feedService = new FeedService(req.adminizer);

        // Find filter by apiKey
        Adminizer.log.debug(`Feed: looking for filter with apiKey=${apiKey}`);
        const filter = await feedService.findFilterByApiKey(apiKey);

        if (!filter) {
            return res.status(404).json({
                error: 'Filter not found or API access is disabled',
                message: 'Check your apiKey or ensure API access is enabled for this filter'
            });
        }

        // Authenticate user by userKey
        if (!req.adminizer.config.auth.enable) {
            return res.status(403).json({ error: 'Auth is required for feed access' });
        }

        const userModel = req.adminizer.modelHandler.model.get('UserAP');
        const user = await userModel['_findOne']({ userApiKey: userKey });

        if (!user) {
            return res.status(403).json({ error: 'Invalid userKey' });
        }

        Adminizer.log.info(`Feed access: filter "${filter.name}" (${filter.modelName}) by user ${user.login} via ${exportFormat}`);
        Adminizer.log.debug(`Feed: filter conditions type=${typeof filter.conditions}, isArray=${Array.isArray(filter.conditions)}`);

        // Generate feed based on format
        if (exportFormat === 'json') {
            const data = await feedService.generateJsonFeed(filter, req.adminizer, user);

            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            // inline — отображать в браузере вместо скачивания
            res.setHeader('Content-Disposition', `inline; filename="${filter.modelName}_feed.json"`);

            return res.json(data);
        } else {
            const xml = await feedService.generateAtomFeed(filter, req.adminizer, user);

            res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
            // inline — отображать в браузере вместо скачивания
            res.setHeader('Content-Disposition', `inline; filename="${filter.modelName}_feed.xml"`);

            return res.send(xml);
        }
    } catch (error: any) {
        console.error('Feed export error:', error);
        console.error('Stack:', error?.stack);
        if (error?.cause) {
            console.error('Cause:', error.cause);
        }
        return res.status(500).json({
            error: 'Failed to generate feed',
            message: error?.message || 'Unknown error'
        });
    }
}
