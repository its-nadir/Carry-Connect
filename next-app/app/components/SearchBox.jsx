"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox({ className = "" }) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [size, setSize] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (date) params.append("date", date);
    if (size) params.append("size", size);

    router.push(`/find-a-carrier?${params.toString()}`);
  };

  return (
    <div className={`search-box ${className}`}>
      <input
        type="text"
        placeholder="From (City or Country)"
        className="input-field"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <input
        type="text"
        placeholder="To (City or Country)"
        className="input-field"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <input
        type="date"
        className="input-field"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <select
        className="input-field"
        value={size}
        onChange={(e) => setSize(e.target.value)}
      >
        <option value="">Select Size</option>
        <option value="Small">Small</option>
        <option value="Medium">Medium</option>
        <option value="Large">Large</option>
      </select>

      <button className="find-btn" onClick={handleSearch}>Find Carriers</button>
    </div>
  );
}
