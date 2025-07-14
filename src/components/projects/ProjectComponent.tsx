
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
  return (
    <>
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      
      <Tabs defaultValue="upload" className="pt-2 flex flex-col h-full">
        <div className="w-full flex justify-center sticky top-0 z-10 bg-white">
          <TabsList className="rounded-md">
            <TabsTrigger value="upload" className="px-8 rounded-md">Upload</TabsTrigger>
            <TabsTrigger value="analyze" className="px-8 rounded-md">Analyze</TabsTrigger>
            <TabsTrigger value="chat" className="px-8 rounded-md">Chat</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 w-full overflow-hidden">
          <TabsContent value="upload" className="h-full">
           <Upload />
          </TabsContent>
          <TabsContent value="analyze" className="h-full">
           <Review />
          </TabsContent>
          <TabsContent value="chat" className="h-full">
           <Chat />
          </TabsContent>
        </div>
      </Tabs>
    </div>
    </>
  )
}