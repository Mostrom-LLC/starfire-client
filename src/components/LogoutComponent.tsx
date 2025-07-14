export function LogoutComponent() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-1">
        <div className="bg-red-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-red-800">Logout Confirmation</span>
        </div>
      </div>
      <div className="bg-gray-100 min-h-[100vh] flex-1 rounded-xl md:min-h-min flex items-center justify-center">
        <span className="text-xl font-semibold text-gray-600">Session Management</span>
      </div>
    </div>
  )
}