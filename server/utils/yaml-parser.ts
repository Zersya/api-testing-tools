/**
 * YAML Parser Utility
 * A lightweight YAML parser for OpenAPI specifications
 * Supports the YAML features commonly used in OpenAPI specs
 */

type YAMLValue = string | number | boolean | null | YAMLValue[] | { [key: string]: YAMLValue };

interface ParseContext {
  lines: string[];
  currentIndex: number;
  baseIndent: number;
}

/**
 * Parse a YAML string into a JavaScript object
 */
export function parseYAML(yamlString: string): YAMLValue {
  const lines = yamlString.split('\n');
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    // Skip document markers
    if (line.trim() === '---' || line.trim() === '...') {
      continue;
    }
    
    // Remove comments (but preserve # in quoted strings)
    const commentIndex = findCommentIndex(line);
    const cleanLine = commentIndex >= 0 ? line.substring(0, commentIndex) : line;
    
    // Keep lines that have content or are part of multi-line strings
    cleanedLines.push(cleanLine);
  }
  
  const context: ParseContext = {
    lines: cleanedLines,
    currentIndex: 0,
    baseIndent: 0
  };
  
  return parseValue(context);
}

/**
 * Find the index of a comment character that's not inside quotes
 */
function findCommentIndex(line: string): number {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const prevChar = i > 0 ? line[i - 1] : '';
    
    if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '#' && !inSingleQuote && !inDoubleQuote) {
      // Make sure there's a space before the # (YAML requirement)
      if (i === 0 || /\s/.test(prevChar)) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Get the indentation level of a line
 */
function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

/**
 * Parse a YAML value (could be scalar, array, or object)
 */
function parseValue(context: ParseContext): YAMLValue {
  skipEmptyLines(context);
  
  if (context.currentIndex >= context.lines.length) {
    return null;
  }
  
  const line = context.lines[context.currentIndex];
  const trimmed = line.trim();
  
  if (!trimmed) {
    return null;
  }
  
  // Check if it's an array item
  if (trimmed.startsWith('- ') || trimmed === '-') {
    return parseArray(context);
  }
  
  // Check if it's a key-value pair
  if (trimmed.includes(':')) {
    return parseObject(context);
  }
  
  // It's a scalar value
  context.currentIndex++;
  return parseScalar(trimmed);
}

/**
 * Parse a YAML object
 */
function parseObject(context: ParseContext): { [key: string]: YAMLValue } {
  const result: { [key: string]: YAMLValue } = {};
  const startIndent = getIndent(context.lines[context.currentIndex]);
  
  while (context.currentIndex < context.lines.length) {
    skipEmptyLines(context);
    
    if (context.currentIndex >= context.lines.length) {
      break;
    }
    
    const line = context.lines[context.currentIndex];
    const currentIndent = getIndent(line);
    const trimmed = line.trim();
    
    if (!trimmed) {
      context.currentIndex++;
      continue;
    }
    
    // Check if we've moved out of this object's scope
    if (currentIndent < startIndent) {
      break;
    }
    
    // Skip if this is deeper indentation (handled by recursive calls)
    if (currentIndent > startIndent && Object.keys(result).length > 0) {
      break;
    }
    
    // Parse key-value pair
    const colonIndex = findColonIndex(trimmed);
    if (colonIndex === -1) {
      context.currentIndex++;
      continue;
    }
    
    const key = trimmed.substring(0, colonIndex).trim();
    const valueAfterColon = trimmed.substring(colonIndex + 1).trim();
    
    context.currentIndex++;
    
    if (valueAfterColon) {
      // Inline value
      if (valueAfterColon.startsWith('[')) {
        result[key] = parseInlineArray(valueAfterColon);
      } else if (valueAfterColon.startsWith('{')) {
        result[key] = parseInlineObject(valueAfterColon);
      } else if (valueAfterColon === '|' || valueAfterColon === '>') {
        result[key] = parseMultilineString(context, currentIndent, valueAfterColon === '|');
      } else {
        result[key] = parseScalar(valueAfterColon);
      }
    } else {
      // Value on next line(s)
      skipEmptyLines(context);
      
      if (context.currentIndex >= context.lines.length) {
        result[key] = null;
        continue;
      }
      
      const nextLine = context.lines[context.currentIndex];
      const nextIndent = getIndent(nextLine);
      const nextTrimmed = nextLine.trim();
      
      if (!nextTrimmed || nextIndent <= currentIndent) {
        result[key] = null;
      } else if (nextTrimmed.startsWith('- ') || nextTrimmed === '-') {
        result[key] = parseArray(context);
      } else {
        result[key] = parseObject(context);
      }
    }
  }
  
  return result;
}

/**
 * Find colon index that's not inside quotes
 */
function findColonIndex(str: string): number {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : '';
    
    if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === ':' && !inSingleQuote && !inDoubleQuote) {
      // Check if followed by space, end of string, or newline
      if (i === str.length - 1 || /[\s]/.test(str[i + 1])) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Parse a YAML array
 */
function parseArray(context: ParseContext): YAMLValue[] {
  const result: YAMLValue[] = [];
  const startIndent = getIndent(context.lines[context.currentIndex]);
  
  while (context.currentIndex < context.lines.length) {
    skipEmptyLines(context);
    
    if (context.currentIndex >= context.lines.length) {
      break;
    }
    
    const line = context.lines[context.currentIndex];
    const currentIndent = getIndent(line);
    const trimmed = line.trim();
    
    if (!trimmed) {
      context.currentIndex++;
      continue;
    }
    
    // Check if we've moved out of this array's scope
    if (currentIndent < startIndent) {
      break;
    }
    
    if (currentIndent !== startIndent) {
      break;
    }
    
    // Must be an array item
    if (!trimmed.startsWith('-')) {
      break;
    }
    
    // Parse array item
    const afterDash = trimmed.substring(1).trim();
    context.currentIndex++;
    
    if (!afterDash) {
      // Value on next line
      skipEmptyLines(context);
      if (context.currentIndex < context.lines.length) {
        const nextIndent = getIndent(context.lines[context.currentIndex]);
        if (nextIndent > currentIndent) {
          result.push(parseValue(context));
        } else {
          result.push(null);
        }
      } else {
        result.push(null);
      }
    } else if (afterDash.includes(':') && !afterDash.startsWith('{')) {
      // Inline object in array
      const colonIdx = findColonIndex(afterDash);
      if (colonIdx !== -1) {
        const key = afterDash.substring(0, colonIdx).trim();
        const val = afterDash.substring(colonIdx + 1).trim();
        
        const obj: { [key: string]: YAMLValue } = {};
        obj[key] = val ? parseScalar(val) : null;
        
        // Check for nested properties
        skipEmptyLines(context);
        if (context.currentIndex < context.lines.length) {
          const nextLine = context.lines[context.currentIndex];
          const nextIndent = getIndent(nextLine);
          const itemIndent = currentIndent + 2; // Standard YAML indent after array dash
          
          if (nextIndent >= itemIndent && nextLine.trim().includes(':')) {
            const nested = parseObject(context);
            Object.assign(obj, nested);
          }
        }
        
        result.push(obj);
      } else {
        result.push(parseScalar(afterDash));
      }
    } else if (afterDash.startsWith('[')) {
      result.push(parseInlineArray(afterDash));
    } else if (afterDash.startsWith('{')) {
      result.push(parseInlineObject(afterDash));
    } else {
      result.push(parseScalar(afterDash));
    }
  }
  
  return result;
}

/**
 * Parse an inline JSON-style array [a, b, c]
 */
function parseInlineArray(str: string): YAMLValue[] {
  const trimmed = str.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return [];
  }
  
  const content = trimmed.slice(1, -1).trim();
  if (!content) {
    return [];
  }
  
  const result: YAMLValue[] = [];
  const items = splitByComma(content);
  
  for (const item of items) {
    const trimmedItem = item.trim();
    if (trimmedItem.startsWith('{')) {
      result.push(parseInlineObject(trimmedItem));
    } else if (trimmedItem.startsWith('[')) {
      result.push(parseInlineArray(trimmedItem));
    } else {
      result.push(parseScalar(trimmedItem));
    }
  }
  
  return result;
}

/**
 * Parse an inline JSON-style object {a: 1, b: 2}
 */
function parseInlineObject(str: string): { [key: string]: YAMLValue } {
  const trimmed = str.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return {};
  }
  
  const content = trimmed.slice(1, -1).trim();
  if (!content) {
    return {};
  }
  
  const result: { [key: string]: YAMLValue } = {};
  const pairs = splitByComma(content);
  
  for (const pair of pairs) {
    const colonIndex = findColonIndex(pair);
    if (colonIndex !== -1) {
      const key = pair.substring(0, colonIndex).trim();
      const value = pair.substring(colonIndex + 1).trim();
      
      if (value.startsWith('{')) {
        result[key] = parseInlineObject(value);
      } else if (value.startsWith('[')) {
        result[key] = parseInlineArray(value);
      } else {
        result[key] = parseScalar(value);
      }
    }
  }
  
  return result;
}

/**
 * Split a string by comma, respecting nested brackets and quotes
 */
function splitByComma(str: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prevChar = i > 0 ? str[i - 1] : '';
    
    if (char === "'" && !inDoubleQuote && prevChar !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && prevChar !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (!inSingleQuote && !inDoubleQuote) {
      if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
      } else if (char === ',' && depth === 0) {
        result.push(current);
        current = '';
        continue;
      }
    }
    
    current += char;
  }
  
  if (current) {
    result.push(current);
  }
  
  return result;
}

/**
 * Parse a multi-line string (literal | or folded >)
 */
function parseMultilineString(context: ParseContext, baseIndent: number, literal: boolean): string {
  const lines: string[] = [];
  const contentIndent = baseIndent + 2;
  
  while (context.currentIndex < context.lines.length) {
    const line = context.lines[context.currentIndex];
    const currentIndent = getIndent(line);
    
    // Empty line or line with only whitespace
    if (!line.trim()) {
      if (lines.length > 0) {
        lines.push('');
      }
      context.currentIndex++;
      continue;
    }
    
    // Check if we've moved out of the multi-line string
    if (currentIndent < contentIndent && line.trim()) {
      break;
    }
    
    lines.push(line.substring(contentIndent));
    context.currentIndex++;
  }
  
  // Remove trailing empty lines
  while (lines.length > 0 && !lines[lines.length - 1]) {
    lines.pop();
  }
  
  if (literal) {
    return lines.join('\n');
  } else {
    // Folded: replace single newlines with spaces
    return lines.join(' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Parse a scalar value
 */
function parseScalar(value: string): YAMLValue {
  const trimmed = value.trim();
  
  // Null
  if (trimmed === '' || trimmed === 'null' || trimmed === '~') {
    return null;
  }
  
  // Boolean
  if (trimmed === 'true' || trimmed === 'True' || trimmed === 'TRUE') {
    return true;
  }
  if (trimmed === 'false' || trimmed === 'False' || trimmed === 'FALSE') {
    return false;
  }
  
  // Quoted string
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const unquoted = trimmed.slice(1, -1);
    // Handle escape sequences for double-quoted strings
    if (trimmed.startsWith('"')) {
      return unquoted
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\')
        .replace(/\\"/g, '"');
    }
    return unquoted;
  }
  
  // Number
  if (/^-?\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (/^-?\d*\.\d+$/.test(trimmed) || /^-?\d+\.\d*$/.test(trimmed)) {
    return parseFloat(trimmed);
  }
  if (/^-?\d+e[+-]?\d+$/i.test(trimmed)) {
    return parseFloat(trimmed);
  }
  
  // Hex number
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return parseInt(trimmed, 16);
  }
  
  // Octal number
  if (/^0o[0-7]+$/.test(trimmed)) {
    return parseInt(trimmed.substring(2), 8);
  }
  
  // Special float values
  if (trimmed === '.inf' || trimmed === '.Inf' || trimmed === '.INF') {
    return Infinity;
  }
  if (trimmed === '-.inf' || trimmed === '-.Inf' || trimmed === '-.INF') {
    return -Infinity;
  }
  if (trimmed === '.nan' || trimmed === '.NaN' || trimmed === '.NAN') {
    return NaN;
  }
  
  // Plain string
  return trimmed;
}

/**
 * Skip empty lines in the context
 */
function skipEmptyLines(context: ParseContext): void {
  while (context.currentIndex < context.lines.length) {
    const line = context.lines[context.currentIndex];
    if (line.trim()) {
      break;
    }
    context.currentIndex++;
  }
}

/**
 * Convert JavaScript object to YAML string
 */
export function stringifyYAML(value: YAMLValue, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  
  if (value === null) {
    return 'null';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '.nan';
    if (value === Infinity) return '.inf';
    if (value === -Infinity) return '-.inf';
    return String(value);
  }
  
  if (typeof value === 'string') {
    // Check if we need to quote the string
    if (needsQuoting(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    
    const lines: string[] = [];
    for (const item of value) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        const objStr = stringifyYAML(item, indent + 1);
        const objLines = objStr.split('\n');
        lines.push(`${spaces}- ${objLines[0]}`);
        for (let i = 1; i < objLines.length; i++) {
          lines.push(`${spaces}  ${objLines[i]}`);
        }
      } else {
        lines.push(`${spaces}- ${stringifyYAML(item, indent + 1)}`);
      }
    }
    return lines.join('\n');
  }
  
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    
    const lines: string[] = [];
    for (const [key, val] of entries) {
      const keyStr = needsQuoting(key) ? JSON.stringify(key) : key;
      
      if (val !== null && typeof val === 'object') {
        if (Array.isArray(val) && val.length === 0) {
          lines.push(`${spaces}${keyStr}: []`);
        } else if (!Array.isArray(val) && Object.keys(val).length === 0) {
          lines.push(`${spaces}${keyStr}: {}`);
        } else {
          lines.push(`${spaces}${keyStr}:`);
          lines.push(stringifyYAML(val, indent + 1));
        }
      } else {
        lines.push(`${spaces}${keyStr}: ${stringifyYAML(val, indent + 1)}`);
      }
    }
    return lines.join('\n');
  }
  
  return String(value);
}

/**
 * Check if a string needs to be quoted in YAML
 */
function needsQuoting(str: string): boolean {
  // Empty string needs quotes
  if (!str) return true;
  
  // Contains special characters
  if (/[:#\[\]{}&*!|>'"%@`]/.test(str)) return true;
  
  // Starts with special characters
  if (/^[-?:]/.test(str)) return true;
  
  // Could be interpreted as another type
  if (/^(true|false|null|~|\.inf|\.nan)$/i.test(str)) return true;
  
  // Looks like a number
  if (/^-?\d/.test(str)) return true;
  
  // Contains newlines
  if (str.includes('\n')) return true;
  
  // Has leading/trailing whitespace
  if (str !== str.trim()) return true;
  
  return false;
}
