import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosStudent from "../../../../utils/axiosStudent";
import toast from "react-hot-toast";
import "./refundDetail.css";

import BackButton from "../../BackButton/BackButton.jsx";
import ReceiptIcon from "../../../../assets/icons/receipt.png";
import CalendarIcon from "../../../../assets/icons/calendar.png";
import EnrollmentIcon from "../../../../assets/icons/enroll.png";

const RefundDetail = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axiosStudent.get(`/payments/refund/${publicId}`);
        setRefund(res.data.refund);
      } catch (error) {
        console.error("Fetch refund detail error:", error);
        toast.error("Unable to load this refund.");
        navigate("/dashboard/payments");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [publicId, navigate]);

  const formatCurrency = (amount) =>
    `\u20b1${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDateTime = (date) =>
    date
      ? new Date(date).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "N/A";

  if (loading) return <div className="refund-detail-page">Loading...</div>;
  if (!refund) return null;

  return (
    <div className="refund-detail-page">
      <BackButton destination="Payments" onClick={() => navigate("/dashboard/payments")} />

      <div className="refund-detail-header">
        <h1>{refund.refund_number}</h1>
        <span className={`refund-detail-status refund-detail-status--${refund.status.toLowerCase()}`}>
          {refund.status}
        </span>
      </div>

      <p className="refund-detail-course">
        {refund.course_title || "Untitled Course"}
        {refund.batch_name ? ` \u00b7 ${refund.batch_name}` : ""}
      </p>

      <div className="refund-detail-amount-block">
        <span className="refund-detail-amount-label">Amount Refunded</span>
        <span className="refund-detail-amount-value">{formatCurrency(refund.amount)}</span>
      </div>

      <div className="refund-detail-info-grid">
        <div className="refund-detail-info-item">
          <img src={ReceiptIcon} alt="Type" className="refund-detail-info-icon" />
          <div>
            <span className="refund-detail-info-label">Refund Type</span>
            <span className="refund-detail-info-value">
              {refund.refund_type === "Percentage" ? `${refund.percentage_value}% of course fee` : "Fixed amount"}
            </span>
          </div>
        </div>

        <div className="refund-detail-info-item">
          <img src={CalendarIcon} alt="Method" className="refund-detail-info-icon" />
          <div>
            <span className="refund-detail-info-label">Refund Method</span>
            <span className="refund-detail-info-value">{refund.refund_method}</span>
          </div>
        </div>

        <div className="refund-detail-info-item">
          <img src={EnrollmentIcon} alt="Recorded" className="refund-detail-info-icon" />
          <div>
            <span className="refund-detail-info-label">Recorded</span>
            <span className="refund-detail-info-value">{formatDateTime(refund.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="refund-detail-section">
        <h2 className="refund-detail-section-title">Reason</h2>
        <p className="refund-detail-text">{refund.reason}</p>
      </div>

      {refund.remarks && (
        <div className="refund-detail-section">
          <h2 className="refund-detail-section-title">Remarks</h2>
          <p className="refund-detail-text">{refund.remarks}</p>
        </div>
      )}

      {/* => Only rendered when status is Voided */}
      {refund.status === "Voided" && (
        <div className="refund-detail-section refund-detail-section--voided">
          <h2 className="refund-detail-section-title">Void Details</h2>
          <p className="refund-detail-text">{refund.void_reason || "No reason provided."}</p>
          <p className="refund-detail-void-date">Voided on {formatDateTime(refund.voided_at)}</p>
        </div>
      )}
    </div>
  );
};

export default RefundDetail;
