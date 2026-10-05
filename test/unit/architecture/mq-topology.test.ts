/**
 * Every modules/<x>/mq/*.queue.ts and *.worker.ts exports configure<X>Queue /
 * configure<X>Worker, registered by exactly one plugin under src/plugins/mq/.
 * A broken link compiles and passes the integration suite (it registers no
 * worker plugin), then fails in production. Ported from tolmete-api.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.join(process.cwd(), "src");

const KINDS = [
    { suffix: ".queue.ts", configure: /export const (configure\w*Queue)\b/g },
    { suffix: ".worker.ts", configure: /export const (configure\w*Worker)\b/g },
];

const filesUnder = (dir: string, suffix: string): string[] =>
    (fs.readdirSync(dir, { recursive: true, encoding: "utf8" }) as string[])
        .filter((file) => file.endsWith(suffix))
        .map((file) => path.join(dir, file));

const read = (file: string): string => fs.readFileSync(file, "utf8");

describe.each(KINDS)("mq $suffix topology", ({ suffix, configure }) => {
    const moduleFiles = filesUnder(path.join(SRC, "modules"), suffix);
    const pluginFiles = filesUnder(path.join(SRC, "plugins", "mq"), suffix);

    const exportsOf = (file: string): string[] =>
        [...read(file).matchAll(configure)].map(([, name]) => name);

    it("finds files on both sides, so an empty scan cannot pass", () => {
        expect(moduleFiles.length).toBeGreaterThan(0);
        expect(pluginFiles.length).toBeGreaterThan(0);
    });

    it("gives every module file a configure export", () => {
        expect(
            moduleFiles.filter((file) => exportsOf(file).length === 0),
            "Files with no configure<X> export — no plugin can register them."
        ).toEqual([]);
    });

    it.each(moduleFiles.flatMap(exportsOf))(
        "%s is registered by exactly one plugin",
        (name) => {
            const registering = pluginFiles.filter((file) =>
                new RegExp(`\\b${name}\\b`).test(read(file))
            );

            expect(
                registering,
                `Add one fp() wrapper under src/plugins/mq/<module>/ that registers ${name}.`
            ).toHaveLength(1);
        }
    );
});
