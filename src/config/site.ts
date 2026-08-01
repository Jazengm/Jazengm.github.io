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

export type ResearchTheme = {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  publicationIds: string[];
  symbol: "orbit" | "lattice" | "wave";
};

export type TeachingCourse = {
  code: string;
  title: string;
  term: string;
  year: number;
  current: boolean;
  description: string;
  links: { label: string; href: string }[];
};

export const navigation: NavigationItem[] = [
  { label: "Home", href: "/", description: "Profile and selected paths." },
  {
    label: "Publications",
    href: "/publications",
    description: "Papers, preprints, and supporting material.",
  },
  {
    label: "Research",
    href: "/research",
    description: "Themes, questions, and connections between projects.",
  },
  // Teaching remains routable but is intentionally hidden from primary navigation
  // until the placeholder course records below are replaced and verified.
  // {
  //   label: "Teaching",
  //   href: "/teaching",
  //   description: "Current and past courses, notes, and assignments.",
  // },
  {
    label: "Notes",
    href: "/notes",
    description: "Expository writing and working notes.",
  },
  {
    label: "Experiments",
    href: "/experiments",
    description: "Small interactive mathematical programs.",
  },
  {
    label: "About",
    href: "/about",
    description: "Biography, education, and contact details.",
  },
];

export const site = {
  /** Keep true until every bracketed value below has been replaced and verified. */
  isPlaceholder: true,
  name: "Xiangru Zeng",
  pageTitle: "Xiangru Zeng · Mathematics",
  tagline: null as string | null,
  biography: [
    /*
    "[Replace this paragraph with a concise introduction to your research, mathematical perspective, and current questions.]",
    "[Replace this paragraph with a short account of your collaborations, methods, or broader academic interests.]",
    "[Optionally replace this paragraph with current projects, availability, or a note for students and visitors.]",*/
  ],
  currentPosition: "PhD Student",
  institution: "UC Berkeley",
  location: "Berkeley",
  researchAreas: [
    "Algebraic Geometry",
    /* "[Research area two]",
    "[Research area three]",*/
  ],
  email: null as string | null,
  github: null as string | null,
  orcid: null as string | null,
  googleScholar: null as string | null,
  cvUrl: null as string | null,
  avatar: null as string | null,
  authorNameMatches: ["[Your Name]"],
  defaultLanguage: "en",
  accentColor: "#3f6f6b",
  canonicalUrl: "https://jazengm.github.io",
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

export const researchThemes: ResearchTheme[] = [
  {
    id: "geometry-structures",
    title: "[Geometric structures]",
    summary:
      "[Replace with a short description of a research direction and the questions that organize it.]",
    keywords: ["geometry", "moduli", "curvature"],
    publicationIds: ["placeholder-curvature-moduli", "toric-tensor-generation"],
    symbol: "orbit",
  },
  {
    id: "discrete-continuous",
    title: "[Discrete and continuous methods]",
    summary:
      "[Replace with a concise account of how combinatorial and analytic viewpoints interact in your work.]",
    keywords: ["combinatorics", "dynamics", "optimization"],
    publicationIds: [
      "placeholder-combinatorial-shadows",
      "toric-tensor-generation",
    ],
    symbol: "lattice",
  },
  {
    id: "mathematical-computation",
    title: "[Mathematical computation]",
    summary:
      "[Replace with the role of computation, visualization, formal methods, or software in your research.]",
    keywords: ["computation", "visualization", "experiments"],
    publicationIds: [],
    symbol: "wave",
  },
];

export const teachingCourses: TeachingCourse[] = [
  {
    code: "[COURSE 000]",
    title: "[Current course title]",
    term: "[Term]",
    year: 2026,
    current: true,
    description: "[Replace with a short course description and audience.]",
    links: [{ label: "Sample note", href: "/notes/sample-math-note/" }],
  },
  {
    code: "[COURSE 101]",
    title: "[Past course title]",
    term: "[Term]",
    year: 2025,
    current: false,
    description:
      "[Replace with a short summary of the course and archived material.]",
    links: [],
  },
  {
    code: "[COURSE 202]",
    title: "[Past topics course]",
    term: "[Term]",
    year: 2024,
    current: false,
    description: "[Replace with the topic, level, and relevant resources.]",
    links: [
      { label: "Interactive note", href: "/notes/interactive-parameters/" },
    ],
  },
];
