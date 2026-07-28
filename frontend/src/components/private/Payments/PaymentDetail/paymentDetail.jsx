import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "./paymentDetail.css";

// => four levels deep from src (components/private/Payments/PaymentDetail/),
//    matching the same relative-depth pattern as tesdaClassDetail.jsx
import BackButton from "../../BackButton/BackButton.jsx";
import ReceiptIcon from "../../../../assets/icons/receipt.png";
import CalendarIcon from "../../../../assets/icons/calendar.png";
import EnrollmentIcon from "../../../../assets/icons/enroll.png";

const PaymentDetail = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/payments/${publicId}`,
          { withCredentials: true }
        );
        setPayment(res.data.payment);
      } catch (error) {
        console.error("Fetch payment detail error:", error);
        toast.error("Unable to load this payment.");
        navigate("/dashboard/payments");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [publicId, navigate]);

  const formatCurrency = (amount) =>
    `\u20b1${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "N/A";

  const formatDateTime = (date) =>
    date
      ? new Date(date).toLocaleString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "N/A";

  if (loading) return <div className="payment-detail-page">Loading...</div>;
  if (!payment) return null;

  return (
    <div className="payment-detail-page">
      <BackButton destination="Payments" onClick={() => navigate("/dashboard/payments")} />

      <div className="payment-detail-header">
        <h1>{payment.or_number}</h1>
        <span className={`payment-detail-status payment-detail-status--${payment.status.toLowerCase()}`}>
          {payment.status}
        </span>
      </div>

      <p className="payment-detail-course">
        {payment.course_title || "Untitled Course"}
        {payment.batch_name ? ` \u00b7 ${payment.batch_name}` : ""}
      </p>

      <div className="payment-detail-amount-block">
        <span className="payment-detail-amount-label">Amount</span>
        <span className="payment-detail-amount-value">{formatCurrency(payment.amount)}</span>
      </div>

      <div className="payment-detail-info-grid">
        <div className="payment-detail-info-item">
          <img src={CalendarIcon} alt="Payment Date" className="payment-detail-info-icon" />
          <div>
            <span className="payment-detail-info-label">Payment Date</span>
            <span className="payment-detail-info-value">{formatDate(payment.payment_date)}</span>
          </div>
        </div>

        <div className="payment-detail-info-item">
          <img src={ReceiptIcon} alt="Method" className="payment-detail-info-icon" />
          <div>
            <span className="payment-detail-info-label">Payment Method</span>
            <span className="payment-detail-info-value">{payment.payment_method}</span>
          </div>
        </div>

        <div className="payment-detail-info-item">
          <img src={EnrollmentIcon} alt="Enrollment" className="payment-detail-info-icon" />
          <div>
            <span className="payment-detail-info-label">Recorded</span>
            <span className="payment-detail-info-value">{formatDateTime(payment.created_at)}</span>
          </div>
        </div>
      </div>

      {payment.remarks && (
        <div className="payment-detail-section">
          <h2 className="payment-detail-section-title">Remarks</h2>
          <p className="payment-detail-text">{payment.remarks}</p>
        </div>
      )}

      {/* => Only rendered when status is Voided - void_reason and voided_at
            are NULL for Completed payments */}
      {payment.status === "Voided" && (
        <div className="payment-detail-section payment-detail-section--voided">
          <h2 className="payment-detail-section-title">Void Details</h2>
          <p className="payment-detail-text">{payment.void_reason || "No reason provided."}</p>
          <p className="payment-detail-void-date">Voided on {formatDateTime(payment.voided_at)}</p>
        </div>
      )}
    </div>
  );
};

export default PaymentDetail;
