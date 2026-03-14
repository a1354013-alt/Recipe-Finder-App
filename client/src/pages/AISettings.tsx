/**
 * AI Settings Page
 * 
 * Configure AI provider (Manus or Ollama)
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';

type AIProvider = 'manus' | 'ollama';

export default function AISettings() {
  // All hooks must be called before any conditional returns
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [provider, setProvider] = useState<AIProvider>('manus');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama2');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const getConfigQuery = trpc.ai.getConfig.useQuery();
  const setProviderMutation = trpc.ai.setProvider.useMutation();
  const setOllamaConfigMutation = trpc.ai.setOllamaConfig.useMutation();
  const testConnectionMutation = trpc.ai.testOllamaConnection.useMutation();

  // useEffect must be called before any conditional returns
  useEffect(() => {
    if (getConfigQuery.data) {
      setProvider(getConfigQuery.data.provider);
      if (getConfigQuery.data.ollamaUrl) {
        setOllamaUrl(getConfigQuery.data.ollamaUrl);
      }
      if (getConfigQuery.data.ollamaModel) {
        setOllamaModel(getConfigQuery.data.ollamaModel);
      }
    }
  }, [getConfigQuery.data]);

  // Conditional returns after all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  // 檢查是否為管理員（setProvider / setOllamaConfig 需要管理員權限）
  // 若非管理員，會在 mutation 時收到 403 FORBIDDEN

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const result = await testConnectionMutation.mutateAsync({ url: ollamaUrl });
      if (result.success) {
        setConnectionStatus('success');
        setAvailableModels(result.models);
        toast.success('Ollama 連接成功！');
      } else {
        setConnectionStatus('error');
        toast.error('無法連接到 Ollama，請檢查 URL');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('連接測試失敗');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveProvider = async () => {
    try {
      await setProviderMutation.mutateAsync({ provider });
      toast.success(`已切換到 ${provider === 'manus' ? 'Manus' : 'Ollama'} AI`);
    } catch (error) {
      toast.error('保存設定失敗');
    }
  };

  const handleSaveOllamaConfig = async () => {
    try {
      await setOllamaConfigMutation.mutateAsync({ url: ollamaUrl, model: ollamaModel });
      toast.success('Ollama 設定已保存');
    } catch (error) {
      toast.error('保存 Ollama 設定失敗');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onSearch={handleSearch} />

      {/* Hero Section */}
      <section className="relative py-12 px-4 bg-gradient-to-r from-accent/10 to-accent/5">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-accent rounded-lg">
              <Settings className="w-8 h-8 text-accent-foreground" />
            </div>
          </div>
          <h1 className="font-merriweather font-bold text-4xl md:text-5xl text-accent mb-4">
            AI 提供者設定
          </h1>
          <p className="text-lg text-muted-foreground font-lato max-w-2xl mx-auto">
            選擇使用 Manus AI 或本地 Ollama 進行圖片識別和食譜推薦
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto py-12 px-4">
        {/* AI Provider Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>選擇 AI 提供者</CardTitle>
            <CardDescription>
              選擇用於圖片識別和食譜推薦的 AI 提供者
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Manus Option */}
            <div className="p-4 border-2 rounded-lg cursor-pointer transition-all" 
              style={{
                borderColor: provider === 'manus' ? '#E8743B' : '#E5E7EB',
                backgroundColor: provider === 'manus' ? 'rgba(232, 116, 59, 0.05)' : 'transparent'
              }}
              onClick={() => setProvider('manus')}
            >
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="provider"
                  value="manus"
                  checked={provider === 'manus'}
                  onChange={(e) => setProvider(e.target.value as AIProvider)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-merriweather font-semibold text-foreground">Manus AI</h3>
                  <p className="text-sm text-muted-foreground font-lato mt-1">
                    使用 Manus 內建的 AI 服務，無需額外配置，自動處理所有請求
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground font-lato">
                    <p>✓ 無需本地部署</p>
                    <p>✓ 高精度識別</p>
                    <p>✓ 自動更新模型</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ollama Option */}
            <div className="p-4 border-2 rounded-lg cursor-pointer transition-all"
              style={{
                borderColor: provider === 'ollama' ? '#E8743B' : '#E5E7EB',
                backgroundColor: provider === 'ollama' ? 'rgba(232, 116, 59, 0.05)' : 'transparent'
              }}
              onClick={() => setProvider('ollama')}
            >
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="provider"
                  value="ollama"
                  checked={provider === 'ollama'}
                  onChange={(e) => setProvider(e.target.value as AIProvider)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-merriweather font-semibold text-foreground">本地 Ollama</h3>
                  <p className="text-sm text-muted-foreground font-lato mt-1">
                    使用本地部署的 Ollama 服務，完全隱私，可離線使用
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground font-lato">
                    <p>✓ 完全隱私</p>
                    <p>✓ 可離線使用</p>
                    <p>✓ 自定義模型</p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSaveProvider}
              disabled={setProviderMutation.isPending}
              className="w-full"
            >
              {setProviderMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存提供者設定
            </Button>
          </CardContent>
        </Card>

        {/* Ollama Configuration */}
        {provider === 'ollama' && (
          <Card>
            <CardHeader>
              <CardTitle>Ollama 配置</CardTitle>
              <CardDescription>
                配置本地 Ollama 服務的連接參數
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="ollama-url" className="font-merriweather font-semibold">
                  Ollama 服務 URL
                </Label>
                <Input
                  id="ollama-url"
                  type="url"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="font-lato"
                />
                <p className="text-xs text-muted-foreground font-lato">
                  例如：http://localhost:11434 或 http://127.0.0.1:11434
                </p>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="ollama-model" className="font-merriweather font-semibold">
                  模型選擇
                </Label>
                {availableModels.length > 0 ? (
                  <select
                    id="ollama-model"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md font-lato bg-background"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="ollama-model"
                    type="text"
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    placeholder="例如：llama2, mistral, neural-chat"
                    className="font-lato"
                  />
                )}
                <p className="text-xs text-muted-foreground font-lato">
                  {availableModels.length > 0
                    ? '從已安裝的模型中選擇'
                    : '輸入模型名稱（需要先在 Ollama 中安裝）'}
                </p>
              </div>

              {/* Connection Status */}
              {connectionStatus !== 'idle' && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                  connectionStatus === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {connectionStatus === 'success' ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm font-lato text-green-800">
                        Ollama 連接成功！找到 {availableModels.length} 個模型
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <p className="text-sm font-lato text-red-800">
                        無法連接到 Ollama，請檢查 URL 和服務狀態
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  variant="outline"
                  className="flex-1"
                >
                  {isTestingConnection && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  測試連接
                </Button>
                <Button
                  onClick={handleSaveOllamaConfig}
                  disabled={setOllamaConfigMutation.isPending}
                  className="flex-1"
                >
                  {setOllamaConfigMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  保存配置
                </Button>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                <h4 className="font-merriweather font-semibold text-sm mb-2">如何安裝 Ollama</h4>
                <ol className="text-xs text-muted-foreground font-lato space-y-1 list-decimal list-inside">
                  <li>訪問 <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">ollama.ai</a> 下載安裝</li>
                  <li>運行 Ollama 應用程式</li>
                  <li>在終端運行：<code className="bg-background px-1 py-0.5 rounded">ollama pull llama2</code></li>
                  <li>Ollama 將在 http://localhost:11434 運行</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
