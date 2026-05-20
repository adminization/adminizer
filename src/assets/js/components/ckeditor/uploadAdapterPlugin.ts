import { Plugin } from 'ckeditor5';
import UploadAdapter from '@/components/ckeditor/uploadAdapter';

class UploadAdapterPlugin extends Plugin {
    static get requires() {
        return ['ImageUpload']; // Dependency on ImageUpload plugin
    }

    init() {
        const editor = this.editor;
        const urlParts = window.location.pathname.split('/').filter(part => part !== '');
        const modelIndex = urlParts.indexOf('model');
        const modelResourceName = modelIndex >= 0 ? urlParts[modelIndex + 1] : undefined;

        editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
            const uploadUrl = `${window.routePrefix}/model/${modelResourceName}/ckeditor5/upload`;
            return new UploadAdapter(loader, uploadUrl);
        };
    }
}

export default UploadAdapterPlugin;

