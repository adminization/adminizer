import sharp from "sharp";
import { promises as fs } from 'fs';
import path from 'path';
import { Adminizer } from "../Adminizer";

export class MediaManagerThumb {
    public static async getThumb(id: string, managerId: string, adminizer: Adminizer) {
        const fileExists = async (filePath: string) => {
            try {
                await fs.stat(filePath);
                return true;
            } catch {
                return false;
            }
        };

        const manager = adminizer.mediaManagerHandler.get(managerId);
        const filePath = await manager.getOrigin(id);
        
        // Checking if the path is already absolute
        const isAbsolute = path.isAbsolute(filePath);
        
        // Forming the correct path to the source file
        const sourcePath = isAbsolute ? 
            path.normalize(filePath) : // If the path is already absolute, normalize it
            path.join(process.cwd(), filePath); // If relative, add base
        
        
        // Path for thumbnail
        const baseThumbPath = path.join(process.cwd(), '.tmp', 'thumbs');
        await fs.mkdir(baseThumbPath, { recursive: true });
        
        const thumbPath = path.join(baseThumbPath, `${id}_thumb.webp`);
        
        if (await fileExists(thumbPath)) {
            return await fs.readFile(thumbPath);
        }
        
        // Checking the existence of the file
        if (!await fileExists(sourcePath)) {
            throw new Error(`Source file not found: ${sourcePath}\n` +
                           `Check if file exists at: ${sourcePath}\n` +
                           `Original path from manager: ${filePath}`);
        }
        
        // Create a thumbnail
        await sharp(sourcePath)
            .resize({ width: 150, height: 150, fit: 'cover' })
            .toFile(thumbPath);
            
        return await fs.readFile(thumbPath);
    }
}