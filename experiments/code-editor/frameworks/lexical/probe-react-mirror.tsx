// Proves: @lexical/react's LexicalComposer + useLexicalComposerContext render through godot-react-ui (no react-dom), with an
// editor that has NO root element, mirrored into <Text> rows by our own plugin. Shows what the plugins that DO need
// react-dom are (PlainTextPlugin, RichTextPlugin) and how input would have to be fed (commands, since the DOM event layer is gone).
//
//   node_modules/.bin/tsx experiments/code-editor/frameworks/lexical/probe-react-mirror.tsx
import { createElement as h, useEffect, useState, type ReactElement } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createTextNode, $createLineBreakNode, $getRoot, $isLineBreakNode, UNDO_COMMAND, type LexicalEditor,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { $createCodeNode, $isCodeNode, $isCodeHighlightNode, CodeNode, CodeHighlightNode } from '@lexical/code-core';
import { PrismTokenizer, registerCodeHighlighting } from '@lexical/code-prism';
import { createEmptyHistoryState, registerHistory } from '@lexical/history';
import { Text, View } from '../../../../src';
import { ScrollView } from '../../../../src/kit';
import { mount, type Rendered } from '../../harness/host';

interface Run { text: string; type: string | undefined }
type Line = Run[];

const COLOURS: Record<string, string> = { keyword: '#c678dd', string: '#98c379', comment: '#7f848e', number: '#d19a66', punctuation: '#abb2bf' };

function readLines(editor: LexicalEditor): Line[] {
  return editor.getEditorState().read(() => {
    const lines: Line[] = [[]];
    for (const block of $getRoot().getChildren()) {
      if (!$isCodeNode(block)) continue;
      for (const child of block.getChildren()) {
        if ($isLineBreakNode(child)) lines.push([]);
        else if ($isCodeHighlightNode(child)) lines[lines.length - 1]?.push({ text: child.getTextContent(), type: child.getHighlightType() ?? undefined });
      }
    }
    return lines;
  });
}

let editorSeen: LexicalEditor | undefined;
let renderCount = 0;

/** The mirror plugin: registers the headless-capable pieces and renders the token runs of the editor state. */
function Mirror(): ReactElement {
  const [editor] = useLexicalComposerContext();
  editorSeen = editor;
  const [lines, setLines] = useState<Line[]>([]);
  renderCount += 1;
  useEffect(() => mergeRegister(
    registerCodeHighlighting(editor, PrismTokenizer),
    registerHistory(editor, createEmptyHistoryState(), 0),
    editor.registerUpdateListener(({ editorState }) => { void editorState; setLines(readLines(editor)); }),
  ), [editor]);
  useEffect(() => {
    editor.update(() => {
      const code = $createCodeNode('typescript');
      code.append($createTextNode('const answer: number = 42; // the answer'), $createLineBreakNode(), $createTextNode('export default answer;'));
      $getRoot().append(code);
    }, { discrete: true });
  }, [editor]);
  return h(ScrollView, { className: 'w-[600px] h-[200px]' },
    ...lines.map((line, index) => h(View, { key: index, className: 'flex-row shrink-0', style: { height: 20 } },
      ...line.map((run, at) => h(Text, { key: at, style: { color: COLOURS[run.type ?? ''] ?? '#ffffff' } }, run.text)))));
}

async function settle(): Promise<void> { for (let i = 0; i < 4; i += 1) await new Promise((resolve) => setTimeout(resolve, 5)); }

async function main(): Promise<void> {
  let rendered: Rendered;
  try {
    rendered = await mount(h(LexicalComposer, {
      initialConfig: { namespace: 'probe', nodes: [CodeNode, CodeHighlightNode], onError: (error: Error) => { throw error; } },
    }, h(Mirror)));
  } catch (error) {
    console.log('mount THROWS:', error instanceof Error ? error.stack?.split('\n').slice(0, 4).join(' | ') : error);
    return;
  }
  await settle();
  console.log('render errors', rendered.errors.map((e) => e.message));
  console.log('editor root element:', editorSeen?.getRootElement(), '| editable', editorSeen?.isEditable(), '| Mirror renders', renderCount);
  console.log(rendered.outline());
  const colours = rendered.nodes().filter((n) => n.kind === 'text').map((n) => `${JSON.stringify(n.text)}`).slice(0, 6);
  console.log('first Text runs:', colours.join(' '));

  // type: with no DOM there is no beforeinput/keydown translation, so input is applied through the editor API/commands
  editorSeen?.update(() => {
    // LexicalComposer's default initial state is one empty paragraph, so the code block is not the first child.
    const code = $getRoot().getChildren().find($isCodeNode);
    const first = code?.getFirstChild();
    if (first !== null && first !== undefined && $isCodeHighlightNode(first)) first.spliceText(0, 0, '// ', true);
  }, { discrete: true });
  await settle();
  console.log('editor text now:', JSON.stringify(editorSeen?.getEditorState().read(() => $getRoot().getTextContent())));
  console.log('after an edit:', rendered.nodes().filter((n) => n.kind === 'text').map((n) => n.text).slice(0, 4).join(' | '));
  editorSeen?.dispatchCommand(UNDO_COMMAND, undefined);
  await settle();
  console.log('after UNDO_COMMAND:', rendered.nodes().filter((n) => n.kind === 'text').map((n) => n.text).slice(0, 4).join(' | '));
  rendered.unmount();
}
main().catch((error) => { console.error('probe failed:', error); process.exitCode = 1; });
