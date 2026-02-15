import { Plugin } from 'ckeditor5';
import UploadAdapter from '@/components/ckeditor/uploadAdapter';

class UploadAdapterPlugin extends Plugin {
    static get requires() {
        return ['ImageUpload']; // Dependency on ImageUpload plugin
    }

    init() {
        const editor = this.editor;
        const urlParts = window.location.pathname.split('/').filter(part => part !== '');
        const entityType = urlParts[1];
        const entityName = urlParts[2];

        editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
            const uploadUrl = `${window.routePrefix}/${entityType}/${entityName}/ckeditor5/upload`;
            return new UploadAdapter(loader, uploadUrl);
        };
    }
}

export default UploadAdapterPlugin;