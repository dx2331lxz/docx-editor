/**
 * SectionBreak — custom TipTap Node for section breaks.
 * Supports: next-page, continuous, even-page, odd-page.
 * Renders as a distinctive dashed banner showing the break type.
 */
import { Node, mergeAttributes } from '@tiptap/core'

export type SectionBreakType = 'next-page' | 'continuous' | 'even-page' | 'odd-page'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sectionBreak: {
      insertSectionBreak: (sectionType?: SectionBreakType) => ReturnType
    }
  }
}

const LABELS: Record<SectionBreakType, string> = {
  'next-page': '下一页 分节符',
  'continuous': '连续 分节符',
  'even-page': '偶数页 分节符',
  'odd-page': '奇数页 分节符',
}

export const SectionBreak = Node.create({
  name: 'sectionBreak',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      sectionType: {
        default: 'next-page',
        parseHTML: (el) => el.getAttribute('data-section-type') ?? 'next-page',
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="section-break"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const label = LABELS[(HTMLAttributes.sectionType as SectionBreakType) ?? 'next-page']
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'section-break',
      'data-section-type': HTMLAttributes.sectionType,
      style: 'position:relative; margin:8px 0; user-select:none;',
    }),
      ['div', {
        style: [
          'border-top: 2px dashed #c4b5fd',
          'position: relative',
          'margin: 4px 0',
        ].join(';'),
      },
        ['span', {
          style: [
            'position: absolute',
            'top: -10px',
            'left: 50%',
            'transform: translateX(-50%)',
            'background: white',
            'padding: 0 8px',
            'font-size: 11px',
            'color: #7c3aed',
            'white-space: nowrap',
            'border: 1px solid #c4b5fd',
            'border-radius: 3px',
          ].join(';'),
        }, `══ ${label} ══`],
      ],
    ]
  },

  addCommands() {
    return {
      insertSectionBreak:
        (sectionType: SectionBreakType = 'next-page') =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { sectionType } })
            .run(),
    }
  },

  addKeyboardShortcuts() {
    return {}
  },
})
