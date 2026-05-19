import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { getServiceClient, getAnonClient } from "./supabase-client.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize sample data on startup
async function initializeData() {
  const admins = await kv.get("admins");
  if (!admins || (Array.isArray(admins) && admins.length === 0)) {
    await kv.set("admins", [
      { email: "owner@vibehub.com", role: "owner", name: "VibeWorks Owner" },
      { email: "modexl@admin.com", role: "merch_admin", category: "Mode XL", name: "Mode XL Admin" },
      { email: "kalt@admin.com", role: "merch_admin", category: "KALT", name: "KALT Admin" }
    ]);
  }

  const merchGroups = await kv.get("merch_groups");
  if (!merchGroups) {
    await kv.set("merch_groups", [
      {
        id: "modexl",
        name: "Mode XL",
        description: "Turkish Rap Group",
        image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
        banner: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200"
      },
      {
        id: "kalt",
        name: "KALT",
        description: "Turkish Podcast Celebrities",
        image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500",
        banner: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200"
      }
    ]);
  }

  const activitiesModeXL = await kv.get("activities:modexl");
  if (!activitiesModeXL) {
    await kv.set("activities:modexl", [
      { id: "mx1", type: "concert", title: "İstanbul Konseri 2026", date: "2026-06-15", venue: "Volkswagen Arena", description: "Mode XL'in 2026 yaz turnesinin İstanbul ayağı" },
      { id: "mx2", type: "album", title: "Yeni Albüm: Sokak Şarkıları", date: "2026-05-01", description: "Mode XL'in çok beklenen yeni albümü yayında" },
      { id: "mx3", type: "concert", title: "Ankara Konseri 2026", date: "2026-07-20", venue: "ODTÜ Vişnelik", description: "Ankara'da dev konser" }
    ]);
  }

  const activitiesKALT = await kv.get("activities:kalt");
  if (!activitiesKALT) {
    await kv.set("activities:kalt", [
      { id: "k1", type: "podcast", title: "KALT #250 Özel Bölüm", date: "2026-05-15", description: "250. bölüm özel konuklar ile" },
      { id: "k2", type: "event", title: "KALT Meet & Greet İstanbul", date: "2026-06-10", venue: "Zorlu PSM", description: "Hayranlarla buluşma etkinliği" },
      { id: "k3", type: "podcast", title: "KALT Canlı Podcast Kaydı", date: "2026-07-05", venue: "Bostancı Gösteri Merkezi", description: "İlk canlı podcast kaydı etkinliği" }
    ]);
  }

  const products = await kv.get("products");
  if (!products || !Array.isArray(products) || products.length === 0 || !products.some(p => p.status === "approved")) {
    // Sample products for Mode XL and KALT (all approved)
    const sampleProducts = [
      {
        id: "1",
        name: "Mode XL Classic Logo Hoodie",
        category: "Mode XL",
        price: 399,
        image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500",
        description: "Premium quality hoodie with Mode XL logo",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "2",
        name: "Mode XL Album T-Shirt",
        category: "Mode XL",
        price: 199,
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500",
        description: "Official Mode XL album merchandise",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "3",
        name: "KALT Podcast Mug",
        category: "KALT",
        price: 89,
        image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500",
        description: "Start your day with KALT vibes",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "4",
        name: "KALT Premium Cap",
        category: "KALT",
        price: 149,
        image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500",
        description: "Stylish cap with embroidered KALT logo",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "5",
        name: "Mode XL Limited Edition Vinyl",
        category: "Mode XL",
        price: 599,
        image: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500",
        description: "Collector's edition vinyl record",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "6",
        name: "KALT Tote Bag",
        category: "KALT",
        price: 129,
        image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500",
        description: "Eco-friendly tote with KALT branding",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "7",
        name: "Mode XL Snapback",
        category: "Mode XL",
        price: 179,
        image: "https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=500",
        description: "Street style snapback with embroidered logo",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "8",
        name: "Mode XL Bomber Jacket",
        category: "Mode XL",
        price: 899,
        image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500",
        description: "Limited edition bomber jacket",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "9",
        name: "Mode XL Poster Set",
        category: "Mode XL",
        price: 149,
        image: "https://images.unsplash.com/photo-1611171711912-e0be7cebb6e7?w=500",
        description: "3-piece poster collection",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "10",
        name: "KALT Water Bottle",
        category: "KALT",
        price: 119,
        image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500",
        description: "Insulated stainless steel water bottle",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "11",
        name: "KALT Phone Case",
        category: "KALT",
        price: 99,
        image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=500",
        description: "Premium phone case with KALT branding",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "12",
        name: "KALT Notebook Set",
        category: "KALT",
        price: 79,
        image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500",
        description: "Premium notebook collection",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "13",
        name: "KALT Hoodie",
        category: "KALT",
        price: 379,
        image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500",
        description: "Comfortable hoodie with podcast logo",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "14",
        name: "KALT Sticker Pack",
        category: "KALT",
        price: 49,
        image: "https://images.unsplash.com/photo-1611171711912-e0be7cebb6e7?w=500",
        description: "Collection of 10 premium stickers",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "15",
        name: "Mode XL Track Pants",
        category: "Mode XL",
        price: 349,
        image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=500",
        description: "Comfortable track pants with Mode XL branding",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "16",
        name: "Mode XL Baseball Jersey",
        category: "Mode XL",
        price: 449,
        image: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=500",
        description: "Limited edition baseball jersey",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "17",
        name: "Mode XL Beanie",
        category: "Mode XL",
        price: 129,
        image: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500",
        description: "Warm beanie with embroidered logo",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "18",
        name: "Mode XL Crossbody Bag",
        category: "Mode XL",
        price: 299,
        image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500",
        description: "Stylish crossbody bag for essentials",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "19",
        name: "Mode XL Socks (3-Pack)",
        category: "Mode XL",
        price: 79,
        image: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=500",
        description: "Premium cotton socks, 3-pack",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "20",
        name: "Mode XL Keychain",
        category: "Mode XL",
        price: 39,
        image: "https://images.unsplash.com/photo-1624823183493-ed5832f48f18?w=500",
        description: "Metal keychain with Mode XL logo",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "21",
        name: "Mode XL Backpack",
        category: "Mode XL",
        price: 599,
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500",
        description: "Durable backpack with laptop compartment",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "22",
        name: "Mode XL Bandana",
        category: "Mode XL",
        price: 69,
        image: "https://images.unsplash.com/photo-1611171711912-e0be7cebb6e7?w=500",
        description: "Classic bandana with Mode XL print",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "23",
        name: "KALT Long Sleeve Tee",
        category: "KALT",
        price: 249,
        image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=500",
        description: "Comfortable long sleeve with KALT logo",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "24",
        name: "KALT Zip-Up Jacket",
        category: "KALT",
        price: 499,
        image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500",
        description: "Premium zip-up jacket with embroidery",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "25",
        name: "KALT Snapback",
        category: "KALT",
        price: 169,
        image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500",
        description: "Adjustable snapback with KALT branding",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "26",
        name: "KALT Enamel Pin Set",
        category: "KALT",
        price: 59,
        image: "https://images.unsplash.com/photo-1611171711912-e0be7cebb6e7?w=500",
        description: "Collectible enamel pin set (5 pins)",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "27",
        name: "KALT Poster (24x36)",
        category: "KALT",
        price: 99,
        image: "https://images.unsplash.com/photo-1611171711912-e0be7cebb6e7?w=500",
        description: "High-quality poster print",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "28",
        name: "KALT Laptop Sleeve",
        category: "KALT",
        price: 189,
        image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500",
        description: "Protective laptop sleeve (13-15 inch)",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "29",
        name: "KALT PopSocket",
        category: "KALT",
        price: 49,
        image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=500",
        description: "Phone grip with KALT design",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "30",
        name: "KALT Drawstring Bag",
        category: "KALT",
        price: 89,
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500",
        description: "Lightweight drawstring backpack",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "31",
        name: "Mode XL Face Mask",
        category: "Mode XL",
        price: 45,
        image: "https://images.unsplash.com/photo-1584573602125-6b9f51ce88b2?w=500",
        description: "Reusable face mask with logo",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "32",
        name: "Mode XL Wristband",
        category: "Mode XL",
        price: 29,
        image: "https://images.unsplash.com/photo-1611171711912-e0be7cebb6e7?w=500",
        description: "Silicone wristband",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "33",
        name: "KALT Beanie",
        category: "KALT",
        price: 119,
        image: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=500",
        description: "Knit beanie with KALT patch",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "34",
        name: "KALT Blanket",
        category: "KALT",
        price: 399,
        image: "https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=500",
        description: "Cozy fleece blanket with KALT design",
        status: "approved",
        createdAt: new Date().toISOString()
      },
      {
        id: "35",
        name: "Mode XL Towel",
        category: "Mode XL",
        price: 149,
        image: "https://images.unsplash.com/photo-1615870123253-cea1e4d88f51?w=500",
        description: "Premium beach towel",
        status: "approved",
        createdAt: new Date().toISOString()
      }
    ];
    await kv.set("products", sampleProducts);

    // Sample activities for artists
    const modeXLActivities = [
      {
        id: "mx1",
        type: "concert",
        title: "İstanbul Konseri 2026",
        date: "2026-06-15",
        venue: "Volkswagen Arena",
        description: "Mode XL'in 2026 yaz turnesinin İstanbul ayağı"
      },
      {
        id: "mx2",
        type: "album",
        title: "Yeni Albüm: Sokak Şarkıları",
        date: "2026-05-01",
        description: "Mode XL'in çok beklenen yeni albümü yayında"
      },
      {
        id: "mx3",
        type: "concert",
        title: "Ankara Konseri 2026",
        date: "2026-07-20",
        venue: "MEB Şura Salonu",
        description: "Ankara'da dev konser"
      }
    ];
    await kv.set("activities:modexl", modeXLActivities);

    const kaltActivities = [
      {
        id: "k1",
        type: "podcast",
        title: "KALT #250 Özel Bölüm",
        date: "2026-05-15",
        description: "250. bölüm özel konuklar ile"
      },
      {
        id: "k2",
        type: "event",
        title: "KALT Meet & Greet İstanbul",
        date: "2026-06-10",
        venue: "Zorlu PSM",
        description: "Hayranlarla buluşma etkinliği"
      },
      {
        id: "k3",
        type: "podcast",
        title: "KALT Canlı Podcast Kaydı",
        date: "2026-07-05",
        venue: "Bostancı Gösteri Merkezi",
        description: "İlk canlı podcast kaydı etkinliği"
      }
    ];
    await kv.set("activities:kalt", kaltActivities);

    // Initialize admin users (owner and merch admins)
    const admins = await kv.get("admins");
    if (!admins) {
      await kv.set("admins", [
        {
          email: "owner@vibehub.com",
          role: "owner",
          name: "VibeWorks Owner"
        },
        {
          email: "modexl@admin.com",
          role: "merch_admin",
          category: "Mode XL",
          name: "Mode XL Admin"
        },
        {
          email: "kalt@admin.com",
          role: "merch_admin",
          category: "KALT",
          name: "KALT Admin"
        }
      ]);
    }

    // Initialize merch groups list
    const merchGroups = await kv.get("merch_groups");
    if (!merchGroups) {
      await kv.set("merch_groups", [
        {
          id: "modexl",
          name: "Mode XL",
          description: "Turkish Rap Group",
          image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
          banner: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200"
        },
        {
          id: "kalt",
          name: "KALT",
          description: "Turkish Podcast Celebrities",
          image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=500",
          banner: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200"
        }
      ]);
    }
  }
}

await initializeData().catch(err => console.error("Error initializing data: ", err));

// Seed data endpoint
app.get("/make-server-8ae6f8e5/seed-products", async (c) => {
  const sampleProducts = [
    { id: "1", name: "Mode XL Classic Logo Hoodie", category: "Mode XL", price: 399, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500", description: "Premium quality hoodie with Mode XL logo", status: "approved", createdAt: new Date().toISOString() },
    { id: "2", name: "Mode XL Album T-Shirt", category: "Mode XL", price: 199, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500", description: "Official Mode XL album merchandise", status: "approved", createdAt: new Date().toISOString() },
    { id: "3", name: "KALT Podcast Mug", category: "KALT", price: 89, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500", description: "Start your day with KALT vibes", status: "approved", createdAt: new Date().toISOString() },
    { id: "4", name: "KALT Premium Cap", category: "KALT", price: 149, image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500", description: "Stylish cap with embroidered KALT logo", status: "approved", createdAt: new Date().toISOString() },
    { id: "5", name: "Mode XL Limited Edition Vinyl", category: "Mode XL", price: 599, image: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500", description: "Collector's edition vinyl record", status: "approved", createdAt: new Date().toISOString() },
    { id: "6", name: "KALT Tote Bag", category: "KALT", price: 129, image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500", description: "Eco-friendly tote with KALT branding", status: "approved", createdAt: new Date().toISOString() }
  ];
  await kv.set("products", sampleProducts);
  return c.json({ success: true, count: sampleProducts.length });
});

// Health check endpoint
app.get("/make-server-8ae6f8e5/health", (c) => {
  return c.json({ status: "ok" });
});

// Seed data endpoint
app.post("/make-server-8ae6f8e5/seed-products", async (c) => {
  try {
    const sampleProducts = [
      { id: "1", name: "Mode XL Classic Logo Hoodie", category: "Mode XL", price: 399, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500", description: "Premium quality hoodie with Mode XL logo", status: "approved", createdAt: new Date().toISOString() },
      { id: "2", name: "Mode XL Album T-Shirt", category: "Mode XL", price: 199, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500", description: "Official Mode XL album merchandise", status: "approved", createdAt: new Date().toISOString() },
      { id: "3", name: "KALT Podcast Mug", category: "KALT", price: 89, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500", description: "Start your day with KALT vibes", status: "approved", createdAt: new Date().toISOString() },
      { id: "4", name: "KALT Premium Cap", category: "KALT", price: 149, image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500", description: "Stylish cap with embroidered KALT logo", status: "approved", createdAt: new Date().toISOString() },
      { id: "5", name: "Mode XL Limited Edition Vinyl", category: "Mode XL", price: 599, image: "https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=500", description: "Collector's edition vinyl record", status: "approved", createdAt: new Date().toISOString() },
      { id: "6", name: "KALT Tote Bag", category: "KALT", price: 129, image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500", description: "Eco-friendly tote with KALT branding", status: "approved", createdAt: new Date().toISOString() },
      { id: "7", name: "Mode XL Snapback", category: "Mode XL", price: 179, image: "https://images.unsplash.com/photo-1575428652377-a2d80e2277fc?w=500", description: "Street style snapback with embroidered logo", status: "approved", createdAt: new Date().toISOString() },
      { id: "8", name: "Mode XL Bomber Jacket", category: "Mode XL", price: 899, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500", description: "Limited edition bomber jacket", status: "approved", createdAt: new Date().toISOString() }
    ];
    await kv.set("products", sampleProducts);
    return c.json({ success: true, count: sampleProducts.length });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// Auth routes
app.post("/make-server-8ae6f8e5/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    const supabase = getServiceClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error for ${email}: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Unexpected error during signup: ${error}`);
    return c.json({ error: "Signup failed" }, 500);
  }
});

app.post("/make-server-8ae6f8e5/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const supabase = getAnonClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`Login error for ${email}: ${error.message}`);
      return c.json({ error: error.message }, 401);
    }

    return c.json({
      access_token: data.session?.access_token,
      user: data.user
    });
  } catch (error) {
    console.log(`Unexpected error during login: ${error}`);
    return c.json({ error: "Login failed" }, 500);
  }
});

// Get current user session
app.get("/make-server-8ae6f8e5/auth/me", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "No token provided" }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log(`Auth verification error: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({ user });
  } catch (error) {
    console.log(`Unexpected error during auth verification: ${error}`);
    return c.json({ error: "Authentication failed" }, 500);
  }
});

// Product routes
app.get("/make-server-8ae6f8e5/products", async (c) => {
  try {
    const category = c.req.query('category');
    let allProducts = await kv.get("products") || [];
    if (!Array.isArray(allProducts)) {
      if (allProducts.products && Array.isArray(allProducts.products)) {
        allProducts = allProducts.products;
      } else if (allProducts.data && Array.isArray(allProducts.data)) {
        allProducts = allProducts.data;
      } else {
        allProducts = [];
      }
    }
    
    // Only return approved products for public API
    const products = allProducts.filter((p: any) => p.status === 'approved');

    if (category) {
      const filtered = products.filter((p: any) => p.category === category);
      return c.json({ products: filtered });
    }

    return c.json({ products });
  } catch (error) {
    console.log(`Error fetching products: ${error}`);
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

app.get("/make-server-8ae6f8e5/products/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const products = await kv.get("products") || [];
    const product = products.find((p: any) => p.id === id);

    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json({ product });
  } catch (error) {
    console.log(`Error fetching product: ${error}`);
    return c.json({ error: "Failed to fetch product" }, 500);
  }
});

// Cart routes (requires auth)
app.get("/make-server-8ae6f8e5/cart", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      console.log(`Cart access - unauthorized: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const cart = await kv.get(`cart:${user.id}`) || [];
    return c.json({ cart });
  } catch (error) {
    console.log(`Error fetching cart: ${error}`);
    return c.json({ error: "Failed to fetch cart" }, 500);
  }
});

app.post("/make-server-8ae6f8e5/cart", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      console.log(`Add to cart - unauthorized: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { productId, quantity = 1 } = await c.req.json();
    const cart = await kv.get(`cart:${user.id}`) || [];

    const existingItem = cart.find((item: any) => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ productId, quantity });
    }

    await kv.set(`cart:${user.id}`, cart);
    return c.json({ cart });
  } catch (error) {
    console.log(`Error adding to cart: ${error}`);
    return c.json({ error: "Failed to add to cart" }, 500);
  }
});

app.put("/make-server-8ae6f8e5/cart/:productId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      console.log(`Update cart - unauthorized: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const productId = c.req.param('productId');
    const { quantity } = await c.req.json();
    const cart = await kv.get(`cart:${user.id}`) || [];

    const item = cart.find((item: any) => item.productId === productId);
    if (item) {
      if (quantity <= 0) {
        const filtered = cart.filter((item: any) => item.productId !== productId);
        await kv.set(`cart:${user.id}`, filtered);
        return c.json({ cart: filtered });
      }
      item.quantity = quantity;
      await kv.set(`cart:${user.id}`, cart);
    }

    return c.json({ cart });
  } catch (error) {
    console.log(`Error updating cart: ${error}`);
    return c.json({ error: "Failed to update cart" }, 500);
  }
});

app.delete("/make-server-8ae6f8e5/cart/:productId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      console.log(`Remove from cart - unauthorized: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const productId = c.req.param('productId');
    const cart = await kv.get(`cart:${user.id}`) || [];
    const filtered = cart.filter((item: any) => item.productId !== productId);

    await kv.set(`cart:${user.id}`, filtered);
    return c.json({ cart: filtered });
  } catch (error) {
    console.log(`Error removing from cart: ${error}`);
    return c.json({ error: "Failed to remove from cart" }, 500);
  }
});

// Order routes (requires auth)
app.post("/make-server-8ae6f8e5/orders", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      console.log(`Create order - unauthorized: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { items, shippingAddress, total } = await c.req.json();

    const order = {
      id: `order-${Date.now()}`,
      userId: user.id,
      items,
      shippingAddress,
      total,
      status: "processing",
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const userOrders = await kv.get(`orders:${user.id}`) || [];
    userOrders.unshift(order);
    await kv.set(`orders:${user.id}`, userOrders);

    // Clear cart
    await kv.set(`cart:${user.id}`, []);

    return c.json({ order });
  } catch (error) {
    console.log(`Error creating order: ${error}`);
    return c.json({ error: "Failed to create order" }, 500);
  }
});

app.get("/make-server-8ae6f8e5/orders", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      console.log(`Get orders - unauthorized: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orders = await kv.get(`orders:${user.id}`) || [];
    return c.json({ orders });
  } catch (error) {
    console.log(`Error fetching orders: ${error}`);
    return c.json({ error: "Failed to fetch orders" }, 500);
  }
});

app.get("/make-server-8ae6f8e5/orders/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getServiceClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      console.log(`Get order detail - unauthorized: ${error?.message}`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orderId = c.req.param('id');
    const orders = await kv.get(`orders:${user.id}`) || [];
    const order = orders.find((o: any) => o.id === orderId);

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    return c.json({ order });
  } catch (error) {
    console.log(`Error fetching order: ${error}`);
    return c.json({ error: "Failed to fetch order" }, 500);
  }
});

// Activity routes (public)
app.get("/make-server-8ae6f8e5/activities/:artist", async (c) => {
  try {
    const artist = c.req.param('artist');
    const activities = await kv.get(`activities:${artist.toLowerCase()}`) || [];
    return c.json({ activities });
  } catch (error) {
    console.log(`Error fetching activities: ${error}`);
    return c.json({ error: "Failed to fetch activities" }, 500);
  }
});

// Merch groups routes (public)
app.get("/make-server-8ae6f8e5/merch-groups", async (c) => {
  try {
    const groups = await kv.get("merch_groups") || [];
    return c.json({ groups });
  } catch (error) {
    console.log(`Error fetching merch groups: ${error}`);
    return c.json({ error: "Failed to fetch merch groups" }, 500);
  }
});

// Admin routes - Check if user is admin
async function checkAdmin(accessToken: string) {
  const supabase = getServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (!user?.id) {
    return { error: "Unauthorized", admin: null };
  }

  const admins = await kv.get("admins") || [];
  const admin = admins.find((a: any) => a.email === user.email);

  if (!admin) {
    return { error: "Not an admin", admin: null };
  }

  return { error: null, admin };
}

// Get admin info
app.get("/make-server-8ae6f8e5/admin/me", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { error, admin } = await checkAdmin(accessToken);
    if (error) {
      return c.json({ error }, 401);
    }

    return c.json({ admin });
  } catch (error) {
    console.log(`Error fetching admin info: ${error}`);
    return c.json({ error: "Failed to fetch admin info" }, 500);
  }
});

// Add product (merch admin)
app.post("/make-server-8ae6f8e5/admin/products", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { error, admin } = await checkAdmin(accessToken);
    if (error) {
      return c.json({ error }, 401);
    }

    const { name, price, image, description } = await c.req.json();

    const products = await kv.get("products") || [];
    const newProduct = {
      id: `product-${Date.now()}`,
      name,
      category: admin.role === "owner" ? "VibeWorks" : admin.category,
      price: Number(price),
      image,
      description,
      status: admin.role === "owner" ? "approved" : "pending",
      createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    await kv.set("products", products);

    return c.json({ product: newProduct });
  } catch (error) {
    console.log(`Error adding product: ${error}`);
    return c.json({ error: "Failed to add product" }, 500);
  }
});

// Get all products (admin - including pending)
app.get("/make-server-8ae6f8e5/admin/products", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { error, admin } = await checkAdmin(accessToken);
    if (error) {
      return c.json({ error }, 401);
    }

    const products = await kv.get("products") || [];

    // Filter by category for merch admins
    const filteredProducts = admin.role === "owner"
      ? products
      : products.filter((p: any) => p.category === admin.category);

    return c.json({ products: filteredProducts });
  } catch (error) {
    console.log(`Error fetching admin products: ${error}`);
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

// Update product status (owner only)
app.put("/make-server-8ae6f8e5/admin/products/:id/status", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { error, admin } = await checkAdmin(accessToken);
    if (error || admin.role !== "owner") {
      return c.json({ error: "Owner access required" }, 403);
    }

    const productId = c.req.param('id');
    const { status } = await c.req.json();

    const products = await kv.get("products") || [];
    const product = products.find((p: any) => p.id === productId);

    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    product.status = status;
    await kv.set("products", products);

    return c.json({ product });
  } catch (error) {
    console.log(`Error updating product status: ${error}`);
    return c.json({ error: "Failed to update product status" }, 500);
  }
});

// Delete product
app.delete("/make-server-8ae6f8e5/admin/products/:id", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { error, admin } = await checkAdmin(accessToken);
    if (error) {
      return c.json({ error }, 401);
    }

    const productId = c.req.param('id');
    const products = await kv.get("products") || [];
    const product = products.find((p: any) => p.id === productId);

    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    // Check permissions
    if (admin.role !== "owner" && product.category !== admin.category) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const filtered = products.filter((p: any) => p.id !== productId);
    await kv.set("products", filtered);

    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting product: ${error}`);
    return c.json({ error: "Failed to delete product" }, 500);
  }
});

// Get sales analytics
app.get("/make-server-8ae6f8e5/admin/analytics", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { error, admin } = await checkAdmin(accessToken);
    if (error) {
      return c.json({ error }, 401);
    }

    // Get all orders
    const allOrderKeys = await kv.getByPrefix("orders:");
    const allOrders: any[] = [];

    for (const key of allOrderKeys) {
      const orders = await kv.get(key) || [];
      allOrders.push(...orders);
    }

    // Get products for filtering
    const products = await kv.get("products") || [];

    // Filter by category for merch admins
    const filteredOrders = admin.role === "owner"
      ? allOrders
      : allOrders.filter((order: any) =>
          order.items.some((item: any) => {
            const product = products.find((p: any) => p.id === item.productId);
            return product?.category === admin.category;
          })
        );

    // Calculate analytics
    const totalRevenue = filteredOrders.reduce((sum: number, order: any) => {
      if (admin.role === "owner") {
        return sum + order.total;
      }
      // For merch admins, only count revenue from their products
      const merchRevenue = order.items.reduce((itemSum: number, item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        if (product?.category === admin.category) {
          return itemSum + (item.price * item.quantity);
        }
        return itemSum;
      }, 0);
      return sum + merchRevenue;
    }, 0);

    const totalOrders = filteredOrders.length;

    // Product sales count
    const productSales: any = {};
    filteredOrders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.name,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.price * item.quantity;
      });
    });

    const topProducts = Object.entries(productSales)
      .map(([id, data]: [string, any]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return c.json({
      totalRevenue,
      totalOrders,
      topProducts,
      recentOrders: filteredOrders.slice(0, 10)
    });
  } catch (error) {
    console.log(`Error fetching analytics: ${error}`);
    return c.json({ error: "Failed to fetch analytics" }, 500);
  }
});

Deno.serve(app.fetch);