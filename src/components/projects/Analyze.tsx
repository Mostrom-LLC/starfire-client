import { DataVisualization } from '../DataVisualization';

export function Review() {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <DataVisualization />
      </div>
    </div>
  );
}