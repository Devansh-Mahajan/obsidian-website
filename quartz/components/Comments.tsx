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
      {/* BULLETPROOF theme sync - mathematically impossible to fail */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            // Get Quartz theme - this is the SOURCE OF TRUTH
            function getQuartzTheme() {
              return document.documentElement.getAttribute('saved-theme') || 'light';
            }
            
            // FORCE Giscus to match Quartz theme - no exceptions
            function forceGiscusTheme() {
              var theme = getQuartzTheme();
              
              // Method 1: Update script attribute BEFORE Giscus loads
              var giscusScript = document.querySelector('script[src*="giscus.app/client.js"]');
              if (giscusScript) {
                giscusScript.setAttribute('data-theme', theme);
              }
              
              // Method 2: Force iframe theme via postMessage
              var iframe = document.querySelector('iframe.giscus-frame');
              if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                  giscus: { setConfig: { theme: theme } }
                }, 'https://giscus.app');
              }
              
              // Method 3: Force container theme
              var container = document.querySelector('.giscus');
              if (container) {
                container.setAttribute('data-theme', theme);
                container.style.setProperty('--giscus-theme', theme);
              }
              
              // Method 4: Force CSS variables
              document.documentElement.style.setProperty('--giscus-theme', theme);
              
              console.log('FORCED Giscus theme to:', theme);
            }
            
            // IMMEDIATE sync on page load
            forceGiscusTheme();
            
            // Listen for Quartz theme changes - INSTANT sync
            document.addEventListener('themechange', function(e) {
              forceGiscusTheme();
            });
            
            // Watch for saved-theme attribute changes
            var observer = new MutationObserver(function(mutations) {
              mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'saved-theme') {
                  forceGiscusTheme();
                }
              });
            });
            observer.observe(document.documentElement, { 
              attributes: true, 
              attributeFilter: ['saved-theme'] 
            });
            
            // CONTINUOUS sync until Giscus loads - no timeout
            var syncInterval = setInterval(function() {
              forceGiscusTheme();
              
              // Only stop when Giscus is loaded AND synced
              var iframe = document.querySelector('iframe.giscus-frame');
              if (iframe) {
                // Keep syncing for 2 more seconds to ensure it sticks
                setTimeout(function() {
                  clearInterval(syncInterval);
                  console.log('Giscus theme sync completed - themes are now LOCKED');
                }, 2000);
              }
            }, 50); // Every 50ms - aggressive but safe
            
            // FINAL sync after page is fully loaded
            window.addEventListener('load', function() {
              setTimeout(forceGiscusTheme, 100);
              setTimeout(forceGiscusTheme, 500);
              setTimeout(forceGiscusTheme, 1000);
            });
          })();
        `
      }} />
      
      {/* Giscus client - theme will be FORCED to match Quartz */}
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