import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4.0 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Devansh Mahajan - Digital Garden",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "devanshmahajan-quartz.pages.dev",
    ignorePatterns: [
      "private",
      "templates",
      "Blog",
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/.obsidian/**",
      "quartz-temp/**",
    ],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Geist Sans",
        body: "Geist Sans",
        code: "JetBrains Mono",
      },
      colors: {
        lightMode: {
          light: "#f8fafc",
          gray: "#64748b",
          dark: "#0f172a",
          secondary: "#3b82f6",
          tertiary: "#1d4ed8",
          highlight: "rgba(59, 130, 246, 0.15)",
        },
        darkMode: {
          light: "#0f172a",
          gray: "#94a3b8",
          dark: "#f1f5f9",
          secondary: "#818cf8",
          tertiary: "#4f46e5",
          highlight: "rgba(129, 140, 248, 0.15)",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
