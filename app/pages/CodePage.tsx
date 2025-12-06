import { useState } from 'react';
import { Button } from '../components/ui/button';
import { explainCode, getAIExplanation, CodeExplanation } from '../lib/explainer';
import { Loader2, Sparkles, Code2, FileCode, Package, Upload, Zap } from 'lucide-react';
import { useSettingsStore } from '../lib/store/settings-store';

export default function CodeExplorerPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<CodeExplanation | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const { groqApiKey } = useSettingsStore();

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setAiExplanation(null);
    
    // Small delay for UX
    setTimeout(() => {
      const analysis = explainCode(code);
      setResult(analysis);
      setIsAnalyzing(false);
    }, 300);
  };

  const handleAIExplain = async () => {
    if (!result) return;
    
    setIsAiLoading(true);
    const explanation = await getAIExplanation(code, result.language);
    setAiExplanation(explanation);
    setIsAiLoading(false);
  };

  const confidenceColor = (conf: string) => {
    switch (conf) {
      case 'High': return 'bg-green-500/20 text-green-500';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const complexityColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-500/20 text-red-500';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-500';
      default: return 'bg-green-500/20 text-green-500';
    }
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Code2 className="h-6 w-6" />
          Code Explorer
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste any code snippet and get instant analysis with AI-powered explanations.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Code Input */}
        <div className="flex flex-col gap-4">
          <textarea 
            className="flex-1 bg-card border border-border rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[300px]"
            placeholder="// Paste your code here...

function example() {
  console.log('Hello, World!');
}"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button 
            onClick={handleAnalyze} 
            disabled={!code.trim() || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Analyze Code
              </>
            )}
          </Button>
        </div>

        {/* Results Panel */}
        <div className="bg-card border border-border rounded-lg p-6 overflow-y-auto">
          {result ? (
            <div className="space-y-6">
              {/* Language & Confidence */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Language</span>
                  <div className="text-xl font-bold">{result.language}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${confidenceColor(result.confidence)}`}>
                  {result.confidence} Confidence
                </span>
              </div>
              
              {/* Complexity */}
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Complexity</span>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${complexityColor(result.complexity)}`}>
                  {result.complexity}
                </span>
              </div>

              {/* Summary */}
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Summary</span>
                <p className="text-sm">{result.summary}</p>
              </div>

              {/* Structure */}
              <div className="grid grid-cols-2 gap-4">
                {result.structure.functions.length > 0 && (
                  <div className="bg-background/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <FileCode className="h-3 w-3" />
                      Functions ({result.structure.functions.length})
                    </div>
                    <ul className="space-y-1 text-xs font-mono">
                      {result.structure.functions.slice(0, 8).map((f, i) => (
                        <li key={i} className="truncate text-primary">{f}()</li>
                      ))}
                      {result.structure.functions.length > 8 && (
                        <li className="text-muted-foreground">+{result.structure.functions.length - 8} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {result.structure.classes.length > 0 && (
                  <div className="bg-background/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Package className="h-3 w-3" />
                      Types/Classes ({result.structure.classes.length})
                    </div>
                    <ul className="space-y-1 text-xs font-mono">
                      {result.structure.classes.slice(0, 8).map((c, i) => (
                        <li key={i} className="truncate text-blue-400">{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.structure.imports.length > 0 && (
                  <div className="bg-background/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Upload className="h-3 w-3" />
                      Imports ({result.structure.imports.length})
                    </div>
                    <ul className="space-y-1 text-xs font-mono">
                      {result.structure.imports.slice(0, 5).map((i, idx) => (
                        <li key={idx} className="truncate text-yellow-400">{i}</li>
                      ))}
                      {result.structure.imports.length > 5 && (
                        <li className="text-muted-foreground">+{result.structure.imports.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {result.structure.exports.length > 0 && (
                  <div className="bg-background/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Package className="h-3 w-3" />
                      Exports ({result.structure.exports.length})
                    </div>
                    <ul className="space-y-1 text-xs font-mono">
                      {result.structure.exports.slice(0, 5).map((e, i) => (
                        <li key={i} className="truncate text-green-400">{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* AI Explanation */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Explanation
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAIExplain}
                    disabled={isAiLoading}
                  >
                    {isAiLoading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : groqApiKey ? (
                      <>
                        <Sparkles className="h-3 w-3 mr-2" />
                        Explain with AI
                      </>
                    ) : (
                      'Add API Key in Settings'
                    )}
                  </Button>
                </div>
                
                {aiExplanation && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm prose prose-sm prose-invert max-w-none">
                    <div className="whitespace-pre-wrap">{aiExplanation}</div>
                  </div>
                )}
                
                {!aiExplanation && !isAiLoading && (
                  <p className="text-xs text-muted-foreground">
                    Click "Explain with AI" to get a detailed explanation powered by Groq Llama 3.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center">
              <Code2 className="h-12 w-12 mb-4 opacity-30" />
              <p>Paste code and click <strong>Analyze</strong></p>
              <p className="text-xs mt-2">Supports 15+ programming languages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
