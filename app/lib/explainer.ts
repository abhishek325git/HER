// Enhanced code explainer with improved language detection and structure analysis
// Supports AI-powered explanations via Groq when API key is available

import { useSettingsStore } from './store/settings-store';
import Groq from 'groq-sdk';

export interface CodeStructure {
  functions: string[];
  classes: string[];
  imports: string[];
  exports: string[];
}

export interface CodeExplanation {
  language: string;
  confidence: 'High' | 'Medium' | 'Low';
  summary: string;
  complexity: 'Low' | 'Medium' | 'High';
  structure: CodeStructure;
  aiExplanation?: string;
}

// Language detection patterns - ordered by specificity
const languagePatterns: Record<string, { patterns: RegExp[]; weight: number }> = {
  'TypeScript': {
    patterns: [
      /:\s*(string|number|boolean|any|void|never|unknown)\b/,
      /interface\s+\w+/,
      /type\s+\w+\s*=/,
      /<[A-Z]\w*>/,
      /as\s+(string|number|boolean)/,
    ],
    weight: 10
  },
  'JavaScript': {
    patterns: [
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /function\s+\w+\s*\(/,
      /=>\s*{/,
      /console\.(log|error|warn)/,
      /require\s*\(/,
      /module\.exports/,
    ],
    weight: 8
  },
  'Python': {
    patterns: [
      /def\s+\w+\s*\(/,
      /class\s+\w+.*:/,
      /import\s+\w+/,
      /from\s+\w+\s+import/,
      /if\s+__name__\s*==\s*['"]__main__['"]/,
      /print\s*\(/,
      /self\./,
    ],
    weight: 10
  },
  'Rust': {
    patterns: [
      /fn\s+\w+\s*\(/,
      /let\s+mut\s+/,
      /impl\s+\w+/,
      /pub\s+fn/,
      /use\s+\w+::/,
      /struct\s+\w+/,
      /enum\s+\w+/,
      /match\s+\w+/,
    ],
    weight: 10
  },
  'Go': {
    patterns: [
      /func\s+\w+\s*\(/,
      /package\s+\w+/,
      /import\s+\(/,
      /fmt\.Print/,
      /:=\s*/,
      /func\s+\(.*\)\s+\w+/,
    ],
    weight: 10
  },
  'Java': {
    patterns: [
      /public\s+class\s+\w+/,
      /public\s+static\s+void\s+main/,
      /System\.out\.print/,
      /private\s+\w+\s+\w+;/,
      /import\s+java\./,
      /@Override/,
    ],
    weight: 10
  },
  'C++': {
    patterns: [
      /#include\s*<.*>/,
      /std::/,
      /cout\s*<</,
      /int\s+main\s*\(\s*(void|int)?\s*(,\s*char)?\s*\)/,
      /class\s+\w+\s*{/,
      /namespace\s+\w+/,
    ],
    weight: 9
  },
  'C': {
    patterns: [
      /#include\s*<stdio\.h>/,
      /#include\s*<stdlib\.h>/,
      /printf\s*\(/,
      /int\s+main\s*\(/,
      /malloc\s*\(/,
    ],
    weight: 7
  },
  'C#': {
    patterns: [
      /namespace\s+\w+/,
      /using\s+System/,
      /public\s+class/,
      /Console\.(Write|Read)/,
      /\[.*\]\s*$/m,
    ],
    weight: 10
  },
  'Ruby': {
    patterns: [
      /def\s+\w+/,
      /end$/m,
      /require\s+['"]/,
      /puts\s+/,
      /class\s+\w+\s*$/m,
      /@\w+\s*=/,
    ],
    weight: 8
  },
  'PHP': {
    patterns: [
      /<\?php/,
      /function\s+\w+\s*\(/,
      /\$\w+\s*=/,
      /echo\s+/,
      /->[\w]+/,
    ],
    weight: 10
  },
  'Swift': {
    patterns: [
      /func\s+\w+\s*\(/,
      /var\s+\w+\s*:/,
      /let\s+\w+\s*:/,
      /import\s+Foundation/,
      /guard\s+let/,
      /if\s+let/,
    ],
    weight: 10
  },
  'Kotlin': {
    patterns: [
      /fun\s+\w+\s*\(/,
      /val\s+\w+\s*=/,
      /var\s+\w+\s*:/,
      /class\s+\w+\s*\(/,
      /package\s+\w+/,
    ],
    weight: 10
  },
  'SQL': {
    patterns: [
      /SELECT\s+.*\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+\w+\s+SET/i,
      /CREATE\s+TABLE/i,
      /ALTER\s+TABLE/i,
    ],
    weight: 10
  },
  'HTML': {
    patterns: [
      /<html/i,
      /<div/i,
      /<span/i,
      /<body/i,
      /<head/i,
    ],
    weight: 8
  },
  'CSS': {
    patterns: [
      /\w+\s*{\s*[\w-]+\s*:/,
      /@media\s+/,
      /\.[\w-]+\s*{/,
      /#[\w-]+\s*{/,
    ],
    weight: 8
  },
  'JSON': {
    patterns: [
      /^[\s]*{[\s\S]*}[\s]*$/,
      /"[\w]+"\s*:\s*["{[\d]/,
    ],
    weight: 5
  },
  'YAML': {
    patterns: [
      /^\s*\w+:\s*$/m,
      /^\s*-\s+\w+/m,
    ],
    weight: 5
  },
  'Bash/Shell': {
    patterns: [
      /^#!/,
      /\$\(.*\)/,
      /echo\s+/,
      /if\s+\[\s+/,
      /fi$/m,
    ],
    weight: 8
  },
};

// Detect language with confidence
export function detectLanguage(code: string): { language: string; confidence: 'High' | 'Medium' | 'Low' } {
  const scores: Record<string, number> = {};
  
  for (const [lang, { patterns, weight }] of Object.entries(languagePatterns)) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (pattern.test(code)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      scores[lang] = (matchCount / patterns.length) * weight;
    }
  }
  
  // Find best match
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  
  if (entries.length === 0) {
    return { language: 'Unknown', confidence: 'Low' };
  }
  
  const [topLang, topScore] = entries[0];
  const confidence = topScore > 5 ? 'High' : topScore > 2 ? 'Medium' : 'Low';
  
  return { language: topLang, confidence };
}

// Extract code structure (functions, classes, imports, exports)
export function extractStructure(code: string): CodeStructure {
  const lines = code.split('\n');
  
  const functions: string[] = [];
  const classes: string[] = [];
  const imports: string[] = [];
  const exports: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Functions (various languages)
    const funcPatterns = [
      /function\s+(\w+)/,           // JS/TS
      /def\s+(\w+)/,                // Python
      /fn\s+(\w+)/,                 // Rust
      /func\s+(\w+)/,               // Go/Swift
      /fun\s+(\w+)/,                // Kotlin
      /public\s+.*\s+(\w+)\s*\(/,   // Java/C#
      /private\s+.*\s+(\w+)\s*\(/,  // Java/C#
      /(\w+)\s*=\s*(?:async\s*)?\(/,// Arrow functions
      /(\w+)\s*:\s*(?:async\s*)?\(/,// Object methods
    ];
    
    for (const pattern of funcPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1] && !functions.includes(match[1])) {
        functions.push(match[1]);
        break;
      }
    }
    
    // Arrow functions with const/let
    const arrowMatch = trimmed.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    if (arrowMatch && arrowMatch[1] && !functions.includes(arrowMatch[1])) {
      functions.push(arrowMatch[1]);
    }
    
    // Classes
    const classPatterns = [
      /class\s+(\w+)/,
      /struct\s+(\w+)/,
      /interface\s+(\w+)/,
      /type\s+(\w+)\s*=/,
      /enum\s+(\w+)/,
    ];
    
    for (const pattern of classPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1] && !classes.includes(match[1])) {
        classes.push(match[1]);
        break;
      }
    }
    
    // Imports
    const importPatterns = [
      /import\s+.*from\s+['"](.+)['"]/,
      /import\s+['"](.+)['"]/,
      /import\s+(\w+)/,
      /from\s+(\w+)\s+import/,
      /require\s*\(['"](.+)['"]\)/,
      /#include\s*[<"](.+)[>"]/,
      /use\s+([\w:]+)/,
    ];
    
    for (const pattern of importPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1] && !imports.includes(match[1])) {
        imports.push(match[1]);
        break;
      }
    }
    
    // Exports
    if (trimmed.startsWith('export ')) {
      const exportMatch = trimmed.match(/export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)?\s*(\w+)/);
      if (exportMatch && exportMatch[1] && !exports.includes(exportMatch[1])) {
        exports.push(exportMatch[1]);
      }
    }
    if (trimmed.includes('module.exports')) {
      exports.push('module.exports');
    }
    if (trimmed.startsWith('pub ')) {
      const pubMatch = trimmed.match(/pub\s+(?:fn|struct|enum|mod)\s+(\w+)/);
      if (pubMatch && pubMatch[1]) {
        exports.push(pubMatch[1]);
      }
    }
  }
  
  return { functions, classes, imports, exports };
}

// Calculate complexity based on code structure
export function calculateComplexity(code: string, structure: CodeStructure): { level: 'Low' | 'Medium' | 'High'; score: number; breakdown: string } {
  const lines = code.split('\n').length;
  let score = 0;
  const factors: string[] = [];
  
  // Line count
  score += Math.min(lines / 10, 10);
  if (lines > 100) factors.push(`${lines} lines`);
  
  // Function count
  score += structure.functions.length * 2;
  if (structure.functions.length > 5) factors.push(`${structure.functions.length} functions`);
  
  // Class count
  score += structure.classes.length * 3;
  if (structure.classes.length > 0) factors.push(`${structure.classes.length} types/classes`);
  
  // Nesting (rough estimate via indentation)
  const maxIndent = Math.max(...code.split('\n').map(l => l.match(/^(\s*)/)?.[1].length || 0));
  if (maxIndent > 8) {
    score += 5;
    factors.push('deep nesting');
  }
  
  // Control flow complexity
  const controlPatterns = [/if\s*\(/, /else\s*{/, /for\s*\(/, /while\s*\(/, /switch\s*\(/, /try\s*{/, /catch\s*\(/];
  let controlCount = 0;
  for (const pattern of controlPatterns) {
    const matches = code.match(new RegExp(pattern.source, 'g'));
    if (matches) controlCount += matches.length;
  }
  score += controlCount;
  if (controlCount > 10) factors.push(`${controlCount} control statements`);
  
  const level = score > 30 ? 'High' : score > 15 ? 'Medium' : 'Low';
  const breakdown = factors.length > 0 ? factors.join(', ') : 'Simple code';
  
  return { level, score: Math.round(score), breakdown };
}

// Main analysis function (synchronous - no AI)
export function explainCode(code: string): CodeExplanation {
  const { language, confidence } = detectLanguage(code);
  const structure = extractStructure(code);
  const complexity = calculateComplexity(code, structure);
  
  const lines = code.split('\n').length;
  const totalItems = structure.functions.length + structure.classes.length;
  
  return {
    language,
    confidence,
    summary: `${lines} lines of ${language} code with ${structure.functions.length} functions and ${structure.classes.length} types/classes.`,
    complexity: complexity.level,
    structure,
  };
}

// AI-powered explanation using Groq
export async function getAIExplanation(code: string, language: string): Promise<string> {
  const { groqApiKey } = useSettingsStore.getState();
  
  if (!groqApiKey) {
    return 'Add a Groq API Key in Settings to enable AI explanations.';
  }
  
  try {
    const groq = new Groq({ 
      apiKey: groqApiKey, 
      dangerouslyAllowBrowser: true 
    });
    
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `You are an expert code analyst. Provide a clear, concise explanation of the code. Focus on:
1. What the code does (purpose)
2. Key algorithms or patterns used
3. Notable design choices
4. Potential improvements (if any)

Keep your response under 200 words. Use markdown formatting.`
        },
        {
          role: "user",
          content: `Explain this ${language} code:\n\n\`\`\`${language.toLowerCase()}\n${code}\n\`\`\``
        }
      ]
    });
    
    return response.choices[0]?.message?.content || 'Unable to generate explanation.';
  } catch (error: any) {
    console.error('AI Explanation Error:', error);
    return `Error: ${error.message}. Check your API key in Settings.`;
  }
}
