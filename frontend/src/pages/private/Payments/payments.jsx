import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosStudent from "../../../utils/axiosStudent";
import toast from "react-hot-toast";
import "./payments.css";

import LoadingState from '../../../components/private/LoadingState/loadingState.jsx';

import ReceiptIcon from "../../../assets/icons/receipt.png";
import RefundIconImg from "../../../assets/icons/refund.png";
import EmptyPaymentsIcon from "../../../assets/icons/empty-classes.png";
import BalanceIcon from "../../../assets/icons/balance.png";

// => Read-only history view. Backend already scopes both lists to the
// => logged-in student, so nothing here needs a student_id filter.
const Payments = () => {
  const [activeTab, setActiveTab] = useState("payments"); // => 'payments' | 'refunds'
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // => fetch all three on mount so switching tabs is instant, no
        // => reload flicker. Backend scopes every one of these to the
        // => logged-in student via req.student.student_id from the JWT
        // => cookie, never from anything the client sends.
        const [paymentsRes, refundsRes, balancesRes] = await Promise.all([
          axiosStudent.get("/payments/my-payments"),
          axiosStudent.get("/payments/my-refunds"),
          axiosStudent.get("/payments/my-balances"),
        ]);
        setPayments(paymentsRes.data.payments || []);
        setRefunds(refundsRes.data.refunds || []);
        setBalances(balancesRes.data.balances || []);
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
        {/* => shared spinner, keeps loading UI consistent across dashboard pages */}
        <LoadingState message="Loading your payment history..." />
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

      {balances.length > 0 && (
        <div className="balance-summary">
          <h2 className="balance-summary-title">Your Balance</h2>
          <div className="balance-summary-list">
            {balances.map((b) => {
              // => pg numeric columns arrive as strings, Number() first
              const totalDue = Number(b.fee_at_enrollment || 0) + Number(b.total_misc_fee || 0);
              const netPaid = Number(b.total_paid || 0) - Number(b.total_refunded || 0);
              const remaining = Number(b.remaining_balance || 0);

              return (
                <div key={b.enrollment_public_id} className="balance-card">
                  <div className="balance-card-heading">
                    <img src={BalanceIcon} alt="" className="balance-card-icon" />
                    <div>
                      <h3>
                        {b.course_title || "Untitled Course"}
                        {b.nc_level ? ` (${b.nc_level})` : ""}
                      </h3>
                      <p className="balance-card-batch">
                        {b.batch_sequence ? `${b.batch_name} (Batch ${b.batch_sequence})` : b.batch_name}
                      </p>
                    </div>
                  </div>

                  <div className="balance-card-figures">
                    <div className="balance-figure">
                      <span className="balance-figure-label">Total Due</span>
                      <span className="balance-figure-value">{formatCurrency(totalDue)}</span>
                    </div>
                    <div className="balance-figure">
                      <span className="balance-figure-label">Paid</span>
                      <span className="balance-figure-value">{formatCurrency(netPaid)}</span>
                    </div>
                    <div className={`balance-figure ${remaining > 0 ? "balance-figure--owed" : "balance-figure--settled"}`}>
                      <span className="balance-figure-label">Remaining Balance</span>
                      <span className="balance-figure-value">{formatCurrency(remaining)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                {p.nc_level ? ` (${p.nc_level})` : ""}
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
                {r.nc_level ? ` (${r.nc_level})` : ""}
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
