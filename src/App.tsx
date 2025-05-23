import './App.css';
import { useState, useEffect, useRef } from 'react';
import NotFoundPage from './pages/NotFoundPage';
import LoadingPage from './pages/LoadingPage';
import FoundPatternsPage from './pages/FoundPatternsPage';
import DisabledSitePage from './pages/DisabledSitePage';
import DisabledAllPage from './pages/DisabledAllPage';
import HelpPage from './pages/HelpPage';
import SettingsPage from './pages/SettingsPage';
import ReportIssuePage from './pages/ReportIssuePage';

interface SettingsState {
  mainToggle: boolean;
  redirectToggle: boolean;
  defaultsToggle: boolean;
  allDetectionDisabled: boolean;
  disabledSites: string[];
}

type AppMode = 
  | 'normal'
  | 'loading'
  | 'found'
  | 'disabled'
  | 'disabled-all'
  | 'settings'
  | 'help'
  | 'report';

class AppStateManager {
  private mode: AppMode = 'loading';
  private settings: SettingsState;
  private currentHostname: string | null = null;
  private previousMode: AppMode | null = null;
  private detectionInProgress = false;
  private updateUIAfterDetection = false;
  private onStateChange: (mode: AppMode) => void;

  constructor(onStateChange: (mode: AppMode) => void) {
    this.onStateChange = onStateChange;
    this.settings = {
      mainToggle: true,
      redirectToggle: true,
      defaultsToggle: true,
      allDetectionDisabled: false,
      disabledSites: []
    };
  }

  getMode(): AppMode {
    return this.mode;
  }

  setMode(mode: AppMode) {
    this.mode = mode;
    this.onStateChange(mode);
  }

  getSettings(): SettingsState {
    return this.settings;
  }

  initialize() {
    this.checkSettings();
    this.setupStorageListener();
  }

  private checkSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(this.settings, (result) => {
        this.settings = result as SettingsState;
        
        if (result.allDetectionDisabled) {
          this.setMode('disabled-all');
          return;
        }
        
        this.checkCurrentSite();
      });
    } else {
      setTimeout(() => this.forceLoadingComplete(), 500);
    }
  }

  private checkCurrentSite() {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            this.currentHostname = url.hostname;
            
            if (this.settings.disabledSites.includes(url.hostname)) {
              this.setMode('disabled');
              return;
            }
            
            if (tabs[0].id !== undefined) {
              this.checkPatterns(tabs[0].id, true);
            } else {
              this.forceLoadingComplete();
            }
          } catch (error) {
            console.error('Error parsing URL:', error);
            this.forceLoadingComplete();
          }
        } else {
          this.forceLoadingComplete();
        }
      });
    } else {
      this.forceLoadingComplete();
    }
  }

  private checkPatterns(tabId: number, updateUI: boolean) {
    if (typeof chrome?.runtime?.sendMessage === 'undefined') {
      this.forceLoadingComplete();
      return;
    }
    
    this.detectionInProgress = true;
    this.updateUIAfterDetection = updateUI;
    
    chrome.runtime.sendMessage(
      { action: 'getTabPatterns', tabId },
      (response) => {
        if (response?.success) {
          const patterns = response.patterns;
          
          let redirectCount = this.settings.redirectToggle ? patterns.redirect.count : 0;
          let defaultsCount = this.settings.defaultsToggle ? patterns.defaults.count : 0;
          
          if (this.updateUIAfterDetection) {
            if (redirectCount > 0 || defaultsCount > 0) {
              this.setMode('found');
            } else {
              this.setMode('normal');
            }
          }
          
          this.forceLoadingComplete();
          this.detectionInProgress = false;
        } else {
          this.forceLoadingComplete();
          this.detectionInProgress = false;
        }
      }
    );
  }

  private forceLoadingComplete() {
  }

  private setupStorageListener() {
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        
        let settingsChanged = false;
        const newSettings = { ...this.settings };
        
        Object.keys(changes).forEach(key => {
          if (key in newSettings) {
            (newSettings as any)[key] = changes[key].newValue;
            settingsChanged = true;
          }
        });
        
        if (settingsChanged) {
          this.settings = newSettings;
          this.updateModeBasedOnSettings();
        }
      });
    }
  }

  private updateModeBasedOnSettings() {
    const mainPageModes: AppMode[] = ['normal', 'found', 'loading', 'disabled', 'disabled-all'];
    
    if (mainPageModes.includes(this.mode)) {
      if (this.settings.allDetectionDisabled) {
        this.setMode('disabled-all');
      } else if (this.currentHostname && this.settings.disabledSites.includes(this.currentHostname)) {
        this.setMode('disabled');
      } else if (this.mode === 'disabled' || this.mode === 'disabled-all') {
        this.previousMode = null;
        this.setMode('loading');
        this.updateUIAfterDetection = true;
      }
    }
  }

  handleRefreshClick(): void {
    if (this.detectionInProgress) return;
    
    const mainPageModes: AppMode[] = ['normal', 'found', 'loading', 'disabled', 'disabled-all'];
    
    if (this.mode !== 'loading') {
      this.previousMode = this.mode;
    }
    
    if (mainPageModes.includes(this.mode)) {
      this.setMode('loading');
    }
    
    this.recheckDetectionStatus();
  }

  private recheckDetectionStatus() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get({
        allDetectionDisabled: false,
        disabledSites: []
      }, (result) => {
        if (result.allDetectionDisabled) {
          const mainPageModes: AppMode[] = ['normal', 'found', 'loading'];
          if (mainPageModes.includes(this.mode)) {
            this.setMode('disabled-all');
          }
          return;
        }
        
        this.checkCurrentSiteAndRequest();
      });
    }
  }

  private checkCurrentSiteAndRequest() {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            const hostname = url.hostname;
            
            chrome.storage.local.get({ disabledSites: [] }, (result) => {
              if (result.disabledSites?.includes(hostname)) {
                const mainPageModes: AppMode[] = ['normal', 'found', 'loading'];
                if (mainPageModes.includes(this.mode)) {
                  this.setMode('disabled');
                }
                return;
              }
              
              if (typeof chrome.runtime?.sendMessage !== 'undefined' && typeof tabs[0].id === 'number') {
                const mainPageModes: AppMode[] = ['normal', 'found', 'loading'];
                const updateUI = mainPageModes.includes(this.mode) || this.previousMode === null;
                this.updateUIAfterDetection = updateUI;
                chrome.runtime.sendMessage({ action: 'requestDetection' });
              }
            });
          } catch (error) {
            console.error('Error parsing URL:', error);
          }
        }
      });
    }
  }

  handleAnimationComplete(): void {
    if (this.mode !== 'loading') return;
    
    if (this.previousMode && 
        this.previousMode !== 'loading' && 
        this.previousMode !== 'normal' && 
        this.previousMode !== 'found') {
      this.setMode(this.previousMode);
      this.previousMode = null;
      return;
    }
    
    this.checkPatternsAfterAnimation();
  }

  private checkPatternsAfterAnimation() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && typeof tabs[0].id === 'number') {
          this.checkSiteStatusAndPatterns(tabs[0]);
        } else {
          this.setMode('normal');
          this.previousMode = null;
        }
      });
    } else {
      this.setMode('normal');
      this.previousMode = null;
    }
  }

  private checkSiteStatusAndPatterns(tab: chrome.tabs.Tab) {
    if (typeof chrome.storage?.local !== 'undefined') {
      chrome.storage.local.get({ 
        disabledSites: [], 
        allDetectionDisabled: false 
      }, (result) => {
        if (result.allDetectionDisabled) {
          this.setMode('disabled-all');
          this.previousMode = null;
          return;
        }
        
        if (tab.url) {
          try {
            const url = new URL(tab.url);
            this.currentHostname = url.hostname;
            
            if (result.disabledSites.includes(url.hostname)) {
              this.setMode('disabled');
              this.previousMode = null;
              return;
            }
            
            if (typeof tab.id === 'number') {
              this.getTabPatterns(tab.id);
            } else {
              this.setMode('normal');
              this.previousMode = null;
            }
          } catch (error) {
            console.error('Error parsing URL:', error);
            if (typeof tab.id === 'number') {
              this.getTabPatterns(tab.id);
            } else {
              this.setMode('normal');
              this.previousMode = null;
            }
          }
        } else {
          this.setMode('normal');
          this.previousMode = null;
        }
      });
    } else {
      if (typeof tab.id === 'number') {
        this.getTabPatterns(tab.id);
      } else {
        this.setMode('normal');
        this.previousMode = null;
      }
    }
  }

  private getTabPatterns(tabId: number) {
    chrome.runtime.sendMessage(
      { action: 'getTabPatterns', tabId },
      (response) => {
        if (response?.success) {
          const patterns = response.patterns;
          
          let redirectCount = this.settings.redirectToggle ? patterns.redirect.count : 0;
          let defaultsCount = this.settings.defaultsToggle ? patterns.defaults.count : 0;
          
          if (redirectCount > 0 || defaultsCount > 0) {
            this.setMode('found');
          } else {
            this.setMode('normal');
          }
        } else {
          this.setMode('normal');
        }
        
        this.previousMode = null;
      }
    );
  }
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('loading');
  const [shouldForceAnimationComplete, setShouldForceAnimationComplete] = useState(false);
  const stateManagerRef = useRef<AppStateManager | null>(null);

  useEffect(() => {
    stateManagerRef.current = new AppStateManager(setMode);
    stateManagerRef.current.initialize();

    const handleMessage = (request: any) => {
      if (request.action === 'patternResults' && stateManagerRef.current) {
        const patterns = request.patterns;
        const settings = stateManagerRef.current.getSettings();
        
        let redirectCount = settings.redirectToggle ? patterns.redirect.count : 0;
        let defaultsCount = settings.defaultsToggle ? patterns.defaults.count : 0;
        
        if (redirectCount > 0 || defaultsCount > 0) {
          setMode('found');
        } else {
          setMode('normal');
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, []);

  const handleRefreshClick = () => {
    if (stateManagerRef.current) {
      stateManagerRef.current.handleRefreshClick();
      setShouldForceAnimationComplete(false);
    }
  };

  const handleAnimationComplete = () => {
    if (stateManagerRef.current) {
      stateManagerRef.current.handleAnimationComplete();
    }
  };

  switch (mode) {
    case 'disabled-all':
      return <DisabledAllPage />;
      
    case 'disabled':
      return <DisabledSitePage />;
      
    case 'normal':
      return <NotFoundPage onRefreshClick={handleRefreshClick} />;
      
    case 'found':
      return <FoundPatternsPage onRefreshClick={handleRefreshClick} />;
      
    case 'settings':
      return <SettingsPage />;
      
    case 'help':
      return <HelpPage />;
      
    case 'report':
      return <ReportIssuePage />;
      
    case 'loading':
    default:
      return (
        <LoadingPage 
          forceComplete={shouldForceAnimationComplete} 
          onAnimationComplete={handleAnimationComplete}
          onRefreshClick={handleRefreshClick}
        />
      );
  }
}