import fs from "fs";
import path from "path";

export const extendMessages = (namePascal, nameCamel) => {
    const messagesPath = path.join(
        process.cwd(),
        "src/lib/messages/messages.constant.ts"
    );

    let messagesContent = fs.readFileSync(messagesPath, "utf8");

    if (new RegExp(`^\\s{4}${nameCamel}:\\s*{`, "m").test(messagesContent)) {
        console.log(
            `ℹ️  RESPONSE_MESSAGES already contains the "${nameCamel}" group.`
        );

        return;
    }

    const entityLabel = namePascal.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

    const marker = "} as const;";

    const newGroup = `    ${nameCamel}: {
        notFound: "${entityLabel} not found.",
    },
${marker}`;

    messagesContent = messagesContent.replace(marker, newGroup);

    fs.writeFileSync(messagesPath, messagesContent);

    console.log(
        `✅ RESPONSE_MESSAGES updated with the "${nameCamel}" not found message.`
    );
};
