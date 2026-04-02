/**
 * JSONC (JSON with Comments) Utility
 * Provides parsing, validation, and syntax highlighting for JSON with comments
 */

/**
 * Strip comments from JSONC content
 * Handles both line comments (//) and block comments (/ * *)
 */
export function stripComments(content: string): string {
  if (!content) return content
  
  let result = ''
  let i = 0
  
  while (i < content.length) {
    if (content[i] === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') {
        i++
      }
      continue
    }
    
    if (content[i] === '/' && content[i + 1] === '*') {
      i += 2
      while (i < content.length - 1) {
        if (content[i] === '*' && content[i + 1] === '/') {
          i += 2
          break
        }
        i++
      }
      continue
    }
    
    if (content[i] === '"') {
      result += content[i]
      i++
      while (i < content.length) {
        result += content[i]
        if (content[i] === '"' && content[i - 1] !== '\\') {
          i++
          break
        }
        i++
      }
      continue
    }
    
    result += content[i]
    i++
  }
  
  return result
}

/**
 * Parse JSONC content - strips comments then parses as JSON
 */
export function parseJSONC(content: string): any {
  const cleanContent = stripComments(content)
  return JSON.parse(cleanContent)
}

/**
 * Validate JSONC content
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validateJSONC(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim() === '') {
    return { valid: true }
  }
  
  try {
    parseJSONC(content)
    return { valid: true }
  } catch (e: any) {
    return { valid: false, error: e.message }
  }
}

/**
 * Format JSON/JSONC content with proper indentation
 * Strips comments, parses, then stringifies with formatting
 */
export function formatJSONC(content: string, indent: number = 2): string {
  if (!content || content.trim() === '') {
    return content
  }
  
  try {
    // Strip comments and parse
    const cleanContent = stripComments(content)
    const parsed = JSON.parse(cleanContent)
    // Re-stringify with formatting
    return JSON.stringify(parsed, null, indent)
  } catch (e) {
    // If parsing fails, return original content unchanged
    return content
  }
}

/**
 * Apply syntax highlighting for JSONC
 * Returns HTML with span wrappers for syntax highlighting
 */
export function highlightJSONC(content: string): string {
  if (!content) return ''
  
  let result = ''
  let i = 0
  
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }
  
  while (i < content.length) {
    if (content[i] === '/' && content[i + 1] === '/') {
      let comment = ''
      while (i < content.length && content[i] !== '\n') {
        comment += content[i]
        i++
      }
      result += `<span class="jsonc-comment">${escapeHtml(comment)}</span>`
      if (i < content.length && content[i] === '\n') {
        result += '\n'
        i++
      }
      continue
    }
    
    if (content[i] === '/' && content[i + 1] === '*') {
      let comment = '/*'
      i += 2
      while (i < content.length - 1) {
        comment += content[i]
        if (content[i] === '*' && content[i + 1] === '/') {
          comment += '/'
          i += 2
          break
        }
        i++
      }
      result += `<span class="jsonc-comment">${escapeHtml(comment)}</span>`
      continue
    }
    
    if (content[i] === '"') {
      let str = '"'
      i++
      while (i < content.length) {
        str += content[i]
        if (content[i] === '"' && content[i - 1] !== '\\') {
          i++
          break
        }
        i++
      }
      result += `<span class="jsonc-string">${escapeHtml(str)}</span>`
      continue
    }
    
    if (/[-\d]/.test(content[i])) {
      let num = ''
      while (i < content.length && /[-\d.eE+]/.test(content[i])) {
        num += content[i]
        i++
      }
      result += `<span class="jsonc-number">${escapeHtml(num)}</span>`
      continue
    }
    
    const wordMatch = content.slice(i).match(/^(true|false|null)\b/)
    if (wordMatch) {
      const word = wordMatch[1]
      const className = word === 'null' ? 'jsonc-null' : 'jsonc-boolean'
      result += `<span class="${className}">${word}</span>`
      i += word.length
      continue
    }
    
    result += escapeHtml(content[i])
    i++
  }
  
  result = result.replace(
    /(<span class="jsonc-string">"[^"]*"<\/span>)(\s*):/g,
    '<span class="jsonc-key">$1</span>$2:'
  )
  
  return result
}