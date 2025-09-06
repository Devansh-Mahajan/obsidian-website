import React from "react"
import { QuartzComponent, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const Comments: QuartzComponent = ({ displayClass, fileData }: QuartzComponentProps) => {
  // Allow per-page opt-out via frontmatter:
  const disableComment: boolean =
    typeof fileData.frontmatter?.comments !== "undefined" &&
    (!fileData.frontmatter?.comments || fileData.frontmatter?.comments === "false")

  if (disableComment) {
    return <></>
  }

  return (
    <section class={classNames(displayClass, "giscus")}>
      {/* Simple, reliable theme sync */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            // Simple theme detection that matches Quartz's logic
            function getQuartzTheme() {
              return document.documentElement.getAttribute('saved-theme') || 'light';
            }
            
            // Simple theme sync function
            function syncGiscusTheme() {
              var theme = getQuartzTheme();
              var iframe = document.querySelector('iframe.giscus-frame');
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                  giscus: { setConfig: { theme: theme } }
                }, 'https://giscus.app');
              }
            }
            
            // Listen for Quartz's theme changes
            document.addEventListener('themechange', function(e) {
              setTimeout(syncGiscusTheme, 100);
            });
            
            // Sync when Giscus loads
            var checkGiscus = setInterval(function() {
              if (document.querySelector('iframe.giscus-frame')) {
                clearInterval(checkGiscus);
                syncGiscusTheme();
              }
            }, 100);
            
            // Clean up after 10 seconds
            setTimeout(function() {
              clearInterval(checkGiscus);
            }, 10000);
          })();
        `
      }} />
      
      {/* Giscus client - always starts with light theme, syncs after load */}
      <script
        src="https://giscus.app/client.js"
        data-repo="Devansh-Mahajan/Obsidian-Website"
        data-repo-id="R_kgDOPqqdPQ"
        data-category="General"
        data-category-id="DIC_kwDOPqqdPc4CvEYH"
        data-mapping="pathname"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="bottom"
        data-theme="light"
        data-lang="en"
        data-loading="lazy"
        crossOrigin="anonymous"
        async
      ></script>
    </section>
  )
}

export default Comments