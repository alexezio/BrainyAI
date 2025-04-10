import { CustomModelService } from "./CustomModelService";
import { Logger } from "~utils/logger";
import { ErrorCode } from "~utils/errors";
import { BotCompletionParams } from "~libs/chatbot/IBot";
import { ConversationResponse, ResponseMessageType } from "~libs/open-ai/open-ai-interface";
import { BotBase } from "~libs/chatbot/BotBase";
import { BotSession, SimpleBotMessage } from "~libs/chatbot/BotSessionBase";

// CustomModelSessionSingleton用于管理会话
class CustomModelSessionSingleton {
    static globalConversationId: string;
    private static instances: Map<string, CustomModelSessionSingleton> = new Map();
    session: BotSession;

    private constructor(globalConversationId: string, modelId: string) {
        this.session = new BotSession(globalConversationId);
        // 可以在这里添加modelId特定的初始化
    }

    static getInstance(globalConversationId: string, modelId: string): CustomModelSessionSingleton {
        const key = `${globalConversationId}_${modelId}`;

        if (this.globalConversationId !== globalConversationId) {
            // 如果会话ID变了，清除之前的实例
            this.instances.delete(key);
        }

        if (!this.instances.has(key)) {
            this.instances.set(key, new CustomModelSessionSingleton(globalConversationId, modelId));
        }

        this.globalConversationId = globalConversationId;
        return this.instances.get(key)!;
    }
}

export class CustomModelBot extends BotBase {
    static botName = "Custom Model";
    static logoSrc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWJyYWluLWNpcmJ1aXQiPjxwYXRoIGQ9Ik0xMiA0YTUgNSAwIDAgMC01IDV2MTFhMyAzIDAgMCAwIDMgM2g0YTMgMyAwIDAgMCAzLTN2LTdhMiAyIDAgMCAwLTItMiIvPjxwYXRoIGQ9Ik0xOS44OTYgNEMxOS4zIDQuOCAxOCA1LjEgMTcgNWMtMi4yLS4yLTQgMS4xLTQgMyIvPjxwYXRoIGQ9Ik04IDljLTIuIDMtMyAzLjUtNyAyIi8+PHBhdGggZD0iTTkgMTlhMSAxIDAgMSAxIDAgMiIvPjxwYXRoIGQ9Ik01IDEyYTEgMSAwIDEgMCAwLTIiLz48cGF0aCBkPSJNMTkgMTJhMSAxIDAgMSAwIDAtMiIvPjwvc3ZnPg==";
    static maxTokenLimit = 8000;
    static supportUploadPDF = false;
    static supportUploadImage = false;
    static paidModel = false;
    static newModel = true;
    static isCustomModel = true;
    static loginUrl = 'https://example.com'; // Default login URL
    static requireLogin = false; // Custom models don't require login as they use API keys
    static desc = 'Custom model using your own API configuration.'; // 添加模型描述
    static isReasoning = false; // 是否为推理模型，控制是否显示思考过程

    // 添加静态方法 checkIsLogin 和 checkModelCanUse
    static async checkIsLogin(): Promise<[any | null, boolean]> {
        // 自定义模型不需要登录，直接返回已登录状态
        return [null, true];
    }

    static async checkModelCanUse(): Promise<boolean> {
        // 自定义模型一直可用
        return true;
    }

    conversationId: string = ''; // 添加 conversationId 属性，IBot 接口需要
    supportedUploadTypes: string[] = []; // 添加 supportedUploadTypes 属性，IBot 接口需要

    private customModelId: string;
    private customModelService: CustomModelService;
    private controller: AbortController | null = null;
    botSession: CustomModelSessionSingleton; // 添加botSession属性
    private messageText: string = '';
    private messageID: string = '';

    constructor(params: any) {
        super(params);
        if (typeof params === 'string') {
            // 处理直接传入modelId的情况
            this.customModelId = params;
            this.botSession = CustomModelSessionSingleton.getInstance(this.conversationId, this.customModelId);
        } else {
            // 处理传入构造参数对象的情况
            this.customModelId = params.customModelId || '';
            this.botSession = CustomModelSessionSingleton.getInstance(params.globalConversationId, this.customModelId);
        }
        this.customModelService = CustomModelService.getInstance();
    }

    // 处理思考内容的辅助函数
    private processThinkingContent(content: string, reasoningContent: string | null): { processedContent: string, thinkingContent: string | null } {
        // 不是推理模型，直接返回原始内容
        if (!CustomModelBot.isReasoning) {
            return { processedContent: content || '', thinkingContent: null };
        }

        // 如果有推理内容
        if (reasoningContent) {
            return {
                processedContent: content || '',
                thinkingContent: `【思考过程】：\n${reasoningContent.trim()}\n\n【回答】：`
            };
        }

        return { processedContent: content || '', thinkingContent: null };
    }

    // 实现 IBot 接口所需的 completion 方法
    public async completion({ prompt, rid, cb }: BotCompletionParams): Promise<void> {
        try {
            // 获取自定义模型信息
            const model = await this.customModelService.getModelById(this.customModelId);
            if (!model) {
                cb(
                    rid,
                    new ConversationResponse({
                        message_type: ResponseMessageType.ERROR,
                        error: {
                            code: ErrorCode.UNKNOWN_ERROR,
                            message: `Custom model with ID ${this.customModelId} not found`
                        }
                    })
                );
                return;
            }

            // 设置支持图片的属性和推理模型属性
            CustomModelBot.supportUploadImage = model.supportImage === 'Yes';
            CustomModelBot.maxTokenLimit = model.contextWindow;
            CustomModelBot.isReasoning = !!model.isReasoning;

            // 准备 OpenAI 格式的消息，加入历史消息
            const messages = this.getOpenAIMessages(prompt);

            Logger.log('Custom model completion with messages:', messages);

            // 创建可中止的控制器
            this.controller = new AbortController();

            // 用于收集累积的内容
            let accumulatedContent = '';
            let accumulatedReasoningContent = '';
            let processedFinalContent = '';
            let isDone = false;

            // 使用流式响应
            try {
                await this.customModelService.createStreamingChatCompletion(
                    this.customModelId,
                    messages,
                    // 处理每个数据块
                    (chunk) => {
                        try {
                            if (chunk.choices && chunk.choices.length > 0) {
                                const choice = chunk.choices[0];
                                const content = choice.delta?.content || '';
                                const reasoningContent = choice.delta?.reasoning_content || '';

                                // 添加到累积内容
                                if (content) accumulatedContent += content;
                                if (reasoningContent) accumulatedReasoningContent += reasoningContent;

                                // 处理累积内容中的思考过程
                                if (CustomModelBot.isReasoning) {
                                    const { processedContent, thinkingContent } = this.processThinkingContent(
                                        accumulatedContent,
                                        accumulatedReasoningContent
                                    );

                                    // 构建完整的响应文本
                                    let responseText = processedContent;
                                    if (thinkingContent) {
                                        responseText = thinkingContent + processedContent;
                                    }

                                    processedFinalContent = responseText;
                                    this.messageText = responseText;
                                    this.messageID = rid;

                                    // 发送生成中的消息
                                    cb(
                                        rid,
                                        new ConversationResponse({
                                            message_text: responseText,
                                            message_type: ResponseMessageType.GENERATING
                                        })
                                    );
                                } else {
                                    // 没有推理模型，直接返回累积内容
                                    processedFinalContent = accumulatedContent;
                                    this.messageText = accumulatedContent;
                                    this.messageID = rid;

                                    cb(
                                        rid,
                                        new ConversationResponse({
                                            message_text: accumulatedContent,
                                            message_type: ResponseMessageType.GENERATING
                                        })
                                    );
                                }
                            }
                        } catch (error) {
                            Logger.error('Error processing chunk:', error);
                        }
                    },
                    // 处理错误
                    (error) => {
                        Logger.error('Error in streaming chat completion:', error);
                        cb(
                            rid,
                            new ConversationResponse({
                                message_type: ResponseMessageType.ERROR,
                                error: {
                                    code: ErrorCode.UNKNOWN_ERROR,
                                    message: error.message || 'Error in streaming response'
                                }
                            })
                        );
                    },
                    // 完成回调
                    () => {
                        isDone = true;
                        cb(
                            rid,
                            new ConversationResponse({
                                message_text: processedFinalContent,
                                message_type: ResponseMessageType.DONE
                            })
                        );

                        // 保存消息到会话历史
                        this.botSession.session.addMessage(new SimpleBotMessage(this.messageText, this.messageID));
                    },
                    // 中止控制器
                    this.controller ? this.controller.signal : undefined
                );
            } catch (error) {
                Logger.error('Error in streaming chat completion call:', error);
                cb(
                    rid,
                    new ConversationResponse({
                        message_type: ResponseMessageType.ERROR,
                        error: {
                            code: ErrorCode.UNKNOWN_ERROR,
                            message: error.message || 'Error calling streaming API'
                        }
                    })
                );
            }
        } catch (error) {
            Logger.error('Error in custom model completion:', error);

            cb(
                rid,
                new ConversationResponse({
                    message_type: ResponseMessageType.ERROR,
                    error: {
                        code: ErrorCode.UNKNOWN_ERROR,
                        message: error.message || 'Unknown error'
                    }
                })
            );
        }
    }

    // 获取OpenAI格式的消息，包括历史消息
    private getOpenAIMessages(currentPrompt: string): Array<{ role: string, content: string }> {
        const messages: Array<{ role: string, content: string }> = [];

        // 添加历史消息
        const historyMessages = this.botSession.session.messages;

        // 添加历史对话
        let isUserMessage = true;
        for (const msg of historyMessages) {
            // 交替添加用户和助手消息
            messages.push({
                role: isUserMessage ? 'user' : 'assistant',
                content: msg.text
            });
            isUserMessage = !isUserMessage;
        }

        // 添加当前提示
        messages.push({
            role: 'user',
            content: currentPrompt
        });

        return messages;
    }

    public async chat(prompt: any, onEvent?: (event: any) => void): Promise<string> {
        try {
            // 获取自定义模型信息
            const model = await this.customModelService.getModelById(this.customModelId);
            if (!model) {
                throw new Error(`Custom model with ID ${this.customModelId} not found`);
            }

            // 设置支持图片的属性和推理模型属性
            CustomModelBot.supportUploadImage = model.supportImage === 'Yes';
            CustomModelBot.maxTokenLimit = model.contextWindow;
            CustomModelBot.isReasoning = !!model.isReasoning;

            // 准备 OpenAI 格式的消息，使用历史记录
            let messages;
            if (typeof prompt === 'string') {
                messages = this.getOpenAIMessages(prompt);
            } else if (prompt && typeof prompt.getOpenAIMessages === 'function') {
                messages = prompt.getOpenAIMessages();
            } else {
                messages = this.getOpenAIMessages(String(prompt));
            }

            Logger.log('Custom model chat with messages:', messages);

            // 创建可中止的控制器
            this.controller = new AbortController();

            // 用于收集响应内容
            let finalContent = '';
            let accumulatedContent = '';
            let accumulatedReasoningContent = '';
            const messageID = Date.now().toString();

            return new Promise((resolve, reject) => {
                this.customModelService.createStreamingChatCompletion(
                    this.customModelId,
                    messages,
                    // 处理每个数据块
                    (chunk) => {
                        try {
                            if (chunk.choices && chunk.choices.length > 0) {
                                const choice = chunk.choices[0];
                                const content = choice.delta?.content || '';
                                const reasoningContent = choice.delta?.reasoning_content || '';

                                // 添加到累积内容
                                if (content) accumulatedContent += content;
                                if (reasoningContent) accumulatedReasoningContent += reasoningContent;

                                // 处理思考内容
                                if (CustomModelBot.isReasoning) {
                                    const { processedContent, thinkingContent } = this.processThinkingContent(
                                        accumulatedContent,
                                        accumulatedReasoningContent
                                    );

                                    // 构建完整的响应文本
                                    let responseText = processedContent;
                                    if (thinkingContent) {
                                        responseText = thinkingContent + processedContent;
                                    }

                                    finalContent = responseText;

                                    // 通知事件处理器
                                    if (onEvent) {
                                        onEvent({
                                            type: "update",
                                            message: responseText
                                        });
                                    }
                                } else {
                                    // 没有思考过程，直接更新内容
                                    finalContent = accumulatedContent;

                                    if (onEvent) {
                                        onEvent({
                                            type: "update",
                                            message: accumulatedContent
                                        });
                                    }
                                }
                            }
                        } catch (error) {
                            Logger.error('Error processing chunk in chat:', error);
                        }
                    },
                    // 处理错误
                    (error) => {
                        Logger.error('Error in streaming chat:', error);

                        if (onEvent) {
                            onEvent({
                                type: "error",
                                error: {
                                    code: ErrorCode.UNKNOWN_ERROR,
                                    message: error.message || 'Error in streaming response'
                                }
                            });
                        }

                        reject(error);
                    },
                    // 完成回调
                    () => {
                        // 保存消息到历史记录
                        if (typeof prompt === 'string') {
                            // 保存用户消息
                            this.botSession.session.addMessage(new SimpleBotMessage(prompt, Date.now().toString()));
                            // 保存助手回复
                            this.botSession.session.addMessage(new SimpleBotMessage(finalContent, messageID));
                        }

                        if (onEvent) {
                            onEvent({
                                type: "done",
                                message: finalContent
                            });
                        }

                        resolve(finalContent);
                    },
                    // 中止控制器
                    this.controller ? this.controller.signal : undefined
                );
            });
        } catch (error) {
            Logger.error('Error in chat method:', error);
            throw error;
        }
    }

    public abort() {
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
    }

    public async startAuth(): Promise<boolean> {
        // 自定义模型不需要登录
        return true;
    }

    public async startCaptcha(): Promise<boolean> {
        // 自定义模型不需要验证码
        return true;
    }

    public async uploadFile(file: File): Promise<string> {
        // 自定义模型目前不支持文件上传
        throw new Error('File upload not supported for custom models');
    }

    public getBotName(): string {
        return CustomModelBot.botName;
    }

    public getRequireLogin(): boolean {
        return CustomModelBot.requireLogin;
    }

    public getLogoSrc(): string {
        return CustomModelBot.logoSrc;
    }

    public getLoginUrl(): string {
        return CustomModelBot.loginUrl;
    }

    public getSupportUploadPDF(): boolean {
        return CustomModelBot.supportUploadPDF;
    }

    public getSupportUploadImage(): boolean {
        return CustomModelBot.supportUploadImage;
    }

    public getMaxTokenLimit(): number {
        return CustomModelBot.maxTokenLimit;
    }

    public getPaidModel(): boolean {
        return CustomModelBot.paidModel;
    }

    public getNewModel(): boolean {
        return CustomModelBot.newModel;
    }
}

// Factory function to create custom model bot class
export function createCustomModelBot(customModelId: string) {
    const CustomBot = class extends CustomModelBot {
        constructor(params) {
            const newParams = { ...params, customModelId };
            super(newParams);
        }
    };

    return CustomBot;
}