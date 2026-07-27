import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "./shsClassDetail.css";

import BackButton from "../BackButton/BackButton.jsx";
import CalendarIcon from "../../../assets/icons/calendar.png";
import ClockIcon from "../../../assets/icons/clock.png";
import LocationIcon from "../../../assets/icons/location.png";
import TrainerIcon from "../../../assets/icons/trainer.png";
import LinkIcon from "../../../assets/icons/link.png";

const SHSClassDetail = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/student-classes/shs/${publicId}`,
          { withCredentials: true }
        );
        setBatch(res.data.batch);
        setSessions(res.data.sessions || []);
      } catch (error) {
        console.error("Fetch SHS class detail error:", error);
        toast.error("Unable to load this class.");
        navigate("/dashboard/classes");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [publicId, navigate]);

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "TBD";

  const formatTime = (time) => {
    if (!time) return "TBD";
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${period}`;
  };

  const resolveLocation = (session) => {
    if (session.session_type === "Online") return session.meeting_link || "Link not yet posted";
    return session.facility_name || session.mobile_location || "TBD";
  };

  if (loading) return <div className="class-detail-page">Loading...</div>;
  if (!batch) return null;

  return (
    <div className="class-detail-page">
      <BackButton destination="Classes" onClick={() => navigate("/dashboard/classes")} />

      <div className="class-detail-header">
        <h1>{batch.cluster_name || "Untitled Cluster"}</h1>
        <span className="class-detail-status">{batch.status}</span>
      </div>

      <p className="class-detail-batchname">{batch.batch_name} &middot; SY {batch.school_year}</p>

      <div className="class-detail-info-grid">
        <div className="class-detail-info-item">
          <img src={CalendarIcon} alt="Schedule" className="class-detail-info-icon" />
          <div>
            <span className="class-detail-info-label">Duration</span>
            <span className="class-detail-info-value">
              {formatDate(batch.start_date)} - {formatDate(batch.end_date)}
            </span>
          </div>
        </div>

        {/* => SHS batches carry two trainers, one per grade level, unlike TESDA's one */}
        <div className="class-detail-info-item">
          <img src={TrainerIcon} alt="Grade 11 Trainer" className="class-detail-info-icon" />
          <div>
            <span className="class-detail-info-label">Grade 11 Trainer</span>
            <span className="class-detail-info-value">{batch.grade11_trainer_name || "Not yet assigned"}</span>
          </div>
        </div>

        <div className="class-detail-info-item">
          <img src={TrainerIcon} alt="Grade 12 Trainer" className="class-detail-info-icon" />
          <div>
            <span className="class-detail-info-label">Grade 12 Trainer</span>
            <span className="class-detail-info-value">{batch.grade12_trainer_name || "Not yet assigned"}</span>
          </div>
        </div>

        {batch.groupchat_link && (
          <div className="class-detail-info-item">
            <img src={LinkIcon} alt="Group Chat" className="class-detail-info-icon" />
            <div>
              <span className="class-detail-info-label">Group Chat</span>
              <a href={batch.groupchat_link} target="_blank" rel="noreferrer" className="class-detail-info-link">
                Open link
              </a>
            </div>
          </div>
        )}
      </div>

      <h2 className="class-detail-section-title">Class Sessions</h2>

      {sessions.length === 0 ? (
        <p className="class-detail-empty">No sessions have been scheduled yet.</p>
      ) : (
        <div className="class-detail-table-wrapper">
          <table className="class-detail-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Time</th>
                <th>Location / Link</th>
                <th>Trainer</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.session_id}>
                  <td>{session.session_type}</td>
                  <td>
                    <img src={CalendarIcon} alt="" className="class-detail-table-icon" />
                    {formatDate(session.session_date)}
                  </td>
                  <td>
                    <img src={ClockIcon} alt="" className="class-detail-table-icon" />
                    {formatTime(session.start_time)} - {formatTime(session.end_time)}
                  </td>
                  <td>
                    <img src={LocationIcon} alt="" className="class-detail-table-icon" />
                    {resolveLocation(session)}
                  </td>
                  <td>{session.trainer_name || "TBD"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SHSClassDetail;