export type NavigationItem = {
  label: string;
  href: string;
  description: string;
};

export type TimelineItem = {
  period: string;
  role: string;
  institution: string;
  detail?: string | null;
};

export const navigation: NavigationItem[] = [
  {
    label: "Home",
    href: "/",
    description: "Profile and selected papers.",
  },
  {
    label: "Articles",
    href: "/publications",
    description: "Papers, preprints, and supporting material.",
  },
  {
    label: "Experiments",
    href: "/experiments",
    description: "Small interactive mathematical programs.",
  },
  {
    label: "Illustrations",
    href: "/illustrations",
    description: "Mathematical images and visual studies.",
  },
  {
    label: "Seminars",
    href: "/seminars",
    description: "Seminar programs, descriptions, and materials.",
  },
  {
    label: "About",
    href: "/about",
    description: "Biography, education, and contact details.",
  },
];

export const site = {
  name: "Xiangru Zeng",
  pageTitle: "Xiangru Zeng · Mathematics",
  tagline: null as string | null,
  biography: [],
  currentPosition: "PhD Student",
  institution: "UC Berkeley",
  location: "Berkeley",
  researchAreas: ["Algebraic Geometry"],
  email: "xiangru_zeng@berkeley.edu" as string | null,
  github: null as string | null,
  orcid: null as string | null,
  googleScholar: null as string | null,
  cvUrl: null as string | null,
  avatar: null as string | null,
  authorNameMatches: [] as string[],
  defaultLanguage: "en",
  canonicalUrl: "https://jazengm.github.io",
  analytics: {
    enabled: true,
    scriptUrl: "https://cloud.umami.is/script.js",
    websiteId: "c5b8e416-771a-4bd9-a935-daaf9b9a24ff",
  },
  navigation,
  education: [
    {
      period: "2020-2024",
      role: "B.S. in Mathematics",
      institution: "University of Sciences and Technology of China (USTC)",
      detail: null,
    },
  ] satisfies TimelineItem[],
} as const;
