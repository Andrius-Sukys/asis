import { useState, useEffect, useRef } from 'react';
import { Header, ToolbarButton, Spacer, PopupContent, LoadingShield } from '../components/CommonComponents';
import DisabledSitePage from './DisabledSitePage';
import DisabledAllPage from './DisabledAllPage';
import SettingsPage from './SettingsPage';
import ReportIssuePage from './ReportIssuePage';
import HelpPage from './HelpPage';
import LoadingPage from './LoadingPage';

import HelpIcon from '../assets/help-outline.svg';
import SettingsIcon from '../assets/settings-outline.svg';
import AlertIcon from '../assets/alert-outline-purple.svg';
import RefreshIcon from '../assets/refresh-outline.svg';
import CloseIcon from '../assets/x-outline.svg';
import ShieldIconEnabled from '../assets/shield-outline-enabled.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import ShieldIcon from '../assets/shield-outline-purple.svg';

export default function ThanksPage() {
  const [fillPercentage, setFillPercentage] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [disabledAll, setDisabledAll] = useState(false);
  const [settings, setSettings] = useState(false);
  const [reportIssue, setReportIssue] = useState(false);
  const [help, setHelp] = useState(false);
  const [goToLoading, setGoToLoading] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [isDetectionDisabled, setIsDetectionDisabled] = useState(false);
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);
  
  const animationInterval = useRef<number | null>(null);

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
    animationInterval.current = window.setInterval(() => {
      setFillPercentage((prev) => {
        if (prev >= 100) {
          if (animationInterval.current) {
            clearInterval(animationInterval.current);
          }
          setTimeout(() => setGoToLoading(true), 300);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
    };
  }, []);

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
          }
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

  if (refresh || goToLoading) return <LoadingPage />;
  if (disabled) return <DisabledSitePage />;
  if (disabledAll) return <DisabledAllPage />;
  if (settings) return <SettingsPage />;
  if (reportIssue) return <ReportIssuePage />;
  if (help) return <HelpPage />;

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
      <ToolbarButton src={AlertIcon} bg="#FFFFFF" onClick={() => setReportIssue(true)} />
      <Spacer />
      <ToolbarButton src={RefreshIcon} onClick={() => setRefresh(true)} />
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
          Ačiū! Jūsų pranešimas<br />pateiktas sėkmingai
        </p>
      </div>
    </div>
  );
}