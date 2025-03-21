import React, { createContext, useEffect, useRef, useState } from "react";
import { getLatestState } from "~utils";
import { Llavav1634b } from "~libs/chatbot/perplexity/Llavav1634b";
import { KimiBot } from "~libs/chatbot/kimi";
import { CopilotBot } from "~libs/chatbot/copilot";
import ChatGPT35Turbo from "~libs/chatbot/openai/ChatGPT35Turbo";
import { Gemma7bIt } from "~libs/chatbot/perplexity/Gemma7bIt";
import { Mistral822b } from "~libs/chatbot/perplexity/Mistral822b";
import { Llama3SonarLarge32KChat } from "~libs/chatbot/perplexity/Llama3SonarLarge32KChat";
import { Storage } from "@plasmohq/storage";
import { Llama3SonarLarge32kOnline } from "~libs/chatbot/perplexity/Llama3SonarLarge32kOnline";
import { Claude3Haiku } from "~libs/chatbot/perplexity/Claude3Haiku";
import { Llama370bInstruct } from "~libs/chatbot/perplexity/Llama370bInstruct";
import ChatGPT4Turbo from "~libs/chatbot/openai/ChatGPT4Turbo";
import { Logger } from "~utils/logger";
import ChatGPT4O from "~libs/chatbot/openai/ChatGPT4o";
import ArkoseGlobalSingleton from "~libs/chatbot/openai/Arkose";
import { CustomModelService, CustomModel } from "~libs/chatbot/custom/CustomModelService";
import { createCustomModelBot, CustomModelBot } from "~libs/chatbot/custom/CustomModelBot";

export type M = (
    typeof ChatGPT35Turbo
    | typeof CopilotBot
    | typeof KimiBot
    | typeof Gemma7bIt
    | typeof Llavav1634b
    | typeof Mistral822b
    | typeof Llama3SonarLarge32KChat
    | typeof Llama370bInstruct
    | typeof Claude3Haiku
    | typeof Llama3SonarLarge32kOnline
    | typeof ChatGPT4Turbo
    | typeof ChatGPT4O
    | any
)

export type Ms = M[]

export interface CMsItem {
    label: string;
    models: M[];
}
export type CMs = CMsItem[]

interface IModelManagementProvider {
    currentBots: Ms;
    setCurrentBots: React.Dispatch<React.SetStateAction<Ms>>;
    allModels: React.MutableRefObject<Ms>;
    categoryModels: React.MutableRefObject<CMs>;
    saveCurrentBotsKeyLocal: () => void;
    loadCustomModels: () => Promise<void>;
}

export const ModelManagementContext = createContext({} as IModelManagementProvider);

export default function ModelManagementProvider({ children }) {
    const defaultModels: Ms = [];
    const [currentBots, setCurrentBots] = useState<IModelManagementProvider['currentBots']>(defaultModels);
    const allModels = useRef<Ms>([Llama3SonarLarge32KChat, Llama3SonarLarge32kOnline, Claude3Haiku, ChatGPT35Turbo, ChatGPT4O, ChatGPT4Turbo, CopilotBot, KimiBot, Llama370bInstruct, Gemma7bIt, Llavav1634b, Mistral822b]);
    const storage = new Storage();
    const [isLoaded, setIsLoaded] = useState(false);
    const [customBotsLoaded, setCustomBotsLoaded] = useState(false);
    const categoryModels = useRef<CMs>([
        {
            label: "OpenAI",
            models: [ChatGPT35Turbo, ChatGPT4Turbo, ChatGPT4O]
        },
        {
            label: "Microsoft",
            models: [CopilotBot]
        },
        {
            label: "Moonshot",
            models: [KimiBot]
        },
        {
            label: "Perplexity",
            models: [Llama3SonarLarge32KChat, Llama3SonarLarge32kOnline, Claude3Haiku, Llama370bInstruct, Gemma7bIt, Llavav1634b, Mistral822b]
        },
        {
            label: "Custom Models",
            models: []
        }
    ]);

    // 加载自定义模型
    const loadCustomModels = async () => {
        try {
            const customModelService = CustomModelService.getInstance();
            const customModels = await customModelService.getModels();
            const defaultModelId = await storage.get('defaultModel');
            let defaultModelBot = null;
            let firstCustomModel = null;

            if (customModels && customModels.length > 0) {
                // 创建自定义模型对象
                const customModelBots = customModels.map((model, index) => {
                    // 使用工厂函数创建自定义模型机器人类
                    const CustomBot = createCustomModelBot(model.id);
                    // 设置自定义模型属性
                    CustomBot.botName = model.name;
                    CustomBot.maxTokenLimit = model.contextWindow;
                    CustomBot.supportUploadImage = model.supportImage === 'Yes';
                    CustomBot.isReasoning = !!model.isReasoning;

                    // 记录第一个自定义模型，以便在没有默认模型时使用
                    if (index === 0) {
                        firstCustomModel = CustomBot;
                    }

                    // 设置登录URL以防止URL构造错误
                    // 确保apiBaseUrl是有效的URL
                    let loginUrl = model.apiBaseUrl;
                    try {
                        // 验证URL格式，如果不是有效URL则使用默认值
                        new URL(loginUrl);
                    } catch (error) {
                        // 如果不是有效URL，设置为默认值
                        loginUrl = 'https://example.com';
                        Logger.error(`Invalid API Base URL for model ${model.name}, using default URL`);
                    }
                    CustomBot.loginUrl = loginUrl;

                    // 确保实例化时传入 globalConversationId 参数
                    CustomBot.prototype.constructor = function (params) {
                        this.conversationId = params.globalConversationId || '';
                        CustomModelBot.call(this, model.id);
                    };

                    // 如果是默认模型，记录下来
                    if (model.id === defaultModelId) {
                        defaultModelBot = CustomBot;
                        Logger.log(`找到默认模型: ${model.name}`);
                    }

                    return CustomBot;
                });

                // 将自定义模型添加到所有模型列表
                allModels.current = [...customModelBots, ...allModels.current];
                Logger.log('全部模型列表已更新，自定义模型放在前面');

                // 更新自定义模型分类
                const customModelCategory = categoryModels.current.find(category => category.label === "Custom Models");
                if (customModelCategory) {
                    customModelCategory.models = [...customModelBots];
                }

                // 优先使用自定义模型
                // 1. 如果有默认模型，使用默认模型
                // 2. 如果没有默认模型，使用第一个自定义模型
                // 3. 只有在没有自定义模型时才使用内置模型

                // 尝试清除之前可能设置的currentModelsKey，确保使用我们新设置的值
                await storage.remove('currentModelsKey');

                // 设置当前机器人
                if (defaultModelBot) {
                    Logger.log(`使用默认模型作为当前模型: ${defaultModelBot.botName}`);
                    setCurrentBots([defaultModelBot]);
                    await storage.set('currentModelsKey', [defaultModelBot.botName]);
                } else if (firstCustomModel) {
                    Logger.log(`没有默认模型，使用第一个自定义模型: ${firstCustomModel.botName}`);
                    setCurrentBots([firstCustomModel]);
                    await storage.set('currentModelsKey', [firstCustomModel.botName]);
                    // 同时设置为默认模型
                    const firstModelId = customModels[0].id;
                    await storage.set('defaultModel', firstModelId);
                    Logger.log(`设置 ${firstCustomModel.botName} 为默认模型`);
                }

                Logger.log('自定义模型加载完成:', customModelBots.map(bot => bot.botName));
            } else {
                // 没有自定义模型，使用默认内置模型
                Logger.log('没有找到自定义模型，将使用默认内置模型');
                setCurrentBots([ChatGPT35Turbo, CopilotBot, KimiBot]);
            }

            setCustomBotsLoaded(true);
        } catch (error) {
            Logger.error('加载自定义模型出错:', error);
            // 出错时也使用默认内置模型
            setCurrentBots([ChatGPT35Turbo, CopilotBot, KimiBot]);
            setCustomBotsLoaded(true);
        }
    };

    const handleModelStorge = async () => {
        try {
            // 先检查自定义模型是否已加载
            if (!customBotsLoaded) {
                await loadCustomModels();
            }

            // 检查当前是否已经设置了当前模型
            const currentModels = await getLatestState(setCurrentBots);
            if (currentModels && currentModels.length > 0) {
                Logger.log('已有当前模型设置，跳过存储模型加载', currentModels.map(m => m.botName));
                return;
            }

            const value = await storage.get<string[]>("currentModelsKey");
            Logger.log('从存储中加载模型键:', value);

            // 如果有已保存的模型列表，使用它
            if (value && value.length) {
                Logger.log('从存储中加载模型:', value);

                // 使用 Set 去重保存的模型名称
                const uniqueModelNames = [...new Set(value)];
                if (uniqueModelNames.length !== value.length) {
                    Logger.log('存储中发现重复模型名称，使用唯一名称');
                    // 更新存储中的唯一名称
                    await storage.set("currentModelsKey", uniqueModelNames);
                }

                const arr: Ms = [];
                const addedBotNames = new Set<string>();

                uniqueModelNames.forEach((ele) => {
                    allModels.current.forEach((item) => {
                        if (item.botName === ele && !addedBotNames.has(ele)) {
                            arr.push(item);
                            addedBotNames.add(ele);
                        }
                    });
                });

                if (arr.length) {
                    Logger.log('从存储中加载的模型设置为当前模型:', arr.map(m => m.botName));
                    setCurrentBots(arr);
                } else {
                    // 没有找到保存的模型，使用第一个自定义模型或默认内置模型
                    Logger.log('存储中没有找到有效模型，检查自定义模型');
                    const customModels = categoryModels.current.find(cat => cat.label === "Custom Models")?.models || [];

                    if (customModels.length > 0) {
                        Logger.log('使用第一个自定义模型:', customModels[0].botName);
                        setCurrentBots([customModels[0]]);
                        await storage.set('currentModelsKey', [customModels[0].botName]);
                    } else {
                        Logger.log('使用默认内置模型');
                        setCurrentBots([ChatGPT35Turbo, CopilotBot, KimiBot]);
                    }
                }
            } else {
                // 没有保存的模型，检查第一个自定义模型
                Logger.log('存储中没有模型列表，检查自定义模型');
                const customModels = categoryModels.current.find(cat => cat.label === "Custom Models")?.models || [];

                if (customModels.length > 0) {
                    Logger.log('使用第一个自定义模型:', customModels[0].botName);
                    setCurrentBots([customModels[0]]);
                    await storage.set('currentModelsKey', [customModels[0].botName]);
                } else {
                    Logger.log('使用默认内置模型');
                    setCurrentBots([ChatGPT35Turbo, CopilotBot, KimiBot]);
                }
            }
        } catch (e) {
            Logger.error('处理模型存储时出错:', e);
            // 出错时使用默认内置模型
            setCurrentBots([ChatGPT35Turbo, CopilotBot, KimiBot]);
        }
        finally {
            setIsLoaded(true);
        }
    };

    useEffect(() => {
        // 使用 Promise chain 而不是嵌套的 then，确保操作顺序正确
        void (async () => {
            await loadCustomModels();
            await handleModelStorge();
        })();

        // init arkose
        void ArkoseGlobalSingleton.getInstance().loadArkoseScript();
    }, []);

    const getCurrentModelKey = async () => {
        const cbots: Ms = await getLatestState(setCurrentBots);
        return cbots.map(model => model.botName);
    };

    const saveCurrentBotsKeyLocal = async () => {
        // 检查当前选中的模型，确保没有重复
        const currentKeys = await getCurrentModelKey();
        // 使用 Set 去重
        const uniqueKeys = [...new Set(currentKeys)];

        // 如果有重复，重新设置去重后的模型
        if (uniqueKeys.length !== currentKeys.length) {
            Logger.log('Found duplicate models, removing duplicates');
            // 找到唯一的模型实例
            const uniqueModels: Ms = [];
            const addedBotNames = new Set<string>();

            const cbots: Ms = await getLatestState(setCurrentBots);
            for (const model of cbots) {
                if (!addedBotNames.has(model.botName)) {
                    uniqueModels.push(model);
                    addedBotNames.add(model.botName);
                }
            }

            // 设置去重后的模型
            setCurrentBots(uniqueModels);
            // 保存去重后的名称
            void storage.set("currentModelsKey", uniqueKeys);
            Logger.log('Saved unique model keys:', uniqueKeys);
        } else {
            // 没有重复，直接保存
            void storage.set("currentModelsKey", currentKeys);
            Logger.log('Saved model keys:', currentKeys);
        }
    };

    return (
        <ModelManagementContext.Provider value={{ currentBots, allModels, categoryModels, setCurrentBots: setCurrentBots, saveCurrentBotsKeyLocal, loadCustomModels }}>
            {isLoaded && children}
        </ModelManagementContext.Provider>
    );
}
