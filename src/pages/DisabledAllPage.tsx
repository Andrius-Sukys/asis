import { useState } from 'react';
import { Header, ToolbarButton, Spacer } from '../components/CommonComponents';
import LoadingPage from './LoadingPage';
import SettingsPage from './SettingsPage';
import HelpPage from './HelpPage';
import ReportIssuePage from './ReportIssuePage';

import HelpIcon from '../assets/help-outline.svg';
import SettingsIcon from '../assets/settings-outline.svg';
import AlertIcon from '../assets/alert-outline.svg';
import RefreshIcon from '../assets/refresh-outline-purple.svg';
import CloseIcon from '../assets/x-outline.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import ShieldIcon from '../assets/shield-outline-disabled-purple.svg';

export default function DisabledAllPage() {
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [reportIssue, setReportIssue] = useState(false);
  const [refresh, setRefresh] = useState(false);

  const handleEnableDetection = () => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ 
        allDetectionDisabled: false,
        mainToggle: true,
        redirectToggle: true,
        defaultsToggle: true,
      }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'enableDetection' });
          }
        });
        setEnabled(true);
      });
    } else {
      setEnabled(true);
    }
  };

  if (enabled || refresh) return <LoadingPage />;
  if (settings) return <SettingsPage />;
  if (help) return <HelpPage />;
  if (reportIssue) return <ReportIssuePage />;

  const leftButtons = (
    <>
      <ToolbarButton
        src={ShieldIconDisabled}
        forceSmall
        onClick={handleEnableDetection}
        isLeftmostButton
        isShieldIcon
        isDetectionDisabled={true}
      />
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
      <ToolbarButton src={RefreshIcon} bg="#FFFFFF" onClick={() => setRefresh(true)} />
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

      <div style={{ height: '4px' }} />
      <div className="h-[283px] flex flex-col items-center justify-center text-center">
        <img
          src={ShieldIcon}
          alt="disabled"
          className="w-[80px] h-[80px]"
        />
        <div style={{ height: '17px' }} />
        <p className="mt-[5px] text-[#3D36A4] font-semibold leading-snug">
          Apgaulingų šablonų aptikimo<br />
          funkcija išjungta
        </p>
      </div>
    </div>
  );
}