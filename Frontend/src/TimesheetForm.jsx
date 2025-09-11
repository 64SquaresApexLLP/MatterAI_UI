import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import { timesheetAPI } from "./api/apiService.js";

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

  // Fixed navigation functions
  const nextStep = () => setStep((prev) => Math.min(prev + 1, maxSteps - 1));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent form submission

    try {
      // Transform formData to match API expectations
      const apiData = {
        client: formData.client,
        matter: formData.matter,
        timekeeper: formData.timekeeper,
        date: formData.date, // Using alias instead of entry_date
        type: formData.type, // Using alias instead of entry_type
        hours_worked: formData.hoursWorked
          ? parseFloat(formData.hoursWorked)
          : null,
        hours_billed: formData.hoursBilled
          ? parseFloat(formData.hoursBilled)
          : null,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        rate: formData.rate ? parseFloat(formData.rate) : 0,
        currency: formData.currency,
        total: formData.total ? parseFloat(formData.total) : 0,
        phase_task: formData.phaseTask,
        activity: formData.activity,
        expense: formData.expense,
        bill_code: formData.billCode,
        status: formData.status, // Using alias instead of entry_status
        narrative: formData.narrative,
      };

      console.log("Submitting timesheet data:", apiData);
      const response = await timesheetAPI.createEntry(apiData);

      if (response.success) {
        console.log("Timesheet entry created:", response);
        alert(
          `Timesheet entry created successfully! Entry ID: ${response.entry_id}`
        );
        onClose(); // Close form after successful submission
      } else {
        console.error("Timesheet submission failed:", response.message);
        alert(`Timesheet submission failed: ${response.message}`);
      }
    } catch (error) {
      console.error("Timesheet submission error:", error);
      alert(`Timesheet submission error: ${error.message}`);
    }
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
              <label className="block mb-2 text-[#062e69] font-medium">
                Client
              </label>
              <select
                name="client"
                value={formData.client}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {clients.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Matter
              </label>
              <select
                name="matter"
                value={formData.matter}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {matters.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Timekeeper
              </label>
              <select
                name="timekeeper"
                value={formData.timekeeper}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {timekeepers.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              />

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
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
                  <label className="block mb-2 text-[#062e69] font-medium">
                    Hours Worked
                  </label>
                  <input
                    name="hoursWorked"
                    value={formData.hoursWorked}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-[#062e69] font-medium">
                    Hours Billed
                  </label>
                  <input
                    name="hoursBilled"
                    value={formData.hoursBilled}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
                  />
                </div>
              </div>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Phase Task
              </label>
              <select
                name="phaseTask"
                value={formData.phaseTask}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {phaseTasks.map((pt) => (
                  <option key={pt}>{pt}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Activity
              </label>
              <select
                name="activity"
                value={formData.activity}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
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
              <label className="block mb-2 text-[#062e69] font-medium">
                Bill Code
              </label>
              <select
                name="billCode"
                value={formData.billCode}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {billCodes.map((bc) => (
                  <option key={bc}>{bc}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
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
              <label className="block mb-2 text-[#062e69] font-medium">
                Narrative
              </label>
              <textarea
                name="narrative"
                value={formData.narrative}
                onChange={handleChange}
                rows={4}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] placeholder-[#062e69]/50 focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20 resize-none"
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
              <h3 className="text-lg font-semibold mb-4 text-[#062e69]">
                Review Your Timesheet
              </h3>
              <div className="space-y-2 text-sm bg-[#062e69]/5 p-4 rounded-lg">
                <p>
                  <span className="font-medium text-[#062e69]">Client: </span>
                  <span className="text-[#062e69]/80">{formData.client}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Matter: </span>
                  <span className="text-[#062e69]/80">{formData.matter}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Timekeeper:{" "}
                  </span>
                  <span className="text-[#062e69]/80">
                    {formData.timekeeper}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Date: </span>
                  <span className="text-[#062e69]/80">{formData.date}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Type: </span>
                  <span className="text-[#062e69]/80">{formData.type}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Hours Worked:{" "}
                  </span>
                  <span className="text-[#062e69]/80">
                    {formData.hoursWorked}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Hours Billed:{" "}
                  </span>
                  <span className="text-[#062e69]/80">
                    {formData.hoursBilled}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Phase Task:{" "}
                  </span>
                  <span className="text-[#062e69]/80">
                    {formData.phaseTask}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Activity: </span>
                  <span className="text-[#062e69]/80">{formData.activity}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Bill Code:{" "}
                  </span>
                  <span className="text-[#062e69]/80">{formData.billCode}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Status: </span>
                  <span className="text-[#062e69]/80">{formData.status}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Narrative:{" "}
                  </span>
                  <span className="text-[#062e69]/80">
                    {formData.narrative}
                  </span>
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
              <label className="block mb-2 text-[#062e69] font-medium">
                Client
              </label>
              <select
                name="client"
                value={formData.client}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {clients.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Matter
              </label>
              <select
                name="matter"
                value={formData.matter}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {matters.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Timekeeper
              </label>
              <select
                name="timekeeper"
                value={formData.timekeeper}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {timekeepers.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              />

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
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
                  <label className="block mb-2 text-[#062e69] font-medium">
                    Quantity
                  </label>
                  <input
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-[#062e69] font-medium">
                    Rate
                  </label>
                  <input
                    name="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
                  />
                </div>
              </div>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Total
              </label>
              <input
                name="total"
                value={formData.total}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
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
              <label className="block mb-2 text-[#062e69] font-medium">
                Phase Task
              </label>
              <select
                name="phaseTask"
                value={formData.phaseTask}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {phaseTasks.map((pt) => (
                  <option key={pt}>{pt}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Expense
              </label>
              <select
                name="expense"
                value={formData.expense}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
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
              <label className="block mb-2 text-[#062e69] font-medium">
                Bill Code
              </label>
              <select
                name="billCode"
                value={formData.billCode}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
              >
                {billCodes.map((bc) => (
                  <option key={bc}>{bc}</option>
                ))}
              </select>

              <label className="block mt-4 mb-2 text-[#062e69] font-medium">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20"
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
              <label className="block mb-2 text-[#062e69] font-medium">
                Narrative
              </label>
              <textarea
                name="narrative"
                value={formData.narrative}
                onChange={handleChange}
                rows={4}
                className="w-full p-3 rounded-lg bg-white border border-[#062e69]/20 text-[#062e69] placeholder-[#062e69]/50 focus:outline-none focus:border-[#062e69] focus:ring-2 focus:ring-[#062e69]/20 resize-none"
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
              <h3 className="text-lg font-semibold mb-4 text-[#062e69]">
                Review Your Cost Entry
              </h3>
              <div className="space-y-2 text-sm bg-[#062e69]/5 p-4 rounded-lg">
                <p>
                  <span className="font-medium text-[#062e69]">Client: </span>
                  <span className="text-[#062e69]/80">{formData.client}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Matter: </span>
                  <span className="text-[#062e69]/80">{formData.matter}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Timekeeper:{" "}
                  </span>
                  <span className="text-[#062e69]/80">
                    {formData.timekeeper}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Date: </span>
                  <span className="text-[#062e69]/80">{formData.date}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Type: </span>
                  <span className="text-[#062e69]/80">{formData.type}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Quantity: </span>
                  <span className="text-[#062e69]/80">{formData.quantity}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Rate: </span>
                  <span className="text-[#062e69]/80">{formData.rate}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Currency: </span>
                  <span className="text-[#062e69]/80">{formData.currency}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Total: </span>
                  <span className="text-[#062e69]/80">{formData.total}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Phase Task:{" "}
                  </span>
                  <span className="text-[#062e69]/80">
                    {formData.phaseTask}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Expense: </span>
                  <span className="text-[#062e69]/80">{formData.expense}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Bill Code:{" "}
                  </span>
                  <span className="text-[#062e69]/80">{formData.billCode}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">Status: </span>
                  <span className="text-[#062e69]/80">{formData.status}</span>
                </p>
                <p>
                  <span className="font-medium text-[#062e69]">
                    Narrative:{" "}
                  </span>
                  <span className="text-[#062e69]/80">
                    {formData.narrative}
                  </span>
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
    <div className="bg-white/95 backdrop-blur-md border border-[#062e69]/30 p-8 rounded-2xl max-w-2xl mx-auto shadow-2xl relative">
      {/* Step Indicators */}
      <div className="flex justify-between mb-6 overflow-x-auto">
        {steps.map((label, index) => (
          <div key={index} className="flex-1 text-center min-w-0 px-1">
            <div
              className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                index <= step
                  ? "bg-[#062e69] text-white shadow-lg"
                  : "bg-[#062e69]/20 text-[#062e69]/60"
              }`}
            >
              {index < step ? <CheckCircle size={16} /> : index + 1}
            </div>
            <p
              className={`text-xs mt-2 truncate transition-colors duration-300 ${
                index <= step
                  ? "text-[#062e69] font-medium"
                  : "text-[#062e69]/60"
              }`}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Step Forms */}
      <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

      {/* Navigation - Fixed with proper event handlers */}
      <div className="mt-6 flex justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              prevStep();
            }}
            className="px-6 py-2 bg-[#062e69]/10 text-[#062e69] rounded-lg hover:bg-[#062e69]/20 transition-all duration-200 font-medium"
          >
            Back
          </button>
        ) : (
          <span></span>
        )}

        {step < maxSteps - 1 ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              nextStep();
            }}
            className="px-6 py-2 bg-[#062e69] text-white rounded-lg hover:bg-[#062e69]/90 transition-all duration-200 font-medium shadow-lg hover:shadow-[#062e69]/25"
          >
            Next
          </button>
        ) : (
          <motion.button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2 bg-[#062e69] text-white rounded-lg hover:bg-[#062e69]/90 transition-all duration-200 flex items-center space-x-2 font-medium shadow-lg"
            whileTap={{ scale: 0.95 }}
          >
            <span>Insert</span>
            <CheckCircle size={18} />
          </motion.button>
        )}
      </div>

      {/* Close Button - Fixed */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onClose) {
            onClose();
          }
        }}
        className="absolute top-4 right-4 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 p-2 hover:bg-[#062e69]/10 rounded-full focus:outline-none focus:ring-2 focus:ring-[#062e69]/40"
        aria-label="Close timesheet form"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default TimesheetForm;
