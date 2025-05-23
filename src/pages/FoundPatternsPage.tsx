import { useState, useEffect } from 'react';
import { Header, ToolbarButton, Spacer, PopupContent, PatternCard } from '../components/CommonComponents';
import PatternDetailsPage from './PatternDetailsPage';
import LoadingPage from './LoadingPage';
import HelpPage from './HelpPage';
import ReportIssuePage from './ReportIssuePage';
import SettingsPage from './SettingsPage';
import DisabledSitePage from './DisabledSitePage';
import DisabledAllPage from './DisabledAllPage';

import ShieldIconEnabled from '../assets/shield-outline-enabled.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import SettingsIcon from '../assets/settings-outline.svg';
import HelpIcon from '../assets/help-outline.svg';
import AlertIcon from '../assets/alert-outline.svg';
import RefreshIcon from '../assets/refresh-outline.svg';
import CloseIcon from '../assets/x-outline.svg';
import BookIcon from '../assets/open-book-outline.svg';
import ArrowIcon from '../assets/arrow-right-circle-outline.svg';

interface PatternType {
  key: string;
  type: 'redirect' | 'defaults';
  title: string;
  description: string;
  count: number;
}

interface FoundPatternsPageProps {
  onRefreshClick: () => void;
}

export default function FoundPatternsPage({ onRefreshClick }: FoundPatternsPageProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [selected, setSelected] = useState<{ type: 'redirect' | 'defaults'; count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [help, setHelp] = useState(false);
  const [reportIssue, setReportIssue] = useState(false);
  const [settings, setSettings] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [disabledAll, setDisabledAll] = useState(false);
  const [isDetectionDisabled, setIsDetectionDisabled] = useState(false);
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);
  
  const [patternTypes, setPatternTypes] = useState<PatternType[]>([
    {
      key: 'redirect',
      type: 'redirect',
      title: 'Klaidinantis nukreipimas',
      description: 'Šiame puslapyje galimai taikomi manipuliacijos būdai, kuriais siekiama naudotojams parodyti sistemos valdytojo norimą turinį, o nenorimus reginius nuslėpti.',
      count: 0,
    },
    {
      key: 'defaults',
      type: 'defaults',
      title: 'Kenksmingos numatytosios parinktys',
      description: 'Šiame puslapyje galimai iš anksto parenkamos nenaudingos arba nepageidaujamos parinktys, atsižvelgiant į tai, kad jų pakeitimas reikalauja naudotojų dėmesio ir pastangų.',
      count: 0,
    },
  ]);

  useEffect(() => {
    checkDetectionStatus();
    loadPatternData();
  }, []);

  const checkDetectionStatus = () => {
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
  };

  const loadPatternData = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.runtime.sendMessage(
            { action: 'getTabPatterns', tabId: tabId },
            (response) => {
              if (response && response.success) {
                const patterns = response.patterns;
                
                setPatternTypes(prev => 
                  prev.map(p => {
                    if (p.type === 'redirect') {
                      return { ...p, count: patterns.redirect.count };
                    } else if (p.type === 'defaults') {
                      return { ...p, count: patterns.defaults.count };
                    }
                    return p;
                  })
                );
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
    } else {
      setLoading(true);
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
                  if (tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'disableDetection' });
                  }
                  setDisabled(true);
                });
              } else {
                if (tabs[0].id) {
                  chrome.tabs.sendMessage(tabs[0].id, { action: 'disableDetection' });
                }
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
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'disableDetection' });
          }
        });
        setDisabledAll(true);
      });
    } else {
      setDisabledAll(true);
    }
  };

  if (selected) {
    return (
      <PatternDetailsPage
        type={selected.type}
        count={selected.count}
        goBack={() => setSelected(null)}
        onReport={() => setReportIssue(true)}
      />
    );
  }
  
  if (loading) {
    return <LoadingPage onRefreshClick={handleRefreshClick} />;
  }
  
  if (help) {
    return <HelpPage />;
  }
  
  if (reportIssue) {
    return <ReportIssuePage />;
  }
  
  if (settings) {
    return <SettingsPage />;
  }

  if (disabled) {
    return <DisabledSitePage />;
  }

  if (disabledAll) {
    return <DisabledAllPage />;
  }

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
    <div className="w-[499px] h-[337px] bg-white text-[#B20000] leading-snug overflow-hidden relative">
      <Header
        leftButtons={leftButtons}
        rightButtons={rightButtons}
        bgColor="#B20000"
      />

      <div className="w-full h-[283px] flex flex-col items-center pt-[13px] gap-[8px]">
        <div className="w-[487px] h-[53px] border-[2px] border-[#B20000] rounded-[10px] text-[20px] font-bold flex items-center justify-center px-[10px]">
          Naršomame puslapyje aptikta apgaulingų šablonų!
        </div>
        
        {patternTypes.filter(p => p.count > 0).map((p) => (
          <PatternCard
            key={p.key}
            title={p.title}
            count={p.count}
            description={p.description}
            onClick={() => setSelected({ type: p.type, count: p.count })}
            bgColor="#B20000"
            accentColor="#BE4343"
            bookIcon={BookIcon}
            arrowIcon={ArrowIcon}
          />
        ))}
      </div>
    </div>
  );
}