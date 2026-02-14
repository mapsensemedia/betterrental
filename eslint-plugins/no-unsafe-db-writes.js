/**
 * ESLint Custom Rule: no-unsafe-db-writes
 * 
 * Prevents frontend code from directly writing to protected tables
 * or using service-role credentials outside edge functions.
 * 
 * Blocks:
 * - from("bookings").insert/update
 * - from("payments").insert/update
 * - SUPABASE_SERVICE_ROLE_KEY references
 * - getAdminClient() usage outside supabase/functions
 */

/** @type {import('eslint').Rule.RuleModule} */
const noUnsafeDbWrites = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct writes to protected Supabase tables and service-role usage in frontend code",
      category: "Security",
    },
    messages: {
      protectedTableWrite:
        'Direct {{operation}} on "{{table}}" is forbidden in frontend code. Use an edge function instead.',
      serviceRoleKey:
        "SUPABASE_SERVICE_ROLE_KEY must never appear in frontend code.",
      adminClient:
        "getAdminClient() is only allowed inside supabase/functions/. Use the anon client in frontend code.",
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename?.() || context.filename || "";

    // Skip edge functions — they're allowed to do everything
    if (filename.includes("supabase/functions")) return {};
    // Skip non-src files (config, scripts, tests)
    if (!filename.includes("/src/")) return {};

    const PROTECTED_TABLES = ["bookings", "payments"];
    const WRITE_METHODS = ["insert", "update", "upsert", "delete"];

    return {
      // Catch: .from("bookings").insert(...)  /  .from("payments").update(...)
      CallExpression(node) {
        // Look for .insert() / .update() / .upsert() / .delete()
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          WRITE_METHODS.includes(node.callee.property.name)
        ) {
          // Walk up to find .from("tableName")
          let current = node.callee.object;
          while (current) {
            if (
              current.type === "CallExpression" &&
              current.callee.type === "MemberExpression" &&
              current.callee.property.type === "Identifier" &&
              current.callee.property.name === "from" &&
              current.arguments.length > 0 &&
              current.arguments[0].type === "Literal" &&
              PROTECTED_TABLES.includes(current.arguments[0].value)
            ) {
              context.report({
                node,
                messageId: "protectedTableWrite",
                data: {
                  operation: node.callee.property.name,
                  table: current.arguments[0].value,
                },
              });
              break;
            }
            // Continue walking up chained calls
            if (current.type === "CallExpression") {
              current = current.callee.type === "MemberExpression" ? current.callee.object : null;
            } else if (current.type === "MemberExpression") {
              current = current.object;
            } else {
              break;
            }
          }
        }

        // Catch: getAdminClient()
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "getAdminClient"
        ) {
          context.report({ node, messageId: "adminClient" });
        }
      },

      // Catch string literals containing SUPABASE_SERVICE_ROLE_KEY
      Literal(node) {
        if (
          typeof node.value === "string" &&
          node.value.includes("SUPABASE_SERVICE_ROLE_KEY")
        ) {
          context.report({ node, messageId: "serviceRoleKey" });
        }
      },

      // Catch template literals containing SUPABASE_SERVICE_ROLE_KEY
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          if (quasi.value.raw.includes("SUPABASE_SERVICE_ROLE_KEY")) {
            context.report({ node, messageId: "serviceRoleKey" });
          }
        }
      },
    };
  },
};

module.exports = { rules: { "no-unsafe-db-writes": noUnsafeDbWrites } };
