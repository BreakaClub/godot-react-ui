/**
 * The texts of the font fallback lab (docs/tracks/font-slices.md): a line in each language the slices cover, the emoji, a mix, and a line no
 * downloaded font is needed for. Each is written for this and is a plain sentence a person might write. The `language` is the tag the loader is
 * told for it: the Han characters of the Chinese, Japanese and Korean lines are largely the same code points, and the language chooses their forms.
 */
export interface FontSample {
  readonly id: string;
  readonly label: string;
  /** The BCP 47 tag the text is in. */
  readonly language: string;
  /** The text, in the lab's plain paragraph. */
  readonly text: string;
  /** The same text as pieces; each piece is `[text, tone]` where a tone is `''` for none or a span class. */
  readonly pieces: readonly (readonly [string, string])[];
}

export const FONT_SAMPLES: readonly FontSample[] = [
  {
    id: 'simplified', label: 'Simplified', language: 'zh-CN',
    text: '你好，世界。今天天气很好，我们一起去公园玩吧。',
    pieces: [['你好，世界。', ''], ['今天天气很好', 'text-red-600'], ['，我们一起去公园玩吧。', '']],
  },
  {
    id: 'traditional', label: 'Traditional', language: 'zh-TW',
    text: '你好，世界。今天天氣很好，我們一起去公園玩吧。',
    pieces: [['你好，世界。', ''], ['今天天氣很好', 'text-red-600'], ['，我們一起去公園玩吧。', '']],
  },
  {
    id: 'japanese', label: 'Japanese', language: 'ja',
    text: 'こんにちは、世界。今日はいい天気ですね。公園へ行きましょう。',
    pieces: [['こんにちは、世界。', ''], ['今日はいい天気', 'text-red-600'], ['ですね。公園へ行きましょう。', '']],
  },
  {
    id: 'korean', label: 'Korean', language: 'ko',
    text: '안녕하세요, 세계. 오늘은 날씨가 좋네요. 공원에 갑시다.',
    pieces: [['안녕하세요, 세계. ', ''], ['오늘은 날씨가 좋네요', 'text-red-600'], ['. 공원에 갑시다.', '']],
  },
  {
    id: 'emoji', label: 'Emoji', language: 'en',
    text: 'Smile 😀 rainbow 🌈 thumbs up 👍🏽 rocket 🚀 flag 🇦🇺',
    pieces: [['Smile 😀 rainbow ', ''], ['🌈 thumbs up 👍🏽', 'text-red-600'], [' rocket 🚀 flag 🇦🇺', '']],
  },
  {
    id: 'mixed', label: 'Mixed', language: 'ja',
    text: 'Open Sans と 日本語 and 한국어 and 😀 in one line.',
    pieces: [['Open Sans と ', ''], ['日本語 and 한국어', 'text-red-600'], [' and 😀 in one line.', '']],
  },
  {
    id: 'latin', label: 'Latin only', language: 'en',
    text: 'Hamburgefonstiv: a line every registered font has the glyphs for.',
    pieces: [['Hamburgefonstiv: ', ''], ['a line every registered font', 'text-red-600'], [' has the glyphs for.', '']],
  },
];

export function sampleNamed(id: string): FontSample {
  const found = FONT_SAMPLES.find(sample => sample.id === id);
  if (found === undefined) throw new Error(`There is no font sample ${id}; they are ${FONT_SAMPLES.map(sample => sample.id).join(', ')}`);
  return found;
}
