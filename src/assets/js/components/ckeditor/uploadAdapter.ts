import { apiHttp } from '@/lib/http-client';

export default class UploadAdapter {
    private loader: any;
    private url: string;

    constructor(loader: any, url: string) {
        this.loader = loader;
        this.url = url;
    }

    async upload() {
        const data = new FormData();
        let file = await this.loader.file;
        data.append("name", file.name);
        data.append("file", file);

        try {
            let response = await apiHttp.post<{ msg: string; url: string }>(this.url, data);

            let result = {
                msg: response.data.msg,
                url: window.bindPublic ? `/public${response.data.url}` : response.data.url
            };
            // Expected response format: {"code":0,"msg":"success","data":{"url":"/upload/struts2.jpeg"}}

            return {
                default: result.url,
            };
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
}
