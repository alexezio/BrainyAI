import type { PlasmoMessaging } from "@plasmohq/messaging"

// This handler will be used to process messages from content scripts
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    // The Message API in Plasmo works by passing the data in the request body
    // We don't need to extract data here since the actual processing happens in the content script

    try {
        // Forward the web content to the panel 
        // The actual processing happens in the content script and side panel
        res.send({ success: true })
    } catch (error) {
        console.error("Error handling web summary message:", error)
        res.send({ success: false, error: String(error) })
    }
}

export default handler 