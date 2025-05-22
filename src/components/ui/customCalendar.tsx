import React, { useState, useEffect, useRef } from "react";

const daysShort = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

interface SimpleDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
}

const SimpleDatePicker: React.FC<SimpleDatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const ref = useRef<HTMLDivElement>(null);

  // Initialize currentMonth to selected date or today
  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    }
  }, [value]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const generateDays = () => {
    const days: Date[] = [];
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const daysInPrevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();

    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), daysInPrevMonth - i));
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), i));
    }
    return days;
  };

  const days = generateDays();

  const selectDate = (date: Date, event: React.MouseEvent) => {
    event.stopPropagation();
    // Normalize to UTC midnight
    const normalizedDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    onChange(normalizedDate);
    setIsOpen(false);
  };

  const clearDate = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  // Display date in local timezone (e.g., 2025-05-08 for May 8, 2025 IST)
  const displayDate = value
    ? `${value.getFullYear()}-${(value.getMonth() + 1).toString().padStart(2, "0")}-${value
        .getDate()
        .toString()
        .padStart(2, "0")}`
    : placeholder;

  return (
    <div className="relative w-64" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-lg border px-4 py-2 text-left text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
        type="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span>{displayDate}</span>
        <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-20 mt-2 w-full rounded-lg border bg-white shadow-lg p-3"
          role="dialog"
          aria-label="Date picker"
        >
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
              }
              aria-label="Previous month"
              className="p-1 hover:bg-gray-100 rounded"
            >
              ←
            </button>
            <div className="font-semibold">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
              }
              aria-label="Next month"
              className="p-1 hover:bg-gray-100 rounded"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 text-xs text-center text-gray-500 font-medium mb-1">
            {daysShort.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((date, idx) => {
              const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
              const isSelected = value && isSameDay(value, date);

              return (
                <button
                  key={idx}
                  className={`text-sm p-1 rounded-lg transition
                    ${isSelected ? "bg-blue-500 text-white" : ""}
                    ${!isCurrentMonth ? "text-gray-300" : "text-gray-800"}
                    ${isCurrentMonth && !isSelected ? "hover:bg-blue-100" : ""}
                  `}
                  onClick={(e) => selectDate(date, e)}
                  aria-label={`Select ${date.toDateString()}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-end">
            <button
              onClick={clearDate}
              className="text-sm text-red-600 hover:underline"
              aria-label="Clear selected date"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleDatePicker;