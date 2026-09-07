export default function ProductLoading() {
  return (
    <div aria-busy="true" aria-label="Loading waiver data" className="page-wrap loading-page">
      <div className="loading-line loading-eyebrow" />
      <div className="loading-line loading-title" />
      <div className="loading-line loading-copy" />
      <div className="loading-grid">
        <div className="loading-panel panel" />
        <div className="loading-panel panel" />
        <div className="loading-panel panel" />
      </div>
    </div>
  );
}
