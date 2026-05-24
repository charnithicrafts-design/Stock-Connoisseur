// src/components/Calendar.tsx
import React from 'react';

export default function Calendar() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div className="calendar">
      <h2>Reporting Calendar</h2>
      <div className="grid">
        {days.map(d => (
          <div key={d} className="day">
            <span>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
