export function OverviewComponent() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-2">
        <div className="bg-blue-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-blue-800">Getting Started Overview</span>
        </div>
        <div className="bg-green-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-green-800">Quick Setup Guide</span>
        </div>
      </div>
      <div className="bg-gray-100 min-h-[100vh] flex-1 rounded-xl md:min-h-min flex items-center justify-center">
        <span className="text-xl font-semibold text-gray-600">Overview Content Area</span>
      </div>
    </div>
  )
}