import {AbstractAiModelService} from './AbstractAiModelService';
import {AiAssistantMessage} from '../../interfaces/types';
import {UserAP} from '../../models/UserAP';
import {Adminizer} from '../Adminizer';

const DUMMY_RESPONSE = 'Ai-assystant dummy in deveploment';

export class DummyAiModelService extends AbstractAiModelService {
    public constructor(adminizer: Adminizer) {
        super(adminizer, {
            id: 'dummy',
            name: 'Dummy assistant',
            description: 'Development placeholder model that returns a static response.',
        });
    }

    public async generateReply(
        _prompt: string,
        _history: AiAssistantMessage[],
        _user: UserAP,
    ): Promise<string> {
        return DUMMY_RESPONSE;
    }
}
