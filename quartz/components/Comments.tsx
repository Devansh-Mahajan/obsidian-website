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

  // Get initial theme for Giscus script
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      return document.documentElement.getAttribute('saved-theme') || 'light';
    }
    return 'light'; // fallback for SSR
  }

  // Comprehensive theme sync script
  const themeSyncScript = `
    (function () {
      function getQuartzTheme() {
        // Check multiple sources for theme
        var savedTheme = document.documentElement.getAttribute('saved-theme');
        if (savedTheme) return savedTheme;
        
        // Fallback to class-based detection
        if (document.documentElement.classList.contains('dark')) return 'dark';
        if (document.documentElement.classList.contains('light')) return 'light';
        
        // Final fallback
        return 'light';
      }
      
      function setGiscusTheme(theme) {
        console.log('Setting Giscus theme to:', theme);
        
        // Method 1: Update the script element's data-theme attribute BEFORE Giscus loads
        var giscusScript = document.querySelector('script[src*="giscus.app/client.js"]');
        if (giscusScript) {
          giscusScript.setAttribute('data-theme', theme);
          console.log('Updated script data-theme to:', theme);
        }
        
        // Method 2: Send postMessage to iframe (for after Giscus loads)
        var iframe = document.querySelector('iframe.giscus-frame');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            giscus: { setConfig: { theme: theme } }
          }, 'https://giscus.app');
          console.log('Sent postMessage to Giscus iframe:', theme);
        }
        
        // Method 3: Update container attribute
        var container = document.querySelector('.giscus');
        if (container) {
          container.setAttribute('data-theme', theme);
        }
      }
      
      function syncTheme() {
        var theme = getQuartzTheme();
        setGiscusTheme(theme);
        return theme;
      }
      
      // Listen for Quartz's themechange event
      document.addEventListener('themechange', function(e) {
        console.log('Quartz themechange event:', e.detail.theme);
        setGiscusTheme(e.detail.theme);
      });
      
      // Listen for class changes on html element
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'class' || mutation.attributeName === 'saved-theme')) {
            setTimeout(syncTheme, 10);
          }
        });
      });
      observer.observe(document.documentElement, { 
        attributes: true, 
        attributeFilter: ['class', 'saved-theme'] 
      });
      
      // Immediate sync on page load
      var currentTheme = syncTheme();
      console.log('Initial theme sync completed:', currentTheme);
      
      // Aggressive sync until Giscus loads
      var tries = 0;
      var maxTries = 200; // Increased tries
      var timer = setInterval(function() {
        tries++;
        syncTheme();
        
        var iframe = document.querySelector('iframe.giscus-frame');
        if (iframe || tries > maxTries) {
          clearInterval(timer);
          console.log('Giscus sync completed after', tries, 'tries');
          // Final sync after Giscus is confirmed loaded
          setTimeout(function() {
            syncTheme();
            console.log('Final theme sync completed');
          }, 200);
        }
      }, 20); // Even faster - every 20ms
      
      // Additional sync triggers
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
          setTimeout(syncTheme, 50);
        }
      });
      
      // Sync on window focus
      window.addEventListener('focus', function() {
        setTimeout(syncTheme, 50);
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
        data-theme={getInitialTheme()}
        data-lang="en"
        data-loading="lazy"
        crossOrigin="anonymous"
        async
      ></script>
    </section>
  )
}

export default Comments