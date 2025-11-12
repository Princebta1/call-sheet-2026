import assert from "assert";
import { env } from "../env";

export function getBaseUrl({ port }: { port?: number } = {}): string {
    if (port === undefined || port === 8000) {
        return env.BASE_URL ?? "http://localhost:8000";
    }
    if (env.BASE_URL_OTHER_PORT) {
        return env.BASE_URL_OTHER_PORT.replace("[PORT]", port.toString());
    }
    const primaryBaseUrl = getBaseUrl();
    if (primaryBaseUrl.startsWith("http://")) {
        return `${primaryBaseUrl.split("://")[0]}://${primaryBaseUrl.split("://")[1]!.split(":")[0]}:${port}`;
    }
    assert(primaryBaseUrl.startsWith("https://"));
    const primaryBaseUrlParts = primaryBaseUrl.split(".");
    return `${primaryBaseUrlParts[0]}--${port}.${primaryBaseUrlParts.slice(1).join(".")}`;
}

export function getMinioBaseUrl(): string {
    return getBaseUrl({ port: 9000 });
}