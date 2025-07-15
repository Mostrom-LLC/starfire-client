import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ProjectComponent } from "@/components/projects/ProjectComponent"
import { OverviewComponent } from "@/components/OverviewComponent"
import { SettingsComponent } from "@/components/SettingsComponent"
import { BillingComponent } from "@/components/BillingComponent"
import { SubscriptionComponent } from "@/components/SubscriptionComponent"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Page() {
  const [selectedProject, setSelectedProject] = useState("Nova")
  const [selectedSection, setSelectedSection] = useState("Projects")
  const [selectedSubItem, setSelectedSubItem] = useState("Nova")

  const handleNavigate = (section: string, subItem: string) => {
    setSelectedSection(section)
    setSelectedSubItem(subItem)
  }

  const handleLogout = () => {
    // Handle logout logic here
    console.log("Logout clicked")
  }

  const handleProjectSelect = (project: string) => {
    setSelectedProject(project)
    setSelectedSection("Projects")
    setSelectedSubItem(project)
  }

  const renderMainContent = () => {
    if (selectedSection === "Projects") {
      return <ProjectComponent projectName={selectedProject} />
    } else if (selectedSection === "Getting Started" && selectedSubItem === "Overview") {
      return <OverviewComponent />
    } else if (selectedSection === "Account") {
      switch (selectedSubItem) {
        case "Settings":
          return <SettingsComponent />
        case "Billing":
          return <BillingComponent />
        case "Subscription":
          return <SubscriptionComponent />
        default:
          return <SettingsComponent />
      }
    }
    return <ProjectComponent projectName={selectedProject} />
  }
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "19rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar 
        selectedProject={selectedProject}
        onProjectSelect={handleProjectSelect}
        selectedSection={selectedSection}
        selectedSubItem={selectedSubItem}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
      <SidebarInset className="flex flex-col h-full">
        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
                  />
          
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">
                  {selectedSection}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{selectedSubItem}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
              </header>
              <Separator/>
              <div className="flex-1 min-h-0 overflow-hidden">
                {renderMainContent()}
              </div>
              
      </SidebarInset>
    </SidebarProvider>
  )
}
