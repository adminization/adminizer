import multer from 'multer';
import { Adminizer } from '../../lib/Adminizer';
import { requireAuthAPI } from '../../middlewares/authGuards';
import { bindWithPolicies } from '../../system/routeGuards';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
});

export function bindFeedbackController(adminizer: Adminizer, policies: MiddlewareType[]) {
    const { app, config } = adminizer;
    const prefix = config.routePrefix;

    const uploadMiddleware = upload.array('files', 10);

    const handler = async (req: ReqType, res: ResType) => {
        uploadMiddleware(req as any, res as any, async (err: any) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({
                        error: req.i18n.__('File size exceeds the 5 MB limit'),
                    });
                }
                return res.status(400).json({ error: err.message });
            }

            const title: string = (req.body?.title ?? '').trim();
            const description: string = (req.body?.description ?? '').trim();

            if (!title) {
                return res.status(422).json({ error: req.i18n.__('Title is required') });
            }

            const files: Express.Multer.File[] = (req.files as Express.Multer.File[]) ?? [];

            try {
                await adminizer.feedbackHandler.dispatch({
                    title,
                    description,
                    files: files.map((f) => ({
                        originalname: f.originalname,
                        mimetype: f.mimetype,
                        size: f.size,
                        buffer: f.buffer,
                    })),
                    user: {
                        id: req.user.id,
                        login: req.user.login,
                        email: req.user.email ?? '',
                        isAdministrator: req.user.isAdministrator ?? false,
                    },
                    createdAt: new Date().toISOString(),
                    version: (() => {
                        const v = adminizer.config.showVersion;
                        if (typeof v === 'string') return v;
                        if (v && typeof v === 'object' && v.text) return v.text;
                        return adminizer.config.package?.version ?? 'unknown';
                    })(),
                });

                return res.json({ ok: true });
            } catch (e: any) {
                Adminizer.log.error('FeedbackController error:', e);
                return res.status(500).json({ error: req.i18n.__('Internal server error') });
            }
        });
    };

    app.post(`${prefix}/api/feedback`, ...bindWithPolicies(adminizer, policies, handler, [requireAuthAPI()]));
}
