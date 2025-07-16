import './index.css'
import { FileUpload } from './components/chat/FileUpload'
import { ThemeProvider } from './components/theme/theme-provider'

function App() {

  const handleFileUpload= () => {
    return
  }

  return (
    <ThemeProvider defaultTheme='dark' storageKey='vite-ui-theme'>
    <FileUpload onSubmit={handleFileUpload} />
    </ThemeProvider>
  )
}

export default App
