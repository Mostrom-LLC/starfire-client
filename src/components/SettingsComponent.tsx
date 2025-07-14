export function SettingsComponent() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-purple-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-purple-800">User Preferences</span>
        </div>
        <div className="bg-indigo-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-indigo-800">Security Settings</span>
        </div>
        <div className="bg-pink-100 aspect-video rounded-xl flex items-center justify-center">
          <span className="text-lg font-semibold text-pink-800">Notifications</span>
        </div>
      </div>
      <div className="bg-gray-100 min-h-[100vh] flex-1 rounded-xl md:min-h-min flex items-center justify-center">
        <span className="text-xl font-semibold text-gray-600">Settings Configuration Panel</span>
      </div>
    </div>
  )
}