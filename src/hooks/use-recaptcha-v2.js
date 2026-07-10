/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react';

const RECAPTCHA_SCRIPT_ID = 'recaptcha-v2-script';
let scriptLoadPromise = null;

function loadRecaptchaScript() {
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    // If script already exists and grecaptcha is loaded
    if (document.getElementById(RECAPTCHA_SCRIPT_ID) && window.grecaptcha) {
      resolve();
      return;
    }

    // Set up the callback for when the script loads
    window.onRecaptchaLoaded = () => {
      resolve();
    };

    // Create and append the script
    const script = document.createElement('script');
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded&render=explicit`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

export function useRecaptchaV2(siteKey) {
  const widgetId = useRef(null);
  const containerRef = useRef(null);
  const isRendered = useRef(false);
  const isInitializing = useRef(false);

  const initializeRecaptcha = async () => {
    // Prevent multiple simultaneous initialization attempts
    if (isInitializing.current) return;
    if (!containerRef.current || !siteKey) return;

    isInitializing.current = true;

    try {
      // Reset state
      if (widgetId.current !== null) {
        const grecaptcha = window.grecaptcha;
        if (grecaptcha) {
          try {
            grecaptcha.reset(widgetId.current);
          } catch (error) {
            console.error('Error resetting reCAPTCHA:', error);
          }
        }
        widgetId.current = null;
        isRendered.current = false;
      }

      // Load the script and wait for it to be ready
      await loadRecaptchaScript();

      // Additional check to ensure grecaptcha is available
      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) {
        throw new Error('reCAPTCHA failed to load');
      }

      // Wait for grecaptcha to be fully ready
      await new Promise((resolve) => {
        grecaptcha.ready(() => resolve());
      });

      // Render the widget
      if (containerRef.current && !isRendered.current) {
        widgetId.current = grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          size: 'normal',
          theme: 'light',
        });
        isRendered.current = true;
      }
    } catch (error) {
      console.error('Error initializing reCAPTCHA:', error);
    } finally {
      isInitializing.current = false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    if (containerRef.current) {
      initializeRecaptcha();
    }

    return () => {
      isMounted = false;
      if (widgetId.current !== null) {
        const grecaptcha = window.grecaptcha;
        if (grecaptcha) {
          try {
            grecaptcha.reset(widgetId.current);
          } catch (error) {
            console.error('Error resetting reCAPTCHA:', error);
          }
        }
        widgetId.current = null;
        isRendered.current = false;
      }
    };
  }, [siteKey]);

  const getToken = () => {
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha || widgetId.current === null) {
      throw new Error('reCAPTCHA not initialized');
    }
    return grecaptcha.getResponse(widgetId.current);
  };

  const resetCaptcha = () => {
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha || widgetId.current === null) return;

    try {
      grecaptcha.reset(widgetId.current);
      widgetId.current = null;
      isRendered.current = false;
    } catch (error) {
      console.error('Error resetting reCAPTCHA:', error);
    }
  };

  return {
    containerRef,
    getToken,
    resetCaptcha,
    initializeRecaptcha,
  };
}
