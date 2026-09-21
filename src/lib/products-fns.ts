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
  };
}

export const getAllProductsAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    
    // Verify admin role via admin_users table
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    
    await seedProductsIfEmpty();
    const rows = await sql<any>`SELECT * FROM products ORDER BY name ASC`;
    return rows.map(mapDbProduct);
  });

export const getProductsPublic = createServerFn({ method: "GET" })
  .handler(async () => {
    await seedProductsIfEmpty();
    const sql = await getSql();
    const rows = await sql<any>`SELECT * FROM products ORDER BY name ASC`;
    return rows.map(mapDbProduct);
  });

export const getFeaturedProducts = createServerFn({ method: "GET" })
  .handler(async () => {
    await seedProductsIfEmpty();
    const sql = await getSql();
    const rows = await sql<any>`SELECT * FROM products WHERE featured = true ORDER BY name ASC`;
    return rows.map(mapDbProduct);
  });

export const getRelatedProducts = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    await seedProductsIfEmpty();
    const sql = await getSql();
    const currentRows = await sql<any>`SELECT category FROM products WHERE slug = ${slug}`;
    if (currentRows.length === 0) {
      const rows = await sql<any>`SELECT * FROM products ORDER BY name ASC LIMIT 4`;
      return rows.map(mapDbProduct);
    }
    const current = currentRows[0];
    const sameCategory = await sql<any>`SELECT * FROM products WHERE slug != ${slug} AND category = ${current.category} LIMIT 4`;
    const rest = await sql<any>`SELECT * FROM products WHERE slug != ${slug} AND category != ${current.category} LIMIT 4`;
    return [...sameCategory, ...rest].slice(0, 4).map(mapDbProduct);
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    await seedProductsIfEmpty();
    const sql = await getSql();
    const rows = await sql<any>`SELECT * FROM products WHERE slug = ${slug}`;
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
    await sql`
      UPDATE products SET
        name = ${data.name},
        price = ${data.price},
        image = ${data.image},
        category = ${data.category},
        blurb = ${data.blurb},
        description = ${data.description},
        colors = ${JSON.stringify(data.colors)},
        size = ${data.size},
        material = ${data.material},
        print_time = ${data.printTime},
        featured = ${data.featured ?? false},
        badge = ${data.badge ?? null},
        includes = ${data.includes},
        care = ${data.care},
        in_stock = ${data.inStock ?? true},
        stock_count = ${data.stockCount ?? -1},
        sizes = ${JSON.stringify(data.sizes ?? [])}
      WHERE slug = ${data.slug}
    `;
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
  });

export const createProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: Product) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    await sql`
      INSERT INTO products (
        slug, name, price, image, category, blurb, description, 
        colors, size, material, print_time, featured, badge, includes, care,
        in_stock, stock_count, sizes
      ) VALUES (
        ${data.slug}, ${data.name}, ${data.price}, ${data.image}, 
        ${data.category}, ${data.blurb}, ${data.description}, 
        ${JSON.stringify(data.colors)}, ${data.size}, ${data.material}, 
        ${data.printTime}, ${data.featured ?? false}, ${data.badge ?? null}, 
        ${data.includes}, ${data.care},
        ${data.inStock ?? true}, ${data.stockCount ?? -1}, ${JSON.stringify(data.sizes ?? [])}
      )
    `;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((slug: string) => slug)
  .handler(async ({ data: slug, context }) => {
    const sql = await getSql();
    
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");
    
    await sql`DELETE FROM products WHERE slug = ${slug}`;
  });
