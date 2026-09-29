import { IsAllowedPathPayload } from "./ipBan.type.js";
import {
    IP_BAN_ALLOWED_PATHS,
    IP_BAN_ALLOWED_PREFIXES,
} from "./ipBan.constant.js";

const QUERY_SEPARATOR = "?";

export const extractPathname = ({ url }: { url: string }): string =>
    url.split(QUERY_SEPARATOR)[0];

export const isAllowedPath = ({ path }: IsAllowedPathPayload): boolean =>
    IP_BAN_ALLOWED_PATHS.includes(path) ||
    IP_BAN_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
