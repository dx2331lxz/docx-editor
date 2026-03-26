/**
 * ResizableImageExtension — extends the default TipTap Image extension
 * with extra attributes (width, align, caption) and a custom NodeView.
 */

import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageView } from '../components/Image/ResizableImage'

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width'),
        renderHTML: (attrs) => attrs.width ? { width: attrs.width, style: `width:${attrs.width}px` } : {},
      },
      align: {
        default: 'left',
        parseHTML: (el) => el.getAttribute('data-align') || 'left',
        renderHTML: (attrs) => ({ 'data-align': attrs.align }),
      },
      caption: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-caption') || '',
        renderHTML: (attrs) => attrs.caption ? { 'data-caption': attrs.caption } : {},
      },
      textWrap: {
        default: 'inline',
        parseHTML: (el) => el.getAttribute('data-text-wrap') || 'inline',
        renderHTML: (attrs) => ({ 'data-text-wrap': attrs.textWrap }),
      },
      brightness: {
        default: 100,
        parseHTML: (el) => parseInt(el.getAttribute('data-brightness') || '100'),
        renderHTML: (attrs) => attrs.brightness !== 100 ? { 'data-brightness': attrs.brightness } : {},
      },
      contrast: {
        default: 100,
        parseHTML: (el) => parseInt(el.getAttribute('data-contrast') || '100'),
        renderHTML: (attrs) => attrs.contrast !== 100 ? { 'data-contrast': attrs.contrast } : {},
      },
      imgStyle: {
        default: 'none',
        parseHTML: (el) => el.getAttribute('data-img-style') || 'none',
        renderHTML: (attrs) => attrs.imgStyle !== 'none' ? { 'data-img-style': attrs.imgStyle } : {},
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView as Parameters<typeof ReactNodeViewRenderer>[0])
  },
})
