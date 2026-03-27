import { HomeHero } from "@/components/home-hero";
import { getAllProjects, getBrandAssets } from "@/lib/projects";
import type { ProjectImage } from "@/lib/projects";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "THUANGARCHITECT",
  description:
    "A curated portfolio of residential and commercial architecture shaped by minimal forms, crafted materials, and controlled light.",
  path: "/"
});

export default function HomePage() {
  const brandAssets = getBrandAssets();
  const projects = getAllProjects();
  const homepageProjects = projects.filter((project) => project.slug !== "brastagi");
  const lexingtonProject = homepageProjects.find((project) => project.slug === "lexington") ?? homepageProjects[0] ?? null;
  const lexingtonLeadImage = lexingtonProject?.images[7] ?? lexingtonProject?.cover ?? null;

  const slides = homepageProjects
    .map((project) => project.cover)
    .filter((slide) => slide.sources.w1920 !== lexingtonLeadImage?.sources.w1920)
    .slice(0, 10);

  const heroSlides = [lexingtonLeadImage, ...slides].filter(
    (slide): slide is ProjectImage => Boolean(slide)
  );

  const mobilePortraitSlides = homepageProjects
    .flatMap((project) => project.images)
    .filter((image) => image.orientation === "portrait")
    .slice(0, 10)
    .map((image) => image.sources.w1920);

  if (!lexingtonProject || heroSlides.length === 0) {
    return (
      <div className="page-main">
        <p>No project images are available yet.</p>
      </div>
    );
  }

  return (
    <div className="page-main hero-main">
      <HomeHero
        slides={heroSlides}
        mobilePortraitSlides={mobilePortraitSlides}
        featuredName={lexingtonProject.name}
        featuredHref={`/portfolio/${lexingtonProject.category}/${lexingtonProject.slug}/`}
        homeLogo={brandAssets.homeLogoB}
      />
    </div>
  );
}
