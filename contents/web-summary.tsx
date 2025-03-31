import type { PlasmoCSConfig } from "plasmo"
import * as React from "react"
import { extractWebContent } from "~utils/web-summary"
import { IAskAi, openPanelAskAi, PromptTemplate } from "~libs/open-ai/open-panel"
import { Logger } from "~utils/logger"

// Defines which pages this content script runs on
export const config: PlasmoCSConfig = {
    matches: ["<all_urls>"],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    exclude_globs: ["chrome://*"],
    all_frames: false
}

const SummaryButton = () => {
    const handleSummarize = () => {
        try {
            // Extract content from the current page
            const { title, url, content } = extractWebContent()

            Logger.log("Web content extracted:", { title, url, contentLength: content.length })

            // Create a prompt text that includes the page information
            const promptText = `请总结以下网页内容：\n\n标题：${title}\n网址：${url}\n\n内容：${content}`

            // Create Ask AI object for the conversation
            const askAi = new IAskAi({
                prompt: PromptTemplate.WEB_SUMMARY,
                promptText: promptText,
                lang: "zh", // Chinese language
                text: `网页总结：${title}`,
                promptImageTitle: "网络总结",
                promptType: 1
            })

            // Open the side panel and send the content for summarization
            openPanelAskAi(askAi)
        } catch (error) {
            Logger.log("Error in web summarization:", error)
        }
    }
}

export default SummaryButton 