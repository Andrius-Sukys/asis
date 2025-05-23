import { useState, useEffect } from 'react';
import { Header, ToolbarButton, Spacer, PopupContent } from '../components/CommonComponents';
import DisabledSitePage from './DisabledSitePage';
import DisabledAllPage from './DisabledAllPage';
import SettingsPage from './SettingsPage';
import HelpPage from './HelpPage';
import ReportIssuePage from './ReportIssuePage';
import LoadingPage from './LoadingPage';

import HelpIcon from '../assets/help-outline.svg';
import SettingsIcon from '../assets/settings-outline.svg';
import AlertIcon from '../assets/alert-outline.svg';
import RefreshIcon from '../assets/refresh-outline.svg';
import CloseIcon from '../assets/x-outline.svg';
import ShieldIconEnabled from '../assets/shield-outline-enabled.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import ShieldTickIcon from '../assets/shield-tick-outline.svg';

interface NotFoundPageProps {
  onRefreshClick: () => void;
}

export default function NotFoundPage({ onRefreshClick }: NotFoundPageProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [disabledAll, setDisabledAll] = useState(false);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [reportIssue, setReportIssue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDetectionDisabled, setIsDetectionDisabled] = useState(false);
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);

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

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'hideAllHighlights' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending hideAllHighlights message:', chrome.runtime.lastError);
        } else {
          console.log('Sent hideAllHighlights message:', response);
        }
      });
    }
  }, []);

  const handleRefreshClick = () => {
    setLoading(true);
    onRefreshClick();
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

  if (loading) return <LoadingPage onRefreshClick={handleRefreshClick} />;
  if (disabled) return <DisabledSitePage />;
  if (disabledAll) return <DisabledAllPage />;
  if (settings) return <SettingsPage />;
  if (help) return <HelpPage />;
  if (reportIssue) return <ReportIssuePage />;

  const leftButtons = (
    <>
      <div className="relative">
        <ToolbarButton
          src={isDetectionDisabled || isSiteDisabled ? ShieldIconDisabled : ShieldIconEnabled}
          forceSmall
          onClick={() => setShowPopup(!showPopup)}
          bg="#67D367"
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
            bgColor="#67D367"
            borderColor="#67D367"
          />
        )}
      </div>
      <Spacer />
      <ToolbarButton src={SettingsIcon} onClick={() => setSettings(true)} bg="#67D367" />
      <Spacer />
      <ToolbarButton src={HelpIcon} onClick={() => setHelp(true)} bg="#67D367" />
    </>
  );

  const rightButtons = (
    <>
      <ToolbarButton src={AlertIcon} onClick={() => setReportIssue(true)} bg="#67D367" />
      <Spacer />
      <ToolbarButton src={RefreshIcon} onClick={handleRefreshClick} bg="#67D367" />
      <Spacer />
      <ToolbarButton src={CloseIcon} shiftLeft onClick={() => window.close()} bg="#67D367" isRightmostButton />
    </>
  );

  return (
    <div className="w-[499px] h-[337px] bg-white text-[20px] leading-snug overflow-hidden relative">
      <Header
        leftButtons={leftButtons}
        rightButtons={rightButtons}
        bgColor="#14AE5C"
      />

      <div className="h-[283px] flex flex-col items-center justify-center text-center">
        <img src={ShieldTickIcon} alt="safe" className="w-[100px] h-[100px]" />
        <div style={{ height: '12px' }} />
        <p className="text-[#14AE5C] font-semibold leading-snug">
          Naršomame puslapyje <br />
          apgaulingų šablonų nerasta
        </p>
      </div>
    </div>
  );
}