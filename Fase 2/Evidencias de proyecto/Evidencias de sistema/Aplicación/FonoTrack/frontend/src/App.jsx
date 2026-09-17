import './index.css'
import Header from './components/Header'
import Hero from './components/Hero'
import Audience from './components/Audience'
import Plans from './components/Plans'
import Footer from './components/Footer'

function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Audience />
        <Plans />
      </main>
      <Footer />
    </>
  )
}

export default App