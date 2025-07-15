import { useState, useEffect } from "react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import { Upload } from "./Upload"
import { Review } from "./Analyze"
import { Chat } from "./Chat"

interface ProjectComponentProps {
  projectName: string
}

export function ProjectComponent({ projectName }: ProjectComponentProps) {
  console.log(projectName)
  // Get the saved tab from localStorage or default to "upload"
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Only run in browser environment
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("projects-active-tab");
      return savedTab || "upload";
    }
    return "upload";
  });

  // Save the active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("projects-active-tab", activeTab);
  }, [activeTab]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <>
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 h-full min-h-0">
      
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange}
        className="pt-2 flex flex-col h-full min-h-0"
      >
        <div className="w-full flex justify-center sticky top-0 z-10 bg-white">
          <TabsList className="rounded-md">
            <TabsTrigger value="upload" className="px-8 rounded-md">Upload</TabsTrigger>
            <TabsTrigger value="analyze" className="px-8 rounded-md">Analyze</TabsTrigger>
            <TabsTrigger value="chat" className="px-8 rounded-md">Chat</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 w-full overflow-hidden min-h-0">
          <TabsContent value="upload" className="h-full overflow-hidden flex flex-col">
           <Upload />
          </TabsContent>
          <TabsContent value="analyze" className="h-full overflow-hidden flex flex-col">
           <Review />
          </TabsContent>
          <TabsContent value="chat" className="h-full overflow-hidden flex flex-col">
           <Chat />
          </TabsContent>
        </div>
      </Tabs>
    </div>
    </>
  )
}