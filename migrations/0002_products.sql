CREATE TABLE IF NOT EXISTS "products" (
  "slug" text PRIMARY KEY,
  "name" text NOT NULL,
  "price" integer NOT NULL,
  "image" text NOT NULL,
  "category" text NOT NULL,
  "blurb" text NOT NULL,
  "description" text NOT NULL,
  "colors" jsonb NOT NULL,
  "size" text NOT NULL,
  "material" text NOT NULL,
  "print_time" text NOT NULL,
  "featured" boolean DEFAULT false,
  "badge" text,
  "includes" text NOT NULL,
  "care" text NOT NULL
);
