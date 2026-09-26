import { IsAllowedPathPayload } from "./ipBan.type.js";
import {
    IP_BAN_ALLOWED_PATHS,
    IP_BAN_ALLOWED_PREFIXES,
    URL_QUERY_SEPARATOR,
} from "./ipBan.constant.js";

export const extractPathname = ({ url }: { url: string }): string =>
    url.split(URL_QUERY_SEPARATOR)[0];

export const isAllowedPath = ({ path }: IsAllowedPathPayload): boolean =>
    IP_BAN_ALLOWED_PATHS.includes(path) ||
    IP_BAN_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
