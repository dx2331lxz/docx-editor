/**
 * Basic English spell-check extension.
 * Uses a built-in common word list; marks unknown words with a red wavy decoration.
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { EditorState } from '@tiptap/pm/state'

// Common English words list (enough for basic spell check demo)
const COMMON_WORDS = new Set([
  'a','able','about','above','after','again','against','age','ago','all','also','although',
  'always','among','an','and','another','any','are','area','around','as','ask','at','away',
  'back','be','because','been','before','being','below','between','both','but','by',
  'came','can','case','cause','come','could','day','did','do','does','doing','done','down',
  'during','each','early','end','even','ever','every','example','fact','far','few','find',
  'first','follow','for','form','found','from','full','get','give','go','good','great','had',
  'hand','has','have','he','head','help','her','here','high','him','his','home','how','i',
  'if','in','into','is','it','its','itself','just','keep','know','last','left','let','life',
  'like','line','long','look','made','make','man','many','may','me','might','more','most',
  'move','much','my','name','need','never','new','next','no','not','now','number','of',
  'off','often','old','on','once','only','open','or','other','our','out','over','own',
  'part','people','place','play','point','put','read','right','run','said','same','say',
  'see','seem','set','several','she','should','show','side','so','some','sometimes','still',
  'such','take','than','that','the','their','them','then','there','these','they','thing',
  'think','this','those','though','through','time','to','together','too','turn','two',
  'under','until','up','use','very','want','was','way','we','well','went','were','what',
  'when','where','whether','which','while','who','why','will','with','without','work','would',
  'write','year','you','your','yours','yourself','before','after','hello','world','text',
  'document','edit','view','file','format','insert','help','tools','table','image','link',
  'page','style','font','size','color','bold','italic','align','list','indent','paragraph',
  'heading','title','body','section','chapter','content','design','layout',
  // common additional
  'ok','yes','no','please','thank','thanks','sorry','dear','regards','sincerely',
  'date','name','address','email','phone','city','state','country','zip',
  'true','false','null','undefined','function','class','return','type','interface',
])

function isEnglishWord(word: string): boolean {
  return /^[a-zA-Z]+$/.test(word)
}

function isCorrect(word: string): boolean {
  return COMMON_WORDS.has(word.toLowerCase()) || word.length <= 2
}

function buildDecorations(state: EditorState): DecorationSet {
  const decorations: Decoration[] = []
  const wordRe = /[a-zA-Z]{3,}/g

  state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return
    let match: RegExpExecArray | null
    wordRe.lastIndex = 0
    while ((match = wordRe.exec(node.text)) !== null) {
      const word = match[0]
      if (isEnglishWord(word) && !isCorrect(word)) {
        const from = pos + match.index
        const to = from + word.length
        decorations.push(
          Decoration.inline(from, to, {
            class: 'spell-error',
            'data-word': word,
          })
        )
      }
    }
  })

  return DecorationSet.create(state.doc, decorations)
}

const spellCheckKey = new PluginKey('spellCheck')

export const SpellCheck = Extension.create({
  name: 'spellCheck',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: spellCheckKey,
        state: {
          init(_, state) {
            return buildDecorations(state)
          },
          apply(tr, decorations, _, newState) {
            if (tr.docChanged) {
              return buildDecorations(newState)
            }
            return decorations.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return spellCheckKey.getState(state) as DecorationSet
          },
        },
      }),
    ]
  },
})
