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

  // Direct theme sync script that runs immediately
  const themeSyncScript = `
    (function () {
      function getQuartzTheme() {
        return document.documentElement.getAttribute('saved-theme') || 'light';
      }
      
      function setGiscusTheme(theme) {
        // Method 1: Update the script element's data-theme attribute
        var giscusScript = document.querySelector('script[src*="giscus.app/client.js"]');
        if (giscusScript) {
          giscusScript.setAttribute('data-theme', theme);
        }
        
        // Method 2: Send postMessage to iframe
        var iframe = document.querySelector('iframe.giscus-frame');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            giscus: { setConfig: { theme: theme } }
          }, 'https://giscus.app');
          console.log('Giscus theme synced to:', theme);
        }
      }
      
      function syncTheme() {
        var theme = getQuartzTheme();
        setGiscusTheme(theme);
      }
      
      // Listen for Quartz's themechange event
      document.addEventListener('themechange', function(e) {
        console.log('Quartz theme changed to:', e.detail.theme);
        setGiscusTheme(e.detail.theme);
      });
      
      // Immediate sync on page load
      var currentTheme = getQuartzTheme();
      console.log('Initial Quartz theme:', currentTheme);
      
      // Try to sync immediately and then repeatedly until Giscus loads
      var tries = 0;
      var timer = setInterval(function() {
        tries++;
        syncTheme();
        
        if (document.querySelector('iframe.giscus-frame') || tries > 100) {
          clearInterval(timer);
          // One final sync after Giscus is confirmed loaded
          setTimeout(syncTheme, 100);
        }
      }, 25); // Even faster checking - every 25ms
      
      // Also try to sync when the page becomes visible (in case of slow loading)
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
          setTimeout(syncTheme, 25);
        }
      });
    })();
  `

  return (
    <section class={classNames(displayClass, "giscus")}>
      {/* Immediate theme sync script */}
      <script dangerouslySetInnerHTML={{ __html: themeSyncScript }} />
      
      {/* Giscus client */}
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
        data-theme="preferred_color_scheme"
        data-lang="en"
        data-loading="lazy"
        crossOrigin="anonymous"
        async
      ></script>
    </section>
  )
}

export default Comments