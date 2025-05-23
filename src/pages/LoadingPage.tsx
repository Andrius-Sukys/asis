import { useState, useEffect, useRef } from 'react';
import { Header, ToolbarButton, Spacer, PopupContent, LoadingShield } from '../components/CommonComponents';
import DisabledSitePage from './DisabledSitePage';
import DisabledAllPage from './DisabledAllPage';
import SettingsPage from './SettingsPage';
import ReportIssuePage from './ReportIssuePage';
import HelpPage from './HelpPage';
import FoundPatternsPage from './FoundPatternsPage';
import NotFoundPage from './NotFoundPage';

import HelpIcon from '../assets/help-outline.svg';
import SettingsIcon from '../assets/settings-outline.svg';
import AlertIcon from '../assets/alert-outline.svg';
import RefreshIcon from '../assets/refresh-outline-purple.svg';
import CloseIcon from '../assets/x-outline.svg';
import ShieldIconEnabled from '../assets/shield-outline-enabled.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import ShieldIcon from '../assets/shield-outline-purple.svg';

interface LoadingPageProps {
  forceComplete?: boolean;
  onAnimationComplete?: () => void;
  onRefreshClick?: () => void;
}

export default function LoadingPage({ 
  forceComplete = false, 
  onAnimationComplete,
  onRefreshClick
}: LoadingPageProps) {
  const [fillPercentage, setFillPercentage] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [disabledAll, setDisabledAll] = useState(false);
  const [settings, setSettings] = useState(false);
  const [reportIssue, setReportIssue] = useState(false);
  const [help, setHelp] = useState(false);
  const [found, setFound] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [isDetectionDisabled, setIsDetectionDisabled] = useState(false);
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);
  
  const analysisCompletedEarly = useRef(false);
  const detectionInProgress = useRef(false);
  const animationInterval = useRef<number | null>(null);
  const redirectTimeout = useRef<number | null>(null);
  const animationStartTime = useRef(Date.now());
  
  const minAnimationDuration = 1500;

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get({ 
        allDetectionDisabled: false,
        disabledSites: []
      }, (result) => {
        setIsDetectionDisabled(result.allDetectionDisabled);
        
        if (typeof chrome.tabs?.query !== 'undefined') {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
              try {
                const url = new URL(tabs[0].url);
                const hostname = url.hostname;
                
                setIsSiteDisabled(
                  Array.isArray(result.disabledSites) && 
                  result.disabledSites.includes(hostname)
                );
              } catch (error) {
                console.error('Error parsing URL:', error);
              }
            }
          });
        }
      });
    }
  }, []);

  useEffect(() => {
    startAnimation();
    startDetection();
    
    return () => {
      cleanupAnimation();
    };
  }, []);

  useEffect(() => {
    if (forceComplete && fillPercentage < 100) {
      setFillPercentage(100);
      setSearchComplete(true);
    }
  }, [forceComplete, fillPercentage]);

  useEffect(() => {
    if (searchComplete) {
      onAnimationComplete?.();
      
      if (analysisComplete) {
        checkAndShowResults();
      }
    }
  }, [searchComplete, analysisComplete, onAnimationComplete]);

  useEffect(() => {
    if (analysisComplete && analysisCompletedEarly.current && fillPercentage >= 100) {
      checkAndShowResults();
    }
  }, [analysisComplete, fillPercentage]);

  const cleanupAnimation = () => {
    if (animationInterval.current) {
      clearInterval(animationInterval.current);
      animationInterval.current = null;
    }
    
    if (redirectTimeout.current) {
      clearTimeout(redirectTimeout.current);
      redirectTimeout.current = null;
    }
  };

  const startAnimation = () => {
    cleanupAnimation();
    animationStartTime.current = Date.now();
    
    animationInterval.current = window.setInterval(() => {
      setFillPercentage((prev) => {
        let increment = 2;
        if (prev > 70) increment = 1.5;
        if (prev > 85) increment = 1;
        if (prev > 95) increment = 0.5;
        
        const newValue = prev + increment;
        
        if (newValue >= 100) {
          cleanupAnimation();
          setSearchComplete(true);
          return 100;
        }
        return newValue;
      });
    }, 50);
  };

  const startDetection = () => {
    detectionInProgress.current = true;
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      animationStartTime.current = Date.now();
      
      chrome.runtime.sendMessage({ action: 'requestDetection' }, () => {
        setTimeout(() => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.runtime.sendMessage(
                { action: 'getTabPatterns', tabId: tabs[0].id },
                (response) => {
                  detectionInProgress.current = false;
                  
                  if (response?.success) {
                    const patterns = response.patterns;
                    const redirectCount = patterns.redirect.count;
                    const defaultsCount = patterns.defaults.count;
                    
                    const elapsedTime = Date.now() - animationStartTime.current;
                    
                    if (redirectCount > 0 || defaultsCount > 0) {
                      if (elapsedTime < minAnimationDuration) {
                        analysisCompletedEarly.current = true;
                        setAnalysisComplete(true);
                      } else {
                        setAnalysisComplete(true);
                        setFillPercentage(100);
                        setFound(true);
                      }
                    } else {
                      if (elapsedTime < minAnimationDuration) {
                        analysisCompletedEarly.current = true;
                        setAnalysisComplete(true);
                      } else {
                        setAnalysisComplete(true);
                        setFillPercentage(100);
                        setNotFound(true);
                      }
                    }
                  } else {
                    setAnalysisComplete(true);
                    const elapsedTime = Date.now() - animationStartTime.current;
                    if (elapsedTime >= minAnimationDuration) {
                      setFillPercentage(100);
                      setNotFound(true);
                    }
                  }
                }
              );
            }
          });
        }, 500);
      });
    }
  };

  const checkAndShowResults = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.runtime.sendMessage(
            { action: 'getTabPatterns', tabId: tabs[0].id },
            (response) => {
              if (response?.success) {
                const patterns = response.patterns;
                const redirectCount = patterns.redirect.count;
                const defaultsCount = patterns.defaults.count;
                
                if (redirectCount > 0 || defaultsCount > 0) {
                  setFound(true);
                } else {
                  setNotFound(true);
                }
              } else {
                setNotFound(true);
              }
            }
          );
        }
      });
    }
  };

  const handleRefreshClick = () => {
    if (onRefreshClick) {
      onRefreshClick();
      return;
    }
    
    setFillPercentage(0);
    setSearchComplete(false);
    setFound(false);
    setNotFound(false);
    setAnalysisComplete(false);
    analysisCompletedEarly.current = false;
    detectionInProgress.current = false;
    
    startAnimation();
    startDetection();
  };

  const handleDisableSiteDetection = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            const hostname = url.hostname;
            
            chrome.storage.local.get({ disabledSites: [] }, (result) => {
              const disabledSites = result.disabledSites || [];
              if (!disabledSites.includes(hostname)) {
                disabledSites.push(hostname);
                chrome.storage.local.set({ disabledSites }, () => {
                  setDisabled(true);
                });
              } else {
                setDisabled(true);
              }
            });
          } catch (error) {
            console.error('Error parsing URL:', error);
            setDisabled(true);
          }
        } else {
          setDisabled(true);
        }
      });
    } else {
      setDisabled(true);
    }
  };

  const handleDisableAllDetection = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ 
        allDetectionDisabled: true,
        mainToggle: false,
        redirectToggle: false,
        defaultsToggle: false,
      }, () => {
        setDisabledAll(true);
      });
    } else {
      setDisabledAll(true);
    }
  };

  if (disabled) return <DisabledSitePage />;
  if (disabledAll) return <DisabledAllPage />;
  if (settings) return <SettingsPage />;
  if (reportIssue) return <ReportIssuePage />;
  if (help) return <HelpPage />;
  if (found) return <FoundPatternsPage onRefreshClick={handleRefreshClick} />;
  if (notFound) return <NotFoundPage onRefreshClick={handleRefreshClick} />;

  const leftButtons = (
    <>
      <div className="relative">
        <ToolbarButton
          src={isDetectionDisabled || isSiteDisabled ? ShieldIconDisabled : ShieldIconEnabled}
          forceSmall
          onClick={() => setShowPopup(!showPopup)}
          isLeftmostButton
          isShieldIcon
          isDetectionDisabled={isDetectionDisabled || isSiteDisabled}
        />
        {showPopup && (
          <PopupContent
            onClose={() => setShowPopup(false)}
            onDisableAll={handleDisableAllDetection}
            onDisableSite={handleDisableSiteDetection}
            isDetectionDisabled={isDetectionDisabled}
            isSiteDisabled={isSiteDisabled}
            shieldIcon={isDetectionDisabled || isSiteDisabled ? ShieldIconDisabled : ShieldIconEnabled}
            bgColor="#6B67D3"
            borderColor="#6B67D3"
          />
        )}
      </div>
      <Spacer />
      <ToolbarButton src={SettingsIcon} onClick={() => setSettings(true)} />
      <Spacer />
      <ToolbarButton src={HelpIcon} onClick={() => setHelp(true)} />
    </>
  );

  const rightButtons = (
    <>
      <ToolbarButton src={AlertIcon} onClick={() => setReportIssue(true)} />
      <Spacer />
      <ToolbarButton 
        src={RefreshIcon} 
        bg="#FFFFFF" 
        onClick={handleRefreshClick} 
        disabled={!searchComplete && !forceComplete}
      />
      <Spacer />
      <ToolbarButton src={CloseIcon} shiftLeft onClick={() => window.close()} isRightmostButton />
    </>
  );

  return (
    <div className="w-[499px] h-[337px] bg-white text-[20px] leading-snug overflow-hidden">
      <Header
        leftButtons={leftButtons}
        rightButtons={rightButtons}
        bgColor="#3D36A4"
      />

      <div className="h-[283px] flex flex-col items-center justify-center text-center">
        <LoadingShield
          fillPercentage={fillPercentage}
          shieldIcon={ShieldIcon}
          size={100}
          fillColor="#6B67D3"
        />
        <div style={{ height: '12px' }} />
        <p className="text-[#3D36A4] font-semibold leading-snug">
          Naršomame puslapyje <br /> ieškoma apgaulingų šablonų...
        </p>
      </div>
    </div>
  );
}