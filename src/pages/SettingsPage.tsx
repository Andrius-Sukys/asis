import { useState, useEffect } from 'react';
import { Header, ToolbarButton, Spacer, PopupContent, SettingsToggle } from '../components/CommonComponents';
import DisabledSitesPage from './DisabledSitesPage';
import HelpPage from './HelpPage';
import ReportIssuePage from './ReportIssuePage';
import LoadingPage from './LoadingPage';
import DisabledAllPage from './DisabledAllPage';
import DisabledSitePage from './DisabledSitePage';

import HelpIcon from '../assets/help-outline.svg';
import SettingsIcon from '../assets/settings-outline-purple.svg';
import AlertIcon from '../assets/alert-outline.svg';
import RefreshIcon from '../assets/refresh-outline.svg';
import CloseIcon from '../assets/x-outline.svg';
import ShieldIconEnabled from '../assets/shield-outline-enabled.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import ArrowBackIcon from '../assets/arrow-left-outline.svg';
import ArrowForwardIcon from '../assets/arrow-right-circle-outline.svg';

interface SettingsState {
  mainToggle: boolean;
  redirectToggle: boolean;
  defaultsToggle: boolean;
}

export default function SettingsPage() {
  const [showPopup, setShowPopup] = useState(false);
  const [settingsState, setSettingsState] = useState<SettingsState>({
    mainToggle: true,
    redirectToggle: true,
    defaultsToggle: true,
  });
  const [websites, setWebsites] = useState(false);
  const [help, setHelp] = useState(false);
  const [report, setReport] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [goBack, setGoBack] = useState(false);
  const [isDetectionDisabled, setIsDetectionDisabled] = useState(false);
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);
  const [settingsModified, setSettingsModified] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(
        { 
          mainToggle: true, 
          redirectToggle: true, 
          defaultsToggle: true,
          allDetectionDisabled: false,
          disabledSites: []
        }, 
        (result) => {
          setSettingsState({
            mainToggle: result.mainToggle,
            redirectToggle: result.redirectToggle,
            defaultsToggle: result.defaultsToggle,
          });
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
        }
      );
    }
  }, []);

  const handleGoBack = () => {
    if (isDetectionDisabled) {
      window.location.href = 'index.html?page=disabled-all';
    } else if (isSiteDisabled) {
      window.location.href = 'index.html?page=disabled-site';
    } else if (settingsModified) {
      setRefresh(true);
    } else {
      setGoBack(true);
    }
  };

  const handleToggleChange = (key: keyof SettingsState) => {
    setSettingsModified(true);
    
    const updatedState = { ...settingsState };
    updatedState[key] = !updatedState[key];
    
    if (key === 'redirectToggle' || key === 'defaultsToggle') {
      if (!updatedState.redirectToggle && !updatedState.defaultsToggle) {
        updatedState.mainToggle = false;
      }
    } else if (key === 'mainToggle') {
      if (!updatedState.mainToggle) {
        updatedState.redirectToggle = false;
        updatedState.defaultsToggle = false;
      } else if (!updatedState.redirectToggle && !updatedState.defaultsToggle) {
        updatedState.redirectToggle = true;
        updatedState.defaultsToggle = true;
      }
    }
    
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const allDetectionDisabled = !updatedState.mainToggle;
      
      chrome.storage.local.set({
        mainToggle: updatedState.mainToggle,
        redirectToggle: updatedState.redirectToggle,
        defaultsToggle: updatedState.defaultsToggle,
        allDetectionDisabled: allDetectionDisabled,
      }, () => {
        setIsDetectionDisabled(allDetectionDisabled);
        
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(
              tabs[0].id, 
              { 
                action: 'settingsChanged',
                settings: updatedState
              }
            );
          }
        });
        
        if (key === 'mainToggle') {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(
                tabs[0].id, 
                { 
                  action: updatedState.mainToggle ? 'enableDetection' : 'disableDetection' 
                }
              );
            }
          });
        }
      });
    }
    
    setSettingsState(updatedState);
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
                  setIsSiteDisabled(true);
                  setShowPopup(false);
                });
              } else {
                if (tabs[0].id) {
                  chrome.tabs.sendMessage(tabs[0].id, { action: 'disableDetection' });
                }
                setIsSiteDisabled(true);
                setShowPopup(false);
              }
            });
          } catch (error) {
            console.error('Error parsing URL:', error);
            setShowPopup(false);
          }
        } else {
          setShowPopup(false);
        }
      });
    } else {
      setShowPopup(false);
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
        
        setSettingsState({
          mainToggle: false,
          redirectToggle: false,
          defaultsToggle: false,
        });
        setIsDetectionDisabled(true);
        setShowPopup(false);
      });
    } else {
      setShowPopup(false);
    }
  };

  if (websites) return <DisabledSitesPage onBack={() => setWebsites(false)} />;
  if (help) return <HelpPage />;
  if (report) return <ReportIssuePage />;
  if (refresh || goBack) {
    if (isDetectionDisabled) {
      return <DisabledAllPage />;
    }
    if (isSiteDisabled) {
      return <DisabledSitePage />;
    }
    return <LoadingPage />;
  }

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
      <ToolbarButton src={SettingsIcon} bg="#FFFFFF" />
      <Spacer />
      <ToolbarButton src={HelpIcon} onClick={() => setHelp(true)} />
    </>
  );

  const rightButtons = (
    <>
      <ToolbarButton src={AlertIcon} onClick={() => setReport(true)} />
      <Spacer />
      <ToolbarButton src={RefreshIcon} onClick={() => setRefresh(true)} />
      <Spacer />
      <ToolbarButton src={CloseIcon} shiftLeft onClick={() => window.close()} isRightmostButton />
    </>
  );

  return (
    <div className="w-[499px] h-[337px] bg-white text-[20px] leading-snug overflow-hidden relative">
      <Header
        leftButtons={leftButtons}
        rightButtons={rightButtons}
        bgColor="#3D36A4"
      />

      <div className="w-full h-[283px] flex flex-col items-center justify-center text-[#3D36A4]">
        <div className="w-[485px] h-[206px] rounded-[10px] border-2 border-[#3D36A4]">
          <div className="relative h-[40px] w-full rounded-t-[7px] bg-[#3D36A4] text-white text-[20px] font-bold flex items-center justify-center">
            <div
              className="absolute top-[-2px] left-[-2px] w-[42px] h-[42px] flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: '#6B67D3', borderRadius: '10px', borderBottomLeftRadius: '0px' }}
              onClick={handleGoBack}
            >
              <img src={ArrowBackIcon} alt="back" className="w-[32px] h-[32px]" />
            </div>
            Nustatymai
          </div>
          <div className="px-[7px] pt-[10px] space-y-[9px]">
            <SettingsToggle 
              label="Automatinis apgaulingų šablonų aptikimas" 
              value={settingsState.mainToggle} 
              onChange={() => handleToggleChange('mainToggle')} 
            />
            <SettingsToggle 
              label="Klaidinančio nukreipimo aptikimas" 
              value={settingsState.redirectToggle} 
              onChange={() => handleToggleChange('redirectToggle')} 
              disabled={!settingsState.mainToggle}
            />
            <SettingsToggle 
              label="Kenksmingų numatytųjų parinkčių aptikimas" 
              value={settingsState.defaultsToggle} 
              onChange={() => handleToggleChange('defaultsToggle')} 
              disabled={!settingsState.mainToggle}
            />
          </div>
        </div>

        <div
          className="w-[485px] h-[42px] rounded-[6px] border-2 border-[#3D36A4] mt-[9px] flex items-center font-bold hover:cursor-pointer relative pr-[60px]"
          onClick={() => setWebsites(true)}
        >
          <span className="text-[16px] pl-[12px]">Tinklapiai, kuriuose paieška išjungta</span>

          <div
            className="absolute right-[-0px] w-[56px] h-[38px] bg-[#6B67D3] flex items-center justify-center rounded-r-[3px]"
            style={{ zIndex: 0 }}
          >
            <img src={ArrowForwardIcon} className="w-[29px] h-[29px]" alt="forward" />
          </div>
        </div>
      </div>
    </div>
  );
}