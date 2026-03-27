import generatedSiteConfig from "@/generated/site-config.json";

const defaultSiteConfig = {
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

export const SITE_CONFIG = {
  ...defaultSiteConfig,
  ...(generatedSiteConfig as Partial<typeof defaultSiteConfig>)
};

export const NAV_LINKS = [
  { label: "Portfolio", href: "/portfolio/" },
  { label: "About", href: "/about/" },
  { label: "Contact", href: "/contact/" },
] as const;

export const ABOUT_CONTENT = {
  intro:
    "Thuang Architect develops architecture with restrained forms, balanced light, and precise detailing. Every project is approached as a timeless environment, shaped by proportion rather than trend.",
  services: [
    "Architecture and Interior Design",
    "Spatial Planning and Concept Development",
    "Detailing and Material Direction",
    "Site Supervision and Construction Coordination",
  ],
  construction:
    "From schematic direction to technical drawing packages, we align structure, materiality, and buildability so the final space matches the initial architectural intent.",
  softFurnishings:
    "Furniture, art, and decorative layers are curated to preserve visual calm while enhancing comfort and atmosphere throughout each project.",
};
