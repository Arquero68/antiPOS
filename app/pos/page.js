import CheckoutPOS from "../../components/CheckoutPOS";

export const metadata = {
    title: "antiPOS - Store Terminal",
    description: "Touch-optimized store checkout terminal",
};

export default function POSPage() {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-main)' }}>
            <CheckoutPOS />
        </div>
    );
}
