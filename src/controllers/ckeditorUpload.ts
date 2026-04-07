import { ControllerHelper } from "../helpers/controllerHelper";
import {Entity} from "../interfaces/types";
import * as fs from "fs";
import multer from "multer";
import {redirectToLogin} from '../helpers/inertiaAutHelper';

export async function ckEditorUpload(req: ReqType, res: ResType) {
	let entity = ControllerHelper.findEntityObject(req);

	if (req.adminizer.config.auth.enable) {
		if (!req.user) {
			redirectToLogin(req, res);
			return
		} else if (!req.adminizer.accessRightsHelper.enoughPermissions([
			`update-${entity.name}-model`,
			`create-${entity.name}-model`,
			`update-${entity.name}-form`,
			`create-${entity.name}-form`
		], req.user)) {
			res.sendStatus(403);
			return
		}
	}

    const dirDownload = `uploads/${entity.type}/${entity.name}/ckeditor`;

    await handleUpload(req, res, dirDownload)

}

async function handleUpload(req: ReqType, res: ResType, dirDownload: string) {
    const upload = multer(getUploadConfig(dirDownload)).single("file");

    upload(req, res, async (err) => {
        try {
            if (err) {
                let errorMessage = err.message;
                if (err.code === 'LIMIT_FILE_SIZE') {
                    const maxSizeMB = (5 * 1024 * 1024) / (1024 * 1024);
                    errorMessage = `${req.i18n.__('The file exceeds the size limit')} ${maxSizeMB} MB`;
                }
                return res.status(400).json({msg: "error", error: errorMessage});
            }

            return res.send({
                msg: "success",
                url: `/${dirDownload}/${req.file.filename}`,
            });
        } catch (e) {
            console.error(e);
            return res.status(500).send({error: e.message || 'Upload failed'});
        }
    });
}

function getUploadConfig(dirDownload: string) {
    return {
        storage: setStorage(checkDirectory(dirDownload)),
        limits: {
            fileSize: 5 * 1024 * 1024,
        },
        fileFilter: (req: ReqType, file: any, cb: any) => {
            cb(null, true);
        }
    };
}

function checkDirectory(dirDownload: string): string {
    const outputDir = `${process.cwd()}/.tmp/public/${dirDownload}`;

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {recursive: true});
    }
    return outputDir
}

function setStorage(outputDir: string) {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, outputDir);
        },
        filename: (req, file, cb) => {
            const filename = req.body.name;
            cb(null, filename);
        }
    });
}