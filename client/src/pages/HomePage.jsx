import React, { useContext } from 'react'
import Sidebar from '../components/Sidebar'
import ChatContainer from '../components/ChatContainer'
import RightSidebar from '../components/RightSidebar'
import { ChatContext } from '../../context/ChatContext'

const HomePage = () => {
  const { selectedUser } = useContext(ChatContext)

  return (
    <main className="qc-home min-h-dvh h-dvh w-full p-0 md:p-4 lg:p-6">
      <div className="qc-home-shell h-full min-h-0 w-full overflow-hidden md:rounded-2xl md:border md:border-white/10 md:shadow-2xl grid grid-cols-1 md:grid-cols-[minmax(250px,0.9fr)_minmax(0,1.6fr)] xl:grid-cols-[minmax(250px,0.9fr)_minmax(0,1.6fr)_minmax(230px,0.8fr)]">
        <div className={`${selectedUser ? 'max-md:hidden' : 'max-md:block'} min-h-0`}>
          <Sidebar />
        </div>
        <div className={`${!selectedUser ? 'max-md:hidden' : 'max-md:block'} min-h-0 min-w-0`}>
          <ChatContainer />
        </div>
        <div className="hidden min-h-0 xl:block"><RightSidebar /></div>
      </div>
    </main>
  )
}

export default HomePage
