/**
 * SplitView — renders two EditorCanvas panels stacked,
 * both pointing to the same TipTap editor instance.
 */
import React from 'react'
import type { Editor } from '@tiptap/react'
import EditorCanvas from '../Editor/EditorCanvas'
import type { ColumnCount } from '../Editor/EditorCanvas'
import type { PageConfig } from '../PageSetup/PageSetupDialog'
import type { PageBorderConfig } from '../PageBorder/PageBorderDialog'
import type { WatermarkConfig } from '../Watermark/WatermarkDialog'
import type { DocGridConfig } from '../DocGrid/DocGridDialog'

interface SplitViewProps {
  editor: Editor | null
  columns?: ColumnCount
  pageConfig?: PageConfig
  pageBorder?: PageBorderConfig
  watermark?: WatermarkConfig
  docGrid?: DocGridConfig
  readOnly?: boolean
  isVertical?: boolean
  pageBg?: { type: string; color?: string }
  themeClass?: string
}

const SplitView: React.FC<SplitViewProps> = ({
  editor,
  columns,
  pageConfig,
  pageBorder,
  watermark,
  docGrid,
  readOnly,
  isVertical,
  pageBg,
  themeClass,
}) => {
  const shared = { editor, columns, pageConfig, pageBorder, watermark, docGrid, readOnly, isVertical, showRuler: false, pageBg, themeClass }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Top pane */}
      <div className="flex-1 overflow-hidden border-b-2 border-blue-400 relative">
        <div className="absolute top-1 right-2 z-10 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded pointer-events-none">窗格 1</div>
        <EditorCanvas {...shared} />
      </div>
      {/* Divider */}
      <div className="h-1.5 bg-blue-300 flex-shrink-0" />
      {/* Bottom pane */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute top-1 right-2 z-10 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded pointer-events-none">窗格 2</div>
        <EditorCanvas {...shared} />
      </div>
    </div>
  )
}

export default SplitView
