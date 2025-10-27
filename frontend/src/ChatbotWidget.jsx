import React, { useState, useRef, useEffect } from 'react';
 
const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "👋 Hi! I'm your timesheet assistant. I'll help you create timesheet entries by asking questions one by one. Type anything to get started!",
      sender: 'bot'
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
 
  const API_BASE = 'http://localhost:8000';
 
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
 
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);
 
  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen && isLoggedIn) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };
 
  const closeChat = () => {
    setIsOpen(false);
  };
 
  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      setLoginError('Please enter both username and password');
      return;
    }
 
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: loginData.username,
          password: loginData.password
        })
      });
 
      const data = await response.json();
 
      if (response.ok && data.success) {
        setAuthToken(data.token);
        setIsLoggedIn(true);
        setLoginError('');
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setLoginError(data.detail || 'Login failed');
      }
    } catch (error) {
      setLoginError('Connection error. Please try again.');
      console.error('Login error:', error);
    }
  };
 
  const sendMessage = async () => {
    if (!currentMessage.trim()) return;
 
    const userMessage = {
      id: Date.now(),
      text: currentMessage,
      sender: 'user'
    };
 
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);
 
    try {
      const response = await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: currentMessage,
          session_id: sessionId
        })
      });
 
      const data = await response.json();
 
      if (response.ok) {
        setSessionId(data.session_id);
       
        const botMessage = {
          id: Date.now() + 1,
          text: data.response,
          sender: 'bot'
        };
 
        setMessages(prev => [...prev, botMessage]);
 
        if (data.completed) {
          const completionMessage = {
            id: Date.now() + 2,
            text: "🎉 Great! You can start a new timesheet entry anytime by typing a message.",
            sender: 'bot'
          };
          setMessages(prev => [...prev, completionMessage]);
          setSessionId(null);
        }
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          text: '❌ Sorry, there was an error processing your message. Please try again.',
          sender: 'bot'
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: '❌ Connection error. Please check your internet connection and try again.',
        sender: 'bot'
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };
 
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isLoggedIn) {
        sendMessage();
      } else {
        handleLogin();
      }
    }
  };
 
  const formatMessage = (text) => {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };
 
  return (
    <div className="fixed bottom-5 right-5 z-[1000] font-sans">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typing {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-track-gray-100::-webkit-scrollbar-track { background: #f1f1f1; }
        .scrollbar-thumb-gray-400::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 2px; }
      `}</style>
     
      {/* Floating Chat Button */}
      <div
        className="w-[60px] h-[60px] bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-all duration-300 text-white relative hover:bg-blue-700 hover:scale-105 max-[480px]:w-[50px] max-[480px]:h-[50px]"
        onClick={toggleChat}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="max-[480px]:w-5 max-[480px]:h-5">
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 13.54 2.38 14.99 3.06 16.26L2 22L7.74 20.94C9.01 21.62 10.46 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C10.74 20 9.54 19.68 8.5 19.1L8.19 18.93L4.91 19.8L5.78 16.52L5.61 16.21C5.02 15.17 4.7 13.97 4.7 12.7C4.7 7.58 8.88 3.4 14 3.4C19.12 3.4 23.3 7.58 23.3 12.7C23.3 17.82 19.12 22 14 22H12Z"
            fill="currentColor"
          />
          <circle cx="9" cy="12" r="1" fill="currentColor"/>
          <circle cx="12" cy="12" r="1" fill="currentColor"/>
          <circle cx="15" cy="12" r="1" fill="currentColor"/>
        </svg>
        {!isOpen && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            1
          </div>
        )}
      </div>
 
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[350px] h-[500px] bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden border border-gray-200 animate-[slideUp_0.3s_ease-out] max-[768px]:w-80 max-[480px]:w-[calc(100vw-40px)] max-[480px]:h-[calc(100vh-120px)] max-[480px]:bottom-[70px] max-[480px]:-right-2.5">
         
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="text-xl">🤖</div>
              <div>
                <div className="font-semibold text-sm">MatterAI Assistant</div>
                <div className="text-xs opacity-80">Timesheet Helper</div>
              </div>
            </div>
            <button
              className="bg-transparent border-none text-white text-2xl cursor-pointer p-0 w-6 h-6 flex items-center justify-center hover:opacity-80"
              onClick={closeChat}
            >
              ×
            </button>
          </div>
 
          {!isLoggedIn ? (
            // Login Section
            <div className="flex-1 flex items-center justify-center p-5">
              <div className="w-full max-w-[280px] text-center">
                <h4 className="m-0 mb-5 text-gray-700">Please Login</h4>
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    placeholder="Username or Email"
                    value={loginData.username}
                    onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                    onKeyPress={handleKeyPress}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-600"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginData.password}
                    onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                    onKeyPress={handleKeyPress}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="w-full p-3 bg-blue-600 text-white border-none rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-blue-700"
                  >
                    Login
                  </button>
                </div>
                {loginError && (
                  <div className="text-red-500 text-xs mt-2">{loginError}</div>
                )}
              </div>
            </div>
          ) : (
            // Chat Section
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                      message.sender === 'bot'
                        ? 'bg-gray-100 text-gray-700 self-start rounded-bl-sm'
                        : 'bg-blue-600 text-white self-end rounded-br-sm'
                    }`}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(message.text)
                      }}
                    />
                  </div>
                ))}
               
                {isTyping && (
                  <div className="px-3.5 py-2.5 bg-gray-100 rounded-2xl rounded-bl-sm self-start max-w-[60px]">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-[typing_1.4s_infinite_ease-in-out] [animation-delay:-0.32s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-[typing_1.4s_infinite_ease-in-out] [animation-delay:-0.16s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-[typing_1.4s_infinite_ease-in-out]"></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
 
              <div className="flex p-4 border-t border-gray-200 gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-[20px] text-sm outline-none focus:border-blue-600"
                />
                <button
                  className="w-10 h-10 bg-blue-600 text-white border-none rounded-full cursor-pointer flex items-center justify-center transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={sendMessage}
                  disabled={isTyping || !currentMessage.trim()}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
 
export default ChatbotWidget;