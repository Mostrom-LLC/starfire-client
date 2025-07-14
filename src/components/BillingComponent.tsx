export function BillingComponent() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-2">
        <div className="bg-emerald-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-emerald-800">Current Plan</span>
        </div>
        <div className="bg-teal-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-teal-800">Payment Methods</span>
        </div>
      </div>
      <div className="bg-gray-100 min-h-[100vh] flex-1 rounded-xl md:min-h-min flex items-center justify-center">
        <span className="text-xl font-semibold text-gray-600">Billing Dashboard</span>
      </div>
    </div>
  )
}