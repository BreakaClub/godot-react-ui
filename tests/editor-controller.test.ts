import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorSelection } from '@codemirror/state';
import { SINK_TEXT } from '../demo/src/editor/sink';
import { keyEvent, openEditor, parseMarked, marked } from './editor-helpers';

// The editor's model and keymap, in Node with no Godot and no React: what a key, a typed character, a paste or a pointer press does
// to the text and the selections (demo/src/editor/). Selections are drawn into the text: `|` a caret, `<abc>` a selection.

test('the marks in a test document round-trip', () => {
  for (const text of ['a|b', '<ab>c', '>ab<c', 'a<b>c|d', '|']) {
    const { doc, selection } = parseMarked(text);
    const editor = openEditor(text);
    assert.equal(editor.text(), doc);
    assert.equal(editor.marked(), text);
    assert.ok(selection.ranges.length >= 1);
  }
  assert.equal(marked(openEditor('x|').editor), 'x|');
});

test('typed text replaces the selection, at every caret', () => {
  const editor = openEditor('one <two> three');
  editor.type('2');
  assert.equal(editor.marked(), 'one 2| three');
  const several = openEditor('a| b| c|');
  several.type('X');
  assert.equal(several.marked(), 'aX| bX| cX|');
});

test('Enter keeps the indentation and goes one deeper after an opening brace', () => {
  const editor = openEditor('function f() {|\n}');
  assert.equal(editor.press('Enter'), true);
  assert.equal(editor.marked(), 'function f() {\n  |\n}');
  editor.type('return 1;');
  editor.press('Enter');
  assert.equal(editor.marked(), 'function f() {\n  return 1;\n  |\n}');
});

test('typing a closing brace on its own line takes the line back out', () => {
  const editor = openEditor('function f() {\n  |\n}');
  editor.type('}');
  assert.equal(editor.text(), 'function f() {\n}\n}');
});

test('Tab inserts spaces up to the next indent column; with lines selected it indents them; Shift+Tab takes an indent out', () => {
  const editor = openEditor('a|');
  assert.equal(editor.press('Tab'), true);
  assert.equal(editor.marked(), 'a |');
  editor.press('Tab');
  assert.equal(editor.marked(), 'a   |', 'two spaces to the next column of two');
  const lines = openEditor('<one\ntwo>');
  lines.press('Tab');
  assert.equal(lines.text(), '  one\n  two');
  lines.press('Tab', { shift: true });
  assert.equal(lines.text(), 'one\ntwo');
});

test('arrows move by character and by line, keep the column through a short line, and stop at the ends', () => {
  const editor = openEditor('abcdef\nab\nabcdef');
  editor.editor.setSelection(parseMarked('abcd|ef\nab\nabcdef').selection);
  editor.press('ArrowDown');
  assert.equal(editor.marked(), 'abcdef\nab|\nabcdef');
  editor.press('ArrowDown');
  assert.equal(editor.marked(), 'abcdef\nab\nabcd|ef', 'the column the movement began at comes back');
  editor.press('ArrowDown');
  assert.equal(editor.marked(), 'abcdef\nab\nabcdef|', 'a down arrow on the last line goes to its end');
  editor.press('ArrowLeft');
  assert.equal(editor.marked(), 'abcdef\nab\nabcde|f');
  const start = openEditor('|ab');
  start.press('ArrowLeft');
  assert.equal(start.marked(), '|ab');
});

test('Alt jumps by word on macOS and Ctrl elsewhere; the other modifier does not', () => {
  const mac = openEditor('|foo bar baz', 'mac');
  mac.press('ArrowRight', { alt: true });
  assert.equal(mac.marked(), 'foo| bar baz');
  mac.press('ArrowRight', { alt: true });
  assert.equal(mac.marked(), 'foo bar| baz');
  mac.press('ArrowLeft', { alt: true });
  assert.equal(mac.marked(), 'foo |bar baz');
  const other = openEditor('|foo bar baz', 'other');
  other.press('ArrowRight', { ctrl: true });
  assert.equal(other.marked(), 'foo| bar baz');
  other.press('ArrowRight', { ctrl: true });
  assert.equal(other.marked(), 'foo bar| baz');
  other.press('ArrowLeft', { ctrl: true });
  assert.equal(other.marked(), 'foo |bar baz');
});

test('Home goes to the first character, then to the start of the line; End to the end; Cmd+arrows on macOS and Ctrl+Home elsewhere go to the ends of the document', () => {
  const editor = openEditor('x\n  indented| text\ny', 'mac');
  editor.press('Home');
  assert.equal(editor.marked(), 'x\n  |indented text\ny');
  editor.press('Home');
  assert.equal(editor.marked(), 'x\n|  indented text\ny');
  editor.press('End');
  assert.equal(editor.marked(), 'x\n  indented text|\ny');
  editor.press('ArrowUp', { meta: true });
  assert.equal(editor.marked(), '|x\n  indented text\ny');
  editor.press('ArrowDown', { meta: true });
  assert.equal(editor.marked(), 'x\n  indented text\ny|');
  const other = openEditor('x\ny|\nz', 'other');
  other.press('Home', { ctrl: true });
  assert.equal(other.marked(), '|x\ny\nz');
  other.press('End', { ctrl: true });
  assert.equal(other.marked(), 'x\ny\nz|');
});

test('Page Down moves a viewport of lines and Page Up comes back', () => {
  const lines = Array.from({ length: 60 }, (_, index) => `line ${index}`);
  const editor = openEditor(`|${lines.join('\n')}`);
  editor.press('PageDown');
  const down = editor.editor.position().line;
  // The viewport is 200 px of 20 px lines: ten lines, less the margin the command keeps.
  assert.ok(down > 5 && down <= 11, `page down moved to line ${down}`);
  editor.press('PageUp');
  assert.equal(editor.editor.position().line, 1);
});

test('Shift with a movement selects, for every movement', () => {
  const editor = openEditor('one |two three\nfour');
  editor.press('ArrowRight', { shift: true });
  assert.equal(editor.marked(), 'one <t>wo three\nfour');
  editor.press('ArrowRight', { shift: true, alt: true });
  assert.equal(editor.marked(), 'one <two> three\nfour');
  editor.press('End', { shift: true });
  assert.equal(editor.marked(), 'one <two three>\nfour');
  editor.press('ArrowDown', { shift: true });
  assert.equal(editor.editor.position().line, 2, 'the head is on the next line');
  assert.equal(editor.editor.model.state.selection.main.anchor, 4, 'and the anchor has not moved');
  editor.press('ArrowUp', { shift: true, meta: true });
  assert.equal(editor.marked(), '>one <two three\nfour', 'Shift+Cmd+Up selects back to the start of the document');
});

test('select all and select line', () => {
  const editor = openEditor('one\ntw|o\nthree');
  editor.press('a', { meta: true });
  assert.equal(editor.marked(), '<one\ntwo\nthree>');
  const line = openEditor('one\ntw|o\nthree');
  line.press('l', { meta: true });
  assert.equal(line.marked(), 'one\n<two\n>three');
});

test('Cmd+/ comments a line and the lines selected, and uncomments them again', () => {
  const editor = openEditor('const a = 1;|\nconst b = 2;');
  editor.press('/', { meta: true });
  assert.equal(editor.text(), '// const a = 1;\nconst b = 2;');
  editor.press('/', { meta: true });
  assert.equal(editor.text(), 'const a = 1;\nconst b = 2;');
  const both = openEditor('<const a = 1;\nconst b = 2;>');
  both.press('/', { meta: true });
  assert.equal(both.text(), '// const a = 1;\n// const b = 2;');
  const other = openEditor('const a = 1;|', 'other');
  other.press('/', { ctrl: true });
  assert.equal(other.text(), '// const a = 1;');
});

test('Backspace and Delete remove a grapheme, however many code units it is', () => {
  const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
  const withFamily = openEditor(`a${family}|b`);
  withFamily.press('Backspace');
  assert.equal(withFamily.text(), 'ab');
  const forward = openEditor(`|${family}x`);
  forward.press('Delete');
  assert.equal(forward.text(), 'x');
  const pair = openEditor('a\u{1F600}|b');
  pair.press('Backspace');
  assert.equal(pair.text(), 'ab', 'a surrogate pair goes whole');
  // Backspace takes a combining mark off its letter, as it does in a browser's text field; Delete takes the letter with its marks.
  const accent = openEditor('café|!');
  accent.press('Backspace');
  assert.equal(accent.text(), 'cafe!');
  const letter = openEditor('caf|é!');
  letter.press('Delete');
  assert.equal(letter.text(), 'caf!');
});

test('Alt+Backspace and Alt+Delete remove a word on macOS, Ctrl+Backspace and Ctrl+Delete elsewhere; Cmd+Backspace removes to the line start', () => {
  const mac = openEditor('foo bar| baz', 'mac');
  mac.press('Backspace', { alt: true });
  assert.equal(mac.marked(), 'foo | baz');
  mac.press('Delete', { alt: true });
  assert.equal(mac.marked(), 'foo |');
  const toStart = openEditor('foo bar|', 'mac');
  toStart.press('Backspace', { meta: true });
  assert.equal(toStart.marked(), '|');
  const other = openEditor('foo bar| baz', 'other');
  other.press('Backspace', { ctrl: true });
  assert.equal(other.marked(), 'foo | baz');
});

test('Shift+Cmd+K deletes the line', () => {
  const editor = openEditor('one\nt|wo\nthree');
  editor.press('k', { meta: true, shift: true });
  assert.equal(editor.text(), 'one\nthree');
});

test('Alt+Up and Alt+Down move the line; Shift+Alt copies it', () => {
  const editor = openEditor('one\nt|wo\nthree');
  editor.press('ArrowUp', { alt: true });
  assert.equal(editor.marked(), 't|wo\none\nthree');
  editor.press('ArrowDown', { alt: true });
  editor.press('ArrowDown', { alt: true });
  assert.equal(editor.text(), 'one\nthree\ntwo');
  const copy = openEditor('one\nt|wo');
  copy.press('ArrowDown', { alt: true, shift: true });
  assert.equal(copy.text(), 'one\ntwo\ntwo');
});

test('undo and redo; typing in a burst is one step and a pause starts another', () => {
  let time = 0;
  const editor = openEditor('|', 'mac', () => time);
  editor.type('a');
  time += 100;
  editor.type('b');
  time += 2000;
  editor.type('c');
  assert.equal(editor.text(), 'abc');
  assert.equal(editor.press('z', { meta: true }), true);
  assert.equal(editor.text(), 'ab', 'the pause made c a step of its own');
  editor.press('z', { meta: true });
  assert.equal(editor.text(), '', 'a and b were one step');
  editor.press('z', { meta: true, shift: true });
  assert.equal(editor.text(), 'ab');
  editor.press('z', { meta: true, shift: true });
  assert.equal(editor.text(), 'abc');
  const other = openEditor('|', 'other', () => 0);
  other.type('x');
  other.press('z', { ctrl: true });
  assert.equal(other.text(), '');
  other.press('y', { ctrl: true });
  assert.equal(other.text(), 'x');
});

test('undo puts the selection back where the edit was made', () => {
  const editor = openEditor('hello <world>');
  editor.type('there');
  assert.equal(editor.marked(), 'hello there|');
  editor.press('z', { meta: true });
  assert.equal(editor.marked(), 'hello <world>');
});

test('Cmd+D selects the word, then the next place it occurs, wrapping round; Escape goes back to one selection', () => {
  const editor = openEditor('foo bar foo baz fo|o');
  editor.press('d', { meta: true });
  assert.equal(editor.marked(), 'foo bar foo baz <foo>');
  editor.press('d', { meta: true });
  assert.equal(editor.editor.model.state.selection.ranges.length, 2);
  assert.equal(editor.marked(), '<foo> bar foo baz <foo>');
  editor.press('d', { meta: true });
  assert.equal(editor.marked(), '<foo> bar <foo> baz <foo>');
  editor.press('d', { meta: true });
  assert.equal(editor.marked(), '<foo> bar <foo> baz <foo>', 'with every occurrence selected there is no next one');
  editor.type('x');
  assert.equal(editor.text(), 'x bar x baz x');
  editor.press('Escape');
  assert.equal(editor.editor.model.state.selection.ranges.length, 1);
});

test('Cmd+Alt+Down adds a cursor on the line below; typing goes in every cursor', () => {
  const editor = openEditor('ab|c\ndef\nghi');
  editor.press('ArrowDown', { meta: true, alt: true });
  editor.press('ArrowDown', { meta: true, alt: true });
  assert.equal(editor.marked(), 'ab|c\nde|f\ngh|i');
  editor.type('-');
  assert.equal(editor.text(), 'ab-c\nde-f\ngh-i');
  editor.press('ArrowUp', { meta: true, alt: true });
  assert.ok(editor.editor.model.state.selection.ranges.length >= 3);
});

test('an Alt+click adds a caret and a plain click puts the others away', () => {
  const editor = openEditor('one two three');
  editor.editor.pointerDown({ offset: 1, clicks: 1, shiftKey: false, altKey: false });
  editor.editor.pointerUp();
  editor.editor.pointerDown({ offset: 5, clicks: 1, shiftKey: false, altKey: true });
  editor.editor.pointerUp();
  assert.equal(editor.marked(), 'o|ne t|wo three');
  editor.type('!');
  assert.equal(editor.text(), 'o!ne t!wo three');
  editor.editor.pointerDown({ offset: 0, clicks: 1, shiftKey: false, altKey: false });
  editor.editor.pointerUp();
  assert.equal(editor.editor.model.state.selection.ranges.length, 1);
});

test('copy puts the selections on the clipboard, one to a line, and a copy with nothing selected takes the line', () => {
  const editor = openEditor('<one> two <three>');
  assert.equal(editor.press('c', { meta: true }), true);
  assert.equal(editor.clipboard.text, 'one\nthree');
  assert.equal(editor.text(), 'one two three', 'a copy leaves the text alone');
  const line = openEditor('one\nt|wo\nthree');
  line.press('c', { meta: true });
  assert.equal(line.clipboard.text, 'two\n');
  const other = openEditor('<ab>', 'other');
  other.press('c', { ctrl: true });
  assert.equal(other.clipboard.text, 'ab');
});

test('cut removes the selection and puts it on the clipboard; with nothing selected it removes the line', () => {
  const editor = openEditor('one <two> three');
  editor.press('x', { meta: true });
  assert.equal(editor.clipboard.text, 'two');
  assert.equal(editor.marked(), 'one | three');
  const line = openEditor('one\nt|wo\nthree');
  line.press('x', { meta: true });
  assert.equal(line.clipboard.text, 'two\n');
  assert.equal(line.text(), 'one\nthree');
});

test('Cmd+V is not the editor\'s: native reads the clipboard and the text arrives as an insertFromPaste', () => {
  const editor = openEditor('a|');
  assert.equal(editor.press('v', { meta: true }), false);
  editor.editor.beforeInput('insertFromPaste', 'pasted');
  assert.equal(editor.marked(), 'apasted|');
});

test('a paste: with as many lines as selections each gets one, tabs become spaces, line breaks are normalised', () => {
  const several = openEditor('a| b| c|');
  several.editor.beforeInput('insertFromPaste', '1\n2\n3');
  assert.equal(several.marked(), 'a1| b2| c3|');
  const tabs = openEditor('|');
  tabs.editor.beforeInput('insertFromPaste', '\tx\r\ny');
  assert.equal(tabs.text(), '  x\ny');
  const fewer = openEditor('a| b|');
  fewer.editor.beforeInput('insertFromPaste', '1\n2\n3');
  assert.equal(fewer.text(), 'a1\n2\n3 b1\n2\n3', 'a different number of lines is pasted whole at every caret');
});

test('a line copied with nothing selected pastes above the line the caret is on', () => {
  const editor = openEditor('one\nt|wo');
  editor.press('c', { meta: true });
  editor.editor.beforeInput('insertFromPaste', editor.clipboard.text);
  assert.equal(editor.text(), 'one\ntwo\ntwo');
  assert.equal(editor.editor.position().line, 3, 'the caret goes down with its line');
});

test('every delete and history input type is answered, and the commit of an IME composition replaces the selection', () => {
  const editor = openEditor('hello <world>');
  editor.editor.compositionStart();
  editor.editor.compositionUpdate('にほ');
  assert.deepEqual(editor.editor.composition, { at: 11, text: 'にほ' }, 'the preedit is at the head of the selection');
  assert.equal(editor.text(), 'hello world', 'the preedit is not in the document');
  editor.editor.compositionEnd();
  assert.deepEqual(editor.editor.composition, { at: 11, text: 'にほ' }, 'the preedit stays until the commit arrives');
  editor.editor.beforeInput('insertText', '日本');
  assert.equal(editor.editor.composition, undefined);
  assert.equal(editor.marked(), 'hello 日本|');
  editor.editor.beforeInput('deleteContentBackward', null);
  assert.equal(editor.text(), 'hello 日');
  editor.editor.beforeInput('deleteWordBackward', null);
  assert.equal(editor.text(), 'hello ');
  editor.editor.beforeInput('historyUndo', null);
  assert.equal(editor.text().length > 0, true);
});

test('a composition that ends without a commit loses its preedit', async () => {
  const editor = openEditor('|');
  editor.editor.compositionStart();
  editor.editor.compositionUpdate('x');
  editor.editor.compositionEnd();
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(editor.editor.composition, undefined);
  editor.editor.dispose();
});

test('a key during a composition is the IME\'s', () => {
  const editor = openEditor('a|');
  assert.equal(editor.editor.keyDown({ ...{ key: 'ArrowLeft', code: 'ArrowLeft', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, timeStamp: 0 }, isComposing: true }), false);
  assert.equal(editor.marked(), 'a|');
});

test('plain characters are not the keymap\'s: they come as beforeinput', () => {
  const editor = openEditor('|');
  for (const key of ['a', 'A', '1', ' ', '/', '[']) assert.equal(editor.press(key, key === 'A' ? { shift: true } : {}), false, key);
  assert.equal(editor.press('a', { alt: true }), false, 'on macOS Alt+a types a character');
});

test('a double click selects a word, dragging on grows it by words; a triple click selects the line', () => {
  const editor = openEditor('alpha beta gamma\nsecond line');
  editor.editor.pointerDown({ offset: 8, clicks: 2, shiftKey: false, altKey: false });
  assert.equal(editor.marked(), 'alpha <beta> gamma\nsecond line');
  editor.editor.pointerMove(13);
  assert.equal(editor.marked(), 'alpha <beta gamma>\nsecond line');
  editor.editor.pointerMove(1);
  assert.equal(editor.marked(), '>alpha beta< gamma\nsecond line'.replace('< ', '< '));
  editor.editor.pointerUp();
  editor.editor.pointerDown({ offset: 3, clicks: 3, shiftKey: false, altKey: false });
  assert.equal(editor.marked(), '<alpha beta gamma\n>second line');
  editor.editor.pointerUp();
});

test('a drag selects between where it began and where it is; Shift+click extends from the anchor', () => {
  const editor = openEditor('0123456789');
  editor.editor.pointerDown({ offset: 2, clicks: 1, shiftKey: false, altKey: false });
  editor.editor.pointerMove(6);
  assert.equal(editor.marked(), '01<2345>6789');
  editor.editor.pointerMove(0);
  assert.equal(editor.marked(), '>01<23456789');
  editor.editor.pointerUp();
  editor.editor.pointerDown({ offset: 8, clicks: 1, shiftKey: true, altKey: false });
  editor.editor.pointerUp();
  assert.equal(editor.marked(), '01<234567>89', 'the anchor stayed at 2');
});

test('a press asks for a reveal that keeps no margin, a drag asks for none, and a key or a jump keeps context', () => {
  const editor = openEditor('0123456789\nabcdefghij\nklmnopqrst');
  const { editor: controller } = editor;
  const pressed = controller.revealEpoch;
  controller.pointerDown({ offset: 3, clicks: 1, shiftKey: false, altKey: false });
  assert.equal(controller.revealEpoch, pressed + 1, 'a press asks for a reveal');
  assert.equal(controller.revealMargin, 'minimal', 'with no margin: it is under the pointer');
  controller.pointerMove(14);
  controller.pointerMove(25);
  controller.pointerMove(1);
  assert.equal(controller.revealEpoch, pressed + 1, 'a drag asks for none: the pointer is in view, or the autoscroll is carrying the view after it');
  controller.pointerUp();
  assert.equal(editor.marked(), '0>12<3456789\nabcdefghij\nklmnopqrst', 'and the selection followed it');
  // A press on the caret that is there changes no selection and still asks, and tells the view (the line may be only partly in view).
  controller.pointerDown({ offset: 3, clicks: 1, shiftKey: false, altKey: false });
  controller.pointerUp();
  const revisionBefore = controller.revision;
  const epochBefore = controller.revealEpoch;
  controller.pointerDown({ offset: 3, clicks: 1, shiftKey: false, altKey: false });
  controller.pointerUp();
  assert.equal(controller.revealEpoch, epochBefore + 1, 'a press where the caret already is asks for a reveal');
  assert.ok(controller.revision > revisionBefore, 'and the view is told, so the request does not wait for an unrelated render');
  editor.press('ArrowDown');
  assert.equal(controller.revealMargin, 'context', 'a key keeps context round the caret');
  controller.pointerDown({ offset: 0, clicks: 1, shiftKey: false, altKey: false });
  controller.pointerUp();
  assert.equal(controller.revealMargin, 'minimal');
  controller.setSelection(EditorSelection.single(15));
  assert.equal(controller.revealMargin, 'context', 'a jump to a place (a problem in the list, Select All) keeps context');
  const dragged = controller.revealEpoch;
  controller.dragSelectionEnd(2, 20);
  controller.dragSelectionEnd(2, 8);
  assert.equal(controller.revealEpoch, dragged, 'a touch handle dragged asks for nothing either');
});

test('the view is asked for the keyboard, and told, whether or not anything else changed', () => {
  const editor = openEditor('abc|');
  const { editor: controller } = editor;
  let told = 0;
  controller.subscribe(() => { told += 1; });
  const epoch = controller.keyboardEpoch;
  controller.requestKeyboard();
  assert.equal(controller.keyboardEpoch, epoch + 1);
  assert.equal(told, 1, 'the view renders, and so gives the keyboard to its input');
  assert.equal(editor.marked(), 'abc|', 'the request moves nothing');
});

test('a soft keyboard\'s text is typed, and the Right presses the engine makes after it are not the person\'s', () => {
  const editor = openEditor('ab|cd');
  const right = (timeStamp: number) => editor.editor.keyDown({ ...keyEvent('ArrowRight'), timeStamp });
  editor.editor.beforeInput('insertReplacementText', `${SINK_TEXT}XY`, 1000);
  assert.equal(editor.marked(), 'abXY|cd');
  assert.equal(right(1010), true, 'the first press is the engine\'s');
  assert.equal(right(1011), true, 'and the second');
  assert.equal(right(1012), true, 'and the third: one for each character of the element\'s text, the input\'s own among them');
  assert.equal(editor.marked(), 'abXY|cd', 'none moved the caret');
  right(1013);
  assert.equal(editor.marked(), 'abXYc|d', 'a fourth is the person\'s');
  const late = openEditor('ab|cd');
  late.editor.beforeInput('insertReplacementText', `${SINK_TEXT}X`, 1000);
  late.editor.keyDown({ ...keyEvent('ArrowRight'), timeStamp: 1000 + 500 });
  assert.equal(late.marked(), 'abXc|d', 'a Right long after the text is an arrow');
  const modified = openEditor('ab|cd');
  modified.editor.beforeInput('insertReplacementText', `${SINK_TEXT}X`, 1000);
  modified.editor.keyDown({ ...keyEvent('ArrowRight', { shift: true }), timeStamp: 1001 });
  assert.equal(modified.marked(), 'abX<c>d', 'Shift+Right is never the engine\'s');
});

test('a soft keyboard\'s Backspace is an empty text: the input\'s one character was deleted, and a character of the document goes', () => {
  const editor = openEditor('abc|');
  editor.editor.beforeInput('insertReplacementText', '', 1000);
  assert.equal(editor.marked(), 'ab|');
  editor.editor.beforeInput('insertReplacementText', `${SINK_TEXT}Q`, 2000);
  assert.equal(editor.marked(), 'abQ|');
  const start = openEditor('|abc');
  start.editor.beforeInput('insertReplacementText', '', 1000);
  assert.equal(start.marked(), '|abc', 'at the start of the document there is nothing to delete');
  const beside = openEditor('ab|cd');
  beside.editor.beforeInput('insertReplacementText', `X${SINK_TEXT}`, 1000);
  assert.equal(beside.marked(), 'abX|cd', 'the keyboard\'s caret may have been left before the input\'s character');
});
