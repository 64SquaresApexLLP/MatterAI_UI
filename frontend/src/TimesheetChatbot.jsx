import React, { useState, useRef, useEffect } from 'react';
import { Mic } from "lucide-react";

const TimesheetChatbot = ({ user, onClose }) => {
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
  const [isListening, setIsListening] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const API_BASE = 'http://localhost:8000';
  // const API_BASE = 'http://0.0.0.0:8001';

  // Initialize Speech Recognition (webkit only for Chrome)
  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-IN";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setCurrentMessage(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      recognitionRef.current = null;
    }
  }, []);

  // Button handler: start/stop listening
  const handleMicClick = () => {
    if (!recognitionRef.current) {
      window.toast
        ? window.toast.error("Speech recognition not supported in this browser.")
        : alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Scroll to bottom for message updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const isConfirmationPrompt = (text) => {
    return text.includes("Is everything OK? Reply 'yes' to submit or 'no' to start over.");
  };
  useEffect(() => {
    const lastMsg = messages.length > 0 ? messages[messages.length - 1].text : '';
    setShowConfirmation(isConfirmationPrompt(lastMsg));
  }, [messages]);

  const sendMessage = async (overrideMessage = null) => {
    const messageToSend = overrideMessage || currentMessage;
    if (!messageToSend.trim()) return;

    if (showConfirmation && !['yes', 'no'].includes(messageToSend.toLowerCase())) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      text: messageToSend,
      sender: 'user'
    };
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const authToken = user?.token || localStorage.getItem('authToken');
      if (!authToken) {
        const errorMessage = {
          id: Date.now() + 1,
          text: '❌ Authentication required. Please log in again.',
          sender: 'bot'
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
        return;
      }

      const response = await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: messageToSend,
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
        let errorText = '❌ Sorry, there was an error processing your message. Please try again.';
        if (response.status === 401) {
          errorText = '❌ Authentication expired. Please log in again.';
        } else if (response.status === 404) {
          errorText = '❌ Chat service not found. Please contact support.';
        } else if (data.detail) {
          errorText = `❌ Error: ${data.detail}`;
        }
        const errorMessage = {
          id: Date.now() + 1,
          text: errorText,
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
      sendMessage();
    }
  };

  const formatMessage = (text) => {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  const handleReset = () => {
    setSessionId(null);
    setMessages([
      {
        id: Date.now(),
        text: "👋 Hi! I'm your timesheet assistant. I'll help you create timesheet entries by asking questions one by one. Type anything to get started!",
        sender: 'bot'
      }
    ]);
  };

  // Confirmation reply handlers for UX
  const handleConfirmYes = () => {
    sendMessage('yes');
    setShowConfirmation(false);
  };
  const handleConfirmNo = () => {
    sendMessage('no');
    setShowConfirmation(false);
  };

  return (
    <div className="w-full h-[600px] bg-white rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden border border-gray-200 font-sans max-[768px]:h-[500px] max-[480px]:h-[450px]">

      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center max-[480px]:p-3">
        <div className="flex items-center gap-3">
          <div className="text-xl">🤖</div>
          <div>
            <div className="font-semibold text-base max-[768px]:text-sm">MatterAI Timesheet Assistant</div>
            <div className="text-xs opacity-80 max-[768px]:text-[11px]">Conversational Entry Creation</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-transparent border-none text-white text-sm cursor-pointer px-3 py-1 rounded hover:bg-white/10 transition-colors"
            onClick={handleReset}
            title="Reset conversation">🔄</button>
          <button className="bg-transparent border-none text-white text-2xl cursor-pointer p-0 w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
            onClick={onClose}
            title="Close chat">×</button>
        </div>
      </div>

      {/* Chat Section */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 bg-slate-50 scrollbar-custom max-[768px]:p-4 max-[768px]:gap-3 max-[480px]:p-3">
          {messages.map((message) => (
            <div key={message.id}
              className={`max-w-[85%] px-4 py-3 rounded-[18px] text-sm leading-relaxed break-words animate-[messageSlide_0.3s_ease-out] max-[768px]:max-w-[90%] max-[768px]:px-3.5 max-[768px]:py-2.5 max-[768px]:text-[13px] ${
                message.sender === 'bot'
                  ? 'bg-white text-gray-700 self-start rounded-bl-md shadow-[0_2px_8px_rgba(0,0,0,0.1)] border border-gray-200'
                  : 'bg-blue-600 text-white self-end rounded-br-md shadow-[0_2px_8px_rgba(37,99,235,0.2)]'
              }`}
            >
              <div dangerouslySetInnerHTML={{
                __html: formatMessage(message.text)
              }} />
            </div>
          ))}

          {isTyping && (
            <div className="px-4 py-3 bg-white rounded-[18px] rounded-bl-md self-start max-w-[80px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] border border-gray-200">
              <div className="flex gap-1 justify-center">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-[typing_1.4s_infinite_ease-in-out] [animation-delay:-0.32s]"></span>
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-[typing_1.4s_infinite_ease-in-out] [animation-delay:-0.16s]"></span>
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-[typing_1.4s_infinite_ease-in-out]"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex flex-col p-5 border-t border-gray-200 gap-3 bg-white max-[768px]:p-4 max-[768px]:gap-2.5 max-[480px]:p-3">
          {/* If confirmation prompt, show yes/no buttons */}
          {showConfirmation ?
            <div className="flex gap-3">
              <button
                className="px-6 py-3 bg-green-600 text-white rounded-2xl font-semibold shadow hover:bg-green-700 transition-all max-[768px]:px-4 max-[768px]:py-2"
                onClick={handleConfirmYes}
                disabled={isTyping}
              >✅ Confirm & Submit</button>
              <button
                className="px-6 py-3 bg-red-500 text-white rounded-2xl font-semibold shadow hover:bg-red-700 transition-all max-[768px]:px-4 max-[768px]:py-2"
                onClick={handleConfirmNo}
                disabled={isTyping}
              >✖️ Edit / Start Over</button>
            </div>
            :
            <div className="flex gap-3">
              <div className="flex items-center flex-1 bg-transparent">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your message..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-3xl text-sm outline-none transition-all focus:border-blue-600 focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] max-[768px]:px-3.5 max-[768px]:py-2.5 max-[768px]:text-[13px]"
                  disabled={isTyping}
                />
                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`flex-shrink-0 ml-2 p-2 rounded-lg transition-all duration-200 ${
                    isListening
                      ? "text-red-500 bg-red-500/20 animate-pulse"
                      : "text-[#062e69]/70 hover:text-[#062e69] hover:bg-[#062e69]/10"
                  }`}
                  title={isListening ? "Stop Listening" : "Start Listening"}
                  disabled={isTyping}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
              <button
                className="w-11 h-11 bg-blue-600 text-white border-none rounded-full cursor-pointer flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)] hover:bg-blue-700 hover:scale-105 hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)] disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none max-[768px]:w-10 max-[768px]:h-10"
                onClick={() => sendMessage()}
                disabled={isTyping || !currentMessage.trim()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  );
};

export default TimesheetChatbot;
