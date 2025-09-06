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

  // Get initial theme for Giscus script - more robust for production
  const getInitialTheme = () => {
    // For SSR/build time, we can't access document, so use a safe default
    // The JavaScript will handle the actual theme detection at runtime
    return 'light'; // This will be overridden by the sync script
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
      
      // Force update the script element immediately
      var giscusScript = document.querySelector('script[src*="giscus.app/client.js"]');
      if (giscusScript) {
        giscusScript.setAttribute('data-theme', currentTheme);
        console.log('Forced script data-theme to:', currentTheme);
      }
      
      // Aggressive sync until Giscus loads
      var tries = 0;
      var maxTries = 300; // Even more tries for production
      var timer = setInterval(function() {
        tries++;
        syncTheme();
        
        // Also force update the script element on each try
        var script = document.querySelector('script[src*="giscus.app/client.js"]');
        if (script) {
          script.setAttribute('data-theme', getQuartzTheme());
        }
        
        var iframe = document.querySelector('iframe.giscus-frame');
        if (iframe || tries > maxTries) {
          clearInterval(timer);
          console.log('Giscus sync completed after', tries, 'tries');
          // Final sync after Giscus is confirmed loaded
          setTimeout(function() {
            syncTheme();
            console.log('Final theme sync completed');
          }, 500); // Longer delay for production
        }
      }, 15); // Even faster - every 15ms
      
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
      
      {/* Giscus client with dynamic theme loading */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              // Get the current theme immediately
              function getCurrentTheme() {
                var savedTheme = document.documentElement.getAttribute('saved-theme');
                if (savedTheme) return savedTheme;
                if (document.documentElement.classList.contains('dark')) return 'dark';
                if (document.documentElement.classList.contains('light')) return 'light';
                return 'light';
              }
              
              // Create and configure the Giscus script
              var script = document.createElement('script');
              script.src = 'https://giscus.app/client.js';
              script.setAttribute('data-repo', 'Devansh-Mahajan/Obsidian-Website');
              script.setAttribute('data-repo-id', 'R_kgDOPqqdPQ');
              script.setAttribute('data-category', 'General');
              script.setAttribute('data-category-id', 'DIC_kwDOPqqdPc4CvEYH');
              script.setAttribute('data-mapping', 'pathname');
              script.setAttribute('data-strict', '0');
              script.setAttribute('data-reactions-enabled', '1');
              script.setAttribute('data-emit-metadata', '0');
              script.setAttribute('data-input-position', 'bottom');
              script.setAttribute('data-theme', getCurrentTheme());
              script.setAttribute('data-lang', 'en');
              script.setAttribute('data-loading', 'lazy');
              script.crossOrigin = 'anonymous';
              script.async = true;
              
              // Append to the giscus container
              var container = document.querySelector('.giscus');
              if (container) {
                container.appendChild(script);
                console.log('Giscus script loaded with theme:', getCurrentTheme());
              }
            })();
          `
        }}
      />
    </section>
  )
}

export default Comments