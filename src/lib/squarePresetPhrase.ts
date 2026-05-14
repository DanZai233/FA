import {phraseBook} from '../design/copy';

/** 与 `phraseBook` 四段拼句格式一致：`语气 / 主语 / 动作 / 收尾`（含空格的分隔符固定为 ` / `） */
export function isValidPresetSquarePhrase(phrase: string): boolean {
  const raw = phrase.trim();
  const parts = raw.split(' / ').map((p) => p.trim());
  if (parts.length !== 4 || parts.some((p) => !p)) {
    return false;
  }
  const [tone, subject, action, ending] = parts;
  return (
    phraseBook.tones.includes(tone) &&
    phraseBook.subjects.includes(subject) &&
    phraseBook.actions.includes(action) &&
    phraseBook.endings.includes(ending)
  );
}
