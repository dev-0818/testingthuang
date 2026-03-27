import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const IMAGES_ROOT = path.join(ROOT, "Images");
const PUBLIC_ROOT = path.join(ROOT, "public");
const OUTPUT_IMAGES_ROOT = path.join(PUBLIC_ROOT, "images");
const OUTPUT_LOGOS_ROOT = path.join(PUBLIC_ROOT, "logos");
const OUTPUT_FAVICON_PATH = path.join(PUBLIC_ROOT, "favicon.png");
const GENERATED_ROOT = path.join(ROOT, "src", "generated");
const MANIFEST_PATH = path.join(GENERATED_ROOT, "projects-manifest.json");
const SITE_CONFIG_PATH = path.join(GENERATED_ROOT, "site-config.json");

const LOGO_FILES = {
  navDefault: "bgwhitenew.png",
  navInnerDefault: "Logo Export-27.png",
  navHover: "Logo Export-26.png",
  homeLogoA: "Logo Export-28.png",
  homeLogoB: "Logo Export-29.png",
  homeLogoC: "Logo Export-30.png"
};
const FAVICON_FILE = "Logo Export-35.png";

const DEFAULT_SITE_CONFIG = {
  name: "Thuang Architect",
  shortName: "Thuang",
  description:
    "Thuang Architect is a minimalist architecture studio focused on high-end residential and commercial spaces with quiet luxury character.",
  siteUrl: "https://www.thuangarchitect.com",
  instagramUrl: "https://instagram.com/thuangarchitect",
  contactEmail: "thuangarchitect@gmail.com",
  whatsappNumber: "+62 853-5982-0664",
  whatsappUrl: "https://wa.me/6285359820664"
};

const CATEGORY_LABELS = {
  komersial: "Komersial",
  residential: "Residential"
};

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const parseJsonFile = async (filePath, fallback) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const buildWhatsAppUrl = (input) => {
  const normalized = String(input ?? "").replace(/[^\d+]/g, "");
  const digitsOnly = normalized.replace(/\D/g, "");

  if (!digitsOnly) {
    return DEFAULT_SITE_CONFIG.whatsappUrl;
  }

  const phone = digitsOnly.startsWith("62")
    ? digitsOnly
    : digitsOnly.startsWith("0")
      ? `62${digitsOnly.slice(1)}`
      : digitsOnly.startsWith("8")
        ? `62${digitsOnly}`
        : digitsOnly;

  return `https://api.whatsapp.com/send/?phone=${phone}&text&type=phone_number&app_absent=0`;
};

const getPublicSiteUrl = () => {
  return process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_CONFIG.siteUrl;
};

const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url,
    serviceRoleKey
  };
};

const fetchSupabaseJson = async (supabase, pathname, searchParams) => {
  const url = new URL(pathname, supabase.url);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url, {
    headers: {
      apikey: supabase.serviceRoleKey,
      Authorization: `Bearer ${supabase.serviceRoleKey}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  return response.json();
};

const parseWebpDimensions = (buffer) => {
  if (
    buffer.length < 12 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const chunkEnd = dataOffset + chunkSize;

    if (chunkEnd > buffer.length) {
      return null;
    }

    if (chunkType === "VP8X" && chunkSize >= 10) {
      const width = 1 + buffer.readUIntLE(dataOffset + 4, 3);
      const height = 1 + buffer.readUIntLE(dataOffset + 7, 3);
      return { width, height };
    }

    if (chunkType === "VP8 " && chunkSize >= 10) {
      const startCodeMatches =
        buffer[dataOffset + 3] === 0x9d &&
        buffer[dataOffset + 4] === 0x01 &&
        buffer[dataOffset + 5] === 0x2a;

      if (startCodeMatches) {
        const width = buffer.readUInt16LE(dataOffset + 6) & 0x3fff;
        const height = buffer.readUInt16LE(dataOffset + 8) & 0x3fff;
        return { width, height };
      }
    }

    if (chunkType === "VP8L" && chunkSize >= 5 && buffer[dataOffset] === 0x2f) {
      const byte1 = buffer[dataOffset + 1];
      const byte2 = buffer[dataOffset + 2];
      const byte3 = buffer[dataOffset + 3];
      const byte4 = buffer[dataOffset + 4];
      const width = 1 + (((byte2 & 0x3f) << 8) | byte1);
      const height = 1 + (((byte4 & 0x0f) << 10) | (byte3 << 2) | ((byte2 & 0xc0) >> 6));
      return { width, height };
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  return null;
};

const dimensionCache = new Map();

const readWebpDimensionsFromUrl = async (imageUrl) => {
  if (!imageUrl) {
    return null;
  }

  if (dimensionCache.has(imageUrl)) {
    return dimensionCache.get(imageUrl);
  }

  try {
    const response = await fetch(imageUrl, { cache: "force-cache" });
    if (!response.ok) {
      dimensionCache.set(imageUrl, null);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const dimensions = parseWebpDimensions(Buffer.from(arrayBuffer));
    dimensionCache.set(imageUrl, dimensions);
    return dimensions;
  } catch {
    dimensionCache.set(imageUrl, null);
    return null;
  }
};

const prepareLogos = async () => {
  const logoSourceRoot = path.join(IMAGES_ROOT, "logo png");
  await ensureDir(OUTPUT_LOGOS_ROOT);
  await ensureDir(OUTPUT_IMAGES_ROOT);

  const manifestLogos = {};

  for (const [key, sourceFile] of Object.entries(LOGO_FILES)) {
    const sourcePath = path.join(logoSourceRoot, sourceFile);
    const targetFile = `${key}.png`;
    const targetPath = path.join(OUTPUT_LOGOS_ROOT, targetFile);
    await fs.copyFile(sourcePath, targetPath);
    manifestLogos[key] = `/logos/${targetFile}`;
  }

  const faviconSourcePath = path.join(logoSourceRoot, FAVICON_FILE);
  await fs.copyFile(faviconSourcePath, OUTPUT_FAVICON_PATH);

  try {
    const aboutImageSource = path.join(logoSourceRoot, "aboutimg3.jpeg");
    const aboutImageTarget = path.join(OUTPUT_IMAGES_ROOT, "aboutimg3.jpeg");
    await fs.copyFile(aboutImageSource, aboutImageTarget);
  } catch (error) {
    console.warn("Could not copy about image:", error.message);
  }

  return manifestLogos;
};

const normalizeProjectImage = async (projectName, image, index) => {
  const dimensions = await readWebpDimensionsFromUrl(image.image_url);
  const orientation =
    dimensions && dimensions.height > dimensions.width ? "portrait" : "landscape";
  const alt = image.alt_text || `${projectName} architectural image ${index + 1}`;

  return {
    id: image.id,
    alt,
    orientation,
    sources: {
      w600: image.image_url,
      w1200: image.image_url,
      w1920: image.image_url
    }
  };
};

const prepareProjectsFromSupabase = async (supabase) => {
  const projects = await fetchSupabaseJson(supabase, "/rest/v1/projects", {
    select:
      "id,title,slug,category,description,cover_image_url,sort_order,updated_at,project_images(id,image_url,alt_text,sort_order)",
    is_published: "eq.true",
    order: "category.asc,sort_order.asc"
  });

  return Promise.all(
    (projects ?? []).map(async (project) => {
      const orderedImages = [...(project.project_images ?? [])].sort(
        (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)
      );
      const images = await Promise.all(
        orderedImages.map((image, index) => normalizeProjectImage(project.title, image, index))
      );
      const cover =
        images.find((image) => image.sources.w1920 === project.cover_image_url) ?? images[0] ?? null;

      if (!cover) {
        return null;
      }

      return {
        category: project.category,
        categoryLabel: CATEGORY_LABELS[project.category] ?? project.category,
        name: project.title,
        slug: project.slug,
        description: project.description || `${project.title} architecture project.`,
        cover,
        images
      };
    })
  ).then((result) => result.filter(Boolean));
};

const prepareSiteConfigFromSupabase = async (supabase) => {
  const rows = await fetchSupabaseJson(supabase, "/rest/v1/site_settings", {
    select: "site_title,tagline,bio,email,phone,instagram_url,whatsapp_url",
    id: "eq.1",
    limit: "1"
  });

  const settings = rows?.[0];
  if (!settings) {
    return {
      ...DEFAULT_SITE_CONFIG,
      siteUrl: getPublicSiteUrl()
    };
  }

  return {
    name: settings.site_title || DEFAULT_SITE_CONFIG.name,
    shortName: DEFAULT_SITE_CONFIG.shortName,
    description: settings.tagline || DEFAULT_SITE_CONFIG.description,
    siteUrl: getPublicSiteUrl(),
    instagramUrl: settings.instagram_url || DEFAULT_SITE_CONFIG.instagramUrl,
    contactEmail: settings.email || DEFAULT_SITE_CONFIG.contactEmail,
    whatsappNumber: settings.phone || DEFAULT_SITE_CONFIG.whatsappNumber,
    whatsappUrl: settings.whatsapp_url || buildWhatsAppUrl(settings.phone)
  };
};

const main = async () => {
  await ensureDir(GENERATED_ROOT);

  const [logos, existingManifest] = await Promise.all([
    prepareLogos(),
    parseJsonFile(MANIFEST_PATH, { generatedAt: null, logos: {}, projects: [] })
  ]);

  const supabase = getSupabaseConfig();
  let projects = existingManifest.projects ?? [];
  let siteConfig = {
    ...DEFAULT_SITE_CONFIG,
    siteUrl: getPublicSiteUrl()
  };

  if (supabase) {
    console.log("Fetching portfolio data from Supabase...");
    const [supabaseProjects, supabaseSiteConfig] = await Promise.all([
      prepareProjectsFromSupabase(supabase),
      prepareSiteConfigFromSupabase(supabase)
    ]);

    if (supabaseProjects.length > 0) {
      projects = supabaseProjects;
    }

    siteConfig = supabaseSiteConfig;
  } else {
    console.log("Supabase env not found. Reusing existing generated portfolio data.");
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    logos,
    projects
  };

  await Promise.all([
    fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8"),
    fs.writeFile(SITE_CONFIG_PATH, JSON.stringify(siteConfig, null, 2) + "\n", "utf8")
  ]);

  console.log(`Prepared ${projects.length} published projects.`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
