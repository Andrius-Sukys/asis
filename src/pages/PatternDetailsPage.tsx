import { useEffect, useState } from 'react';
import { Header, ToolbarButton, Spacer, PopupContent, ScrollingText } from '../components/CommonComponents';
import HelpPage from './HelpPage';
import ReportIssuePage from './ReportIssuePage';
import SettingsPage from './SettingsPage';
import LoadingPage from './LoadingPage';
import DisabledSitePage from './DisabledSitePage';
import DisabledAllPage from './DisabledAllPage';

import HelpIcon from '../assets/help-outline.svg';
import SettingsIcon from '../assets/settings-outline.svg';
import AlertIcon from '../assets/alert-outline.svg';
import RefreshIcon from '../assets/refresh-outline.svg';
import CloseIcon from '../assets/x-outline.svg';
import ShieldIconEnabled from '../assets/shield-outline-enabled.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import BookIcon from '../assets/open-book-outline.svg';
import LinkIcon from '../assets/open-in-new-tab-outline.svg';
import BackArrow from '../assets/arrow-left-outline.svg';
import DoubleLeft from '../assets/chevron-dash-outline.svg';
import Left from '../assets/chevron-outline.svg';
import Right from '../assets/chevron-right-outline.svg';
import DoubleRight from '../assets/chevron-dash-right-outline.svg';

interface PatternDetail {
  type: string;
  description: string;
  elementId: string;
}

interface PatternDetailsPageProps {
  type: 'redirect' | 'defaults';
  count: number;
  goBack: () => void;
  onReport?: () => void;
}

export default function PatternDetailsPage({
  type,
  count,
  goBack,
  onReport,
}: PatternDetailsPageProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [tabUrl, setTabUrl] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [help, setHelp] = useState(false);
  const [settings, setSettings] = useState(false);
  const [reportIssue, setReportIssue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [disabledAll, setDisabledAll] = useState(false);
  const [isDetectionDisabled, setIsDetectionDisabled] = useState(false);
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);
  const [patternDetails, setPatternDetails] = useState<PatternDetail[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);

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
    initializePatternData();
    
    return () => {
      cleanup();
    };
  }, [type]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        setTabUrl(tabs[0]?.url || '');
        setCurrentTabId(tabs[0]?.id || null);
      });
    }
  }, []);

  useEffect(() => {
    if (isInitialized && currentTabId && patternDetails.length > 0) {
      highlightPattern(currentIndex);
    }
  }, [currentIndex, isInitialized, currentTabId, patternDetails.length]);

  const initializePatternData = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (!tabId) {
          console.error('PatternDetails: No active tab found');
          return;
        }

        setCurrentTabId(tabId);
        
        chrome.tabs.sendMessage(tabId, {
          action: 'setViewingPatternDetails',
          viewing: true
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('PatternDetails: Error setting viewing state:', chrome.runtime.lastError);
            return;
          }

          chrome.runtime.sendMessage(
            { action: 'getTabPatterns', tabId },
            (response) => {
              if (response?.success) {
                const patterns = response.patterns;
                const details = type === 'redirect' 
                  ? patterns.redirect.details || [] 
                  : patterns.defaults.details || [];
                
                setPatternDetails(details);
                
                setIsInitialized(true);
                if (details.length > 0) {
                  highlightPattern(0);
                }
              } else {
                console.error('PatternDetails: Failed to get patterns:', response?.error || 'Unknown error');
              }
            }
          );
        });
      });
    }
  };

  const highlightPattern = (index: number) => {
    if (!currentTabId || !isInitialized) {
      console.log('PatternDetails: Not ready for highlighting - tabId:', currentTabId, 'initialized:', isInitialized);
      return;
    }

    const elementId = patternDetails[index]?.elementId;
    if (!elementId) {
      console.error('PatternDetails: No elementId for pattern at index:', index);
      return;
    }

    console.log(`PatternDetails: Highlighting pattern ${index} of type ${type} with elementId ${elementId}`);
    
    chrome.tabs.sendMessage(currentTabId, {
      action: 'highlightPattern',
      elementId
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('PatternDetails: Error highlighting pattern:', chrome.runtime.lastError);
      } else if (response?.success) {
        console.log(`PatternDetails: Successfully highlighted pattern with elementId ${elementId}`);
      } else {
        console.error('PatternDetails: Failed to highlight pattern:', response?.error || 'Unknown error');
        
        setTimeout(() => {
          console.log('PatternDetails: Retrying highlight...');
          chrome.tabs.sendMessage(currentTabId, {
            action: 'highlightPattern',
            elementId
          }, (retryResponse) => {
            if (retryResponse?.success) {
              console.log(`PatternDetails: Retry successful for elementId ${elementId}`);
            } else {
              console.error('PatternDetails: Retry failed:', retryResponse?.error || 'Unknown error');
            }
          });
        }, 1000);
      }
    });
  };

  const cleanup = () => {
    console.log('PatternDetails: Cleaning up');
    
    if (currentTabId && typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.sendMessage(currentTabId, { action: 'showAllPatterns' }, () => {
        if (chrome.runtime.lastError) {
          console.log('PatternDetails: Error showing all patterns during cleanup');
        }
      });
      
      chrome.tabs.sendMessage(currentTabId, {
        action: 'setViewingPatternDetails',
        viewing: false
      }, () => {
        if (chrome.runtime.lastError) {
          console.log('PatternDetails: Error setting viewing state during cleanup');
        }
      });
    }
  };

  const handleRefreshClick = () => {
    setLoading(true);
  };

  const handleBackClick = () => {
    cleanup();
    goBack();
  };

  const handleReportClick = () => {
    if (onReport) {
      onReport();
    } else {
      setReportIssue(true);
    }
  };

  const handleIndexChange = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < count && newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
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

  if (help) return <HelpPage />;
  if (settings) return <SettingsPage />;
  if (reportIssue) return <ReportIssuePage />;
  if (loading) return <LoadingPage />;
  if (disabled) return <DisabledSitePage />;
  if (disabledAll) return <DisabledAllPage />;

  const currentPattern = patternDetails[currentIndex] || null;
  
  const types = {
    redirect: {
      title: 'Klaidinantis nukreipimas',
      description: 'Šiame puslapyje galimai taikomi manipuliacijos būdai, kuriais siekiama naudotojams parodyti sistemos valdytojo norimą turinį, o nenorimus reginius nuslėpti.',
    },
    defaults: {
      title: 'Kenksmingos numatytosios parinktys',
      description: 'Šiame puslapyje galimai iš anksto parenkamos nenaudingos arba nepageidaujamos parinktys, atsižvelgiant į tai, kad jų pakeitimas reikalauja naudotojų dėmesio ir pastangų.',
    },
  };

  const leftButtons = (
    <>
      <div className="relative">
        <ToolbarButton
          src={isDetectionDisabled || isSiteDisabled ? ShieldIconDisabled : ShieldIconEnabled}
          forceSmall
          onClick={() => setShowPopup(!showPopup)}
          bg="#BE4343"
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
            bgColor="#BE4343"
            borderColor="#BE4343"
          />
        )}
      </div>
      <Spacer />
      <ToolbarButton src={SettingsIcon} onClick={() => setSettings(true)} bg="#BE4343" />
      <Spacer />
      <ToolbarButton src={HelpIcon} onClick={() => setHelp(true)} bg="#BE4343" />
    </>
  );

  const rightButtons = (
    <>
      <ToolbarButton src={AlertIcon} onClick={() => setReportIssue(true)} bg="#BE4343" />
      <Spacer />
      <ToolbarButton src={RefreshIcon} onClick={handleRefreshClick} bg="#BE4343" />
      <Spacer />
      <ToolbarButton src={CloseIcon} shiftLeft onClick={() => window.close()} bg="#BE4343" isRightmostButton />
    </>
  );

  return (
    <div className="w-[499px] h-[337px] bg-white text-[#B20000] leading-snug overflow-hidden relative font-bold text-[14px]">
      <style>{`
        .asis-pattern-details ::-webkit-scrollbar {
          width: 6px;
        }
        .asis-pattern-details ::-webkit-scrollbar-track {
          background: #D9D9D9;
          border-radius: 3px;
          padding-top: -3px;
          padding-bottom: -3px;
        }
        .asis-pattern-details ::-webkit-scrollbar-thumb {
          background-color: #B20000;
          border-radius: 3px;
        }
        .asis-pattern-details ::-webkit-scrollbar-button {
          display: none;
        }
      `}</style>

      <Header
        leftButtons={leftButtons}
        rightButtons={rightButtons}
        bgColor="#B20000"
      />

      <div className="w-full h-[283px] flex flex-col items-center justify-center text-[#B20000] asis-pattern-details">
        <div className="w-[485px] h-[267px] rounded-[10px] border-2 border-[#B20000] bg-white">
          <div className="relative h-[40px] w-full rounded-t-[7px] bg-[#B20000] text-white text-[20px] font-bold flex items-center justify-center">
            <div
              className="absolute top-[-2px] left-[-2px] w-[42px] h-[42px] flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: '#BE4343', borderRadius: '10px', borderBottomLeftRadius: '0px' }}
              onClick={handleBackClick}
            >
              <img src={BackArrow} alt="back" className="w-[32px] h-[32px]" />
            </div>
            {types[type].title}
          </div>
          
          <div className="px-[7px] pt-[7px] space-y-[8px]">
            <div className="w-[469px] h-[42px] border-2 border-[#B20000] rounded-[6px] flex items-center overflow-hidden">
              <div className="w-[42px] h-full bg-[#B20000] flex items-center justify-center flex-shrink-0">
                <img src={LinkIcon} className="w-[30px] h-[30px] ml-[-1px]" alt="url" />
              </div>
              <div className="flex-1 overflow-hidden px-[10px] py-[5px]">
                <ScrollingText
                  content={tabUrl}
                  containerClassName="flex items-center text-[16px] font-200 h-full"
                  maxWidth={400}
                />
              </div>
            </div>

            <div className="w-[469px] h-[67px] border-2 border-[#B20000] rounded-[6px] flex">
              <div className="w-[42px] h-full bg-[#B20000] flex items-center justify-center flex-shrink-0">
                <img src={BookIcon} className="w-[30px] h-[30px]" alt="book" />
              </div>
              <div className="flex-1 px-[10px] py-[8px]">
                <div className="w-full h-full text-[#B20000] text-[16px] leading-[16px] text-justify overflow-y-auto">
                  {currentPattern?.description || types[type].description}
                </div>
              </div>
            </div>

            <div className="w-[469px] h-[46px] border-2 border-[#B20000] rounded-[6px] flex items-center justify-between px-[12px] mt-[5px]">
              <div className="ml-[-6px] flex gap-[4px]">
                <NavBtn 
                  icon={DoubleLeft} 
                  onClick={() => handleIndexChange(0)}
                />
                <NavBtn 
                  iconSize={30} 
                  icon={Left} 
                  onClick={() => handleIndexChange(currentIndex - 1)}
                />
              </div>
              <div className="text-[24px] font-bold text-[#B20000] select-none">
                {currentIndex + 1} iš {count}
              </div>
              <div className="mr-[-6px] flex gap-[4px]">
                <NavBtn 
                  iconSize={30} 
                  icon={Right} 
                  onClick={() => handleIndexChange(currentIndex + 1)}
                />
                <NavBtn 
                  icon={DoubleRight} 
                  onClick={() => handleIndexChange(count - 1)}
                />
              </div>
            </div>

            <div className="mt-[5px]">
              <button
                onClick={handleReportClick}
                className="w-full h-[30px] rounded-[6px] flex justify-center items-center text-white font-bold leading-[14px] hover:opacity-80 transition-opacity duration-200"
                style={{ backgroundColor: '#BE4343', fontSize: '16px' }}
              >
                Pranešti apie klaidą
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NavBtnProps {
  icon: string;
  onClick: () => void;
  iconSize?: number;
  disabled?: boolean;
}

function NavBtn({ icon, onClick, iconSize = 20, disabled = false }: NavBtnProps) {
  return (
    <div
      className={`w-9 h-9 flex items-center justify-center rounded-[3px] transition-opacity duration-200 ${
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
      }`}
      style={{ backgroundColor: '#BE4343' }}
      onClick={disabled ? undefined : onClick}
    >
      <img src={icon} style={{ width: iconSize, height: iconSize }} alt="" />
    </div>
  );
}