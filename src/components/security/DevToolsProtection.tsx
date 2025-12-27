"use client";

/**
 * DevTools Protection Component
 * Makes it harder for attackers to inspect code via browser dev tools
 * Note: This cannot fully prevent inspection, but makes it significantly harder
 */

import { useEffect } from 'react';

export function DevToolsProtection() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      // Disable right-click context menu
      const disableRightClick = (e: MouseEvent) => {
        if (e.button === 2) {
          e.preventDefault();
          return false;
        }
      };

      // Disable common dev tools keyboard shortcuts
      const disableDevTools = (e: KeyboardEvent) => {
        // F12
        if (e.key === 'F12') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+Shift+I (Chrome/Edge)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+Shift+J (Chrome/Edge Console)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+Shift+C (Chrome/Edge Inspect)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+U (View Source)
        if (e.ctrlKey && e.key === 'u') {
          e.preventDefault();
          return false;
        }
        
        // Ctrl+S (Save Page - can expose source)
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          return false;
        }
      };

      // Detect dev tools opening
      let devToolsOpen = false;
      const detectDevTools = () => {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        
        if (widthThreshold || heightThreshold) {
          if (!devToolsOpen) {
            devToolsOpen = true;
            // Security warning - intentional console usage for dev tools detection
            console.clear();
            console.log('%c⚠️ Security Warning', 'color: red; font-size: 20px; font-weight: bold;');
            console.log('%cUnauthorized access detected. This action has been logged.', 'color: red; font-size: 14px;');
          }
        } else {
          devToolsOpen = false;
        }
      };

      // Add event listeners
      document.addEventListener('contextmenu', disableRightClick);
      document.addEventListener('keydown', disableDevTools);
      
      // Monitor for dev tools
      setInterval(detectDevTools, 500);

      // Clear console periodically (intentional console usage for security)
      const clearConsole = setInterval(() => {
        if (devToolsOpen) {
          console.clear();
        }
      }, 1000);

      // Cleanup
      return () => {
        document.removeEventListener('contextmenu', disableRightClick);
        document.removeEventListener('keydown', disableDevTools);
        clearInterval(clearConsole);
      };
    }
  }, []);

  return null;
}

