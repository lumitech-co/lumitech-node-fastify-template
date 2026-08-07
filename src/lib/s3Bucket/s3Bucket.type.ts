export type DeleteFilePayload = {
    key: string;
};

export type DeleteFolderPayload = {
    prefix: string;
};

export type CreateUploadSignedUrlPayload = {
    key: string;
    contentType: string;
};

export type CreateReadSignedUrlPayload = {
    key: string;
};
