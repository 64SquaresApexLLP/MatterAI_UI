import React, { useState } from "react";
import { FileText, MessageCircle, ArrowLeft } from "lucide-react";
import TimesheetForm from "./TimesheetForm";
import TimesheetChatbot from "./TimesheetChatbot";
 
const TimesheetOptions = ({ user, onClose }) => {
  const [selectedOption, setSelectedOption] = useState(null);
 
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };
 
  const handleBack = () => {
    setSelectedOption(null);
  };
 
  if (selectedOption === "form") {
    return (
      <div className="animate-fade-in">
        <div className="mb-4">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-white hover:text-white/80 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Options</span>
          </button>
        </div>
        <TimesheetForm onClose={onClose} />
      </div>
    );
  }
 
  if (selectedOption === "chatbot") {
    return (
      <div className="animate-fade-in">
        <div className="mb-4">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-white hover:text-white/80 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Options</span>
          </button>
        </div>
        <TimesheetChatbot user={user} onClose={onClose} />
      </div>
    );
  }
 
  return (
    <div className="animate-slide-up delay-500">
      <div className="bg-white/90 backdrop-blur-xl border border-[#062e69]/30 rounded-2xl p-8 shadow-lg">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#062e69] mb-2">
            Choose Your Timesheet Entry Method
          </h2>
          <p className="text-[#062e69]/70">
            Select how you'd like to create your timesheet entry
          </p>
        </div>
 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Option */}
          <div
            onClick={() => handleOptionSelect("form")}
            className="group cursor-pointer bg-white border-2 border-[#062e69]/20 rounded-xl p-6 hover:border-[#062e69]/50 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-[#062e69]/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#062e69]/20 transition-colors duration-300">
                <FileText className="w-8 h-8 text-[#062e69]" />
              </div>
              <h3 className="text-xl font-semibold text-[#062e69] mb-2">
                Traditional Form
              </h3>
            </div>
          </div>
 
          {/* Chatbot Option */}
          <div
            onClick={() => handleOptionSelect("chatbot")}
            className="group cursor-pointer bg-white border-2 border-[#062e69]/20 rounded-xl p-6 hover:border-[#062e69]/50 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-[#062e69]/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-[#062e69]/20 transition-colors duration-300">
                <MessageCircle className="w-8 h-8 text-[#062e69]" />
              </div>
              <h3 className="text-xl font-semibold text-[#062e69] mb-2">
                AI Chatbot Assistant
              </h3>
 
            </div>
          </div>
        </div>
 
        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
 
export default TimesheetOptions;