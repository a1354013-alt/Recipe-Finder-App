/**
 * AI Configuration Manager
 * 
 * Manages AI provider settings (Manus or Ollama)
 * Stores configuration in environment variables and memory
 */

export type AIProvider = 'manus' | 'ollama';

export interface AIProviderConfig {
  provider: AIProvider;
  ollamaUrl?: string;
  ollamaModel?: string;
}

class AIConfigManager {
  private config: AIProviderConfig = {
    provider: 'manus',
    ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama2',
  };

  /**
   * Get current AI provider configuration
   */
  getConfig(): AIProviderConfig {
    return { ...this.config };
  }

  /**
   * Set AI provider
   */
  setProvider(provider: AIProvider): void {
    this.config.provider = provider;
  }

  /**
   * Set Ollama configuration
   */
  setOllamaConfig(url: string, model: string): void {
    this.config.ollamaUrl = url;
    this.config.ollamaModel = model;
  }

  /**
   * Get current provider
   */
  getProvider(): AIProvider {
    return this.config.provider;
  }

  /**
   * Get Ollama configuration
   */
  getOllamaConfig(): { url: string; model: string } {
    return {
      url: this.config.ollamaUrl || 'http://localhost:11434',
      model: this.config.ollamaModel || 'llama2',
    };
  }

  /**
   * Check if using Ollama
   */
  isUsingOllama(): boolean {
    return this.config.provider === 'ollama';
  }

  /**
   * Check if using Manus
   */
  isUsingManus(): boolean {
    return this.config.provider === 'manus';
  }
}

// Singleton instance
export const aiConfigManager = new AIConfigManager();
