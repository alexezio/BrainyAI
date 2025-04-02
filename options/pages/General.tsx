import React, { useState, useRef } from 'react';
import { Input, Select, Button, Modal, message, Tooltip, Checkbox } from 'antd';
import { InfoCircleOutlined, PlusOutlined, SettingOutlined, DeleteOutlined } from '@ant-design/icons';
import { useStorage } from "@plasmohq/storage/dist/hook";

export default function General() {
    // Chat Language Settings
    const [aiChatLang, setAiChatLang] = useStorage('aiChatLanguage', 'English');
    const [translationLang, setTranslationLang] = useStorage('translationLanguage', '简体中文');

    // Custom Model Settings
    const [customModels, setCustomModels] = useStorage('customModels', []);
    const [defaultModel, setDefaultModel] = useStorage('defaultModel', '');
    const [isModelModalVisible, setIsModelModalVisible] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingModelId, setEditingModelId] = useState(null);
    const [modelForm, setModelForm] = useState({
        name: '',
        apiType: 'OpenAI / OpenAI Compatible APIs / Ollama',
        apiKey: '',
        model: '',
        apiBaseUrl: 'https://api.openai.com/v1',
        supportImage: 'No',
        contextWindow: 8000,
        temperature: 0.7,
        isReasoning: false,
        apiVersion: ''
    });

    // Keyboard shortcut settings
    const [keyboardShortcut, setKeyboardShortcut] = useStorage('keyboardShortcut', '⌘+I');

    // Function to handle model form changes
    const handleModelFormChange = (field, value) => {
        setModelForm({
            ...modelForm,
            [field]: value
        });
    };

    // Function to edit a model
    const handleEditModel = (model) => {
        setIsEditMode(true);
        setEditingModelId(model.id);
        setModelForm({
            name: model.name,
            apiType: model.apiType,
            apiKey: model.apiKey,
            model: model.model,
            apiBaseUrl: model.apiBaseUrl || 'https://api.openai.com/v1',
            supportImage: model.supportImage || 'No',
            contextWindow: model.contextWindow || 8000,
            temperature: model.temperature || 0.7,
            isReasoning: !!model.isReasoning,
            apiVersion: model.apiVersion || ''
        });
        setIsModelModalVisible(true);
    };

    // Function to delete a model
    const handleDeleteModel = (modelId) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除这个模型吗？此操作不可撤销。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            onOk() {
                const updatedModels = customModels.filter(model => model.id !== modelId);
                setCustomModels(updatedModels);

                // 如果删除的是默认模型，清除默认模型设置
                if (defaultModel === modelId) {
                    setDefaultModel('');
                }

                message.success('模型已删除');
            }
        });
    };

    // Function to set default model
    const handleSetDefaultModel = (modelId) => {
        if (defaultModel === modelId) {
            setDefaultModel('');
            message.info('已取消默认模型设置');
        } else {
            setDefaultModel(modelId);
            message.success('默认模型已设置');
        }
    };

    // Function to add a new custom model
    const handleAddModel = () => {
        // 表单验证
        if (!modelForm.name || !modelForm.apiKey || !modelForm.model) {
            message.error('请填写所有必填字段');
            return;
        }

        if (isEditMode) {
            // 更新现有模型
            const updatedModels = customModels.map(model =>
                model.id === editingModelId ? { ...modelForm, id: editingModelId } : model
            );
            setCustomModels(updatedModels);
            message.success('模型已更新');
        } else {
            // 添加新模型
            const newModel = {
                id: Date.now().toString(),
                ...modelForm
            };
            setCustomModels([...customModels, newModel]);
            message.success('模型已添加');
        }

        // 重置表单和状态
        setIsModelModalVisible(false);
        setIsEditMode(false);
        setEditingModelId(null);
        setModelForm({
            name: '',
            apiType: 'OpenAI / OpenAI Compatible APIs / Ollama',
            apiKey: '',
            model: '',
            apiBaseUrl: 'https://api.openai.com/v1',
            supportImage: 'No',
            contextWindow: 8000,
            temperature: 0.7,
            isReasoning: false,
            apiVersion: ''
        });
    };

    // 处理取消编辑或添加
    const handleCancel = () => {
        setIsModelModalVisible(false);
        setIsEditMode(false);
        setEditingModelId(null);
        setModelForm({
            name: '',
            apiType: 'OpenAI / OpenAI Compatible APIs / Ollama',
            apiKey: '',
            model: '',
            apiBaseUrl: 'https://api.openai.com/v1',
            supportImage: 'No',
            contextWindow: 8000,
            temperature: 0.7,
            isReasoning: false,
            apiVersion: ''
        });
    };

    // 打开新增模型模态框
    const showAddModelModal = () => {
        setIsEditMode(false);
        setEditingModelId(null);
        setModelForm({
            name: '',
            apiType: 'OpenAI / OpenAI Compatible APIs / Ollama',
            apiKey: '',
            model: '',
            apiBaseUrl: 'https://api.openai.com/v1',
            supportImage: 'No',
            contextWindow: 8000,
            temperature: 0.7,
            isReasoning: false,
            apiVersion: ''
        });
        setIsModelModalVisible(true);
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-8">General Settings</h1>

            {/* Keyboard shortcut section */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Keyboard shortcut</h2>
                <p className="text-sm text-gray-600 mb-2">
                    Keyboard shortcut to turn on sidebar-assisted search: click
                    the button below to change the shortcut key.
                </p>
                <div className="flex items-center">
                    <Input
                        value={keyboardShortcut}
                        onChange={(e) => setKeyboardShortcut(e.target.value)}
                        style={{ width: 100 }}
                        className="mr-4"
                    />
                    <Button type="primary" onClick={() => message.info('Shortcut updated')}>
                        BrowserShortcut Key Settings
                    </Button>
                </div>
            </div>

            {/* Chat Language section */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Chat Language</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Set your preferred language for AI response & Translation.
                </p>
                <div className="flex">
                    <div className="mr-4">
                        <div className="font-medium mb-2">AI Chat</div>
                        <Select
                            value={aiChatLang}
                            onChange={setAiChatLang}
                            style={{ width: 200 }}
                            options={[
                                { value: 'English', label: 'English' },
                                { value: '简体中文', label: '简体中文' },
                                { value: '繁體中文', label: '繁體中文' },
                                { value: '日本語', label: '日本語' },
                                { value: '한국어', label: '한국어' }
                            ]}
                        />
                    </div>
                    <div>
                        <div className="font-medium mb-2">Translation</div>
                        <Select
                            value={translationLang}
                            onChange={setTranslationLang}
                            style={{ width: 200 }}
                            options={[
                                { value: 'English', label: 'English' },
                                { value: '简体中文', label: '简体中文' },
                                { value: '繁體中文', label: '繁體中文' },
                                { value: '日本語', label: '日本語' },
                                { value: '한국어', label: '한국어' }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* Custom Model Settings section */}
            <div>
                <h2 className="text-xl font-semibold mb-4">Custom Model Settings</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Configure your preferred model for AI responses. Supports OpenAI-compatible APIs and Azure OpenAI.
                </p>

                {/* Display existing custom models */}
                <div className="mb-4">
                    {customModels.map(model => (
                        <div key={model.id} className="border p-4 mb-2 rounded flex justify-between items-center">
                            <div className="flex-1">
                                <div className="flex items-center">
                                    <Checkbox
                                        checked={defaultModel === model.id}
                                        onChange={() => handleSetDefaultModel(model.id)}
                                        className="mr-2"
                                    />
                                    <span className="font-medium">{model.name}</span>
                                    {defaultModel === model.id && (
                                        <span className="ml-2 text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded">默认</span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500">Model: {model.model}</div>
                                <div className="text-sm text-gray-500">API Type: {model.apiType}</div>
                                {model.isReasoning && (
                                    <div className="text-xs text-green-600">推理模型 (显示思考过程)</div>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    type="text"
                                    icon={<SettingOutlined />}
                                    onClick={() => handleEditModel(model)}
                                    title="编辑"
                                />
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDeleteModel(model.id)}
                                    title="删除"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showAddModelModal}
                >
                    Add Model
                </Button>
            </div>

            {/* Add/Edit Model Modal */}
            <Modal
                title={isEditMode ? "Edit Model Configuration" : "Add Model Configuration"}
                open={isModelModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="cancel" onClick={handleCancel}>
                        Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleAddModel}>
                        {isEditMode ? "Save" : "Add"}
                    </Button>
                ]}
                width={800}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block mb-1 text-red-500">* Name</label>
                        <Input
                            placeholder="Give your model configuration a name"
                            value={modelForm.name}
                            onChange={e => handleModelFormChange('name', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-red-500">* API Type</label>
                        <Select
                            placeholder="Select API Type"
                            style={{ width: '100%' }}
                            value={modelForm.apiType}
                            onChange={value => handleModelFormChange('apiType', value)}
                            options={[
                                { value: 'OpenAI / OpenAI Compatible APIs / Ollama', label: 'OpenAI / OpenAI Compatible APIs / Ollama' },
                                { value: 'Azure OpenAI', label: 'Azure OpenAI' }
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-red-500">* API Key</label>
                        <Input.Password
                            placeholder="sk-..."
                            value={modelForm.apiKey}
                            onChange={e => handleModelFormChange('apiKey', e.target.value)}
                        />
                        <p className="text-sm text-gray-500 mt-1">Your API key will be stored locally and securely</p>
                        {modelForm.apiType.includes('Ollama') && (
                            <p className="text-sm text-blue-500 mt-1">For local Ollama, API key is required but can be any value as it won't be used</p>
                        )}
                    </div>

                    {/* Model Select */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">
                            Model <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2 items-start">
                            <Select
                                className="w-full"
                                value={modelForm.model}
                                onChange={(value) => {
                                    const isCustom = value === 'Custom...';
                                    handleModelFormChange('model', value);

                                    // 自动设置 API Base URL 为 Ollama 本地地址
                                    if (value === 'ollama') {
                                        handleModelFormChange('apiBaseUrl', 'http://localhost:11434/v1');
                                    }

                                    // 根据选择的模型自动调整参数
                                    if (value.includes('gpt-4')) {
                                        handleModelFormChange('contextWindow', 128000);
                                        handleModelFormChange('supportImage', 'Yes');
                                    } else if (value.includes('gpt-3.5-turbo-16k')) {
                                        handleModelFormChange('contextWindow', 16000);
                                        handleModelFormChange('supportImage', 'No');
                                    } else if (value.includes('claude-3')) {
                                        handleModelFormChange('contextWindow', 200000);
                                        handleModelFormChange('supportImage', 'Yes');
                                    }
                                }}
                                options={[
                                    { value: 'gpt-3.5-turbo', label: 'GPT-3.5-Turbo' },
                                    { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5-Turbo-16K' },
                                    { value: 'gpt-4', label: 'GPT-4' },
                                    { value: 'gpt-4-turbo', label: 'GPT-4-Turbo' },
                                    { value: 'gpt-4-32k', label: 'GPT-4-32K' },
                                    { value: 'claude-3-opus', label: 'Claude-3-Opus' },
                                    { value: 'claude-3-sonnet', label: 'Claude-3-Sonnet' },
                                    { value: 'claude-3-haiku', label: 'Claude-3-Haiku' },
                                    { value: 'ollama', label: 'Ollama API' },
                                    { value: 'llama2', label: 'Llama 2 (Ollama)' },
                                    { value: 'mistral', label: 'Mistral (Ollama)' },
                                    { value: 'mixtral', label: 'Mixtral (Ollama)' },
                                    { value: 'Custom...', label: 'Custom...' },
                                ]}
                                placeholder="Select model"
                            />
                        </div>
                        {modelForm.model === 'Custom...' && (
                            <div className="mt-2">
                                <Input
                                    className="w-full"
                                    placeholder="Enter custom model name"
                                    value={modelForm.customModelName || ''}
                                    onChange={(e) => {
                                        const customName = e.target.value;
                                        handleModelFormChange('customModelName', customName);
                                        // 自动将自定义名称设置到model字段
                                        if (customName) {
                                            handleModelFormChange('model', customName);
                                        }
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Enter any model name supported by your API provider
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block mb-1 text-red-500">* API Base URL</label>
                        <Input
                            placeholder="https://api.openai.com/v1"
                            value={modelForm.apiBaseUrl}
                            onChange={e => handleModelFormChange('apiBaseUrl', e.target.value)}
                        />
                        <p className="text-sm text-gray-500 mt-1">Leave empty to use OpenAI's default API endpoint</p>
                        {modelForm.apiType.includes('Ollama') && (
                            <div>
                                <p className="text-sm text-blue-500 mt-1">For local Ollama, default URL is: http://localhost:11434/v1 (port can be customized)</p>
                                <p className="text-sm text-gray-500 mt-1">To make Ollama accessible, you need to set the environment variable OLLAMA_ORIGINS to either:</p>
                                <ul className="list-disc ml-5 text-sm text-gray-500">
                                    <li>* (allow all origins)</li>
                                    <li>or specifically include chrome-extension://jmcllpdchgacpnpgechgncndkfdogdah*</li>
                                </ul>
                                <p className="text-sm text-blue-500 mt-1 hover:underline cursor-pointer">Learn more about Ollama settings →</p>
                            </div>
                        )}
                    </div>

                    {modelForm.apiType === 'Azure OpenAI' && (
                        <div>
                            <label className="block mb-1 text-red-500">* API Version</label>
                            <Input
                                placeholder="2023-05-15"
                                value={modelForm.apiVersion}
                                onChange={e => handleModelFormChange('apiVersion', e.target.value)}
                            />
                            <p className="text-sm text-gray-500 mt-1">Required for Azure OpenAI API</p>
                        </div>
                    )}

                    <div>
                        <label className="block mb-1">Support Image <Tooltip title="Enable if your model supports image input"><InfoCircleOutlined /></Tooltip></label>
                        <Select
                            style={{ width: '100%' }}
                            value={modelForm.supportImage}
                            onChange={value => handleModelFormChange('supportImage', value)}
                            options={[
                                { value: 'No', label: 'No' },
                                { value: 'Yes', label: 'Yes' }
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-red-500">* Context Window <Tooltip title="Maximum context size in tokens"><InfoCircleOutlined /></Tooltip></label>
                        <Input
                            type="number"
                            value={modelForm.contextWindow}
                            onChange={e => handleModelFormChange('contextWindow', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-red-500">* Temperature</label>
                        <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={modelForm.temperature}
                            onChange={e => handleModelFormChange('temperature', e.target.value)}
                        />
                        <p className="text-sm text-gray-500 mt-1">Controls randomness: 0 is focused, 1 is balanced, 2 is creative</p>
                    </div>

                    <div>
                        <label className="block mb-1">Reasoning Model <Tooltip title="Enable to show thinking process with <think> tags"><InfoCircleOutlined /></Tooltip></label>
                        <Select
                            style={{ width: '100%' }}
                            value={modelForm.isReasoning}
                            onChange={value => handleModelFormChange('isReasoning', value)}
                            options={[
                                { value: false, label: 'No' },
                                { value: true, label: 'Yes' }
                            ]}
                        />
                        <p className="text-sm text-gray-500 mt-1">If enabled, content inside &lt;think&gt; tags will be displayed as thinking process</p>
                    </div>
                </div>
            </Modal>
        </div>
    );
} 