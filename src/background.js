class BackgroundManager {
  constructor() {
    this.activeTab = null;
    this.tabData = new Map();
    this.defaultSettings = {
      disabledSites: [],
      mainToggle: true,
      redirectToggle: true,
      defaultsToggle: true,
      allDetectionDisabled: false
    };
    
    this.init();
  }

  init() {
    this.initializeStorage();
    this.setupEventListeners();
    console.log('AŠIS Background Manager: Initialized');
  }

  initializeStorage() {
    chrome.storage.local.get(this.defaultSettings, (items) => {
      chrome.storage.local.set(items);
      console.log('Background: Storage initialized with defaults');
    });
  }

  setupEventListeners() {
    chrome.runtime.onStartup.addListener(() => this.initializeStorage());
    chrome.runtime.onInstalled.addListener(() => this.initializeStorage());
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => 
      this.handleMessage(request, sender, sendResponse));

    chrome.tabs.onActivated.addListener((activeInfo) => this.handleTabActivated(activeInfo));
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => 
      this.handleTabUpdated(tabId, changeInfo, tab));
    chrome.tabs.onRemoved.addListener((tabId) => this.handleTabRemoved(tabId));

    chrome.storage.onChanged.addListener((changes, area) => 
      this.handleStorageChanged(changes, area));
  }

  handleMessage(request, sender, sendResponse) {
    console.log('Background: Received message:', request.action, 'from sender:', sender.tab?.id || 'popup');

    const handlers = {
      patternResults: () => this.handlePatternResults(request, sender),
      getTabPatterns: () => this.handleGetTabPatterns(request, sendResponse),
      disableSite: () => this.handleDisableSite(request, sendResponse),
      enableSite: () => this.handleEnableSite(request, sendResponse),
      requestDetection: () => this.handleRequestDetection(sendResponse),
      checkIfDisabled: () => this.handleCheckIfDisabled(request, sendResponse)
    };

    const handler = handlers[request.action];
    if (handler) {
      return handler();
    }

    sendResponse({ success: false, error: 'Unknown action' });
    return false;
  }

  handlePatternResults(request, sender) {
    const tabId = sender.tab?.id || this.activeTab;
    if (tabId) {
      this.tabData.set(tabId, {
        patterns: request.patterns,
        timestamp: Date.now()
      });
      console.log(`Background: Stored pattern results for tab ${tabId}`);
    }
    return true;
  }

  handleGetTabPatterns(request, sendResponse) {
    const tabId = request.tabId || this.activeTab;
    
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: 'Tab not found' });
        return;
      }

      if (!tab?.url) {
        sendResponse({ success: false, error: 'No URL for tab' });
        return;
      }

      this.checkSiteStatus(tab.url, (isDisabled) => {
        if (isDisabled) {
          sendResponse({
            success: true,
            patterns: {
              redirect: { count: 0, details: [] },
              defaults: { count: 0, details: [] }
            }
          });
          return;
        }

        const data = this.tabData.get(tabId);
        if (data) {
          sendResponse({ success: true, patterns: data.patterns });
        } else {
          sendResponse({ success: false, error: 'No patterns data for this tab' });
        }
      });
    });
    
    return true;
  }

  handleDisableSite(request, sendResponse) {
    if (!request.hostname) {
      sendResponse({ success: false, error: 'No hostname provided' });
      return true;
    }

    chrome.storage.local.get({ disabledSites: [] }, (result) => {
      const disabledSites = result.disabledSites || [];
      if (!disabledSites.includes(request.hostname)) {
        disabledSites.push(request.hostname);
        chrome.storage.local.set({ disabledSites }, () => {
          console.log(`Background: Site ${request.hostname} added to disabled list`);
          this.notifyTabsOfDetectionChange();
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true, message: 'Site already disabled' });
      }
    });
    
    return true;
  }

  handleEnableSite(request, sendResponse) {
    if (!request.hostname) {
      sendResponse({ success: false, error: 'No hostname provided' });
      return true;
    }

    chrome.storage.local.get({ disabledSites: [] }, (result) => {
      const disabledSites = result.disabledSites || [];
      const updatedSites = disabledSites.filter(site => site !== request.hostname);
      chrome.storage.local.set({ disabledSites: updatedSites }, () => {
        console.log(`Background: Site ${request.hostname} removed from disabled list`);
        sendResponse({ success: true });
      });
    });
    
    return true;
  }

  handleRequestDetection(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ success: false, error: 'No active tab' });
        return;
      }

      const tab = tabs[0];
      if (!tab.url) {
        sendResponse({ success: false, error: 'No URL for tab' });
        return;
      }

      this.getCurrentSettings((settings) => {
        const hostname = new URL(tab.url).hostname;
        const isDisabled = settings.disabledSites.includes(hostname) || !settings.mainToggle;

        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'detectPatterns',
            siteDisabled: isDisabled,
            settings: {
              mainToggle: settings.mainToggle,
              redirectToggle: settings.redirectToggle,
              defaultsToggle: settings.defaultsToggle
            }
          }, (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ success: true });
            }
          });
        }
      });
    });
    
    return true;
  }

  handleCheckIfDisabled(request, sendResponse) {
    if (!request.url) {
      sendResponse({ isDisabled: false });
      return true;
    }

    this.checkSiteStatus(request.url, (isDisabled) => {
      sendResponse({ isDisabled });
    });
    
    return true;
  }

  handleTabActivated(activeInfo) {
    this.activeTab = activeInfo.tabId;
    console.log(`Background: Tab ${this.activeTab} activated`);
  }

  handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.active && tab.url) {
      console.log(`Background: Tab ${tabId} updated and is active`);
      
      this.getCurrentSettings((settings) => {
        const hostname = new URL(tab.url).hostname;
        const isDisabled = settings.disabledSites.includes(hostname) || 
                          settings.allDetectionDisabled || 
                          !settings.mainToggle;

        chrome.tabs.sendMessage(tabId, {
          action: 'tabActivated',
          siteDisabled: isDisabled,
          settings: {
            mainToggle: settings.mainToggle,
            redirectToggle: settings.redirectToggle,
            defaultsToggle: settings.defaultsToggle
          }
        }, () => {
          if (chrome.runtime.lastError) {
            console.log(`Background: Error sending tabActivated message to tab ${tabId}`);
          }
        });
      });
    }
  }

  handleTabRemoved(tabId) {
    if (this.tabData.has(tabId)) {
      this.tabData.delete(tabId);
      console.log(`Background: Cleared data for closed tab ${tabId}`);
    }
    if (this.activeTab === tabId) {
      this.activeTab = null;
    }
  }

  handleStorageChanged(changes, area) {
    if (area !== 'local') return;

    if (changes.allDetectionDisabled) {
      this.notifyAllTabsOfDetectionState(changes.allDetectionDisabled.newValue);
    }

    const settingKeys = ['mainToggle', 'redirectToggle', 'defaultsToggle'];
    const settingsChanged = settingKeys.some(key => changes[key]);
    
    if (settingsChanged) {
      this.getCurrentSettings((settings) => {
        this.notifyAllTabsOfSettingsChange(settings);
      });
    }

    if (changes.disabledSites) {
      this.notifyTabsOfDetectionChange();
    }
  }

  getCurrentSettings(callback) {
    chrome.storage.local.get(this.defaultSettings, callback);
  }

  checkSiteStatus(url, callback) {
    try {
      const hostname = new URL(url).hostname;
      this.getCurrentSettings((settings) => {
        const isDisabled = settings.disabledSites.includes(hostname) || 
                          settings.allDetectionDisabled || 
                          !settings.mainToggle;
        callback(isDisabled);
      });
    } catch (error) {
      console.error('Background: Error parsing URL:', error);
      callback(false);
    }
  }

  notifyAllTabsOfDetectionState(isDisabled) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: isDisabled ? 'disableDetection' : 'enableDetection'
          }, () => {
            if (chrome.runtime.lastError) {
            }
          });
        }
      });
    });
  }

  notifyAllTabsOfSettingsChange(settings) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsChanged',
            settings: settings
          }, () => {
            if (chrome.runtime.lastError) {
            }
          });
        }
      });
    });
  }

  notifyTabsOfDetectionChange() {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id && tab.url) {
          try {
            const hostname = new URL(tab.url).hostname;
            this.getCurrentSettings((settings) => {
              const wasDisabled = settings.disabledSites.includes(hostname);
              chrome.tabs.sendMessage(tab.id, {
                action: wasDisabled ? 'disableDetection' : 'enableDetection'
              });
            });
          } catch (error) {
            console.error('Background: Error processing URL:', error);
          }
        }
      });
    });
  }
}

new BackgroundManager();