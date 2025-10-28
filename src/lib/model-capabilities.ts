/**
 * Model capabilities detection for OpenCode Web
 * Determines which models support image/vision inputs
 */

export interface ModelCapabilities {
  supportsImages: boolean;
  supportsVision: boolean;
  maxImageSize?: number;
  supportedImageFormats?: string[];
}

interface Model {
  providerID?: string;
  modelID?: string;
  name?: string;
}

/**
 * Get the capabilities of a model
 * @param model - Model to check capabilities for
 * @returns Model capabilities including image support
 */
export function getModelCapabilities(model: Model | null | undefined): ModelCapabilities {
  if (!model) {
    return {
      supportsImages: false,
      supportsVision: false,
    };
  }

  // List of known vision-capable models
  const visionModels = [
    'gpt-4-vision',
    'gpt-4-turbo',
    'gpt-4o',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'claude-3.5-sonnet',
    'claude-3-5-sonnet',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-pro-vision',
  ];

  // Build a lowercase identifier for the model
  const modelId = model.name?.toLowerCase() || 
                  `${model.providerID || ''}/${model.modelID || ''}`.toLowerCase();

  const supportsVision = visionModels.some(vm => 
    modelId.includes(vm.toLowerCase())
  );

  return {
    supportsImages: supportsVision,
    supportsVision,
    maxImageSize: supportsVision ? 10 * 1024 * 1024 : 0, // 10MB
    supportedImageFormats: supportsVision 
      ? ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] 
      : [],
  };
}

/**
 * Check if a model supports image inputs
 * @param model - Model to check
 * @returns true if model supports images
 */
export function modelSupportsImages(model: Model | null | undefined): boolean {
  return getModelCapabilities(model).supportsImages;
}
