import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "./payments.css";

import ReceiptIcon from "../../../assets/icons/receipt.png";
import RefundIconImg from "../../../assets/icons/refund.png";
import EmptyPaymentsIcon from "../../../assets/icons/empty-classes.png";

// => Read-only history view. Backend already scopes both lists to the
// => logged-in student, so nothing here needs a student_id filter.
const Payments = () => {
  const [activeTab, setActiveTab] = useState("payments"); // => 'payments' | 'refunds'
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // => fetch both on mount so switching tabs is instant, no reload flicker
        const [paymentsRes, refundsRes] = await Promise.all([
          axios.get("http://localhost:5000/api/payments/my-payments", { withCredentials: true }),
          axios.get("http://localhost:5000/api/payments/my-refunds", { withCredentials: true }),
        ]);
        setPayments(paymentsRes.data.payments || []);
        setRefunds(refundsRes.data.refunds || []);
      } catch (error) {
        console.error("Fetch payments error:", error);
        toast.error("Unable to load your payment history right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const formatCurrency = (amount) =>
    `\u20b1${Number(amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
      : "N/A";

  const handlePaymentClick = (publicId) => navigate(`/dashboard/payments/${publicId}`);
  const handleRefundClick = (publicId) => navigate(`/dashboard/payments/refunds/${publicId}`);

  if (loading) {
    return (
      <div className="payments-page">
        <h1>Payments</h1>
        <p className="payments-subtitle">Loading your payment history...</p>
      </div>
    );
  }

  const activeList = activeTab === "payments" ? payments : refunds;

  return (
    <div className="payments-page">
      <div className="payments-header">
        <h1 className="payments-title">Payments</h1>
        <p className="payments-subtitle">
          View your OTC payment and refund history. All amounts are recorded by staff upon receipt.
        </p>
      </div>

      <div className="payments-tabs">
        <button
          className={`payments-tab ${activeTab === "payments" ? "payments-tab--active" : ""}`}
          onClick={() => setActiveTab("payments")}
        >
          Payments
        </button>
        <button
          className={`payments-tab ${activeTab === "refunds" ? "payments-tab--active" : ""}`}
          onClick={() => setActiveTab("refunds")}
        >
          Refunds
        </button>
      </div>

      {activeList.length === 0 ? (
        <div className="payments-empty">
          <img src={EmptyPaymentsIcon} alt="No records" className="payments-empty-icon" />
          <p>
            {activeTab === "payments"
              ? "No payments recorded yet."
              : "No refunds have been issued to you yet."}
          </p>
        </div>
      ) : activeTab === "payments" ? (
        <div className="payments-list">
          {payments.map((p) => (
            <div key={p.public_id} className="payments-card" onClick={() => handlePaymentClick(p.public_id)}>
              <div className="payments-card-header">
                <div className="payments-card-heading">
                  <img src={ReceiptIcon} alt="" className="payments-card-icon" />
                  <h2>{p.or_number}</h2>
                </div>
                <span className={`payments-badge payments-badge--${p.status.toLowerCase()}`}>
                  {p.status}
                </span>
              </div>

              <p className="payments-card-course">
                {p.course_title || "Untitled Course"}
                {p.batch_name ? ` \u00b7 ${p.batch_name}` : ""}
              </p>

              <div className="payments-card-footer">
                <span className="payments-card-amount">{formatCurrency(p.amount)}</span>
                <span className="payments-card-date">{formatDate(p.payment_date)}</span>
                <span className="payments-card-method">{p.payment_method}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="payments-list">
          {refunds.map((r) => (
            <div key={r.public_id} className="payments-card" onClick={() => handleRefundClick(r.public_id)}>
              <div className="payments-card-header">
                <div className="payments-card-heading">
                  <img src={RefundIconImg} alt="" className="payments-card-icon" />
                  <h2>{r.refund_number}</h2>
                </div>
                <span className={`payments-badge payments-badge--${r.status.toLowerCase()}`}>
                  {r.status}
                </span>
              </div>

              <p className="payments-card-course">
                {r.course_title || "Untitled Course"}
                {r.batch_name ? ` \u00b7 ${r.batch_name}` : ""}
              </p>

              <div className="payments-card-footer">
                <span className="payments-card-amount">{formatCurrency(r.amount)}</span>
                <span className="payments-card-date">{formatDate(r.created_at)}</span>
                <span className="payments-card-method">
                  {r.refund_type === "Percentage" ? `${r.percentage_value}%` : "Fixed"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Payments;
