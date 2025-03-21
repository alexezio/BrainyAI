// @ts-ignore - Missing type declarations for @mozilla/readability
import { Readability } from '@mozilla/readability';
import { Logger } from './logger';
import { IAskAi, openPanelAskAi, PromptTemplate } from '~libs/open-ai/open-panel';

/**
 * Extracts content from a web page using the Readability library
 * @returns Object containing title, url, and content of the current page
 */
export function extractWebContent() {
    try {
        const documentClone = document.cloneNode(true) as Document;
        const reader = new Readability(documentClone);
        const article = reader.parse();

        if (article) {
            return {
                title: article.title,
                url: window.location.href,
                content: article.textContent
            };
        } else {
            Logger.log('Failed to parse article content');
            return {
                title: document.title,
                url: window.location.href,
                content: 'Content extraction failed. This page might not contain easily parsed content.'
            };
        }
    } catch (error) {
        Logger.log('Error extracting web content:', error);
        return {
            title: document.title,
            url: window.location.href,
            content: 'Error extracting content. Please try another page.'
        };
    }
}

/**
 * Trigger web content summarization and open the side panel with results
 */
export function triggerWebSummarization() {
    try {
        // Extract content from the current page
        const { title, url, content } = extractWebContent();

        Logger.log("Web content extracted:", { title, url, contentLength: content.length });

        // 重要: 在这里我们不使用promptText，因为根据conversation.tsx中的getPrompt函数，
        // 实际传递给模型的是prompt而不是promptText。promptText只用于替换占位符。
        // 所以我们需要把完整的总结提示放在prompt中
        const summaryPrompt = `请总结以下网页内容：\n\n标题：${title}\n网址：${url}\n\n内容：${content}`;

        const askAi = new IAskAi({
            prompt: summaryPrompt,  // 直接把完整提示放在prompt字段
            promptText: null,       // 不需要使用promptText
            lang: "zh",             // 中文
            text: `网页总结：${title}`,
            promptImageTitle: "网络总结",
            promptType: 1
        });

        // Open the side panel and send the content for summarization
        openPanelAskAi(askAi);
        return true;
    } catch (error) {
        Logger.log("Error in web summarization:", error);
        return false;
    }
} 