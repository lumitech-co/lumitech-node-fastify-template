export {};

declare global {
    namespace PrismaJson {
        type MessageMeta = {
            source: "web" | "mobile" | "api";
            locale?: string;
            tags?: string[];
            attachments?: {
                url: string;
                mimeType: string;
                sizeBytes: number;
            }[];
        };
    }
}
