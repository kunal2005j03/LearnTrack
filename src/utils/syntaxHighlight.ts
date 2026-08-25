import Prism from 'prismjs';

// Import Prism language definitions
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';

// Fallback high-performance regex tokenizer for Python, JS, TS in case Prism language isn't detected
function fallbackHighlight(code: string, lang: string): string {
  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Simple token regex matching strings, comments, numbers, keywords, and identifiers
  const isPython = lang.includes('py');
  
  const keywords = isPython
    ? /\b(def|return|class|if|elif|else|for|while|in|import|from|as|try|except|finally|with|lambda|yield|raise|pass|break|continue|async|await|assert|global|nonlocal|True|False|None)\b/g
    : /\b(import|export|from|default|const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|class|extends|new|this|super|async|await|typeof|instanceof|interface|type|enum|public|private|protected|static|readonly|true|false|null|undefined)\b/g;

  const lines = code.split('\n');
  const highlightedLines = lines.map((line) => {
    let escaped = escapeHtml(line);

    // Comments (# in python or // in js)
    if (isPython && escaped.includes('#')) {
      const parts = escaped.split('#');
      const codePart = parts[0];
      const commentPart = '#' + parts.slice(1).join('#');
      return (
        formatCodeTokens(codePart, keywords) +
        `<span class="token comment" style="color:#8b949e; font-style:italic;">${commentPart}</span>`
      );
    } else if (!isPython && escaped.includes('//')) {
      const idx = escaped.indexOf('//');
      const codePart = escaped.slice(0, idx);
      const commentPart = escaped.slice(idx);
      return (
        formatCodeTokens(codePart, keywords) +
        `<span class="token comment" style="color:#8b949e; font-style:italic;">${commentPart}</span>`
      );
    }

    return formatCodeTokens(escaped, keywords);
  });

  return highlightedLines.join('\n');
}

function formatCodeTokens(escaped: string, keywordsRegex: RegExp): string {
  // Strings ("..." or '...')
  escaped = escaped.replace(
    /(&quot;|"|')(.*?)(&quot;|"|')/g,
    '<span class="token string" style="color:#7ee787;">$1$2$3</span>'
  );

  // Numbers
  escaped = escaped.replace(
    /\b(\d+(\.\d+)?)\b/g,
    '<span class="token number" style="color:#fb923c;">$1</span>'
  );

  // Function calls: foo(...)
  escaped = escaped.replace(
    /\b([a-zA-Z_]\w*)(?=\s*\()/g,
    '<span class="token function" style="color:#60a5fa;">$1</span>'
  );

  // Keywords
  escaped = escaped.replace(
    keywordsRegex,
    '<span class="token keyword" style="color:#f472b6; font-weight:600;">$1</span>'
  );

  // JSX/HTML tags or attributes
  escaped = escaped.replace(
    /(&lt;\/?[a-zA-Z0-9_-]+)/g,
    '<span class="token tag" style="color:#7dd3fc;">$1</span>'
  );

  return escaped;
}

export function highlightCode(code: string, language: string = 'python'): string {
  if (!code) return '';

  const clean = language.toLowerCase().trim();
  const normalized =
    clean === 'py' || clean === 'python3'
      ? 'python'
      : clean === 'go' || clean === 'golang'
      ? 'go'
      : clean === 'java'
      ? 'java'
      : clean === 'c++' || clean === 'cpp'
      ? 'cpp'
      : clean === 'c'
      ? 'c'
      : clean === 'js' || clean === 'node'
      ? 'javascript'
      : clean === 'ts'
      ? 'typescript'
      : clean === 'sh' || clean === 'shell'
      ? 'bash'
      : clean || 'python';

  try {
    const grammar =
      Prism.languages[normalized] ||
      Prism.languages.python ||
      Prism.languages.javascript ||
      Prism.languages.clike;

    if (grammar) {
      const html = Prism.highlight(code, grammar, normalized);
      if (html && html.trim().length > 0) {
        return html;
      }
    }
  } catch (e) {
    console.warn('Prism highlight error, using fallback:', e);
  }

  return fallbackHighlight(code, normalized);
}
