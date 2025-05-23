import { useEffect, useRef, useState } from 'react';
import { Header, ToolbarButton, Spacer, PopupContent, ScrollingText } from '../components/CommonComponents';
import ThanksPage from './ThanksPage';
import HelpPage from './HelpPage';
import LoadingPage from './LoadingPage';
import SettingsPage from './SettingsPage';
import DisabledSitePage from './DisabledSitePage';
import DisabledAllPage from './DisabledAllPage';

import HelpIcon from '../assets/help-outline.svg';
import SettingsIcon from '../assets/settings-outline.svg';
import AlertIcon from '../assets/alert-outline-purple.svg';
import RefreshIcon from '../assets/refresh-outline.svg';
import CloseIcon from '../assets/x-outline.svg';
import ShieldIconEnabled from '../assets/shield-outline-enabled.svg';
import ShieldIconDisabled from '../assets/shield-outline-disabled.svg';
import ArrowBackIcon from '../assets/arrow-left-outline.svg';
import LinkIcon from '../assets/open-in-new-tab-outline.svg';
import AttachmentIcon from '../assets/attachment-clip-outline.svg';
import MessageIcon from '../assets/chatbubble-outline.svg';

export default function ReportIssuePage() {
  const [showPopup, setShowPopup] = useState(false);
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileMessage, setFileMessage] = useState('Pridėkite nuotrauką...');
  const [fileMessageColor, setFileMessageColor] = useState('#B0B0B0');
  const [comment, setComment] = useState('');
  const [canSend, setCanSend] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [help, setHelp] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [settings, setSettings] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [disabledAll, setDisabledAll] = useState(false);
  const [goBack, setGoBack] = useState(false);
  const [isDetectionDisabled, setIsDetectionDisabled] = useState(false);
  const [isSiteDisabled, setIsSiteDisabled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetTimeoutRef = useRef<number | null>(null);

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
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) setUrl(tabs[0].url);
      });
    }
  }, []);

  useEffect(() => {
    setCanSend(file !== null && comment.trim() !== '');
  }, [file, comment]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith('image/')) {
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      setFile(f);
      setFileMessage('Nuotrauka pridėta sėkmingai!');
      setFileMessageColor('#14AE5C');
      resetTimeoutRef.current = setTimeout(() => {
        setFileMessage(f.name);
        setFileMessageColor('#3D36A4');
      }, 3000);
    }
  }

  function handleClearFile() {
    if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    setFile(null);
    setFileMessage('Pridėkite nuotrauką...');
    setFileMessageColor('#B0B0B0');
  }

  function handleIconClick() {
    if (file) {
      handleClearFile();
    } else {
      fileInputRef.current?.click();
    }
  }

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

  if (goBack) return <LoadingPage />;
  if (thanks) return <ThanksPage />;
  if (help) return <HelpPage />;
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
      <ToolbarButton src={HelpIcon} onClick={() => setHelp(true)} />
    </>
  );

  const rightButtons = (
    <>
      <ToolbarButton src={AlertIcon} bg="#FFFFFF" />
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
          margin: 3px 3px;
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

      <div className="w-full h-[283px] flex flex-col items-center justify-center text-[#3D36A4]">
        <div className="w-[485px] h-[267px] rounded-[10px] border-2 border-[#3D36A4]">
          <div className="relative h-[40px] w-full rounded-t-[7px] bg-[#3D36A4] text-white text-[20px] font-bold flex items-center justify-center">
            <div
              className="absolute top-[-2px] left-[-2px] w-[42px] h-[42px] flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: '#6B67D3', borderRadius: '10px', borderBottomLeftRadius: '0px' }}
              onClick={() => setGoBack(true)}
            >
              <img src={ArrowBackIcon} alt="back" className="w-[32px] h-[32px]" />
            </div>
            Pranešimas apie klaidą
          </div>

          <div className="px-[7px] pt-[7px] space-y-[8px]">
            <div className="w-[469px] h-[42px] border-2 border-[#3D36A4] rounded-[6px] flex overflow-hidden">
              <div className="w-[42px] h-full bg-[#3D36A4] flex items-center justify-center flex-shrink-0">
                <img src={LinkIcon} className="w-[30px] h-[30px] ml-[-1px]" alt="url" />
              </div>
              <div className="flex-1 overflow-hidden pr-[10px]">
                <ScrollingText
                  content={url}
                  containerClassName="flex items-center pl-[8px] text-[16px] font-bold h-full"
                  maxWidth={400}
                />
              </div>
            </div>

            <div className="w-[469px] h-[42px] border-2 border-[#3D36A4] rounded-[6px] flex items-center justify-between">
              <div className="w-[42px] h-[42px] bg-[#3D36A4] flex items-center justify-center rounded-l-[5px]">
                <img src={AttachmentIcon} className="w-[30px] h-[30px] ml-[-1px]" alt="attach" />
              </div>
              <div
                className="w-[385px] text-[16px] font-bold truncate text-left"
                style={{ color: fileMessageColor, paddingLeft: '8px' }}
              >
                {fileMessage}
              </div>
              <div
                className="w-[30px] h-[30px] bg-[#6B67D3] rounded-[4px] flex items-center justify-center cursor-pointer mr-[4px]"
                onClick={handleIconClick}
              >
                <img
                  src={CloseIcon}
                  className={`w-[26px] h-[26px] transition-transform ${file ? 'rotate-0' : 'rotate-45'}`}
                  alt="plus"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="w-[469px] h-[73px] border-2 border-[#3D36A4] rounded-[6px] flex">
              <div className="w-[42px] h-full bg-[#3D36A4] flex items-center justify-center rounded-l-[3px]">
                <img src={MessageIcon} className="w-[26px] h-[26px] mt-[-3px]" alt="comment" />
              </div>
              <div className="flex-1 pl-[2px] pr-[3px]">
                <textarea
                  placeholder="Įveskite komentarą..."
                  className="w-full h-full resize-none text-[16px] px-[8px] py-[6px] outline-none placeholder:text-[#B0B0B0] rounded-[4px] overflow-y-auto"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-center mt-[-1px]">
              <div 
                className="relative"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <button
                  disabled={!canSend}
                  onClick={canSend ? () => setThanks(true) : undefined}
                  className="w-[468px] h-[30px] rounded-[6px] flex justify-center items-center text-white font-bold leading-[14px]"
                  style={{
                    backgroundColor: canSend ? '#6B67D3' : '#939393',
                    cursor: canSend ? 'pointer' : 'not-allowed',
                    fontSize: '16px'
                  }}
                >
                  Išsiųsti
                </button>
                {isHovered && !canSend && (
                  <>
                    <div
                      className="absolute z-30 top-3 left-1/2 transform -translate-x-1/2 -translate-y-[calc(100%+10px)] w-0 h-0"
                      style={{
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '10px solid #000000',
                      }}
                    />
                    
                    <div
                      className="absolute z-30 mt-[-17px] left-1/2 transform -translate-x-1/2 -translate-y-[calc(100%+20px)] px-3 py-2 rounded-[4px] text-white font-bold text-[14px] whitespace-nowrap"
                      style={{ backgroundColor: '#000000', opacity: 1 }}
                    >
                      {!file && !comment.trim() 
                        ? 'Būtina pridėti nuotrauką ir komentarą!' 
                        : !file 
                        ? 'Būtina pridėti nuotrauką!' 
                        : 'Būtina įvesti komentarą!'}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}