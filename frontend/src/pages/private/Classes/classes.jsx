import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "./classes.css";

import CalendarIcon from "../../../assets/icons/calendar.png";
import EmptyClassesIcon from "../../../assets/icons/empty-classes.png";

// => Backend already filters to Approved enrollments only, so anything
// => returned here is safe to render as an active class
const Classes = () => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await axios.get(
          "http://localhost:5000/api/student-classes/my-batches",
          { withCredentials: true }
        );
        setBatches(res.data.batches || []);
      } catch (error) {
        console.error("Fetch classes error:", error);
        toast.error("Unable to load your classes right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, []);

  // => Routes to the correct detail component based on enrollment_type -
  // => TESDA and SHS batches have different shapes so they get separate pages
  const handleCardClick = (batch) => {
    const path = batch.enrollment_type === "SHS"
      ? `/dashboard/classes/shs/${batch.batch_public_id}`
      : `/dashboard/classes/tesda/${batch.batch_public_id}`;
    navigate(path);
  };

  const formatDateRange = (start, end) => {
    if (!start && !end) return "Schedule not yet set";
    const opts = { year: "numeric", month: "short", day: "numeric" };
    const startStr = start ? new Date(start).toLocaleDateString("en-US", opts) : "TBD";
    const endStr = end ? new Date(end).toLocaleDateString("en-US", opts) : "TBD";
    return `${startStr} - ${endStr}`;
  };

  if (loading) {
    return (
      <div className="classes-page">
        <h1>Classes</h1>
        <p className="classes-subtitle">Loading your classes...</p>
      </div>
    );
  }

  return (
    <div className="classes-page">
      <div className="classes-header">
        <h1 className="classes-title">Classes</h1>
        <p className="classes-subtitle">
          View the class schedule for each of your approved enrollments.
        </p>
      </div>

      {batches.length === 0 ? (
        <div className="classes-empty">
          <img src={EmptyClassesIcon} alt="No classes yet" className="classes-empty-icon" />
          <p>No classes to show yet. This fills in once an enrollment is approved.</p>
        </div>
      ) : (
        <div className="classes-list">
          {batches.map((batch) => (
            <div
              key={batch.batch_public_id}
              className="classes-card"
              onClick={() => handleCardClick(batch)}
            >
              <div className="classes-card-header">
                <h2>{batch.title || "Untitled Course"}</h2>
                <span className={`classes-badge classes-badge--${batch.enrollment_type.toLowerCase()}`}>
                  {batch.enrollment_type}
                </span>
              </div>

              <p className="classes-card-batch">
                {batch.batch_name}
                {batch.school_year ? ` \u00b7 SY ${batch.school_year}` : ""}
                {batch.class_type ? ` \u00b7 ${batch.class_type}` : ""}
              </p>

              <div className="classes-card-footer">
                <img src={CalendarIcon} alt="Schedule" className="classes-card-icon" />
                <span>{formatDateRange(batch.start_date, batch.end_date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Classes;