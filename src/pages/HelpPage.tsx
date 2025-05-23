import { useState, useEffect } from 'react';
import { Header, ToolbarButton, Spacer, PopupContent } from '../components/CommonComponents';
import SettingsPage from './SettingsPage';
import ReportIssuePage from './ReportIssuePage';
import LoadingPage from './LoadingPage';
import DisabledSitePage from './DisabledSitePage';
import DisabledAllPage from './DisabledAllPage';

import HelpIcon from '../assets/help-outline-purple.svg';
import SettingsIcon from '../assets/settings-outline.svg';
import AlertIcon from '../assets/alert-outline.svg';
import RefreshIcon from '../assets/refresh-outline.svg';
import CloseIcon from '../assets/x-outline.svg';
import ShieldIconEnabled from '../assets/shield-outline-enabled.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import ArrowBackIcon from '../assets/arrow-left-outline.svg';
import ExpandIcon from '../assets/sort-ascending-duotone.svg';
import CollapseIcon from '../assets/sort-descending-duotone.svg';

const faqs = [
  {
    question: 'Kaip galiu laikinai išjungti šio įskiepio veikimą?',
    answer: 'Įskiepio veikimą galite valdyti nustatymuose arba spustelėję įrankio viršutinėje juostoje rodomą skydo piktogramą.'
  },
  {
    question: 'Ar galiu atsisakyti tik kurios nors tipo aptikimo?',
    answer: 'Taip, jį galite išjungti nustatymuose.'
  },
  {
    question: 'Kaip galiu pranešti apie klaidingai aptiktą atvejį?',
    answer: 'Tai galite padaryti naudodami pranešimo apie klaidą formą šalia aptikto elemento arba pasinaudoję parinktimi viršutinėje juostoje.'
  },
  {
    question: 'Kaip identifikuojate apgaulingų šablonų realizacijas?',
    answer: 'Įskiepyje remiamasi tinklapio kodo analize.'
  }
];

export default function HelpPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [report, setReport] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [settings, setSettings] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [disabledAll, setDisabledAll] = useState(false);
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

  if (report) return <ReportIssuePage />;
  if (refresh) return <LoadingPage />;
  if (settings) return <SettingsPage />;
  if (disabled) return <DisabledSitePage />;
  if (disabledAll) return <DisabledAllPage />;

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
      <ToolbarButton src={HelpIcon} bg="#FFFFFF" disabled />
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
    <div className="w-[499px] h-[337px] bg-white text-[#3D36A4] overflow-hidden relative text-[20px] leading-snug">
      <style>{`
        .faq-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .faq-scroll::-webkit-scrollbar-track {
          background: #D9D9D9;
          border-radius: 3px;
        }
        .faq-scroll::-webkit-scrollbar-thumb {
          background-color: #6B67D3;
          border-radius: 3px;
        }
        .faq-scroll::-webkit-scrollbar-button {
          display: none;
        }
      `}</style>

      <Header
        leftButtons={leftButtons}
        rightButtons={rightButtons}
        bgColor="#3D36A4"
      />

      <div className="w-full h-[283px] flex flex-col items-center justify-center text-[#3D36A4]">
        <div className="w-[485px] h-[257px] rounded-[10px] border-2 border-[#3D36A4] bg-white flex flex-col">
          <div className="relative h-[40px] w-full rounded-t-[7px] bg-[#3D36A4] text-white text-[20px] font-bold flex items-center justify-center rounded-t-[4px]">
            <div
              className="absolute top-[-2px] left-[-2px] w-[42px] h-[42px] flex items-center justify-center bg-[#6B67D3] rounded-tl-[10px] rounded-r-[10px] cursor-pointer"
              onClick={() => setRefresh(true)}
            >
              <img src={ArrowBackIcon} alt="back" className="w-[32px] h-[32px]" />
            </div>
            Pagalba ir DUK
          </div>

          <div className="faq-scroll flex-1 overflow-y-auto px-[6px] py-[6px] pr-[4px] mr-[5px] mt-[6px] mb-[6px]">
            <div className="space-y-[6px] mt-[-6px] mb-[-6px] mr-[1px]">
              {faqs.map((faq, i) => {
                const expanded = expandedIndex === i;
                return (
                  <div
                    key={i}
                    className={`border-[2px] rounded-[6px] cursor-pointer w-full
                      ${expanded ? "bg-[#3D36A4] text-white border-[#3D36A4]" : "bg-white text-[#3D36A4] border-[#3D36A4]"}`}
                    onClick={() => setExpandedIndex(expanded ? null : i)}
                  >
                    <div className="flex items-center h-[41px] w-full px-[14px] pr-[6px]">
                      <span className="text-[16px] font-bold text-left w-full whitespace-nowrap overflow-hidden text-ellipsis">
                        {faq.question}
                      </span>
                      <div
                        className="w-[31px] h-[30px] flex items-center justify-center ml-[8px] rounded-[6px]"
                        style={{ backgroundColor: "#6B67D3" }}
                      >
                        <img
                          src={expanded ? ExpandIcon : CollapseIcon}
                          alt="toggle"
                          className="w-[25px] h-[25px]"
                        />
                      </div>
                    </div>
                    {expanded && (
                      <div className="bg-white px-[12px] py-[6px] text-[15px] font-bold text-[#3D36A4] text-left leading-tight rounded-b-[6px] w-full">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}