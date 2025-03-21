import type { PlasmoCSConfig } from "plasmo"
import { triggerWebSummarization } from "~utils/web-summary"
import * as baseContentStyle from "~style/base-content.module.scss"

// Content script configuration
export const config: PlasmoCSConfig = {
    matches: ["<all_urls>"],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    exclude_globs: ["chrome://*"],
    all_frames: false
}

// Function to create and add the web summary button to the page
function createWebSummaryButton() {
    // Check if the button already exists
    if (document.querySelector("#brainy-web-summary-btn")) {
        return
    }

    // Create the button element
    const button = document.createElement("div")
    button.id = "brainy-web-summary-btn"
    button.className = baseContentStyle.webSummaryBtn
    button.textContent = "网页总结"

    // Add click handler
    button.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        triggerWebSummarization()
    })

    // Add the button to the document
    document.body.appendChild(button)
}

// Execute when the content script loads
function main() {
    // Add the button when the DOM is fully loaded
    if (document.readyState === "complete") {
        createWebSummaryButton()
    } else {
        window.addEventListener("load", createWebSummaryButton)
    }
}

main() 