import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosStudent from "../../../../utils/axiosStudent";
import toast from "react-hot-toast";
import "./refundDetail.css";

import BackButton from "../../BackButton/BackButton.jsx";
import LoadingState from "../../LoadingState/loadingState.jsx";
import ReceiptIcon from "../../../../assets/icons/receipt.png";
import CalendarIcon from "../../../../assets/icons/calendar.png";
import EnrollmentIcon from "../../../../assets/icons/enroll.png";
import DownloadIcon from "../../../../assets/icons/download.png";

const RefundDetail = () => {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // => Same reset-before-fetch fix as PaymentDetail - prevents a
    // => previous refund's real data from lingering on screen while a
    // => new publicId's request is in flight.
    setRefund(null);
    setLoading(true);

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

  // => Same server-side ownership scoping as PaymentDetail's handler -
  // => the backend checks req.student.student_id, not anything sent here.
  const handleDownloadReceipt = async () => {
    try {
      const res = await axiosStudent.get(`/payments/refund/${publicId}/receipt`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Receipt-${refund.refund_number}.pdf`);
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
      <div className="refund-detail-page">
        {/* => shared spinner, keeps loading UI consistent across dashboard pages */}
        <LoadingState message="Loading refund details..." />
      </div>
    );
  }
  if (!refund) return null;

  return (
    <div className="refund-detail-page">
      <BackButton destination="Payments" onClick={() => navigate("/dashboard/payments")} />

      <div className="refund-detail-header">
        <h1>{refund.refund_number}</h1>
        <div className="refund-detail-header-actions">
          <span className={`refund-detail-status refund-detail-status--${refund.status.toLowerCase()}`}>
            {refund.status}
          </span>
          <button type="button" className="refund-detail-download-btn" onClick={handleDownloadReceipt}>
            <img src={DownloadIcon} alt="" className="refund-detail-download-icon" />
            Download Receipt
          </button>
        </div>
      </div>

      <p className="refund-detail-course">
        {refund.course_title || "Untitled Course"}
        {refund.nc_level ? ` (${refund.nc_level})` : ""}
        {refund.batch_name ? ` \u00b7 ${refund.batch_name}` : ""}
      </p>

      <div className="refund-detail-amount-block">
        <span className="refund-detail-amount-label">Amount Refunded</span>
        <span className="refund-detail-amount-value">{formatCurrency(refund.amount)}</span>
      </div>

      {/* => Balance snapshot AFTER this refund was applied - same
            fee_at_enrollment / total_misc_fee / total_paid / remaining_balance
            fields the backend now attaches to every refund detail row */}
      <div className="refund-detail-balance-block">
        {/* => switched from refund-detail-balance-row (never had matching
            => CSS, rendered as unstyled plain text) to refund-detail-balance-figure,
            => which already exists in refundDetail.css and matches the same
            => card pattern paymentDetail.jsx uses for this identical section */}
        <div className="refund-detail-balance-figure">
          <span className="refund-detail-balance-label">Course Fee</span>
          <span className="refund-detail-balance-value">{formatCurrency(refund.fee_at_enrollment)}</span>
        </div>
        <div className="refund-detail-balance-figure">
          <span className="refund-detail-balance-label">Misc Fees</span>
          <span className="refund-detail-balance-value">{formatCurrency(refund.total_misc_fee)}</span>
        </div>
        <div className="refund-detail-balance-figure">
          <span className="refund-detail-balance-label">Total Paid to Date</span>
          <span className="refund-detail-balance-value">{formatCurrency(refund.total_paid)}</span>
        </div>
        <div className="refund-detail-balance-figure refund-detail-balance-figure--remaining">
          <span className="refund-detail-balance-label">Remaining Balance</span>
          <span className="refund-detail-balance-value">{formatCurrency(refund.remaining_balance)}</span>
        </div>
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
