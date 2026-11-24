export const toNames = (name) => ({
    camel: name.charAt(0).toLowerCase() + name.slice(1),
    pascal: name.charAt(0).toUpperCase() + name.slice(1),
    kebab: name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
});

/**
 * "message" is a flat module; "integrations/github" is the github feature
 * of the integrations module. `unit` names the files, `dir` is the folder
 * under src/modules/ and `module` owns public.ts.
 */
export const resolveUnit = (arg) => {
    const parts = arg.split("/");
    const [moduleName, featureName, ...deeper] = parts;

    if (deeper.length > 0 || parts.some((part) => !part || part === "mq")) {
        console.error(
            `❌ "${arg}" is not a module path — use <module> or <module>/<feature> (mq is reserved).`
        );

        process.exit(1);
    }

    const module = toNames(moduleName);
    const unit = featureName ? toNames(featureName) : module;

    return {
        unit,
        module,
        grouped: Boolean(featureName),
        dir: featureName ? `${module.kebab}/${unit.kebab}` : unit.kebab,
    };
};
