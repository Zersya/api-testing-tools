import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { marked } from 'marked';

const renderer = new marked.Renderer();

renderer.code = function({ text, lang }) {
  const language = lang || 'text';
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return `
<div class="code-block-wrapper">
  <div class="code-header">
    <span class="code-lang">${language}</span>
    <button class="copy-code-btn" aria-label="Copy code">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  </div>
  <pre><code class="language-${language}">${escapedText}</code></pre>
</div>`;
};

renderer.heading = function({ text, depth }) {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  return `<h${depth} id="${slug}" class="has-anchor">
    ${text}
    <a href="#${slug}" class="anchor-link" aria-label="Permalink to ${text}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
    </a>
  </h${depth}>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: false,
  pedantic: false
});

export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug');
    
    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug is required'
      });
    }

    const docsDir = join(process.cwd(), 'docs');
    const normalizedSlug = slug.toUpperCase().replace(/-/g, '_');
    const filePath = join(docsDir, `${normalizedSlug}.md`);

    if (!existsSync(filePath)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Documentation not found'
      });
    }

    const fileContent = readFileSync(filePath, 'utf-8');

    const htmlContent = marked.parse(fileContent);

    const titleMatch = fileContent.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug;

    return {
      title,
      content: htmlContent
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    console.error('Error fetching documentation:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch documentation'
    });
  }
});
