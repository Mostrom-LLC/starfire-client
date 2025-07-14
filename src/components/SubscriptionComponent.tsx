export function SubscriptionComponent() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-orange-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-orange-800">Active Plans</span>
        </div>
        <div className="bg-amber-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-amber-800">Usage Stats</span>
        </div>
        <div className="bg-yellow-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-yellow-800">Upgrade Options</span>
        </div>
      </div>
      <div className="bg-gray-100 min-h-[100vh] flex-1 rounded-xl md:min-h-min flex items-center justify-center">
        <span className="text-xl font-semibold text-gray-600">Subscription Management</span>
      </div>
    </div>
  )
}