export default function Meter({ value, tone }) {
  return (
    <div className="meter-track">
      <div className="meter-fill" style={{ width: `${value}%`, background: tone }} />
    </div>
  );
}
