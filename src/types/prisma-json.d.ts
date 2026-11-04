export {};

declare global {
    namespace PrismaJson {
        type MessageMeta = {
            source: "web" | "mobile" | "api";
            locale?: string | undefined;
            tags?: string[] | undefined;
            attachments?:
                | {
                      url: string;
                      mimeType: string;
                      sizeBytes: number;
                  }[]
                | undefined;
        };
    }
}
