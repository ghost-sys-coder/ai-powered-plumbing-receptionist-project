import { integer, text, boolean, pgTable } from "drizzle-orm/pg-core";

// sample schema for a todo table -- change it to suit the needs of our app
export const todo = pgTable("todo", {
  id: integer("id").primaryKey(),
  text: text("text").notNull(),
  done: boolean("done").default(false).notNull(),
});
