// A Prisma select / include / where / write payload describes a query, so it
// lives with the repository that runs it (CLAUDE.md, Rule 2). Ported from
// tolmete-api.
const SHAPE_SUFFIX =
    /(?:Select|Include|Omit|GetPayload|WhereInput|WhereUniqueInput|OrderByWithRelationInput|CreateInput|UncheckedCreateInput|UpdateInput|UncheckedUpdateInput|CreateManyInput)$/;

const shapeName = (reference) => {
    const name = reference.typeName;

    if (
        name.type !== "TSQualifiedName" ||
        name.left.type !== "Identifier" ||
        name.left.name !== "Prisma" ||
        name.right.type !== "Identifier"
    ) {
        return null;
    }

    return SHAPE_SUFFIX.test(name.right.name) ? name.right.name : null;
};

export default {
    meta: {
        type: "problem",
        schema: [],
        messages: {
            shapeOutside:
                "`Prisma.{{shape}}` describes a query — declare it in the repository under src/database/repositories/** and import the select / row type from there (CLAUDE.md, Rule 2).",
        },
    },
    create(context) {
        return {
            TSTypeReference(node) {
                const shape = shapeName(node);

                if (shape) {
                    context.report({
                        node,
                        messageId: "shapeOutside",
                        data: { shape },
                    });
                }
            },
        };
    },
};
