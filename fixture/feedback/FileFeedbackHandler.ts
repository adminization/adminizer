import fs from 'fs/promises';
import path from 'path';
import { AbstractFeedbackHandler, FeedbackPayload } from '../../dist/lib/feedback/AbstractFeedbackHandler';

/**
 * Example FeedbackHandler for the fixture environment.
 * Saves each submission as a JSON file (plus any attachments) under .tmp/feedback/.
 */
export class FileFeedbackHandler extends AbstractFeedbackHandler {
    private readonly storageDir: string;
    
    constructor(storageDir?: string) {
        super();
        this.storageDir = storageDir ?? path.join(process.cwd(), '.tmp', 'feedback');
    }
    async handle(payload: FeedbackPayload): Promise<void> {
        await fs.mkdir(this.storageDir, { recursive: true });

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const dir = path.join(this.storageDir, id);
        await fs.mkdir(dir, { recursive: true });

        // Save metadata
        const meta = {
            id,
            title: payload.title,
            description: payload.description,
            files: payload.files.map((f) => ({
                originalname: f.originalname,
                mimetype: f.mimetype,
                size: f.size,
            })),
            createdAt: new Date().toISOString(),
        };
        await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

        // Save attachments
        for (const file of payload.files) {
            const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
            await fs.writeFile(path.join(dir, safeName), file.buffer);
        }

        console.log(`[FileFeedbackHandler] Saved feedback #${id} to ${dir}`);
    }
}
