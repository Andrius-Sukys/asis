(function() {
  'use strict';

  class PatternDetector {
    constructor() {
      this.scriptId = 'asis-' + Math.random().toString(36).substring(2, 11);
      this.isInitialized = false;
      this.isDetectionDisabled = false;
      this.viewingPatternDetails = false;
      this.detectionInProgress = false;
      
      this.lastDetectionTime = 0;
      this.detectionCooldown = 3000;
      
      this.detectedPatterns = {
        redirect: { found: [], count: 0 },
        defaults: { found: [], count: 0 }
      };
      this.elementRegistry = new WeakMap();
      this.elementIds = new Map();
      
      this.currentSettings = {
        mainToggle: true,
        redirectToggle: true,
        defaultsToggle: true
      };
      
      this.mutationObserver = null;
      
      this.init();
    }

    init() {
      if (window.asisDetector) {
        console.warn(`AŠIS [${this.scriptId}]: Another instance already running`);
        return;
      }
      
      window.asisDetector = this;
      console.log(`AŠIS [${this.scriptId}]: Initializing content script`);
      
      this.setupStyles();
      this.setupMessageListener();
      this.loadSettings(() => {
        this.checkIfDisabled(() => {
          if (!this.isDetectionDisabled && this.currentSettings.mainToggle) {
            this.detectAllPatterns();
            this.observeDOMChanges();
          }
          this.registerWithBackground();
        });
      });
      
      this.isInitialized = true;
    }

    setupStyles() {
      const existingStyle = document.getElementById('asis-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      const style = document.createElement('style');
      style.id = 'asis-styles';
      style.textContent = `
        .asis-highlight-overlay {
          position: absolute;
          pointer-events: none;
          z-index: 2147483647;
          background-color: rgba(255, 0, 0, 0.25);
          border: 4px solid #B20000;
          box-shadow: 0 0 15px 5px rgba(255, 0, 0, 0.6);
          border-radius: 6px;
          box-sizing: border-box;
          opacity: 1;
          visibility: visible;
          transition: opacity 0.2s ease, visibility 0.2s ease, border-color 0.5s ease, box-shadow 0.5s ease;
        }
        
        .asis-highlight-overlay.hidden {
          opacity: 0;
          visibility: hidden;
        }
        
        .asis-highlight-overlay.pulsating {
          animation: asis-pulse 1.5s infinite;
        }
        
        @keyframes asis-pulse {
          0% {
            border-color: #B20000;
            box-shadow: 0 0 15px 5px rgba(255, 0, 0, 0.6);
          }
          50% {
            border-color: #FF6666;
            box-shadow: 0 0 20px 6px rgba(255, 0, 0, 0.9);
          }
          100% {
            border-color: #B20000;
            box-shadow: 0 0 15px 5px rgba(255, 0, 0, 0.6);
          }
        }
      `;
      document.head.appendChild(style);
    }

    setupMessageListener() {
      if (chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          return this.handleMessage(request, sender, sendResponse);
        });
      }
    }

    handleMessage(request, sender, sendResponse) {
      console.log(`AŠIS [${this.scriptId}]: Handling message:`, request.action);
      
      const handlers = {
        disableDetection: () => this.handleDisableDetection(),
        enableDetection: () => this.handleEnableDetection(),
        settingsChanged: () => this.handleSettingsChanged(request.settings),
        tabActivated: () => this.handleTabActivated(request),
        detectPatterns: () => this.handleDetectPatterns(request),
        highlightPattern: () => this.handleHighlightPattern(request),
        hideAllHighlights: () => this.handleHideAllHighlights(),
        showAllPatterns: () => this.handleShowAllPatterns(),
        setViewingPatternDetails: () => this.handleSetViewingDetails(request.viewing),
        getPatterns: () => this.handleGetPatterns()
      };

      const handler = handlers[request.action];
      if (handler) {
        const result = handler();
        sendResponse({ success: true, result });
        return true;
      }

      sendResponse({ success: false, error: 'Unknown action' });
      return true;
    }

    handleDisableDetection() {
      this.isDetectionDisabled = true;
      this.clearAllHighlights();
      this.detectionInProgress = false;
      this.viewingPatternDetails = false;
    }

    handleEnableDetection() {
      this.isDetectionDisabled = false;
      if (this.currentSettings.mainToggle) {
        this.detectAllPatterns(true);
      }
    }

    handleSettingsChanged(settings) {
      if (settings) {
        this.currentSettings = settings;
        if (!this.currentSettings.mainToggle) {
          this.clearAllHighlights();
        } else {
          this.detectAllPatterns(true);
        }
      }
    }

    handleTabActivated(request) {
      if (request.siteDisabled) {
        this.isDetectionDisabled = true;
        this.clearAllHighlights();
        return;
      }
      
      this.isDetectionDisabled = false;
      if (this.currentSettings.mainToggle) {
        this.detectAllPatterns(true);
      }
      this.viewingPatternDetails = false;
    }

    handleDetectPatterns(request) {
      if (request.siteDisabled) {
        this.isDetectionDisabled = true;
        this.clearAllHighlights();
        return;
      }
      
      this.isDetectionDisabled = false;
      if (this.currentSettings.mainToggle) {
        this.detectAllPatterns(true);
      }
      this.viewingPatternDetails = false;
    }

    handleHighlightPattern(request) {
      console.log(`ContentScript: Highlighting pattern with elementId ${request.elementId}`);
      
      if (!request.elementId) {
        console.error('ContentScript: No elementId provided');
        return { success: false, error: 'No elementId provided' };
      }
      
      this.viewingPatternDetails = true;
      const success = this.highlightSinglePattern(request.elementId);
      
      return { success, highlighted: success };
    }

    handleHideAllHighlights() {
      this.hideAllHighlights();
    }

    handleShowAllPatterns() {
      this.showAllHighlights();
      this.viewingPatternDetails = false;
    }

    handleSetViewingDetails(viewing) {
      this.viewingPatternDetails = viewing === true;
    }

    handleGetPatterns() {
      return { patterns: this.detectedPatterns };
    }

    highlightSinglePattern(elementId) {
      console.log(`ContentScript: Highlighting single pattern with ID: ${elementId}`);
      
      let found = false;
      document.querySelectorAll('.asis-highlight-overlay').forEach(overlay => {
        overlay.classList.add('hidden');
        overlay.classList.remove('pulsating');
      });

      document.querySelectorAll('.asis-highlight-overlay').forEach(overlay => {
        if (overlay.dataset.elementId === elementId) {
          overlay.classList.remove('hidden');
          overlay.classList.add('pulsating');
          found = true;
          
          const element = Array.from(this.elementIds.entries())
            .find(([_, id]) => id === elementId)?.[0];
          if (element) {
            setTimeout(() => {
              try {
                element.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'center'
                });
                console.log('ContentScript: Scrolled element into view');
              } catch (e) {
                console.error('ContentScript: Error scrolling into view:', e);
              }
            }, 100);
          }
        }
      });
      
      if (!found) {
        console.warn(`ContentScript: No overlay found for elementId ${elementId}`);
      }
      
      console.log(`ContentScript: Highlight single pattern result: ${found}`);
      return found;
    }

    highlightAllPatterns(patterns) {
      let highlightedCount = 0;
      
      const highlightPatternType = (patternList) => {
        patternList.forEach(pattern => {
          if (pattern.element?.isConnected && !this.elementRegistry.has(pattern.element)) {
            if (this.highlightElement(pattern.element)) {
              highlightedCount++;
            }
          }
        });
      };
      
      if (patterns.defaults?.found) {
        highlightPatternType(patterns.defaults.found);
      }
      
      if (patterns.redirect?.found) {
        highlightPatternType(patterns.redirect.found);
      }
      
      console.log(`AŠIS [${this.scriptId}]: Highlighted ${highlightedCount} new patterns`);
    }

    highlightElement(element) {
      if (!element?.isConnected || this.elementRegistry.has(element)) {
        return false;
      }
      
      try {
        const elementId = this.generateUniqueId();
        element.dataset.asisId = elementId;
        this.elementIds.set(element, elementId);
        
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return false;
        }

        const overlayWidth = Math.max(element.clientWidth, 20);
        const overlayHeight = Math.max(element.clientHeight, 20);

        const highlightPadding = 10;

        const overlay = document.createElement('div');
        overlay.className = 'asis-highlight-overlay';
        overlay.dataset.elementId = elementId;
        overlay.style.width = (overlayWidth + highlightPadding * 2) + 'px';
        overlay.style.height = (overlayHeight + highlightPadding * 2) + 'px';

        overlay.style.left = (rect.left + window.scrollX - highlightPadding) + 'px';
        overlay.style.top = (rect.top + window.scrollY - highlightPadding) + 'px';

        let animationFrameId = null;
        const updatePosition = () => {
          if (!element.isConnected) {
            this.removeOverlay(overlay, element);
            cancelAnimationFrame(animationFrameId);
            return;
          }
          
          const newRect = element.getBoundingClientRect();
          if (newRect.width > 0 && newRect.height > 0) {
            const newWidth = Math.max(element.clientWidth, 20);
            const newHeight = Math.max(element.clientHeight, 20);

            overlay.style.width = (newWidth + highlightPadding * 2) + 'px';
            overlay.style.height = (newHeight + highlightPadding * 2) + 'px';
            overlay.style.left = (newRect.left + window.scrollX - highlightPadding) + 'px';
            overlay.style.top = (newRect.top + window.scrollY - highlightPadding) + 'px';
          }
          
          animationFrameId = requestAnimationFrame(updatePosition);
        };

        updatePosition();

        const scrollResizeHandler = () => updatePosition();

        window.addEventListener('scroll', scrollResizeHandler, { passive: true });
        window.addEventListener('resize', scrollResizeHandler, { passive: true });

        overlay.cleanup = () => {
          cancelAnimationFrame(animationFrameId);
          window.removeEventListener('scroll', scrollResizeHandler);
          window.removeEventListener('resize', scrollResizeHandler);
        };
        
        document.body.appendChild(overlay);
        this.elementRegistry.set(element, overlay);
        
        return true;
      } catch (error) {
        console.error(`AŠIS [${this.scriptId}]: Highlight error:`, error);
        return false;
      }
    }

    removeOverlay(overlay, element) {
      if (overlay.cleanup) {
        overlay.cleanup();
      }
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      this.elementRegistry.delete(element);
      this.elementIds.delete(element);
    }

    hideAllHighlights() {
      console.log('ContentScript: Hiding all highlights');
      document.querySelectorAll('.asis-highlight-overlay').forEach(overlay => {
        overlay.classList.add('hidden');
        overlay.classList.remove('pulsating');
      });
    }

    showAllHighlights() {
      console.log('ContentScript: Showing all highlights');
      document.querySelectorAll('.asis-highlight-overlay').forEach(overlay => {
        overlay.classList.remove('hidden');
        overlay.classList.remove('pulsating');
      });
    }

    clearAllHighlights() {
      console.log('ContentScript: Clearing all highlights');
      document.querySelectorAll('.asis-highlight-overlay').forEach(overlay => {
        if (overlay.cleanup) {
          overlay.cleanup();
        }
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      });
      
      this.elementRegistry = new WeakMap();
      this.elementIds.clear();
      
      document.querySelectorAll('[data-asis-id]').forEach(element => {
        delete element.dataset.asisId;
      });
      
      this.detectedPatterns = {
        redirect: { found: [], count: 0 },
        defaults: { found: [], count: 0 }
      };
    }

    generateUniqueId() {
      return 'asis-' + Math.random().toString(36).substring(2, 11);
    }

    loadSettings(callback) {
      if (chrome.storage?.local) {
        chrome.storage.local.get({
          mainToggle: true,
          redirectToggle: true,
          defaultsToggle: true
        }, (settings) => {
          this.currentSettings = settings;
          console.log(`AŠIS [${this.scriptId}]: Loaded settings:`, settings);
          callback?.();
        });
      } else {
        callback?.();
      }
    }

    checkIfDisabled(callback) {
      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'checkIfDisabled',
          url: window.location.href
        }, (response) => {
          this.isDetectionDisabled = response?.isDisabled || false;
          callback?.();
        });
      } else {
        callback?.();
      }
    }

    registerWithBackground() {
      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ action: 'registerContentScript' });
      }
    }

    detectAllPatterns(force = false) {
      if (this.isDetectionDisabled || !this.currentSettings.mainToggle) {
        return;
      }
      
      if (this.viewingPatternDetails && !force) {
        return;
      }

      const now = Date.now();
      if (!force && now - this.lastDetectionTime < this.detectionCooldown) {
        return;
      }

      if (this.detectionInProgress) {
        return;
      }

      this.detectionInProgress = true;
      this.lastDetectionTime = now;
      
      console.log(`AŠIS [${this.scriptId}]: Starting pattern detection`);

      const patterns = {
        redirect: { found: [], count: 0 },
        defaults: { found: [], count: 0 }
      };

      try {
        if (this.currentSettings.defaultsToggle) {
          this.detectHarmfulDefaults(patterns);
        }
        
        if (this.currentSettings.redirectToggle) {
          this.detectShamingPhrases(patterns);
          this.detectPressuredSelling(patterns);
        }

        this.deduplicatePatterns(patterns);
        
        patterns.redirect.count = patterns.redirect.found.length;
        patterns.defaults.count = patterns.defaults.found.length;
        this.detectedPatterns = patterns;

        if (force) {
          this.clearAllHighlights();
        }
        this.highlightAllPatterns(patterns);

        this.sendPatternsToBackground(patterns);

        console.log(`AŠIS [${this.scriptId}]: Detection complete - ${patterns.redirect.count} redirect, ${patterns.defaults.count} defaults`);
      } catch (error) {
        console.error(`AŠIS [${this.scriptId}]: Detection error:`, error);
      } finally {
        this.detectionInProgress = false;
      }
    }

    sendPatternsToBackground(patterns) {
      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'patternResults',
          patterns: {
            redirect: {
              count: patterns.redirect.count,
              details: patterns.redirect.found.map(item => ({
                type: item.type,
                description: item.description,
                elementId: this.elementIds.get(item.element)
              }))
            },
            defaults: {
              count: patterns.defaults.count,
              details: patterns.defaults.found.map(item => ({
                type: item.type,
                description: item.description,
                elementId: this.elementIds.get(item.element)
              }))
            }
          }
        });
      }
    }

    detectHarmfulDefaults(patterns) {
      console.log(`AŠIS [${this.scriptId}]: Detecting harmful defaults`);
      
      const preCheckedBoxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
        .filter(checkbox => checkbox.checked && this.isElementVisible(checkbox));

      preCheckedBoxes.forEach(checkbox => {
        const { element, text } = this.findBestLabelElement(checkbox);
        const highlightElement = element || checkbox.parentElement || checkbox;
        patterns.defaults.found.push({
          type: 'Kenksmingos numatytosios parinktys',
          element: highlightElement,
          description: `Kenksminga numatytoji parinktis${text ? ': "' + text + '"' : ''}`
        });
      });

      const customCheckboxSelectors = [
        '[role="checkbox"][aria-checked="true"]',
        '[class*="checkbox"].checked',
        '[class*="checkbox"].selected'
      ];

      customCheckboxSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(checkbox => {
            if (this.isElementVisible(checkbox)) {
              const { element, text } = this.findBestLabelElement(checkbox);
              const highlightElement = element || checkbox.parentElement || checkbox;
              patterns.defaults.found.push({
                type: 'Kenksmingos numatytosios parinktys',
                element: highlightElement,
                description: `Kenksminga numatytoji parinktis${text ? ': "' + text + '"' : ''}`
              });
            }
          });
        } catch (e) {
          console.error(`AŠIS [${this.scriptId}]: Error with selector ${selector}:`, e);
        }
      });

      this.detectHarmfulRadioGroups(patterns);
    }

    detectHarmfulRadioGroups(patterns) {
      const radioGroups = {};
      document.querySelectorAll('input[type="radio"]').forEach(radio => {
        if (radio.name && this.isElementVisible(radio)) {
          if (!radioGroups[radio.name]) {
            radioGroups[radio.name] = [];
          }
          radioGroups[radio.name].push(radio);
        }
      });

      Object.values(radioGroups).forEach(group => {
        if (group.length < 2) return;
        
        const checkedRadio = group.find(radio => radio.checked);
        if (!checkedRadio) return;

        const labels = group.map(radio => {
          const { element, text } = this.findBestLabelElement(radio);
          return { text, element: element || radio.parentElement || radio };
        });

        const checkedIndex = group.indexOf(checkedRadio);
        const checkedLabel = labels[checkedIndex];
        
        if (this.isHarmfulRadioSelection(labels, checkedIndex)) {
          patterns.defaults.found.push({
            type: 'Kenksmingos numatytosios parinktys',
            element: checkedLabel.element,
            description: `Kenksminga numatytoji parinktis: "${checkedLabel.text}"`
          });
        }
      });
    }

    isHarmfulRadioSelection(labels, checkedIndex) {
      const checkedLabel = labels[checkedIndex];
      
      if (labels.some(label => label.text.includes('€') || label.text.includes('eur'))) {
        const prices = labels.map(label => {
          const match = label.text.match(/(\d+[,.]\d+|\d+)\s*(€|eur)/i);
          return match ? parseFloat(match[1].replace(',', '.')) : null;
        });
        
        const checkedPrice = prices[checkedIndex];
        if (checkedPrice !== null && prices.some(price => price !== null && price < checkedPrice)) {
          return true;
        }
      }

      const premiumWords = ['premium', 'express', 'pro', 'vip', 'priority'];
      return premiumWords.some(word => checkedLabel.text.toLowerCase().includes(word));
    }

    detectShamingPhrases(patterns) {
      const shamingPhrases = [
        'nenoriu', 'atsisakau', 'ne, ačiū', 'ne, dėkui', 'ne, nenoriu',
        'ne dabar', 'ne šiuo metu', 'neįdomu', 'nenoriu gauti', 'praleisti progą',
        'atsisakyti nuolaidos', 'praleisti akciją', 'tik šiandien',
        'tik dabar', 'dovanos nereikia', 'ačiū, dovanos nereikia'
      ];

      this.scanForPhrases(shamingPhrases, patterns, 'gėdos sukėlimas', 'Gėdos sukėlimas');
    }

    detectPressuredSelling(patterns) {
      const pressurePhrases = [
        'liko tik', 'baigiasi', 'pigiau šiandien', 'likę tik', 'užsibaigs', 'nepraleiskite',
        'užsitikrinkite', 'ribotas kiekis', 'greičiau', 'žmonių žiūri', 'žmonių svarsto',
        'paskutinė galimybė', 'paskutinis', 'paskutinė', 'skubėkite', 'neatidėliokite',
        'sparčiai mažėja', 'ribota', 'paskubėkite', 'nelaukite', 'tik šiandien', 'tik dabar',
        'jau greitai', 'būk pirmas', 'ypatingas pasiūlymas', 'specialus pasiūlymas'
      ];

      this.scanForPhrases(pressurePhrases, patterns, 'spaudimą keliantis pardavimas', 'Spaudimą keliantis pardavimas');
    }

    scanForPhrases(phrases, patterns, type, description) {
      const selectors = 'button, a, [role="button"], span, div, p, li, label, h1, h2, h3, h4, h5, h6';
      
      document.querySelectorAll(selectors).forEach(element => {
        if (!this.isElementVisible(element)) return;
        if (element.children.length > 10) return;
        
        const text = element.textContent?.toLowerCase() || '';
        if (text.length < 3) return;

        for (const phrase of phrases) {
          if (text.includes(phrase.toLowerCase())) {
            const innermostElement = this.findInnermostElementWithText(element, phrase);
            if (innermostElement) {
              const parentElement = innermostElement.parentElement || innermostElement;
              if (!this.elementHasMatchingParent(parentElement, patterns.redirect.found)) {
                patterns.redirect.found.push({
                  type: type,
                  element: parentElement,
                  description: `${description}: „${phrase}“`
                });
              }
            }
            break;
          }
        }
      });
    }

    findInnermostElementWithText(element, phrase) {
      const text = element.textContent?.toLowerCase() || '';
      if (!text.includes(phrase.toLowerCase())) return null;

      if (element.children.length === 0 || ['SPAN', 'P', 'A', 'BUTTON', 'LABEL'].includes(element.tagName)) {
        return element;
      }

      for (const child of element.children) {
        const found = this.findInnermostElementWithText(child, phrase);
        if (found) return found;
      }

      return element;
    }

    isElementVisible(element) {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
      );
    }

    findBestLabelElement(element) {
      if (!element) return { element: null, text: '' };
      
      let labelElement = null;
      let labelText = '';
      
      if (element.id) {
        labelElement = document.querySelector(`label[for="${element.id}"]`);
        if (labelElement) {
          labelText = labelElement.textContent?.trim() || '';
          return { element: labelElement, text: labelText };
        }
      }
      
      let current = element;
      while (current && current !== document.body) {
        if (current.tagName === 'LABEL') {
          labelElement = current;
          labelText = labelElement.textContent?.trim() || '';
          return { element: labelElement, text: labelText };
        }
        current = current.parentElement;
      }
      
      const nearbyText = this.findNearbyText(element);
      if (nearbyText) {
        return { element: element.parentElement || element, text: nearbyText };
      }
      
      return { element: element.parentElement || element, text: '' };
    }

    findNearbyText(element) {
      const range = 50;
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const candidates = Array.from(document.querySelectorAll('span, div, p, label'))
        .filter(el => {
          if (!this.isElementVisible(el)) return false;
          const elRect = el.getBoundingClientRect();
          const elCenterX = elRect.left + elRect.width / 2;
          const elCenterY = elRect.top + elRect.height / 2;
          const distance = Math.sqrt(
            Math.pow(centerX - elCenterX, 2) +
            Math.pow(centerY - elCenterY, 2)
          );
          return distance < range && el.textContent?.trim();
        });
      
      if (candidates.length === 0) return '';
      
      candidates.sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        const aDistance = Math.sqrt(
          Math.pow(centerX - (aRect.left + aRect.width / 2), 2) +
          Math.pow(centerY - (aRect.top + aRect.height / 2), 2)
        );
        const bDistance = Math.sqrt(
          Math.pow(centerX - (bRect.left + bRect.width / 2), 2) +
          Math.pow(centerY - (bRect.top + bRect.height / 2), 2)
        );
        return aDistance - bDistance;
      });
      
      return candidates[0].textContent?.trim() || '';
    }

    elementHasMatchingParent(element, patterns) {
      let current = element.parentElement;
      while (current && current !== document.body) {
        if (patterns.some(pattern => pattern.element === current)) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    }

    deduplicatePatterns(patterns) {
      const seenElements = new Set();
      
      const deduplicatePatternType = (patternList) => {
        const uniquePatterns = [];
        patternList.forEach(pattern => {
          if (!seenElements.has(pattern.element)) {
            seenElements.add(pattern.element);
            uniquePatterns.push(pattern);
          }
        });
        return uniquePatterns;
      };
      
      patterns.redirect.found = deduplicatePatternType(patterns.redirect.found);
      patterns.defaults.found = deduplicatePatternType(patterns.defaults.found);
    }

    observeDOMChanges() {
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }

      this.mutationObserver = new MutationObserver(mutations => {
        if (this.isDetectionDisabled || this.viewingPatternDetails || !this.currentSettings.mainToggle) {
          return;
        }
        
        let shouldRedetect = false;
        const now = Date.now();
        
        if (now - this.lastDetectionTime < this.detectionCooldown) {
          return;
        }

        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const relevantTags = ['FORM', 'INPUT', 'BUTTON'];
                const hasRelevantChild = node.querySelector && (
                  node.querySelector('input[type="checkbox"]') ||
                  node.querySelector('input[type="radio"]') ||
                  node.querySelector('button')
                );
                
                if (relevantTags.includes(node.tagName) || hasRelevantChild) {
                  shouldRedetect = true;
                  break;
                }
              }
            }
          }
        }

        if (shouldRedetect) {
          setTimeout(() => this.detectAllPatterns(), 500);
        }
      });

      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  new PatternDetector();
})();