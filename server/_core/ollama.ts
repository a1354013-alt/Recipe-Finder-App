/**
 * Ollama AI Integration Layer
 * 
 * Provides utilities to communicate with local Ollama instances
 * Supports image recognition and recipe recommendations
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_count: number;
  eval_duration: number;
}

export class OllamaClient {
  private client: AxiosInstance;
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 300000, // 5 minutes timeout for long-running requests
    });
  }

  /**
   * Test connection to Ollama server
   */
  async testConnection(requestId?: string): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags');
      return response.status === 200;
    } catch (error) {
      logger.error(
        '[Ollama] Connection test failed',
        error instanceof Error ? error : new Error(String(error)),
        undefined,
        requestId
      );
      return false;
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels(requestId?: string): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models.map((m: any) => m.name);
    } catch (error) {
      logger.error(
        '[Ollama] Failed to get models',
        error instanceof Error ? error : new Error(String(error)),
        undefined,
        requestId
      );
      return [];
    }
  }

  /**
   * Send a message to Ollama and get response
   */
  async chat(messages: OllamaMessage[], model?: string, requestId?: string): Promise<string> {
    try {
      const response = await this.client.post<OllamaResponse>('/api/chat', {
        model: model || this.config.model,
        messages,
        stream: false,
      });

      return response.data.message.content;
    } catch (error) {
      logger.error(
        '[Ollama] Chat error',
        error instanceof Error ? error : new Error(String(error)),
        undefined,
        requestId
      );
      throw new Error(`Ollama chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Recognize ingredients from image using Ollama with vision capabilities
   */
  async recognizeIngredients(imageBase64: string, imageUrl?: string): Promise<any> {
    try {
      const systemPrompt = `You are an expert food and ingredient recognition AI. Analyze the provided image and identify all visible food ingredients. 
Return a JSON object with the following structure:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": "estimated quantity",
      "unit": "unit of measurement"
    }
  ],
  "confidence": 0.95,
  "notes": "any additional notes"
}`;

      const userPrompt = imageUrl
        ? `Please identify all the ingredients visible in this image and provide their estimated quantities. Image URL: ${imageUrl}`
        : `Please identify all the ingredients visible in this image and provide their estimated quantities.`;

      const messages: OllamaMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ];

      const response = await this.chat(messages);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error(
        '[Ollama] Ingredient recognition error',
        error instanceof Error ? error : new Error(String(error)),
        undefined
      );
      throw new Error(
        `Failed to recognize ingredients: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get recipe recommendations based on ingredients
   */
  async getRecipeRecommendations(ingredients: string[], maxRecipes: number = 5): Promise<any> {
    try {
      const ingredientsList = ingredients.join(', ');

      const systemPrompt = `You are a creative culinary expert. Given a list of ingredients, suggest delicious recipes that can be made with these ingredients.
Return a JSON object with the following structure:
{
  "recipes": [
    {
      "name": "recipe name",
      "description": "brief description",
      "ingredients_used": ["ingredient1", "ingredient2"],
      "difficulty": "easy|medium|hard",
      "cookTime": 30,
      "servings": 4
    }
  ]
}`;

      const userPrompt = `I have these ingredients available: ${ingredientsList}. Please suggest ${maxRecipes} delicious recipes I can make with them. Prioritize recipes that use most of these ingredients.`;

      const messages: OllamaMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ];

      const response = await this.chat(messages);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error(
        '[Ollama] Recipe recommendation error',
        error instanceof Error ? error : new Error(String(error)),
        undefined
      );
      throw new Error(
        `Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Create Ollama client instance
 */
export function createOllamaClient(baseUrl: string = 'http://localhost:11434', model: string = 'llama2'): OllamaClient {
  return new OllamaClient({ baseUrl, model });
}
