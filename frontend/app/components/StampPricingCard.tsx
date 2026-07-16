type StampPricingCardProps = {
  avgGasPriceGwei?: number;
  className?: string;
};

export default function StampPricingCard({ avgGasPriceGwei = 0, className = "" }: StampPricingCardProps) {
  const networkTone =
    avgGasPriceGwei > 50 ? "very busy" : avgGasPriceGwei > 20 ? "moderately busy" : "relatively calm";

  return (
    <div className={`rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3 text-sm ${className}`}>
      <h4 className="font-semibold text-cyan-300">Gas pricing: base fee + priority fee</h4>
      <p className="mt-1 text-fg/80">
        Every transaction pays for gas used. The base fee is set by the protocol, while the priority fee is the user tip that can
        improve inclusion odds when blockspace is competitive.
      </p>
      <p className="mt-2 rounded border border-cyan-400/20 bg-cyan-400/10 p-2 text-xs text-fg/85">
        Actual formula: Ethereum pricing is{" "}
        <strong>(base fee + priority fee) × gas used</strong>. The base fee is protocol-set per block, while the priority fee
        is the user tip to improve inclusion speed.
      </p>
      <p className="mt-2 text-xs text-fg/60">
        Current signal: average pending price is <strong>{avgGasPriceGwei.toFixed(2)} gwei</strong>, which suggests the network is{" "}
        <strong>{networkTone}</strong>.
      </p>
    </div>
  );
}
