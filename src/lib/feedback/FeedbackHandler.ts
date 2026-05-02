import { Adminizer } from '../Adminizer';
import { AbstractFeedbackHandler } from './AbstractFeedbackHandler';
import { bindFeedbackController } from '../../controllers/feedback/feedbackController';

export class FeedbackHandler {
    private handler: AbstractFeedbackHandler | null = null
    private adminizer: Adminizer

    constructor(adminizer: Adminizer) {
        this.adminizer = adminizer
    }

    register(handler: AbstractFeedbackHandler): void {
        this.handler = handler
        const middlewares = this.adminizer.config.middlewares ?? []
        bindFeedbackController(this.adminizer, middlewares)
        Adminizer.log.info('FeedbackHandler registered')
    }

    isRegistered(): boolean {
        return this.handler !== null
    }

    getTriggerLabel(): string | undefined {
        return this.handler?.triggerLabel
    }

    getPlaceholder(): string | undefined {
        return this.handler?.placeholder
    }

    async dispatch(payload: Parameters<AbstractFeedbackHandler['handle']>[0]): Promise<void> {
        if (!this.handler) {
            throw new Error('No FeedbackHandler registered')
        }
        await this.handler.handle(payload)
    }
}
