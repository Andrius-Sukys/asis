import React from 'react';

export interface ToolbarButtonProps {
  src: string;
  shiftLeft?: boolean;
  bg?: string;
  onClick?: () => void;
  forceSmall?: boolean;
  disabled?: boolean;
  isShieldIcon?: boolean;
  isDetectionDisabled?: boolean;
  isSiteDisabled?: boolean;
  isLeftmostButton?: boolean;
  isRightmostButton?: boolean;
}

export interface HeaderProps {
  leftButtons: React.ReactNode;
  rightButtons: React.ReactNode;
  bgColor?: string;
  isDetectionDisabled?: boolean;
  isSiteDisabled?: boolean;
}

interface TooltipProps {
  text: string;
  isLeftmostButton?: boolean;
  isRightmostButton?: boolean;
}

function Tooltip({ text, isLeftmostButton = false, isRightmostButton = false }: TooltipProps) {
  return (
    <>
      <div
        className="top-[20px] absolute z-30 bottom-0 left-1/2 transform -translate-x-1/2 translate-y-[calc(100%+10px)] w-0 h-0"
        style={{
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '10px solid #000000',
        }}
      />
      
      <div
        className={`absolute z-30 top-[-6px] translate-y-[calc(100%+20px)] px-3 py-2 rounded-[4px] text-white font-bold text-[14px] whitespace-nowrap ${
          isLeftmostButton
            ? 'left-0'
            : isRightmostButton
            ? 'right-0'
            : 'left-1/2 transform -translate-x-1/2'
        }`}
        style={{ backgroundColor: '#000000', opacity: 1 }}
      >
        {text}
      </div>
    </>
  );
}

export function ToolbarButton({
  src,
  shiftLeft = false,
  bg = '#6B67D3',
  onClick,
  forceSmall = false,
  disabled = false,
  isShieldIcon = false,
  isDetectionDisabled = false,
  isLeftmostButton = false,
  isRightmostButton = false,
}: ToolbarButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  let tooltipText: string | null = null;
  if (isShieldIcon) {
    tooltipText = isDetectionDisabled ? 'Įjungti' : 'Išjungti';
  } else if (src.includes('settings-outline')) {
    tooltipText = 'Nustatymai';
  } else if (src.includes('help-outline')) {
    tooltipText = 'Pagalba';
  } else if (src.includes('alert-outline')) {
    tooltipText = 'Pranešti apie klaidą';
  } else if (src.includes('refresh-outline')) {
    tooltipText = 'Perkrauti';
  } else if (src.includes('x-outline')) {
    tooltipText = 'Uždaryti';
  }

  return (
    <div
      className={`relative w-10 h-10 flex items-center justify-center rounded-[10px] ${
        disabled ? 'cursor-default' : 'cursor-pointer'
      } transition-all duration-200`}
      style={{ backgroundColor: bg }}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={src}
        alt=""
        className={`h-[36px] ${forceSmall ? 'w-[28px]' : 'w-9'} ${
          shiftLeft ? 'translate-x-[-1px]' : ''
        }`}
      />
      {isHovered && tooltipText && (
        <Tooltip
          text={tooltipText}
          isLeftmostButton={isLeftmostButton}
          isRightmostButton={isRightmostButton}
        />
      )}
    </div>
  );
}

export function Spacer() {
  return <div className="w-[7px]" />;
}

export function Header({
  leftButtons,
  rightButtons,
  bgColor = '#3D36A4',
  isDetectionDisabled = false,
  isSiteDisabled = false,
}: HeaderProps) {
  const modifiedLeftButtons = React.Children.map(leftButtons, (child, index) => {
    if (React.isValidElement<ToolbarButtonProps>(child) && child.type === ToolbarButton) {
      if (index === 0) {
        return React.cloneElement(child, {
          isShieldIcon: true,
          isDetectionDisabled,
          isSiteDisabled,
          isLeftmostButton: true,
        });
      }
    }
    return child;
  });

  const rightButtonsArray = React.Children.toArray(rightButtons);
  const modifiedRightButtons = React.Children.map(rightButtons, (child, index) => {
    if (React.isValidElement<ToolbarButtonProps>(child) && child.type === ToolbarButton) {
      if (index === rightButtonsArray.length - 1) {
        return React.cloneElement(child, {
          isRightmostButton: true,
        });
      }
    }
    return child;
  });

  return (
    <div className="relative w-full h-[54px] flex items-center" style={{ backgroundColor: bgColor }}>
      <div className="flex items-center absolute left-0 pl-[7px]">{modifiedLeftButtons}</div>

      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <h1
          className="text-white font-bold"
          style={{ fontSize: '24px', fontFamily: '"ADLaM Display", sans-serif' }}
        >
          AŠIS
        </h1>
      </div>

      <div className="flex items-center absolute right-0 pr-[7px]">{modifiedRightButtons}</div>
    </div>
  );
}

export interface PopupContentProps {
  onClose: () => void;
  onDisableAll: () => void;
  onDisableSite: () => void;
  isDetectionDisabled: boolean;
  isSiteDisabled: boolean;
  shieldIcon: string;
  bgColor?: string;
  borderColor?: string;
}

export function PopupContent({
  onClose,
  onDisableAll,
  onDisableSite,
  isDetectionDisabled,
  isSiteDisabled,
  shieldIcon,
  bgColor = '#6B67D3',
  borderColor = '#6B67D3',
}: PopupContentProps) {
  const [hoveredButton, setHoveredButton] = React.useState<'all' | 'site' | null>(null);

  return (
    <div className="absolute top-0 left-0 z-20" style={{ width: '170px' }}>
      <div
        className="text-white rounded-t-[10px] h-[40px] px-3 font-bold text-left flex items-center text-[16px] cursor-pointer"
        style={{ backgroundColor: bgColor }}
        onClick={onClose}
      >
        <img
          src={isDetectionDisabled || isSiteDisabled ? shieldIcon : shieldIcon}
          className="ml-[-5px] h-[28px] mr-3"
          alt=""
        />
        Išjungti aptikimą
      </div>
      <div className="bg-white rounded-b-[10px] overflow-hidden" style={{ border: `1px solid ${borderColor}` }}>
        <div
          className="h-[24px] w-full text-center text-[14px] font-semibold flex items-center justify-center cursor-pointer transition-colors duration-200"
          style={{
            color: hoveredButton === 'all' ? 'white' : borderColor,
            backgroundColor: hoveredButton === 'all' ? borderColor : 'transparent',
          }}
          onClick={onDisableAll}
          onMouseEnter={() => setHoveredButton('all')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          Visuose tinklapiuose
        </div>
        <div className="h-[1px] w-full" style={{ backgroundColor: borderColor }}></div>
        <div
          className="h-[24px] w-full text-center text-[14px] font-semibold flex items-center justify-center cursor-pointer transition-colors duration-200"
          style={{
            color: hoveredButton === 'site' ? 'white' : borderColor,
            backgroundColor: hoveredButton === 'site' ? borderColor : 'transparent',
          }}
          onClick={onDisableSite}
          onMouseEnter={() => setHoveredButton('site')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          Tik šiame tinklapyje
        </div>
      </div>
    </div>
  );
}

export interface LoadingShieldProps {
  fillPercentage: number;
  shieldIcon: string;
  size?: number;
  fillColor?: string;
}

export function LoadingShield({
  fillPercentage,
  shieldIcon,
  size = 100,
  fillColor = '#6B67D3',
}: LoadingShieldProps) {
  const clipPath = 'polygon(50% 15%, 79% 20%, 80% 40%, 76% 70%, 50% 85%, 20% 70%, 20% 30%, 30% 15%)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <img
        src={shieldIcon}
        alt="shield"
        className="absolute top-0 left-0 z-10"
        style={{ width: size, height: size }}
      />
      <div
        className="absolute top-0 left-0 overflow-hidden"
        style={{
          width: size,
          height: size,
          clipPath: clipPath,
        }}
      >
        <div
          className="absolute bottom-0 left-0 w-full transition-all duration-100 ease-linear"
          style={{
            height: `${fillPercentage}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
    </div>
  );
}

export interface PatternCardProps {
  title: string;
  count: number;
  description: string;
  onClick: () => void;
  bgColor?: string;
  accentColor?: string;
  bookIcon: string;
  arrowIcon: string;
}

export function PatternCard({
  title,
  count,
  description,
  onClick,
  bgColor = '#B20000',
  accentColor = '#BE4343',
  bookIcon,
  arrowIcon,
}: PatternCardProps) {
  return (
    <div
      className="w-[487px] rounded-[10px] text-white font-bold px-[8px] pt-[6px] pb-[6px] mt-[4px] flex justify-between items-start"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex flex-col">
        <div className="text-[16px] leading-tight">{title}</div>
        <div
          className="w-[410px] h-[50px] mt-[6px] border-[2px] border-white bg-white rounded-r-[4px] rounded-l-[6px] text-[12px] font-bold px-[4px] py-[3px] flex"
          style={{ color: accentColor }}
        >
          <div
            className="w-[40px] h-[40px] rounded-[3px] flex items-center justify-center mr-[5px] flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            <img src={bookIcon} className="w-[30px] h-[30px]" alt="book" />
          </div>
          <div className="leading-[13px] ml-[2px] mr-[1px] text-left text-justify">{description}</div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between h-[78px] ml-[6px] mr-[6px]">
        <div
          className="w-[57px] h-[36px] bg-white rounded-tl-[2px] rounded-tr-[6px] text-[24px] font-bold flex items-center justify-center"
          style={{ color: bgColor }}
        >
          {count}
        </div>
        <div
          className="w-[57px] h-[36px] rounded-bl-[2px] rounded-br-[6px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
          style={{ backgroundColor: accentColor }}
          onClick={onClick}
        >
          <img src={arrowIcon} className="w-[29px] h-[29px]" alt="go" />
        </div>
      </div>
    </div>
  );
}

export interface SettingsToggleProps {
  label: string;
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
  accentColor?: string;
}

export function SettingsToggle({
  label,
  value,
  onChange,
  disabled = false,
  accentColor = '#6B67D3',
}: SettingsToggleProps) {
  return (
    <div
      className="w-[469px] h-[42px] rounded-[6px] border-2 border-[#3D36A4] flex items-center justify-between px-[10px] text-[14px] font-bold"
      style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer' }}
    >
      <span>{label}</span>
      <div
        onClick={disabled ? undefined : onChange}
        className={`w-[44px] h-[22px] rounded-full flex items-center px-1 transition-all duration-200 ${
          disabled ? 'cursor-default' : 'cursor-pointer'
        }`}
        style={{ backgroundColor: value ? accentColor : '#D1D5DB' }}
      >
        <div
          className={`w-[14px] h-[14px] rounded-full bg-white transition-transform duration-200 ${
            value ? 'translate-x-[22px]' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
}

export interface ScrollingTextProps {
  content: string;
  containerClassName?: string;
  textClassName?: string;
  maxWidth?: number;
}

export function ScrollingText({
  content,
  containerClassName = '',
  textClassName = '',
  maxWidth = 300,
}: ScrollingTextProps) {
  const [scrollDistance, setScrollDistance] = React.useState('0px');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = maxWidth;
      const textWidth = textRef.current.scrollWidth;
      const distance = textWidth > containerWidth ? `-${textWidth - containerWidth}px` : '0px';
      setScrollDistance(distance);
    }
  }, [content, maxWidth]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${containerClassName}`} style={{ maxWidth }}>
      <div
        ref={textRef}
        className={`whitespace-nowrap ${textClassName}`}
        style={
          {
            animation: scrollDistance !== '0px' ? 'scroll-left-then-back 10s ease-in-out infinite' : undefined,
            '--scroll-distance': scrollDistance,
          } as React.CSSProperties
        }
      >
        {content}
      </div>
    </div>
  );
}