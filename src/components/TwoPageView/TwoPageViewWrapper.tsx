import React from 'react'
import { Editor } from '@tiptap/react'
import EditorCanvas from '../Editor/EditorCanvas'
import type { PageConfig } from '../PageSetup/PageSetupDialog'
import type { PageBorderConfig } from '../PageBorder/PageBorderDialog'
import type { WatermarkConfig } from '../Watermark/WatermarkDialog'
import type { DocGridConfig } from '../DocGrid/DocGridDialog'
import type { PageBgConfig } from '../PageBackground/PageBackgroundDialog'

interface TwoPageViewWrapperProps {
  editor: Editor | null
  showRuler?: boolean
  pageConfig?: PageConfig
  pageBorder?: PageBorderConfig
  watermark?: WatermarkConfig
  docGrid?: DocGridConfig
  isVertical?: boolean
  pageBg?: PageBgConfig
  themeClass?: string
  headerContent?: string
  footerContent?: string
  onHeaderChange?: (v: string) => void
  onFooterChange?: (v: string) => void
  headerFooterMode?: 'off' | 'header' | 'footer'
  onEditHeader?: () => void
  onEditFooter?: () => void
  onExitHeaderFooter?: () => void
  readOnly?: boolean
  onInsertComment?: () => void
  onTranslate?: (text: string) => void
  onExitTwoPage: () => void
}

const TwoPageViewWrapper: React.FC<TwoPageViewWrapperProps> = ({
  editor,
  showRuler,
  pageConfig,
  pageBorder,
  watermark,
  docGrid,
  isVertical,
  pageBg,
  themeClass,
  headerContent,
  footerContent,
  onHeaderChange,
  onFooterChange,
  headerFooterMode,
  onEditHeader,
  onEditFooter,
  onExitHeaderFooter,
  readOnly,
  onInsertComment,
  onTranslate,
  onExitTwoPage,
}) => {
  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#cbd5e1', display: 'flex', flexDirection: 'column' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 20px', background: '#1e40af', color: '#fff', fontSize: 12, flexShrink: 0
      }}>
        <span>📖 双页视图 — 适合书籍/杂志排版预览</span>
        <button
          onClick={onExitTwoPage}
          style={{ padding: '3px 12px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 4, color: '#fff', cursor: 'pointer', fontSize: 12 }}
        >
          ✕ 退出双页视图
        </button>
      </div>

      {/* Two-page layout */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 24,
        padding: '24px 40px',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflow: 'auto',
      }}>
        {/* Left page (page 1) */}
        <div style={{
          width: 'calc(210mm)',
          minHeight: '297mm',
          background: '#fff',
          boxShadow: '4px 0 16px rgba(0,0,0,0.15), -2px 0 8px rgba(0,0,0,0.08)',
          borderRadius: '2px 0 0 2px',
          position: 'relative',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '2.54cm', minHeight: '297mm', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textAlign: 'center', fontStyle: 'italic' }}>第 1 页</div>
            {/* Mirror of editor - left page shows live content */}
            <EditorCanvas
              editor={editor}
              showRuler={false}
              pageConfig={pageConfig}
              pageBorder={pageBorder}
              watermark={watermark}
              docGrid={docGrid}
              isVertical={isVertical}
              pageBg={pageBg}
              themeClass={themeClass}
              headerContent={headerContent}
              footerContent={footerContent}
              onHeaderChange={onHeaderChange}
              onFooterChange={onFooterChange}
              headerFooterMode={headerFooterMode || 'off'}
              onEditHeader={onEditHeader}
              onEditFooter={onEditFooter}
              onExitHeaderFooter={onExitHeaderFooter}
              readOnly={readOnly}
              onInsertComment={onInsertComment}
              onTranslate={onTranslate}
              columns={1}
            />
          </div>
        </div>

        {/* Spine */}
        <div style={{
          width: 8,
          minHeight: '297mm',
          background: 'linear-gradient(to right, #94a3b8, #64748b, #94a3b8)',
          boxShadow: '0 0 12px rgba(0,0,0,0.3)',
          flexShrink: 0,
          alignSelf: 'stretch',
        }} />

        {/* Right page (page 2 - blank preview) */}
        <div style={{
          width: 'calc(210mm)',
          minHeight: '297mm',
          background: '#fff',
          boxShadow: '-4px 0 16px rgba(0,0,0,0.15), 2px 0 8px rgba(0,0,0,0.08)',
          borderRadius: '0 2px 2px 0',
          position: 'relative',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '2.54cm', flex: 1, boxSizing: 'border-box', minHeight: '297mm' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, textAlign: 'center', fontStyle: 'italic' }}>第 2 页</div>
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#cbd5e1',
              fontSize: 13,
              gap: 8,
            }}>
              <span style={{ fontSize: 40 }}>📄</span>
              <span>下一页内容将显示在此</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 20px', background: '#1e293b', color: '#94a3b8', fontSize: 11, textAlign: 'center', flexShrink: 0 }}>
        双页视图仅供预览，编辑操作在左侧页面生效 · 按 Esc 退出
      </div>
    </div>
  )
}

export default TwoPageViewWrapper
