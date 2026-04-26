import { Link, useParams } from 'react-router-dom';

export default function Collect() {
  const { poolId } = useParams();
  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>Collect — pool #{poolId} — placeholder</h1>
      <Link to="/">← back</Link>
    </div>
  );
}
