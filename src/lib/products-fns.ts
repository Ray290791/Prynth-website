import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { products as staticProducts, type Product } from "./products";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";

/**
 * Ensures that the products table is seeded with the initial static products
 * if it is empty. This is necessary because PGLite is in-memory and resets,
 * or for the very first time running on Neon.
 */
async function seedProductsIfEmpty() {
  const sql = await getSql();
  
  // Ensure product_variants table exists in case the migration wasn't picked up by Vite glob caching
  await sql.query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id serial PRIMARY KEY,
      product_slug text NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
      size text,
      color text,
      price numeric NOT NULL,
      stock_count integer DEFAULT -1,
      UNIQUE(product_slug, size, color)
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS cart_sessions (
      id text PRIMARY KEY,
      user_id text REFERENCES "user"(id) ON DELETE CASCADE,
      email text,
      items jsonb NOT NULL DEFAULT '[]'::jsonb,
      updated_at timestamp NOT NULL DEFAULT now(),
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id serial PRIMARY KEY,
      product_slug text NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment text,
      created_at timestamp NOT NULL DEFAULT now(),
      UNIQUE(product_slug, user_id)
    )
  `);

  const [{ count }] = await sql<{ count: number }>`SELECT count(*) FROM products`;
  
  if (Number(count) === 0) {
    console.log("Products table is empty, seeding from static products...");
    for (const product of staticProducts) {
      await sql`
        INSERT INTO products (
          slug, name, price, image, category, blurb, description, 
          colors, size, material, print_time, featured, badge, includes, care,
          in_stock, stock_count, sizes
        ) VALUES (
          ${product.slug}, ${product.name}, ${product.price}, ${product.image}, 
          ${product.category}, ${product.blurb}, ${product.description}, 
          ${JSON.stringify(product.colors)}, ${product.size}, ${product.material}, 
          ${product.printTime}, ${product.featured ?? false}, ${product.badge ?? null}, 
          ${product.includes}, ${product.care},
          ${product.inStock ?? true}, ${product.stockCount ?? -1}, ${JSON.stringify(product.sizes ?? [])}
        )
      `;
      
      const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : [null];
      const colors = product.colors && product.colors.length > 0 ? product.colors : [null];
      
      for (const size of sizes) {
        for (const color of colors) {
          await sql`
            INSERT INTO product_variants (product_slug, size, color, price, stock_count)
            VALUES (${product.slug}, ${size}, ${color}, ${product.price}, ${product.stockCount ?? -1})
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }
  }
}

// Maps the DB row (snake_case) to the Product type (camelCase)
function mapDbProduct(row: any): Product {
  return {
    slug: row.slug,
    name: row.name,
    price: row.price,
    image: row.image,
    category: row.category,
    blurb: row.blurb,
    description: row.description,
    colors: typeof row.colors === "string" ? JSON.parse(row.colors) : row.colors,
    size: row.size,
    material: row.material,
    printTime: row.print_time,
    featured: row.featured,
    badge: row.badge,
    includes: row.includes,
    care: row.care,
    inStock: row.in_stock,
    stockCount: row.stock_count,
    sizes: typeof row.sizes === "string" ? JSON.parse(row.sizes) : row.sizes,
    gallery: typeof row.gallery === "string" ? JSON.parse(row.gallery) : (row.gallery || []),
    categories: typeof row.categories === "string" ? JSON.parse(row.categories) : (row.categories || []),
    materials: typeof row.materials === "string" ? JSON.parse(row.materials) : (row.materials || []),
    variants: row.variants ? (typeof row.variants === "string" ? JSON.parse(row.variants) : row.variants) : [],
  };
}

const SELECT_PRODUCTS_WITH_VARIANTS = `
  SELECT p.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id', v.id,
          'productSlug', v.product_slug,
          'size', v.size,
          'color', v.color,
          'price', v.price,
          'stockCount', v.stock_count
        )
      ) FILTER (WHERE v.id IS NOT NULL),
      '[]'
    ) AS variants
  FROM products p
  LEFT JOIN product_variants v ON p.slug = v.product_slug
`;

async function ensureCategoryExists(newCategories: string[], sql: any) {
  if (!newCategories || newCategories.length === 0) return;
  const rows = await sql<{ key: string; value: string }>`SELECT key, value FROM site_settings WHERE key = 'product_categories'`;
  let currentStr = rows.length > 0 ? rows[0].value : "Desk, Home, Bath";
  const existingCategories = currentStr.split(",").map((s: string) => s.trim().toLowerCase());
  
  let added = false;
  for (const category of newCategories) {
    if (!category) continue;
    if (!existingCategories.includes(category.toLowerCase())) {
      const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
      currentStr += `, ${formattedCategory}`;
      existingCategories.push(category.toLowerCase());
      added = true;
    }
  }

  if (added) {
    if (rows.length > 0) {
      await sql`UPDATE site_settings SET value = ${currentStr} WHERE key = 'product_categories'`;
    } else {
      await sql`INSERT INTO site_settings (key, value) VALUES ('product_categories', ${currentStr})`;
    }
  }
}

export const getAllProductsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    
    // Verify admin role via admin_users table
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    
    await seedProductsIfEmpty();
    const rows = await sql.query<any>(`${SELECT_PRODUCTS_WITH_VARIANTS} GROUP BY p.slug ORDER BY p.name ASC`);
    return rows.map(mapDbProduct);
  });

export const getProductsPublic = createServerFn({ method: "GET" })
  .handler(async () => {
    await seedProductsIfEmpty();
    const sql = await getSql();
    const rows = await sql.query<any>(`${SELECT_PRODUCTS_WITH_VARIANTS} GROUP BY p.slug ORDER BY p.name ASC`);
    return rows.map(mapDbProduct);
  });

export const getFeaturedProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    await seedProductsIfEmpty();
    const sql = await getSql();
    const rows = await sql.query<any>(`${SELECT_PRODUCTS_WITH_VARIANTS} WHERE p.featured = true GROUP BY p.slug ORDER BY p.name ASC`);
    return rows.map(mapDbProduct);
  });

export const getRelatedProducts = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    await seedProductsIfEmpty();
    const sql = await getSql();
    const currentRows = await sql<any>`SELECT category FROM products WHERE slug = ${slug}`;
    if (currentRows.length === 0) {
      const rows = await sql.query<any>(`${SELECT_PRODUCTS_WITH_VARIANTS} GROUP BY p.slug ORDER BY p.name ASC LIMIT 4`);
      return rows.map(mapDbProduct);
    }
    const current = currentRows[0];
    const sameCategory = await sql.query<any>(`${SELECT_PRODUCTS_WITH_VARIANTS} WHERE p.slug != $1 AND p.category = $2 GROUP BY p.slug LIMIT 4`, [slug, current.category]);
    const rest = await sql.query<any>(`${SELECT_PRODUCTS_WITH_VARIANTS} WHERE p.slug != $1 AND p.category != $2 GROUP BY p.slug LIMIT 4`, [slug, current.category]);
    return [...sameCategory, ...rest].slice(0, 4).map(mapDbProduct);
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    await seedProductsIfEmpty();
    const sql = await getSql();
    const rows = await sql.query<any>(`${SELECT_PRODUCTS_WITH_VARIANTS} WHERE p.slug = $1 GROUP BY p.slug`, [slug]);
    if (rows.length === 0) return null;
    return mapDbProduct(rows[0]);
  });

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: Product) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await ensureCategoryExists(data.categories && data.categories.length > 0 ? data.categories : (data.category ? [data.category] : []), sql);

    await sql`
      UPDATE products SET
        name = ${data.name},
        price = ${data.price},
        image = ${data.image},
        gallery = ${JSON.stringify(data.gallery ?? [])},
        category = ${data.category ?? data.categories?.[0] ?? ""},
        categories = ${JSON.stringify(data.categories ?? [])},
        blurb = ${data.blurb},
        description = ${data.description},
        colors = ${JSON.stringify(data.colors)},
        size = ${data.size ?? data.sizes?.[0] ?? ""},
        sizes = ${JSON.stringify(data.sizes ?? [])},
        material = ${data.material ?? data.materials?.[0] ?? ""},
        materials = ${JSON.stringify(data.materials ?? [])},
        print_time = ${data.printTime},
        featured = ${data.featured ?? false},
        badge = ${data.badge ?? null},
        includes = ${data.includes},
        care = ${data.care},
        in_stock = ${data.inStock ?? true},
        stock_count = ${data.stockCount ?? -1}
      WHERE slug = ${data.slug}
    `;
    return { success: true };
  });

export const updateProductInventory = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { slug: string; stockCount: number }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    await sql`
      UPDATE products SET
        stock_count = ${data.stockCount},
        in_stock = ${data.stockCount > 0 || data.stockCount === -1}
      WHERE slug = ${data.slug}
    `;
    return { success: true };
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: Product) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await ensureCategoryExists(data.categories && data.categories.length > 0 ? data.categories : (data.category ? [data.category] : []), sql);

    await sql`
      INSERT INTO products (
        slug, name, price, image, gallery, category, categories, blurb, description, 
        colors, size, sizes, material, materials, print_time, featured, badge, includes, care,
        in_stock, stock_count
      ) VALUES (
        ${data.slug}, ${data.name}, ${data.price}, ${data.image}, ${JSON.stringify(data.gallery ?? [])},
        ${data.category ?? data.categories?.[0] ?? ""}, ${JSON.stringify(data.categories ?? [])}, ${data.blurb}, ${data.description}, 
        ${JSON.stringify(data.colors)}, ${data.size ?? data.sizes?.[0] ?? ""}, ${JSON.stringify(data.sizes ?? [])}, ${data.material ?? data.materials?.[0] ?? ""}, ${JSON.stringify(data.materials ?? [])}, 
        ${data.printTime}, ${data.featured ?? false}, ${data.badge ?? null}, 
        ${data.includes}, ${data.care},
        ${data.inStock ?? true}, ${data.stockCount ?? -1}
      )
    `;
    return { success: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((slug: string) => slug)
  .handler(async ({ data: slug, context }) => {
    const sql = await getSql();
    
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    
    await sql`DELETE FROM products WHERE slug = ${slug}`;
    return { success: true };
  });

export const getProductReviews = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const sql = await getSql();
    const rows = await sql`
      SELECT r.*, u.name as user_name, u.image as user_image
      FROM product_reviews r
      JOIN "user" u ON r.user_id = u.id
      WHERE r.product_slug = ${slug}
      ORDER BY r.created_at DESC
    `;
    return rows as any[];
  });

export const createReview = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { product_slug: string; rating: number; comment?: string }) => {
    const slug = data.product_slug?.trim();
    if (!slug) throw new Error("Product slug is required.");
    const rating = Math.min(5, Math.max(1, Math.round(Number(data.rating) || 5)));
    const comment = data.comment ? data.comment.trim().slice(0, 1000) : null;
    return { product_slug: slug, rating, comment };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    // Upsert review (1 per user per product)
    await sql`
      INSERT INTO product_reviews (product_slug, user_id, rating, comment, created_at)
      VALUES (${data.product_slug}, ${context.userId}, ${data.rating}, ${data.comment || null}, now())
      ON CONFLICT (product_slug, user_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        comment = EXCLUDED.comment,
        created_at = now()
    `;
    
    return { success: true };
  });
