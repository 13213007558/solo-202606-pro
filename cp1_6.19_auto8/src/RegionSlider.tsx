import React, { useEffect, useState } from 'react';
import { Region, ALL_REGIONS, REGION_LABELS, CULTURE_COLORS, CultureType } from './SimulationEngine';

interface RegionSliderProps {
  activeRegions: Region[];
  onChange: (regions: Region[]) => void;
  orientation?: 'horizontal' | 'vertical';
}

const REGION_COLOR: Record<Region, CultureType> = {
  Asia: 'Eastern',
  Europe: 'Western',
  Africa: 'African',
  Americas: 'SouthAmerican',
  Oceania: 'Western'
};

const REGION_ICON: Record<Region, string> = {
  Asia: '🌏',
  Europe: '🏰',
  Africa: '🦁',
  Americas: '🏔️',
  Oceania: '🏝️'
};

const RegionSlider: React.FC<RegionSliderProps> = ({
  activeRegions,
  onChange,
  orientation = 'horizontal'
}) => {
  const activeSet = new Set(activeRegions);
  const [hoveredRegion, setHoveredRegion] = useState<Region | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const checkNarrow = () => setIsNarrow(window.innerWidth < 768);
    checkNarrow();
    window.addEventListener('resize', checkNarrow);
    return () => window.removeEventListener('resize', checkNarrow);
  }, []);

  const finalOrientation = isNarrow ? 'vertical' : orientation;

  const toggleRegion = (region: Region) => {
    if (activeSet.has(region)) {
      if (activeSet.size === 1) return;
      const next = activeRegions.filter(r => r !== region);
      onChange(next);
    } else {
      const next = [...activeRegions, region].sort(
        (a, b) => ALL_REGIONS.indexOf(a) - ALL_REGIONS.indexOf(b)
      );
      onChange(next);
    }
  };

  const selectAll = () => {
    onChange([...ALL_REGIONS]);
  };

  const containerStyle: React.CSSProperties = finalOrientation === 'vertical'
    ? {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 8px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 14,
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }
    : {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 14,
        border: '1px solid rgba(255, 255, 255, 0.06)'
      };

  const labelStyle: React.CSSProperties = finalOrientation === 'vertical'
    ? {
        fontSize: 12,
        color: '#9090a8',
        padding: '2px 6px 4px',
        fontWeight: 600,
        letterSpacing: 0.5
      }
    : {
        fontSize: 13,
        color: '#9090a8',
        fontWeight: 600,
        letterSpacing: 0.5,
        whiteSpace: 'nowrap'
      };

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>
        {finalOrientation === 'vertical' ? '地区筛选' : '🌐 地区筛选'}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: finalOrientation === 'vertical' ? 'column' : 'row',
          gap: finalOrientation === 'vertical' ? 6 : 8,
          flex: 1
        }}
      >
        {ALL_REGIONS.map(region => {
          const isActive = activeSet.has(region);
          const isHovered = hoveredRegion === region;
          const color = CULTURE_COLORS[REGION_COLOR[region]];

          return (
            <button
              key={region}
              onClick={() => toggleRegion(region)}
              onMouseEnter={() => setHoveredRegion(region)}
              onMouseLeave={() => setHoveredRegion(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: finalOrientation === 'vertical' ? 'flex-start' : 'center',
                gap: 6,
                padding: finalOrientation === 'vertical' ? '7px 10px' : '8px 14px',
                borderRadius: 10,
                border: `1.5px solid ${isActive ? color : 'rgba(255,255,255,0.08)'}`,
                background: isActive
                  ? `linear-gradient(135deg, ${color}22, ${color}08)`
                  : 'rgba(255, 255, 255, 0.02)',
                color: isActive ? '#ffffff' : '#8a8aa0',
                fontWeight: isActive ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 180ms ease',
                transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: isActive ? `0 0 16px ${color}22` : 'none'
              }}
              title={`${REGION_LABELS[region]}（点击${isActive ? '取消' : '选择'}）`}
            >
              <span style={{ fontSize: 16 }}>{REGION_ICON[region]}</span>
              <span style={{ whiteSpace: 'nowrap' }}>{REGION_LABELS[region]}</span>
              {isActive && (
                <span
                  style={{
                    marginLeft: finalOrientation === 'vertical' ? 'auto' : 2,
                    display: 'inline-block',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 6px ${color}`
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {activeRegions.length < ALL_REGIONS.length && (
        <button
          onClick={selectAll}
          style={{
            padding: finalOrientation === 'vertical' ? '7px 10px' : '6px 12px',
            borderRadius: 8,
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            background: 'transparent',
            color: '#707090',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 150ms ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#a0a0c0';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#707090';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          }}
        >
          全部显示
        </button>
      )}
    </div>
  );
};

export default RegionSlider;
