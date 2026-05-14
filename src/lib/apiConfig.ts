export interface ApiConfig {
  platform: 'gemini' | 'openai' | 'siliconflow' | 'custom';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const DEFAULT_CONFIG: ApiConfig = {
  platform: 'gemini',
  apiKey: '',
  baseUrl: '',
  model: 'gemini-2.5-flash',
};

const STORAGE_KEY = 'mem_thesis_api_config';

export function getApiConfig(): ApiConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load API config', e);
  }
  return DEFAULT_CONFIG;
}

export function saveApiConfig(config: ApiConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
