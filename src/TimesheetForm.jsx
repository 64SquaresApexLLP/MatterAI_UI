import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";

const TimesheetForm = ({ onClose }) => {
  const [step, setStep] = useState(0);

  // Dynamic steps based on type
  const getSteps = (type) => {
    if (type === "Cost") {
      return [
        "General Info",
        "Cost Details",
        "Phase & Expense",
        "Billing Info",
        "Narrative & Status",
        "Review & Submit",
      ];
    }
    return [
      "General Info",
      "Work Details",
      "Billing Info",
      "Narrative",
      "Review & Submit",
    ];
  };

  // fake dropdown data
  const clients = ["014 - General Dynamics", "101 - Envada"];

  const matters = [
    "0003US - METHODS AND APPARATUS FOR GENERATING A MULTIPLEXED COMMUNICATION SIGNALS",
    "0012US - ANALOG TO DIGITAL CONVERTER",
    "0025US - SIGNAL SEPARATION",
  ];

  const timekeepers = ["Rodack, Seth", "Johnson, Emily", "Martinez, Alex"];

  const phaseTasks = [
    "PA100 - Assessment, Development, and Administration",
    "PA200 - Prosecution",
    "PA300 - Maintenance and Portfolio Management",
  ];

  const expenses = [
    "Filing Fees",
    "Search Fees",
    "Translation Costs",
    "Travel Expenses",
    "Communication Costs",
  ];

  const activities = ["A102 - Research", "A103 - Drafting", "A104 - Meeting"];

  const billCodes = ["Billable", "Non-Billable"];
  const statuses = ["Invoice", "Hold"];

  const [formData, setFormData] = useState({
    client: clients[0],
    matter: matters[0],
    timekeeper: timekeepers[0],
    date: "2025-09-02",
    type: "Fee",
    hoursWorked: "1",
    hoursBilled: "1",
    quantity: "1",
    rate: "0",
    currency: "US dollars",
    total: "0",
    phaseTask: phaseTasks[0],
    activity: activities[0],
    expense: expenses[0],
    narrative: "Assessment, Development, and Administration",
    billCode: billCodes[0],
    status: statuses[0],
  });

  const handleChange = (e) => {
    const newData = { ...formData, [e.target.name]: e.target.value };

    // Reset step when type changes
    if (e.target.name === "type" && e.target.value !== formData.type) {
      setStep(0);
    }

    setFormData(newData);
  };

  const steps = getSteps(formData.type);
  const maxSteps = steps.length;

  const nextStep = () => setStep((prev) => Math.min(prev + 1, maxSteps - 1));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = () => {
    console.log("Final Submitted Data:", formData);
  };

  const renderStepContent = () => {
    if (formData.type === "Fee") {
      switch (step) {
        case 0:
          return (
            <motion.div
              key="fee-step1"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <label className="block mb-2">Client</label>
              <select
                name="client"
                value={formData.client}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {clients.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Matter</label>
              <select
                name="matter"
                value={formData.matter}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {matters.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Timekeeper</label>
              <select
                name="timekeeper"
                value={formData.timekeeper}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {timekeepers.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              />

              <label className="block mt-4 mb-2">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                <option>Fee</option>
                <option>Cost</option>
              </select>
            </motion.div>
          );

        case 1:
          return (
            <motion.div
              key="fee-step2"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">Hours Worked</label>
                  <input
                    name="hoursWorked"
                    value={formData.hoursWorked}
                    onChange={handleChange}
                    className="w-full p-2 rounded bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block mb-2">Hours Billed</label>
                  <input
                    name="hoursBilled"
                    value={formData.hoursBilled}
                    onChange={handleChange}
                    className="w-full p-2 rounded bg-slate-700"
                  />
                </div>
              </div>

              <label className="block mt-4 mb-2">Phase Task</label>
              <select
                name="phaseTask"
                value={formData.phaseTask}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {phaseTasks.map((pt) => (
                  <option key={pt}>{pt}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Activity</label>
              <select
                name="activity"
                value={formData.activity}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {activities.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </motion.div>
          );

        case 2:
          return (
            <motion.div
              key="fee-step3"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <label className="block mb-2">Bill Code</label>
              <select
                name="billCode"
                value={formData.billCode}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {billCodes.map((bc) => (
                  <option key={bc}>{bc}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </motion.div>
          );

        case 3:
          return (
            <motion.div
              key="fee-step4"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <label className="block mb-2">Narrative</label>
              <textarea
                name="narrative"
                value={formData.narrative}
                onChange={handleChange}
                rows={4}
                className="w-full p-2 rounded bg-slate-700 resize-none"
                placeholder="Enter description of the work performed..."
              />
            </motion.div>
          );

        case 4:
          return (
            <motion.div
              key="fee-step5"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-lg font-semibold mb-4">
                Review Your Timesheet
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Client: </span>
                  {formData.client}
                </p>
                <p>
                  <span className="font-medium">Matter: </span>
                  {formData.matter}
                </p>
                <p>
                  <span className="font-medium">Timekeeper: </span>
                  {formData.timekeeper}
                </p>
                <p>
                  <span className="font-medium">Date: </span>
                  {formData.date}
                </p>
                <p>
                  <span className="font-medium">Type: </span>
                  {formData.type}
                </p>
                <p>
                  <span className="font-medium">Hours Worked: </span>
                  {formData.hoursWorked}
                </p>
                <p>
                  <span className="font-medium">Hours Billed: </span>
                  {formData.hoursBilled}
                </p>
                <p>
                  <span className="font-medium">Phase Task: </span>
                  {formData.phaseTask}
                </p>
                <p>
                  <span className="font-medium">Activity: </span>
                  {formData.activity}
                </p>
                <p>
                  <span className="font-medium">Bill Code: </span>
                  {formData.billCode}
                </p>
                <p>
                  <span className="font-medium">Status: </span>
                  {formData.status}
                </p>
                <p>
                  <span className="font-medium">Narrative: </span>
                  {formData.narrative}
                </p>
              </div>
            </motion.div>
          );

        default:
          return null;
      }
    } else {
      // Cost type steps
      switch (step) {
        case 0:
          return (
            <motion.div
              key="cost-step1"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <label className="block mb-2">Client</label>
              <select
                name="client"
                value={formData.client}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {clients.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Matter</label>
              <select
                name="matter"
                value={formData.matter}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {matters.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Timekeeper</label>
              <select
                name="timekeeper"
                value={formData.timekeeper}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {timekeepers.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              />

              <label className="block mt-4 mb-2">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                <option>Fee</option>
                <option>Cost</option>
              </select>
            </motion.div>
          );

        case 1:
          return (
            <motion.div
              key="cost-step2"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2">Quantity</label>
                  <input
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full p-2 rounded bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block mb-2">Rate</label>
                  <input
                    name="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    className="w-full p-2 rounded bg-slate-700"
                  />
                </div>
              </div>

              <label className="block mt-4 mb-2">Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                <option>US dollars</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>

              <label className="block mt-4 mb-2">Total</label>
              <input
                name="total"
                value={formData.total}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              />
            </motion.div>
          );

        case 2:
          return (
            <motion.div
              key="cost-step3"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <label className="block mb-2">Phase Task</label>
              <select
                name="phaseTask"
                value={formData.phaseTask}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {phaseTasks.map((pt) => (
                  <option key={pt}>{pt}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Expense</label>
              <select
                name="expense"
                value={formData.expense}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {expenses.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </motion.div>
          );

        case 3:
          return (
            <motion.div
              key="cost-step4"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <label className="block mb-2">Bill Code</label>
              <select
                name="billCode"
                value={formData.billCode}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {billCodes.map((bc) => (
                  <option key={bc}>{bc}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-2 rounded bg-slate-700"
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </motion.div>
          );

        case 4:
          return (
            <motion.div
              key="cost-step5"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <label className="block mb-2">Narrative</label>
              <textarea
                name="narrative"
                value={formData.narrative}
                onChange={handleChange}
                rows={4}
                className="w-full p-2 rounded bg-slate-700 resize-none"
                placeholder="Enter description of the expense..."
              />
            </motion.div>
          );

        case 5:
          return (
            <motion.div
              key="cost-step6"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h3 className="text-lg font-semibold mb-4">
                Review Your Cost Entry
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Client: </span>
                  {formData.client}
                </p>
                <p>
                  <span className="font-medium">Matter: </span>
                  {formData.matter}
                </p>
                <p>
                  <span className="font-medium">Timekeeper: </span>
                  {formData.timekeeper}
                </p>
                <p>
                  <span className="font-medium">Date: </span>
                  {formData.date}
                </p>
                <p>
                  <span className="font-medium">Type: </span>
                  {formData.type}
                </p>
                <p>
                  <span className="font-medium">Quantity: </span>
                  {formData.quantity}
                </p>
                <p>
                  <span className="font-medium">Rate: </span>
                  {formData.rate}
                </p>
                <p>
                  <span className="font-medium">Currency: </span>
                  {formData.currency}
                </p>
                <p>
                  <span className="font-medium">Total: </span>
                  {formData.total}
                </p>
                <p>
                  <span className="font-medium">Phase Task: </span>
                  {formData.phaseTask}
                </p>
                <p>
                  <span className="font-medium">Expense: </span>
                  {formData.expense}
                </p>
                <p>
                  <span className="font-medium">Bill Code: </span>
                  {formData.billCode}
                </p>
                <p>
                  <span className="font-medium">Status: </span>
                  {formData.status}
                </p>
                <p>
                  <span className="font-medium">Narrative: </span>
                  {formData.narrative}
                </p>
              </div>
            </motion.div>
          );

        default:
          return null;
      }
    }
  };

  return (
    <div className="bg-slate-800/90 p-8 rounded-2xl text-white max-w-2xl mx-auto shadow-2xl relative">
      {/* Step Indicators */}
      <div className="flex justify-between mb-6 overflow-x-auto">
        {steps.map((label, index) => (
          <div key={index} className="flex-1 text-center min-w-0 px-1">
            <div
              className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                index <= step
                  ? "bg-blue-500 text-white"
                  : "bg-slate-600 text-slate-300"
              }`}
            >
              {index < step ? <CheckCircle size={16} /> : index + 1}
            </div>
            <p className="text-xs mt-2 truncate">{label}</p>
          </div>
        ))}
      </div>

      {/* Step Forms */}
      <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        {step > 0 ? (
          <button
            onClick={prevStep}
            className="px-4 py-2 bg-slate-600 rounded-lg hover:bg-slate-700 transition"
          >
            Back
          </button>
        ) : (
          <span></span>
        )}

        {step < maxSteps - 1 ? (
          <button
            onClick={nextStep}
            className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Next
          </button>
        ) : (
          <motion.button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
            whileTap={{ scale: 0.9 }}
          >
            <span>Insert</span>
            <CheckCircle size={18} />
          </motion.button>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-slate-400 hover:text-white"
      >
        ✖
      </button>
    </div>
  );
};

// Demo wrapper
const App = () => {
  const [showForm, setShowForm] = useState(true);

  return (
    <div>
      <TimesheetForm onClose={() => setShowForm(false)} />
    </div>
  );
};

export default App;
