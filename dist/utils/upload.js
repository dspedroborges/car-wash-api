import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
const supabase = createClient(String(process.env.SUPABASE_URL), String(process.env.SUPABASE_KEY));
export async function uploadImage(file, folder) {
    if (file.size > 1024 * 1024)
        throw new Error("Tamanho máximo do arquivo é 1MB");
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    const filePath = `${folder}/${filename}`;
    const { error } = await supabase.storage
        .from("uploads")
        .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
    });
    if (error)
        throw new Error(error.message);
    const { data: publicUrl } = supabase.storage
        .from("uploads")
        .getPublicUrl(filePath);
    return { filename, url: publicUrl.publicUrl };
}
export async function uploadImageLocal(file, folder) {
    if (file.size > 1024 * 1024)
        throw new Error("Tamanho máximo do arquivo é 1MB");
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    const filePath = path.join(folder, filename);
    await fs.promises.mkdir(folder, { recursive: true });
    await fs.promises.writeFile(filePath, file.buffer);
    return { filename, path: filePath };
}
//# sourceMappingURL=upload.js.map