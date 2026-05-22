export interface FeedbackUser {
    id: number | string
    login: string
    email: string
    isAdministrator: boolean
    [key: string]: unknown
}

export interface FeedbackPayload {
    title: string
    description: string
    files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>
    user: FeedbackUser
    /** Server-side timestamp of the submission (ISO 8601) */
    createdAt: string
    /** Adminizer package version at the time of submission */
    version: string
}

export abstract class AbstractFeedbackHandler {
    /**
     * Custom label for the trigger button in the sidebar footer.
     * Falls back to the i18n key "Send feedback" when not set.
     * @example
     *   triggerLabel = 'Report a bug'
     */
    triggerLabel?: string

    /**
     * Hint text shown inside the feedback panel (below the title).
     * Use it to guide the user — e.g. what information to include.
     * @example
     *   placeholder = 'Describe the issue and steps to reproduce it.'
     */
    placeholder?: string

    /**
     * Called when a feedback submission arrives.
     * Implement this in your handler to persist or forward the feedback.
     */
    abstract handle(payload: FeedbackPayload): Promise<void>
}
