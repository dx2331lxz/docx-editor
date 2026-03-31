/**
 * MarginPresetsPanel — WPS-style margin preset picker portal dropdown.
 * Shows 4 standard presets + "自定义页边距..." entry.
 */
import React, { useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import type { PageConfig } from '../PageSetup/PageSetupDialog'

export interface MarginPreset {
    id: string
    label: string
    top: number    // cm
    bottom: number
    left: number
    right: number
}

export const MARGIN_PRESETS: MarginPreset[] = [
    { id: 'normal', label: '普通', top: 2.54, bottom: 2.54, left: 3.18, right: 3.18 },
    { id: 'narrow', label: '窄', top: 1.27, bottom: 1.27, left: 1.27, right: 1.27 },
    { id: 'moderate', label: '适中', top: 2.54, bottom: 2.54, left: 1.91, right: 1.91 },
    { id: 'wide', label: '宽', top: 2.54, bottom: 2.54, left: 5.08, right: 5.08 },
]

function fmt(n: number) {
    return n % 1 === 0 ? `${n}` : n.toFixed(2).replace(/\.?0+$/, '')
}

interface Props {
    anchorRect: DOMRect
    currentConfig: PageConfig
    onApply: (partial: Partial<PageConfig>) => void
    onOpenCustom: () => void
    onClose: () => void
}

const MarginPresetsPanel: React.FC<Props> = ({
    anchorRect,
    currentConfig,
    onApply,
    onOpenCustom,
    onClose,
}) => {
    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handlePointerDown = (e: PointerEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('pointerdown', handlePointerDown, true)
        return () => document.removeEventListener('pointerdown', handlePointerDown, true)
    }, [onClose])

    // Position panel below the anchor
    const top = anchorRect.bottom + 4
    const left = anchorRect.left

    const isActive = (p: MarginPreset) =>
        Math.abs(currentConfig.marginTop - p.top) < 0.01 &&
        Math.abs(currentConfig.marginBottom - p.bottom) < 0.01 &&
        Math.abs(currentConfig.marginLeft - p.left) < 0.01 &&
        Math.abs(currentConfig.marginRight - p.right) < 0.01

    return ReactDOM.createPortal(
        <div
            ref={panelRef}
            className="menu-dropdown-light"
            style={{
                position: 'fixed',
                top,
                left,
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 9999,
                width: 220,
                padding: '4px 0',
                color: '#1f2937',
            }}
        >
            {MARGIN_PRESETS.map((preset) => {
                const active = isActive(preset)
                return (
                    <button
                        key={preset.id}
                        onClick={() => {
                            onApply({
                                marginTop: preset.top,
                                marginBottom: preset.bottom,
                                marginLeft: preset.left,
                                marginRight: preset.right,
                            })
                            onClose()
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            width: '100%',
                            padding: '8px 12px',
                            background: active ? '#eff6ff' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f9fafb' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = active ? '#eff6ff' : 'transparent' }}
                    >
                        {/* Mini page icon */}
                        <div style={{
                            width: 28,
                            height: 34,
                            background: '#fff',
                            border: `1px solid ${active ? '#3b82f6' : '#d1d5db'}`,
                            borderRadius: 2,
                            flexShrink: 0,
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            {/* margin guides inside mini page */}
                            <div style={{
                                position: 'absolute',
                                inset: `${Math.round(preset.top / 5.08 * 6)}px ${Math.round(preset.right / 5.08 * 6)}px ${Math.round(preset.bottom / 5.08 * 6)}px ${Math.round(preset.left / 5.08 * 6)}px`,
                                borderTop: `1px solid ${active ? '#93c5fd' : '#d1d5db'}`,
                                borderBottom: `1px solid ${active ? '#93c5fd' : '#d1d5db'}`,
                                borderLeft: `1px solid ${active ? '#93c5fd' : '#d1d5db'}`,
                                borderRight: `1px solid ${active ? '#93c5fd' : '#d1d5db'}`,
                            }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: active ? '#1d4ed8' : '#111827' }}>
                                {preset.label}
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
                                上: {fmt(preset.top)} 下: {fmt(preset.bottom)}<br />
                                左: {fmt(preset.left)} 右: {fmt(preset.right)}
                            </div>
                        </div>
                    </button>
                )
            })}
            <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
            <button
                onClick={() => { onOpenCustom(); onClose() }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#374151',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f9fafb' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
                <span style={{ fontSize: 14 }}>⚙</span>
                自定义页边距(A)...
            </button>
        </div>,
        document.body
    )
}

export default MarginPresetsPanel
