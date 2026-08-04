import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosStudent from "../../../../utils/axiosStudent";
import toast from "react-hot-toast";
import "./paymentDetail.css";

// => four levels deep from src (components/private/Payments/PaymentDetail/),
//    matching the same relative-depth pattern as tesdaClassDetail.jsx
import BackButton from "../../BackButton/BackButton.jsx";
import LoadingState from "../../LoadingState/loadingState.jsx";
import ReceiptIcon from "../../../../assets/icons/receipt.png";
import CalendarIcon from "../../../../assets/icons/calendar.png";
import EnrollmentIcon from "../../../../assets/icons/enroll.png";
import DownloadIcon from "../../../../assets/icons/download.png";

const PaymentDetail = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // => Reset BEFORE fetching, not after - otherwise navigating from one
    // => payment's detail page directly to another publicId leaves the
    // => previous payment's real data rendered on screen for the entire
    // => duration of the new request, and if that request 404s (not
    // => this student's payment), there is a visible window where
    // => someone else's data shows under the new URL before the redirect
    // => below fires.
    setPayment(null);
    setLoading(true);

    const fetchDetail = async () => {
      try {
        const res = await axiosStudent.get(`/payments/${publicId}`);
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

  // => Backend scopes this by req.student.student_id from the JWT cookie,
  // => so requesting another student's publicId here just 404s server
  // => side - nothing extra to guard on the frontend.
  const handleDownloadReceipt = async () => {
    try {
      const res = await axiosStudent.get(`/payments/${publicId}/receipt`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Receipt-${payment.or_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download receipt error:", error);
      toast.error("Unable to download the receipt right now.");
    }
  };

  if (loading) {
    return (
      <div className="payment-detail-page">
        {/* => shared spinner, keeps loading UI consistent across dashboard pages */}
        <LoadingState message="Loading payment details..." />
      </div>
    );
  }
  if (!payment) return null;

  return (
    <div className="payment-detail-page">
      <BackButton destination="Payments" onClick={() => navigate("/dashboard/payments")} />

      <div className="payment-detail-header">
        <h1>{payment.or_number}</h1>
        <div className="payment-detail-header-actions">
          <span className={`payment-detail-status payment-detail-status--${payment.status.toLowerCase()}`}>
            {payment.status}
          </span>
          <button type="button" className="payment-detail-download-btn" onClick={handleDownloadReceipt}>
            <img src={DownloadIcon} alt="" className="payment-detail-download-icon" />
            Download Receipt
          </button>
        </div>
      </div>

      <p className="payment-detail-course">
        {payment.course_title || "Untitled Course"}
        {payment.nc_level ? ` (${payment.nc_level})` : ""}
        {payment.batch_name ? ` \u00b7 ${payment.batch_name}` : ""}
      </p>

      {/* => Amount and Balance sit side by side on wide screens instead
            of stacking full-width - fills the empty right-hand space the
            old 720px-capped single column left unused */}
      <div className="payment-detail-summary-grid">
        <div className="payment-detail-amount-block">
          <span className="payment-detail-amount-label">Amount</span>
          <span className="payment-detail-amount-value">{formatCurrency(payment.amount)}</span>
        </div>

        {/* => fee_at_enrollment / total_misc_fee / total_paid / remaining_balance
              come from the backend's balance snapshot on this payment's
              enrollment, same formula used everywhere else in this feature */}
        <div className="payment-detail-balance-block">
          <div className="payment-detail-balance-figure">
            <span className="payment-detail-balance-label">Course Fee</span>
            <span className="payment-detail-balance-value">{formatCurrency(payment.fee_at_enrollment)}</span>
          </div>
          <div className="payment-detail-balance-figure">
            <span className="payment-detail-balance-label">Misc Fees</span>
            <span className="payment-detail-balance-value">{formatCurrency(payment.total_misc_fee)}</span>
          </div>
          <div className="payment-detail-balance-figure">
            <span className="payment-detail-balance-label">Total Paid to Date</span>
            <span className="payment-detail-balance-value">{formatCurrency(payment.total_paid)}</span>
          </div>
          <div className="payment-detail-balance-figure payment-detail-balance-figure--remaining">
            <span className="payment-detail-balance-label">Remaining Balance</span>
            <span className="payment-detail-balance-value">{formatCurrency(payment.remaining_balance)}</span>
          </div>
        </div>
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
