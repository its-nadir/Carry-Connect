"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchBox({ className = "" }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [size, setSize] = useState("");

  useEffect(() => {
    if (searchParams) {
      setFrom(searchParams.get("from") || "");
      setTo(searchParams.get("to") || "");
      setDate(searchParams.get("date") || "");
      setSize(searchParams.get("size") || "");
    }
  }, [searchParams]);

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
        <option value="Small package (up to 2kg)">Small (up to 2kg)</option>
        <option value="Medium package (2-5kg)">Medium (2–5kg)</option>
        <option value="Large package (5-10kg)">Large (5–10kg)</option>
        <option value="Extra large (10kg+)">Extra Large (10kg+)</option>

      </select>

      <button className="find-btn" onClick={handleSearch}>Find Carriers</button>
    </div>
  );
}
