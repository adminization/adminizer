import { Knex } from "knex";

/**
 * Creates all system model tables for Adminizer
 * Tables: userap, groupap, mediamanagerap, mediamanagermetaap, mediamanagerassociationsap,
 *         notificationap, usernotificationap, navigationap, groupapuserap
 */
export async function up(knex: Knex): Promise<void> {
  // Helper to get the correct default timestamp based on database client
  const getDefaultTimestamp = () => {
    const client = knex.client.config.client;
    if (client === 'pg' || client === 'postgresql') {
      return knex.raw('CURRENT_TIMESTAMP');
    } else if (client === 'sqlite3') {
      return knex.raw("(datetime('now'))");
    } else if (client === 'mysql' || client === 'mysql2') {
      return knex.raw('CURRENT_TIMESTAMP');
    }
    return knex.fn.now();
  };

  // Helper to get UUID default based on database client
  const getUuidDefault = () => {
    const client = knex.client.config.client;
    if (client === 'pg' || client === 'postgresql') {
      return knex.raw('gen_random_uuid()');
    } else if (client === 'sqlite3') {
      // SQLite doesn't have native UUID, will need to handle in application
      return undefined;
    }
    return knex.raw('UUID()');
  };

  const defaultTimestamp = getDefaultTimestamp();
  const uuidDefault = getUuidDefault();

  // userap
  await knex.schema.createTable("userap", (table) => {
    table.increments("id").primary().notNullable();
    table.string("login").unique();
    table.string("fullName");
    table.string("email");
    table.string("avatar");
    table.string("passwordHashed");
    table.string("timezone");
    table.string("expires");
    table.string("locale");
    table.boolean("isDeleted");
    table.boolean("isActive");
    table.boolean("isAdministrator");
    table.json("widgets");
    table.boolean("isConfirmed");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
  });

  // groupap
  await knex.schema.createTable("groupap", (table) => {
    table.increments("id").primary().notNullable();
    table.string("name").unique();
    table.string("description");
    table.json("tokens");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
  });

  // mediamanagerap (self-ref via parent)
  await knex.schema.createTable("mediamanagerap", (table) => {
    if (uuidDefault) {
      table.uuid("id").primary().notNullable().defaultTo(uuidDefault);
    } else {
      table.uuid("id").primary().notNullable();
    }
    table.uuid("parent").nullable().references("id").inTable("mediamanagerap");
    table.string("mimeType");
    table.string("path");
    table.integer("size");
    table.string("group");
    table.string("tag");
    table.string("url");
    table.string("filename");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
  });

  // mediamanagermetaap (belongsTo mediamanagerap via parent)
  await knex.schema.createTable("mediamanagermetaap", (table) => {
    if (uuidDefault) {
      table.uuid("id").primary().notNullable().defaultTo(uuidDefault);
    } else {
      table.uuid("id").primary().notNullable();
    }
    table.string("key");
    table.json("value");
    table.boolean("isPublic");
    table.uuid("parent").nullable().references("id").inTable("mediamanagerap");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
  });

  // mediamanagerassociationsap (belongsTo mediamanagerap via file)
  await knex.schema.createTable("mediamanagerassociationsap", (table) => {
    if (uuidDefault) {
      table.uuid("id").primary().notNullable().defaultTo(uuidDefault);
    } else {
      table.uuid("id").primary().notNullable();
    }
    table.string("mediaManagerId");
    table.string("model");
    table.integer("modelId");
    table.string("widgetName");
    table.integer("sortOrder");
    table.uuid("file").nullable().references("id").inTable("mediamanagerap");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
  });

  // notificationap
  await knex.schema.createTable("notificationap", (table) => {
    table.increments("id").primary().notNullable();
    table.string("title");
    table.string("message");
    table.string("notificationClass");
    table.string("channel");
    table.json("metadata");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
  });

  // usernotificationap (FK to notificationap via column notificationIdId)
  await knex.schema.createTable("usernotificationap", (table) => {
    table.increments("id").primary().notNullable();
    table.integer("userId");
    table.integer("notificationIdId").nullable().references("id").inTable("notificationap");
    table.boolean("read");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
  });

  // navigationap
  await knex.schema.createTable("navigationap", (table) => {
    table.increments("id").primary().notNullable();
    table.string("label").unique();
    table.json("tree");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
  });

  // M:N join: GroupAP <-> UserAP via "groupap_users__userap_groups"
  // Historical join table name: {model1}_{collection1}__{model2}_{collection2}
  // GroupAP.users -> UserAP.groups => groupap_users__userap_groups
  // Column naming: {model}_{collection} references the TARGET model
  await knex.schema.createTable("groupap_users__userap_groups", (table) => {
    table.increments("id").primary().notNullable();
    table.integer("groupap_users").notNullable().references("id").inTable("groupap");
    table.integer("userap_groups").notNullable().references("id").inTable("userap");
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("groupap_users__userap_groups");
  await knex.schema.dropTableIfExists("usernotificationap");
  await knex.schema.dropTableIfExists("mediamanagermetaap");
  await knex.schema.dropTableIfExists("mediamanagerassociationsap");
  await knex.schema.dropTableIfExists("mediamanagerap");
  await knex.schema.dropTableIfExists("navigationap");
  await knex.schema.dropTableIfExists("notificationap");
  await knex.schema.dropTableIfExists("groupap");
  await knex.schema.dropTableIfExists("userap");
}
