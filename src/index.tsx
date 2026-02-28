import * as React from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { initializeIcons } from "@fluentui/react/lib/Icons"
import Root from "./components/root"
import { applyThemeSettings } from "./scripts/settings"
import { initApp, openTextMenu } from "./scripts/models/app"
import { rootStore } from "./scripts/reducer"

window.settings.setProxy()

applyThemeSettings()
initializeIcons("icons/")

rootStore.dispatch(initApp())

window.utils.addMainContextListener((pos, text) => {
    rootStore.dispatch(openTextMenu(pos, text))
})

window.fontList = [""]
window.utils.initFontList().then(fonts => {
    window.fontList.push(...fonts)
})

const root = createRoot(document.getElementById("app")!)
root.render(
    <Provider store={rootStore}>
        <Root />
    </Provider>
)
