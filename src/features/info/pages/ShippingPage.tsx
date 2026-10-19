import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import { Truck, ShieldCheck, MapPin } from 'lucide-react';

export const ShippingPage: React.FC = () => {
  useDocumentTitle('Shipping & Delivery Policy | MUETY');

  return (
    <div className="policy-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#090d16', color: '#ffffff', padding: '4rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="container" style={{ maxWidth: '850px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
            MUETY • DISPATCH &amp; DELIVERY
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginTop: '8px', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Shipping &amp; Delivery Policy
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6 }}>
            Effective Date: <strong>18 October 2026</strong> • Dispatch, delivery and order tracking
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem', maxWidth: '900px' }}>

        {/* Highlight Cards */}
        <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <Truck size={32} color="#d4af37" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', color: 'var(--brand-primary)', fontWeight: 700 }}>
              Pan-India Delivery
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Delivers to serviceable locations in India. Availability depends on the courier network and delivery PIN code.
            </p>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <ShieldCheck size={32} color="#d4af37" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)', color: 'var(--brand-primary)', fontWeight: 700 }}>
              Tracked Courier Dispatch
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Tracking details provided where available. Use official tracking information for your order and remain reachable for delivery coordination.
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="card" style={{ padding: '3rem 2.5rem', fontSize: '0.98rem', lineHeight: 1.8, color: 'var(--text-secondary)' }}>

          {/* Important Notice */}
          <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.08)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212, 175, 55, 0.3)', marginBottom: '2rem' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#92400e', fontWeight: 600 }}>
              This policy explains how MUETY processes and delivers orders placed at https://www.muety.in. These policies do not remove consumer rights or remedies that cannot legally be excluded under Indian law.
            </p>
          </div>

          {/* Section 1 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            1. Delivery Locations
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            MUETY delivers to serviceable locations in India. Availability depends on the courier network and the delivery PIN code entered at checkout.
          </p>

          {/* Section 2 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            2. Order Processing and Dispatch
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Orders are prepared for dispatch after payment confirmation or completion of the required COD confirmation process, including payment of the ₹89 COD advance where applicable. Processing and dispatch time may vary according to stock availability, order volume, public holidays and operational conditions. Review any specific dispatch estimate shown at checkout or in an order message.
          </p>

          {/* Section 3 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            3. Delivery Estimates
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Delivery estimates may vary by location, courier service, weather, transport disruption and other circumstances outside MUETY's reasonable control. Any estimate provided is not a guarantee unless expressly stated otherwise.
          </p>

          {/* Section 4 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            4. Shipping Charges &amp; Payment Methods
          </h2>
          <p style={{ marginBottom: '1.5rem', lineHeight: 1.7 }}>
            <strong>Online Prepaid Payments:</strong> 100% FREE Pan-India insured courier delivery applies to all prepaid orders completed online via Razorpay (UPI, Credit/Debit Cards, Net Banking, Wallets). Delivery charges are ₹0.<br />
            <strong>Cash on Delivery (COD):</strong> A flat ₹89.00 courier delivery fee is charged on COD orders. To confirm COD dispatch, this ₹89 delivery fee is collected online via Razorpay at checkout as an advance confirmation. The remaining balance (product subtotal and applicable tax) is collected in cash or UPI at your doorstep upon parcel delivery.
          </p>

          {/* Section 5 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            5. Address and Contact Details
          </h2>
          <p style={{ marginBottom: '1rem' }}>
            Customers must provide a complete and accurate delivery address, PIN code and valid contact number. MUETY may contact customers to verify an order or clarify delivery details.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            Incorrect or incomplete address information may cause delays or failed delivery. Contact support promptly if you notice an error after placing an order.
          </p>

          {/* Section 6 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            6. Tracking and Delivery Updates
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            Tracking details will be provided where available from the courier partner. Customers should use the official tracking information supplied for their order and remain reachable for delivery coordination.
          </p>

          {/* Section 7 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            7. Delayed, Missing or Undelivered Orders
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            If an order is delayed, tracking does not update, or a parcel is not delivered within the promised timeframe, contact <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong> with your order number and registered mobile number. MUETY will review the issue with the courier partner and provide an appropriate update or remedy as required by applicable law.
          </p>

          {/* Section 8 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            8. Return/Refund Requests
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            For a return or refund request related to a damaged, defective, incorrect or materially misdescribed saree, customers should follow the <Link to="/return-refund-policy" style={{ color: 'var(--brand-accent)', textDecoration: 'underline', fontWeight: 600 }}>Return, Refund &amp; Cancellation Policy</Link>, including its three-day request window and unboxing-video evidence requirements.
          </p>

          {/* Section 9 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            9. Failed Delivery or Refusal
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>
            If a parcel cannot be delivered because the address is incorrect, the recipient is unavailable or delivery is refused, the order may be returned to MUETY. Any treatment of COD advance fees will follow the <Link to="/terms-conditions" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>Terms &amp; Conditions</Link>, <Link to="/return-refund-policy" style={{ color: 'var(--brand-accent)', textDecoration: 'underline' }}>Return, Refund &amp; Cancellation Policy</Link> and applicable law.
          </p>

          {/* Section 10 */}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--brand-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            10. Contact
          </h2>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--brand-border)' }}>
            <p style={{ fontSize: '0.92rem', margin: 0, lineHeight: 1.7 }}>
              For shipping or delivery assistance, email <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong>. Include your order number, delivery PIN code and a short description of the issue.
            </p>
          </div>

        </div>

        {/* Brand Footer */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          <p style={{ marginBottom: '4px' }}><strong>MUETY — Traditional Sarees &amp; Wear</strong></p>
          <p style={{ marginBottom: '4px' }}>Website: <a href="https://www.muety.in" style={{ color: 'var(--brand-accent)' }}>https://www.muety.in</a></p>
          <p>Email: <strong style={{ color: 'var(--brand-primary)' }}>support@muety.in</strong></p>
        </div>
      </div>
    </div>
  );
};
