import { Storage } from "@plasmohq/storage";
import { Logger } from "~utils/logger";

export interface CustomModel {
    id: string;
    name: string;
    apiType: string;
    apiKey: string;
    model: string;
    apiBaseUrl: string;
    supportImage: string;
    contextWindow: number;
    temperature: number;
    isReasoning: boolean;
}

export class CustomModelService {
    private static instance: CustomModelService;
    private storage: Storage;
    private customModels: CustomModel[] = [];

    private constructor() {
        this.storage = new Storage();
        this.loadModels();
    }

    public static getInstance(): CustomModelService {
        if (!CustomModelService.instance) {
            CustomModelService.instance = new CustomModelService();
        }
        return CustomModelService.instance;
    }

    private async loadModels(): Promise<void> {
        try {
            const models = await this.storage.get<CustomModel[]>('customModels');
            if (models && Array.isArray(models)) {
                this.customModels = models;
                Logger.log('Custom models loaded:', this.customModels);

                // 发送模型加载完成的消息
                this.notifyModelsLoaded();
            }
        } catch (error) {
            Logger.error('Error loading custom models:', error);
        }
    }

    private notifyModelsLoaded(): void {
        try {
            // 发送消息通知模型已加载完成
            chrome.runtime.sendMessage({
                action: "CUSTOM_MODELS_LOADED",
                modelsCount: this.customModels.length
            }).catch(error => {
                Logger.error('Error sending model loaded notification:', error);
            });

            Logger.log('Custom models loaded notification sent');
        } catch (error) {
            Logger.error('Failed to notify models loaded:', error);
        }
    }

    public async getModels(): Promise<CustomModel[]> {
        if (this.customModels.length === 0) {
            await this.loadModels();
        }
        return this.customModels;
    }

    public async getModelById(id: string): Promise<CustomModel | undefined> {
        if (this.customModels.length === 0) {
            await this.loadModels();
        }
        return this.customModels.find(model => model.id === id);
    }

    public async createChatCompletion(modelId: string, messages: any[], stream = true): Promise<any> {
        const model = await this.getModelById(modelId);
        if (!model) {
            throw new Error(`Model with ID ${modelId} not found`);
        }

        try {
            const response = await fetch(`${model.apiBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${model.apiKey}`
                },
                body: JSON.stringify({
                    model: model.model,
                    messages,
                    temperature: parseFloat(model.temperature.toString()),
                    max_tokens: null,
                    stream
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`);
            }

            if (stream) {
                return response; // 返回响应对象，用于读取流
            } else {
                return await response.json();
            }
        } catch (error) {
            Logger.error('Error calling custom model API:', error);
            throw error;
        }
    }

    public async createStreamingChatCompletion(
        modelId: string,
        messages: any[],
        onChunk: (chunk: any) => void,
        onError: (error: Error) => void,
        onDone: () => void,
        signal?: AbortSignal
    ): Promise<void> {
        try {
            const response = await this.createChatCompletion(modelId, messages, true);

            if (!response.body) {
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            const readChunk = async () => {
                if (signal?.aborted) {
                    reader.cancel();
                    return;
                }

                try {
                    const { done, value } = await reader.read();

                    if (done) {
                        onDone();
                        return;
                    }

                    // 解码块
                    buffer += decoder.decode(value, { stream: true });

                    // 处理SSE格式的数据
                    const lines = buffer.split("\n\n");
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.substring(6);

                            if (data === "[DONE]") {
                                onDone();
                                return;
                            }

                            try {
                                const json = JSON.parse(data);

                                // 确保choices中的delta包含reasoning_content字段
                                if (json.choices && json.choices.length > 0) {
                                    const choice = json.choices[0];

                                    // 如果delta不存在，创建它
                                    if (!choice.delta) {
                                        choice.delta = {};
                                    }

                                    // 确保content和reasoning_content字段存在
                                    if (!choice.delta.content && typeof choice.delta.content !== 'string') {
                                        choice.delta.content = '';
                                    }

                                    // 如果服务器提供了reasoning_content，使用它
                                    if (choice.delta.reasoning_content === undefined) {
                                        choice.delta.reasoning_content = '';
                                    }
                                }

                                onChunk(json);
                            } catch (e) {
                                Logger.error("Error parsing SSE chunk:", e);
                            }
                        }
                    }

                    // 继续读取下一块
                    await readChunk();
                } catch (error) {
                    Logger.error("Error reading from stream:", error);
                    onError(error instanceof Error ? error : new Error(String(error)));
                }
            };

            await readChunk();

        } catch (error) {
            Logger.error("Stream creation error:", error);
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    }

    public isImageSupported(modelId: string): Promise<boolean> {
        return this.getModelById(modelId).then(model => {
            return model?.supportImage === 'Yes';
        });
    }

    public getContextWindowSize(modelId: string): Promise<number> {
        return this.getModelById(modelId).then(model => {
            return model?.contextWindow || 4000;
        });
    }
} 