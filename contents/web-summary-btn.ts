import type { PlasmoCSConfig } from "plasmo"
import { triggerWebSummarization } from "~utils/web-summary"
import * as baseContentStyle from "~style/base-content.module.scss"
import SummarizeIcon from "data-base64:~assets/icon_summarize.svg"

// Content script configuration
export const config: PlasmoCSConfig = {
    matches: ["<all_urls>"],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    exclude_globs: ["chrome://*"],
    all_frames: false
}

// We no longer need to create a separate button since it's implemented in base.tsx
function main() {
    // No longer need to add the button
}

main() 