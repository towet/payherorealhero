import { useState, useEffect } from 'react'
import { WithdrawModal } from './components/WithdrawModal'

function App() {
  const [isModalOpen, setIsModalOpen] = useState(true)
  
  return (
    <div className="min-h-screen">
      <WithdrawModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(true)} // Keep modal open by setting isModalOpen back to true when closed
        maxAmount={5000}
      />
    </div>
  )
}

export default App
