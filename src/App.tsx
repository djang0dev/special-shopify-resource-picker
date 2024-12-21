import { Frame } from "@shopify/polaris"

import { Notifications } from "./components/Notifications.tsx"
import { AppExampleSandbox } from "./machines/inspector/inspector.machine.tsx"
import { Root } from "./machines/root/root.view.tsx"
import { PolarisProvider } from "./providers/polaris.provider"

function App() {
  return (
    <PolarisProvider>
      <Frame>
        <AppExampleSandbox Example={Root} pageTitle="Resource Picker Editor" />
        <Notifications />
      </Frame>
    </PolarisProvider>
  )
}

export default App
