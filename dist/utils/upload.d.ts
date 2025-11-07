export declare function uploadImage(file: Express.Multer.File, folder: string): Promise<{
    filename: string;
    url: string;
}>;
export declare function deleteImageFromVercelBlob(url: string): Promise<{
    message: string;
}>;
export declare function uploadImageLocal(file: Express.Multer.File, folder: string): Promise<{
    filename: string;
    path: string;
}>;
//# sourceMappingURL=upload.d.ts.map