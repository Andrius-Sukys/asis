import { useState, useEffect, useRef } from 'react';
import { Header, ToolbarButton, Spacer, PopupContent, ScrollingText } from '../components/CommonComponents';
import SettingsPage from './SettingsPage';
import HelpPage from './HelpPage';
import ReportIssuePage from './ReportIssuePage';
import LoadingPage from './LoadingPage';
import DisabledSitePage from './DisabledSitePage';
import DisabledAllPage from './DisabledAllPage';

import HelpIcon from '../assets/help-outline.svg';
import SettingsIcon from '../assets/settings-outline-purple.svg';
import AlertIcon from '../assets/alert-outline.svg';
import RefreshIcon from '../assets/refresh-outline.svg';
import CloseIcon from '../assets/x-outline.svg';
import ShieldIconEnabled from '../assets/shield-outline-enabled.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import ArrowBackIcon from '../assets/arrow-left-outline.svg';
import SearchIcon from '../assets/search-outline.svg';
import TrashIcon from '../assets/trash-outline.svg';

interface DisabledSitesPageProps {
  onBack?: () => void;
}

export default function DisabledSitesPage({ onBack }: DisabledSitesPageProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [report, setReport] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [siteList, setSiteList] = useState<string[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [disabledAll, setDisabledAll] = useState(false);
  const [goBack, setGoBack] = useState(false);
  const [isDetectionDisabled, setIsDetectionDisabled] = useState(false);
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);
  const [activeTabHostname, setActiveTabHostname] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get({ 
        disabledSites: [],
        allDetectionDisabled: false
      }, (result) => {
        setSiteList(result.disabledSites || []);
        setIsDetectionDisabled(result.allDetectionDisabled);
        
        if (typeof chrome.tabs?.query !== 'undefined') {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
              try {
                const url = new URL(tabs[0].url);
                const hostname = url.hostname;
                setActiveTabHostname(hostname);
                
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

  const filteredSites = siteList.filter(site => 
    site.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (listRef.current) {
      setScrollbarVisible(listRef.current.scrollHeight > listRef.current.clientHeight);
    }
  }, [filteredSites]);

  const handleRemoveSite = (site: string) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const updatedList = siteList.filter(s => s !== site);
      chrome.storage.local.set({ disabledSites: updatedList }, () => {
        setSiteList(updatedList);
        setConfirmDelete(null);
        
        if (site === activeTabHostname) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
              chrome.tabs.sendMessage(tabs[0].id, { action: 'enableDetection' });
              setIsSiteDisabled(false);
            }
          });
        }
      });
    } else {
      const updatedList = siteList.filter(s => s !== site);
      setSiteList(updatedList);
      setConfirmDelete(null);
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

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      setGoBack(true);
    }
  };

  if (settings) return <SettingsPage />;
  if (help) return <HelpPage />;
  if (report) return <ReportIssuePage />;
  if (refresh || goBack) return <LoadingPage />;
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
      <ToolbarButton src={SettingsIcon} bg="#FFFFFF" onClick={() => setSettings(true)} />
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
    <div className="w-[499px] h-[337px] bg-white text-[20px] leading-snug overflow-hidden relative text-[#3D36A4]">
      <style>{`
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #D9D9D9;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #6B67D3;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-button {
          display: none;
        }
      `}</style>

      <Header
        leftButtons={leftButtons}
        rightButtons={rightButtons}
        bgColor="#3D36A4"
      />

      <div className="w-full h-[283px] flex flex-col items-center pt-[6px]">
        <div className="w-[485px] h-[40px] bg-[#3D36A4] rounded-t-[10px] text-white text-[20px] font-bold flex items-center justify-center relative">
          <div
            className="absolute left-0 top-0 w-[41px] h-[41px] flex items-center justify-center bg-[#6B67D3] rounded-tl-[10px] cursor-pointer"
            onClick={handleBackClick}
          >
            <img src={ArrowBackIcon} alt="back" className="w-[32px] h-[32px] relative" />
          </div>
          Tinklapiai, kuriuose paieška išjungta
        </div>

        <div className="w-[485px] h-[228px] border-2 border-[#3D36A4] rounded-b-[10px] overflow-hidden mt-[-1px] bg-white px-[7px] pt-[12px] pb-[9px]">
          <div className="w-[467px] h-[42px] border-2 border-[#3D36A4] rounded-[6px] flex overflow-hidden mb-[10px]">
            <div className="absolute left-[23px] h-[38px] w-[10px] bg-[#3D36A4] z-1"/>
            <div className="w-[42px] h-[42px] bg-[#6B67D3] flex items-center justify-center z-1">
              <img src={SearchIcon} alt="search" className="w-[29px] h-[29px] mt-[-3px]" />
            </div>
            <input
              type="text"
              placeholder="Įveskite ieškomą tinklapį..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-[16px] pl-[8px] outline-none text-[#3D36A4] z-10"
            />
          </div>

          <div
            ref={listRef}
            className="overflow-y-auto overflow-x-hidden space-y-[10px]"
            style={{ maxHeight: '150px' }}
          >
            {filteredSites.length > 0 ? (
              filteredSites.map((site, i) => (
                <div
                  key={i}
                  className={`${
                    scrollbarVisible ? 'w-[455px]' : 'w-full'
                  } h-[42px] border-2 border-[#3D36A4] rounded-[6px] flex items-center justify-between pl-[12px] pr-[6px] text-[16px] font-bold`}
                >
                  {confirmDelete === site ? (
                    <>
                      <ScrollingText
                        content={`Pašalinti ${site}?`}
                        containerClassName="text-red-700 max-w-[300px] h-[24px] flex items-center"
                        textClassName="text-red-700"
                        maxWidth={300}
                      />
                      <div className="flex space-x-[3px]">
                        <button
                          onClick={() => handleRemoveSite(site)}
                          className="w-[57px] h-[32px] !bg-[#AE1414] text-white rounded-[4px] font-bold flex items-center justify-center hover:opacity-80 transition-opacity duration-200"
                        >
                          Taip
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="w-[57px] h-[32px] mr-[-2px] !bg-[#6B67D3] text-white rounded-[4px] font-bold flex items-center justify-center hover:opacity-80 transition-opacity duration-200"
                        >
                          Ne
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="truncate max-w-[378px] mt-[0px]">{site}</div>
                      <div
                        className="w-[57px] h-[32px] bg-[#6B67D3] rounded-[4px] flex items-center justify-center ml-[2px] mr-[-2px] cursor-pointer hover:opacity-80 transition-opacity duration-200"
                        onClick={() => setConfirmDelete(site)}
                      >
                        <img src={TrashIcon} className="w-[20px] h-[20px]" alt="trash" />
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="h-[150px] flex items-center justify-center text-[16px] text-[#6B67D3]">
                Tinklapių, kuriuose paieška išjungta, nėra
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}