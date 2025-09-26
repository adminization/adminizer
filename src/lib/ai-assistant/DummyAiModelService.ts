import {AbstractAiModelService} from './AbstractAiModelService';
import {AiAssistantMessage} from '../../interfaces/types';
import {UserAP} from '../../models/UserAP';
import {Adminizer} from '../Adminizer';

const DUMMY_RESPONSE = 'Ai-assystant dummy in deveploment';

export class DummyAiModelService extends AbstractAiModelService {
    public readonly id = 'dummy';
    public readonly name = 'Dummy assistant';
    public readonly description = 'Development placeholder model that returns a static response.';

    public constructor(adminizer: Adminizer) {
        super(adminizer);
    }

    public async generateReply(
        _prompt: string,
        _history: AiAssistantMessage[],
        _user: UserAP,
    ): Promise<string> {
        return DUMMY_RESPONSE;
    }
}
